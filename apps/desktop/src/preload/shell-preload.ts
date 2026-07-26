import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import { ipcChannels } from "@multi-whatsapp/validation";
import type {
  AccountRecord,
  AppInfo,
  AppSettings,
  CreateAccountInput,
  PermissionPreference,
  WindowState,
} from "@multi-whatsapp/shared-types";

export type PermissionPromptPayload = {
  requestId: string;
  kind: "permission" | "http-external";
  accountId?: string;
  accountLabel?: string;
  permission?: string;
  url?: string;
  message: string;
};

export type AccountPermissions = {
  accountId: string;
  notificationsEnabled: boolean;
  notificationSoundEnabled: boolean;
  unreadBadgeEnabled: boolean;
  microphonePermission: PermissionPreference;
  cameraPermission: PermissionPreference;
  displayCapturePermission: PermissionPreference;
};

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

const permissionsApi = {
  get: (accountId: string): Promise<AccountPermissions> =>
    ipcRenderer.invoke(ipcChannels.permissionsGet, accountId),
  update: (
    accountId: string,
    patch: Partial<Omit<AccountPermissions, "accountId">>,
  ): Promise<AccountPermissions> =>
    ipcRenderer.invoke(ipcChannels.permissionsUpdate, { accountId, patch }),
  respondPrompt: (
    requestId: string,
    decision:
      | "allow-once"
      | "allow-always"
      | "block"
      | "deny"
      | "open"
      | "cancel",
  ): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke(ipcChannels.permissionsRespondPrompt, {
      requestId,
      decision,
    }),
  onPrompt: (
    callback: (payload: PermissionPromptPayload) => void,
  ): (() => void) => {
    const listener = (
      _event: IpcRendererEvent,
      payload: PermissionPromptPayload,
    ) => {
      callback(payload);
    };
    ipcRenderer.on(ipcChannels.permissionsPrompt, listener);
    return () => {
      ipcRenderer.removeListener(ipcChannels.permissionsPrompt, listener);
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
  permissions: permissionsApi,
};

contextBridge.exposeInMainWorld("desktop", desktop);

export type DesktopApi = typeof desktop;
