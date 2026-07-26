import { randomUUID } from "node:crypto";
import { ipcChannels } from "@multi-whatsapp/validation";
import { sendPromptToShell } from "../permissions/shell-bridge";

export type ClosePromptResult = {
  choice: "keep" | "quit";
  remember: boolean;
};

type Pending = {
  resolve: (result: ClosePromptResult) => void;
  timer: NodeJS.Timeout;
};

const pending = new Map<string, Pending>();

export function respondClosePrompt(
  requestId: string,
  result: ClosePromptResult,
): boolean {
  const entry = pending.get(requestId);
  if (!entry) return false;
  clearTimeout(entry.timer);
  pending.delete(requestId);
  entry.resolve(result);
  return true;
}

export function askCloseToTrayPrompt(): Promise<ClosePromptResult> {
  const requestId = randomUUID();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(requestId);
      resolve({ choice: "keep", remember: false });
    }, 60_000);
    pending.set(requestId, { resolve, timer });
    const sent = sendPromptToShell(ipcChannels.windowClosePrompt, {
      requestId,
      message:
        "Keep running in the background? Keeping the app running allows loaded accounts to continue receiving notifications.",
    });
    if (!sent) {
      clearTimeout(timer);
      pending.delete(requestId);
      resolve({ choice: "keep", remember: false });
    }
  });
}
