import fs from "node:fs";
import path from "node:path";
import { app, safeStorage } from "electron";
import { log } from "../diagnostics/log-manager";
import type { PinVerifierRecord } from "./pin-verifier";

const VERIFIER_FILENAME = "lock-verifier.json";

export function isSafeStorageAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

function verifierPath(): string {
  return path.join(app.getPath("userData"), VERIFIER_FILENAME);
}

export function hasStoredVerifier(): boolean {
  return fs.existsSync(verifierPath());
}

export function savePinVerifier(record: PinVerifierRecord): void {
  if (!isSafeStorageAvailable()) {
    throw new Error(
      "OS secure storage is unavailable; app lock cannot be enabled",
    );
  }
  const payload = JSON.stringify(record);
  const encrypted = safeStorage.encryptString(payload);
  const file = verifierPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, encrypted);
  fs.renameSync(tmp, file);
  log("info", "lock_verifier_saved", {});
}

export function loadPinVerifier(): PinVerifierRecord | null {
  const file = verifierPath();
  if (!fs.existsSync(file)) {
    return null;
  }
  if (!isSafeStorageAvailable()) {
    log("warn", "lock_verifier_unreadable_no_safe_storage", {});
    return null;
  }
  try {
    const encrypted = fs.readFileSync(file);
    const json = safeStorage.decryptString(encrypted);
    const parsed = JSON.parse(json) as PinVerifierRecord;
    if (parsed?.version !== 1 || !parsed.salt || !parsed.hash) {
      return null;
    }
    return parsed;
  } catch {
    log("error", "lock_verifier_decrypt_failed", {});
    return null;
  }
}

export function clearPinVerifier(): void {
  const file = verifierPath();
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
  log("info", "lock_verifier_cleared", {});
}
