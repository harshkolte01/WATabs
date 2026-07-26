import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import { ipcChannels } from "@multi-whatsapp/validation";
import type {
  AccountBadgeState,
  AccountRecord,
  AppInfo,
  AppSettings,
  CreateAccountInput,
  DownloadRecord,
  LockStatus,
  NotificationDiagnostics,
  PermissionPreference,
  RecoveryAccountState,
  SystemStatus,
  UpdateStatus,
  WindowState,
} from "@multi-whatsapp/shared-types";

export type DownloadUiRecord = DownloadRecord & {
  isExecutable: boolean;
  canPause: boolean;
  canResume: boolean;
};

export type PermissionPromptPayload = {
  requestId: string;
  kind: "permission" | "http-external";
  accountId?: string;
  accountLabel?: string;
  permission?: string;
  url?: string;
  message: string;
};

export type ClosePromptPayload = {
  requestId: string;
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
  setAudioMuted: (accountId: string, muted: boolean): Promise<AccountRecord> =>
    ipcRenderer.invoke(ipcChannels.accountsSetAudioMuted, {
      accountId,
      muted,
    }),
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

const notificationsApi = {
  getDiagnostics: (): Promise<NotificationDiagnostics> =>
    ipcRenderer.invoke(ipcChannels.notificationsGetDiagnostics),
  sendTest: (): Promise<{ ok: boolean; at: string }> =>
    ipcRenderer.invoke(ipcChannels.notificationsSendTest),
  onBadgesChanged: (
    callback: (badges: AccountBadgeState[]) => void,
  ): (() => void) => {
    const listener = (
      _event: IpcRendererEvent,
      badges: AccountBadgeState[],
    ) => {
      callback(badges);
    };
    ipcRenderer.on(ipcChannels.notificationsBadgesChanged, listener);
    return () => {
      ipcRenderer.removeListener(
        ipcChannels.notificationsBadgesChanged,
        listener,
      );
    };
  },
};

const downloadsApi = {
  list: (): Promise<DownloadUiRecord[]> =>
    ipcRenderer.invoke(ipcChannels.downloadsList),
  cancel: (id: string): Promise<DownloadUiRecord> =>
    ipcRenderer.invoke(ipcChannels.downloadsCancel, id),
  pause: (id: string): Promise<DownloadUiRecord> =>
    ipcRenderer.invoke(ipcChannels.downloadsPause, id),
  resume: (id: string): Promise<DownloadUiRecord> =>
    ipcRenderer.invoke(ipcChannels.downloadsResume, id),
  showInFolder: (id: string): Promise<{ ok: true }> =>
    ipcRenderer.invoke(ipcChannels.downloadsShowInFolder, id),
  open: (id: string): Promise<{ ok: true }> =>
    ipcRenderer.invoke(ipcChannels.downloadsOpen, id),
  clearHistory: (): Promise<{ ok: true }> =>
    ipcRenderer.invoke(ipcChannels.downloadsClearHistory),
  chooseDirectory: (): Promise<{ path: string | null }> =>
    ipcRenderer.invoke(ipcChannels.downloadsChooseDirectory),
  onChanged: (callback: (items: DownloadUiRecord[]) => void): (() => void) => {
    const listener = (
      _event: IpcRendererEvent,
      items: DownloadUiRecord[],
    ) => {
      callback(items);
    };
    ipcRenderer.on(ipcChannels.downloadsChanged, listener);
    return () => {
      ipcRenderer.removeListener(ipcChannels.downloadsChanged, listener);
    };
  },
};

const lockApi = {
  getStatus: (): Promise<LockStatus> =>
    ipcRenderer.invoke(ipcChannels.lockGetStatus),
  enable: (input: {
    pin: string;
    confirmPin: string;
    autoLockMinutes?: 5 | 15 | 30 | 60 | null;
    lockOnOsLock?: boolean;
    requirePinAfterRestart?: boolean;
    hideAccountLabelsWhenLocked?: boolean;
  }): Promise<LockStatus> =>
    ipcRenderer.invoke(ipcChannels.lockEnable, input),
  configure: (patch: {
    autoLockMinutes?: 5 | 15 | 30 | 60 | null;
    lockOnOsLock?: boolean;
    requirePinAfterRestart?: boolean;
    hideAccountLabelsWhenLocked?: boolean;
  }): Promise<LockStatus> =>
    ipcRenderer.invoke(ipcChannels.lockConfigure, patch),
  lock: (): Promise<LockStatus> => ipcRenderer.invoke(ipcChannels.lockLock),
  unlock: (pin: string): Promise<LockStatus> =>
    ipcRenderer.invoke(ipcChannels.lockUnlock, { pin }),
  reset: (): Promise<LockStatus> => ipcRenderer.invoke(ipcChannels.lockReset),
  onChanged: (callback: (status: LockStatus) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, status: LockStatus) => {
      callback(status);
    };
    ipcRenderer.on(ipcChannels.lockChanged, listener);
    return () => {
      ipcRenderer.removeListener(ipcChannels.lockChanged, listener);
    };
  },
};

const recoveryApi = {
  list: (): Promise<RecoveryAccountState[]> =>
    ipcRenderer.invoke(ipcChannels.recoveryList),
  retry: (accountId: string): Promise<RecoveryAccountState> =>
    ipcRenderer.invoke(ipcChannels.recoveryRetry, accountId),
  reload: (accountId: string): Promise<RecoveryAccountState> =>
    ipcRenderer.invoke(ipcChannels.recoveryReload, accountId),
  onChanged: (
    callback: (states: RecoveryAccountState[]) => void,
  ): (() => void) => {
    const listener = (
      _event: IpcRendererEvent,
      states: RecoveryAccountState[],
    ) => {
      callback(states);
    };
    ipcRenderer.on(ipcChannels.recoveryChanged, listener);
    return () => {
      ipcRenderer.removeListener(ipcChannels.recoveryChanged, listener);
    };
  },
};

const diagnosticsApi = {
  getSystemStatus: (): Promise<SystemStatus> =>
    ipcRenderer.invoke(ipcChannels.diagnosticsGetSystemStatus),
  previewSupportBundle: (): Promise<{
    files: { name: string; description: string; bytes: number }[];
    excludes: string[];
    generatedAt: string;
  }> => ipcRenderer.invoke(ipcChannels.diagnosticsPreviewSupportBundle),
  createSupportBundle: (): Promise<{ path: string | null }> =>
    ipcRenderer.invoke(ipcChannels.diagnosticsCreateSupportBundle),
};

const updatesApi = {
  getStatus: (): Promise<UpdateStatus> =>
    ipcRenderer.invoke(ipcChannels.updatesGetStatus),
  check: (): Promise<UpdateStatus> =>
    ipcRenderer.invoke(ipcChannels.updatesCheck),
  download: (): Promise<UpdateStatus> =>
    ipcRenderer.invoke(ipcChannels.updatesDownload),
  install: (): Promise<{ ok: boolean; reason?: string }> =>
    ipcRenderer.invoke(ipcChannels.updatesInstall),
  onChanged: (callback: (status: UpdateStatus) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, next: UpdateStatus) => {
      callback(next);
    };
    ipcRenderer.on(ipcChannels.updatesChanged, listener);
    return () => {
      ipcRenderer.removeListener(ipcChannels.updatesChanged, listener);
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
  setMainMode: (mode: "workspace" | "panel"): Promise<{ ok: true }> =>
    ipcRenderer.invoke(ipcChannels.shellSetMainMode, mode),
  accounts: accountsApi,
  permissions: permissionsApi,
  notifications: notificationsApi,
  downloads: downloadsApi,
  lock: lockApi,
  recovery: recoveryApi,
  diagnostics: diagnosticsApi,
  updates: updatesApi,
  onClosePrompt: (
    callback: (payload: ClosePromptPayload) => void,
  ): (() => void) => {
    const listener = (
      _event: IpcRendererEvent,
      payload: ClosePromptPayload,
    ) => {
      callback(payload);
    };
    ipcRenderer.on(ipcChannels.windowClosePrompt, listener);
    return () => {
      ipcRenderer.removeListener(ipcChannels.windowClosePrompt, listener);
    };
  },
  respondClosePrompt: (
    requestId: string,
    choice: "keep" | "quit",
    remember: boolean,
  ): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke(ipcChannels.windowCloseDecision, {
      requestId,
      choice,
      remember,
    }),
};

contextBridge.exposeInMainWorld("desktop", desktop);

export type DesktopApi = typeof desktop;
