import { beforeEach, describe, expect, it, vi } from "vitest";

const openExternal = vi.fn(async () => undefined);

vi.mock("electron", () => ({
  shell: {
    openExternal: (...args: unknown[]) => openExternal(...args),
  },
}));

vi.mock("../../apps/desktop/src/main/diagnostics/log-manager", () => ({
  log: vi.fn(),
}));

vi.mock("../../apps/desktop/src/main/permissions/permission-prompt", () => ({
  requestShellPrompt: vi.fn(async () => "open"),
}));

import { openValidatedExternalUrl } from "../../apps/desktop/src/main/navigation/external-link-policy";

describe("openValidatedExternalUrl", () => {
  beforeEach(() => {
    openExternal.mockClear();
  });

  it("opens https externally", async () => {
    const result = await openValidatedExternalUrl("https://example.com/x");
    expect(result.ok).toBe(true);
    expect(openExternal).toHaveBeenCalledWith("https://example.com/x");
  });

  it("never opens dangerous protocols (N5)", async () => {
    for (const raw of [
      "javascript:alert(1)",
      "file:///C:/secret.txt",
      "data:text/html,hi",
      "shell:foo",
    ]) {
      const result = await openValidatedExternalUrl(raw);
      expect(result.ok).toBe(false);
    }
    expect(openExternal).not.toHaveBeenCalled();
  });

  it("rejects embedded credentials (N6)", async () => {
    const result = await openValidatedExternalUrl(
      "https://user:pass@example.com/",
    );
    expect(result.ok).toBe(false);
    expect(openExternal).not.toHaveBeenCalled();
  });
});
