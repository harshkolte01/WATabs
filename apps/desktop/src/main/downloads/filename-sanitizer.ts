import fs from "node:fs";
import path from "node:path";

const MAX_FILENAME_LENGTH = 180;

export function sanitizeFilename(raw: string): string {
  let name = (raw || "download").normalize("NFKC");
  name = name.replace(/[\u0000-\u001f\u007f]/g, "");
  name = name.replace(/[<>:"|?*]/g, "_");
  name = name.replace(/[/\\]/g, "_");
  name = name.replace(/\.\.+/g, ".");
  name = name.replace(/^\.+/, "");
  name = name.trim();
  if (!name || name === "." || name === "..") {
    name = "download";
  }
  if (name.length > MAX_FILENAME_LENGTH) {
    const ext = path.extname(name);
    const base = path.basename(name, ext).slice(
      0,
      Math.max(1, MAX_FILENAME_LENGTH - ext.length),
    );
    name = `${base}${ext}`;
  }
  return name;
}

export function resolveUniquePath(
  directory: string,
  filename: string,
): string {
  const safe = sanitizeFilename(filename);
  const ext = path.extname(safe);
  const base = path.basename(safe, ext);
  let candidate = path.join(directory, safe);
  let counter = 1;
  while (fs.existsSync(candidate)) {
    candidate = path.join(directory, `${base} (${counter})${ext}`);
    counter += 1;
    if (counter > 10_000) {
      candidate = path.join(directory, `${base}-${Date.now()}${ext}`);
      break;
    }
  }
  return candidate;
}
