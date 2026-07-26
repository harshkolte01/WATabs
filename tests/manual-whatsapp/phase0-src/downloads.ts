import { app, type Session } from "electron";
import path from "node:path";

/**
 * Proof-only download handling: save to the OS default downloads directory.
 * Not a Phase 5 download manager.
 */
export function attachDownloadHandlers(accountSession: Session, accountLabel: string): void {
  accountSession.on("will-download", (_event, item) => {
    const filename = item.getFilename();
    const savePath = path.join(app.getPath("downloads"), filename);
    item.setSavePath(savePath);

    console.log(`[downloads:${accountLabel}] started url=${item.getURL()} -> ${savePath}`);

    item.on("updated", (_e, state) => {
      if (state === "interrupted") {
        console.log(`[downloads:${accountLabel}] interrupted ${filename}`);
      }
    });

    item.once("done", (_e, state) => {
      console.log(`[downloads:${accountLabel}] done state=${state} file=${filename}`);
    });
  });
}
