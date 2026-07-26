import fs from "node:fs";
import { app } from "electron";
import { appMetadataSchema } from "@multi-whatsapp/validation";
import type { AppMetadata, AppSettings, WindowState } from "@multi-whatsapp/shared-types";
import { log } from "../diagnostics/log-manager";
import {
  copyLastKnownGood,
  metadataBackupPath,
  metadataPath,
  writeAtomicJson,
} from "./backup-policy";
import { createDefaultMetadata, migrateMetadata } from "./migrations";

let cached: AppMetadata | null = null;

function userDataDir(): string {
  return app.getPath("userData");
}

function readRawFile(filePath: string): unknown | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const text = fs.readFileSync(filePath, "utf8");
  return JSON.parse(text) as unknown;
}

export function loadMetadata(): AppMetadata {
  if (cached) {
    return cached;
  }

  const primary = metadataPath(userDataDir());
  const backup = metadataBackupPath(userDataDir());

  try {
    const raw = readRawFile(primary);
    if (raw == null) {
      cached = createDefaultMetadata();
      persistMetadata(cached);
      return cached;
    }
    const migrated = migrateMetadata(raw);
    const parsed = appMetadataSchema.parse(migrated);
    cached = parsed;
    copyLastKnownGood(userDataDir());
    return cached;
  } catch (error) {
    log("warn", "metadata_primary_load_failed", {
      errorCode: error instanceof Error ? error.name : "unknown",
    });
    try {
      const rawBackup = readRawFile(backup);
      if (rawBackup != null) {
        const migrated = migrateMetadata(rawBackup);
        cached = appMetadataSchema.parse(migrated);
        persistMetadata(cached);
        return cached;
      }
    } catch (backupError) {
      log("error", "metadata_backup_load_failed", {
        errorCode: backupError instanceof Error ? backupError.name : "unknown",
      });
    }
    // Never wipe partitions because metadata failed — return defaults only.
    cached = createDefaultMetadata();
    try {
      persistMetadata(cached);
    } catch {
      // ignore
    }
    return cached;
  }
}

export function persistMetadata(metadata: AppMetadata): void {
  const parsed = appMetadataSchema.parse(metadata);
  writeAtomicJson(metadataPath(userDataDir()), parsed);
  copyLastKnownGood(userDataDir());
  cached = parsed;
}

export function getSettings(): AppSettings {
  return loadMetadata().settings;
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const current = loadMetadata();
  const next: AppMetadata = {
    ...current,
    settings: { ...current.settings, ...patch },
  };
  persistMetadata(next);
  return next.settings;
}

export function getWindowState(): WindowState | null {
  return loadMetadata().windowState;
}

export function setWindowState(windowState: WindowState | null): void {
  const current = loadMetadata();
  persistMetadata({ ...current, windowState });
}

export function resetWindowState(): void {
  setWindowState(null);
}
