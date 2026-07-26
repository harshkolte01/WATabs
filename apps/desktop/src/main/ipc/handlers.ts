import { app, ipcMain, type IpcMainInvokeEvent } from "electron";
import type { AppInfo } from "@multi-whatsapp/shared-types";
import {
  accountIdSchema,
  closeToTrayChoiceSchema,
  configureLockInputSchema,
  createAccountInputSchema,
  downloadIdSchema,
  enableLockInputSchema,
  ipcChannels,
  permissionPromptResponseSchema,
  renameAccountInputSchema,
  reorderAccountsInputSchema,
  setAudioMutedInputSchema,
  setEnabledInputSchema,
  shellMainModeSchema,
  unlockInputSchema,
  updateAccountPermissionsSchema,
  updateSettingsSchema,
} from "@multi-whatsapp/validation";
import { setShellMainMode } from "../accounts/account-view-manager";
import {
  createSupportBundle,
  previewSupportBundle,
} from "../diagnostics/support-bundle";
import { getSystemStatus } from "../diagnostics/system-status";
import {
  listRecoveryStates,
  reloadAccountRecovery,
  retryAccountRecovery,
} from "../lifecycle/crash-recovery";
import {
  configureAppLock,
  enableAppLock,
  getLockStatus,
  lockApp,
  noteUserActivity,
  resetAppLock,
  unlockApp,
} from "../system/app-lock-manager";
import {
  cancelDownload,
  chooseDownloadDirectory,
  clearHistory,
  listDownloadsForUi,
  openDownload,
  pauseDownload,
  resumeDownload,
  showDownloadInFolder,
} from "../downloads/download-manager";
import {
  clearAccountSession,
  createAccount,
  listAccountRecords,
  reloadAccount,
  removeAccount,
  renameAccount,
  reorderAccounts,
  selectAccount,
  setAccountAudioMuted,
  setAccountEnabled,
  getSelectedAccountId,
} from "../accounts/account-manager";
import { log } from "../diagnostics/log-manager";
import {
  getNotificationDiagnostics,
  sendShellTestNotification,
} from "../notifications/notification-diagnostics";
import { getBadgeSnapshot } from "../notifications/badge-manager";
import { respondToShellPrompt } from "../permissions/permission-prompt";
import {
  getAccount,
  getSettings,
  getWindowState,
  resetWindowState,
  updateAccountPermissions,
  updateSettings,
} from "../storage/metadata-store";
import {
  checkForUpdates,
  downloadUpdate,
  getUpdateStatus,
  installUpdate,
  setUpdateChannel,
} from "../updates/update-manager";
import { respondClosePrompt } from "../windows/close-prompt";
import { assertTrustedShellSender } from "./sender-validation";

function shellActivity(event: IpcMainInvokeEvent): void {
  assertTrustedShellSender(event);
  noteUserActivity();
}

export function registerIpcHandlers(): void {
  ipcMain.handle(ipcChannels.getAppInfo, (event) => {
    shellActivity(event);
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

  ipcMain.handle(ipcChannels.shellSetMainMode, (event, payload: unknown) => {
    shellActivity(event);
    const mode = shellMainModeSchema.parse(payload);
    setShellMainMode(mode);
    return { ok: true as const, mode };
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
    // Lock enable/disable must go through desktop.lock.* (PIN required).
    // lastUpdateCheckAt is written only by the update manager.
    const {
      appLockEnabled: _a,
      autoLockMinutes: _b,
      lockOnOsLock: _c,
      requirePinAfterRestart: _d,
      hideAccountLabelsWhenLocked: _e,
      lastUpdateCheckAt: _f,
      updateChannel,
      ...safePatch
    } = parsed.data;
    if (updateChannel) {
      setUpdateChannel(updateChannel);
    }
    return updateSettings(safePatch);
  });

  ipcMain.handle(ipcChannels.accountsList, (event) => {
    assertTrustedShellSender(event);
    return {
      accounts: listAccountRecords(),
      selectedAccountId: getSelectedAccountId(),
    };
  });

  ipcMain.handle(ipcChannels.accountsCreate, async (event, payload: unknown) => {
    assertTrustedShellSender(event);
    const parsed = createAccountInputSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error("Invalid create account payload");
    }
    return createAccount(parsed.data);
  });

  ipcMain.handle(ipcChannels.accountsSelect, async (event, payload: unknown) => {
    assertTrustedShellSender(event);
    const accountId = accountIdSchema.parse(payload);
    return selectAccount(accountId);
  });

  ipcMain.handle(ipcChannels.accountsRename, (event, payload: unknown) => {
    assertTrustedShellSender(event);
    const parsed = renameAccountInputSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error("Invalid rename payload");
    }
    return renameAccount(parsed.data.accountId, parsed.data.label);
  });

  ipcMain.handle(ipcChannels.accountsReorder, (event, payload: unknown) => {
    assertTrustedShellSender(event);
    const parsed = reorderAccountsInputSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error("Invalid reorder payload");
    }
    return reorderAccounts(parsed.data.accountIds);
  });

  ipcMain.handle(
    ipcChannels.accountsSetEnabled,
    async (event, payload: unknown) => {
      assertTrustedShellSender(event);
      const parsed = setEnabledInputSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Invalid setEnabled payload");
      }
      return setAccountEnabled(parsed.data.accountId, parsed.data.enabled);
    },
  );

  ipcMain.handle(ipcChannels.accountsSetAudioMuted, (event, payload: unknown) => {
    assertTrustedShellSender(event);
    const parsed = setAudioMutedInputSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error("Invalid setAudioMuted payload");
    }
    return setAccountAudioMuted(parsed.data.accountId, parsed.data.muted);
  });

  ipcMain.handle(ipcChannels.accountsReload, (event, payload: unknown) => {
    assertTrustedShellSender(event);
    const accountId = accountIdSchema.parse(payload);
    reloadAccount(accountId);
    return { ok: true as const };
  });

  ipcMain.handle(
    ipcChannels.accountsClearSession,
    async (event, payload: unknown) => {
      assertTrustedShellSender(event);
      const accountId = accountIdSchema.parse(payload);
      return clearAccountSession(accountId);
    },
  );

  ipcMain.handle(ipcChannels.accountsRemove, async (event, payload: unknown) => {
    assertTrustedShellSender(event);
    const accountId = accountIdSchema.parse(payload);
    await removeAccount(accountId);
    return { ok: true as const };
  });

  ipcMain.handle(ipcChannels.permissionsGet, (event, payload: unknown) => {
    assertTrustedShellSender(event);
    const accountId = accountIdSchema.parse(payload);
    const account = getAccount(accountId);
    if (!account) {
      throw new Error("Unknown account");
    }
    return {
      accountId: account.id,
      notificationsEnabled: account.notificationsEnabled,
      notificationSoundEnabled: account.notificationSoundEnabled,
      unreadBadgeEnabled: account.unreadBadgeEnabled,
      microphonePermission: account.microphonePermission,
      cameraPermission: account.cameraPermission,
      displayCapturePermission: account.displayCapturePermission,
    };
  });

  ipcMain.handle(ipcChannels.permissionsUpdate, (event, payload: unknown) => {
    assertTrustedShellSender(event);
    const parsed = updateAccountPermissionsSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error("Invalid permissions patch");
    }
    const updated = updateAccountPermissions(
      parsed.data.accountId,
      parsed.data.patch,
    );
    return {
      accountId: updated.id,
      notificationsEnabled: updated.notificationsEnabled,
      notificationSoundEnabled: updated.notificationSoundEnabled,
      unreadBadgeEnabled: updated.unreadBadgeEnabled,
      microphonePermission: updated.microphonePermission,
      cameraPermission: updated.cameraPermission,
      displayCapturePermission: updated.displayCapturePermission,
    };
  });

  ipcMain.handle(
    ipcChannels.permissionsRespondPrompt,
    (event, payload: unknown) => {
      assertTrustedShellSender(event);
      const parsed = permissionPromptResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Invalid prompt response");
      }
      const ok = respondToShellPrompt(
        parsed.data.requestId,
        parsed.data.decision,
      );
      return { ok };
    },
  );

  ipcMain.handle(ipcChannels.notificationsGetDiagnostics, (event) => {
    assertTrustedShellSender(event);
    return getNotificationDiagnostics();
  });

  ipcMain.handle(ipcChannels.notificationsSendTest, (event) => {
    assertTrustedShellSender(event);
    return sendShellTestNotification();
  });

  ipcMain.handle(ipcChannels.windowCloseDecision, (event, payload: unknown) => {
    assertTrustedShellSender(event);
    const parsed = closeToTrayChoiceSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error("Invalid close decision");
    }
    const ok = respondClosePrompt(parsed.data.requestId, {
      choice: parsed.data.choice,
      remember: parsed.data.remember,
    });
    return { ok };
  });

  ipcMain.handle(ipcChannels.downloadsList, (event) => {
    assertTrustedShellSender(event);
    return listDownloadsForUi();
  });

  ipcMain.handle(ipcChannels.downloadsCancel, (event, payload: unknown) => {
    assertTrustedShellSender(event);
    return cancelDownload(downloadIdSchema.parse(payload));
  });

  ipcMain.handle(ipcChannels.downloadsPause, (event, payload: unknown) => {
    assertTrustedShellSender(event);
    return pauseDownload(downloadIdSchema.parse(payload));
  });

  ipcMain.handle(ipcChannels.downloadsResume, (event, payload: unknown) => {
    assertTrustedShellSender(event);
    return resumeDownload(downloadIdSchema.parse(payload));
  });

  ipcMain.handle(ipcChannels.downloadsShowInFolder, (event, payload: unknown) => {
    assertTrustedShellSender(event);
    return showDownloadInFolder(downloadIdSchema.parse(payload));
  });

  ipcMain.handle(ipcChannels.downloadsOpen, async (event, payload: unknown) => {
    assertTrustedShellSender(event);
    return openDownload(downloadIdSchema.parse(payload));
  });

  ipcMain.handle(ipcChannels.downloadsClearHistory, (event) => {
    assertTrustedShellSender(event);
    return clearHistory();
  });

  ipcMain.handle(ipcChannels.downloadsChooseDirectory, async (event) => {
    assertTrustedShellSender(event);
    const dir = await chooseDownloadDirectory();
    if (dir) {
      updateSettings({ downloadDirectory: dir });
    }
    return { path: dir };
  });

  ipcMain.handle(ipcChannels.lockGetStatus, (event) => {
    shellActivity(event);
    return getLockStatus();
  });

  ipcMain.handle(ipcChannels.lockEnable, async (event, payload: unknown) => {
    assertTrustedShellSender(event);
    const parsed = enableLockInputSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error("Invalid enable-lock payload");
    }
    const status = await enableAppLock(parsed.data);
    void import("../system/tray-manager").then(({ rebuildTrayMenu }) => {
      rebuildTrayMenu();
    });
    return status;
  });

  ipcMain.handle(ipcChannels.lockConfigure, (event, payload: unknown) => {
    shellActivity(event);
    const parsed = configureLockInputSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error("Invalid configure-lock payload");
    }
    return configureAppLock(parsed.data);
  });

  ipcMain.handle(ipcChannels.lockLock, (event) => {
    assertTrustedShellSender(event);
    lockApp("shell");
    return getLockStatus();
  });

  ipcMain.handle(ipcChannels.lockUnlock, async (event, payload: unknown) => {
    assertTrustedShellSender(event);
    const parsed = unlockInputSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error("Invalid unlock payload");
    }
    // Never log PIN.
    return unlockApp(parsed.data.pin);
  });

  ipcMain.handle(ipcChannels.lockReset, (event) => {
    assertTrustedShellSender(event);
    const status = resetAppLock();
    void import("../system/tray-manager").then(({ rebuildTrayMenu }) => {
      rebuildTrayMenu();
    });
    return status;
  });

  ipcMain.handle(ipcChannels.recoveryList, (event) => {
    shellActivity(event);
    return listRecoveryStates();
  });

  ipcMain.handle(ipcChannels.recoveryRetry, async (event, payload: unknown) => {
    assertTrustedShellSender(event);
    const accountId = accountIdSchema.parse(payload);
    return retryAccountRecovery(accountId);
  });

  ipcMain.handle(ipcChannels.recoveryReload, (event, payload: unknown) => {
    assertTrustedShellSender(event);
    const accountId = accountIdSchema.parse(payload);
    return reloadAccountRecovery(accountId);
  });

  ipcMain.handle(ipcChannels.diagnosticsGetSystemStatus, (event) => {
    shellActivity(event);
    return getSystemStatus();
  });

  ipcMain.handle(ipcChannels.diagnosticsPreviewSupportBundle, (event) => {
    assertTrustedShellSender(event);
    return previewSupportBundle();
  });

  ipcMain.handle(ipcChannels.diagnosticsCreateSupportBundle, async (event) => {
    assertTrustedShellSender(event);
    return createSupportBundle();
  });

  ipcMain.handle(ipcChannels.updatesGetStatus, (event) => {
    assertTrustedShellSender(event);
    return getUpdateStatus();
  });

  ipcMain.handle(ipcChannels.updatesCheck, async (event) => {
    shellActivity(event);
    return checkForUpdates();
  });

  ipcMain.handle(ipcChannels.updatesDownload, async (event) => {
    shellActivity(event);
    return downloadUpdate();
  });

  ipcMain.handle(ipcChannels.updatesInstall, (event) => {
    assertTrustedShellSender(event);
    return installUpdate();
  });

  void getBadgeSnapshot;
}
