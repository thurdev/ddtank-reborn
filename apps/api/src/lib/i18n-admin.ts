/**
 * pt-BR overlay for the admin's generic CRUD (site-admin-redesign: the owner rejected the first round of
 * visual editors for showing raw Vietnamese — "doesn't look like the game"). `apps/api/src/templates/defs.ts`
 * already applies `app."Translations"` to the XML the CLIENT reads (`TRANSLATED_PK`); this is the same
 * mechanism wired into the ADMIN's generic `:resource` routes for `ResourceDef.translatable` resources
 * (`quests`, `dungeons`, `missions`, `npcs` — see `admin-resources.ts`).
 *
 * Contract: a row returned to the admin has, for each translatable column `X`:
 *   - `X`: the pt-BR overlay text if one exists, else the raw `game.*` value (same fallback the client uses)
 *   - `X__original`: always the raw `game.*` value, read-only reference
 * A PATCH to `X` never touches the raw column — it upserts `app."Translations"` (table, column, rowId,
 * lang="pt-BR"). The raw column stays the untouched vendor/donor text.
 */
import { and, eq } from "drizzle-orm";
import { app as appTables } from "@ddt/db";
import type { AppCtx } from "../context.js";
import type { ResourceDef } from "../routes/admin-resources.js";

type Row = Record<string, unknown>;
const LANG = "pt-BR";

/** Adds the pt-BR overlay (+ `__original`) to every translatable column of `rows`, keyed by `pkCol`. No-op for
 *  resources without `translatable` or an empty row set. */
export async function withTranslationOverlay(ctx: AppCtx, def: ResourceDef, pkCol: string, rows: Row[]): Promise<Row[]> {
  if (!def.translatable || !rows.length) return rows;
  const { table, cols } = def.translatable;
  const overlayRows = await ctx.h.db
    .select({ rowId: appTables.Translations.rowId, column: appTables.Translations.column, text: appTables.Translations.text })
    .from(appTables.Translations)
    .where(and(eq(appTables.Translations.table, table), eq(appTables.Translations.lang, LANG)));
  const byRow = new Map<string, Record<string, string>>();
  for (const o of overlayRows) {
    let m = byRow.get(o.rowId);
    if (!m) byRow.set(o.rowId, (m = {}));
    m[o.column] = o.text;
  }
  return rows.map((r) => {
    const out: Row = { ...r };
    const tr = byRow.get(String(r[pkCol]));
    for (const f of cols) {
      out[`${f}__original`] = r[f];
      if (tr?.[f] !== undefined) out[f] = tr[f];
    }
    return out;
  });
}

/** Pulls the translatable string fields out of a PATCH body (so `pick()` never writes them to the raw
 *  column) and returns the rest untouched. No-op (`rest` = `body`) for non-translatable resources. */
export function splitTranslatable(def: ResourceDef, body: Row): { translatable: Record<string, string>; rest: Row } {
  if (!def.translatable) return { translatable: {}, rest: body };
  const translatable: Record<string, string> = {};
  const rest: Row = {};
  for (const [k, v] of Object.entries(body)) {
    if (def.translatable.cols.includes(k) && typeof v === "string") translatable[k] = v;
    else if (!def.translatable.cols.some((c) => `${c}__original` === k)) rest[k] = v; // __original is never writable
  }
  return { translatable, rest };
}

/** Upserts one `app."Translations"` row per translated column. `originalRow` (the raw, pre-patch row) supplies
 *  `sourceText` — the vendor value at translation time, for future drift detection if the table gets re-seeded. */
export async function writeTranslations(ctx: AppCtx, def: ResourceDef, rowId: string, translatable: Record<string, string>, originalRow: Row): Promise<void> {
  if (!def.translatable) return;
  const { table } = def.translatable;
  for (const [column, text] of Object.entries(translatable)) {
    await ctx.h.db
      .insert(appTables.Translations)
      .values({ table, column, rowId, lang: LANG, text, sourceText: originalRow[column] != null ? String(originalRow[column]) : null })
      .onConflictDoUpdate({
        target: [appTables.Translations.table, appTables.Translations.column, appTables.Translations.rowId, appTables.Translations.lang],
        set: { text, updatedAt: new Date() },
      });
  }
}
