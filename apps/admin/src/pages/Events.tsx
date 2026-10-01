import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, Card, PageHeader, Switch, Tabs, TabsContent, TabsList, TabsTrigger, cn } from "@ddtank/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { listQuery, useResourceMutations } from "@/crud/api";
import { ResourcePage } from "@/crud/ResourcePage";
import { events } from "@/resources/content";
import { useI18n } from "@/i18n";

/** Row of game."Active". */
interface EventRow {
  ActiveID: number;
  Title: string;
  Type: number;
  StartDate: string;
  EndDate: string;
  IsShow: boolean;
}

// Calendar chip color per Active.Type (identity only; the title is always shown).
const TYPE_COLORS = ["var(--color-sun)", "var(--color-mint)", "var(--color-sky)", "var(--color-grape)", "var(--color-coral)"];
const colorOf = (e: EventRow) => TYPE_COLORS[Math.abs(Number(e.Type) || 0) % TYPE_COLORS.length];

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function Calendar() {
  const { t, locale } = useI18n();
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const { data } = useQuery(listQuery(events, { page: 1, pageSize: 500, sort: "StartDate" }));
  const { update } = useResourceMutations(events);
  const rows = (data?.items ?? []) as unknown as EventRow[];

  const monthStart = cursor;
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);
  // Grid starts on Sunday of the first week.
  const gridStart = new Date(monthStart);
  gridStart.setDate(1 - monthStart.getDay());
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  const inMonth = rows.filter((e) => new Date(e.StartDate) <= monthEnd && new Date(e.EndDate) >= monthStart);
  const byDay = useMemo(() => {
    const m = new Map<string, EventRow[]>();
    for (const e of rows) {
      const s = startOfDay(new Date(e.StartDate));
      const end = startOfDay(new Date(e.EndDate));
      for (let d = new Date(s); d <= end; d.setDate(d.getDate() + 1)) {
        const k = dayKey(d);
        m.set(k, [...(m.get(k) ?? []), e]);
      }
    }
    return m;
  }, [rows]);

  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const monthFmtRaw = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  const monthFmt = { format: (d: Date) => { const s = monthFmtRaw.format(d); return s.charAt(0).toUpperCase() + s.slice(1); } };
  const rangeFmt = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" });
  const todayKey = dayKey(new Date());
  const shift = (n: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="font-display text-2xl">{monthFmt.format(cursor)}</h2>
          <div className="ml-auto flex gap-1">
            <Button size="icon" variant="secondary" aria-label="Mês anterior" onClick={() => shift(-1)}>
              <ChevronLeft />
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
              {t("events.today")}
            </Button>
            <Button size="icon" variant="secondary" aria-label="Próximo mês" onClick={() => shift(1)}>
              <ChevronRight />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs">
          {days.slice(0, 7).map((d) => (
            <div key={d.getDay()} className="px-2 py-1 font-semibold uppercase tracking-wider text-muted">
              {weekday.format(d)}
            </div>
          ))}
          {days.map((d) => {
            const k = dayKey(d);
            const list = byDay.get(k) ?? [];
            const outside = d.getMonth() !== cursor.getMonth();
            return (
              <div
                key={k}
                className={cn(
                  "min-h-24 rounded-xl border border-line/60 bg-night-deep/40 p-1.5",
                  outside && "opacity-40",
                  k === todayKey && "border-sun",
                )}
              >
                <div className={cn("mb-1 text-right font-mono", k === todayKey ? "text-sun" : "text-muted")}>{d.getDate()}</div>
                <div className="flex flex-col gap-0.5">
                  {list.slice(0, 3).map((e) => (
                    <span
                      key={e.ActiveID}
                      title={e.Title}
                      className={cn("truncate rounded-md px-1.5 py-0.5 font-semibold text-night-deep", !e.IsShow && "line-through opacity-50")}
                      style={{ background: colorOf(e) }}
                    >
                      {e.Title}
                    </span>
                  ))}
                  {list.length > 3 && <span className="px-1 text-muted">+{list.length - 3}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 font-display text-lg">{monthFmt.format(cursor)}</h2>
        <ul className="flex flex-col gap-2">
          {inMonth.length === 0 && <li className="text-sm text-muted">{t("crud.empty")}</li>}
          {inMonth.map((e) => {
            return (
              <li key={e.ActiveID} className="flex items-center gap-3 rounded-xl border border-line/60 p-3">
                <span className="size-3 shrink-0 rounded-full" style={{ background: colorOf(e) }} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{e.Title}</p>
                  <p className="text-xs text-muted">
                    {rangeFmt.format(new Date(e.StartDate))} – {rangeFmt.format(new Date(e.EndDate))}
                  </p>
                </div>
                <Switch
                  checked={e.IsShow}
                  aria-label={e.Title}
                  onCheckedChange={(IsShow) =>
                    update.mutate({ id: e.ActiveID, body: { IsShow } }, { onError: () => toast.error(t("common.error")) })
                  }
                />
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

export function EventsPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t("events.title")} description={t("events.lead")} />
      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">{t("events.calendar")}</TabsTrigger>
          <TabsTrigger value="table">{t("events.table")}</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar">
          <Calendar />
        </TabsContent>
        <TabsContent value="table">
          <ResourcePage def={events} embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
