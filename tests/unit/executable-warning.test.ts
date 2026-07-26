import { describe, expect, it } from "vitest";
import { isDangerousExecutableFilename } from "../../apps/desktop/src/main/downloads/executable-warning";

describe("executable-warning (F3)", () => {
  it("detects dangerous extensions", () => {
    expect(isDangerousExecutableFilename("setup.exe")).toBe(true);
    expect(isDangerousExecutableFilename("run.ps1")).toBe(true);
    expect(isDangerousExecutableFilename("notes.pdf")).toBe(false);
    expect(isDangerousExecutableFilename("image.PNG")).toBe(false);
  });
});
