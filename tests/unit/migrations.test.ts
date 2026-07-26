import { describe, expect, it } from "vitest";
import {
  createDefaultMetadata,
  migrateMetadata,
} from "../../apps/desktop/src/main/storage/migrations";

describe("migrateMetadata", () => {
  it("creates v2 defaults for empty input", () => {
    const meta = createDefaultMetadata();
    expect(meta.schemaVersion).toBe(2);
    expect(meta.accounts).toEqual([]);
    expect(meta.windowState).toBeNull();
    expect(meta.settings.launchMinimized).toBe(false);
    expect(meta.lastSelectedAccountId).toBeNull();
  });

  it("migrates missing schema through to v2", () => {
    const meta = migrateMetadata({ settings: { launchMinimized: true } });
    expect(meta.schemaVersion).toBe(2);
    expect(meta.settings.launchMinimized).toBe(true);
    expect(meta.accounts).toEqual([]);
  });

  it("upgrades stub accounts to full AccountRecord", () => {
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
    expect(meta.schemaVersion).toBe(2);
    expect(meta.accounts).toHaveLength(1);
    expect(meta.accounts[0]?.loadOnStartup).toBe(true);
    expect(meta.accounts[0]?.microphonePermission).toBe("ask");
    expect(meta.accounts[0]?.partition).toBe(`persist:wa-${id}`);
  });

  it("rejects future schema versions", () => {
    expect(() => migrateMetadata({ schemaVersion: 99 })).toThrow(
      /newer than supported/,
    );
  });
});
