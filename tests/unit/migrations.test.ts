import { describe, expect, it } from "vitest";
import {
  createDefaultMetadata,
  migrateMetadata,
} from "../../apps/desktop/src/main/storage/migrations";

describe("migrateMetadata", () => {
  it("creates defaults for empty input", () => {
    const meta = createDefaultMetadata();
    expect(meta.schemaVersion).toBe(1);
    expect(meta.accounts).toEqual([]);
    expect(meta.windowState).toBeNull();
    expect(meta.settings.launchMinimized).toBe(false);
  });

  it("migrates missing schema to v1", () => {
    const meta = migrateMetadata({ settings: { launchMinimized: true } });
    expect(meta.schemaVersion).toBe(1);
    expect(meta.settings.launchMinimized).toBe(true);
    expect(meta.accounts).toEqual([]);
  });

  it("rejects future schema versions", () => {
    expect(() => migrateMetadata({ schemaVersion: 99 })).toThrow(/newer than supported/);
  });
});
