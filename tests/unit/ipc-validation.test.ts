import { describe, expect, it } from "vitest";
import { updateSettingsSchema } from "@multi-whatsapp/validation";

describe("updateSettingsSchema", () => {
  it("accepts partial settings", () => {
    const parsed = updateSettingsSchema.parse({ launchMinimized: true });
    expect(parsed.launchMinimized).toBe(true);
  });

  it("rejects unknown types", () => {
    expect(() =>
      updateSettingsSchema.parse({ launchMinimized: "yes" }),
    ).toThrow();
  });
});
