import type { LockStatus } from "@multi-whatsapp/shared-types";
import { ipcChannels } from "@multi-whatsapp/validation";
import {
  getSelectedAccountId as getViewSelectedId,
  selectAccountView,
} from "../accounts/account-view-manager";
import { log } from "../diagnostics/log-manager";
import { sendPromptToShell } from "../permissions/shell-bridge";
import {
  getSelectedAccountId,
  selectAccount,
} from "../accounts/account-manager";
import { getSettings, updateSettings } from "../storage/metadata-store";
import {
  clearPinVerifier,
  hasStoredVerifier,
  isSafeStorageAvailable,
  loadPinVerifier,
  savePinVerifier,
} from "../storage/secure-storage";
import {
  createPinVerifier,
  unlockDelayMs,
  verifyPin,
} from "../storage/pin-verifier";

let locked = false;
let selectedBeforeLock: string | null = null;
let failedAttempts = 0;
let unlockAvailableAt = 0;
let autoLockTimer: ReturnType<typeof setTimeout> | null = null;

function publish(): void {
  sendPromptToShell(ipcChannels.lockChanged, getLockStatus());
}

export function isAppLocked(): boolean {
  return locked;
}

export function shouldSuppressNotificationContent(): boolean {
  return locked;
}

export function getLockStatus(): LockStatus {
  const settings = getSettings();
  return {
    enabled: settings.appLockEnabled && hasStoredVerifier(),
    locked,
    encryptionAvailable: isSafeStorageAvailable(),
    hasVerifier: hasStoredVerifier(),
    autoLockMinutes: settings.autoLockMinutes,
    lockOnOsLock: settings.lockOnOsLock,
    requirePinAfterRestart: settings.requirePinAfterRestart,
    hideAccountLabelsWhenLocked: settings.hideAccountLabelsWhenLocked,
    unlockDelayMs: Math.max(0, unlockAvailableAt - Date.now()),
    isEncryption: false,
  };
}

export async function enableAppLock(input: {
  pin: string;
  confirmPin: string;
  autoLockMinutes?: 5 | 15 | 30 | 60 | null;
  lockOnOsLock?: boolean;
  requirePinAfterRestart?: boolean;
  hideAccountLabelsWhenLocked?: boolean;
}): Promise<LockStatus> {
  if (input.pin !== input.confirmPin) {
    throw new Error("PIN confirmation does not match");
  }
  if (!isSafeStorageAvailable()) {
    throw new Error(
      "OS secure storage is unavailable; app lock cannot be enabled",
    );
  }
  const verifier = await createPinVerifier(input.pin);
  savePinVerifier(verifier);
  updateSettings({
    appLockEnabled: true,
    autoLockMinutes:
      input.autoLockMinutes === undefined
        ? getSettings().autoLockMinutes
        : input.autoLockMinutes,
    lockOnOsLock: input.lockOnOsLock ?? true,
    requirePinAfterRestart: input.requirePinAfterRestart ?? true,
    hideAccountLabelsWhenLocked: input.hideAccountLabelsWhenLocked ?? false,
  });
  failedAttempts = 0;
  unlockAvailableAt = 0;
  scheduleAutoLock();
  log("info", "app_lock_enabled", {});
  publish();
  return getLockStatus();
}

export function configureAppLock(patch: {
  autoLockMinutes?: 5 | 15 | 30 | 60 | null;
  lockOnOsLock?: boolean;
  requirePinAfterRestart?: boolean;
  hideAccountLabelsWhenLocked?: boolean;
}): LockStatus {
  if (!getSettings().appLockEnabled || !hasStoredVerifier()) {
    throw new Error("App lock is not enabled");
  }
  updateSettings(patch);
  scheduleAutoLock();
  publish();
  return getLockStatus();
}

export function resetAppLock(): LockStatus {
  clearPinVerifier();
  updateSettings({
    appLockEnabled: false,
    autoLockMinutes: null,
  });
  failedAttempts = 0;
  unlockAvailableAt = 0;
  clearAutoLockTimer();
  if (locked) {
    locked = false;
    void restoreSelectionAfterUnlock();
  }
  log("info", "app_lock_reset", {});
  publish();
  return getLockStatus();
}

export function lockApp(reason = "manual"): void {
  const settings = getSettings();
  if (!settings.appLockEnabled || !hasStoredVerifier()) {
    return;
  }
  if (locked) {
    publish();
    return;
  }
  selectedBeforeLock = getSelectedAccountId() ?? getViewSelectedId();
  locked = true;
  void import("../accounts/account-view-manager").then(
    ({ setShellMainMode }) => {
      setShellMainMode("workspace");
    },
  );
  selectAccountView(null);
  clearAutoLockTimer();
  log("info", "app_locked", { reason });
  publish();
}

export async function unlockApp(pin: string): Promise<LockStatus> {
  const now = Date.now();
  if (now < unlockAvailableAt) {
    throw new Error(
      `Too many attempts. Try again in ${Math.ceil((unlockAvailableAt - now) / 1000)}s`,
    );
  }
  if (!locked) {
    return getLockStatus();
  }
  const record = loadPinVerifier();
  if (!record) {
    throw new Error("Lock verifier missing; reset app lock in Settings");
  }
  const ok = await verifyPin(pin, record);
  if (!ok) {
    failedAttempts += 1;
    const delay = unlockDelayMs(failedAttempts);
    unlockAvailableAt = Date.now() + delay;
    log("warn", "app_unlock_failed", { attempts: failedAttempts });
    publish();
    throw new Error(
      delay > 0
        ? `Incorrect PIN. Try again in ${Math.ceil(delay / 1000)}s`
        : "Incorrect PIN",
    );
  }
  failedAttempts = 0;
  unlockAvailableAt = 0;
  locked = false;
  await restoreSelectionAfterUnlock();
  scheduleAutoLock();
  log("info", "app_unlocked", {});
  publish();
  return getLockStatus();
}

async function restoreSelectionAfterUnlock(): Promise<void> {
  const target = selectedBeforeLock;
  selectedBeforeLock = null;
  if (target) {
    try {
      await selectAccount(target);
      return;
    } catch {
      // fall through
    }
  }
  selectAccountView(null);
}

export function noteUserActivity(): void {
  if (!getSettings().appLockEnabled || locked) {
    return;
  }
  scheduleAutoLock();
}

export function scheduleAutoLock(): void {
  clearAutoLockTimer();
  const minutes = getSettings().autoLockMinutes;
  if (!getSettings().appLockEnabled || locked || minutes == null) {
    return;
  }
  autoLockTimer = setTimeout(
    () => {
      lockApp("inactivity");
    },
    minutes * 60_000,
  );
}

function clearAutoLockTimer(): void {
  if (autoLockTimer) {
    clearTimeout(autoLockTimer);
    autoLockTimer = null;
  }
}

/** Call after metadata load / window create — start locked if required. */
export function applyStartupLockPolicy(): void {
  const settings = getSettings();
  if (
    settings.appLockEnabled &&
    hasStoredVerifier() &&
    settings.requirePinAfterRestart
  ) {
    lockApp("startup");
  } else if (settings.appLockEnabled && hasStoredVerifier()) {
    scheduleAutoLock();
  }
}
