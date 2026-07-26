import fs from "node:fs";
import { app } from "electron";
import { appMetadataSchema } from "@multi-whatsapp/validation";
import type {
  AccountRecord,
  AppMetadata,
  AppSettings,
  WindowState,
} from "@multi-whatsapp/shared-types";
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
    // Do not refresh backup on every successful load — only before writes.
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
  const dir = userDataDir();
  const primary = metadataPath(dir);
  // Preserve previous primary as last-known-good before overwrite.
  if (fs.existsSync(primary)) {
    try {
      const raw = readRawFile(primary);
      if (raw != null) {
        appMetadataSchema.parse(migrateMetadata(raw));
        copyLastKnownGood(dir);
      }
    } catch {
      // Keep existing backup untouched if current primary is already bad.
    }
  }
  writeAtomicJson(primary, parsed);
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
  // Lazy import avoids circular init with startup-manager.
  void import("../system/startup-manager").then(({ syncLoginItemSettings }) => {
    if (
      "startAtLogin" in patch ||
      "startHiddenInTray" in patch
    ) {
      syncLoginItemSettings();
    }
  });
  void import("../system/tray-manager").then(({ rebuildTrayMenu }) => {
    if (
      "notificationsGlobalEnabled" in patch ||
      "notificationsPausedUntil" in patch
    ) {
      rebuildTrayMenu();
    }
  });
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

export function listAccounts(): AccountRecord[] {
  return [...loadMetadata().accounts].sort((a, b) => a.order - b.order);
}

export function getAccount(accountId: string): AccountRecord | null {
  return loadMetadata().accounts.find((a) => a.id === accountId) ?? null;
}

export function getLastSelectedAccountId(): string | null {
  return loadMetadata().lastSelectedAccountId;
}

export function upsertAccount(account: AccountRecord): AccountRecord {
  const current = loadMetadata();
  const index = current.accounts.findIndex((a) => a.id === account.id);
  const accounts = [...current.accounts];
  if (index >= 0) {
    accounts[index] = account;
  } else {
    accounts.push(account);
  }
  persistMetadata({ ...current, accounts });
  return account;
}

export function removeAccountRecord(accountId: string): void {
  const current = loadMetadata();
  const accounts = current.accounts.filter((a) => a.id !== accountId);
  const lastSelectedAccountId =
    current.lastSelectedAccountId === accountId
      ? null
      : current.lastSelectedAccountId;
  persistMetadata({ ...current, accounts, lastSelectedAccountId });
}

export function setLastSelectedAccountId(accountId: string | null): void {
  const current = loadMetadata();
  if (
    accountId &&
    !current.accounts.some((a) => a.id === accountId)
  ) {
    throw new Error("Unknown account id");
  }
  const accounts = current.accounts.map((account) =>
    account.id === accountId
      ? { ...account, lastSelectedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      : account,
  );
  persistMetadata({ ...current, accounts, lastSelectedAccountId: accountId });
}

export function updateAccountPermissions(
  accountId: string,
  patch: Partial<
    Pick<
      AccountRecord,
      | "notificationsEnabled"
      | "notificationSoundEnabled"
      | "unreadBadgeEnabled"
      | "microphonePermission"
      | "cameraPermission"
      | "displayCapturePermission"
    >
  >,
): AccountRecord {
  const account = getAccount(accountId);
  if (!account) {
    throw new Error("Unknown account");
  }
  const updated: AccountRecord = {
    ...account,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  return upsertAccount(updated);
}

export function reorderAccountRecords(accountIds: string[]): AccountRecord[] {
  const current = loadMetadata();
  const byId = new Map(current.accounts.map((a) => [a.id, a]));
  if (accountIds.length !== current.accounts.length) {
    throw new Error("Reorder must include every account exactly once");
  }
  const seen = new Set<string>();
  const accounts: AccountRecord[] = [];
  accountIds.forEach((id, order) => {
    if (seen.has(id)) {
      throw new Error("Duplicate account id in reorder");
    }
    const existing = byId.get(id);
    if (!existing) {
      throw new Error("Unknown account id in reorder");
    }
    seen.add(id);
    accounts.push({
      ...existing,
      order,
      updatedAt: new Date().toISOString(),
    });
  });
  persistMetadata({ ...current, accounts });
  return listAccounts();
}
