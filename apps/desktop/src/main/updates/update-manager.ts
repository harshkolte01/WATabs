import { app } from "electron";
import type { UpdateChannel, UpdateStatus } from "@multi-whatsapp/shared-types";
import {
  UPDATE_GITHUB_OWNER,
  UPDATE_GITHUB_REPO,
  githubReleasesLatestUrl,
} from "@multi-whatsapp/shared-types";
import { ipcChannels } from "@multi-whatsapp/validation";
import { log } from "../diagnostics/log-manager";
import { getSettings, updateSettings } from "../storage/metadata-store";
import { getShellView } from "../windows/main-window";
import {
  canCheck,
  canInstall,
  canStartDownload,
  reduceUpdateState,
} from "./update-state";

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

type AutoUpdaterLike = {
  autoDownload: boolean;
  allowPrerelease: boolean;
  allowDowngrade: boolean;
  setFeedURL: (options: {
    provider: "github";
    owner: string;
    repo: string;
  }) => void;
  checkForUpdates: () => Promise<unknown>;
  downloadUpdate: () => Promise<unknown>;
  quitAndInstall: (isSilent?: boolean, isForceRunAfter?: boolean) => void;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
};

let status: UpdateStatus = initialStatus();
let interval: NodeJS.Timeout | null = null;
let updater: AutoUpdaterLike | null = null;
let wired = false;

function initialStatus(): UpdateStatus {
  return {
    state: "idle",
    channel: "stable",
    currentVersion: "0.0.0",
    availableVersion: null,
    percent: null,
    errorMessage: null,
    lastCheckedAt: null,
    isPackaged: false,
    releaseNotesUrl: githubReleasesLatestUrl(),
  };
}

function publish(): void {
  const shell = getShellView();
  if (shell && !shell.webContents.isDestroyed()) {
    shell.webContents.send(ipcChannels.updatesChanged, status);
  }
}

function setStatus(patch: Partial<UpdateStatus>): void {
  status = { ...status, ...patch };
  publish();
}

function markChecked(): void {
  const at = new Date().toISOString();
  updateSettings({ lastUpdateCheckAt: at });
  setStatus({ lastCheckedAt: at });
}

function applyChannel(channel: UpdateChannel): void {
  if (!updater) return;
  updater.allowPrerelease = channel === "beta";
  updater.setFeedURL({
    provider: "github",
    owner: UPDATE_GITHUB_OWNER,
    repo: UPDATE_GITHUB_REPO,
  });
  setStatus({ channel });
}

function loadAutoUpdater(): AutoUpdaterLike | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("electron-updater") as {
      autoUpdater: AutoUpdaterLike;
    };
    return mod.autoUpdater;
  } catch (error) {
    log("warn", "updater_module_unavailable", {
      errorCode: error instanceof Error ? error.name : "unknown",
    });
    return null;
  }
}

function wireEvents(instance: AutoUpdaterLike): void {
  if (wired) return;
  wired = true;

  instance.on("checking-for-update", () => {
    setStatus({
      state: reduceUpdateState(status.state, "check_start"),
      errorMessage: null,
    });
  });

  instance.on("update-available", (...args: unknown[]) => {
    const info = args[0] as { version?: string } | undefined;
    setStatus({
      state: reduceUpdateState(status.state, "check_available"),
      availableVersion: info?.version ?? null,
      errorMessage: null,
    });
    markChecked();
  });

  instance.on("update-not-available", () => {
    setStatus({
      state: reduceUpdateState(status.state, "check_none"),
      availableVersion: null,
      errorMessage: null,
    });
    markChecked();
  });

  instance.on("download-progress", (...args: unknown[]) => {
    const progress = args[0] as { percent?: number } | undefined;
    setStatus({
      state: reduceUpdateState(status.state, "download_progress"),
      percent:
        typeof progress?.percent === "number"
          ? Math.round(progress.percent)
          : status.percent,
    });
  });

  instance.on("update-downloaded", (...args: unknown[]) => {
    const info = args[0] as { version?: string } | undefined;
    setStatus({
      state: reduceUpdateState(status.state, "download_done"),
      availableVersion: info?.version ?? status.availableVersion,
      percent: 100,
      errorMessage: null,
    });
  });

  instance.on("error", (...args: unknown[]) => {
    const err = args[0];
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : "Update error";
    const next =
      status.state === "downloading"
        ? reduceUpdateState(status.state, "download_fail")
        : reduceUpdateState(status.state, "check_fail");
    setStatus({
      state: next === status.state && status.state !== "error" ? "error" : next,
      errorMessage: message.slice(0, 240),
    });
    markChecked();
    log("warn", "updater_error", { errorCode: "updater" });
  });
}

/**
 * Init only when packaged. Never touches account partitions — electron-updater
 * replaces app binaries/resources only.
 */
export function initUpdateManager(): void {
  const settings = getSettings();
  setStatus({
    currentVersion: app.getVersion(),
    channel: settings.updateChannel,
    lastCheckedAt: settings.lastUpdateCheckAt,
    isPackaged: app.isPackaged,
    releaseNotesUrl: githubReleasesLatestUrl(),
  });

  if (!app.isPackaged) {
    setStatus({ state: "unavailable", errorMessage: null });
    log("info", "updater_skipped_unpackaged", {});
    return;
  }

  updater = loadAutoUpdater();
  if (!updater) {
    setStatus({
      state: "unavailable",
      errorMessage: "Updater module unavailable",
    });
    return;
  }

  updater.autoDownload = false;
  updater.allowDowngrade = false;
  applyChannel(settings.updateChannel);
  wireEvents(updater);

  void checkForUpdates().catch(() => {
    /* errors surface via status */
  });

  if (interval) clearInterval(interval);
  interval = setInterval(() => {
    void checkForUpdates().catch(() => {
      /* ignore */
    });
  }, CHECK_INTERVAL_MS);
}

export function getUpdateStatus(): UpdateStatus {
  return status;
}

export function setUpdateChannel(channel: UpdateChannel): UpdateStatus {
  updateSettings({ updateChannel: channel });
  applyChannel(channel);
  setStatus({
    state: reduceUpdateState(status.state, "reset"),
    availableVersion: null,
    percent: null,
    errorMessage: null,
  });
  return status;
}

export async function checkForUpdates(): Promise<UpdateStatus> {
  if (!app.isPackaged || !updater) {
    setStatus({ state: "unavailable" });
    return status;
  }
  if (!canCheck(status.state) && status.state !== "checking") {
    return status;
  }
  setStatus({
    state: reduceUpdateState(status.state, "check_start"),
    errorMessage: null,
  });
  try {
    await updater.checkForUpdates();
  } catch (error) {
    setStatus({
      state: reduceUpdateState(status.state, "check_fail"),
      errorMessage:
        error instanceof Error ? error.message.slice(0, 240) : "Check failed",
    });
    markChecked();
  }
  return status;
}

export async function downloadUpdate(): Promise<UpdateStatus> {
  if (!updater || !canStartDownload(status.state)) {
    return status;
  }
  setStatus({
    state: reduceUpdateState(status.state, "download_start"),
    percent: 0,
    errorMessage: null,
  });
  try {
    await updater.downloadUpdate();
  } catch (error) {
    setStatus({
      state: reduceUpdateState(status.state, "download_fail"),
      errorMessage:
        error instanceof Error
          ? error.message.slice(0, 240)
          : "Download failed",
    });
  }
  return status;
}

export function installUpdate(): { ok: boolean; reason?: string } {
  if (!updater || !canInstall(status.state)) {
    return { ok: false, reason: "No update ready to install" };
  }
  // quitAndInstall replaces app files only; userData partitions remain.
  log("info", "updater_quit_and_install", {
    version: status.availableVersion,
  });
  updater.quitAndInstall(false, true);
  return { ok: true };
}
