import { app } from "electron";
import { abandonAllAccountViews } from "../accounts/account-view-manager";
import { writeCleanShutdownMarker } from "../lifecycle/shutdown-marker";
import { destroyTray } from "../system/tray-manager";
import { log } from "../diagnostics/log-manager";

let quitting = false;

export function isAppQuitting(): boolean {
  return quitting;
}

export function requestAppQuit(): void {
  quitting = true;
  destroyTray();
  abandonAllAccountViews();
  try {
    writeCleanShutdownMarker();
  } catch {
    // ignore
  }
  log("info", "app_quit_requested", {});
  app.quit();
}
