/**
 * Conservative unread parse from document title only.
 * Never execute JS or read the DOM. Undocumented WA format — fail closed.
 */
export function parseUnreadCount(title: string): number | null {
  if (!title || typeof title !== "string") {
    return null;
  }
  const match = title.match(/^\((\d+)\)\s*/);
  if (!match) {
    return null;
  }
  const n = Number(match[1]);
  if (!Number.isFinite(n) || n < 0 || n > 9999) {
    return null;
  }
  return n;
}
