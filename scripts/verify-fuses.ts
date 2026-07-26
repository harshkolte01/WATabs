import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getCurrentFuseWire, FuseV1Options } from "@electron/fuses";

/** Mirror of @electron/fuses FuseState (not re-exported from package root). */
const FuseState = {
  DISABLE: 48,
  ENABLE: 49,
} as const;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "apps", "desktop", "out");

function findElectronBinary(dir: string): string | null {
  if (!fs.existsSync(dir)) {
    return null;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = findElectronBinary(full);
      if (nested) return nested;
    } else if (
      entry.name === "multi-whatsapp-desktop.exe" ||
      entry.name === "multi-whatsapp-desktop"
    ) {
      return full;
    }
  }
  return null;
}

async function main(): Promise<void> {
  const binary = findElectronBinary(outDir);
  if (!binary) {
    console.error(
      "verify-fuses: packaged app not found under apps/desktop/out. Run pnpm package first.",
    );
    process.exit(1);
  }

  const state = await getCurrentFuseWire(binary);
  const checks: Array<[FuseV1Options, number, string]> = [
    [FuseV1Options.RunAsNode, FuseState.DISABLE, "RunAsNode disabled"],
    [
      FuseV1Options.EnableNodeOptionsEnvironmentVariable,
      FuseState.DISABLE,
      "NODE_OPTIONS disabled",
    ],
    [
      FuseV1Options.EnableNodeCliInspectArguments,
      FuseState.DISABLE,
      "Node CLI inspect disabled",
    ],
    [
      FuseV1Options.EnableEmbeddedAsarIntegrityValidation,
      FuseState.ENABLE,
      "ASAR integrity enabled",
    ],
    [
      FuseV1Options.OnlyLoadAppFromAsar,
      FuseState.ENABLE,
      "OnlyLoadAppFromAsar enabled",
    ],
    [
      FuseV1Options.EnableCookieEncryption,
      FuseState.ENABLE,
      "Cookie encryption enabled",
    ],
  ];

  let failed = false;
  for (const [fuse, expected, label] of checks) {
    const actual = state[fuse] as number | undefined;
    if (actual !== expected) {
      console.error(
        `verify-fuses FAIL: ${label} (got ${String(actual)}, expected ${String(expected)})`,
      );
      failed = true;
    } else {
      console.log(`verify-fuses OK: ${label}`);
    }
  }

  if (failed) {
    process.exit(1);
  }
}

void main();
