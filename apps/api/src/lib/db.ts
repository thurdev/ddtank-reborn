import { sql, type SQL } from "drizzle-orm";
import type { DbHandle } from "@ddt/db";
import type { Row } from "./spec.js";

/** Runs a parameterized query (drizzle `sql` template) and returns plain rows for both drivers (PGlite / postgres.js). */
export async function q<T = Row>(h: DbHandle, query: SQL): Promise<T[]> {
  const res = (await h.db.execute(query)) as unknown;
  const rows = Array.isArray(res) ? res : ((res as { rows?: unknown[] }).rows ?? []);
  return rows.map(normalize) as T[];
}

export async function q1<T = Row>(h: DbHandle, query: SQL): Promise<T | undefined> {
  return (await q<T>(h, query))[0];
}

function normalize(r: unknown): Row {
  const o = r as Row;
  for (const k in o) {
    const v = o[k];
    if (typeof v === "bigint") o[k] = Number(v);
  }
  return o;
}

/** Quoted identifier for a schema-qualified table from a fixed whitelist (never user input). */
export const ident = (schema: string, table: string) => sql.raw(`"${schema}"."${table.replace(/"/g, "")}"`);

/** SELECT * FROM schema.table [ORDER BY <fixed clause>] — the port of the `SP_*_All` procedures (all are `select * from X`). */
export function all(h: DbHandle, schema: string, table: string, orderBy?: string): Promise<Row[]> {
  return q(h, sql`SELECT * FROM ${ident(schema, table)}${orderBy ? sql.raw(` ORDER BY ${orderBy}`) : sql``}`);
}

/** Safe int parse like C# int.Parse with a fallback. */
export function toInt(v: unknown, def = 0): number {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : def;
}
