export {};

declare global {
  interface Window {
    desktopShell: {
      switchAccount: (accountKey: "a" | "b") => void;
      getActiveAccount: () => Promise<"a" | "b">;
      onActiveAccount: (callback: (accountKey: "a" | "b") => void) => () => void;
    };
  }
}
