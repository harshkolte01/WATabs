import path from "node:path";
import { BrowserWindow, WebContentsView } from "electron";
import { ipcChannels } from "@multi-whatsapp/validation";
import { log } from "../diagnostics/log-manager";
import { shellIndexUrl } from "../protocol/app-protocol";
import {
  abandonAllAccountViews,
  bindViewHost,
  relayout,
} from "../accounts/account-view-manager";
import { registerShellPromptSender } from "../permissions/shell-bridge";
import { layoutShellView } from "./view-layout";
import { resolveInitialWindowState, trackWindowState } from "./window-state";

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

let mainWindow: BrowserWindow | null = null;
let shellView: WebContentsView | null = null;

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function getShellView(): WebContentsView | null {
  return shellView;
}

function createShellView(): WebContentsView {
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
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void view.webContents.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    log("info", "shell_loaded_dev_vite", {});
  } else {
    void view.webContents.loadURL(shellIndexUrl());
    log("info", "shell_loaded_app_protocol", {
      scheme: "app",
      host: "shell",
    });
  }

  void MAIN_WINDOW_VITE_NAME;
  return view;
}

export function createMainWindow(): BrowserWindow {
  const initial = resolveInitialWindowState();

  mainWindow = new BrowserWindow({
    x: initial.bounds.x,
    y: initial.bounds.y,
    width: initial.bounds.width,
    height: initial.bounds.height,
    show: false,
    backgroundColor: "#0f1418",
    title: "Multi Account Desktop",
    webPreferences: {
      // Window webContents is unused; shell + accounts are WebContentsViews.
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      webviewTag: false,
    },
  });

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

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // Show once shell is ready (accounts restored before show in app-ready).
  shellView.webContents.once("did-finish-load", () => {
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    // Child WebContentsViews are already destroyed with the window.
    abandonAllAccountViews();
    shellView = null;
    mainWindow = null;
  });

  return mainWindow;
}

export function notifyShellAccountsChanged(reason: string): void {
  if (!shellView || shellView.webContents.isDestroyed()) {
    return;
  }
  shellView.webContents.send(ipcChannels.accountsChanged, reason);
}
