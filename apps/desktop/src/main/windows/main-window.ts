import path from "node:path";
import { BrowserWindow, WebContentsView, app } from "electron";
import { ipcChannels } from "@multi-whatsapp/validation";
import {
  isDevToolsShortcut,
  shellDevToolsEnabled,
} from "../accounts/devtools-policy";
import { loadAppIcon } from "../assets/app-icon";
import { log } from "../diagnostics/log-manager";
import { shellIndexUrl } from "../protocol/app-protocol";
import {
  abandonAllAccountViews,
  bindViewHost,
  relayout,
} from "../accounts/account-view-manager";
import { registerShellPromptSender } from "../permissions/shell-bridge";
import {
  createTray,
  handleCloseToTrayPreference,
  hideToTray,
  setRunningInTray,
} from "../system/tray-manager";
import { getSettings, updateSettings } from "../storage/metadata-store";
import { isAppQuitting, requestAppQuit } from "./app-lifecycle";
import { askCloseToTrayPrompt } from "./close-prompt";
import { layoutShellView } from "./view-layout";
import { resolveInitialWindowState, trackWindowState } from "./window-state";

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

let mainWindow: BrowserWindow | null = null;
let shellView: WebContentsView | null = null;
let handlingClose = false;

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function getShellView(): WebContentsView | null {
  return shellView;
}

export function showMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.show();
  mainWindow.focus();
  setRunningInTray(false);
}

export function hideMainWindowToTray(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.hide();
}

function createShellView(): WebContentsView {
  const allowDevTools = shellDevToolsEnabled(app.isPackaged);
  const view = new WebContentsView({
    webPreferences: {
      partition: "persist:desktop-shell",
      preload: path.join(__dirname, "shell-preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      spellcheck: false,
      devTools: allowDevTools,
    },
  });

  if (!allowDevTools) {
    view.webContents.on("before-input-event", (event, input) => {
      if (isDevToolsShortcut(input)) {
        event.preventDefault();
      }
    });
  }

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void view.webContents.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    log("info", "shell_loaded_dev_vite", {});
  } else {
    void view.webContents.loadURL(shellIndexUrl());
    log("info", "shell_loaded_app_protocol", {
      scheme: "watabs",
      host: "shell",
    });
  }

  // Never let shell popups/hand-offs send custom protocols to the OS
  // (avoids Windows “Get an app to open this 'app'/'watabs' link”).
  view.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      void import("../navigation/external-link-policy").then(
        ({ openValidatedExternalUrl }) => {
          void openValidatedExternalUrl(url);
        },
      );
    } else {
      log("warn", "shell_popup_blocked", {});
    }
    return { action: "deny" };
  });

  void MAIN_WINDOW_VITE_NAME;
  return view;
}

export function createMainWindow(options: { show?: boolean } = {}): BrowserWindow {
  const { show = true } = options;
  const initial = resolveInitialWindowState();
  const settings = getSettings();

  const windowIcon = loadAppIcon();
  mainWindow = new BrowserWindow({
    x: initial.bounds.x,
    y: initial.bounds.y,
    width: initial.bounds.width,
    height: initial.bounds.height,
    show: false,
    backgroundColor: "#0f1418",
    title: "WATabs",
    icon: windowIcon.isEmpty() ? undefined : windowIcon,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      webviewTag: false,
    },
  });

  // Re-apply after create — Windows taskbar sometimes ignores constructor icon in dev.
  if (!windowIcon.isEmpty()) {
    mainWindow.setIcon(windowIcon);
  }

  if (initial.isMaximized) {
    mainWindow.maximize();
  }

  trackWindowState(mainWindow);
  bindViewHost(mainWindow);

  shellView = createShellView();
  mainWindow.contentView.addChildView(shellView);
  layoutShellView(mainWindow, shellView);
  registerShellPromptSender((channel, payload) => {
    if (!shellView || shellView.webContents.isDestroyed()) return;
    shellView.webContents.send(channel, payload);
  });

  mainWindow.on("resize", () => {
    if (!mainWindow || !shellView) return;
    layoutShellView(mainWindow, shellView);
    relayout();
  });

  mainWindow.on("close", (event) => {
    if (isAppQuitting() || handlingClose) {
      return;
    }
    event.preventDefault();
    void handleWindowCloseRequest();
  });

  mainWindow.on("closed", () => {
    abandonAllAccountViews();
    shellView = null;
    mainWindow = null;
  });

  if (show && !settings.launchMinimized) {
    shellView.webContents.once("did-finish-load", () => {
      mainWindow?.show();
    });
  } else if (!show) {
    createTray();
    setRunningInTray(true);
  }

  return mainWindow;
}

async function handleWindowCloseRequest(): Promise<void> {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  handlingClose = true;
  try {
    const preference = handleCloseToTrayPreference();
    if (preference === "quit") {
      requestAppQuit();
      return;
    }
    if (preference === "hide") {
      hideToTray();
      return;
    }

    // Windows first-close ask
    const { choice, remember } = await askCloseToTrayPrompt();
    if (remember) {
      updateSettings({ closeToTray: choice === "keep" });
    }
    if (choice === "quit") {
      requestAppQuit();
      return;
    }
    hideToTray();
  } finally {
    handlingClose = false;
  }
}

export function notifyShellAccountsChanged(reason: string): void {
  if (!shellView || shellView.webContents.isDestroyed()) {
    return;
  }
  shellView.webContents.send(ipcChannels.accountsChanged, reason);
}
