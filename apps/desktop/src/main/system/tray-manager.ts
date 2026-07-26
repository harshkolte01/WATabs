import { Menu, Tray } from "electron";
import { loadAppIcon } from "../assets/app-icon";
import {
  listAccountRecords,
  selectAccount,
} from "../accounts/account-manager";
import { getSettings, updateSettings } from "../storage/metadata-store";
import { log } from "../diagnostics/log-manager";
import {
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

  const traySize = process.platform === "win32" ? 16 : 22;
  const icon = loadAppIcon(traySize);
  tray = new Tray(icon);
  tray.setToolTip("WATabs");
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
      enabled: getSettings().appLockEnabled,
      click: () => {
        void import("./app-lock-manager").then(({ lockApp }) => {
          lockApp("tray");
          showMainWindow();
        });
      },
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
