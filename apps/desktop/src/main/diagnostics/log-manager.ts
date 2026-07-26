import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { LOG_DIRNAME } from "../../shared/constants";
import { sanitizeLogFields } from "./redaction";

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogRecord {
  ts: string;
  level: LogLevel;
  message: string;
  fields?: Record<string, unknown>;
}

let logFilePath: string | null = null;

function ensureLogFile(): string {
  if (logFilePath) {
    return logFilePath;
  }
  const dir = path.join(app.getPath("userData"), LOG_DIRNAME);
  fs.mkdirSync(dir, { recursive: true });
  const day = new Date().toISOString().slice(0, 10);
  logFilePath = path.join(dir, `app-${day}.log`);
  return logFilePath;
}

export function log(
  level: LogLevel,
  message: string,
  fields?: Record<string, unknown>,
): void {
  const record: LogRecord = {
    ts: new Date().toISOString(),
    level,
    message,
    fields: fields ? sanitizeLogFields(fields) : undefined,
  };
  const line = JSON.stringify(record);
  // Console for dev visibility; file for durability.
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
  try {
    fs.appendFileSync(ensureLogFile(), `${line}\n`, "utf8");
  } catch {
    // Avoid recursive logging failures.
  }
}
