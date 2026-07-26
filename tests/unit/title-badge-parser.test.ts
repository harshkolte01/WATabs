import { describe, expect, it } from "vitest";
import { parseUnreadCount } from "../../apps/desktop/src/main/notifications/title-badge-parser";

describe("parseUnreadCount (B1/B2)", () => {
  it("parses leading numeric count", () => {
    expect(parseUnreadCount("(3) WhatsApp")).toBe(3);
    expect(parseUnreadCount("(12) WhatsApp")).toBe(12);
  });

  it("returns null for chat names or junk", () => {
    expect(parseUnreadCount("WhatsApp")).toBeNull();
    expect(parseUnreadCount("Alice: hello")).toBeNull();
    expect(parseUnreadCount("(x) WhatsApp")).toBeNull();
    expect(parseUnreadCount("")).toBeNull();
  });
});
