import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
  app: { getPath: () => "/tmp", isPackaged: false },
}));

vi.mock("../../apps/desktop/src/main/diagnostics/log-manager", () => ({
  log: vi.fn(),
}));

import {
  areNotificationsGloballyAllowed,
  decidePermissionSync,
} from "../../apps/desktop/src/main/permissions/permission-broker";

describe("notification mute policy (M1/M2)", () => {
  it("denies when global mute is off", () => {
    expect(
      areNotificationsGloballyAllowed({
        notificationsGlobalEnabled: false,
        notificationsPausedUntil: null,
      }),
    ).toBe(false);
  });

  it("denies when pause-until is in the future", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(
      areNotificationsGloballyAllowed({
        notificationsGlobalEnabled: true,
        notificationsPausedUntil: future,
        now: Date.now(),
      }),
    ).toBe(false);
  });

  it("allows when global enabled and pause expired", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(
      areNotificationsGloballyAllowed({
        notificationsGlobalEnabled: true,
        notificationsPausedUntil: past,
        now: Date.now(),
      }),
    ).toBe(true);
  });

  it("denies account notifications when disabled", () => {
    expect(
      decidePermissionSync({
        originOk: true,
        family: "notifications",
        pref: "disabled",
        globalNotificationsAllowed: true,
      }),
    ).toBe("deny");
  });

  it("denies when globalNotificationsAllowed is false", () => {
    expect(
      decidePermissionSync({
        originOk: true,
        family: "notifications",
        pref: "enabled",
        globalNotificationsAllowed: false,
      }),
    ).toBe("deny");
  });
});
