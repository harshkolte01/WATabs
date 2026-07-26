import { WebContentsView, app } from "electron";
import { WHATSAPP_URL, partitionName } from "@multi-whatsapp/shared-types";
import { log } from "../diagnostics/log-manager";
import { attachDownloadHandlers } from "./downloads";
import { attachPermissionHandlers } from "./permissions";
import { sessionForPartition } from "./session-factory";

export interface AccountViewHandle {
  id: string;
  label: string;
  partition: string;
  view: WebContentsView;
}

export function createAccountWebContentsView(
  id: string,
  label: string,
  options: { autoLoad?: boolean } = {},
): AccountViewHandle {
  const { autoLoad = true } = options;
  const partition = partitionName(id);
  const accountSession = sessionForPartition(partition);

  attachPermissionHandlers(accountSession, label);
  attachDownloadHandlers(accountSession, label);

  const view = new WebContentsView({
    webPreferences: {
      partition,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      devTools: !app.isPackaged,
      spellcheck: true,
      navigateOnDragDrop: false,
      // No preload — WhatsApp must never receive shell IPC.
    },
  });

  view.webContents.on("did-fail-load", (_e, code, desc) => {
    log("warn", "account_did_fail_load", {
      accountId: id,
      code,
      desc,
    });
  });

  if (autoLoad) {
    loadWhatsApp(view);
  }

  return { id, label, partition, view };
}

export function loadWhatsApp(view: WebContentsView): void {
  void view.webContents.loadURL(WHATSAPP_URL);
}
