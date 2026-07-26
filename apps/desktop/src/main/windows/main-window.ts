import path from "node:path";
import { BrowserWindow } from "electron";
import { log } from "../diagnostics/log-manager";
import { shellIndexUrl } from "../protocol/app-protocol";
import { resolveInitialWindowState, trackWindowState } from "./window-state";

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

let mainWindow: BrowserWindow | null = null;

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
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

  if (initial.isMaximized) {
    mainWindow.maximize();
  }

  trackWindowState(mainWindow);

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    // Dev: Vite HMR. Production uses app:// only.
    void mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    log("info", "shell_loaded_dev_vite", {});
  } else {
    void mainWindow.loadURL(shellIndexUrl());
    log("info", "shell_loaded_app_protocol", {
      // Do not log full sensitive URLs beyond scheme host.
      scheme: "app",
      host: "shell",
    });
  }

  // Silence unused constant if forge injects name only in some builds.
  void MAIN_WINDOW_VITE_NAME;

  return mainWindow;
}
