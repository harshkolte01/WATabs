import { describe, expect, it } from "vitest";
import { shouldRefreshBackupBeforeWrite } from "../../apps/desktop/src/main/storage/backup-policy";

describe("metadata backup (M1)", () => {
  it("refreshes backup before primary overwrite, not after", () => {
    expect(shouldRefreshBackupBeforeWrite()).toBe(true);
  });
});
