import { powerMonitor } from "electron";
import { log } from "../diagnostics/log-manager";
import { loadMetadata, persistMetadata, getSettings } from "../storage/metadata-store";
import { lockApp, noteUserActivity } from "../system/app-lock-manager";
import { recoverFailedAccounts } from "./crash-recovery";

let registered = false;
let resumeTimer: ReturnType<typeof setTimeout> | null = null;

export function registerPowerEvents(): void {
  if (registered) return;
  registered = true;

  powerMonitor.on("suspend", () => {
    try {
      const meta = loadMetadata();
      persistMetadata(meta);
    } catch {
      // ignore
    }
    log("info", "power_suspend", {});
  });

  powerMonitor.on("resume", () => {
    log("info", "power_resume", {});
    if (resumeTimer) clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => {
      void recoverFailedAccounts();
    }, 2_000);
  });

  powerMonitor.on("lock-screen", () => {
    if (getSettings().lockOnOsLock) {
      lockApp("os-lock");
    }
  });

  powerMonitor.on("unlock-screen", () => {
    noteUserActivity();
  });
}
