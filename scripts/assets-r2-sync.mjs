#!/usr/bin/env node
// Syncs apps/client/public/assets (the PixiJS client's exported art: PNG + library.json per SWF, MP3 —
// several GB, gitignored, never built into a Docker image or git — see docs/client-pixi/ASSETS.md) to a
// Cloudflare R2 bucket (S3-compatible API), so production serves it from a CDN instead of the app VM.
// Walks the tree once, content-hashes every file, and only PUTs files whose hash changed since the last
// sync (tracked in a local manifest) — the first run of a multi-GB tree is slow no matter what, but every
// run after that is cheap. Uploaded with `Cache-Control: public, max-age=31536000, immutable` (see
// "Why immutable, without hashed filenames" below).
//
// Credentials are READ FROM ENV ONLY, never from a flag or a file this script writes — see .env.example
// at the repo root for the exact variable names (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
// R2_BUCKET, R2_PUBLIC_URL). Nothing here hardcodes a credential or calls out to R2 unless you set them.
//
// Usage:
//   node scripts/assets-r2-sync.mjs --dry-run
//     Walks + hashes the real asset tree, diffs against the last manifest, prints what WOULD be
//     uploaded/skipped and the total size — makes NO network calls and writes NOTHING. Safe with no
//     credentials set at all; this is the default smoke test (also run by `pnpm run assets:sync:dry`).
//
//   node scripts/assets-r2-sync.mjs --target <local-dir>
//     Same walk+hash+diff, but "uploads" by copying into a local folder instead of R2 — for testing the
//     whole pipeline (including the manifest/skip-unchanged logic) offline, no credentials needed.
//
//   node scripts/assets-r2-sync.mjs
//     The real thing: PUTs changed files to the R2 bucket named by the env vars above. Prints the
//     R2_PUBLIC_URL to copy into apps/client/.env as VITE_ASSETS_BASE_URL when done.
//
// Flags: --dir <path> (default apps/client/public/assets) --prefix <keyPrefix> (default "")
//        --concurrency <n> (default 8) --manifest <path> (default scripts/.assets-manifest.json)
//        --force (ignore the manifest, re-upload/re-copy every file)
//
// Why immutable, without hashed filenames: the client resolves assets by a FIXED logical path
// (packages/flash/src/swf/paths.ts `assetUrl(key)`, e.g. "flash/ui/.../library.json") baked into
// ~2600 generated game modules — renaming uploaded objects to "<hash>.png" would need a client-side
// manifest lookup for every asset load, which is a much bigger change than this deploy task calls for.
// Instead: the content hash drives WHICH files get re-uploaded (this script's own incremental-sync
// problem), and every object is still served as `Cache-Control: immutable` because in practice this
// tree is written once per art export (tools/swf-export) and republished as a whole, not edited file by
// file in place. If you DO hand-edit a PNG after publishing (docs/client-pixi/ASSETS.md "Trocar uma
// imagem") and re-sync, browsers/Cloudflare may keep serving the old bytes until that URL's cache
// expires — purge Cloudflare's cache for the bucket's custom domain after any such touch-up.
import { createHash } from "node:crypto";
import { createHmac } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const out = { dir: "apps/client/public/assets", prefix: "", concurrency: 8, manifest: "scripts/.assets-manifest.json", dryRun: false, force: false, target: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--force") out.force = true;
    else if (a === "--dir") out.dir = argv[++i];
    else if (a === "--prefix") out.prefix = argv[++i];
    else if (a === "--concurrency") out.concurrency = Number(argv[++i]);
    else if (a === "--manifest") out.manifest = argv[++i];
    else if (a === "--target") out.target = argv[++i];
    else {
      console.error(`argumento desconhecido: ${a}`);
      process.exit(1);
    }
  }
  return out;
}

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".json": "application/json", ".mp3": "audio/mpeg", ".txt": "text/plain; charset=utf-8" };
const mimeOf = (file) => MIME[extname(file).toLowerCase()] ?? "application/octet-stream";

function listFiles(root) {
  const real = realpathSync(root); // apps/client/public/assets is a read-only junction; follow it
  const out = [];
  const walk = (abs) => {
    for (const name of readdirSync(abs)) {
      const p = join(abs, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(p);
    }
  };
  walk(real);
  return out.map((abs) => ({ abs, rel: relative(real, abs).split("\\").join("/") }));
}

function sha256File(file) {
  return new Promise((res, rej) => {
    const h = createHash("sha256");
    createReadStream(file).on("data", (d) => h.update(d)).on("end", () => res(h.digest("hex"))).on("error", rej);
  });
}

/** Minimal pool: runs `items` through `fn` with at most `n` in flight. */
async function pool(items, n, fn) {
  let i = 0;
  const workers = Array.from({ length: Math.max(1, n) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
}

// Same hand-rolled AWS SigV4-over-fetch as apps/api/src/lib/storage.ts's s3Storage() (no @aws-sdk/* dep
// in this repo) — duplicated here rather than imported because that file is TS with app-specific config
// wiring, and this is a standalone root-level script with its own env var names.
function sha(b) {
  return createHash("sha256").update(b).digest("hex");
}
function hmac(k, s) {
  return createHmac("sha256", k).update(s).digest();
}
function signedPut(env, key, body, contentType) {
  const u = new URL(`${env.endpoint}/${env.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`);
  const now = new Date().toISOString().replace(/[-:]|\.\d{3}/g, "");
  const day = now.slice(0, 8);
  const payload = sha(body);
  const headers = {
    host: u.host,
    "x-amz-content-sha256": payload,
    "x-amz-date": now,
    "content-type": contentType,
    "cache-control": "public, max-age=31536000, immutable",
  };
  const names = Object.keys(headers).sort();
  const canon = [
    "PUT",
    u.pathname,
    "",
    names.map((n) => `${n}:${headers[n]}\n`).join(""),
    names.join(";"),
    payload,
  ].join("\n");
  const scope = `${day}/${env.region}/s3/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", now, scope, sha(canon)].join("\n");
  const kSig = hmac(hmac(hmac(hmac(`AWS4${env.secretAccessKey}`, day), env.region), "s3"), "aws4_request");
  headers.authorization = `AWS4-HMAC-SHA256 Credential=${env.accessKeyId}/${scope}, SignedHeaders=${names.join(";")}, Signature=${createHmac("sha256", kSig).update(toSign).digest("hex")}`;
  return fetch(u, { method: "PUT", headers, body: new Uint8Array(body) });
}

function r2EnvFromProcess() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_ENDPOINT, R2_PUBLIC_URL } = process.env;
  const missing = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"].filter((k) => !process.env[k]);
  if (missing.length) return { missing };
  return {
    endpoint: (R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`).replace(/\/+$/, ""),
    bucket: R2_BUCKET,
    region: "auto",
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    publicUrl: R2_PUBLIC_URL || "",
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dirAbs = resolve(REPO, args.dir);
  const manifestPath = resolve(REPO, args.manifest);
  if (!existsSync(dirAbs)) {
    console.error(`pasta não encontrada: ${dirAbs} (apps/client/public/assets vem do tools/swf-export — ver docs/client-pixi/ASSETS.md)`);
    process.exit(1);
  }

  let env = null;
  if (!args.dryRun && !args.target) {
    env = r2EnvFromProcess();
    if (env.missing) {
      console.error(`faltam variáveis de ambiente: ${env.missing.join(", ")} (ver .env.example na raiz do repo).`);
      console.error("Pra testar sem credenciais: --dry-run (só mostra o que faria) ou --target <pasta-local> (copia pra uma pasta).");
      process.exit(1);
    }
  }

  const prevManifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : { files: {} };
  const files = listFiles(dirAbs);
  console.log(`${files.length} arquivos em ${args.dir}`);

  const nextFiles = {};
  let uploaded = 0;
  let skipped = 0;
  let uploadedBytes = 0;
  let done = 0;

  await pool(files, Math.max(1, args.concurrency), async ({ abs, rel }) => {
    const key = (args.prefix ? `${args.prefix.replace(/\/+$/, "")}/` : "") + rel;
    const hash = await sha256File(abs);
    const size = statSync(abs).size;
    const prev = prevManifest.files[rel];
    const unchanged = !args.force && prev && prev.hash === hash;
    nextFiles[rel] = { hash, size, key };
    done++;
    if (unchanged) {
      skipped++;
    } else {
      if (args.dryRun) {
        // nothing to do
      } else if (args.target) {
        const out = resolve(REPO, args.target, key);
        mkdirSync(dirname(out), { recursive: true });
        copyFileSync(abs, out);
      } else {
        const body = readFileSync(abs);
        const res = await signedPut(env, key, body, mimeOf(abs));
        if (!res.ok) throw new Error(`R2 PUT ${key}: ${res.status} ${await res.text()}`);
      }
      uploaded++;
      uploadedBytes += size;
    }
    if (done % 2000 === 0 || done === files.length) console.log(`  ${done}/${files.length} (enviados: ${uploaded}, iguais: ${skipped})`);
  });

  console.log("");
  console.log(`${args.dryRun ? "[dry-run] seria enviado" : "enviado"}: ${uploaded} arquivo(s), ${(uploadedBytes / 1e6).toFixed(1)} MB`);
  console.log(`iguais ao último sync (pulados): ${skipped}`);

  if (!args.dryRun) {
    mkdirSync(dirname(manifestPath), { recursive: true });
    writeFileSync(manifestPath, JSON.stringify({ generatedAt: new Date().toISOString(), dir: args.dir, prefix: args.prefix, files: nextFiles }, null, 0));
    console.log(`manifesto salvo em ${args.manifest} (não versionado — só pra sync incremental local)`);
  }
  if (!args.dryRun && !args.target && env?.publicUrl) {
    console.log("");
    console.log(`apps/client/.env: VITE_ASSETS_BASE_URL=${env.publicUrl.replace(/\/+$/, "")}/${args.prefix ? `${args.prefix.replace(/\/+$/, "")}/` : ""}`);
  }
}

main().catch((e) => {
  console.error(e.stack || e.message);
  process.exit(1);
});
