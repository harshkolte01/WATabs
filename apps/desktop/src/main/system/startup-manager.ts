import { app } from "electron";
import { getSettings } from "../storage/metadata-store";
import { log } from "../diagnostics/log-manager";

export function syncLoginItemSettings(): void {
  const settings = getSettings();
  try {
    app.setLoginItemSettings({
      openAtLogin: settings.startAtLogin,
      openAsHidden: settings.startAtLogin && settings.startHiddenInTray,
    });
    log("info", "login_item_synced", {
      openAtLogin: settings.startAtLogin,
      openAsHidden: settings.startAtLogin && settings.startHiddenInTray,
    });
  } catch (error) {
    log("warn", "login_item_sync_failed", {
      errorCode: error instanceof Error ? error.name : "unknown",
    });
  }
}

export function wasOpenedAsHidden(): boolean {
  try {
    const login = app.getLoginItemSettings();
    return Boolean(login.wasOpenedAsHidden || login.wasOpenedAtLogin);
  } catch {
    return false;
  }
}
