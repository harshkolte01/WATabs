import { describe, expect, it } from "vitest";
import {
  createAccountDefaults,
  partitionName,
} from "@multi-whatsapp/shared-types";
import {
  reorderAccountsInputSchema,
  sanitizeAccountLabel,
} from "@multi-whatsapp/validation";

describe("account helpers", () => {
  it("builds unique partitions from UUIDs", () => {
    const a = "a0000000-0000-4000-8000-000000000001";
    const b = "a0000000-0000-4000-8000-000000000002";
    expect(partitionName(a)).toBe(`persist:wa-${a}`);
    expect(partitionName(b)).toBe(`persist:wa-${b}`);
    expect(partitionName(a)).not.toBe(partitionName(b));
  });

  it("creates five isolated mock account records", () => {
    const accounts = Array.from({ length: 5 }, (_, order) => {
      const id = `a0000000-0000-4000-8000-${String(order).padStart(12, "0")}`;
      return createAccountDefaults(id, `Mock ${order + 1}`, order);
    });
    const partitions = new Set(accounts.map((a) => a.partition));
    expect(partitions.size).toBe(5);
    expect(accounts.every((a) => a.enabled)).toBe(true);
  });

  it("sanitizes labels", () => {
    expect(sanitizeAccountLabel("  Work   Desk  ")).toBe("Work Desk");
  });

  it("validates reorder payloads", () => {
    const ids = [
      "a0000000-0000-4000-8000-000000000001",
      "a0000000-0000-4000-8000-000000000002",
    ];
    expect(reorderAccountsInputSchema.parse({ accountIds: ids }).accountIds).toEqual(
      ids,
    );
  });
});
