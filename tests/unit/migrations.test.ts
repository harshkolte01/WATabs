import { describe, expect, it } from "vitest";
import {
  createDefaultMetadata,
  migrateMetadata,
} from "../../apps/desktop/src/main/storage/migrations";

describe("migrateMetadata", () => {
  it("creates v3 defaults for empty input", () => {
    const meta = createDefaultMetadata();
    expect(meta.schemaVersion).toBe(3);
    expect(meta.accounts).toEqual([]);
    expect(meta.windowState).toBeNull();
    expect(meta.settings.launchMinimized).toBe(false);
    expect(meta.settings.notificationsGlobalEnabled).toBe(true);
    expect(meta.settings.closeToTray).toBeNull();
    expect(meta.lastSelectedAccountId).toBeNull();
  });

  it("migrates missing schema through to v3", () => {
    const meta = migrateMetadata({ settings: { launchMinimized: true } });
    expect(meta.schemaVersion).toBe(3);
    expect(meta.settings.launchMinimized).toBe(true);
    expect(meta.settings.startAtLogin).toBe(false);
    expect(meta.accounts).toEqual([]);
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
    expect(meta.schemaVersion).toBe(3);
    expect(meta.accounts).toHaveLength(1);
    expect(meta.accounts[0]?.audioMuted).toBe(false);
    expect(meta.accounts[0]?.loadOnStartup).toBe(true);
  });

  it("rejects future schema versions", () => {
    expect(() => migrateMetadata({ schemaVersion: 99 })).toThrow(
      /newer than supported/,
    );
  });
});
