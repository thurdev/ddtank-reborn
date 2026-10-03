#!/usr/bin/env node
// Generates everything a production deploy needs that must NOT be the repo's dev defaults:
//   - apps/api/.env + apps/game/.env (created from .env.example if missing)
//   - JWT_SECRET (apps/api)
//   - a fresh RSA keypair (apps/protocol), written as RSA_PRIVATE_KEY to BOTH .env files
//     (apps/game's login flow and apps/api's Login.ashx must sign/verify with the same key),
//     with RSA_USE_VENDOR_KEY=false so neither app can fall back to the public vendor pair
//   - the client patched to that key's modulus (patch-client-key), written to
//     apps/api/assets/flash/2.png (overlay: wins over vendor's FlashSV1/2.png, vendor/ stays untouched)
//   - a shared internal-admin bearer token (apps/game ADMIN_TOKEN == apps/api GAME_INTERNAL_TOKEN)
//   - .env (compose-level): POSTGRES_PASSWORD, and matching DATABASE_URL in both app .env files
//
// Usage: node scripts/gen-secrets.mjs [--force]   (--force overwrites secrets already set, not just blanks)
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// pnpm is a .cmd/.ps1 shim on Windows, which Node can only spawn through a shell — and shell:true with
// an args ARRAY does its own (buggy) re-tokenizing of any path containing a space (e.g. vendor's
// "Source Flash"). So: build one command STRING ourselves, quoted per-argument, and run it with
// execSync (always goes through a shell, on every platform). Our inputs are paths and base64url-ish
// RSA strings — no quotes/backticks/`$` in them — so plain double-quoting is safe on cmd.exe and sh.
const q = (s) => `"${String(s).replace(/"/g, '\\"')}"`;
function run(args, opts = {}) {
  return execSync(`pnpm ${args.map(q).join(" ")}`, { cwd: REPO, encoding: "utf8", ...opts });
}
const FORCE = process.argv.includes("--force");
const hex = (n) => randomBytes(n).toString("hex");

function ensureEnvFile(appDir) {
  const envPath = resolve(REPO, appDir, ".env");
  const examplePath = resolve(REPO, appDir, ".env.example");
  if (!existsSync(envPath)) {
    copyFileSync(examplePath, envPath);
    console.log(`created ${appDir}/.env from .env.example`);
  }
  return envPath;
}

/** Current value of KEY=... in a dotenv-style file, with any trailing "  # comment" stripped (several
 *  of this repo's .env.example files document a blank default inline, e.g. "JWT_SECRET=   # REQUIRED
 *  in production" — the comment is not part of the value). Returns undefined if the key isn't present. */
function getValue(text, key) {
  const m = new RegExp(`^${key}=(.*)$`, "m").exec(text);
  return m ? m[1].replace(/\s+#.*$/, "").trim() : undefined;
}

/** Upserts KEY=value lines in a dotenv-style file (replacing the whole line, comment included — once
 *  a key is set for real, the "still blank" comment no longer applies). Leaves other lines untouched. */
function upsert(envPath, updates) {
  let text = readFileSync(envPath, "utf8");
  for (const [key, value] of Object.entries(updates)) {
    const current = getValue(text, key);
    if (current !== undefined) {
      if (current !== "" && !FORCE) continue; // already set to a real value, keep it
      text = text.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${value}`);
    } else {
      text += (text.endsWith("\n") ? "" : "\n") + `${key}=${value}` + "\n";
    }
  }
  writeFileSync(envPath, text);
}

/** Always overwrites (unlike upsert()), regardless of --force. Used only for settings that must never
 *  silently stay at the .env.example dev default in a production deploy. */
function forceUpsert(envPath, updates) {
  let text = readFileSync(envPath, "utf8");
  for (const [key, value] of Object.entries(updates)) {
    const re = new RegExp(`^${key}=.*$`, "m");
    text = re.test(text) ? text.replace(re, `${key}=${value}`) : text + (text.endsWith("\n") ? "" : "\n") + `${key}=${value}\n`;
  }
  writeFileSync(envPath, text);
}

const apiEnv = ensureEnvFile("apps/api");
const gameEnv = ensureEnvFile("apps/game");
const rootEnvPath = resolve(REPO, ".env");
if (!existsSync(rootEnvPath)) copyFileSync(resolve(REPO, ".env.example"), rootEnvPath);

// apps/game/.env.example ships NODE_ENV=development; a docker-compose `env_file:` entry OVERRIDES the
// image's `ENV NODE_ENV=production` (apps/game/Dockerfile), silently defeating every prod-only guard
// (DEV_ALLOW_ANY_TICKET, RSA_USE_VENDOR_KEY, docker/entrypoint-game.sh). Force it every run.
forceUpsert(apiEnv, { NODE_ENV: "production" });
forceUpsert(gameEnv, { NODE_ENV: "production" });

// --- 1. JWT_SECRET ---
upsert(apiEnv, { JWT_SECRET: hex(48) });

// --- 2. RSA keypair (fresh per deploy; never the vendor's) + client patch ---
console.log("generating RSA keypair (pnpm --filter @ddt/api gen-rsa-key)...");
const genOut = run(["--filter", "@ddt/api", "run", "-s", "gen-rsa-key"]);
const rsaLine = genOut.split("\n").find((l) => l.startsWith("RSA_PRIVATE_KEY="));
const modulusMatch = genOut.match(/modulus \(172 chars\): (\S+)/);
if (!rsaLine || !modulusMatch) throw new Error(`gen-rsa-key output not understood:\n${genOut}`);
const rsaPrivateKey = rsaLine.slice("RSA_PRIVATE_KEY=".length);
const modulus = modulusMatch[1];

// RSA_USE_VENDOR_KEY defaults to "true" in both .env.example files (a non-blank value, so the
// keep-if-already-set upsert() above would never flip it) — force it, like NODE_ENV.
upsert(apiEnv, { RSA_PRIVATE_KEY: rsaPrivateKey });
upsert(gameEnv, { RSA_PRIVATE_KEY: rsaPrivateKey });
forceUpsert(apiEnv, { RSA_USE_VENDOR_KEY: "false" });
forceUpsert(gameEnv, { RSA_USE_VENDOR_KEY: "false" });

// Pipeline order: tools/i18n/abc-strings/patch.mjs (rewrites the Vietnamese ABC constant-pool string
// literals found in 2.png to PT-BR — see research/i18n/abc-strings.json), THEN
// tools/i18n/static-arrays/patch.mjs (recompiles 8 classes whose `static const Array` is built from
// LanguageMgr.GetTranslation() at class-init time, before language.txt has loaded, into lazy getters —
// see research/i18n/ui-sweep.md "Not fixed" item 1 and tools/i18n/static-arrays/patch.mjs's own header
// comment), must both run BEFORE patch-client-key (which does a dynamic indexOf() for the RSA modulus,
// so it works fine on either prior step's new byte layout). The chain always reads from the untouched
// VENDOR 2.png into scratch temp files — never from this script's own previous output — so re-running
// key rotation never tries to find-and-replace an RSA modulus in a file that no longer contains the
// original (already-rotated) one.
const vendor2png = resolve(REPO, "vendor", "DDTank41", "Source Flash", "FlashSV1", "2.png");
const patchedOutDir = resolve(REPO, "apps", "api", "assets", "flash");
const patchedOut = resolve(patchedOutDir, "2.png");
const abcStringsTool = resolve(REPO, "tools", "i18n", "abc-strings", "patch.mjs");
const staticArraysTool = resolve(REPO, "tools", "i18n", "static-arrays", "patch.mjs");
if (existsSync(vendor2png)) {
  mkdirSync(patchedOutDir, { recursive: true });
  let keySource = vendor2png;
  const scratchFiles = [];
  if (existsSync(abcStringsTool)) {
    const i18nTmp = resolve(patchedOutDir, "2.i18n-tmp.png");
    execSync(`node ${q(abcStringsTool)} ${q(keySource)} ${q(i18nTmp)}`, { cwd: REPO, stdio: "inherit" });
    keySource = i18nTmp;
    scratchFiles.push(i18nTmp);
  } else {
    console.warn(`WARNING: ${abcStringsTool} not found — shipping 2.png with un-translated ABC string literals.`);
  }
  if (existsSync(staticArraysTool)) {
    const lazyTmp = resolve(patchedOutDir, "2.lazy-arrays-tmp.png");
    execSync(`node ${q(staticArraysTool)} ${q(keySource)} ${q(lazyTmp)}`, { cwd: REPO, stdio: "inherit" });
    keySource = lazyTmp;
    scratchFiles.push(lazyTmp);
  } else {
    console.warn(`WARNING: ${staticArraysTool} not found — shipping 2.png with the eager static-array GetTranslation() race unpatched.`);
  }
  run(["--filter", "@ddt/api", "run", "-s", "patch-client-key", keySource, patchedOut, modulus], { stdio: "inherit" });
  for (const f of scratchFiles) {
    try {
      unlinkSync(f);
    } catch {}
  }
  console.log(`patched client -> ${patchedOut} (apps/api serves this overlay instead of vendor's 2.png)`);
} else {
  console.warn(`WARNING: ${vendor2png} not found — skipped patch-client-key.`);
  console.warn("  Run it manually once vendor/DDTank41 is present on this machine:");
  console.warn(`  pnpm --filter @ddt/api patch-client-key "<vendor 2.png>" apps/api/assets/flash/2.png ${modulus}`);
}

// --- 3. shared internal-admin token (apps/game ADMIN_TOKEN == apps/api GAME_INTERNAL_TOKEN) ---
const adminToken = hex(32);
upsert(gameEnv, { ADMIN_TOKEN: adminToken });
upsert(apiEnv, { GAME_INTERNAL_TOKEN: adminToken });

// --- 4. Postgres password + DATABASE_URL in both app .env files ---
let rootEnv = readFileSync(rootEnvPath, "utf8");
const pgUser = getValue(rootEnv, "POSTGRES_USER") || "ddtank";
const pgDb = getValue(rootEnv, "POSTGRES_DB") || "ddtank";
let pgPassword = getValue(rootEnv, "POSTGRES_PASSWORD");
if (!pgPassword || FORCE) {
  pgPassword = hex(24);
  rootEnv = /^POSTGRES_PASSWORD=/m.test(rootEnv) ? rootEnv.replace(/^POSTGRES_PASSWORD=.*$/m, `POSTGRES_PASSWORD=${pgPassword}`) : rootEnv + `\nPOSTGRES_PASSWORD=${pgPassword}\n`;
  writeFileSync(rootEnvPath, rootEnv);
}
const databaseUrl = `postgres://${pgUser}:${pgPassword}@postgres:5432/${pgDb}`;
upsert(apiEnv, { DATABASE_URL: databaseUrl });
upsert(gameEnv, { DATABASE_URL: databaseUrl });

console.log(`
Done. Generated/updated:
  .env            (POSTGRES_PASSWORD)
  apps/api/.env   (JWT_SECRET, RSA_PRIVATE_KEY, RSA_USE_VENDOR_KEY=false, GAME_INTERNAL_TOKEN, DATABASE_URL)
  apps/game/.env  (RSA_PRIVATE_KEY, RSA_USE_VENDOR_KEY=false, ADMIN_TOKEN, DATABASE_URL)
  apps/api/assets/flash/2.png   (client patched to the new RSA modulus)

Still manual (depends on your domain/IP — see docs/deploy/README.md):
  .env:           SITE_ADDRESS, ADMIN_ADDRESS, ACME_EMAIL
  apps/api/.env:  PUBLIC_URL, SITE_URL, GAME_HOST
  apps/game/.env: PUBLIC_HOST, WS_PUBLIC_URL, WS_ALLOWED_ORIGINS
Re-run with --force to rotate a secret (old logins/sessions signed with the previous JWT_SECRET or RSA key become invalid).
`);
