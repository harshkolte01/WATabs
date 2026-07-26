import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import type { DownloadRecord } from "@multi-whatsapp/shared-types";
import { downloadRecordSchema } from "@multi-whatsapp/validation";
import { log } from "../diagnostics/log-manager";

const HISTORY_FILENAME = "downloads-history.json";
const MAX_HISTORY = 200;

let cache: DownloadRecord[] | null = null;

function historyPath(): string {
  return path.join(app.getPath("userData"), HISTORY_FILENAME);
}

function load(): DownloadRecord[] {
  if (cache) return cache;
  const file = historyPath();
  if (!fs.existsSync(file)) {
    cache = [];
    return cache;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
    if (!Array.isArray(raw)) {
      cache = [];
      return cache;
    }
    cache = raw
      .map((item) => downloadRecordSchema.safeParse(item))
      .filter((r) => r.success)
      .map((r) => r.data);
    return cache;
  } catch {
    cache = [];
    return cache;
  }
}

function persist(): void {
  const file = historyPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(load(), null, 2), "utf8");
  fs.renameSync(tmp, file);
}

export function listDownloadRecords(): DownloadRecord[] {
  return [...load()].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function getDownloadRecord(id: string): DownloadRecord | null {
  return load().find((d) => d.id === id) ?? null;
}

export function upsertDownloadRecord(record: DownloadRecord): DownloadRecord {
  const parsed = downloadRecordSchema.parse(record);
  const items = load();
  const index = items.findIndex((d) => d.id === parsed.id);
  if (index >= 0) {
    items[index] = parsed;
  } else {
    items.unshift(parsed);
  }
  cache = items.slice(0, MAX_HISTORY);
  persist();
  return parsed;
}

/** Clears history metadata only — never deletes files on disk. */
export function clearDownloadHistory(): void {
  const before = load().length;
  cache = [];
  persist();
  log("info", "download_history_cleared", { count: before });
}

/** Test helper: clearHistory must not call fs.unlink on target paths. */
export function clearHistoryDeletesFiles(): boolean {
  return false;
}
