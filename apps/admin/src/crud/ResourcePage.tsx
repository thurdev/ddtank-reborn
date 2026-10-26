import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ApiError,
  Badge,
  Button,
  Dialog,
  DialogContent,
  EmptyState,
  Input,
  NativeSelect,
  PageHeader,
  Skeleton,
  Spinner,
  Switch,
  TBody,
  THead,
  Table,
  Tabs,
  TabsList,
  TabsTrigger,
  Td,
  Th,
  Tr,
  cn,
} from "@ddtank/ui";
import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Filter,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Search,
  SquarePen,
  Trash2,
} from "lucide-react";
import { useI18n, useText } from "@/i18n";
import { ItemIconGenerator } from "@/resources/ItemIconGenerator";
import { getQuery, listQuery, resourcePath, useResourceMutations } from "./api";
import { api } from "@/lib/api";
import { addRecent } from "@/lib/recent";
import { Cell } from "./Cell";
import { buildColFilterParams, ColumnFilterBar, FILTERABLE_TYPES } from "./ColumnFilters";
import { FieldInput } from "./FieldInput";
import { useRefRows } from "./refs";
import { SchemaForm } from "./SchemaForm";
import { defaultFor } from "./schema";
import { caps, rowId, type FieldDef, type ResourceDef, type Row, type RowAction } from "./types";
import { loadViews, loadVisibleCols, saveViews, saveVisibleCols, type ColFilterValue, type SavedView } from "./viewPrefs";

/** Short random id for a new saved view (localStorage only, no collisions across viewers needed). */
const newViewId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Fields eligible for the bulk-edit dialog: simple scalar types only (no pickers/relations/arrays). */
const bulkEditableTypes = new Set<FieldDef["type"]>(["boolean", "select", "number", "text"]);

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

const errMsg = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

type DialogState =
  | { kind: "create" }
  | { kind: "edit"; row: Row }
  | { kind: "delete"; row: Row }
  | { kind: "action"; row: Row; action: RowAction }
  | { kind: "bulk-delete" }
  | { kind: "bulk-edit" }
  | { kind: "columns" }
  | { kind: "views" }
  | null;

/** Bulk-edit body: pick one simple field, set a value, PATCH it into every selected row. */
function BulkEditBody({ def, ids, onDone }: { def: ResourceDef; ids: string[]; onDone: () => void }) {
  const { t } = useI18n();
  const text = useText();
  const options = def.fields.filter((f) => f.list && !f.readOnly && bulkEditableTypes.has(f.type));
  const [fieldName, setFieldName] = useState(options[0]?.name ?? "");
  const field = options.find((f) => f.name === fieldName);
  const [value, setValue] = useState<unknown>(field ? defaultFor(field) : null);
  const { update } = useResourceMutations(def);
  const [busy, setBusy] = useState(false);

  if (!options.length) return <p className="text-sm text-muted">{t("crud.bulkEditNone")}</p>;

  const run = async () => {
    setBusy(true);
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        await update.mutateAsync({ id, body: { [fieldName]: value } });
        ok++;
      } catch {
        fail++;
      }
    }
    setBusy(false);
    if (fail) toast.error(t("crud.bulkEditPartial", { ok, fail }));
    else toast.success(t("crud.bulkEditDone", { n: ok }));
    onDone();
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t("crud.bulkEditLead", { n: ids.length })}</p>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">{t("crud.bulkEditField")}</label>
        <NativeSelect
          value={fieldName}
          onChange={(e) => {
            setFieldName(e.target.value);
            const f = options.find((x) => x.name === e.target.value);
            setValue(f ? defaultFor(f) : null);
          }}
        >
          {options.map((f) => (
            <option key={f.name} value={f.name}>
              {text(f.label)}
            </option>
          ))}
        </NativeSelect>
      </div>
      {field && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">{t("crud.bulkEditValue")}</label>
          <FieldInput field={field} id="bulk-edit-value" value={value} onChange={setValue} mode="edit" />
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone} disabled={busy}>
          {t("crud.cancel")}
        </Button>
        <Button onClick={() => void run()} disabled={busy || !fieldName}>
          {busy ? <Spinner className="size-4" /> : <SquarePen />} {t("crud.bulkEditApply", { n: ids.length })}
        </Button>
      </div>
    </div>
  );
}

/** "Visões" dialog body: name + save the current column set/filters/sort as a new view, list + delete existing ones. */
function ViewsDialogBody({
  views,
  onSave,
  onDelete,
  onDone,
}: {
  views: SavedView[];
  onSave: (name: string) => void;
  onDelete: (id: string) => void;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("crud.viewsNamePlaceholder")}
          aria-label={t("crud.viewsNamePlaceholder")}
        />
        <Button
          disabled={!name.trim()}
          onClick={() => {
            onSave(name.trim());
            setName("");
          }}
        >
          <Bookmark /> {t("crud.viewsSave")}
        </Button>
      </div>
      {views.length === 0 ? (
        <p className="text-sm text-muted">{t("crud.viewsEmpty")}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {views.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-2 rounded-lg border border-line/60 px-3 py-2 text-sm">
              <span className="truncate">{v.name}</span>
              <Button size="icon" variant="ghost" className="text-coral" aria-label={t("crud.delete")} onClick={() => onDelete(v.id)}>
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-end">
        <Button variant="ghost" onClick={onDone}>
          {t("crud.done")}
        </Button>
      </div>
    </div>
  );
}

function EditDialogBody({ def, row, onDone }: { def: ResourceDef; row: Row; onDone: () => void }) {
  const { t } = useI18n();
  const id = rowId(def, row);
  const { data, isLoading } = useQuery({ ...getQuery(def, id), placeholderData: row });
  const { update } = useResourceMutations(def);
  if (isLoading && !data) return <Skeleton className="h-64" />;
  const current = data ?? row;
  return (
    <div className="flex flex-col gap-6">
      {def.name === "items" && <ItemIconGenerator templateId={Number(current.TemplateID)} iconUrlAtual={String(current.iconUrl ?? "")} />}
      <SchemaForm
        fields={def.fields}
        mode="edit"
        initial={current}
        onCancel={onDone}
        onSubmit={async (body) => {
          try {
            await update.mutateAsync({ id, body });
            toast.success(t("crud.saved"));
            onDone();
          } catch (e) {
            toast.error(errMsg(e, t("common.error")));
          }
        }}
      />
    </div>
  );
}

export interface ResourcePageProps {
  def: ResourceDef;
  /** Render without the page header (when embedded in a custom page). */
  embedded?: boolean;
  headerActions?: ReactNode;
  /** id to open the edit dialog for on mount (from `?edit=`, e.g. clicking a `ref` cell on another resource). */
  initialEditId?: string;
}

/** Generic list + create/edit/delete + row actions for a ResourceDef. */
export function ResourcePage({ def, embedded, headerActions, initialEditId }: ResourcePageProps) {
  const { t } = useI18n();
  const text = useText();
  const can = caps(def);
  const pageSize = def.pageSize ?? 20;

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<string | undefined>(def.defaultSort);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [view, setView] = useState<"table" | "grid">("table");
  /** Bulk edit/delete: row ids checked in the current page. Cleared whenever the page's rows change. */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  /** Visible columns (admin-ux-2): `null` = every `list` field (default), else the set of field names to show.
   *  Persisted per resource in localStorage (`crud/viewPrefs.ts`), never sent to the server. */
  const [visibleColNames, setVisibleColNames] = useState<string[] | null>(() => loadVisibleCols(def.name));
  /** Per-column filters (admin-ux-2): see `crud/ColumnFilters.tsx`. Turned into `cf_*` query params below. */
  const [colFilters, setColFilters] = useState<Record<string, ColFilterValue>>({});
  const [showFilters, setShowFilters] = useState(false);
  /** Saved views (admin-ux-2): named column set + filters + sort, per resource, localStorage-only. */
  const [views, setViews] = useState<SavedView[]>(() => loadViews(def.name));
  const [viewId, setViewId] = useState("");
  const dq = useDebounced(q);
  const filtersKey = JSON.stringify({ filters, colFilters });

  // Reset paging when switching resources or searching.
  useEffect(() => {
    setQ("");
    setPage(1);
    setSort(def.defaultSort);
    setDialog(null);
    setFilters({});
    setView("table");
    setSelected(new Set());
    setVisibleColNames(loadVisibleCols(def.name));
    setColFilters({});
    setShowFilters(false);
    setViews(loadViews(def.name));
    setViewId("");
  }, [def]);
  useEffect(() => setPage(1), [dq]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setPage(1), [filtersKey, view]);
  useEffect(() => setSelected(new Set()), [page, dq, filtersKey, sort]);

  // Deep link from a `ref` cell clicked on another resource (`/<resource>?edit=<id>`): fetch that one row and
  // open its edit dialog, then drop `edit` from the URL so a refresh/back doesn't reopen it.
  useEffect(() => {
    if (!initialEditId) return;
    let vivo = true;
    void api.get<Row>(resourcePath(def, initialEditId)).then(
      (row) => {
        if (vivo) {
          setDialog({ kind: "edit", row });
          addRecent({ resource: def.name, id: rowId(def, row), label: rowTitle(row) || singular, resourceLabel: text(def.label) });
        }
      },
      () => {
        if (vivo) toast.error(t("crud.loadError"));
      },
    );
    const url = new URL(window.location.href);
    url.searchParams.delete("edit");
    window.history.replaceState(window.history.state, "", url.pathname + url.search);
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def, initialEditId]);

  const colFilterParams = useMemo(() => buildColFilterParams(colFilters), [colFilters]);
  const effectivePageSize = view === "grid" ? def.gridView?.pageSize ?? 120 : pageSize;
  const params = { q: dq || undefined, page, pageSize: effectivePageSize, sort, extra: { ...filters, ...colFilterParams } };
  const { data, isLoading, isFetching, error, refetch } = useQuery(listQuery(def, params));
  const m = useResourceMutations(def);

  const allColumns = useMemo(() => def.fields.filter((f) => f.list), [def]);
  /** Columns actually rendered, after the "Colunas" picker (admin-ux-2). `null` prefs = show every column. */
  const columns = useMemo(
    () => (visibleColNames ? allColumns.filter((f) => visibleColNames.includes(f.name)) : allColumns),
    [allColumns, visibleColNames],
  );
  const filterableFields = useMemo(() => allColumns.filter((f) => FILTERABLE_TYPES.has(f.type)), [allColumns]);
  const refRows = useRefRows(columns, data?.items ?? []);
  const singular = text(def.singular);
  const rowTitle = (row: Row) => (def.titleField ? String(row[def.titleField] ?? "") : rowId(def, row));
  const hasRowButtons = can.update || can.delete || (def.rowActions?.length ?? 0) > 0;
  const canBulk = view === "table" && (can.update || can.delete);
  const pageIds = useMemo(() => (data?.items ?? []).map((row) => rowId(def, row)), [def, data]);

  const toggleSort = (name: string) => {
    setSort((s) => (s === name ? `-${name}` : s === `-${name}` ? undefined : name));
  };

  const total = data?.total ?? 0;
  const from = total ? (page - 1) * effectivePageSize + 1 : 0;
  const to = Math.min(total, page * effectivePageSize);
  const lastPage = Math.max(1, Math.ceil(total / effectivePageSize));

  const setFilter = (name: string, value: string) =>
    setFilters((s) => {
      const next = { ...s };
      if (value) next[name] = value;
      else delete next[name];
      return next;
    });

  const setColFilter = (name: string, value: ColFilterValue | null) =>
    setColFilters((s) => {
      const next = { ...s };
      if (value) next[name] = value;
      else delete next[name];
      return next;
    });

  /** Toggle one column's visibility, never letting the last visible column be unchecked. */
  const toggleCol = (name: string) => {
    const base = visibleColNames ?? allColumns.map((f) => f.name);
    const isVisible = base.includes(name);
    if (isVisible && base.length <= 1) return;
    const next = isVisible ? base.filter((n) => n !== name) : [...base, name];
    const normalized = next.length === allColumns.length ? null : next;
    setVisibleColNames(normalized);
    saveVisibleCols(def.name, normalized);
  };
  const resetCols = () => {
    setVisibleColNames(null);
    saveVisibleCols(def.name, null);
  };

  const applyView = (v: SavedView | null) => {
    setViewId(v?.id ?? "");
    setVisibleColNames(v?.columns ?? null);
    setColFilters(v?.colFilters ?? {});
    setSort(v?.sort ?? def.defaultSort);
    setShowFilters(!!v && Object.keys(v.colFilters).length > 0);
  };
  const saveCurrentView = (name: string) => {
    const nv: SavedView = { id: newViewId(), name, columns: visibleColNames, colFilters, sort };
    const next = [...views, nv];
    setViews(next);
    saveViews(def.name, next);
    setViewId(nv.id);
    toast.success(t("crud.viewsSaved", { name }));
  };
  const deleteView = (id: string) => {
    const next = views.filter((v) => v.id !== id);
    setViews(next);
    saveViews(def.name, next);
    if (viewId === id) setViewId("");
    toast.success(t("crud.viewsDeleted"));
  };

  const header = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={text(def.searchPlaceholder) || t("crud.search")}
          className="w-64 pl-9"
          aria-label={t("crud.search")}
        />
      </div>
      {def.filters?.map((f) =>
        f.type === "select" ? (
          <NativeSelect
            key={f.name}
            value={filters[f.name] ?? ""}
            onChange={(e) => setFilter(f.name, e.target.value)}
            aria-label={text(f.label)}
            className="w-auto"
          >
            <option value="">{text(f.label)}</option>
            {(f.options ?? []).map((o) => (
              <option key={String(o.value)} value={String(o.value)}>
                {text(o.label)}
              </option>
            ))}
          </NativeSelect>
        ) : (
          <Input
            key={f.name}
            type="number"
            value={filters[f.name] ?? ""}
            onChange={(e) => setFilter(f.name, e.target.value)}
            placeholder={f.placeholder ?? text(f.label)}
            aria-label={text(f.label)}
            className="w-28 font-mono"
          />
        ),
      )}
      {isFetching && !isLoading && <Spinner className="size-4" />}
      {def.gridView && (
        <Tabs value={view} onValueChange={(v) => setView(v as "table" | "grid")}>
          <TabsList>
            <TabsTrigger value="table" aria-label={t("crud.viewTable")}>
              <List className="size-4" />
            </TabsTrigger>
            <TabsTrigger value="grid" aria-label={t("crud.viewGrid")}>
              <LayoutGrid className="size-4" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}
      {views.length > 0 && (
        <NativeSelect
          value={viewId}
          aria-label={t("crud.viewsApplyLabel")}
          className="w-40"
          onChange={(e) => applyView(views.find((v) => v.id === e.target.value) ?? null)}
        >
          <option value="">{t("crud.viewsNone")}</option>
          {views.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </NativeSelect>
      )}
      <Button variant="secondary" size="sm" onClick={() => setDialog({ kind: "views" })} title={t("crud.viewsManage")}>
        <Bookmark className="size-4" /> {t("crud.views")}
      </Button>
      {filterableFields.length > 0 && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowFilters((s) => !s)}
          className={cn(Object.keys(colFilters).length > 0 && "border-sun text-sun")}
        >
          <Filter className="size-4" /> {t("crud.filters")}
          {Object.keys(colFilters).length > 0 && <Badge tone="sun">{Object.keys(colFilters).length}</Badge>}
        </Button>
      )}
      <Button variant="secondary" size="sm" onClick={() => setDialog({ kind: "columns" })}>
        <Columns3 className="size-4" /> {t("crud.columns")}
      </Button>
      {headerActions}
      {can.create && (
        <Button onClick={() => setDialog({ kind: "create" })}>
          <Plus /> {t("crud.new")}
        </Button>
      )}
    </div>
  );

  return (
    <div>
      {embedded ? (
        <div className="mb-4 flex justify-end">{header}</div>
      ) : (
        <PageHeader title={text(def.label)} description={text(def.description)} actions={header} />
      )}

      <div className="rounded-2xl border border-line bg-panel">
        {selected.size > 0 && (can.update || can.delete) && (
          <div className="flex items-center gap-2 border-b border-line bg-panel-2/60 px-4 py-2.5 text-sm">
            <CheckSquare className="size-4 text-sun" />
            <span>{t("crud.bulkSelected", { n: selected.size })}</span>
            <div className="ml-auto flex gap-2">
              {can.update && (
                <Button size="sm" variant="secondary" onClick={() => setDialog({ kind: "bulk-edit" })}>
                  <SquarePen /> {t("crud.bulkEdit")}
                </Button>
              )}
              {can.delete && (
                <Button size="sm" variant="danger" onClick={() => setDialog({ kind: "bulk-delete" })}>
                  <Trash2 /> {t("crud.bulkDelete")}
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                {t("crud.bulkClear")}
              </Button>
            </div>
          </div>
        )}
        {showFilters && <ColumnFilterBar fields={filterableFields} values={colFilters} onChange={setColFilter} />}
        {error ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-coral">{t("crud.loadError")}</p>
            <p className="font-mono text-xs text-muted">{errMsg(error, "")}</p>
            <Button variant="secondary" onClick={() => void refetch()}>
              {t("crud.retry")}
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState title={t("crud.empty")} className="m-4 border-0">
            {t("crud.emptyHint")}
          </EmptyState>
        ) : view === "grid" && def.gridView ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-3 p-4">
            {data.items.map((row) => {
              const id = rowId(def, row);
              return (
                <div key={id} className="flex flex-col items-center gap-1 rounded-xl border border-line bg-night-deep/40 p-2">
                  <button
                    type="button"
                    title={`${rowTitle(row)} · #${String(row[Array.isArray(def.idField) ? def.idField[0]! : def.idField] ?? "")}`}
                    onClick={() => {
                      setDialog({ kind: "edit", row });
                      addRecent({ resource: def.name, id, label: rowTitle(row) || singular, resourceLabel: text(def.label) });
                    }}
                    className="flex w-full flex-col items-center gap-1 rounded-lg p-1 hover:bg-panel-2"
                  >
                    {def.gridView!.render(row)}
                  </button>
                  {!!def.rowActions?.length && (
                    <div className="flex flex-wrap justify-center gap-1">
                      {def.rowActions
                        .filter((a) => !a.visible || a.visible(row))
                        .map((a) => {
                          const Icon = a.icon;
                          return (
                            <Button
                              key={a.id}
                              size="icon"
                              variant="ghost"
                              aria-label={text(a.label)}
                              title={text(a.label)}
                              onClick={() => setDialog({ kind: "action", row, action: a })}
                            >
                              {Icon && <Icon className="size-4" />}
                            </Button>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <Table>
            {/* Sticky header (admin-ux-2): `sticky` on each `Th` (not the `thead`) for cross-browser support,
                pinned just under AdminLayout's own sticky top bar (`h-14` there -> `top-14` here). An opaque
                `bg-panel` is required or the scrolling body would show through the sticky cells. */}
            <THead>
              <Tr className="hover:bg-transparent">
                {canBulk && (
                  <Th className="sticky top-14 z-20 w-10 bg-panel">
                    <input
                      type="checkbox"
                      aria-label={t("crud.bulkSelectAll")}
                      checked={selected.size > 0 && pageIds.every((i) => selected.has(i))}
                      onChange={(e) => setSelected(e.target.checked ? new Set(pageIds) : new Set())}
                      className="size-4 accent-sun"
                    />
                  </Th>
                )}
                {columns.map((f) => {
                  const active = sort === f.name ? "asc" : sort === `-${f.name}` ? "desc" : null;
                  return (
                    <Th
                      key={f.name}
                      className="sticky top-14 z-20 bg-panel"
                      aria-sort={active === "asc" ? "ascending" : active === "desc" ? "descending" : undefined}
                    >
                      {f.sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(f.name)}
                          className={cn("inline-flex items-center gap-1 uppercase hover:text-ink", active && "text-sun")}
                        >
                          {text(f.label)}
                          {active === "asc" && <ArrowUp className="size-3" />}
                          {active === "desc" && <ArrowDown className="size-3" />}
                        </button>
                      ) : (
                        text(f.label)
                      )}
                    </Th>
                  );
                })}
                {hasRowButtons && <Th className="sticky top-14 z-20 bg-panel text-right">{t("crud.actions")}</Th>}
              </Tr>
            </THead>
            <TBody>
              {data.items.map((row) => {
                const id = rowId(def, row);
                /**
                 * Clicking a row opens its edit record — except when the click lands on (or inside) an
                 * interactive control of the row itself: the bulk checkbox, an inline-toggle switch, a `ref`
                 * chip (navigates instead) or a row-action/edit/delete button. `closest()` on the event target
                 * covers all of those without needing `stopPropagation()` scattered across every cell. This is
                 * the piece a prior sticky-header attempt broke (see docs/plan/TASKS.md admin-ux-2) — covered by
                 * a component test (`ResourcePage.test.tsx`).
                 */
                const openRow = (e: MouseEvent) => {
                  if (!can.update) return;
                  if ((e.target as HTMLElement).closest('button, input, select, textarea, a, [role="button"]')) return;
                  setDialog({ kind: "edit", row });
                  addRecent({ resource: def.name, id, label: rowTitle(row) || singular, resourceLabel: text(def.label) });
                };
                return (
                  <Tr key={id} onClick={openRow} className={cn(can.update && "cursor-pointer")}>
                    {canBulk && (
                      <Td>
                        <input
                          type="checkbox"
                          aria-label={t("crud.bulkSelectRow", { name: rowTitle(row) || id })}
                          checked={selected.has(id)}
                          onChange={(e) =>
                            setSelected((s) => {
                              const next = new Set(s);
                              if (e.target.checked) next.add(id);
                              else next.delete(id);
                              return next;
                            })
                          }
                          className="size-4 accent-sun"
                        />
                      </Td>
                    )}
                    {columns.map((f) => (
                      <Td key={f.name}>
                        {f.type === "boolean" && f.inlineToggle && can.update ? (
                          <Switch
                            checked={!!row[f.name]}
                            aria-label={text(f.label)}
                            onCheckedChange={(checked) =>
                              m.update.mutate(
                                { id, body: { [f.name]: checked } },
                                { onError: (e) => toast.error(errMsg(e, t("common.error"))) },
                              )
                            }
                          />
                        ) : (
                          <Cell field={f} row={row} refRows={refRows} />
                        )}
                      </Td>
                    ))}
                    {hasRowButtons && (
                      <Td className="text-right">
                        <div className="inline-flex gap-1">
                          {def.rowActions
                            ?.filter((a) => !a.visible || a.visible(row))
                            .map((a) => {
                              const Icon = a.icon;
                              return (
                                <Button
                                  key={a.id}
                                  size="sm"
                                  variant={a.tone === "danger" ? "danger" : "secondary"}
                                  onClick={() => setDialog({ kind: "action", row, action: a })}
                                >
                                  {Icon && <Icon />} {text(a.label)}
                                </Button>
                              );
                            })}
                          {can.update && (
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label={t("crud.edit")}
                              onClick={() => {
                                setDialog({ kind: "edit", row });
                                addRecent({ resource: def.name, id, label: rowTitle(row) || singular, resourceLabel: text(def.label) });
                              }}
                            >
                              <Pencil />
                            </Button>
                          )}
                          {can.delete && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-coral"
                              aria-label={t("crud.delete")}
                              onClick={() => setDialog({ kind: "delete", row })}
                            >
                              <Trash2 />
                            </Button>
                          )}
                        </div>
                      </Td>
                    )}
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}

        {total > 0 && (
          <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-3 text-sm text-muted">
            <span>{t("crud.range", { from, to, total })}</span>
            <div className="flex gap-1">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft /> {t("crud.prev")}
              </Button>
              <Button size="sm" variant="secondary" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>
                {t("crud.next")} <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        {dialog?.kind === "create" && (
          <DialogContent title={t("crud.newTitle", { name: singular })} size="lg">
            <SchemaForm
              fields={def.fields}
              mode="create"
              onCancel={() => setDialog(null)}
              onSubmit={async (body) => {
                try {
                  await m.create.mutateAsync(body);
                  toast.success(t("crud.created"));
                  setDialog(null);
                } catch (e) {
                  toast.error(errMsg(e, t("common.error")));
                }
              }}
            />
          </DialogContent>
        )}
        {dialog?.kind === "edit" && (
          <DialogContent title={t("crud.editTitle", { name: rowTitle(dialog.row) || singular })} size="lg">
            <EditDialogBody def={def} row={dialog.row} onDone={() => setDialog(null)} />
          </DialogContent>
        )}
        {dialog?.kind === "delete" && (
          <DialogContent title={t("crud.deleteTitle", { name: rowTitle(dialog.row) })} description={t("crud.deleteBody")}>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDialog(null)}>
                {t("crud.cancel")}
              </Button>
              <Button
                variant="danger"
                disabled={m.remove.isPending}
                onClick={async () => {
                  try {
                    await m.remove.mutateAsync(rowId(def, dialog.row));
                    toast.success(t("crud.deleted"));
                    setDialog(null);
                  } catch (e) {
                    toast.error(errMsg(e, t("common.error")));
                  }
                }}
              >
                <Trash2 /> {t("crud.delete")}
              </Button>
            </div>
          </DialogContent>
        )}
        {dialog?.kind === "bulk-delete" && (
          <DialogContent title={t("crud.bulkDeleteTitle", { n: selected.size })} description={t("crud.deleteBody")}>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDialog(null)}>
                {t("crud.cancel")}
              </Button>
              <Button
                variant="danger"
                disabled={m.remove.isPending}
                onClick={async () => {
                  const ids = [...selected];
                  let ok = 0;
                  let fail = 0;
                  for (const id of ids) {
                    try {
                      await m.remove.mutateAsync(id);
                      ok++;
                    } catch {
                      fail++;
                    }
                  }
                  if (fail) toast.error(t("crud.bulkDeletePartial", { ok, fail }));
                  else toast.success(t("crud.bulkDeleteDone", { n: ok }));
                  setSelected(new Set());
                  setDialog(null);
                }}
              >
                <Trash2 /> {t("crud.bulkDelete")}
              </Button>
            </div>
          </DialogContent>
        )}
        {dialog?.kind === "bulk-edit" && (
          <DialogContent title={t("crud.bulkEditTitle", { n: selected.size })} size="md">
            <BulkEditBody
              def={def}
              ids={[...selected]}
              onDone={() => {
                setSelected(new Set());
                setDialog(null);
              }}
            />
          </DialogContent>
        )}
        {dialog?.kind === "columns" && (
          <DialogContent title={t("crud.columns")} description={t("crud.columnsLead")} size="md">
            <div className="flex flex-col gap-4">
              <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
                {allColumns.map((f) => (
                  <li key={f.name}>
                    <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-panel-2">
                      <input type="checkbox" className="size-4 accent-sun" checked={columns.includes(f)} onChange={() => toggleCol(f.name)} />
                      {text(f.label)}
                    </label>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted">{t("crud.columnsMinHint")}</p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={resetCols}>
                  {t("crud.columnsReset")}
                </Button>
                <Button onClick={() => setDialog(null)}>{t("crud.done")}</Button>
              </div>
            </div>
          </DialogContent>
        )}
        {dialog?.kind === "views" && (
          <DialogContent title={t("crud.viewsManage")} size="md">
            <ViewsDialogBody views={views} onSave={saveCurrentView} onDelete={deleteView} onDone={() => setDialog(null)} />
          </DialogContent>
        )}
        {dialog?.kind === "action" && (
          <DialogContent
            title={`${text(dialog.action.label)} · ${rowTitle(dialog.row)}`}
            description={dialog.action.fields?.length ? undefined : text(dialog.action.confirm)}
            size={dialog.action.fields?.length ? "lg" : "md"}
          >
            {(() => {
              const { row, action } = dialog;
              const run = async (body?: Row) => {
                try {
                  await m.action.mutateAsync({ id: rowId(def, row), path: action.path, body });
                  toast.success(text(action.success) || t("crud.done"));
                  setDialog(null);
                } catch (e) {
                  toast.error(errMsg(e, t("common.error")));
                }
              };
              return action.fields?.length ? (
                <SchemaForm fields={action.fields} submitLabel={text(action.label)} onCancel={() => setDialog(null)} onSubmit={run} />
              ) : (
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setDialog(null)}>
                    {t("crud.cancel")}
                  </Button>
                  <Button variant={action.tone === "danger" ? "danger" : "primary"} onClick={() => void run()}>
                    {t("crud.confirm")}
                  </Button>
                </div>
              );
            })()}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
