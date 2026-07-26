import type {
  RecoveryAccountState,
  RecoveryAccountStatus,
} from "@multi-whatsapp/shared-types";
import { ipcChannels } from "@multi-whatsapp/validation";
import {
  getAccount,
  listAccounts,
} from "../storage/metadata-store";
import {
  hasAccountView,
  recreateAccountView,
  reloadAccountView,
} from "../accounts/account-view-manager";
import { log } from "../diagnostics/log-manager";
import { sendPromptToShell } from "../permissions/shell-bridge";
import { isAppLocked } from "../system/app-lock-manager";

const WINDOW_MS = 5 * 60_000;
const MAX_AUTO = 3;

const states = new Map<string, RecoveryAccountState>();
const attemptTimes = new Map<string, number[]>();
const recovering = new Set<string>();

function publish(): void {
  sendPromptToShell(ipcChannels.recoveryChanged, listRecoveryStates());
}

function getOrCreate(accountId: string): RecoveryAccountState {
  let state = states.get(accountId);
  if (!state) {
    state = {
      accountId,
      status: "ok",
      autoAttemptsInWindow: 0,
    };
    states.set(accountId, state);
  }
  return state;
}

function pruneAttempts(accountId: string): number[] {
  const now = Date.now();
  const next = (attemptTimes.get(accountId) ?? []).filter(
    (t) => now - t < WINDOW_MS,
  );
  attemptTimes.set(accountId, next);
  return next;
}

export function listRecoveryStates(): RecoveryAccountState[] {
  const ids = new Set([
    ...listAccounts().map((a) => a.id),
    ...states.keys(),
  ]);
  return [...ids].map((id) => {
    const state = getOrCreate(id);
    state.autoAttemptsInWindow = pruneAttempts(id).length;
    return { ...state };
  });
}

export function getRecoveryState(accountId: string): RecoveryAccountState {
  return { ...getOrCreate(accountId) };
}

export function markRecoveryStatus(
  accountId: string,
  status: RecoveryAccountStatus,
  message?: string,
): void {
  const state = getOrCreate(accountId);
  state.status = status;
  if (message) state.message = message;
  if (status === "crashed" || status === "load_failed") {
    state.lastCrashAt = new Date().toISOString();
  }
  publish();
}

export function handleRenderProcessGone(accountId: string): void {
  markRecoveryStatus(accountId, "crashed");
  void maybeAutoRecover(accountId, "render-process-gone");
}

export function handleUnresponsive(accountId: string): void {
  markRecoveryStatus(accountId, "unresponsive");
  publish();
}

export function handleResponsive(accountId: string): void {
  const state = getOrCreate(accountId);
  if (state.status === "unresponsive") {
    state.status = "ok";
    state.message = undefined;
    publish();
  }
}

export function handleDidFailLoad(
  accountId: string,
  isMainFrame: boolean,
  errorCode: number,
): void {
  if (!isMainFrame) return;
  // Ignore aborted navigations.
  if (errorCode === -3) return;
  markRecoveryStatus(accountId, "load_failed", `load_error_${errorCode}`);
  void maybeAutoRecover(accountId, "did-fail-load");
}

async function maybeAutoRecover(
  accountId: string,
  reason: string,
): Promise<void> {
  if (recovering.has(accountId)) return;
  const attempts = pruneAttempts(accountId);
  if (attempts.length >= MAX_AUTO) {
    markRecoveryStatus(
      accountId,
      "needs_manual_recovery",
      "Automatic recovery paused after repeated crashes",
    );
    log("warn", "account_crash_loop_guard", { accountId, reason });
    return;
  }

  recovering.add(accountId);
  try {
    attempts.push(Date.now());
    attemptTimes.set(accountId, attempts);
    const account = getAccount(accountId);
    if (!account) return;

    // Stagger slightly when multiple accounts fail.
    await sleep(150 * attempts.length);
    recreateAccountView(accountId, account.label);
    if (isAppLocked()) {
      const { selectAccountView } = await import(
        "../accounts/account-view-manager"
      );
      selectAccountView(null);
    }
    const state = getOrCreate(accountId);
    state.status = "ok";
    state.message = undefined;
    state.autoAttemptsInWindow = pruneAttempts(accountId).length;
    log("info", "account_auto_recovered", { accountId, reason });
    publish();
  } catch (error) {
    markRecoveryStatus(
      accountId,
      "needs_manual_recovery",
      error instanceof Error ? error.message : "recovery_failed",
    );
    log("error", "account_auto_recover_failed", { accountId });
  } finally {
    recovering.delete(accountId);
  }
}

export async function retryAccountRecovery(accountId: string): Promise<RecoveryAccountState> {
  attemptTimes.set(accountId, []);
  const account = getAccount(accountId);
  if (!account) {
    throw new Error("Unknown account");
  }
  recreateAccountView(accountId, account.label);
  if (isAppLocked()) {
    const { selectAccountView } = await import(
      "../accounts/account-view-manager"
    );
    selectAccountView(null);
  }
  const state = getOrCreate(accountId);
  state.status = "ok";
  state.message = undefined;
  state.autoAttemptsInWindow = 0;
  publish();
  return { ...state };
}

export function reloadAccountRecovery(accountId: string): RecoveryAccountState {
  if (!hasAccountView(accountId)) {
    const account = getAccount(accountId);
    if (!account) throw new Error("Unknown account");
    recreateAccountView(accountId, account.label);
  } else {
    reloadAccountView(accountId);
  }
  const state = getOrCreate(accountId);
  if (state.status !== "needs_manual_recovery") {
    state.status = "ok";
    state.message = undefined;
  }
  publish();
  return { ...state };
}

/** After resume/network: recreate only non-ok loaded accounts. */
export async function recoverFailedAccounts(): Promise<void> {
  const failed = listRecoveryStates().filter(
    (s) =>
      s.status === "crashed" ||
      s.status === "load_failed" ||
      s.status === "unresponsive",
  );
  for (const item of failed) {
    if (item.status === "needs_manual_recovery") continue;
    await maybeAutoRecover(item.accountId, "resume");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Test helper — exposes crash-loop decision without Electron views. */
export function wouldAutoRecover(accountId: string): boolean {
  return pruneAttempts(accountId).length < MAX_AUTO;
}

export function recordCrashAttemptForTests(accountId: string): void {
  const attempts = pruneAttempts(accountId);
  attempts.push(Date.now());
  attemptTimes.set(accountId, attempts);
  getOrCreate(accountId).autoAttemptsInWindow = attempts.length;
}

export function resetCrashRecoveryForTests(): void {
  states.clear();
  attemptTimes.clear();
  recovering.clear();
}
