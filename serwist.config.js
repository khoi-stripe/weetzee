// @ts-check
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { serwist } from "@serwist/next/config";

/**
 * Returns a sha256 of a file's contents, so a precache entry only changes its
 * revision when the file actually changes (avoids re-downloading offline.html
 * on every deploy).
 */
function hashFile(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

// Extends @serwist/next's default extension list with web fonts so next/font's
// .woff2 files end up in the precache manifest.
const STATIC_EXTENSIONS = [
  "js", "css", "html", "ico", "png", "avif", "jpg", "jpeg", "gif", "svg",
  "webp", "json", "webmanifest", "woff", "woff2",
];

export default serwist({
  swSrc: "src/app/sw.ts",
  swDest: "out/sw.js",
  globPatterns: [
    `.next/static/**/*.{${STATIC_EXTENSIONS.join(",")}}`,
    "public/**/*",
  ],
  // @serwist/next's HTML manifest transform mangles public/*.html URLs
  // (offline.html ends up as /public/offline). Ignore public HTML and
  // re-add it explicitly via additionalPrecacheEntries.
  globIgnores: [
    "public/**/*.html",
    "public/CNAME",
  ],
  additionalPrecacheEntries: [
    { url: "/offline.html", revision: hashFile("public/offline.html") },
  ],
});
