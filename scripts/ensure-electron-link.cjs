/**
 * Electron Forge resolves electron from apps/desktop/node_modules/electron.
 * With pnpm node-linker=hoisted the real package lives at the repo root; this
 * script keeps a junction in place and repairs stale/broken targets.
 */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const target = path.join(root, "node_modules", "electron");
const linkPath = path.join(root, "apps", "desktop", "node_modules", "electron");

function canResolve(modulePath) {
  try {
    require.resolve(modulePath);
    return true;
  } catch {
    return false;
  }
}

function removePath(p) {
  if (!fs.existsSync(p) && !fs.lstatSync(p, { throwIfNoEntry: false })) {
    return;
  }
  try {
    const stat = fs.lstatSync(p);
    if (stat.isSymbolicLink() || stat.isDirectory()) {
      // Windows junctions often need rmdir, not recursive rm.
      const result = spawnSync("cmd", ["/c", "rmdir", p], { encoding: "utf8" });
      if (result.status === 0) {
        return;
      }
    }
  } catch {
    // fall through
  }
  fs.rmSync(p, { recursive: true, force: true });
}

if (!fs.existsSync(target) || !canResolve(target)) {
  console.error(
    "ensure-electron-link: root electron package missing. Run: node node_modules/electron/install.js",
  );
  process.exit(1);
}

fs.mkdirSync(path.dirname(linkPath), { recursive: true });

if (canResolve(linkPath)) {
  process.exit(0);
}

if (fs.existsSync(linkPath) || fs.lstatSync(linkPath, { throwIfNoEntry: false })) {
  removePath(linkPath);
}

try {
  fs.symlinkSync(target, linkPath, "junction");
  if (!canResolve(linkPath)) {
    throw new Error("created link but module still does not resolve");
  }
  console.log("ensure-electron-link: linked apps/desktop/node_modules/electron -> root");
} catch (error) {
  console.error("ensure-electron-link: failed to create link", error);
  process.exit(1);
}
