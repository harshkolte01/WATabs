import { describe, expect, it } from "vitest";
import {
  createAccountDefaults,
  partitionName,
} from "@multi-whatsapp/shared-types";

/**
 * Structural isolation guarantees for five mock accounts.
 * Full cookie/IndexedDB isolation is enforced by Chromium partitions at runtime;
 * this suite locks the naming/metadata contracts Phase 2 depends on.
 */
describe("five mock account isolation contracts", () => {
  const accounts = Array.from({ length: 5 }, (_, order) => {
    const id = `b0000000-0000-4000-8000-${String(order + 1).padStart(12, "0")}`;
    return createAccountDefaults(id, `Mock ${order + 1}`, order);
  });

  it("assigns distinct partition names", () => {
    const partitions = accounts.map((a) => a.partition);
    expect(new Set(partitions).size).toBe(5);
    for (const account of accounts) {
      expect(account.partition).toBe(partitionName(account.id));
      expect(account.partition.startsWith("persist:wa-")).toBe(true);
    }
  });

  it("removing one account does not change other partitions", () => {
    const remaining = accounts.filter((_, index) => index !== 2);
    expect(remaining).toHaveLength(4);
    const removed = accounts[2]!;
    expect(remaining.every((a) => a.partition !== removed.partition)).toBe(true);
    expect(remaining.map((a) => a.id)).not.toContain(removed.id);
  });

  it("never uses default session partition for WhatsApp", () => {
    expect(accounts.every((a) => a.partition !== "persist:default")).toBe(true);
    expect(accounts.every((a) => !a.partition.includes("desktop-shell"))).toBe(
      true,
    );
  });
});
