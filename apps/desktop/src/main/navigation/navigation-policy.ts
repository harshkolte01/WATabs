import type { WebContents } from "electron";
import { log } from "../diagnostics/log-manager";
import { openValidatedExternalUrl } from "./external-link-policy";
import { mayNavigateInternally } from "./protocol-allowlist";

/**
 * Attach main-frame navigation, popup, and TLS guards before loadURL.
 * Subresource requests are intentionally not filtered here.
 */
export function attachNavigationPolicy(
  webContents: WebContents,
  accountId: string,
): void {
  const handleMainFrameTarget = (
    event: { preventDefault: () => void },
    url: string,
    kind: "nav" | "redirect",
  ): void => {
    if (mayNavigateInternally(url)) {
      return;
    }
    event.preventDefault();
    if (canAttemptExternal(url)) {
      void openValidatedExternalUrl(url);
      log("info", kind === "nav" ? "nav_externalized" : "redirect_externalized", {
        accountId,
      });
      return;
    }
    log("warn", kind === "nav" ? "nav_blocked" : "redirect_blocked", {
      accountId,
    });
  };

  webContents.on("will-navigate", (details) => {
    handleMainFrameTarget(details, details.url, "nav");
  });

  webContents.on("will-frame-navigate", (details) => {
    if (!details.isMainFrame) {
      return;
    }
    handleMainFrameTarget(details, details.url, "nav");
  });

  webContents.on("will-redirect", (details) => {
    if (!details.isMainFrame) {
      return;
    }
    handleMainFrameTarget(details, details.url, "redirect");
  });

  webContents.setWindowOpenHandler(({ url }) => {
    if (canAttemptExternal(url)) {
      void openValidatedExternalUrl(url);
      log("info", "popup_externalized", { accountId });
    } else {
      log("warn", "popup_blocked", { accountId });
    }
    return { action: "deny" };
  });

  webContents.on(
    "certificate-error",
    (event, _url, _error, _certificate, callback) => {
      event.preventDefault();
      callback(false);
      log("warn", "certificate_error_rejected", { accountId });
    },
  );

  webContents.on("render-process-gone", (_event, details) => {
    log("error", "account_render_process_gone", {
      accountId,
      reason: details.reason,
      exitCode: details.exitCode,
    });
    void import("../lifecycle/crash-recovery").then(({ handleRenderProcessGone }) => {
      handleRenderProcessGone(accountId);
    });
  });

  webContents.on("unresponsive", () => {
    log("warn", "account_unresponsive", { accountId });
    void import("../lifecycle/crash-recovery").then(({ handleUnresponsive }) => {
      handleUnresponsive(accountId);
    });
  });

  webContents.on("responsive", () => {
    void import("../lifecycle/crash-recovery").then(({ handleResponsive }) => {
      handleResponsive(accountId);
    });
  });
}

function canAttemptExternal(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
}
