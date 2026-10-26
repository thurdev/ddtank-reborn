// Scans everything a player sees in dungeons/PvE for leftover Chinese (Han) or Vietnamese text, so the
// i18n-instancias sweep can be driven to zero and re-checked later without redoing the whole investigation.
//
// Covers:
//  (a) data/i18n/pt-BR/db/<Table>.<Col>.jsonl for the PvE-relevant tables (Pve_Info, Mission_Info,
//      Mission_Info_Backup, NPC_Info, Game_Map, Quest) — the translated DB-text overlay batches
//      (see packages/db/scripts/export-texts.ts / import-translations.ts). Flags any row whose
//      translated value still has CJK or Vietnamese-only diacritics, AND any source row (in
//      data/i18n/_work/db) that has no translated counterpart at all (untranslated = still VN at runtime).
//  (b) packages/fight/src/pve/scripts/** (donor-transpiled mission/NPC AI, incl. Say()/chat text) and the
//      PvE-adjacent apps/game/src/handlers/**, apps/game/src/game/**, apps/game/src/rooms/** for CJK/VN
//      string literals in CODE lines (comments are skipped — see EXCEPTIONS below for the ones that remain
//      on purpose: dead/commented-out code, doc comments, debug logging never shown to a player).
//
// Usage: node tools/qa/pve-i18n-scan.mjs            (report; exit 1 if unexplained findings remain)
//        node tools/qa/pve-i18n-scan.mjs --json      (machine-readable)
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

const CJK = /[一-鿿]/;
const VN_ONLY = /[ăđơưĂĐƠƯạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴỶỸ]/;
const HAS_VN_OR_CJK = new RegExp(`(${CJK.source})|(${VN_ONLY.source})`);

/** DB-overlay tables this task owns (export-texts.ts TARGETS, PvE-relevant subset). */
const DB_TABLES = {
  Pve_Info: ["Name", "Description"],
  Mission_Info: ["Name", "Title", "Description", "Success", "Failure"],
  Mission_Info_Backup: ["Name", "Title", "Description", "Success", "Failure"],
  NPC_Info: ["Name"],
  Game_Map: ["Name", "Description", "Remark"],
  Quest: ["Title", "Detail", "Objective"],
};

/**
 * Code roots to scan for hardcoded CJK/VN literals (comments excluded). Scoped to PvE/dungeon code only —
 * NOT the whole `apps/game/src/handlers` tree, which also holds unrelated features (forja, minigame-termas,
 * mascote, ...) outside this task's "dungeons/PvE" scope. `packages/fight/src/pve/scripts/manual` is the
 * hand-written PvE engine glue (ancient-castle, catchbeast, worldboss, ...); `generated` is the donor-
 * transpiled mission/NPC AI (Say()/chat text lives there).
 */
const CODE_ROOTS = [
  "packages/fight/src/pve",
  "apps/game/src/handlers/salas", // create/configure/start a PvP or PvE room
  "apps/game/src/handlers/eventos", // includes labirinto.ts (Labyrinth dungeon)
  "apps/game/src/handlers/missoes", // quest/mission progress messages
  "apps/game/src/game", // pve-unlock.ts, rescue.ts, catchbeast.ts, fightlab.ts
  "apps/game/src/rooms", // room-mgr.ts: dungeon room lifecycle
  "apps/game/src/fight", // ddt.ts: PvE fight engine <-> game-server glue
];

/**
 * Known-and-accepted leftovers: never shown to a player (dead/commented-out code, doc comments, debug
 * logging). file path is relative to repo root; line is the 1-based line number at time of writing.
 * Keep this list short — anything added here must be justified in docs/I18N-AUDIT.md.
 */
const CODE_EXCEPTIONS = new Set([
  "packages/fight/src/pve/scripts/generated/Messions/CHM1274.ts:71", // comment: box-color legend, never rendered
  "packages/fight/src/pve/scripts/generated/Messions/CNM1174.ts:72", // comment: box-color legend, never rendered
  "packages/fight/src/pve/scripts/generated/Messions/CSM1074.ts:66", // comment: box-color legend, never rendered
  "packages/fight/src/pve/scripts/generated/Messions/CTM1374.ts:76", // comment: box-color legend, never rendered
  "packages/fight/src/pve/scripts/generated/Messions/THSM3004.ts:72", // comment: box-color legend, never rendered
  "packages/fight/src/pve/scripts/generated/Messions/TNSM3104.ts:72", // comment: box-color legend, never rendered
  "packages/fight/src/pve/scripts/generated/Messions/TSSM3204.ts:72", // comment: box-color legend, never rendered
  "packages/fight/src/pve/scripts/generated/Messions/TTSM3304.ts:72", // comment: box-color legend, never rendered
  "packages/fight/src/pve/scripts/generated/Messions/CNM1178.ts:49", // commented-out Say() call, dead code
  "packages/fight/src/pve/scripts/generated/Messions/CSM1078.ts:49", // commented-out Say() call, dead code
  "packages/fight/src/pve/scripts/generated/NPC/MyNpcAi.ts:29", // "/// 小怪说话" doc comment, never rendered
  "packages/fight/src/pve/scripts/generated/NPC/ThirdNormalShortNpcThird.ts:70", // commented-out Console.WriteLine debug line
]);

function readJsonl(file) {
  const m = new Map();
  if (!existsSync(file)) return m;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    const { rowId, text } = JSON.parse(line);
    m.set(rowId, text);
  }
  return m;
}

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const e of entries) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.ts$/.test(p) && !/\.test\.ts$/.test(p)) yield p;
  }
}

function scanDb() {
  const findings = [];
  for (const [table, cols] of Object.entries(DB_TABLES)) {
    for (const col of cols) {
      const srcFile = join(ROOT, "data", "i18n", "_work", "db", `${table}.${col}.jsonl`);
      const tgtFile = join(ROOT, "data", "i18n", "pt-BR", "db", `${table}.${col}.jsonl`);
      const src = readJsonl(srcFile);
      const tgt = readJsonl(tgtFile);
      if (!src.size) continue; // nothing exported for this column (export-texts.ts skips empty columns)
      for (const [rowId, text] of src) {
        if (!HAS_VN_OR_CJK.test(text)) continue; // source is already clean (e.g. seed itself is PT) — nothing to do
        const translated = tgt.get(rowId);
        if (translated === undefined) {
          findings.push({ kind: "db-missing", table, col, rowId, text });
        } else if (HAS_VN_OR_CJK.test(translated)) {
          findings.push({ kind: "db-leftover", table, col, rowId, text: translated });
        }
      }
    }
  }
  return findings;
}

function scanCode() {
  const findings = [];
  const LIT = /"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
  for (const root of CODE_ROOTS) {
    for (const file of walk(join(ROOT, root))) {
      const rel = file.slice(ROOT.length + 1).replace(/\\/g, "/");
      const lines = readFileSync(file, "utf8").split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue; // whole-line comments: not player-visible
        const code = line.replace(/\s\/\/.*$/, ""); // strip trailing // comment
        for (const m of code.matchAll(LIT)) {
          const s = m[1] ?? m[2];
          if (s && HAS_VN_OR_CJK.test(s)) {
            const key = `${rel}:${i + 1}`;
            if (CODE_EXCEPTIONS.has(key)) continue;
            findings.push({ kind: "code", file: rel, line: i + 1, text: s });
          }
        }
      }
    }
  }
  return findings;
}

const dbFindings = scanDb();
const codeFindings = scanCode();
const json = process.argv.includes("--json");

if (json) {
  console.log(JSON.stringify({ db: dbFindings, code: codeFindings }, null, 1));
} else {
  if (dbFindings.length) {
    console.log(`\n-- DB overlay (${dbFindings.length} findings) --`);
    for (const f of dbFindings) console.log(`${f.kind}\t${f.table}.${f.col}\t${f.rowId}\t${JSON.stringify(f.text)}`);
  }
  if (codeFindings.length) {
    console.log(`\n-- Code literals (${codeFindings.length} findings) --`);
    for (const f of codeFindings) console.log(`${f.file}:${f.line}\t${JSON.stringify(f.text)}`);
  }
  console.log(`\n${dbFindings.length + codeFindings.length} unexplained PvE/dungeon VN-or-CJK findings (DB: ${dbFindings.length}, code: ${codeFindings.length}).`);
}

if (dbFindings.length + codeFindings.length > 0) process.exit(1);
