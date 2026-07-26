import path from "node:path";
import { app, type Session } from "electron";
import { log } from "../diagnostics/log-manager";

/** Minimal download handling — Phase 5 owns the full manager. */
export function attachDownloadHandlers(
  accountSession: Session,
  accountLabel: string,
): void {
  accountSession.on("will-download", (_event, item) => {
    const filename = item.getFilename();
    const savePath = path.join(app.getPath("downloads"), filename);
    item.setSavePath(savePath);
    log("info", "download_started", { accountLabel, filename });
    item.once("done", (_e, state) => {
      log("info", "download_done", { accountLabel, filename, state });
    });
  });
}
