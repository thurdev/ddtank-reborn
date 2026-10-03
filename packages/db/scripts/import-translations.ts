/**
 * Import translated batches produced from export-texts.ts into app."Translations".
 *
 * Input: data/i18n/pt-BR/db/<table>.<column>.jsonl — one `{rowId, text}` per line (same shape as the export,
 * `text` already translated). Upserts (table, column, rowId, lang) rows; `sourceText` is filled from the
 * matching line in data/i18n/_work/db/<table>.<column>.jsonl when present, for drift detection later.
 *
 * Usage: DATABASE_URL=... pnpm --filter @ddt/db exec tsx scripts/import-translations.ts [--lang pt-BR] [Table.Column ...]
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { createDb } from "../src/index.js";
import { Translations } from "../src/schema/app.js";
import { REPO_ROOT } from "../src/paths.js";

function readJsonl(file: string): Map<string, string> {
  const m = new Map<string, string>();
  if (!existsSync(file)) return m;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    const { rowId, text } = JSON.parse(line) as { rowId: string; text: string };
    m.set(rowId, text);
  }
  return m;
}

async function run(argv: string[]) {
  let lang = "pt-BR";
  const files: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--lang") lang = argv[++i];
    else files.push(argv[i]);
  }

  const translatedDir = join(REPO_ROOT, "data", "i18n", lang, "db");
  const sourceDir = join(REPO_ROOT, "data", "i18n", "_work", "db");
  if (!existsSync(translatedDir)) throw new Error(`no translated batches under ${translatedDir}`);

  const names = files.length ? files.map((f) => `${f}.jsonl`) : readdirSync(translatedDir).filter((f) => f.endsWith(".jsonl"));
  const h = await createDb();
  console.log(`importing into ${h.kind} ${h.location}`);
  let total = 0;
  try {
    for (const name of names) {
      const m = name.match(/^(.+)\.([^.]+)\.jsonl$/);
      if (!m) {
        console.warn(`skip (bad name) ${name}`);
        continue;
      }
      const [, table, column] = m;
      const translated = readJsonl(join(translatedDir, name));
      const source = readJsonl(join(sourceDir, name));
      if (!translated.size) continue;
      const rows = [...translated.entries()].map(([rowId, text]) => ({
        table,
        column,
        rowId,
        lang,
        text,
        sourceText: source.get(rowId) ?? null,
      }));
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        await h.db
          .insert(Translations)
          .values(batch)
          .onConflictDoUpdate({
            target: [Translations.table, Translations.column, Translations.rowId, Translations.lang],
            set: { text: sql`excluded."text"`, sourceText: sql`excluded."sourceText"`, updatedAt: sql`now()` },
          });
      }
      total += rows.length;
      console.log(`${table}.${column}: ${rows.length} rows`);
    }
  } finally {
    await h.close();
  }
  console.log(`done, ${total} rows upserted into app."Translations" (lang=${lang})`);
}

await run(process.argv.slice(2));
