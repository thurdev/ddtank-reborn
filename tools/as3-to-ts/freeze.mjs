#!/usr/bin/env node
// Freezes the AS3 -> TS transpiler output (apps/client/src/game): runs the transpiler one last time
// with the current patches, writes a marker file that makes tools/as3-to-ts/src/main.ts refuse to run
// again (and silently overwrite manual edits) without --force, and un-ignores apps/client/src/game so
// it becomes the real, tracked source of the client's game code.
//
// Usage:
//   node tools/as3-to-ts/freeze.mjs            # first freeze (fails if apps/client/src/game/.frozen
//                                               # already exists — use --force to re-freeze on purpose)
//   node tools/as3-to-ts/freeze.mjs --force     # re-run the transpiler + re-freeze (e.g. after fixing a
//                                               # bug in the transpiler itself); OVERWRITES any manual
//                                               # edit made in apps/client/src/game since the last freeze
//
// What this does NOT do (deliberately, so the orchestrator commits on purpose, not this script):
//   - `git add`/`git commit` — printed as the next manual step.
//   - Delete tools/as3-to-ts/extra-src or patches/ — docs/client-pixi/TRANSPILADOR.md#congelamento says
//     to keep them around as history for a while after freezing; delete them in a later, separate commit
//     once the team has confirmed nobody needs the transpiler again.
//
// After this runs once for real: edit apps/client/src/game/**.ts directly, like any other TS in the repo.
// Patches in tools/as3-to-ts/patches/ are retired — new fixes go straight into the TS file they touch.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");
const OUT_ROOT = resolve(REPO, "apps/client/src/game");
const MARKER = join(OUT_ROOT, ".frozen");
const GITIGNORE = resolve(REPO, "apps/client/.gitignore");
const TRANSPILER = resolve(REPO, "tools/as3-to-ts/src/main.ts");

// see scripts/gen-secrets.mjs for why this is one quoted command STRING through execSync, not an argv
// array through spawnSync({ shell: true }) — same Windows "pnpm is a .cmd shim" + "vendor has spaces in
// its path" reasoning applies here.
const q = (s) => `"${String(s).replace(/"/g, '\\"')}"`;

const FORCE = process.argv.includes("--force");

if (existsSync(MARKER) && !FORCE) {
  console.error(`já congelado (${MARKER} existe, de ${readFileSync(MARKER, "utf8").trim()}).`);
  console.error("Pra re-gerar e re-congelar de propósito, rode: node tools/as3-to-ts/freeze.mjs --force");
  process.exit(1);
}

console.log("1/3 rodando o transpilador uma última vez (com os patches atuais)...");
execSync(`pnpm exec tsx ${q(TRANSPILER)}${FORCE ? " --force" : ""}`, { cwd: REPO, stdio: "inherit" });

console.log("2/3 escrevendo o marcador de congelamento...");
const when = new Date().toISOString();
writeFileSync(
  MARKER,
  `congelado em ${when}\n` +
    `apps/client/src/game agora é código-fonte normal (editado direto, não mais gerado).\n` +
    `Ver docs/client-pixi/TRANSPILADOR.md#congelamento. Pra re-gerar de propósito: node tools/as3-to-ts/freeze.mjs --force\n`,
);

console.log("3/3 tirando apps/client/src/game do .gitignore...");
const before = readFileSync(GITIGNORE, "utf8");
const after = before
  .split("\n")
  .filter((line) => line.trim() !== "src/game/")
  .join("\n");
if (after !== before) {
  writeFileSync(GITIGNORE, after);
  console.log(`  ${GITIGNORE}: removida a linha "src/game/"`);
} else {
  console.log("  (já não estava mais no .gitignore — ok, idempotente)");
}

console.log(
  [
    "",
    "Congelado. Falta só (passos manuais, de propósito — este script não commita):",
    "",
    "  git add apps/client/.gitignore apps/client/src/game",
    '  git commit -m "feat(client): congela o código gerado do cliente (apps/client/src/game)"',
    "",
    "Depois do commit:",
    "  - CI/Docker passam a poder buildar apps/client de verdade (antes do freeze não tinham o código).",
    "  - Edite apps/client/src/game/**.ts direto — é o código-fonte agora, como qualquer outro TS do repo.",
    "  - tools/as3-to-ts/extra-src e patches/ ficam só como histórico por um tempo; apagar os dois (e esta",
    "    nota) em um commit separado quando o time confirmar que não precisa mais rodar o transpilador.",
  ].join("\n"),
);
