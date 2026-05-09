#!/usr/bin/env node
import sharp from "sharp";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const publicDir = join(repoRoot, "public");
const iosIconDir = join(repoRoot, "ios/App/App/Assets.xcassets/AppIcon.appiconset");
const svg = readFileSync(join(publicDir, "icon.svg"));

// Render SVG to PNG with no alpha channel (iOS app icons must be opaque).
// flatten() composites onto a solid background; SVG already fills with black.
async function render(size, outPath) {
  await sharp(svg)
    .resize(size, size)
    .flatten({ background: "#000000" })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

// Web / PWA icons
for (const size of [192, 512]) {
  const out = join(publicDir, `icon-${size}.png`);
  await render(size, out);
  console.log(`public/icon-${size}.png`);
}
await render(180, join(publicDir, "apple-touch-icon.png"));
console.log("public/apple-touch-icon.png");

// iOS app icons. Names match Contents.json in AppIcon.appiconset.
const iosIcons = [
  ["AppIcon-20x20@1x.png", 20],
  ["AppIcon-20x20@2x.png", 40],
  ["AppIcon-20x20@3x.png", 60],
  ["AppIcon-29x29@1x.png", 29],
  ["AppIcon-29x29@2x.png", 58],
  ["AppIcon-29x29@3x.png", 87],
  ["AppIcon-40x40@1x.png", 40],
  ["AppIcon-40x40@2x.png", 80],
  ["AppIcon-40x40@3x.png", 120],
  ["AppIcon-60x60@2x.png", 120],
  ["AppIcon-60x60@3x.png", 180],
  ["AppIcon-76x76@2x.png", 152],
  ["AppIcon-83.5x83.5@2x.png", 167],
  ["AppIcon-1024x1024.png", 1024],
];

for (const [name, size] of iosIcons) {
  await render(size, join(iosIconDir, name));
  console.log(`ios/.../${name} (${size}x${size})`);
}
