#!/usr/bin/env node
/**
 * Generates splash screen PNGs for Android and iOS from the SVG icon.
 * Uses sharp (already a devDependency).
 */
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const iconPath = resolve(root, "public/icon.svg");

const ANDROID_SPLASH = [
  { dir: "drawable",           w: 480,  h: 800,  icon: 128 },
  { dir: "drawable-port-mdpi", w: 320,  h: 480,  icon: 96  },
  { dir: "drawable-port-hdpi", w: 480,  h: 800,  icon: 144 },
  { dir: "drawable-port-xhdpi",  w: 720,  h: 1280, icon: 192 },
  { dir: "drawable-port-xxhdpi", w: 1080, h: 1920, icon: 288 },
  { dir: "drawable-port-xxxhdpi",w: 1440, h: 2560, icon: 384 },
  { dir: "drawable-land-mdpi", w: 480,  h: 320,  icon: 96  },
  { dir: "drawable-land-hdpi", w: 800,  h: 480,  icon: 144 },
  { dir: "drawable-land-xhdpi",  w: 1280, h: 720,  icon: 192 },
  { dir: "drawable-land-xxhdpi", w: 1920, h: 1080, icon: 288 },
  { dir: "drawable-land-xxxhdpi",w: 2560, h: 1440, icon: 384 },
];

const IOS_SPLASH = [
  { name: "splash-2732x2732.png",   w: 2732, h: 2732, icon: 512 },
  { name: "splash-2732x2732-1.png", w: 2732, h: 2732, icon: 512 },
  { name: "splash-2732x2732-2.png", w: 2732, h: 2732, icon: 512 },
];

async function generateSplash(width, height, iconSize, outputPath) {
  const icon = await sharp(iconPath)
    .resize(iconSize, iconSize)
    .png()
    .toBuffer();

  const left = Math.round((width - iconSize) / 2);
  const top = Math.round((height - iconSize) / 2);

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([{ input: icon, left, top }])
    .png()
    .toFile(outputPath);

  console.log(`  ${outputPath}`);
}

async function main() {
  console.log("Generating Android splash screens...");
  for (const { dir, w, h, icon } of ANDROID_SPLASH) {
    const outDir = resolve(root, `android/app/src/main/res/${dir}`);
    mkdirSync(outDir, { recursive: true });
    await generateSplash(w, h, icon, resolve(outDir, "splash.png"));
  }

  console.log("Generating iOS splash screens...");
  const iosAssetsDir = resolve(root, "ios/App/App/Assets.xcassets/Splash.imageset");
  mkdirSync(iosAssetsDir, { recursive: true });
  for (const { name, w, h, icon } of IOS_SPLASH) {
    await generateSplash(w, h, icon, resolve(iosAssetsDir, name));
  }

  const contentsJson = {
    images: [
      { idiom: "universal", filename: "splash-2732x2732.png", scale: "1x" },
      { idiom: "universal", filename: "splash-2732x2732-1.png", scale: "2x" },
      { idiom: "universal", filename: "splash-2732x2732-2.png", scale: "3x" },
    ],
    info: { version: 1, author: "xcode" },
  };
  writeFileSync(
    resolve(iosAssetsDir, "Contents.json"),
    JSON.stringify(contentsJson, null, 2) + "\n"
  );

  console.log("Done!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
