import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
  app: { getPath: () => "/tmp", isPackaged: false },
}));

vi.mock("../../apps/desktop/src/main/diagnostics/log-manager", () => ({
  log: vi.fn(),
}));

import {
  classifyPermission,
  decidePermissionSync,
  evaluatePermissionCheck,
  resolveAccountIdFromPartition,
} from "../../apps/desktop/src/main/permissions/permission-broker";

describe("permission-broker", () => {
  it("classifies known families and unknown (P1)", () => {
    expect(classifyPermission("notifications")).toBe("notifications");
    expect(classifyPermission("microphone")).toBe("microphone");
    expect(classifyPermission("videoCapture")).toBe("camera");
    expect(classifyPermission("display-capture")).toBe("display-capture");
    expect(classifyPermission("geolocation")).toBe("unknown");
  });

  it("resolves account id from partition", () => {
    const id = "a0000000-0000-4000-8000-000000000001";
    expect(resolveAccountIdFromPartition(`persist:wa-${id}`)).toBe(id);
    expect(resolveAccountIdFromPartition("persist:desktop-shell")).toBeNull();
  });

  it("denies non-WA origin and unknown (P1/P2)", () => {
    expect(
      decidePermissionSync({
        originOk: false,
        family: "microphone",
        pref: "allow",
      }),
    ).toBe("deny");
    expect(
      decidePermissionSync({
        originOk: true,
        family: "unknown",
        pref: "allow",
      }),
    ).toBe("deny");
  });

  it("honors block / ask / allow prefs (P3/P4)", () => {
    expect(
      decidePermissionSync({
        originOk: true,
        family: "microphone",
        pref: "block",
      }),
    ).toBe("deny");
    expect(
      decidePermissionSync({
        originOk: true,
        family: "microphone",
        pref: "ask",
      }),
    ).toBe("ask");
    expect(
      decidePermissionSync({
        originOk: true,
        family: "microphone",
        pref: "allow",
      }),
    ).toBe("allow");
  });

  it("denies notifications from non-WA origin (P2/P5 gate)", () => {
    expect(
      evaluatePermissionCheck({
        accountId: "a0000000-0000-4000-8000-000000000001",
        permission: "notifications",
        requestingOrigin: "https://evil.example",
      }),
    ).toBe(false);
  });

  it("display-capture ask still prompts (M2)", () => {
    expect(
      decidePermissionSync({
        originOk: true,
        family: "display-capture",
        pref: "ask",
      }),
    ).toBe("ask");
  });
});
