import type { BrowserWindow, WebContentsView } from "electron";
import { SIDEBAR_WIDTH } from "@multi-whatsapp/shared-types";

export function getShellBounds(win: BrowserWindow): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const { width, height } = win.getContentBounds();
  return { x: 0, y: 0, width, height };
}

export function getAccountContentBounds(win: BrowserWindow): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const { width, height } = win.getContentBounds();
  return {
    x: SIDEBAR_WIDTH,
    y: 0,
    width: Math.max(0, width - SIDEBAR_WIDTH),
    height,
  };
}

export function layoutShellView(
  win: BrowserWindow,
  shellView: WebContentsView,
): void {
  shellView.setBounds(getShellBounds(win));
}

export function layoutAccountViews(
  win: BrowserWindow,
  views: Iterable<{ id: string; view: WebContentsView }>,
  selectedId: string | null,
): void {
  const active = getAccountContentBounds(win);
  for (const handle of views) {
    const isActive = handle.id === selectedId;
    handle.view.setBounds(
      isActive
        ? active
        : { x: active.x, y: active.y, width: 0, height: 0 },
    );
  }
}
