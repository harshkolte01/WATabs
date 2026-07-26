import { describe, expect, it } from "vitest";
import {
  canCheck,
  canInstall,
  canStartDownload,
  reduceUpdateState,
} from "../../apps/desktop/src/main/updates/update-state";

describe("update state machine", () => {
  it("allows check from idle/error/available", () => {
    expect(canCheck("idle")).toBe(true);
    expect(canCheck("error")).toBe(true);
    expect(canCheck("available")).toBe(true);
    expect(canCheck("downloading")).toBe(false);
  });

  it("transitions check → available → download → ready", () => {
    let state = reduceUpdateState("idle", "check_start");
    expect(state).toBe("checking");
    state = reduceUpdateState(state, "check_available");
    expect(state).toBe("available");
    expect(canStartDownload(state)).toBe(true);
    state = reduceUpdateState(state, "download_start");
    expect(state).toBe("downloading");
    state = reduceUpdateState(state, "download_done");
    expect(state).toBe("ready");
    expect(canInstall(state)).toBe(true);
  });

  it("maps check failure to error", () => {
    const state = reduceUpdateState("checking", "check_fail");
    expect(state).toBe("error");
  });

  it("maps not-available back to idle", () => {
    expect(reduceUpdateState("checking", "check_none")).toBe("idle");
  });
});
