import { Menu, Tray, app, nativeImage } from "electron";
import {
  listAccountRecords,
  selectAccount,
} from "../accounts/account-manager";
import { getSettings, updateSettings } from "../storage/metadata-store";
import { log } from "../diagnostics/log-manager";
import {
  getMainWindow,
  hideMainWindowToTray,
  showMainWindow,
} from "../windows/main-window";
import { requestAppQuit } from "../windows/app-lifecycle";

let tray: Tray | null = null;
let runningInTray = false;

export function isRunningInTray(): boolean {
  return runningInTray;
}

export function setRunningInTray(value: boolean): void {
  runningInTray = value;
}

export function createTray(): void {
  if (tray) {
    return;
  }

  // 16x16 empty template — Electron accepts; OS may show default if blank.
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon.isEmpty() ? nativeImage.createFromDataURL(TRANSPARENT_PNG) : icon);
  tray.setToolTip("Multi Account Desktop");
  tray.on("double-click", () => {
    showMainWindow();
    setRunningInTray(false);
  });
  rebuildTrayMenu();
  log("info", "tray_created", {});
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
  runningInTray = false;
}

export function rebuildTrayMenu(): void {
  if (!tray) return;

  const accounts = listAccountRecords().filter((a) => a.enabled);
  const accountItems = accounts.map((account) => ({
    label: account.label,
    click: () => {
      showMainWindow();
      setRunningInTray(false);
      void selectAccount(account.id);
    },
  }));

  const menu = Menu.buildFromTemplate([
    {
      label: "Open",
      click: () => {
        showMainWindow();
        setRunningInTray(false);
      },
    },
    { type: "separator" },
    ...(accountItems.length > 0
      ? accountItems
      : [{ label: "No accounts", enabled: false }]),
    { type: "separator" },
    {
      label: "Mute all notifications",
      click: () => {
        updateSettings({ notificationsGlobalEnabled: false });
        rebuildTrayMenu();
      },
    },
    {
      label: "Unmute all notifications",
      click: () => {
        updateSettings({
          notificationsGlobalEnabled: true,
          notificationsPausedUntil: null,
        });
        rebuildTrayMenu();
      },
    },
    {
      label: "Lock",
      enabled: false,
    },
    {
      label: "Check for updates",
      enabled: false,
    },
    {
      label: "Settings",
      click: () => {
        showMainWindow();
        setRunningInTray(false);
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        requestAppQuit();
      },
    },
  ]);

  tray.setContextMenu(menu);
}

export function handleCloseToTrayPreference(): "hide" | "quit" | "ask" {
  const { closeToTray } = getSettings();
  if (process.platform === "darwin") {
    return "hide";
  }
  if (closeToTray === true) return "hide";
  if (closeToTray === false) return "quit";
  return "ask";
}

export function hideToTray(): void {
  createTray();
  hideMainWindowToTray();
  setRunningInTray(true);
  rebuildTrayMenu();
}

const TRANSPARENT_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

// Keep app reference for future icon asset loading.
void app;
void getMainWindow;
