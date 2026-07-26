import type { IpcMainInvokeEvent } from "electron";
import { app } from "electron";
import { SHELL_ORIGIN } from "@multi-whatsapp/shared-types";
import { log } from "../diagnostics/log-manager";

function isDevViteOrigin(url: string): boolean {
  if (app.isPackaged) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "http:" &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}

export function assertTrustedShellSender(event: IpcMainInvokeEvent): void {
  const frameUrl = event.senderFrame?.url ?? "";
  const ok =
    frameUrl.startsWith(`${SHELL_ORIGIN}/`) ||
    frameUrl === `${SHELL_ORIGIN}/` ||
    frameUrl === SHELL_ORIGIN ||
    frameUrl.startsWith(`${SHELL_ORIGIN}`) ||
    isDevViteOrigin(frameUrl);

  if (!ok) {
    log("warn", "ipc_sender_rejected", {
      reason: "untrusted_origin",
    });
    throw new Error("IPC sender is not the trusted shell");
  }
}
