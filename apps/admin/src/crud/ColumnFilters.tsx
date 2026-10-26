import { useRef, useState } from "react";
import { Input, NativeSelect } from "@ddtank/ui";
import { X } from "lucide-react";
import { useI18n, useText } from "@/i18n";
import { searchRef, type RefResumo } from "./refs";
import type { ColFilterValue } from "./viewPrefs";
import type { FieldDef } from "./types";

/**
 * Per-column filter bar for `ResourcePage` (admin-ux-2): one control per filterable `list` field, rendered when
 * the "Filtros" toggle is on. Four kinds, picked from the field's `FieldType`:
 * - text/textarea -> contains (debounced text input)
 * - number -> min/max range (two number inputs)
 * - boolean -> tri-state select (any/yes/no)
 * - select -> exact match against the field's own `options`
 * - ref -> exact match against a target id, picked via a small search-as-you-type popup (reuses `searchRef`,
 *   the same batched-lookup search the `ref` form field already uses — no new endpoint)
 *
 * `onChange(name, value | null)`: `null` clears that column's filter. The resulting `Record<string, ColFilterValue>`
 * is turned into `cf_<field>` / `cf_<field>_min` / `cf_<field>_max` query params by `buildColFilterParams` below,
 * sent server-side the same way the existing `def.filters` extras are (see `ResourcePage.tsx` `params.extra`).
 */
export const FILTERABLE_TYPES = new Set<FieldDef["type"]>(["text", "textarea", "number", "boolean", "select", "ref"]);

function kindFor(type: FieldDef["type"]): ColFilterValue["kind"] {
  if (type === "number") return "number";
  if (type === "boolean") return "boolean";
  if (type === "select") return "select";
  if (type === "ref") return "ref";
  return "text";
}

function useDebouncedCallback(fn: (v: string) => void, ms: number) {
  const ref = useRef(fn);
  ref.current = fn;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (v: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => ref.current(v), ms);
  };
}

function RefFilterControl({ field, value, onChange }: { field: FieldDef; value?: ColFilterValue; onChange: (v: ColFilterValue | null) => void }) {
  const text = useText();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<RefResumo[]>([]);
  const search = useDebouncedCallback((q: string) => {
    if (!field.refResource) return;
    void searchRef(field.refResource, q, 8, field).then((r) => setOptions(r));
  }, 250);

  if (value?.value) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-night-deep/40 px-2.5 py-1.5 text-sm">
        <span className="truncate">{value.label || `#${value.value}`}</span>
        <button type="button" onClick={() => onChange(null)} aria-label="Limpar" className="text-muted hover:text-coral">
          <X className="size-3.5" />
        </button>
      </span>
    );
  }
  return (
    <div className="relative">
      <Input
        value={term}
        placeholder={text(field.label)}
        className="w-40"
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => {
          setTerm(e.target.value);
          search(e.target.value);
          setOpen(true);
        }}
      />
      {open && options.length > 0 && (
        <ul className="absolute left-0 top-full z-20 mt-1 max-h-48 w-56 overflow-y-auto rounded-xl border border-line bg-panel p-1 shadow-panel">
          {options.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-panel-2"
                onClick={() => {
                  onChange({ kind: "ref", value: o.id, label: o.label });
                  setTerm("");
                  setOpen(false);
                }}
              >
                {o.iconUrl && <img src={o.iconUrl} alt="" className="size-5 rounded border border-line object-contain" />}
                <span className="truncate">{o.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ColumnFilterBar({
  fields,
  values,
  onChange,
}: {
  fields: FieldDef[];
  values: Record<string, ColFilterValue>;
  onChange: (name: string, value: ColFilterValue | null) => void;
}) {
  const { t } = useI18n();
  const text = useText();
  if (!fields.length) return null;
  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-line bg-panel-2/40 px-4 py-3">
      {fields.map((f) => {
        const kind = kindFor(f.type);
        const v = values[f.name];
        if (kind === "number") {
          return (
            <div key={f.name} className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">{text(f.label)}</label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={v?.min ?? ""}
                  placeholder={t("crud.filterMin")}
                  className="w-20 font-mono"
                  aria-label={`${text(f.label)} ${t("crud.filterMin")}`}
                  onChange={(e) => {
                    const min = e.target.value;
                    const max = v?.max ?? "";
                    if (!min && !max) onChange(f.name, null);
                    else onChange(f.name, { kind: "number", min, max });
                  }}
                />
                <span className="text-muted">–</span>
                <Input
                  type="number"
                  value={v?.max ?? ""}
                  placeholder={t("crud.filterMax")}
                  className="w-20 font-mono"
                  aria-label={`${text(f.label)} ${t("crud.filterMax")}`}
                  onChange={(e) => {
                    const max = e.target.value;
                    const min = v?.min ?? "";
                    if (!min && !max) onChange(f.name, null);
                    else onChange(f.name, { kind: "number", min, max });
                  }}
                />
              </div>
            </div>
          );
        }
        if (kind === "boolean") {
          return (
            <div key={f.name} className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">{text(f.label)}</label>
              <NativeSelect
                value={v?.value ?? ""}
                aria-label={text(f.label)}
                className="w-28"
                onChange={(e) => (e.target.value ? onChange(f.name, { kind: "boolean", value: e.target.value }) : onChange(f.name, null))}
              >
                <option value="">{t("crud.filterAny")}</option>
                <option value="1">{t("crud.yes")}</option>
                <option value="0">{t("crud.no")}</option>
              </NativeSelect>
            </div>
          );
        }
        if (kind === "select") {
          return (
            <div key={f.name} className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">{text(f.label)}</label>
              <NativeSelect
                value={v?.value ?? ""}
                aria-label={text(f.label)}
                className="w-32"
                onChange={(e) => (e.target.value ? onChange(f.name, { kind: "select", value: e.target.value }) : onChange(f.name, null))}
              >
                <option value="">{t("crud.filterAny")}</option>
                {(f.options ?? []).map((o) => (
                  <option key={String(o.value)} value={String(o.value)}>
                    {text(o.label)}
                  </option>
                ))}
              </NativeSelect>
            </div>
          );
        }
        if (kind === "ref") {
          return (
            <div key={f.name} className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">{text(f.label)}</label>
              <RefFilterControl field={f} value={v} onChange={(nv) => onChange(f.name, nv)} />
            </div>
          );
        }
        return (
          <div key={f.name} className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">{text(f.label)}</label>
            <Input
              value={v?.value ?? ""}
              placeholder={text(f.label)}
              className="w-40"
              aria-label={text(f.label)}
              onChange={(e) => (e.target.value ? onChange(f.name, { kind: "text", value: e.target.value }) : onChange(f.name, null))}
            />
          </div>
        );
      })}
    </div>
  );
}

/** `ColFilterValue` map -> `cf_*` query params (see `apps/api/src/routes/admin-resources.ts` doc comment + the
 *  matching generic block in `apps/api/src/routes/admin.ts`'s list route, and the mock mirror in `mocks/handlers.ts`). */
export function buildColFilterParams(values: Record<string, ColFilterValue>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, v] of Object.entries(values)) {
    if (v.kind === "number") {
      if (v.min) out[`cf_${name}_min`] = v.min;
      if (v.max) out[`cf_${name}_max`] = v.max;
    } else if (v.value) {
      out[`cf_${name}`] = v.value;
    }
  }
  return out;
}
