import type { BrowserWindow } from "electron";
import {
  createAccountWebContentsView,
  loadWhatsApp,
  type AccountViewHandle,
} from "./account-factory";
import { layoutAccountViews } from "../windows/view-layout";
import { log } from "../diagnostics/log-manager";

const views = new Map<string, AccountViewHandle>();
let selectedId: string | null = null;
let hostWindow: BrowserWindow | null = null;

export function bindViewHost(win: BrowserWindow): void {
  hostWindow = win;
}

export function getSelectedAccountId(): string | null {
  return selectedId;
}

export function getLoadedAccountIds(): string[] {
  return [...views.keys()];
}

export function hasAccountView(accountId: string): boolean {
  return views.has(accountId);
}

export function createAndAttachAccountView(
  accountId: string,
  label: string,
): AccountViewHandle {
  if (!hostWindow) {
    throw new Error("Account view host window is not ready");
  }
  destroyAccountView(accountId);

  const handle = createAccountWebContentsView(accountId, label, {
    autoLoad: true,
  });
  views.set(accountId, handle);
  hostWindow.contentView.addChildView(handle.view);
  relayout();
  log("info", "account_view_created", { accountId });
  return handle;
}

export function selectAccountView(accountId: string | null): void {
  if (accountId && !views.has(accountId)) {
    throw new Error("Account view is not loaded");
  }
  selectedId = accountId;
  relayout();
  if (accountId) {
    const handle = views.get(accountId);
    handle?.view.webContents.focus();
  }
}

export function reloadAccountView(accountId: string): void {
  const handle = views.get(accountId);
  if (!handle) {
    throw new Error("Account view is not loaded");
  }
  handle.view.webContents.reload();
}

export function recreateAccountView(accountId: string, label: string): void {
  const wasSelected = selectedId === accountId;
  destroyAccountView(accountId);
  createAndAttachAccountView(accountId, label);
  if (wasSelected) {
    selectAccountView(accountId);
  }
}

export function destroyAccountView(accountId: string): void {
  const handle = views.get(accountId);
  if (!handle) {
    return;
  }
  views.delete(accountId);
  if (selectedId === accountId) {
    selectedId = null;
  }

  const win = hostWindow;
  const windowAlive = Boolean(win && !win.isDestroyed());

  // During window teardown Electron destroys child views first; touching them
  // throws "Object has been destroyed".
  if (windowAlive) {
    try {
      win!.contentView.removeChildView(handle.view);
    } catch {
      // already detached
    }
    try {
      if (!handle.view.webContents.isDestroyed()) {
        handle.view.webContents.close({ waitForBeforeUnload: false });
      }
    } catch {
      // already destroyed
    }
    relayout();
  }
}

export function destroyAllAccountViews(): void {
  for (const id of [...views.keys()]) {
    destroyAccountView(id);
  }
}

/** Drop map/host refs after the BrowserWindow is gone (views already torn down). */
export function abandonAllAccountViews(): void {
  views.clear();
  selectedId = null;
  hostWindow = null;
}

export function relayout(): void {
  if (!hostWindow || hostWindow.isDestroyed()) {
    return;
  }
  layoutAccountViews(hostWindow, views.values(), selectedId);
}

export function ensureAccountViewLoaded(
  accountId: string,
  label: string,
): void {
  if (!views.has(accountId)) {
    createAndAttachAccountView(accountId, label);
  }
}

/** Used by tests / diagnostics only — does not load remote URL again. */
export function peekAccountView(accountId: string): AccountViewHandle | null {
  return views.get(accountId) ?? null;
}

export function softReloadWhatsApp(accountId: string): void {
  const handle = views.get(accountId);
  if (!handle) {
    throw new Error("Account view is not loaded");
  }
  loadWhatsApp(handle.view);
}
