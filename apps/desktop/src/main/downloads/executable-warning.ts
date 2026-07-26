import path from "node:path";

const DANGEROUS_EXTENSIONS = new Set([
  ".exe",
  ".msi",
  ".bat",
  ".cmd",
  ".ps1",
  ".scr",
  ".com",
  ".jar",
  ".app",
  ".pkg",
  ".dmg",
  ".sh",
  ".command",
  ".vbs",
  ".js",
  ".jse",
  ".wsf",
  ".wsh",
]);

export function isDangerousExecutableFilename(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return DANGEROUS_EXTENSIONS.has(ext);
}

export function listDangerousExtensions(): string[] {
  return [...DANGEROUS_EXTENSIONS].sort();
}
