import { Notification } from "electron";
import type { NotificationDiagnostics } from "@multi-whatsapp/shared-types";
import {
  getAccount,
  getLastSelectedAccountId,
  getSettings,
} from "../storage/metadata-store";
import { hasAccountView } from "../accounts/account-view-manager";
import { shouldSuppressNotificationContent } from "../system/app-lock-manager";
import { isRunningInTray } from "../system/tray-manager";

let lastTestAt: string | null = null;
let lastTestOk: boolean | null = null;

export function getNotificationDiagnostics(): NotificationDiagnostics {
  const settings = getSettings();
  const selectedAccountId = getLastSelectedAccountId();
  const selected = selectedAccountId ? getAccount(selectedAccountId) : null;

  return {
    notificationsGlobalEnabled: settings.notificationsGlobalEnabled,
    notificationsPausedUntil: settings.notificationsPausedUntil,
    selectedAccountId,
    selectedNotificationsEnabled: selected
      ? selected.notificationsEnabled
      : null,
    selectedAudioMuted: selected ? selected.audioMuted : null,
    selectedViewLoaded: selectedAccountId
      ? hasAccountView(selectedAccountId)
      : false,
    runningInTray: isRunningInTray(),
    notificationApiSupported: Notification.isSupported(),
    lastTestAt,
    lastTestOk,
  };
}

/**
 * Shell-generated test toast only — fixed copy, never WhatsApp content.
 */
export function sendShellTestNotification(): {
  ok: boolean;
  at: string;
} {
  const at = new Date().toISOString();
  if (!Notification.isSupported()) {
    lastTestAt = at;
    lastTestOk = false;
    return { ok: false, at };
  }

  const locked = shouldSuppressNotificationContent();
  const notification = new Notification({
    title: locked ? "WATabs" : "WATabs test",
    body: locked
      ? "New activity"
      : "This is an application test notification, not a WhatsApp message.",
    silent: false,
  });
  notification.show();
  lastTestAt = at;
  lastTestOk = true;
  return { ok: true, at };
}

/** Test helper — ensures diagnostics never expose content fields. */
export function diagnosticsHasContentKeys(
  diag: NotificationDiagnostics,
): boolean {
  const json = JSON.stringify(diag);
  return /"title"|"body"|"sender"|"preview"/.test(json);
}
