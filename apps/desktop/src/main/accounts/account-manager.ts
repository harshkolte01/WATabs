import { randomUUID } from "node:crypto";
import {
  createAccountDefaults,
  type AccountRecord,
  type CreateAccountInput,
} from "@multi-whatsapp/shared-types";
import { sanitizeAccountLabel } from "@multi-whatsapp/validation";
import { log } from "../diagnostics/log-manager";
import {
  getAccount,
  getLastSelectedAccountId,
  listAccounts,
  removeAccountRecord,
  reorderAccountRecords,
  setLastSelectedAccountId,
  upsertAccount,
} from "../storage/metadata-store";
import { clearAccountPartition } from "./session-cleanup";
import {
  createAndAttachAccountView,
  destroyAccountView,
  ensureAccountViewLoaded,
  getLoadedAccountIds,
  hasAccountView,
  recreateAccountView,
  reloadAccountView,
  selectAccountView,
} from "./account-view-manager";

const STARTUP_CONCURRENCY = 3;

export type AccountsChangedReason =
  | "create"
  | "select"
  | "rename"
  | "reorder"
  | "setEnabled"
  | "reload"
  | "clearSession"
  | "remove"
  | "restore";

type ChangedListener = (reason: AccountsChangedReason) => void;
const listeners = new Set<ChangedListener>();

export function onAccountsChanged(listener: ChangedListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitChanged(reason: AccountsChangedReason): void {
  for (const listener of listeners) {
    listener(reason);
  }
}

export function listAccountRecords(): AccountRecord[] {
  return listAccounts();
}

export function getSelectedAccountId(): string | null {
  return getLastSelectedAccountId();
}

export async function createAccount(
  input: CreateAccountInput,
): Promise<AccountRecord> {
  const label = sanitizeAccountLabel(input.label);
  if (!label) {
    throw new Error("Account label is required");
  }
  const id = randomUUID();
  const order = listAccounts().length;
  const account = createAccountDefaults(id, label, order, {
    color: input.color,
    loadOnStartup: input.loadOnStartup ?? true,
  });
  upsertAccount(account);
  createAndAttachAccountView(account.id, account.label);
  await selectAccount(account.id);
  log("info", "account_created", { accountId: id });
  emitChanged("create");
  return account;
}

export async function selectAccount(accountId: string): Promise<AccountRecord> {
  const account = getAccount(accountId);
  if (!account) {
    throw new Error("Unknown account");
  }
  if (!account.enabled) {
    throw new Error("Account is disabled");
  }
  ensureAccountViewLoaded(account.id, account.label);
  selectAccountView(account.id);
  setLastSelectedAccountId(account.id);
  const updated = {
    ...account,
    lastSelectedAt: new Date().toISOString(),
    lastLoadedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  upsertAccount(updated);
  emitChanged("select");
  return updated;
}

export function renameAccount(
  accountId: string,
  labelRaw: string,
): AccountRecord {
  const account = getAccount(accountId);
  if (!account) {
    throw new Error("Unknown account");
  }
  const label = sanitizeAccountLabel(labelRaw);
  if (!label) {
    throw new Error("Account label is required");
  }
  const updated = {
    ...account,
    label,
    updatedAt: new Date().toISOString(),
  };
  upsertAccount(updated);
  emitChanged("rename");
  return updated;
}

export function reorderAccounts(accountIds: string[]): AccountRecord[] {
  const next = reorderAccountRecords(accountIds);
  emitChanged("reorder");
  return next;
}

export async function setAccountEnabled(
  accountId: string,
  enabled: boolean,
): Promise<AccountRecord> {
  const account = getAccount(accountId);
  if (!account) {
    throw new Error("Unknown account");
  }
  const updated = {
    ...account,
    enabled,
    updatedAt: new Date().toISOString(),
  };
  upsertAccount(updated);

  if (!enabled) {
    destroyAccountView(accountId);
    if (getLastSelectedAccountId() === accountId) {
      const fallback = listAccounts().find(
        (a) => a.enabled && a.id !== accountId,
      );
      if (fallback) {
        await selectAccount(fallback.id);
      } else {
        selectAccountView(null);
        setLastSelectedAccountId(null);
      }
    }
  } else {
    ensureAccountViewLoaded(updated.id, updated.label);
  }

  emitChanged("setEnabled");
  return updated;
}

export function reloadAccount(accountId: string): void {
  const account = getAccount(accountId);
  if (!account) {
    throw new Error("Unknown account");
  }
  if (!account.enabled) {
    throw new Error("Account is disabled");
  }
  ensureAccountViewLoaded(account.id, account.label);
  reloadAccountView(account.id);
  emitChanged("reload");
}

export async function clearAccountSession(
  accountId: string,
): Promise<AccountRecord> {
  const account = getAccount(accountId);
  if (!account) {
    throw new Error("Unknown account");
  }
  destroyAccountView(accountId);
  await clearAccountPartition(account.partition);
  if (account.enabled) {
    recreateAccountView(account.id, account.label);
    if (getLastSelectedAccountId() === accountId) {
      selectAccountView(accountId);
    }
  }
  const updated = {
    ...account,
    updatedAt: new Date().toISOString(),
  };
  upsertAccount(updated);
  log("info", "account_session_cleared", { accountId });
  emitChanged("clearSession");
  return updated;
}

export async function removeAccount(accountId: string): Promise<void> {
  const account = getAccount(accountId);
  if (!account) {
    throw new Error("Unknown account");
  }
  const remainingBefore = listAccounts().filter((a) => a.id !== accountId);
  destroyAccountView(accountId);
  await clearAccountPartition(account.partition);
  removeAccountRecord(accountId);

  if (getLastSelectedAccountId() === accountId || !getLastSelectedAccountId()) {
    const fallback = remainingBefore.find((a) => a.enabled);
    if (fallback) {
      await selectAccount(fallback.id);
    } else {
      selectAccountView(null);
      setLastSelectedAccountId(null);
    }
  }

  log("info", "account_removed", { accountId });
  emitChanged("remove");
}

export async function restoreAccountsOnStartup(): Promise<void> {
  const accounts = listAccounts().filter((a) => a.enabled && a.loadOnStartup);
  const queue = [...accounts];
  const workers: Promise<void>[] = [];

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) return;
      try {
        if (!hasAccountView(next.id)) {
          createAndAttachAccountView(next.id, next.label);
          upsertAccount({
            ...next,
            lastLoadedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        log("error", "account_startup_load_failed", {
          accountId: next.id,
          errorCode: error instanceof Error ? error.name : "unknown",
        });
      }
    }
  }

  for (let i = 0; i < STARTUP_CONCURRENCY; i += 1) {
    workers.push(worker());
  }
  await Promise.all(workers);

  const lastSelected = getLastSelectedAccountId();
  const selected =
    (lastSelected &&
      listAccounts().find((a) => a.id === lastSelected && a.enabled)) ||
    listAccounts().find((a) => a.enabled);

  if (selected) {
    ensureAccountViewLoaded(selected.id, selected.label);
    selectAccountView(selected.id);
    setLastSelectedAccountId(selected.id);
  } else {
    selectAccountView(null);
  }

  log("info", "accounts_restored", {
    loaded: getLoadedAccountIds().length,
  });
  emitChanged("restore");
}
