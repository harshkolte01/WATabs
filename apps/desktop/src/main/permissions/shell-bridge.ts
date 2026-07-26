type PromptSender = (channel: string, payload: unknown) => void;

let sendToShell: PromptSender | null = null;

export function registerShellPromptSender(sender: PromptSender): void {
  sendToShell = sender;
}

export function sendPromptToShell(channel: string, payload: unknown): boolean {
  if (!sendToShell) {
    return false;
  }
  sendToShell(channel, payload);
  return true;
}
