/**
 * pt-BR (or other) overlay for `game` schema text columns. See scripts/export-texts.ts,
 * scripts/import-translations.ts and docs/ROADMAP.md "Localização PT-BR" for how rows get in here.
 *
 * Usage at a template-load call site (apps/game/src/db/*, apps/api/src/templates/*):
 *
 *   const rows = await db.select().from(game.Game_Map);
 *   const overlay = await loadTranslations(db, "Game_Map", cfg.DEFAULT_LANG);
 *   return rows.map((r) => applyTranslations(r, "ID", overlay));
 *
 * `applyTranslations` only overwrites columns that have a translation row; everything else (stats, ids,
 * pics, flags) passes through untouched. Falls back silently to the original `game` schema value — a
 * missing overlay row is normal (either the table hasn't been translated yet, or DEFAULT_LANG is the
 * source language), never an error.
 */
import { and, eq } from "drizzle-orm";
import type { Database } from "./client.js";
import { Translations } from "./schema/app.js";

export type TranslationOverlay = Map<string, Record<string, string>>;

/** Loads every (column -> text) translation for one `game` table + lang into memory (small per-table: tens to low thousands of rows, fine to cache in the caller for the process lifetime). */
export async function loadTranslations(db: Database, table: string, lang: string): Promise<TranslationOverlay> {
  const rows = await db
    .select({ column: Translations.column, rowId: Translations.rowId, text: Translations.text })
    .from(Translations)
    .where(and(eq(Translations.table, table), eq(Translations.lang, lang)));
  const overlay: TranslationOverlay = new Map();
  for (const r of rows) {
    let byCol = overlay.get(r.rowId);
    if (!byCol) overlay.set(r.rowId, (byCol = {}));
    byCol[r.column] = r.text;
  }
  return overlay;
}

/** Returns a shallow-copied row with any translated columns substituted in, by its primary-key column. */
export function applyTranslations<T extends Record<string, unknown>>(row: T, pkCol: keyof T, overlay: TranslationOverlay): T {
  const byCol = overlay.get(String(row[pkCol]));
  if (!byCol) return row;
  return { ...row, ...byCol };
}
