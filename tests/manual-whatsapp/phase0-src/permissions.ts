import { type Session, session } from "electron";
import { WHATSAPP_ORIGIN } from "./constants";

const ALLOWED_PERMISSIONS = new Set([
  "notifications",
  "media",
  "microphone",
  "audioCapture",
  "videoCapture",
  "mediaKeySystem",
]);

/** Normalize Electron's requestingUrl / requestingOrigin to a true origin. */
function toOrigin(urlOrOrigin: string): string | null {
  if (!urlOrOrigin) {
    return null;
  }
  try {
    return new URL(urlOrOrigin).origin;
  } catch {
    try {
      return new URL(`https://${urlOrOrigin}`).origin;
    } catch {
      return null;
    }
  }
}

function isWhatsAppOrigin(urlOrOrigin: string): boolean {
  return toOrigin(urlOrOrigin) === WHATSAPP_ORIGIN;
}

/**
 * Deny-by-default permission policy for an account session.
 * Allows notifications and media only for exact https://web.whatsapp.com.
 */
export function attachPermissionHandlers(accountSession: Session, accountLabel: string): void {
  accountSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const requestingUrl = details.requestingUrl || webContents.getURL();
    const allowed =
      isWhatsAppOrigin(requestingUrl) && ALLOWED_PERMISSIONS.has(permission);

    console.log(
      `[permissions:${accountLabel}] request permission=${permission} url=${requestingUrl} -> ${
        allowed ? "allow" : "deny"
      }`,
    );
    callback(allowed);
  });

  accountSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    let origin = requestingOrigin;
    if (!origin && webContents && !webContents.isDestroyed()) {
      origin = webContents.getURL();
    }

    const allowed =
      isWhatsAppOrigin(origin) && ALLOWED_PERMISSIONS.has(permission);

    console.log(
      `[permissions:${accountLabel}] check permission=${permission} origin=${origin} -> ${
        allowed ? "allow" : "deny"
      }`,
    );
    return allowed;
  });
}

export function sessionForPartition(partition: string): Session {
  return session.fromPartition(partition);
}
