import { app, ipcMain } from "electron";
import type { AppInfo } from "@multi-whatsapp/shared-types";
import { ipcChannels, updateSettingsSchema } from "@multi-whatsapp/validation";
import { log } from "../diagnostics/log-manager";
import {
  getSettings,
  getWindowState,
  resetWindowState,
  updateSettings,
} from "../storage/metadata-store";
import { assertTrustedShellSender } from "./sender-validation";

export function registerIpcHandlers(): void {
  ipcMain.handle(ipcChannels.getAppInfo, (event) => {
    assertTrustedShellSender(event);
    const info: AppInfo = {
      name: app.getName(),
      version: app.getVersion(),
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      platform: process.platform,
      isPackaged: app.isPackaged,
    };
    return info;
  });

  ipcMain.handle(ipcChannels.getWindowState, (event) => {
    assertTrustedShellSender(event);
    return getWindowState();
  });

  ipcMain.handle(ipcChannels.resetWindowState, (event) => {
    assertTrustedShellSender(event);
    resetWindowState();
    log("info", "window_state_reset", {});
    return { ok: true as const };
  });

  ipcMain.handle(ipcChannels.getSettings, (event) => {
    assertTrustedShellSender(event);
    return getSettings();
  });

  ipcMain.handle(ipcChannels.updateSettings, (event, payload: unknown) => {
    assertTrustedShellSender(event);
    const parsed = updateSettingsSchema.safeParse(payload);
    if (!parsed.success) {
      log("warn", "ipc_validation_rejected", {
        channel: ipcChannels.updateSettings,
      });
      throw new Error("Invalid settings payload");
    }
    return updateSettings(parsed.data);
  });
}
