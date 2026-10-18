import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ListParams, ListResult, ResourceDef, Row } from "./types";

export const resourcePath = (def: ResourceDef, id?: unknown, suffix?: string) =>
  `/api/admin/${def.name}` + (id !== undefined ? `/${encodeURIComponent(String(id))}` : "") + (suffix ? `/${suffix}` : "");

export function listQuery(def: ResourceDef, p: ListParams) {
  const qs = new URLSearchParams({ page: String(p.page), pageSize: String(p.pageSize) });
  if (p.q) qs.set("q", p.q);
  if (p.sort) qs.set("sort", p.sort);
  for (const [k, v] of Object.entries(p.extra ?? {})) if (v) qs.set(k, v);
  return queryOptions({
    queryKey: ["resource", def.name, "list", p],
    queryFn: () => api.get<ListResult>(`${resourcePath(def)}?${qs}`),
    // Plain `keepPreviousData` reuses whatever query ran right before this one as placeholder data, even across
    // a resource switch (e.g. clicking a `ref` chip from guild-members to players) — briefly rendering the OLD
    // resource's rows under the NEW resource's columns/key field. Harmless-looking, but their ids can collide
    // (duplicate React keys) and it's just wrong data on screen for a frame. Only reuse it within the SAME resource.
    placeholderData: (prev, prevQuery) => (prevQuery?.queryKey[1] === def.name ? prev : undefined),
  });
}

export function getQuery(def: ResourceDef, id: unknown) {
  return queryOptions({
    queryKey: ["resource", def.name, "get", id],
    queryFn: () => api.get<Row>(resourcePath(def, id)),
  });
}

export function useResourceMutations(def: ResourceDef) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["resource", def.name] });
  return {
    create: useMutation({ mutationFn: (body: Row) => api.post<Row>(resourcePath(def), body), onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: unknown; body: Row }) => api.patch<Row>(resourcePath(def, id), body),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: (id: unknown) => api.del<void>(resourcePath(def, id)), onSuccess: invalidate }),
    action: useMutation({
      mutationFn: ({ id, path, body }: { id: unknown; path: string; body?: Row }) =>
        api.post<unknown>(resourcePath(def, id, path), body ?? {}),
      onSuccess: invalidate,
    }),
  };
}
