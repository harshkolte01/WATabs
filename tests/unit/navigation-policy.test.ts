import { describe, expect, it } from "vitest";
import {
  classifyNavigationUrl,
  mayNavigateInternally,
} from "../../apps/desktop/src/main/navigation/protocol-allowlist";

describe("navigation policy contracts", () => {
  it("allows WhatsApp main-frame targets (N2)", () => {
    expect(mayNavigateInternally("https://web.whatsapp.com/")).toBe(true);
  });

  it("denies foreign https for in-app navigation (N1)", () => {
    expect(mayNavigateInternally("https://evil.example/")).toBe(false);
    expect(classifyNavigationUrl("https://evil.example/").kind).toBe(
      "external",
    );
  });

  it("treats leaving WA as external or blocked (N3)", () => {
    const leaving = classifyNavigationUrl("https://accounts.google.com/");
    expect(leaving.kind).toBe("external");
    expect(mayNavigateInternally("https://accounts.google.com/")).toBe(false);
  });
});
