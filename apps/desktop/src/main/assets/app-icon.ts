import fs from "node:fs";
import path from "node:path";
import { app, nativeImage, type NativeImage } from "electron";

function packagedAssetsRoot(): string {
  return path.join(process.resourcesPath, "assets");
}

function candidateRoots(): string[] {
  if (app.isPackaged) {
    return [packagedAssetsRoot()];
  }
  return [
    path.join(app.getAppPath(), "assets"),
    // main bundle: apps/desktop/.vite/build → ../../assets
    path.join(__dirname, "../../assets"),
    // cwd fallback when forge starts from apps/desktop
    path.join(process.cwd(), "assets"),
    path.join(process.cwd(), "apps/desktop/assets"),
  ];
}

export function resolveAppAsset(...parts: string[]): string | null {
  for (const root of candidateRoots()) {
    const candidate = path.join(root, ...parts);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/** Prefer .ico on Windows — taskbar/titlebar honor it more reliably than PNG. */
export function resolveAppIconPath(): string | null {
  if (process.platform === "win32") {
    const ico = resolveAppAsset("icon.ico");
    if (ico) return ico;
  }
  for (const relative of [
    "icon.png",
    "icons/icon-256.png",
    "icons/icon-32.png",
  ]) {
    const found = resolveAppAsset(...relative.split("/"));
    if (found) return found;
  }
  return null;
}

export function loadAppIcon(size?: number): NativeImage {
  // Sized PNGs are better for tray; skip when loading the window .ico.
  if (size && size > 0) {
    const sized = resolveAppAsset("icons", `icon-${size}.png`);
    if (sized) {
      const image = nativeImage.createFromPath(sized);
      if (!image.isEmpty()) {
        return image;
      }
    }
  }

  const iconPath = resolveAppIconPath();
  if (!iconPath) {
    return nativeImage.createEmpty();
  }
  let image = nativeImage.createFromPath(iconPath);
  if (image.isEmpty()) {
    return image;
  }
  if (size && size > 0) {
    image = image.resize({ width: size, height: size, quality: "best" });
  }
  return image;
}
