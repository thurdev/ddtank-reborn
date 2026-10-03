/**
 * Export distinct, non-empty text values from `game` schema tables (Shop_Goods, Quest, Game_Map, NPC_Info,
 * Mission_Info, Pve_Info, Achievement, ...) to translation-batch JSON files. Reads straight from the gzipped
 * seed (packages/db/seed/game/<Table>.json.gz) so no DB connection is needed to produce the batches.
 *
 * Output: data/i18n/_work/db/<table>.<column>.jsonl  — one `{rowId, text}` per line.
 * Identical `text` values across rows are listed once per row (duplicates are cheap: the importer writes the
 * same translated string back to every rowId that had it), so a translator only needs to handle each distinct
 * string once if they dedupe client-side; we don't dedupe here to keep the row->text mapping trivial to re-merge.
 *
 * Usage: pnpm --filter @ddt/db exec tsx scripts/export-texts.ts [Table.Column ...]
 *   (no args -> exports the default TARGETS list below)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { REPO_ROOT, SEED_DIR } from "../src/paths.js";

/** table -> primary-key column -> text columns worth translating (see packages/db/src/schema/game.ts). */
export const TARGETS: Record<string, { pk: string; cols: string[] }> = {
  Game_Map: { pk: "ID", cols: ["Name", "Description", "Remark"] },
  Pve_Info: { pk: "ID", cols: ["Name", "Description"] },
  Mission_Info: { pk: "Id", cols: ["Name", "Title", "Description"] },
  Achievement: { pk: "ID", cols: ["Title", "Detail"] },
  NPC_Info: { pk: "ID", cols: ["Name"] },
  Quest: { pk: "ID", cols: ["Title", "Detail"] },
  Shop_Goods: { pk: "TemplateID", cols: ["Name", "Description", "Remark"] },
  Pet_Template_Info: { pk: "TemplateID", cols: ["Name", "Description"] },
  Pet_Skill_Info: { pk: "ID", cols: ["Name", "Description"] },
  Pet_Element_Info: { pk: "ID", cols: ["Name", "Description"] },
  Rune_Template: { pk: "TemplateID", cols: ["Name"] },
  Card_Info: { pk: "ID", cols: ["Name", "Description"] },
  Consortia_BuffTemp: { pk: "id", cols: ["name", "descript"] },
  New_Title: { pk: "ID", cols: ["Title"] },
};

const OUT_DIR = join(REPO_ROOT, "data", "i18n", "_work", "db");

function loadRows(table: string): Record<string, unknown>[] {
  const file = join(SEED_DIR, "game", `${table}.json.gz`);
  if (!existsSync(file)) throw new Error(`no seed file for ${table}: ${file}`);
  return JSON.parse(gunzipSync(readFileSync(file)).toString("utf8"));
}

function run(filterArgs: string[]) {
  mkdirSync(OUT_DIR, { recursive: true });
  const wanted = filterArgs.length ? new Set(filterArgs.map((a) => a.split(".")[0])) : null;
  let totalStrings = 0;
  let totalFiles = 0;
  for (const [table, { pk, cols }] of Object.entries(TARGETS)) {
    if (wanted && !wanted.has(table)) continue;
    const rows = loadRows(table);
    for (const col of cols) {
      const colFilter = filterArgs.length ? filterArgs.filter((a) => a.startsWith(`${table}.`)) : null;
      if (colFilter && colFilter.length && !colFilter.includes(`${table}.${col}`)) continue;
      const lines: string[] = [];
      for (const row of rows) {
        const v = row[col];
        if (typeof v !== "string") continue;
        const text = v.trim();
        if (!text) continue;
        lines.push(JSON.stringify({ rowId: String(row[pk]), text }));
      }
      if (!lines.length) continue;
      const outFile = join(OUT_DIR, `${table}.${col}.jsonl`);
      writeFileSync(outFile, lines.join("\n") + "\n", "utf8");
      totalStrings += lines.length;
      totalFiles++;
      console.log(`${table}.${col}: ${lines.length} rows -> ${outFile}`);
    }
  }
  console.log(`\n${totalFiles} files, ${totalStrings} strings total under ${OUT_DIR}`);
}

run(process.argv.slice(2));
