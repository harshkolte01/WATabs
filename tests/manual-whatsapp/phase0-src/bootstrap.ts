import { app } from "electron";
import path from "node:path";

/**
 * Stable identity + userData so smoke and interactive runs share the same
 * persistent partitions (and do not write into the generic "Electron" profile).
 */
export function configureDesktopApp(): void {
  app.setName("multi-whatsapp-desktop");
  app.setPath(
    "userData",
    path.join(app.getPath("appData"), "multi-whatsapp-desktop"),
  );
}
