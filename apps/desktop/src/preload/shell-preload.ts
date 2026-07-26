import { contextBridge, ipcRenderer } from "electron";
import { ipcChannels } from "@multi-whatsapp/validation";
import type { AppInfo, AppSettings, WindowState } from "@multi-whatsapp/shared-types";

/**
 * Narrow shell bridge only. Do not expose a generic channel invoke helper.
 * WhatsApp views must never receive this preload.
 */
const desktop = {
  getAppInfo: (): Promise<AppInfo> =>
    ipcRenderer.invoke(ipcChannels.getAppInfo),
  getWindowState: (): Promise<WindowState | null> =>
    ipcRenderer.invoke(ipcChannels.getWindowState),
  resetWindowState: (): Promise<{ ok: true }> =>
    ipcRenderer.invoke(ipcChannels.resetWindowState),
  getSettings: (): Promise<AppSettings> =>
    ipcRenderer.invoke(ipcChannels.getSettings),
  updateSettings: (patch: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke(ipcChannels.updateSettings, patch),
};

contextBridge.exposeInMainWorld("desktop", desktop);

export type DesktopApi = typeof desktop;
