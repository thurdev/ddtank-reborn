import { queryOptions, useQueries } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { resourceByName } from "@/resources";
import type { FieldDef, Row } from "./types";

/**
 * Generic "ref" field type: a foreign key to another registered resource (UserID -> players, ConsortiaID ->
 * guilds, MapID -> maps...). This module is the client half of it — table rows are resolved in ONE batched
 * request per target resource per page (never N+1), forms use a per-id cache (one row at a time, no batching
 * needed there). Server half: `GET /api/admin/<resource>?ids=1,2,3` in apps/api/src/routes/admin.ts.
 */

const isRefType = (t: FieldDef["type"]) => t === "ref" || t === "ref-multi";

/** The target resource's PK field name (first column, for composite keys) and label/title field. */
function targetMeta(resource: string): { pk: string; label: string } {
  const def = resourceByName.get(resource);
  const pk = def ? (Array.isArray(def.idField) ? def.idField[0]! : def.idField) : "id";
  return { pk, label: def?.titleField ?? pk };
}

/** One row -> `{ id, label, iconUrl }` for display in a cell/chip/picker, using the target resource's own field names. */
export interface RefResumo {
  id: string;
  label: string;
  iconUrl?: string;
}

function toResumo(resource: string, row: Row, field?: FieldDef): RefResumo {
  const { pk, label } = targetMeta(resource);
  const labelField = field?.refLabel ?? label;
  const iconField = field?.refIcon;
  const iconUrl = iconField ? row[iconField] : row.iconUrl;
  return {
    id: String(row[pk] ?? ""),
    label: String(row[labelField] ?? row[pk] ?? ""),
    iconUrl: typeof iconUrl === "string" && iconUrl ? iconUrl : undefined,
  };
}

/** GET /api/admin/<resource>?ids=1,2,3 — one request per distinct (resource, id-set), cached by react-query. */
export function refIdsQuery(resource: string, ids: string[]) {
  const key = [...new Set(ids)].filter(Boolean).sort().join(",");
  return queryOptions({
    queryKey: ["ref", resource, key],
    queryFn: async (): Promise<Row[]> => {
      if (!key) return [];
      const r = await api.get<{ items: Row[] }>(`/api/admin/${resource}?ids=${encodeURIComponent(key)}`);
      return r.items ?? [];
    },
    enabled: !!key,
    staleTime: 60_000,
  });
}

/** Every distinct id needed per target resource, across every ref/ref-multi column and every row of the current page. */
function idsByResource(fields: FieldDef[], rows: Row[]): Record<string, string[]> {
  const sets: Record<string, Set<string>> = {};
  for (const f of fields) {
    if (!isRefType(f.type) || !f.refResource) continue;
    const set = (sets[f.refResource] ??= new Set<string>());
    for (const row of rows) {
      const v = row[f.name];
      const vals = f.type === "ref-multi" ? (Array.isArray(v) ? v : []) : [v];
      for (const x of vals) if (x !== null && x !== undefined && x !== "" && Number(x) > 0) set.add(String(x));
    }
  }
  return Object.fromEntries(Object.entries(sets).map(([k, v]) => [k, [...v]]));
}

/**
 * Batched lookup for every `ref`/`ref-multi` column in `fields`, across all `rows` of the current page: exactly
 * one request per distinct target resource (not per row, not per cell). Call once per table render
 * (`ResourcePage`) and pass the result down to `Cell`.
 */
export function useRefRows(fields: FieldDef[], rows: Row[]): Map<string, Map<string, Row>> {
  const byResource = idsByResource(fields, rows);
  const resources = Object.keys(byResource);
  const results = useQueries({ queries: resources.map((r) => refIdsQuery(r, byResource[r]!)) });
  const out = new Map<string, Map<string, Row>>();
  resources.forEach((resource, i) => {
    const { pk } = targetMeta(resource);
    const data = (results[i]?.data as Row[] | undefined) ?? [];
    out.set(resource, new Map(data.map((r) => [String(r[pk]), r])));
  });
  return out;
}

/** `refRows` lookup for one field+value, already resolved to a display-ready `RefResumo` (or `null` if not found/empty). */
export function resumoFromBatch(refRows: Map<string, Map<string, Row>>, field: FieldDef, value: unknown): RefResumo | null {
  if (!field.refResource || value === null || value === undefined || value === "" || Number(value) <= 0) return null;
  const row = refRows.get(field.refResource)?.get(String(value));
  return row ? toResumo(field.refResource, row, field) : null;
}

/** Searches the target resource by name (reuses the resource's own `GET ?q=` list endpoint — no new route needed). */
export async function searchRef(resource: string, termo: string, limite = 20, field?: FieldDef): Promise<RefResumo[]> {
  const qs = new URLSearchParams({ page: "1", pageSize: String(limite) });
  if (termo.trim()) qs.set("q", termo.trim());
  const res = await api.get<{ items: Row[] }>(`/api/admin/${resource}?${qs}`);
  return (res.items ?? []).map((r) => toResumo(resource, r, field));
}

/** Per-id cache for the FORM's "current value" preview (single row, not a table — batching doesn't apply here). */
const singleCache = new Map<string, Map<string, Promise<RefResumo | null>>>();
export function getRefCached(resource: string, id: unknown, field?: FieldDef): Promise<RefResumo | null> {
  if (id === null || id === undefined || id === "" || Number(id) <= 0) return Promise.resolve(null);
  const key = String(id);
  const cache = singleCache.get(resource) ?? new Map<string, Promise<RefResumo | null>>();
  singleCache.set(resource, cache);
  let p = cache.get(key);
  if (!p) {
    p = api
      .get<Row>(`/api/admin/${resource}/${encodeURIComponent(key)}`)
      .then((r) => toResumo(resource, r, field))
      .catch(() => null);
    cache.set(key, p);
  }
  return p;
}
