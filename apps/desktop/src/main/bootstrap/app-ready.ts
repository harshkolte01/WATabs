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
import { registerAppProtocolHandler } from "../protocol/app-protocol";
import { getSettings, loadMetadata } from "../storage/metadata-store";
import { createTray, rebuildTrayMenu } from "../system/tray-manager";
import {
  syncLoginItemSettings,
  wasOpenedAsHidden,
} from "../system/startup-manager";
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
  registerAppProtocolHandler();
  loadMetadata();
  syncLoginItemSettings();
  registerIpcHandlers();
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

  await restoreAccountsOnStartup();
  log("info", "app_ready", {
    electron: process.versions.electron,
    platform: process.platform,
    isPackaged: app.isPackaged,
  });
}
