import { describe, expect, it } from "vitest";
import {
  createDefaultMetadata,
  migrateMetadata,
} from "../../apps/desktop/src/main/storage/migrations";

describe("migrateMetadata", () => {
  it("creates v6 defaults for empty input (R1)", () => {
    const meta = createDefaultMetadata();
    expect(meta.schemaVersion).toBe(6);
    expect(meta.accounts).toEqual([]);
    expect(meta.settings.appLockEnabled).toBe(false);
    expect(meta.settings.autoLockMinutes).toBeNull();
    expect(meta.settings.lockOnOsLock).toBe(true);
    expect(meta.settings.updateChannel).toBe("stable");
    expect(meta.settings.lastUpdateCheckAt).toBeNull();
  });

  it("migrates missing schema through to v6", () => {
    const meta = migrateMetadata({ settings: { launchMinimized: true } });
    expect(meta.schemaVersion).toBe(6);
    expect(meta.settings.launchMinimized).toBe(true);
    expect(meta.settings.appLockEnabled).toBe(false);
    expect(meta.settings.updateChannel).toBe("stable");
  });

  it("upgrades v4 settings to v6 lock + update defaults", () => {
    const meta = migrateMetadata({
      schemaVersion: 4,
      windowState: null,
      settings: {
        launchMinimized: false,
        notificationsGlobalEnabled: true,
        notificationsPausedUntil: null,
        closeToTray: null,
        startAtLogin: false,
        startHiddenInTray: false,
        askWhereToSaveEachFile: false,
        downloadDirectory: null,
        warnOnExecutableDownload: true,
      },
      accounts: [],
      lastSelectedAccountId: null,
    });
    expect(meta.schemaVersion).toBe(6);
    expect(meta.settings.requirePinAfterRestart).toBe(true);
    expect(meta.settings.updateChannel).toBe("stable");
  });

  it("upgrades stub accounts with audioMuted default", () => {
    const id = "a0000000-0000-4000-8000-000000000001";
    const meta = migrateMetadata({
      schemaVersion: 1,
      accounts: [
        {
          id,
          label: "Personal",
          partition: `persist:wa-${id}`,
          order: 0,
          enabled: true,
        },
      ],
    });
    expect(meta.schemaVersion).toBe(6);
    expect(meta.accounts[0]?.audioMuted).toBe(false);
  });

  it("upgrades v5 to v6 update channel defaults", () => {
    const meta = migrateMetadata({
      schemaVersion: 5,
      windowState: null,
      settings: {
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
      },
      accounts: [],
      lastSelectedAccountId: null,
    });
    expect(meta.schemaVersion).toBe(6);
    expect(meta.settings.updateChannel).toBe("stable");
  });

  it("rejects future schema versions", () => {
    expect(() => migrateMetadata({ schemaVersion: 99 })).toThrow(
      /newer than supported/,
    );
  });
});
