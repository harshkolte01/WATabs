import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
  app: { isPackaged: true },
}));

vi.mock("../../apps/desktop/src/main/diagnostics/log-manager", () => ({
  log: vi.fn(),
}));

import { assertTrustedShellSender } from "../../apps/desktop/src/main/ipc/sender-validation";

describe("account IPC sender wall", () => {
  it("allows trusted shell", () => {
    expect(() =>
      assertTrustedShellSender({
        senderFrame: { url: "watabs://shell/index.html" },
      } as never),
    ).not.toThrow();
  });

  it("rejects WhatsApp web contents", () => {
    expect(() =>
      assertTrustedShellSender({
        senderFrame: { url: "https://web.whatsapp.com/" },
      } as never),
    ).toThrow(/trusted shell/);
  });
});
