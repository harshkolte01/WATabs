import { app } from "electron";
import {
  CURRENT_SCHEMA_VERSION,
  type SystemStatus,
} from "@multi-whatsapp/shared-types";
import { getLoadedAccountIds } from "../accounts/account-view-manager";
import { listRecoveryStates } from "../lifecycle/crash-recovery";
import { wasUnexpectedRestart } from "../lifecycle/shutdown-marker";
import { getLockStatus, isAppLocked } from "../system/app-lock-manager";

export function getSystemStatus(): SystemStatus {
  let approximateMemoryMb: number | null = null;
  try {
    approximateMemoryMb = Math.round(
      process.memoryUsage().rss / (1024 * 1024),
    );
  } catch {
    approximateMemoryMb = null;
  }

  return {
    appName: app.getName(),
    appVersion: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    platform: process.platform,
    arch: process.arch,
    isPackaged: app.isPackaged,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    loadedAccountCount: getLoadedAccountIds().length,
    accountStatuses: listRecoveryStates(),
    approximateMemoryMb,
    unexpectedRestart: wasUnexpectedRestart(),
    appLockEnabled: getLockStatus().enabled,
    appLocked: isAppLocked(),
  };
}
