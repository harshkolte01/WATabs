import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { accountViewDevToolsEnabled } from "../../apps/desktop/src/main/accounts/devtools-policy";

describe("production DevTools restriction (D1)", () => {
  it("disables DevTools when packaged", () => {
    expect(accountViewDevToolsEnabled(true)).toBe(false);
    expect(accountViewDevToolsEnabled(false)).toBe(true);
  });

  it("wires account factory to DevTools policy and navigation/permissions", () => {
    const file = path.resolve(
      __dirname,
      "../../apps/desktop/src/main/accounts/account-factory.ts",
    );
    const source = fs.readFileSync(file, "utf8");
    expect(source).toMatch(/accountViewDevToolsEnabled\(app\.isPackaged\)/);
    expect(source).toMatch(/attachNavigationPolicy/);
    expect(source).toMatch(/attachSessionPermissionHandlers/);
  });
});
