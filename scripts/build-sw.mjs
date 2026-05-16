#!/usr/bin/env node
/**
 * Builds the service worker without requiring a native esbuild binary.
 *
 * esbuild-wasm runs sw.ts bundling via `node bin/esbuild` (a JS wrapper around
 * the Go WASM binary) — no native binary involved, so SANTA won't block it.
 *
 * Node.js v24 regression: SyncWriteStream crashes on large single writes from
 * the WASM subprocess. We patch bin/esbuild in-memory to chunk stdout writes
 * before spawning it, so the fix never touches node_modules on disk.
 *
 * Flow:
 *   1. Load serwist config → get glob patterns + extra precache entries
 *   2. @serwist/build generates the precache manifest
 *   3. Patched esbuild-wasm bundles sw.ts with the manifest injected as a define
 */
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve, parse } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

// ── 1. Load serwist config ────────────────────────────────────────────────────
const configPath = pathToFileURL(resolve(repoRoot, "serwist.config.js")).href;
const config = (await import(configPath)).default;
const resolved = typeof config.then === "function" ? await config : config;

// ── 2. Generate precache manifest ────────────────────────────────────────────
const { getFileManifestEntries } = await import("@serwist/build");
const { count, size, manifestEntries, warnings } = await getFileManifestEntries({
  ...resolved,
  globDirectory: repoRoot,
});
for (const w of warnings) console.warn("[build-sw]", w);

// Compact JSON — no newlines — so the value is safe as a single --define argument.
// Must NOT be double-stringified: esbuild --define expects a JS expression, not a
// string literal. Double-encoding (JSON.stringify of a JSON string) would make
// self.__SW_MANIFEST a string at runtime, causing serwist to iterate its characters.
const manifestString = manifestEntries === undefined
  ? "undefined"
  : JSON.stringify(manifestEntries);

// ── 3. Patch esbuild-wasm bin to fix Node v24 SyncWriteStream crash ───────────
// The crash: process.stdout.write(largeBuf) in a piped subprocess triggers
// "RangeError: Invalid array length" in Node v24's SyncWriteStream. Fix by
// chunking large writes. We write the patched script to a temp file.
const esbuildWasmBin = resolve(repoRoot, "node_modules/esbuild-wasm/bin/esbuild");
const originalBin = readFileSync(esbuildWasmBin, "utf8");

const CHUNK_PATCH = `
// Node v24 fix: chunk large writes to avoid SyncWriteStream "Invalid array length" crash.
// Call the real writeSync with smaller pieces — never redirect to process.stdout.write
// which would recurse back through SyncWriteStream and cause the same crash.
const _origWriteSync = fs.writeSync;
fs.writeSync = function (fd, buf) {
  if ((fd === process.stdout.fd || fd === process.stderr.fd) && Buffer.isBuffer(buf) && buf.length > 65536) {
    const CHUNK = 65536;
    for (let i = 0; i < buf.length; i += CHUNK) {
      _origWriteSync.call(fs, fd, buf.subarray(i, Math.min(i + CHUNK, buf.length)));
    }
    return buf.length;
  }
  return _origWriteSync.apply(this, arguments);
};
`;

// Replace the existing fs.writeSync monkey-patch with our chunked version
const patched = originalBin.replace(
  /const writeSync = fs\.writeSync;[\s\S]*?return writeSync\.apply\(this, arguments\);\s*\};/,
  CHUNK_PATCH
);

// Write alongside original so __dirname-relative paths (wasm_exec_node.js, esbuild.wasm) resolve correctly
const tmpBin = resolve(repoRoot, "node_modules/esbuild-wasm/bin/esbuild-node24.cjs");
writeFileSync(tmpBin, patched);

// ── 4. Build sw.ts via patched esbuild-wasm ───────────────────────────────────
const outDir = resolve(repoRoot, "out");
mkdirSync(outDir, { recursive: true });

const swDest = resolve(repoRoot, resolved.swDest);
const swSrc = resolve(repoRoot, resolved.swSrc);
const { name: outName } = parse(swDest);

const args = [
  tmpBin,
  swSrc,
  `--bundle`,
  `--format=esm`,
  `--platform=browser`,
  `--target=es2020`,
  `--tree-shaking=true`,
  process.env.NODE_ENV !== "development" ? "--minify" : "",
  `--define:self.__SW_MANIFEST=${manifestString}`,
  `--outfile=${swDest}`,
].filter(Boolean);

await new Promise((resolve, reject) => {
  const child = spawn("node", args, { stdio: "inherit", cwd: repoRoot });
  child.on("exit", (code) => {
    rmSync(tmpBin, { force: true });
    if (code === 0) resolve();
    else reject(new Error(`esbuild exited with code ${code}`));
  });
  child.on("error", (err) => { rmSync(tmpBin, { force: true }); reject(err); });
});

console.log(`[build-sw] Using patched esbuild-wasm (Node v24 compatible)`);
console.log(`[build-sw] The service worker file was written to ${resolved.swDest}.`);
if (count > 0) {
  const prettyBytes = (await import("pretty-bytes")).default;
  console.log(`[build-sw] The service worker will precache ${count} URLs, totaling ${prettyBytes(size)}.`);
}
