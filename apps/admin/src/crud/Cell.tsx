import { Badge } from "@ddtank/ui";
import { useI18n, useText } from "@/i18n";
import type { FieldDef, Row } from "./types";

/** Read-only table cell for a field, chosen by type. */
export function Cell({ field: f, row }: { field: FieldDef; row: Row }) {
  const { t, locale } = useI18n();
  const text = useText();
  const v = row[f.name];
  if (f.render) return <>{f.render(v, row)}</>;
  if (v === null || v === undefined || v === "") return <span className="text-muted/50">—</span>;

  switch (f.type) {
    case "boolean":
      return <Badge tone={v ? "mint" : "neutral"}>{v ? t("crud.yes") : t("crud.no")}</Badge>;
    case "select": {
      const o = f.options?.find((x) => String(x.value) === String(v));
      return <Badge tone={o?.tone ?? "neutral"}>{o ? text(o.label) : String(v)}</Badge>;
    }
    case "number":
      return <span className="font-mono tabular-nums">{Number(v).toLocaleString(locale)}</span>;
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
