import { session, type Session } from "electron";

/**
 * WhatsApp Web rejects UAs that include the Electron brand token and shows
 * the “Chrome 100+” interstitial even when Chromium is far newer.
 *
 * We keep the real Chromium version from this runtime and only omit the
 * Electron/`appName` product tokens — not inventing an older Chrome version.
 */
export function chromiumBrowserUserAgent(baseUserAgent?: string): string {
  const base = baseUserAgent ?? session.defaultSession.getUserAgent();
  const fromUa = base.match(/Chrome\/([\d.]+)/)?.[1];
  const chromeVersion = process.versions.chrome || fromUa || "150.0.0.0";
  const cleaned = base
    // Drop Electron/x.y.z
    .replace(/\sElectron\/[\d.]+/g, "")
    // Drop appName/version product token Electron inserts before Chrome/
    .replace(/\s[A-Za-z0-9._-]+\/[\d.]+(?=\s+Chrome\/)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (/Chrome\/[\d.]+/.test(cleaned)) {
    return cleaned.replace(/Chrome\/[\d.]+/, `Chrome/${chromeVersion}`);
  }

  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
}

export function applyWhatsAppBrowserIdentity(accountSession: Session): void {
  const ua = chromiumBrowserUserAgent(accountSession.getUserAgent());
  accountSession.setUserAgent(ua);
}
