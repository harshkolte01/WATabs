import { WebContentsView, app } from "electron";
import { WHATSAPP_URL, partitionName } from "@multi-whatsapp/shared-types";
import { log } from "../diagnostics/log-manager";
import { onAccountTitleUpdated } from "../notifications/badge-manager";
import { registerAccountWebContents } from "../notifications/notification-coordinator";
import { attachNavigationPolicy } from "../navigation/navigation-policy";
import { attachSessionPermissionHandlers } from "../permissions/session-permissions";
import { getAccount } from "../storage/metadata-store";
import { accountViewDevToolsEnabled } from "./devtools-policy";
import { attachDownloadHandlers } from "./downloads";
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

  attachSessionPermissionHandlers(accountSession, id, label);
  attachDownloadHandlers(accountSession, id);

  const view = new WebContentsView({
    webPreferences: {
      partition,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      devTools: accountViewDevToolsEnabled(app.isPackaged),
      spellcheck: true,
      navigateOnDragDrop: false,
      // No preload — WhatsApp must never receive shell IPC.
    },
  });

  attachNavigationPolicy(view.webContents, id);
  registerAccountWebContents(id, view.webContents);

  view.webContents.on("page-title-updated", (_e, title) => {
    onAccountTitleUpdated(id, title);
  });

  const account = getAccount(id);
  if (account?.audioMuted) {
    view.webContents.setAudioMuted(true);
  }

  if (app.isPackaged) {
    view.webContents.on("before-input-event", (event, input) => {
      const key = input.key?.toLowerCase();
      if (
        input.type === "keyDown" &&
        (key === "f12" ||
          (input.control && input.shift && (key === "i" || key === "j" || key === "c")))
      ) {
        event.preventDefault();
      }
    });
  }

  view.webContents.on("did-fail-load", (_e, code, desc, _url, isMainFrame) => {
    log("warn", "account_did_fail_load", {
      accountId: id,
      code,
      desc,
    });
    void import("../lifecycle/crash-recovery").then(({ handleDidFailLoad }) => {
      handleDidFailLoad(id, isMainFrame, code);
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
