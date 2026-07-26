/** Packaged builds must not expose DevTools on WhatsApp account views. */
export function accountViewDevToolsEnabled(isPackaged: boolean): boolean {
  return !isPackaged;
}
