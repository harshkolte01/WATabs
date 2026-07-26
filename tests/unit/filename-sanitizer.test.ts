import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  resolveUniquePath,
  sanitizeFilename,
} from "../../apps/desktop/src/main/downloads/filename-sanitizer";

describe("filename-sanitizer (F1/F2)", () => {
  const tmpDirs: string[] = [];

  afterEach(() => {
    for (const dir of tmpDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("strips traversal and control characters", () => {
    expect(sanitizeFilename("../etc/passwd")).toBe("_etc_passwd");
    expect(sanitizeFilename("../etc/passwd")).not.toContain("..");
    expect(sanitizeFilename("../etc/passwd")).not.toMatch(/[/\\]/);
    expect(sanitizeFilename("hi\u0000there.pdf")).toBe("hithere.pdf");
    expect(sanitizeFilename("")).toBe("download");
  });

  it("resolves duplicate filenames", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dl-"));
    tmpDirs.push(dir);
    fs.writeFileSync(path.join(dir, "photo.jpg"), "a");
    const second = resolveUniquePath(dir, "photo.jpg");
    expect(path.basename(second)).toBe("photo (1).jpg");
  });
});
