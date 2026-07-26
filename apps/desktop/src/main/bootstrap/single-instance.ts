import { app } from "electron";
import { getMainWindow } from "../windows/main-window";
import { log } from "../diagnostics/log-manager";

export function acquireSingleInstanceLock(): boolean {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    log("info", "single_instance_quit_duplicate", {});
    app.quit();
    return false;
  }

  app.on("second-instance", () => {
    const win = getMainWindow();
    if (!win) {
      return;
    }
    if (win.isMinimized()) {
      win.restore();
    }
    win.focus();
  });

  return true;
}
