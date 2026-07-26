import type { WebContents } from "electron";
import { log } from "../diagnostics/log-manager";
import {
  getSelectedAccountId,
  selectAccount,
} from "../accounts/account-manager";
import { showMainWindow } from "../windows/main-window";
import { isRunningInTray } from "../system/tray-manager";

const contentsToAccount = new Map<number, string>();
let activating = false;

/**
 * Map account webContents → account id for activation routing.
 * Never inspects notification title/body.
 */
export function registerAccountWebContents(
  accountId: string,
  webContents: WebContents,
): void {
  contentsToAccount.set(webContents.id, accountId);

  webContents.on("focus", () => {
    void onAccountWebContentsFocused(accountId);
  });

  webContents.on("destroyed", () => {
    contentsToAccount.delete(webContents.id);
  });
}

export function unregisterAccountWebContents(webContentsId: number): void {
  contentsToAccount.delete(webContentsId);
}

export async function onAccountWebContentsFocused(
  accountId: string,
): Promise<void> {
  if (activating) return;
  activating = true;
  try {
    const fromBackground = isRunningInTray();
    showMainWindow();
    if (fromBackground || getSelectedAccountId() !== accountId) {
      await selectAccount(accountId);
    }
    log("info", "notification_activation", { accountId, via: "focus" });
  } catch {
    showMainWindow();
    log("info", "notification_activation", {
      accountId,
      via: "focus-show-only",
    });
  } finally {
    activating = false;
  }
}

export function resolveAccountIdForWebContents(
  webContents: WebContents,
): string | null {
  return contentsToAccount.get(webContents.id) ?? null;
}
