import type { DesktopApi } from "../preload/shell-preload";

declare global {
  interface Window {
    desktop: DesktopApi;
  }
}

export {};
