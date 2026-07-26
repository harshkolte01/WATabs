import { app } from "electron";
import {
  configureAppIdentity,
  onAppReady,
} from "./bootstrap/app-ready";
import { acquireSingleInstanceLock } from "./bootstrap/single-instance";
import { registerAppSchemePrivileged } from "./protocol/app-protocol";
import { createMainWindow, getMainWindow } from "./windows/main-window";

// Must run before app ready.
registerAppSchemePrivileged();
configureAppIdentity();

if (!acquireSingleInstanceLock()) {
  // Duplicate instance exits inside acquireSingleInstanceLock.
} else {
  app.whenReady().then(() => {
    void onAppReady();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    if (getMainWindow() === null && app.isReady()) {
      createMainWindow();
    }
  });
}
