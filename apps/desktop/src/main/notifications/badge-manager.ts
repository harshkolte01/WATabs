import { app, nativeImage } from "electron";
import type { AccountBadgeState } from "@multi-whatsapp/shared-types";
import { ipcChannels } from "@multi-whatsapp/validation";
import { getAccount } from "../storage/metadata-store";
import { getMainWindow, getShellView } from "../windows/main-window";
import { parseUnreadCount } from "./title-badge-parser";

const byAccount = new Map<string, AccountBadgeState>();

export function onAccountTitleUpdated(
  accountId: string,
  title: string,
): void {
  const account = getAccount(accountId);
  if (!account || !account.unreadBadgeEnabled) {
    byAccount.set(accountId, {
      accountId,
      count: null,
      attention: false,
    });
    publish();
    return;
  }
  const count = parseUnreadCount(title);
  byAccount.set(accountId, {
    accountId,
    count,
    attention: count !== null && count > 0,
  });
  publish();
}

export function clearAccountBadge(accountId: string): void {
  byAccount.delete(accountId);
  publish();
}

export function getBadgeSnapshot(): AccountBadgeState[] {
  return [...byAccount.values()];
}

function aggregateCount(): number | null {
  let total = 0;
  let any = false;
  for (const state of byAccount.values()) {
    if (typeof state.count === "number") {
      total += state.count;
      any = true;
    }
  }
  return any ? total : null;
}

function publish(): void {
  const snapshot = getBadgeSnapshot();
  const shell = getShellView();
  if (shell && !shell.webContents.isDestroyed()) {
    shell.webContents.send(ipcChannels.notificationsBadgesChanged, snapshot);
  }

  const total = aggregateCount();
  if (process.platform === "darwin" && app.dock) {
    app.dock.setBadge(total && total > 0 ? String(total) : "");
  }

  const win = getMainWindow();
  if (win && !win.isDestroyed() && process.platform === "win32") {
    if (total && total > 0) {
      // Minimal overlay: empty image with description — count via tooltip.
      const img = nativeImage.createEmpty();
      win.setOverlayIcon(img, `${total} unread`);
    } else {
      win.setOverlayIcon(null, "");
    }
  }
}
