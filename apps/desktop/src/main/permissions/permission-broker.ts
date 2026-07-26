import type { PermissionPreference } from "@multi-whatsapp/shared-types";
import { isAllowedWhatsAppOrigin } from "../navigation/protocol-allowlist";
import { getAccount, upsertAccount } from "../storage/metadata-store";
import { log } from "../diagnostics/log-manager";
import {
  requestShellPrompt,
  type PromptDecision,
} from "./permission-prompt";

export type PermissionFamily =
  | "notifications"
  | "microphone"
  | "camera"
  | "display-capture"
  | "fullscreen"
  | "unknown";

export function classifyPermission(permission: string): PermissionFamily {
  switch (permission) {
    case "notifications":
      return "notifications";
    case "media":
    case "microphone":
    case "audioCapture":
      return "microphone";
    case "videoCapture":
      return "camera";
    case "display-capture":
      return "display-capture";
    case "fullscreen":
      return "fullscreen";
    case "mediaKeySystem":
      // Encrypted media for WhatsApp — origin-gated only (not a mic/camera pref).
      return "fullscreen";
    default:
      return "unknown";
  }
}

export function resolveAccountIdFromPartition(
  partition: string | undefined,
): string | null {
  if (!partition) return null;
  const prefix = "persist:wa-";
  if (!partition.startsWith(prefix)) return null;
  const id = partition.slice(prefix.length);
  return id.length > 0 ? id : null;
}

function preferenceFor(
  accountId: string,
  family: PermissionFamily,
): PermissionPreference | "enabled" | "disabled" | null {
  const account = getAccount(accountId);
  if (!account) return null;
  switch (family) {
    case "notifications":
      return account.notificationsEnabled ? "enabled" : "disabled";
    case "microphone":
      return account.microphonePermission;
    case "camera":
      return account.cameraPermission;
    case "display-capture":
      return account.displayCapturePermission;
    case "fullscreen":
      return "allow";
    default:
      return null;
  }
}

function persistPreference(
  accountId: string,
  family: PermissionFamily,
  value: PermissionPreference,
): void {
  const account = getAccount(accountId);
  if (!account) return;
  const updated = { ...account, updatedAt: new Date().toISOString() };
  if (family === "microphone") updated.microphonePermission = value;
  if (family === "camera") updated.cameraPermission = value;
  if (family === "display-capture") updated.displayCapturePermission = value;
  upsertAccount(updated);
}

/**
 * Synchronous check used by setPermissionCheckHandler.
 * "ask" → false until the user has chosen allow/block via request flow or settings.
 */
export function evaluatePermissionCheck(input: {
  accountId: string | null;
  permission: string;
  requestingOrigin: string;
}): boolean {
  const { accountId, permission, requestingOrigin } = input;
  if (!accountId || !isAllowedWhatsAppOrigin(requestingOrigin)) {
    return false;
  }
  const family = classifyPermission(permission);
  if (family === "unknown") return false;
  if (family === "fullscreen") return true;

  const pref = preferenceFor(accountId, family);
  if (pref === "disabled" || pref === "block" || pref === null) return false;
  if (pref === "ask") return false;
  if (family === "display-capture") {
    // Even when allow, check handler stays conservative; request path grants.
    return pref === "allow";
  }
  return pref === "allow" || pref === "enabled";
}

export async function evaluatePermissionRequest(input: {
  accountId: string | null;
  accountLabel: string;
  permission: string;
  requestingUrl: string;
}): Promise<boolean> {
  const { accountId, accountLabel, permission, requestingUrl } = input;
  if (!accountId || !isAllowedWhatsAppOrigin(requestingUrl)) {
    log("info", "permission_request", {
      accountId,
      permission,
      allowed: false,
      reason: "origin-or-account",
    });
    return false;
  }

  const family = classifyPermission(permission);
  if (family === "unknown") {
    log("info", "permission_request", {
      accountId,
      permission,
      allowed: false,
      reason: "unknown",
    });
    return false;
  }

  if (family === "fullscreen") {
    return true;
  }

  const pref = preferenceFor(accountId, family);
  if (pref === "disabled" || pref === "block" || pref === null) {
    log("info", "permission_request", {
      accountId,
      permission,
      allowed: false,
      reason: "blocked",
    });
    return false;
  }

  // display-capture: always prompt when ask; when allow, grant without prompt.
  if (family === "display-capture" && pref === "ask") {
    const decision = await askUser(accountId, accountLabel, permission, family);
    return applyDecision(accountId, family, decision, /*persistAsk*/ true);
  }

  if (pref === "allow" || pref === "enabled") {
    log("info", "permission_request", {
      accountId,
      permission,
      allowed: true,
    });
    return true;
  }

  // ask
  const decision = await askUser(accountId, accountLabel, permission, family);
  return applyDecision(accountId, family, decision, /*persistAsk*/ true);
}

async function askUser(
  accountId: string,
  accountLabel: string,
  permission: string,
  family: PermissionFamily,
): Promise<PromptDecision> {
  return requestShellPrompt({
    kind: "permission",
    accountId,
    accountLabel,
    permission,
    message: `“${accountLabel}” is requesting ${family} access for WhatsApp Web.`,
  });
}

function applyDecision(
  accountId: string,
  family: PermissionFamily,
  decision: PromptDecision,
  persistAsk: boolean,
): boolean {
  if (decision === "allow-always") {
    if (persistAsk && family !== "notifications") {
      persistPreference(accountId, family, "allow");
    }
    log("info", "permission_request", {
      accountId,
      permission: family,
      allowed: true,
      decision,
    });
    return true;
  }
  if (decision === "allow-once") {
    log("info", "permission_request", {
      accountId,
      permission: family,
      allowed: true,
      decision,
    });
    return true;
  }
  if (decision === "block") {
    if (persistAsk && family !== "notifications") {
      persistPreference(accountId, family, "block");
    }
  }
  log("info", "permission_request", {
    accountId,
    permission: family,
    allowed: false,
    decision,
  });
  return false;
}

/** Pure decision helper for unit tests (no shell / no I/O). */
export function decidePermissionSync(input: {
  originOk: boolean;
  family: PermissionFamily;
  pref: PermissionPreference | "enabled" | "disabled" | null;
}): "allow" | "deny" | "ask" {
  if (!input.originOk) return "deny";
  if (input.family === "unknown") return "deny";
  if (input.family === "fullscreen") return "allow";
  if (input.pref === "disabled" || input.pref === "block" || input.pref === null) {
    return "deny";
  }
  if (input.pref === "ask") return "ask";
  return "allow";
}
