import { app } from "electron";
import path from "node:path";
import { APP_USER_MODEL_ID } from "@multi-whatsapp/shared-types";
import { APP_USER_DATA_NAME } from "../../shared/constants";
import {
  onAccountsChanged,
  restoreAccountsOnStartup,
} from "../accounts/account-manager";
import { log } from "../diagnostics/log-manager";
import { registerIpcHandlers } from "../ipc/handlers";
import { registerPowerEvents } from "../lifecycle/power-events";
import { checkUnexpectedRestart } from "../lifecycle/shutdown-marker";
import { registerAppProtocolHandler } from "../protocol/app-protocol";
import { getSettings, loadMetadata } from "../storage/metadata-store";
import {
  applyStartupLockPolicy,
  getLockStatus,
} from "../system/app-lock-manager";
import { createTray, rebuildTrayMenu } from "../system/tray-manager";
import {
  syncLoginItemSettings,
  wasOpenedAsHidden,
} from "../system/startup-manager";
import { installApplicationMenu } from "../windows/application-menu";
import {
  createMainWindow,
  notifyShellAccountsChanged,
} from "../windows/main-window";

export function configureAppIdentity(): void {
  app.setName(APP_USER_DATA_NAME);
  app.setPath("userData", path.join(app.getPath("appData"), APP_USER_DATA_NAME));
  if (process.platform === "win32") {
    app.setAppUserModelId(APP_USER_MODEL_ID);
  }
}

export async function onAppReady(): Promise<void> {
  installApplicationMenu();
  registerAppProtocolHandler();
  loadMetadata();
  checkUnexpectedRestart();
  syncLoginItemSettings();
  registerIpcHandlers();
  registerPowerEvents();
  onAccountsChanged((reason) => {
    notifyShellAccountsChanged(reason);
    rebuildTrayMenu();
  });

  const settings = getSettings();
  const startHidden =
    settings.startAtLogin &&
    settings.startHiddenInTray &&
    wasOpenedAsHidden();

  createMainWindow({ show: !startHidden });
  if (startHidden || settings.closeToTray === true) {
    createTray();
  }

  applyStartupLockPolicy();
  await restoreAccountsOnStartup();
  // If we started locked, keep views hidden after restore.
  if (getLockStatus().locked) {
    const { selectAccountView } = await import(
      "../accounts/account-view-manager"
    );
    selectAccountView(null);
  }

  log("info", "app_ready", {
    electron: process.versions.electron,
    platform: process.platform,
    isPackaged: app.isPackaged,
  });
}
