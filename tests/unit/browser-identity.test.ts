import { describe, expect, it } from "vitest";
import { chromiumBrowserUserAgent } from "../../apps/desktop/src/main/accounts/browser-identity";

describe("chromiumBrowserUserAgent", () => {
  it("strips Electron and app product tokens while keeping Chrome", () => {
    const input =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) multi-whatsapp-desktop/0.0.0 Chrome/150.0.7871.129 Electron/43.2.0 Safari/537.36";
    const ua = chromiumBrowserUserAgent(input);
    expect(ua).not.toMatch(/Electron\//);
    expect(ua).not.toMatch(/multi-whatsapp-desktop\//);
    expect(ua).toMatch(/Chrome\/\d+\./);
    expect(ua).toMatch(/Safari\/537\.36/);
  });
});
