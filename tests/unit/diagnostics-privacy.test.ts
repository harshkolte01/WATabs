import { describe, expect, it } from "vitest";
import type { NotificationDiagnostics } from "@multi-whatsapp/shared-types";
import { sanitizeLogFields } from "../../apps/desktop/src/main/diagnostics/redaction";

function diagnosticsHasContentKeys(diag: NotificationDiagnostics): boolean {
  const json = JSON.stringify(diag);
  return /"title"|"body"|"sender"|"preview"/.test(json);
}

describe("notification privacy (P1/D1)", () => {
  it("diagnostics payload has no content keys", () => {
    const diag: NotificationDiagnostics = {
      notificationsGlobalEnabled: true,
      notificationsPausedUntil: null,
      selectedAccountId: null,
      selectedNotificationsEnabled: null,
      selectedAudioMuted: null,
      selectedViewLoaded: false,
      runningInTray: false,
      notificationApiSupported: true,
      lastTestAt: null,
      lastTestOk: null,
    };
    expect(diagnosticsHasContentKeys(diag)).toBe(false);
  });

  it("redacts notification title/body fields in logs", () => {
    const redacted = sanitizeLogFields({
      title: "Alice",
      body: "secret message",
      allowed: true,
    });
    expect(redacted.title).toBe("[redacted]");
    expect(redacted.body).toBe("[redacted]");
    expect(redacted.allowed).toBe(true);
  });

  it("redacts download source URLs in logs", () => {
    const redacted = sanitizeLogFields({
      accountId: "a0000000-0000-4000-8000-000000000001",
      filename: "photo.jpg",
      state: "completed",
      url: "https://mmg.whatsapp.net/secret/file",
    });
    expect(redacted.url).toBe("[redacted]");
    expect(redacted.filename).toBe("photo.jpg");
    expect(String(redacted.filename)).not.toMatch(/https?:\/\//);
  });
});
