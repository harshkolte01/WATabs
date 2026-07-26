import { app, ipcMain } from "electron";
import type { AppInfo } from "@multi-whatsapp/shared-types";
import {
  accountIdSchema,
  createAccountInputSchema,
  ipcChannels,
  permissionPromptResponseSchema,
  renameAccountInputSchema,
  reorderAccountsInputSchema,
  setEnabledInputSchema,
  updateAccountPermissionsSchema,
  updateSettingsSchema,
} from "@multi-whatsapp/validation";
import {
  clearAccountSession,
  createAccount,
  listAccountRecords,
  reloadAccount,
  removeAccount,
  renameAccount,
  reorderAccounts,
  selectAccount,
  setAccountEnabled,
  getSelectedAccountId,
} from "../accounts/account-manager";
import { log } from "../diagnostics/log-manager";
import { respondToShellPrompt } from "../permissions/permission-prompt";
import {
  getAccount,
  getSettings,
  getWindowState,
  resetWindowState,
  updateAccountPermissions,
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
}
