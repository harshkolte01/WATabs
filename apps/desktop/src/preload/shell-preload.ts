import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import { ipcChannels } from "@multi-whatsapp/validation";
import type {
  AccountRecord,
  AppInfo,
  AppSettings,
  CreateAccountInput,
  WindowState,
} from "@multi-whatsapp/shared-types";

/**
 * Narrow shell bridge only. Do not expose a generic channel invoke helper.
 * WhatsApp views must never receive this preload.
 */
const accountsApi = {
  list: (): Promise<{
    accounts: AccountRecord[];
    selectedAccountId: string | null;
  }> => ipcRenderer.invoke(ipcChannels.accountsList),
  create: (input: CreateAccountInput): Promise<AccountRecord> =>
    ipcRenderer.invoke(ipcChannels.accountsCreate, input),
  select: (accountId: string): Promise<AccountRecord> =>
    ipcRenderer.invoke(ipcChannels.accountsSelect, accountId),
  rename: (accountId: string, label: string): Promise<AccountRecord> =>
    ipcRenderer.invoke(ipcChannels.accountsRename, { accountId, label }),
  reorder: (accountIds: string[]): Promise<AccountRecord[]> =>
    ipcRenderer.invoke(ipcChannels.accountsReorder, { accountIds }),
  setEnabled: (accountId: string, enabled: boolean): Promise<AccountRecord> =>
    ipcRenderer.invoke(ipcChannels.accountsSetEnabled, { accountId, enabled }),
  reload: (accountId: string): Promise<{ ok: true }> =>
    ipcRenderer.invoke(ipcChannels.accountsReload, accountId),
  clearSession: (accountId: string): Promise<AccountRecord> =>
    ipcRenderer.invoke(ipcChannels.accountsClearSession, accountId),
  remove: (accountId: string): Promise<{ ok: true }> =>
    ipcRenderer.invoke(ipcChannels.accountsRemove, accountId),
  onChanged: (callback: (reason: string) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, reason: string) => {
      callback(reason);
    };
    ipcRenderer.on(ipcChannels.accountsChanged, listener);
    return () => {
      ipcRenderer.removeListener(ipcChannels.accountsChanged, listener);
    };
  },
};

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
  accounts: accountsApi,
};

contextBridge.exposeInMainWorld("desktop", desktop);

export type DesktopApi = typeof desktop;
