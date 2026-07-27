/**
 * Assert NSIS release artifacts exist and match desktop package version.
 * Usage: tsx scripts/verify-windows-release.ts [outDir]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.resolve(
  process.argv[2] ?? path.join(root, "apps", "desktop", "out"),
);

function walk(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function main(): void {
  const pkgPath = path.join(root, "apps", "desktop", "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as {
    version: string;
  };
  const version = pkg.version;
  const files = walk(outDir);
  const setupName = `WATabs-${version}-Setup.exe`;
  const setup = files.find(
    (f) => path.basename(f).toLowerCase() === setupName.toLowerCase(),
  );
  const latestYml = files.find(
    (f) => path.basename(f).toLowerCase() === "latest.yml",
  );

  if (!setup) {
    console.error(
      `verify-windows-release: missing ${setupName} under ${outDir}`,
    );
    process.exit(1);
  }
  if (!latestYml) {
    console.error(
      `verify-windows-release: missing latest.yml under ${outDir} (needed for electron-updater)`,
    );
    process.exit(1);
  }

  const yml = fs.readFileSync(latestYml, "utf8");
  if (!yml.includes(`version: ${version}`) && !yml.includes(`version: '${version}'`)) {
    // electron-updater yaml uses `version: x.y.z`
    if (!new RegExp(`^version:\\s*['"]?${version.replace(/\./g, "\\.")}`, "m").test(yml)) {
      console.error(
        `verify-windows-release: latest.yml version mismatch (expected ${version})`,
      );
      console.error(yml.slice(0, 400));
      process.exit(1);
    }
  }

  const setupStat = fs.statSync(setup);
  if (setupStat.size < 1_000_000) {
    console.error(
      `verify-windows-release: Setup.exe looks too small (${setupStat.size} bytes)`,
    );
    process.exit(1);
  }

  console.log(`verify-windows-release OK`);
  console.log(`  setup: ${path.relative(root, setup)} (${setupStat.size} bytes)`);
  console.log(`  yml:   ${path.relative(root, latestYml)}`);
  console.log(`  version: ${version}`);
}

main();
