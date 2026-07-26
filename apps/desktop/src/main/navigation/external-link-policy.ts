import { shell } from "electron";
import { log } from "../diagnostics/log-manager";
import { requestShellPrompt } from "../permissions/permission-prompt";
import { classifyNavigationUrl } from "./protocol-allowlist";

export type ExternalOpenResult =
  | { ok: true; href: string; scheme: "http:" | "https:" }
  | { ok: false; reason: string };

/**
 * Validate then open in the system browser.
 * Never forwards arbitrary / dangerous protocols to shell.openExternal.
 * https opens immediately; http requires a shell confirmation.
 */
export async function openValidatedExternalUrl(
  raw: string,
): Promise<ExternalOpenResult> {
  const classified = classifyNavigationUrl(raw);

  if (classified.kind === "blocked") {
    log("warn", "external_open_blocked", { reason: classified.reason });
    return { ok: false, reason: classified.reason };
  }

  if (classified.kind === "internal") {
    log("warn", "external_open_blocked", { reason: "internal-origin" });
    return { ok: false, reason: "internal-origin" };
  }

  const href = classified.url.toString();

  if (classified.scheme === "http:") {
    const decision = await requestShellPrompt({
      kind: "http-external",
      url: href,
      message: `Open this non-HTTPS link in your browser?\n${href}`,
    });
    if (decision !== "open" && decision !== "allow-once" && decision !== "allow-always") {
      log("warn", "external_open_blocked", { reason: "http-cancelled" });
      return { ok: false, reason: "http-cancelled" };
    }
  }

  await shell.openExternal(href);
  log("info", "external_open_ok", { scheme: classified.scheme });
  return { ok: true, href, scheme: classified.scheme };
}

export function canOpenExternally(raw: string): boolean {
  return classifyNavigationUrl(raw).kind === "external";
}
