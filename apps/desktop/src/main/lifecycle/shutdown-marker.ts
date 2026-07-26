import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { log } from "../diagnostics/log-manager";

const MARKER = "clean-shutdown.marker";

let unexpectedRestart = false;

function markerPath(): string {
  return path.join(app.getPath("userData"), MARKER);
}

/** Call early on app ready — missing marker means previous run did not quit cleanly. */
export function checkUnexpectedRestart(): boolean {
  const file = markerPath();
  unexpectedRestart = !fs.existsSync(file);
  if (unexpectedRestart) {
    log("warn", "unexpected_restart_detected", {});
  }
  // Remove marker so a crash mid-session is detected next launch.
  try {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  } catch {
    // ignore
  }
  return unexpectedRestart;
}

export function wasUnexpectedRestart(): boolean {
  return unexpectedRestart;
}

export function writeCleanShutdownMarker(): void {
  const file = markerPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, new Date().toISOString(), "utf8");
}
