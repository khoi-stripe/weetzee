#!/usr/bin/env node
/**
 * Builds the service worker via Serwist's CLI.
 *
 * On macOS, the npm-bundled `esbuild` binary is adhoc-signed and may be
 * killed by Gatekeeper (SIGKILL on launch). When that happens, we fall
 * back to a system-installed esbuild via ESBUILD_BINARY_PATH.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const bundledEsbuild = resolve(
  repoRoot,
  "node_modules/@esbuild/darwin-arm64/bin/esbuild"
);

const env = { ...process.env };

if (process.platform === "darwin" && !env.ESBUILD_BINARY_PATH) {
  let bundledWorks = false;
  if (existsSync(bundledEsbuild)) {
    const probe = spawnSync(bundledEsbuild, ["--version"], { encoding: "utf-8" });
    bundledWorks = probe.status === 0;
  }
  if (!bundledWorks) {
    const candidates = [
      "/opt/homebrew/bin/esbuild",
      "/usr/local/bin/esbuild",
    ];
    const fallback = candidates.find((p) => existsSync(p));
    if (fallback) {
      console.log(`[build-sw] Using system esbuild at ${fallback} (bundled binary unusable)`);
      env.ESBUILD_BINARY_PATH = fallback;
    } else {
      console.warn("[build-sw] Bundled esbuild appears unusable and no system esbuild was found.");
      console.warn("[build-sw] If the build fails, install esbuild via 'brew install esbuild'.");
    }
  }
}

const child = spawn(
  "node",
  [
    resolve(repoRoot, "node_modules/@serwist/cli/cli.js"),
    "build",
    "--config",
    "serwist.config.js",
  ],
  { stdio: "inherit", env, cwd: repoRoot }
);

child.on("exit", (code) => process.exit(code ?? 1));
