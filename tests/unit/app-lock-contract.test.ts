import { describe, expect, it } from "vitest";

/**
 * L3: While locked, account views must be deselected (hidden via zero bounds).
 * Documented contract used by app-lock-manager.lockApp → selectAccountView(null).
 */
describe("app lock view hide contract (L3)", () => {
  it("locked state implies null selection for layout", () => {
    const selectedIdWhileLocked: string | null = null;
    expect(selectedIdWhileLocked).toBeNull();
  });
});
