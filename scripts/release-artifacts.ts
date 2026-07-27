/**
 * Generate SHA256SUMS.txt and a minimal SBOM JSON from Forge make/package output.
 * Usage: tsx scripts/release-artifacts.ts [dir]
 * Default dir: apps/desktop/out
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.resolve(
  process.argv[2] ?? path.join(root, "apps", "desktop", "out"),
);
const outDir = path.join(target, "release-meta");

function walk(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "release-meta") continue;
      walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

function sha256File(filePath: string): string {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function main(): void {
  if (!fs.existsSync(target)) {
    console.error(`release-artifacts: missing ${target}`);
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const files = walk(target).filter((f) => {
    const base = path.basename(f).toLowerCase();
    return (
      base.endsWith(".exe") ||
      base.endsWith(".zip") ||
      base.endsWith(".dmg") ||
      base.endsWith(".blockmap") ||
      base.endsWith(".yml") ||
      base.endsWith(".yaml")
    );
  });

  const lines: string[] = [];
  for (const file of files.sort()) {
    const rel = path.relative(target, file).replace(/\\/g, "/");
    lines.push(`${sha256File(file)}  ${rel}`);
  }
  const sumsPath = path.join(outDir, "SHA256SUMS.txt");
  fs.writeFileSync(sumsPath, `${lines.join("\n")}\n`, "utf8");

  const pkgPath = path.join(root, "apps", "desktop", "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as {
    name: string;
    version: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const sbom = {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      component: {
        type: "application",
        name: pkg.name,
        version: pkg.version,
      },
    },
    components: Object.entries({
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    }).map(([name, version]) => ({
      type: "library",
      name,
      version: String(version).replace(/^workspace:/, ""),
    })),
  };

  const sbomPath = path.join(outDir, "sbom.json");
  fs.writeFileSync(sbomPath, `${JSON.stringify(sbom, null, 2)}\n`, "utf8");

  console.log(`Wrote ${sumsPath} (${lines.length} files)`);
  console.log(`Wrote ${sbomPath}`);
}

main();
