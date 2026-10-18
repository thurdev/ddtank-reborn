import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Badge } from "@ddtank/ui";
import { ExternalLink } from "lucide-react";
import { getItemCached, type ItemResumo } from "@/resources/items";
import { useI18n, useText } from "@/i18n";
import { resumoFromBatch, type RefResumo } from "./refs";
import type { FieldDef, Row } from "./types";

/** Ícone+nome de um item na célula da lista; usa o cache compartilhado (`getItemCached`) e aceita sentinelas (`pickerSpecial`). */
function ItemCellSingle({ templateId, field }: { templateId: number; field: FieldDef }) {
  const text = useText();
  const [item, setItem] = useState<ItemResumo | null>(null);
  const special = field.pickerSpecial?.find((o) => Number(o.value) === templateId);
  useEffect(() => {
    if (special) return;
    let vivo = true;
    void getItemCached(templateId).then((r) => {
      if (vivo) setItem(r);
    });
    return () => {
      vivo = false;
    };
  }, [templateId, special]);
  const nome = special ? text(special.label) : item?.Name;
  return (
    <span className="flex items-center gap-2">
      {item?.iconUrl ? (
        <img src={item.iconUrl} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} className="size-7 shrink-0 rounded-md border border-line bg-night-deep object-contain" />
      ) : (
        <span className="grid size-7 shrink-0 place-items-center rounded-md border border-line bg-night-deep font-mono text-[10px] text-muted">#</span>
      )}
      <span className="truncate font-mono text-xs text-ink">{nome ?? `#${templateId}`}</span>
    </span>
  );
}

/** Ícones em linha p/ múltiplos itens (ex. equipamentos de bot), com +N de overflow. */
function ItemCellMulti({ templateIds }: { templateIds: number[] }) {
  const [itens, setItens] = useState<Record<number, ItemResumo | null>>({});
  const mostrados = templateIds.slice(0, 4);
  useEffect(() => {
    let vivo = true;
    void Promise.all(mostrados.map(async (tid) => [tid, await getItemCached(tid)] as const)).then((pares) => {
      if (vivo) setItens(Object.fromEntries(pares));
    });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrados.join(",")]);
  if (!templateIds.length) return <span className="text-muted/50">—</span>;
  return (
    <span className="flex items-center gap-1">
      {mostrados.map((tid) => {
        const item = itens[tid];
        return item?.iconUrl ? (
          <img key={tid} src={item.iconUrl} alt={item.Name} title={item.Name} loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} className="size-7 shrink-0 rounded-md border border-line bg-night-deep object-contain" />
        ) : (
          <span key={tid} title={item?.Name ?? `#${tid}`} className="grid size-7 shrink-0 place-items-center rounded-md border border-line bg-night-deep font-mono text-[10px] text-muted">
            #
          </span>
        );
      })}
      {templateIds.length > 4 && <span className="text-xs text-muted">+{templateIds.length - 4}</span>}
    </span>
  );
}

/** Nome+ícone de um "ref" (FK pra outro resource); clique abre o registro alvo (`/<resource>?edit=<id>`). */
function RefChip({ resumo, onOpen }: { resumo: RefResumo; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="group flex items-center gap-1.5 rounded-md text-left hover:underline">
      {resumo.iconUrl ? (
        <img src={resumo.iconUrl} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} className="size-6 shrink-0 rounded-md border border-line bg-night-deep object-contain" />
      ) : null}
      <span className="truncate text-ink">{resumo.label}</span>
      <ExternalLink className="size-3 shrink-0 text-muted opacity-0 group-hover:opacity-100" />
    </button>
  );
}

/** Célula de um `ref` único: resolvido a partir do mapa já buscado em lote pelo `ResourcePage` (1 request/página). */
function RefCellSingle({ field, value, refRows }: { field: FieldDef; value: unknown; refRows: Map<string, Map<string, Row>> }) {
  const navigate = useNavigate();
  const resumo = resumoFromBatch(refRows, field, value);
  if (!resumo) return <span className="text-muted/50">{Number(value) > 0 ? `#${String(value)} —` : "—"}</span>;
  return <RefChip resumo={resumo} onOpen={() => void navigate({ to: "/$resource", params: { resource: field.refResource! }, search: { edit: resumo.id } })} />;
}

/** Célula de `ref-multi`: mesmos dados em lote, até 4 chips + "+N". */
function RefCellMulti({ field, ids, refRows }: { field: FieldDef; ids: string[]; refRows: Map<string, Map<string, Row>> }) {
  const navigate = useNavigate();
  const mostrados = ids.slice(0, 4);
  if (!mostrados.length) return <span className="text-muted/50">—</span>;
  return (
    <span className="flex flex-wrap items-center gap-2">
      {mostrados.map((id) => {
        const resumo = resumoFromBatch(refRows, field, id);
        return resumo ? (
          <RefChip key={id} resumo={resumo} onOpen={() => void navigate({ to: "/$resource", params: { resource: field.refResource! }, search: { edit: resumo.id } })} />
        ) : (
          <span key={id} className="font-mono text-xs text-muted">#{id}</span>
        );
      })}
      {ids.length > 4 && <span className="text-xs text-muted">+{ids.length - 4}</span>}
    </span>
  );
}

/** Read-only table cell for a field, chosen by type. `refRows`: batched lookup data for `ref`/`ref-multi` columns (see `refs.ts`). */
export function Cell({ field: f, row, refRows }: { field: FieldDef; row: Row; refRows?: Map<string, Map<string, Row>> }) {
  const { t, locale } = useI18n();
  const text = useText();
  const v = row[f.name];
  if (f.render) return <>{f.render(v, row)}</>;
  if ((f.type as string) === "item-picker-multi") {
    const ids = Array.isArray(v) ? (v as unknown[]).map(Number).filter(Number.isFinite) : [];
    return <ItemCellMulti templateIds={ids} />;
  }
  if (f.type === "ref-multi" && refRows) {
    const ids = Array.isArray(v) ? (v as unknown[]).map(String) : [];
    return <RefCellMulti field={f} ids={ids} refRows={refRows} />;
  }
  if (f.type === "ref" && refRows) return <RefCellSingle field={f} value={v} refRows={refRows} />;
  if (v === null || v === undefined || v === "") return <span className="text-muted/50">—</span>;
  if ((f.type as string) === "item-picker") return <ItemCellSingle templateId={Number(v)} field={f} />;

  switch (f.type) {
    case "boolean":
      return <Badge tone={v ? "mint" : "neutral"}>{v ? t("crud.yes") : t("crud.no")}</Badge>;
    case "select": {
      const o = f.options?.find((x) => String(x.value) === String(v));
      return <Badge tone={o?.tone ?? "neutral"}>{o ? text(o.label) : String(v)}</Badge>;
    }
    case "number":
      // Identifiers (TemplateID, UserID, QuestID...) are shown raw, without thousands separators.
      return (
        <span className="font-mono tabular-nums">{/(ID|Id)$/.test(f.name) ? String(v) : Number(v).toLocaleString(locale)}</span>
      );
    case "date":
    case "datetime": {
      const d = new Date(String(v));
      if (Number.isNaN(d.getTime())) return <>{String(v)}</>;
      return (
        <time dateTime={d.toISOString()} className="whitespace-nowrap text-muted">
          {new Intl.DateTimeFormat(locale, f.type === "date" ? { dateStyle: "short" } : { dateStyle: "short", timeStyle: "short" }).format(d)}
        </time>
      );
    }
    case "image":
      return <img src={String(v)} alt="" className="size-9 rounded-lg border border-line bg-night-deep object-contain" />;
    case "tags": {
      const arr = Array.isArray(v) ? v : [];
      return (
        <span className="flex max-w-64 flex-wrap gap-1">
          {arr.slice(0, 4).map((x) => (
            <span key={String(x)} className="rounded-md bg-panel-2 px-1.5 font-mono text-xs">
              {String(x)}
            </span>
          ))}
          {arr.length > 4 && <span className="text-xs text-muted">+{arr.length - 4}</span>}
        </span>
      );
    }
    case "json":
      return <code className="block max-w-64 truncate font-mono text-xs text-muted">{JSON.stringify(v)}</code>;
    case "color":
      return (
        <span className="inline-flex items-center gap-2 font-mono text-xs">
          <span className="size-4 rounded border border-line" style={{ background: String(v) }} />
          {String(v)}
        </span>
      );
    case "password":
      return <span className="text-muted">••••</span>;
    case "textarea":
      return <span className="line-clamp-2 max-w-md text-muted">{String(v)}</span>;
    default:
      return <span className="max-w-xs truncate">{String(v)}</span>;
  }
}
