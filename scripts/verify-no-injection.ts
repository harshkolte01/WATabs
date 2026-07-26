import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const desktopSrc = path.join(root, "apps", "desktop", "src");

const forbiddenFilePatterns = [/whatsapp[-_]?preload/i];
const forbiddenCodePatterns = [
  { re: /executeJavaScript\s*\(/, label: "executeJavaScript(" },
  {
    re: /invoke\s*\(\s*channel\s*,/,
    label: "generic invoke(channel, …)",
  },
  // Permissive TLS acceptance for WhatsApp must never ship.
  {
    re: /certificate-error[\s\S]{0,200}callback\s*\(\s*true\s*\)/,
    label: "certificate-error callback(true)",
  },
];

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

let failed = false;

for (const file of walk(desktopSrc)) {
  const base = path.basename(file);
  for (const pattern of forbiddenFilePatterns) {
    if (pattern.test(base)) {
      console.error(`Forbidden preload-like file: ${file}`);
      failed = true;
    }
  }
  const text = fs.readFileSync(file, "utf8");
  for (const { re, label } of forbiddenCodePatterns) {
    if (re.test(text)) {
      console.error(`Forbidden pattern ${label} in ${file}`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log("verify-no-injection: OK");
