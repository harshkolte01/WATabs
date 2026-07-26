import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
  app: { getPath: () => "/tmp", isPackaged: false },
}));

vi.mock("../../apps/desktop/src/main/diagnostics/log-manager", () => ({
  log: vi.fn(),
}));

vi.mock("../../apps/desktop/src/main/permissions/shell-bridge", () => ({
  sendPromptToShell: vi.fn(),
}));

vi.mock("../../apps/desktop/src/main/storage/metadata-store", () => ({
  getAccount: () => null,
  listAccounts: () => [],
}));

vi.mock("../../apps/desktop/src/main/accounts/account-view-manager", () => ({
  hasAccountView: () => false,
  recreateAccountView: vi.fn(),
  reloadAccountView: vi.fn(),
  selectAccountView: vi.fn(),
}));

vi.mock("../../apps/desktop/src/main/system/app-lock-manager", () => ({
  isAppLocked: () => false,
}));

import {
  recordCrashAttemptForTests,
  resetCrashRecoveryForTests,
  wouldAutoRecover,
} from "../../apps/desktop/src/main/lifecycle/crash-recovery";

describe("crash-loop guard (C1)", () => {
  afterEach(() => {
    resetCrashRecoveryForTests();
  });

  it("stops auto recovery after 3 attempts in window", () => {
    const id = "a0000000-0000-4000-8000-000000000001";
    expect(wouldAutoRecover(id)).toBe(true);
    recordCrashAttemptForTests(id);
    recordCrashAttemptForTests(id);
    recordCrashAttemptForTests(id);
    expect(wouldAutoRecover(id)).toBe(false);
  });
});
