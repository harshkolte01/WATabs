import type { Session } from "electron";
import { WHATSAPP_ORIGIN } from "@multi-whatsapp/shared-types";
import { log } from "../diagnostics/log-manager";

const ALLOWED_PERMISSIONS = new Set([
  "notifications",
  "media",
  "microphone",
  "audioCapture",
  "videoCapture",
  "mediaKeySystem",
]);

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

export function attachPermissionHandlers(
  accountSession: Session,
  accountLabel: string,
): void {
  accountSession.setPermissionRequestHandler(
    (webContents, permission, callback, details) => {
      const requestingUrl = details.requestingUrl || webContents.getURL();
      const allowed =
        isWhatsAppOrigin(requestingUrl) && ALLOWED_PERMISSIONS.has(permission);
      log("info", "permission_request", {
        accountLabel,
        permission,
        allowed,
      });
      callback(allowed);
    },
  );

  accountSession.setPermissionCheckHandler(
    (webContents, permission, requestingOrigin) => {
      let origin = requestingOrigin;
      if (!origin && webContents && !webContents.isDestroyed()) {
        origin = webContents.getURL();
      }
      return isWhatsAppOrigin(origin) && ALLOWED_PERMISSIONS.has(permission);
    },
  );
}
