import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  app,
  dialog,
  shell,
  type DownloadItem,
  type Session,
} from "electron";
import type { DownloadRecord } from "@multi-whatsapp/shared-types";
import { ipcChannels } from "@multi-whatsapp/validation";
import { log } from "../diagnostics/log-manager";
import { sendPromptToShell } from "../permissions/shell-bridge";
import { getSettings } from "../storage/metadata-store";
import { isDangerousExecutableFilename } from "./executable-warning";
import { resolveUniquePath, sanitizeFilename } from "./filename-sanitizer";
import {
  clearDownloadHistory,
  getDownloadRecord,
  listDownloadRecords,
  upsertDownloadRecord,
} from "./download-store";

type LiveEntry = {
  item: DownloadItem;
  record: DownloadRecord;
};

const live = new Map<string, LiveEntry>();
const attachedSessions = new WeakSet<Session>();

function resolveSaveRoot(): string {
  const settings = getSettings();
  if (settings.downloadDirectory) {
    return settings.downloadDirectory;
  }
  return app.getPath("downloads");
}

function publish(): void {
  sendPromptToShell(ipcChannels.downloadsChanged, listDownloadsForUi());
}

export type DownloadUiRecord = DownloadRecord & {
  isExecutable: boolean;
  canPause: boolean;
  canResume: boolean;
};

export function listDownloadsForUi(): DownloadUiRecord[] {
  return listDownloadRecords().map((record) => {
    const liveEntry = live.get(record.id);
    return {
      ...record,
      isExecutable: isDangerousExecutableFilename(record.filename),
      canPause: Boolean(liveEntry && !liveEntry.item.isPaused()),
      canResume: Boolean(
        liveEntry &&
          liveEntry.item.isPaused() &&
          liveEntry.item.canResume(),
      ),
    };
  });
}

export function attachDownloadHandlers(
  accountSession: Session,
  accountId: string,
): void {
  if (attachedSessions.has(accountSession)) {
    return;
  }
  attachedSessions.add(accountSession);

  accountSession.on("will-download", (_event, item) => {
    void handleWillDownload(accountId, item);
  });
}

async function handleWillDownload(
  accountId: string,
  item: DownloadItem,
): Promise<void> {
  const settings = getSettings();
  const id = randomUUID();
  const suggested = sanitizeFilename(item.getFilename() || "download");
  const root = resolveSaveRoot();

  let targetPath: string | undefined;

  if (settings.askWhereToSaveEachFile) {
    const result = await dialog.showSaveDialog({
      defaultPath: path.join(root, suggested),
      title: "Save download",
    });
    if (result.canceled || !result.filePath) {
      item.cancel();
      const record: DownloadRecord = {
        id,
        accountId,
        filename: suggested,
        receivedBytes: 0,
        state: "cancelled",
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
      upsertDownloadRecord(record);
      publish();
      log("info", "download_cancelled_by_user", { accountId, filename: suggested });
      return;
    }
    targetPath = result.filePath;
  } else {
    targetPath = resolveUniquePath(root, suggested);
  }

  const filename = path.basename(targetPath);
  item.setSavePath(targetPath);

  const record: DownloadRecord = {
    id,
    accountId,
    filename,
    targetPath,
    receivedBytes: 0,
    totalBytes: item.getTotalBytes() || undefined,
    state: "starting",
    startedAt: new Date().toISOString(),
  };
  upsertDownloadRecord(record);
  live.set(id, { item, record });
  publish();
  log("info", "download_started", { accountId, filename });

  item.on("updated", (_e, state) => {
    const entry = live.get(id);
    if (!entry) return;
    const next: DownloadRecord = {
      ...entry.record,
      receivedBytes: item.getReceivedBytes(),
      totalBytes: item.getTotalBytes() || entry.record.totalBytes,
      state:
        state === "interrupted"
          ? "interrupted"
          : item.isPaused()
            ? "paused"
            : "progressing",
      interruptReason: state === "interrupted" ? "interrupted" : undefined,
    };
    entry.record = next;
    upsertDownloadRecord(next);
    publish();
  });

  item.once("done", (_e, state) => {
    live.delete(id);
    const next: DownloadRecord = {
      ...record,
      filename,
      targetPath,
      receivedBytes: item.getReceivedBytes(),
      totalBytes: item.getTotalBytes() || record.totalBytes,
      state:
        state === "completed"
          ? "completed"
          : state === "cancelled"
            ? "cancelled"
            : "interrupted",
      completedAt: new Date().toISOString(),
      interruptReason: state === "interrupted" ? "interrupted" : undefined,
    };
    upsertDownloadRecord(next);
    publish();
    log("info", "download_done", {
      accountId,
      filename,
      state: next.state,
    });
  });
}

export function cancelDownload(id: string): DownloadUiRecord {
  const entry = live.get(id);
  if (!entry) {
    throw new Error("Unknown or inactive download");
  }
  entry.item.cancel();
  return requireUiRecord(id);
}

export function pauseDownload(id: string): DownloadUiRecord {
  const entry = live.get(id);
  if (!entry) {
    throw new Error("Unknown or inactive download");
  }
  if (!entry.item.isPaused()) {
    entry.item.pause();
  }
  const next: DownloadRecord = {
    ...entry.record,
    state: "paused",
    receivedBytes: entry.item.getReceivedBytes(),
  };
  entry.record = next;
  upsertDownloadRecord(next);
  publish();
  return requireUiRecord(id);
}

export function resumeDownload(id: string): DownloadUiRecord {
  const entry = live.get(id);
  if (!entry) {
    throw new Error("Unknown or inactive download");
  }
  if (entry.item.canResume()) {
    entry.item.resume();
  }
  const next: DownloadRecord = {
    ...entry.record,
    state: "progressing",
    receivedBytes: entry.item.getReceivedBytes(),
  };
  entry.record = next;
  upsertDownloadRecord(next);
  publish();
  return requireUiRecord(id);
}

export function showDownloadInFolder(id: string): { ok: true } {
  const record = getDownloadRecord(id);
  if (!record?.targetPath) {
    throw new Error("Download path unavailable");
  }
  shell.showItemInFolder(record.targetPath);
  return { ok: true };
}

export async function openDownload(id: string): Promise<{ ok: true }> {
  const record = getDownloadRecord(id);
  if (!record?.targetPath) {
    throw new Error("Download path unavailable");
  }
  const settings = getSettings();
  if (
    settings.warnOnExecutableDownload &&
    isDangerousExecutableFilename(record.filename)
  ) {
    const result = await dialog.showMessageBox({
      type: "warning",
      buttons: ["Cancel", "Open anyway"],
      defaultId: 0,
      cancelId: 0,
      title: "Executable file",
      message: `“${record.filename}” may be dangerous. Open it anyway?`,
    });
    if (result.response !== 1) {
      throw new Error("Open cancelled");
    }
  }
  const openResult = await shell.openPath(record.targetPath);
  if (openResult) {
    throw new Error("Failed to open file");
  }
  return { ok: true };
}

export function clearHistory(): { ok: true } {
  clearDownloadHistory();
  publish();
  return { ok: true };
}

export async function chooseDownloadDirectory(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"],
    defaultPath: resolveSaveRoot(),
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0] ?? null;
}

export function cancelDownloadsForAccount(accountId: string): void {
  for (const [id, entry] of live) {
    if (entry.record.accountId === accountId) {
      try {
        entry.item.cancel();
      } catch {
        // ignore
      }
      live.delete(id);
    }
  }
}

function requireUiRecord(id: string): DownloadUiRecord {
  const found = listDownloadsForUi().find((d) => d.id === id);
  if (!found) {
    throw new Error("Unknown download");
  }
  return found;
}
