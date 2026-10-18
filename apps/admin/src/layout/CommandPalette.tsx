import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, Spinner } from "@ddtank/ui";
import { Clock, CornerDownLeft, type LucideIcon } from "lucide-react";
import { useI18n, useText } from "@/i18n";
import { addRecent, getRecent, type RecentItem } from "@/lib/recent";
import { searchRef } from "@/crud/refs";
import { resourceByName } from "@/resources";
import { NAV } from "./nav";

/**
 * Global search (Ctrl+K / Cmd+K): go to any registered resource or custom page by name, jump straight to a
 * recently opened record, or search players/items/guilds by name (reuses the same `GET ?q=` list endpoint and
 * `?edit=<id>` deep link as the `ref` field's "click to open" — crud/refs.ts, crud/Cell.tsx).
 */
const QUICK_SEARCH_RESOURCES = ["players", "items", "guilds"];

interface Hit {
  kind: "nav" | "recent" | "record";
  key: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  onPick: () => void;
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n();
  const text = useText();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [recordHits, setRecordHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<RecentItem[]>([]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setRecordHits([]);
      setRecent(getRecent());
    }
  }, [open]);

  const goTo = (resource: string, id?: string) => {
    void navigate(id !== undefined ? { to: "/$resource", params: { resource }, search: { edit: id } } : { to: "/$resource", params: { resource } });
    onOpenChange(false);
  };

  const navHits: Hit[] = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return NAV.filter((n) => {
      const label = typeof n.label === "object" && "key" in n.label ? t(n.label.key) : text(n.label);
      return !needle || label.toLowerCase().includes(needle);
    }).map((n) => {
      const label = typeof n.label === "object" && "key" in n.label ? t(n.label.key) : text(n.label);
      return { kind: "nav" as const, key: n.to, title: label, icon: n.icon, onPick: () => { void navigate({ to: n.to }); onOpenChange(false); } };
    });
  }, [query, t, text, navigate, onOpenChange]);

  // Quick search across players/items/guilds by name — debounced, one request per resource per keystroke batch.
  useEffect(() => {
    const needle = query.trim();
    if (needle.length < 2) {
      setRecordHits([]);
      return;
    }
    let vivo = true;
    setLoading(true);
    const timer = setTimeout(() => {
      void Promise.all(QUICK_SEARCH_RESOURCES.map((r) => searchRef(r, needle, 5).then((rows) => rows.map((row) => ({ resource: r, row })))))
        .then((groups) => {
          if (!vivo) return;
          const hits: Hit[] = groups.flat().map(({ resource, row }) => ({
            kind: "record" as const,
            key: `${resource}:${row.id}`,
            title: row.label,
            subtitle: text(resourceByName.get(resource)?.label),
            icon: resourceByName.get(resource)?.icon,
            onPick: () => {
              addRecent({ resource, id: row.id, label: row.label, resourceLabel: text(resourceByName.get(resource)?.label) });
              goTo(resource, row.id);
            },
          }));
          setRecordHits(hits);
        })
        .finally(() => vivo && setLoading(false));
    }, 200);
    return () => {
      vivo = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const recentHits: Hit[] = query.trim()
    ? []
    : recent.map((r) => ({
        kind: "recent" as const,
        key: `${r.resource}:${r.id}`,
        title: r.label,
        subtitle: r.resourceLabel,
        icon: Clock,
        onPick: () => goTo(r.resource, r.id),
      }));

  const sections: { title: string; hits: Hit[] }[] = [
    { title: t("palette.recent"), hits: recentHits },
    { title: t("palette.records"), hits: recordHits },
    { title: t("palette.pages"), hits: navHits },
  ].filter((s) => s.hits.length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t("palette.title")} description={t("palette.lead")} size="lg">
        <div className="-mx-6 flex items-center gap-2 border-y border-line px-5 py-3">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("palette.placeholder")}
            className="flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted/60"
          />
          {loading && <Spinner className="size-4" />}
        </div>
        <div className="-mx-6 -mb-6 max-h-[60vh] overflow-y-auto p-2 pb-4">
          {sections.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted">{t("palette.empty")}</p>
          ) : (
            sections.map((s) => (
              <div key={s.title} className="mb-2">
                <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted/70">{s.title}</p>
                {s.hits.map((h) => {
                  const Icon = h.icon;
                  return (
                    <button
                      key={h.key}
                      type="button"
                      onClick={h.onPick}
                      className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-panel-2"
                    >
                      {Icon && <Icon className="size-4 shrink-0 text-muted" />}
                      <span className="min-w-0 flex-1 truncate text-sm text-ink">{h.title}</span>
                      {h.subtitle && <span className="shrink-0 text-xs text-muted">{h.subtitle}</span>}
                      <CornerDownLeft className="size-3.5 shrink-0 text-muted opacity-0 group-hover:opacity-100" />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
