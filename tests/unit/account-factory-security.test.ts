import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("account factory security contracts", () => {
  it("does not attach a preload to WhatsApp WebContentsViews", () => {
    const file = path.resolve(
      __dirname,
      "../../apps/desktop/src/main/accounts/account-factory.ts",
    );
    const source = fs.readFileSync(file, "utf8");
    expect(source).toMatch(/No preload/);
    expect(source).not.toMatch(/preload\s*:/);
  });
});
