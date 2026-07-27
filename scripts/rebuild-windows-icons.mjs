/**
 * Rebuild apps/desktop Windows icons from the brand SVG (crisper 16–32px mipmaps).
 * Usage: node scripts/rebuild-windows-icons.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const svgPath = path.join(root, "assets/logo/watabs-icon.svg");
const outDir = path.join(root, "apps/desktop/assets");
const iconsDir = path.join(outDir, "icons");
const sizes = [16, 24, 32, 48, 64, 128, 256, 512];

/** Pack PNG buffers into a multi-image ICO (PNG-compressed entries). */
function pngsToIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6 + count * 16;
  let offset = headerSize;
  const entries = [];
  for (const png of pngBuffers) {
    entries.push({ png, offset, size: png.length });
    offset += png.length;
  }
  const buf = Buffer.alloc(offset);
  buf.writeUInt16LE(0, 0);
  buf.writeUInt16LE(1, 2);
  buf.writeUInt16LE(count, 4);
  let entryAt = 6;
  for (let i = 0; i < count; i++) {
    const png = pngBuffers[i];
    // Read IHDR width/height
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    buf.writeUInt8(width >= 256 ? 0 : width, entryAt);
    buf.writeUInt8(height >= 256 ? 0 : height, entryAt + 1);
    buf.writeUInt8(0, entryAt + 2);
    buf.writeUInt8(0, entryAt + 3);
    buf.writeUInt16LE(1, entryAt + 4);
    buf.writeUInt16LE(32, entryAt + 6);
    buf.writeUInt32LE(entries[i].size, entryAt + 8);
    buf.writeUInt32LE(entries[i].offset, entryAt + 12);
    entryAt += 16;
  }
  for (const e of entries) {
    e.png.copy(buf, e.offset);
  }
  return buf;
}

function renderPng(svg, size) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
    background: "rgba(0,0,0,0)",
  });
  return Buffer.from(resvg.render().asPng());
}

function main() {
  if (!fs.existsSync(svgPath)) {
    console.error(`Missing ${svgPath}`);
    process.exit(1);
  }
  const svg = fs.readFileSync(svgPath);
  fs.mkdirSync(iconsDir, { recursive: true });

  const icoPngs = [];
  for (const size of sizes) {
    const png = renderPng(svg, size);
    fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), png);
    if ([16, 24, 32, 48, 64, 128, 256].includes(size)) {
      icoPngs.push(png);
    }
    console.log(`wrote icons/icon-${size}.png (${png.length} bytes)`);
  }

  const icon256 = renderPng(svg, 256);
  fs.writeFileSync(path.join(outDir, "icon.png"), icon256);
  fs.writeFileSync(path.join(outDir, "icon-64.png"), renderPng(svg, 64));

  const ico = pngsToIco(icoPngs);
  fs.writeFileSync(path.join(outDir, "icon.ico"), ico);
  console.log(`wrote icon.ico (${ico.length} bytes, ${icoPngs.length} images)`);

  const rendererIcon = path.join(
    root,
    "apps/desktop/src/renderer/assets/icon.png",
  );
  if (fs.existsSync(path.dirname(rendererIcon))) {
    fs.writeFileSync(rendererIcon, renderPng(svg, 64));
    console.log("wrote src/renderer/assets/icon.png");
  }
}

main();
