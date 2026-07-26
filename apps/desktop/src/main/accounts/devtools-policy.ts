/** Packaged builds must not expose DevTools (shell or WhatsApp views). */
export function accountViewDevToolsEnabled(isPackaged: boolean): boolean {
  return !isPackaged;
}

export function shellDevToolsEnabled(isPackaged: boolean): boolean {
  return !isPackaged;
}

/** True for F12 / Ctrl+Shift+I|J|C style DevTools shortcuts. */
export function isDevToolsShortcut(input: {
  type?: string;
  key?: string;
  control?: boolean;
  meta?: boolean;
  shift?: boolean;
}): boolean {
  if (input.type !== "keyDown") return false;
  const key = input.key?.toLowerCase();
  if (key === "f12") return true;
  const mod = Boolean(input.control || input.meta);
  return Boolean(
    mod && input.shift && (key === "i" || key === "j" || key === "c"),
  );
}
