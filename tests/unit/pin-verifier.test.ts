import { describe, expect, it } from "vitest";
import {
  createPinVerifier,
  unlockDelayMs,
  verifyPin,
} from "../../apps/desktop/src/main/storage/pin-verifier";

describe("pin-verifier (L1/L2)", () => {
  it("accepts correct PIN and rejects wrong (L1)", async () => {
    const record = await createPinVerifier("1234");
    expect(await verifyPin("1234", record)).toBe(true);
    expect(await verifyPin("9999", record)).toBe(false);
    expect(await verifyPin("12", record)).toBe(false);
  });

  it("applies exponential unlock delay (L2)", () => {
    expect(unlockDelayMs(0)).toBe(0);
    expect(unlockDelayMs(1)).toBe(1000);
    expect(unlockDelayMs(2)).toBe(2000);
    expect(unlockDelayMs(3)).toBe(4000);
    expect(unlockDelayMs(10)).toBe(30_000);
  });
});
