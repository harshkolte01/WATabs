import { app } from "electron";
import path from "node:path";
import { APP_USER_DATA_NAME } from "../../shared/constants";
import { log } from "../diagnostics/log-manager";
import { registerIpcHandlers } from "../ipc/handlers";
import { loadMetadata } from "../storage/metadata-store";
import { registerAppProtocolHandler } from "../protocol/app-protocol";
import { createMainWindow } from "../windows/main-window";

export function configureAppIdentity(): void {
  app.setName(APP_USER_DATA_NAME);
  app.setPath("userData", path.join(app.getPath("appData"), APP_USER_DATA_NAME));
}

export async function onAppReady(): Promise<void> {
  registerAppProtocolHandler();
  loadMetadata();
  registerIpcHandlers();
  createMainWindow();
  log("info", "app_ready", {
    electron: process.versions.electron,
    platform: process.platform,
    isPackaged: app.isPackaged,
  });
}
