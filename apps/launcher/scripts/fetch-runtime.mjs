#!/usr/bin/env node
/**
 * Downloads a game runtime into apps/launcher/runtime/<kind>/ so electron-builder bundles it
 * (extraResources). The folder is gitignored: binaries NEVER go into git.
 *
 *   node scripts/fetch-runtime.mjs projector            # source from env or launcher.config.json
 *   node scripts/fetch-runtime.mjs ruffle --url <zip> --sha256 <hex>
 *   node scripts/fetch-runtime.mjs --hash <file>        # print sha256 of a local file (to fill the config)
 *
 * Source resolution per kind: --url/--sha256 > DDT_<KIND>_URL/DDT_<KIND>_SHA256 > launcher.config.json "runtimes".
 *
 * LEGAL: The Adobe Flash Player projector is proprietary. Adobe ended support on 2020-12-31 and no longer
 * distributes it; its EULA did not grant general redistribution rights. Downloading/bundling it is the
 * OPERATOR's decision and responsibility (use your own archived copy / mirror). Ruffle is MIT/Apache-2.0
 * and may be redistributed freely (keep its LICENSE files).
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXE = { projector: "flashplayer_sa.exe", ruffle: "ruffle.exe" };

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

async function sha256(file) {
  const h = createHash("sha256");
  await pipeline(fs.createReadStream(file), h);
  return h.digest("hex");
}

if (flag("hash")) {
  console.log(await sha256(flag("hash")));
  process.exit(0);
}

const kind = argv.find((a) => a === "projector" || a === "ruffle");
if (!kind) {
  console.error("uso: fetch-runtime.mjs <projector|ruffle> [--url URL --sha256 HEX] | --hash <arquivo>");
  process.exit(2);
}

let cfgSrc;
const cfgFile = path.join(root, "launcher.config.json");
if (fs.existsSync(cfgFile)) cfgSrc = JSON.parse(fs.readFileSync(cfgFile, "utf8")).runtimes?.[kind];
const K = kind.toUpperCase();
const url = flag("url") ?? process.env[`DDT_${K}_URL`] ?? cfgSrc?.url;
const expected = (flag("sha256") ?? process.env[`DDT_${K}_SHA256`] ?? cfgSrc?.sha256 ?? "").toLowerCase();
const innerExe = flag("exe") ?? cfgSrc?.exe;

if (!url) {
  console.error(`Nenhuma URL para ${kind}. Use --url, DDT_${K}_URL ou "runtimes.${kind}" em launcher.config.json.`);
  process.exit(2);
}
if (!/^[a-f0-9]{64}$/.test(expected)) {
  console.error(`sha256 obrigatório (64 hex) para ${kind}. Calcule com: node scripts/fetch-runtime.mjs --hash <arquivo>`);
  process.exit(2);
}
if (kind === "projector") {
  console.warn(
    "\n[AVISO LEGAL] Flash Player é software proprietário da Adobe, sem suporte desde 31/12/2020.\n" +
      "Redistribuí-lo é responsabilidade do operador do servidor. Não comite o binário no git.\n",
  );
}

const outDir = path.join(root, "runtime", kind);
fs.mkdirSync(outDir, { recursive: true });
const isZip = /\.zip(?:$|\?)/i.test(url);
const tmp = path.join(outDir, `download.${isZip ? "zip" : "exe"}.part`);

console.log(`Baixando ${url}`);
const res = await fetch(url, { redirect: "follow" });
if (!res.ok || !res.body) {
  console.error(`HTTP ${res.status}`);
  process.exit(1);
}
await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tmp));
const got = await sha256(tmp);
if (got !== expected) {
  fs.rmSync(tmp, { force: true });
  console.error(`sha256 NÃO confere!\n  esperado ${expected}\n  recebido ${got}`);
  process.exit(1);
}

const target = path.join(outDir, EXE[kind]);
if (isZip) {
  const x = path.join(outDir, "x");
  fs.rmSync(x, { recursive: true, force: true });
  fs.mkdirSync(x);
  const r = spawnSync("tar", ["-xf", tmp, "-C", x], { stdio: "inherit" });
  if (r.status !== 0) process.exit(1);
  const find = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isFile() && (innerExe ? e.name === path.basename(innerExe) : /^(ruffle|flashplayer.*)\.exe$/i.test(e.name))) return p;
      if (e.isDirectory()) {
        const f = find(p);
        if (f) return f;
      }
    }
  };
  const exe = find(x);
  if (!exe) {
    console.error("executável não encontrado no zip");
    process.exit(1);
  }
  for (const f of fs.readdirSync(path.dirname(exe))) {
    fs.renameSync(path.join(path.dirname(exe), f), path.join(outDir, f === path.basename(exe) ? EXE[kind] : f));
  }
  fs.rmSync(x, { recursive: true, force: true });
  fs.rmSync(tmp, { force: true });
} else {
  fs.renameSync(tmp, target);
}
fs.writeFileSync(path.join(outDir, "runtime.json"), JSON.stringify({ url, sha256: expected, fetchedAt: new Date().toISOString() }, null, 2));
console.log(`OK: ${target} (sha256 confere). Será incluído pelo electron-builder em resources/runtime/${kind}/`);
