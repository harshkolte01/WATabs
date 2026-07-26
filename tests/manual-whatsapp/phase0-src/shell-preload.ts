import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";

contextBridge.exposeInMainWorld("desktopShell", {
  switchAccount: (accountKey: "a" | "b") => {
    ipcRenderer.send("desktop:switch-account", accountKey);
  },
  getActiveAccount: (): Promise<"a" | "b"> => {
    return ipcRenderer.invoke("desktop:get-active-account");
  },
  onActiveAccount: (callback: (accountKey: "a" | "b") => void) => {
    const listener = (_event: IpcRendererEvent, accountKey: "a" | "b") => {
      callback(accountKey);
    };
    ipcRenderer.on("desktop:active-account", listener);
    return () => {
      ipcRenderer.removeListener("desktop:active-account", listener);
    };
  },
});
