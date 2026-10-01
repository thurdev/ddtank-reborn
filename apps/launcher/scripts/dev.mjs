#!/usr/bin/env node
// Dev loop: tsc (main/preload) once + Vite dev server for the renderer + Electron pointed at it.
// Optional: `node scripts/dev.mjs --mock` also starts scripts/mock-api.mjs on :8080.
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const shell = process.platform === "win32";

if (process.argv.includes("--mock")) {
  spawn(process.execPath, [path.join(root, "scripts/mock-api.mjs")], { stdio: "inherit" });
}

const tsc = spawnSync("pnpm", ["exec", "tsc", "-p", "tsconfig.node.json"], { cwd: root, stdio: "inherit", shell });
if (tsc.status !== 0) process.exit(tsc.status ?? 1);

// Electron 44 has no postinstall: require("electron") downloads the binary on first use.
const electronBin = require("electron");

const server = await createServer({ configFile: path.join(root, "vite.config.ts"), root: path.join(root, "src/renderer") });
await server.listen();
const url = server.resolvedUrls?.local[0] ?? "http://localhost:5180/";
console.log(`renderer: ${url}`);

const child = spawn(electronBin, ["."], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, VITE_DEV_SERVER_URL: url, NODE_ENV: "development" },
});
child.on("exit", async (code) => {
  await server.close();
  process.exit(code ?? 0);
});
