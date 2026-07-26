import { WHATSAPP_ORIGIN } from "@multi-whatsapp/shared-types";

export type UrlClassification =
  | { kind: "internal"; url: URL }
  | { kind: "external"; url: URL; scheme: "http:" | "https:" }
  | { kind: "blocked"; reason: string };

const BLOCKED_SCHEMES = new Set([
  "file:",
  "javascript:",
  "data:",
  "vbscript:",
  "shell:",
  "cmd:",
  "powershell:",
  "ms-settings:",
  "ms-appx:",
  "ms-appx-web:",
  "blob:",
  "about:",
  // Never hand our shell protocol (or the old generic name) to the OS.
  "app:",
  "watabs:",
]);

export function parseUrlSafe(raw: string): URL | null {
  if (!raw || typeof raw !== "string") {
    return null;
  }
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

export function isAllowedWhatsAppOrigin(value: string): boolean {
  const parsed = parseUrlSafe(value);
  if (!parsed) {
    // Origin-only strings (no path) still parse with URL when absolute.
    try {
      return new URL(value).origin === WHATSAPP_ORIGIN;
    } catch {
      try {
        return new URL(`https://${value}`).origin === WHATSAPP_ORIGIN;
      } catch {
        return false;
      }
    }
  }
  return parsed.origin === WHATSAPP_ORIGIN;
}

export function classifyNavigationUrl(raw: string): UrlClassification {
  const url = parseUrlSafe(raw);
  if (!url) {
    return { kind: "blocked", reason: "malformed" };
  }

  const scheme = url.protocol.toLowerCase();
  if (BLOCKED_SCHEMES.has(scheme)) {
    return { kind: "blocked", reason: `scheme:${scheme}` };
  }

  if (url.username || url.password) {
    return { kind: "blocked", reason: "embedded-credentials" };
  }

  if (url.origin === WHATSAPP_ORIGIN) {
    return { kind: "internal", url };
  }

  if (scheme === "https:" || scheme === "http:") {
    return { kind: "external", url, scheme };
  }

  return { kind: "blocked", reason: `scheme:${scheme}` };
}

/** True when main-frame navigation may continue inside the account view. */
export function mayNavigateInternally(raw: string): boolean {
  return classifyNavigationUrl(raw).kind === "internal";
}
