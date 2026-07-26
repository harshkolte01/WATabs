import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
  app: { isPackaged: true },
}));

vi.mock("../../apps/desktop/src/main/diagnostics/log-manager", () => ({
  log: vi.fn(),
}));

import { assertTrustedShellSender } from "../../apps/desktop/src/main/ipc/sender-validation";

describe("assertTrustedShellSender", () => {
  it("allows app://shell origin", () => {
    expect(() =>
      assertTrustedShellSender({
        senderFrame: { url: "app://shell/index.html" },
      } as never),
    ).not.toThrow();
  });

  it("rejects whatsapp origin", () => {
    expect(() =>
      assertTrustedShellSender({
        senderFrame: { url: "https://web.whatsapp.com/" },
      } as never),
    ).toThrow(/trusted shell/);
  });
});
