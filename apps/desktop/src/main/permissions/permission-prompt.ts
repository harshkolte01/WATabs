import { randomUUID } from "node:crypto";
import { ipcChannels } from "@multi-whatsapp/validation";
import { log } from "../diagnostics/log-manager";
import { sendPromptToShell } from "./shell-bridge";

export type PromptDecision =
  | "allow-once"
  | "allow-always"
  | "block"
  | "deny"
  | "open"
  | "cancel";

export type ShellPromptKind = "permission" | "http-external";

export interface ShellPromptRequest {
  requestId: string;
  kind: ShellPromptKind;
  accountId?: string;
  accountLabel?: string;
  permission?: string;
  url?: string;
  message: string;
}

type Pending = {
  resolve: (decision: PromptDecision) => void;
  timer: NodeJS.Timeout;
};

const pending = new Map<string, Pending>();
const PROMPT_TIMEOUT_MS = 60_000;

export function respondToShellPrompt(
  requestId: string,
  decision: PromptDecision,
): boolean {
  const entry = pending.get(requestId);
  if (!entry) {
    return false;
  }
  clearTimeout(entry.timer);
  pending.delete(requestId);
  entry.resolve(decision);
  return true;
}

export function requestShellPrompt(
  payload: Omit<ShellPromptRequest, "requestId">,
): Promise<PromptDecision> {
  const requestId = randomUUID();
  const request: ShellPromptRequest = { ...payload, requestId };

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(requestId);
      log("warn", "shell_prompt_timeout", { kind: payload.kind });
      resolve("deny");
    }, PROMPT_TIMEOUT_MS);

    pending.set(requestId, { resolve, timer });

    const sent = sendPromptToShell(ipcChannels.permissionsPrompt, request);
    if (!sent) {
      clearTimeout(timer);
      pending.delete(requestId);
      resolve("deny");
    }
  });
}
