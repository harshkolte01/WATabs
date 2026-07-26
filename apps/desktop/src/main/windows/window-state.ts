import type { BrowserWindow } from "electron";
import {
  DEFAULT_WINDOW_BOUNDS,
  type WindowState,
} from "@multi-whatsapp/shared-types";
import { getWindowState, setWindowState } from "../storage/metadata-store";

const SAVE_DEBOUNCE_MS = 300;
let saveTimer: NodeJS.Timeout | null = null;

export function resolveInitialWindowState(): WindowState {
  const saved = getWindowState();
  if (saved) {
    return saved;
  }
  return {
    bounds: { ...DEFAULT_WINDOW_BOUNDS },
    isMaximized: false,
  };
}

export function trackWindowState(win: BrowserWindow): void {
  const scheduleSave = () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    saveTimer = setTimeout(() => {
      if (win.isDestroyed()) {
        return;
      }
      const isMaximized = win.isMaximized();
      const bounds = isMaximized ? win.getNormalBounds() : win.getBounds();
      setWindowState({
        bounds: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        },
        isMaximized,
      });
    }, SAVE_DEBOUNCE_MS);
  };

  win.on("resize", scheduleSave);
  win.on("move", scheduleSave);
  win.on("maximize", scheduleSave);
  win.on("unmaximize", scheduleSave);
  win.on("close", () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (win.isDestroyed()) {
      return;
    }
    const isMaximized = win.isMaximized();
    const bounds = isMaximized ? win.getNormalBounds() : win.getBounds();
    setWindowState({
      bounds: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      },
      isMaximized,
    });
  });
}
