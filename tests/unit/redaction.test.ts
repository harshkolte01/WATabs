import { describe, expect, it } from "vitest";
import { sanitizeLogFields } from "../../apps/desktop/src/main/diagnostics/redaction";

describe("sanitizeLogFields", () => {
  it("redacts sensitive keys and urls", () => {
    const out = sanitizeLogFields({
      token: "abc",
      message: "hello",
      path: "https://web.whatsapp.com/foo",
      ok: true,
    });
    expect(out.token).toBe("[redacted]");
    expect(out.message).toBe("[redacted]");
    expect(out.path).toBe("[redacted-url]");
    expect(out.ok).toBe(true);
  });
});
