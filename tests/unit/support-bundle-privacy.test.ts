import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
  app: {
    getPath: () => "/tmp/watabs-test",
    getName: () => "WATabs",
    getVersion: () => "0.0.0",
    isPackaged: false,
  },
  dialog: { showSaveDialog: vi.fn() },
  safeStorage: {
    isEncryptionAvailable: () => false,
  },
}));

vi.mock("../../apps/desktop/src/main/diagnostics/log-manager", () => ({
  log: vi.fn(),
}));

vi.mock("../../apps/desktop/src/main/storage/metadata-store", () => ({
  getSettings: () => ({
    launchMinimized: false,
    notificationsGlobalEnabled: true,
    notificationsPausedUntil: null,
    closeToTray: null,
    startAtLogin: false,
    startHiddenInTray: false,
    askWhereToSaveEachFile: false,
    downloadDirectory: null,
    warnOnExecutableDownload: true,
    appLockEnabled: false,
    autoLockMinutes: null,
    lockOnOsLock: true,
    requirePinAfterRestart: true,
    hideAccountLabelsWhenLocked: false,
  }),
  loadMetadata: () => ({
    schemaVersion: 5,
    windowState: null,
    settings: {},
    accounts: [],
    lastSelectedAccountId: null,
  }),
}));

vi.mock("../../apps/desktop/src/main/diagnostics/system-status", () => ({
  getSystemStatus: () => ({
    appName: "WATabs",
    appVersion: "0.0.0",
    electron: "0",
    chrome: "0",
    platform: "win32",
    arch: "x64",
    isPackaged: false,
    schemaVersion: 5,
    loadedAccountCount: 0,
    accountStatuses: [],
    approximateMemoryMb: 1,
    unexpectedRestart: false,
    appLockEnabled: false,
    appLocked: false,
  }),
}));

import { supportBundleContainsPartitionData } from "../../apps/desktop/src/main/diagnostics/support-bundle";

describe("support bundle privacy (D1)", () => {
  it("payload does not include partition/cookie paths", () => {
    expect(supportBundleContainsPartitionData()).toBe(false);
  });
});
