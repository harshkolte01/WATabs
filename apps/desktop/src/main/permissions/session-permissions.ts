import type { Session, WebContents } from "electron";
import {
  evaluatePermissionCheck,
  evaluatePermissionRequest,
} from "./permission-broker";

/**
 * Attach deny-by-default, AccountRecord-aware permission handlers.
 * Must run before the account view loads remote content.
 */
export function attachSessionPermissionHandlers(
  accountSession: Session,
  accountId: string,
  accountLabel: string,
): void {
  accountSession.setPermissionRequestHandler(
    (webContents, permission, callback, details) => {
      const requestingUrl = details.requestingUrl || safeUrl(webContents);
      void evaluatePermissionRequest({
        accountId,
        accountLabel,
        permission,
        requestingUrl,
      }).then((allowed) => callback(allowed));
    },
  );

  accountSession.setPermissionCheckHandler(
    (webContents, permission, requestingOrigin) => {
      let origin = requestingOrigin;
      if (!origin && webContents && !webContents.isDestroyed()) {
        origin = webContents.getURL();
      }
      return evaluatePermissionCheck({
        accountId,
        permission,
        requestingOrigin: origin || "",
      });
    },
  );
}

function safeUrl(webContents: WebContents): string {
  try {
    if (webContents.isDestroyed()) return "";
    return webContents.getURL();
  } catch {
    return "";
  }
}
