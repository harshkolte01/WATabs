import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  accountViewDevToolsEnabled,
  isDevToolsShortcut,
  shellDevToolsEnabled,
} from "../../apps/desktop/src/main/accounts/devtools-policy";

describe("production DevTools restriction (D1)", () => {
  it("disables DevTools when packaged for account and shell", () => {
    expect(accountViewDevToolsEnabled(true)).toBe(false);
    expect(accountViewDevToolsEnabled(false)).toBe(true);
    expect(shellDevToolsEnabled(true)).toBe(false);
    expect(shellDevToolsEnabled(false)).toBe(true);
  });

  it("detects common DevTools shortcuts", () => {
    expect(
      isDevToolsShortcut({ type: "keyDown", key: "F12" }),
    ).toBe(true);
    expect(
      isDevToolsShortcut({
        type: "keyDown",
        key: "I",
        control: true,
        shift: true,
      }),
    ).toBe(true);
    expect(
      isDevToolsShortcut({ type: "keyDown", key: "a", control: true }),
    ).toBe(false);
  });

  it("wires account factory and shell to DevTools policy", () => {
    const accountFactory = path.resolve(
      __dirname,
      "../../apps/desktop/src/main/accounts/account-factory.ts",
    );
    const mainWindow = path.resolve(
      __dirname,
      "../../apps/desktop/src/main/windows/main-window.ts",
    );
    const appMenu = path.resolve(
      __dirname,
      "../../apps/desktop/src/main/windows/application-menu.ts",
    );
    expect(fs.readFileSync(accountFactory, "utf8")).toMatch(
      /accountViewDevToolsEnabled\(app\.isPackaged\)/,
    );
    expect(fs.readFileSync(mainWindow, "utf8")).toMatch(
      /shellDevToolsEnabled\(app\.isPackaged\)/,
    );
    expect(fs.readFileSync(appMenu, "utf8")).toMatch(
      /Toggle Developer Tools|devtools/i,
    );
    // Packaged menu must not include toggleDevTools role.
    expect(fs.readFileSync(appMenu, "utf8")).not.toMatch(
      /role:\s*["']toggleDevTools["']/,
    );
  });
});
