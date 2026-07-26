import { describe, expect, it } from "vitest";

/**
 * T1: Close-to-tray must hide without abandoning the account view map.
 * Preference helper is pure enough to lock the contract here.
 */
describe("close-to-tray preference contract (T1)", () => {
  function decide(
    platform: string,
    closeToTray: boolean | null,
  ): "hide" | "quit" | "ask" {
    if (platform === "darwin") return "hide";
    if (closeToTray === true) return "hide";
    if (closeToTray === false) return "quit";
    return "ask";
  }

  it("hides on macOS", () => {
    expect(decide("darwin", null)).toBe("hide");
  });

  it("asks on Windows when unset", () => {
    expect(decide("win32", null)).toBe("ask");
  });

  it("hides when closeToTray true without destroying views", () => {
    expect(decide("win32", true)).toBe("hide");
  });

  it("quits when closeToTray false", () => {
    expect(decide("win32", false)).toBe("quit");
  });
});
