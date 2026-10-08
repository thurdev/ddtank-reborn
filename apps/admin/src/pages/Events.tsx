/**
 * Página de eventos do admin (PT-BR).
 *
 * Salva de verdade via REST existente (`@/crud/api` + `defineResource`):
 * - `events` -> `PATCH/POST /api/admin/events` (calendário cria/edita/alterna `IsShow`).
 * - `scheduledEvents` -> `/api/admin/scheduled-events` (agendador).
 * - `eventAwards` -> `/api/admin/event-awards` (prêmios por `ActiveID`).
 * - `eventCodes` -> `/api/admin/event-codes` (códigos por `ActiveID`).
 * Sem mock, sem endpoint custom `/api/admin/events/status|start|stop|codes`.
 *
 * Como lê esse código (cada variável):
 * - `EventRow`: linha `game."Active"` (`ActiveID`, `Title`, `Type`, `StartDate`, `EndDate`, `IsShow`).
 * - `TYPE_COLORS`/`colorOf(e)`: cor do chip por `e.Type`.
 * - `dayKey(d)`: chave `ano-mês-dia` p/ agrupar; `startOfDay(d)`: zera hora.
 * - `Calendar`: `cursor`=mês visível, `rows`=eventos, `inMonth`=filtro mês, `byDay`=mapa dia->eventos.
 * - `dialog`: `null|create|edit` p/ `SchemaForm` de `events`; `create`=`POST`, `update`=`PATCH`.
 * - `SchedulerPanel`: `q`=query `scheduledEvents`, `m`=mutations; `toggle`=PATCH `enabled`.
 * - `AwardsPanel`: `activeId`=filtro/criação, `q`=query `eventAwards`, `m.create`=POST prêmio.
 * - `CodesPanel`: `activeId`=filtro/criação, `dialog`=aberto, `m.create`=POST código.
 * - `EventsPage`: abas; cada aba `ResourcePage embedded` = CRUD real do resource.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, Card, Dialog, DialogContent, Input, PageHeader, Switch, Tabs, TabsContent, TabsList, TabsTrigger, cn } from "@ddtank/ui";
import { ChevronLeft, ChevronRight, Pencil, Plus } from "lucide-react";
import { listQuery, useResourceMutations } from "@/crud/api";
import { ResourcePage } from "@/crud/ResourcePage";
import { SchemaForm } from "@/crud/SchemaForm";
import { events } from "@/resources/content";
import { dailyAward, eventAwards, eventCodes, scheduledEvents, timeBoxes } from "@/resources/event-systems";
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
  const { create, update } = useResourceMutations(events);
  const [dialog, setDialog] = useState<null | { kind: "create" } | { kind: "edit"; row: EventRow }>(null);
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
          <Button size="sm" onClick={() => setDialog({ kind: "create" })}>
            <Plus /> Novo
          </Button>
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
                    <button
                      key={e.ActiveID}
                      type="button"
                      title={`${e.Title} — editar`}
                      onClick={() => setDialog({ kind: "edit", row: e })}
                      className={cn("truncate rounded-md px-1.5 py-0.5 text-left font-semibold text-night-deep", !e.IsShow && "line-through opacity-50")}
                      style={{ background: colorOf(e) }}
                    >
                      {e.Title}
                    </button>
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
                <Button size="icon" variant="ghost" aria-label={`Editar ${e.Title}`} onClick={() => setDialog({ kind: "edit", row: e })}>
                  <Pencil />
                </Button>
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
      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        {dialog?.kind === "create" && (
          <DialogContent title="Novo evento" size="lg">
            <SchemaForm
              fields={events.fields}
              mode="create"
              onCancel={() => setDialog(null)}
              onSubmit={async (body) => {
                try {
                  await create.mutateAsync(body);
                  toast.success(t("crud.created"));
                  setDialog(null);
                } catch {
                  toast.error(t("common.error"));
                }
              }}
            />
          </DialogContent>
        )}
        {dialog?.kind === "edit" && (
          <DialogContent title={`Editar ${dialog.row.Title}`} size="lg">
            <SchemaForm
              fields={events.fields}
              mode="edit"
              initial={dialog.row as unknown as Record<string, unknown>}
              onCancel={() => setDialog(null)}
              onSubmit={async (body) => {
                try {
                  await update.mutateAsync({ id: dialog.row.ActiveID, body });
                  toast.success(t("crud.saved"));
                  setDialog(null);
                } catch {
                  toast.error(t("common.error"));
                }
              }}
            />
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

/** Agendador real via REST `scheduledEvents` (`/api/admin/scheduled-events`). */
function SchedulerPanel() {
  const { t } = useI18n();
  const { data } = useQuery(listQuery(scheduledEvents, { page: 1, pageSize: 100, sort: "id" }));
  const { update } = useResourceMutations(scheduledEvents);
  const rows = (data?.items ?? []) as unknown as { id: number; kind: string; title: string; enabled: boolean }[];
  return (
    <Card className="mb-4 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 className="font-display text-lg">Agendador do servidor</h2>
        <span className="text-sm text-muted">Liga/desliga salva via PATCH real; CRUD completo abaixo.</span>
      </div>
      <ul className="flex flex-col gap-2">
        {rows.length === 0 && <li className="text-sm text-muted">{t("crud.empty")}</li>}
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 rounded-xl border border-line/60 p-2 text-sm">
            <span className="font-semibold">{r.title || r.kind}</span>
            <span className="text-muted">{r.kind} · #{r.id}</span>
            <Switch
              checked={!!r.enabled}
              aria-label={r.title || r.kind}
              onCheckedChange={(enabled) => update.mutate({ id: r.id, body: { enabled } }, { onError: () => toast.error(t("common.error")) })}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Prêmios reais via REST `eventAwards` (`/api/admin/event-awards`), filtrados por `ActiveID`. */
function AwardsPanel() {
  const { t } = useI18n();
  const [activeId, setActiveId] = useState("");
  const [dialog, setDialog] = useState(false);
  const { data } = useQuery(listQuery(eventAwards, { page: 1, pageSize: 20, sort: "ActiveID", q: activeId || undefined }));
  const { create } = useResourceMutations(eventAwards);
  const rows = (data?.items ?? []) as unknown as { ID: number; ActiveID: number; ItemID: number; Count: number }[];
  return (
    <Card className="mb-4 flex flex-wrap items-center gap-2 p-4">
      <span className="text-sm">Prêmios do ActiveID</span>
      <Input value={activeId} onChange={(e) => setActiveId(e.target.value)} placeholder="ex. 12" className="w-28" aria-label="ActiveID" />
      <Button size="sm" onClick={() => setDialog(true)}>
        <Plus /> Novo prêmio{activeId ? ` p/ ${activeId}` : ""}
      </Button>
      <span className="text-sm text-muted">{rows.length} encontrados (CRUD completo abaixo)</span>
      <Dialog open={dialog} onOpenChange={(o) => !o && setDialog(false)}>
        {dialog && (
          <DialogContent title="Novo prêmio" size="lg">
            <SchemaForm
              fields={eventAwards.fields}
              mode="create"
              initial={activeId ? ({ ActiveID: Number(activeId) } as unknown as Record<string, unknown>) : undefined}
              onCancel={() => setDialog(false)}
              onSubmit={async (body) => {
                try {
                  await create.mutateAsync(body);
                  toast.success(t("crud.created"));
                  setDialog(false);
                } catch {
                  toast.error(t("common.error"));
                }
              }}
            />
          </DialogContent>
        )}
      </Dialog>
    </Card>
  );
}

/** Códigos reais via REST `eventCodes` (`/api/admin/event-codes`), cria/edita por `ActiveID`. */
function CodesPanel() {
  const { t } = useI18n();
  const [activeId, setActiveId] = useState("");
  const [dialog, setDialog] = useState(false);
  const { data } = useQuery(listQuery(eventCodes, { page: 1, pageSize: 20, sort: "ActiveID", q: activeId || undefined }));
  const { create } = useResourceMutations(eventCodes);
  const rows = (data?.items ?? []) as unknown as { AwardID: string; ActiveID: number }[];
  return (
    <Card className="mb-4 flex flex-wrap items-center gap-2 p-4">
      <span className="text-sm">Códigos do ActiveID (HasKey 1/4)</span>
      <Input value={activeId} onChange={(e) => setActiveId(e.target.value)} placeholder="ex. 12" className="w-28" aria-label="ActiveID" />
      <Button size="sm" onClick={() => setDialog(true)}>
        <Plus /> Novo código{activeId ? ` p/ ${activeId}` : ""}
      </Button>
      <span className="text-sm text-muted">{rows.length} encontrados (CRUD completo abaixo)</span>
      <Dialog open={dialog} onOpenChange={(o) => !o && setDialog(false)}>
        {dialog && (
          <DialogContent title="Novo código" size="md">
            <SchemaForm
              fields={eventCodes.fields}
              mode="create"
              initial={activeId ? ({ ActiveID: Number(activeId) } as unknown as Record<string, unknown>) : undefined}
              onCancel={() => setDialog(false)}
              onSubmit={async (body) => {
                try {
                  await create.mutateAsync(body);
                  toast.success(t("crud.created"));
                  setDialog(false);
                } catch {
                  toast.error(t("common.error"));
                }
              }}
            />
          </DialogContent>
        )}
      </Dialog>
    </Card>
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
          <TabsTrigger value="scheduled">Agendados</TabsTrigger>
          <TabsTrigger value="awards">Prêmios</TabsTrigger>
          <TabsTrigger value="codes">Códigos</TabsTrigger>
          <TabsTrigger value="daily">Presença</TabsTrigger>
          <TabsTrigger value="boxes">Caixas</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar">
          <Calendar />
        </TabsContent>
        <TabsContent value="table">
          <ResourcePage def={events} embedded />
        </TabsContent>
        <TabsContent value="scheduled">
          <SchedulerPanel />
          <ResourcePage def={scheduledEvents} embedded />
        </TabsContent>
        <TabsContent value="awards">
          <AwardsPanel />
          <ResourcePage def={eventAwards} embedded />
        </TabsContent>
        <TabsContent value="codes">
          <CodesPanel />
          <ResourcePage def={eventCodes} embedded />
        </TabsContent>
        <TabsContent value="daily">
          <ResourcePage def={dailyAward} embedded />
        </TabsContent>
        <TabsContent value="boxes">
          <ResourcePage def={timeBoxes} embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
