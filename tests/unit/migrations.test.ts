import { describe, expect, it } from "vitest";
import {
  createDefaultMetadata,
  migrateMetadata,
} from "../../apps/desktop/src/main/storage/migrations";

describe("migrateMetadata", () => {
  it("creates v4 defaults for empty input", () => {
    const meta = createDefaultMetadata();
    expect(meta.schemaVersion).toBe(4);
    expect(meta.accounts).toEqual([]);
    expect(meta.settings.askWhereToSaveEachFile).toBe(false);
    expect(meta.settings.downloadDirectory).toBeNull();
    expect(meta.settings.warnOnExecutableDownload).toBe(true);
  });

  it("migrates missing schema through to v4", () => {
    const meta = migrateMetadata({ settings: { launchMinimized: true } });
    expect(meta.schemaVersion).toBe(4);
    expect(meta.settings.launchMinimized).toBe(true);
    expect(meta.settings.startAtLogin).toBe(false);
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
    expect(meta.schemaVersion).toBe(4);
    expect(meta.accounts[0]?.audioMuted).toBe(false);
  });

  it("rejects future schema versions", () => {
    expect(() => migrateMetadata({ schemaVersion: 99 })).toThrow(
      /newer than supported/,
    );
  });
});
