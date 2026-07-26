import { describe, expect, it } from "vitest";
import {
  classifyNavigationUrl,
  isAllowedWhatsAppOrigin,
  mayNavigateInternally,
} from "../../apps/desktop/src/main/navigation/protocol-allowlist";

describe("protocol-allowlist", () => {
  it("allows exact WhatsApp origin internally", () => {
    expect(mayNavigateInternally("https://web.whatsapp.com/")).toBe(true);
    expect(mayNavigateInternally("https://web.whatsapp.com/send?phone=1")).toBe(
      true,
    );
    expect(isAllowedWhatsAppOrigin("https://web.whatsapp.com")).toBe(true);
  });

  it("does not treat prefix lookalikes as WhatsApp", () => {
    expect(
      mayNavigateInternally("https://web.whatsapp.com.evil.example/"),
    ).toBe(false);
    expect(isAllowedWhatsAppOrigin("https://evil.web.whatsapp.com")).toBe(
      false,
    );
  });

  it("classifies safe external http(s)", () => {
    expect(classifyNavigationUrl("https://example.com/a").kind).toBe(
      "external",
    );
    expect(classifyNavigationUrl("http://example.com/a").kind).toBe("external");
  });

  it("blocks dangerous protocols (N5)", () => {
    for (const raw of [
      "javascript:alert(1)",
      "file:///C:/Windows/System32/cmd.exe",
      "data:text/html,hi",
      "shell:foo",
      "cmd:calc",
      "powershell:Get-Process",
      "ms-settings:privacy",
      "vbscript:msgbox",
    ]) {
      const result = classifyNavigationUrl(raw);
      expect(result.kind).toBe("blocked");
    }
  });

  it("blocks embedded credentials (N6)", () => {
    expect(
      classifyNavigationUrl("https://user:pass@example.com/path").kind,
    ).toBe("blocked");
  });

  it("blocks malformed URLs", () => {
    expect(classifyNavigationUrl("not a url").kind).toBe("blocked");
  });
});
