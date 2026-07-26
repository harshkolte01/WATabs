import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 8;

/** Tuned for interactive unlock; keep stable across releases. */
export const SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
  keylen: 32,
} as const;

export interface PinVerifierRecord {
  version: 1;
  salt: string;
  hash: string;
  N: number;
  r: number;
  p: number;
  keylen: number;
}

function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derived) => {
      if (err) reject(err);
      else resolve(derived as Buffer);
    });
  });
}

export function isValidPinFormat(pin: string): boolean {
  return /^\d{4,8}$/.test(pin);
}

export async function createPinVerifier(pin: string): Promise<PinVerifierRecord> {
  if (!isValidPinFormat(pin)) {
    throw new Error("PIN must be 4–8 digits");
  }
  const salt = randomBytes(16);
  const derived = await scryptAsync(pin, salt, SCRYPT_PARAMS.keylen, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
  });
  return {
    version: 1,
    salt: salt.toString("base64"),
    hash: derived.toString("base64"),
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
    keylen: SCRYPT_PARAMS.keylen,
  };
}

export async function verifyPin(
  pin: string,
  record: PinVerifierRecord,
): Promise<boolean> {
  if (!isValidPinFormat(pin) || record.version !== 1) {
    return false;
  }
  const salt = Buffer.from(record.salt, "base64");
  const expected = Buffer.from(record.hash, "base64");
  const derived = await scryptAsync(pin, salt, record.keylen, {
    N: record.N,
    r: record.r,
    p: record.p,
  });
  if (derived.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(derived, expected);
}

/** Pure helper for rate-limit delay: 1s, 2s, 4s… capped at 30s. */
export function unlockDelayMs(failedAttempts: number): number {
  if (failedAttempts <= 0) return 0;
  const exp = Math.min(failedAttempts - 1, 5);
  return Math.min(30_000, 1000 * 2 ** exp);
}
