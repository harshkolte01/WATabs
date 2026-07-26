import { WebContentsView, app } from "electron";
import {
  WHATSAPP_URL,
  partitionName,
  type AccountId,
} from "./constants";
import { attachPermissionHandlers, sessionForPartition } from "./permissions";
import { attachDownloadHandlers } from "./downloads";

export interface AccountViewHandle {
  id: AccountId;
  label: string;
  partition: string;
  view: WebContentsView;
}

export interface CreateAccountViewOptions {
  /** When false, caller must invoke loadWhatsApp after attaching listeners. Default true. */
  autoLoad?: boolean;
}

/**
 * Create a WhatsApp WebContentsView with plan §7.2 preferences.
 * No preload, no Node integration, no injection.
 */
export function createAccountView(
  id: AccountId,
  label: string,
  options: CreateAccountViewOptions = {},
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
      // Compatibility proof may use DevTools; production later sets !app.isPackaged
      devTools: !app.isPackaged,
      spellcheck: true,
      navigateOnDragDrop: false,
      // No preload: WhatsApp views must never receive injection or an IPC bridge.
    },
  });

  view.webContents.on("did-fail-load", (_e, code, desc, url) => {
    console.error(`[account:${label}] did-fail-load code=${code} desc=${desc} url=${url}`);
  });

  view.webContents.on("page-title-updated", (_e, title) => {
    console.log(`[account:${label}] title=${title}`);
  });

  if (autoLoad) {
    loadWhatsApp(view);
  }

  return { id, label, partition, view };
}

/** Hard stop path: stock identity only — do not spoof user agent or bypass blocks. */
export function loadWhatsApp(view: WebContentsView): void {
  void view.webContents.loadURL(WHATSAPP_URL);
}
