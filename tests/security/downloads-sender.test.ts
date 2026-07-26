import { describe, expect, it, vi } from "vitest";
import { downloadIdSchema } from "@multi-whatsapp/validation";

vi.mock("electron", () => ({
  app: { isPackaged: true },
}));

vi.mock("../../apps/desktop/src/main/diagnostics/log-manager", () => ({
  log: vi.fn(),
}));

import { assertTrustedShellSender } from "../../apps/desktop/src/main/ipc/sender-validation";
import { cancelDownload } from "../../apps/desktop/src/main/downloads/download-manager";

describe("downloads IPC sender wall (F5)", () => {
  it("rejects WhatsApp senders", () => {
    expect(() =>
      assertTrustedShellSender({
        senderFrame: { url: "https://web.whatsapp.com/" },
      } as never),
    ).toThrow(/trusted shell/);
  });

  it("allows shell", () => {
    expect(() =>
      assertTrustedShellSender({
        senderFrame: { url: "watabs://shell/index.html" },
      } as never),
    ).not.toThrow();
  });

  it("rejects unknown download ids", () => {
    const id = downloadIdSchema.parse(
      "b0000000-0000-4000-8000-000000000099",
    );
    expect(() => cancelDownload(id)).toThrow(/Unknown or inactive download/);
  });
});
