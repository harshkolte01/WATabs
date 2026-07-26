import { describe, expect, it } from "vitest";
import { clearHistoryDeletesFiles } from "../../apps/desktop/src/main/downloads/download-store";

describe("download history (F4)", () => {
  it("clearHistory contract never deletes files", () => {
    expect(clearHistoryDeletesFiles()).toBe(false);
  });
});
