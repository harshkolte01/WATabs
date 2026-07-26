import fs from "node:fs";
import path from "node:path";
import {
  METADATA_BACKUP_FILENAME,
  METADATA_FILENAME,
} from "../../shared/constants";

export function metadataPath(userData: string): string {
  return path.join(userData, METADATA_FILENAME);
}

export function metadataBackupPath(userData: string): string {
  return path.join(userData, METADATA_BACKUP_FILENAME);
}

export function writeAtomicJson(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  fs.renameSync(tempPath, filePath);
}

export function copyLastKnownGood(userData: string): void {
  const primary = metadataPath(userData);
  const backup = metadataBackupPath(userData);
  if (fs.existsSync(primary)) {
    fs.copyFileSync(primary, backup);
  }
}
