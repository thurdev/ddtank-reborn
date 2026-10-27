/**
 * Editor visual de Instâncias (site-admin-redesign, editor #2 de `docs/plan/SITE-ADMIN-REDESIGN.md`).
 *
 * Replica o cartão de masmorra do jogo (`roomList/pveRoomList/DungeonListItemView.as` — nome, ícone do mapa,
 * badge de dificuldade) como preview, com UMA faixa por dificuldade configurada (`SimpleGameScript` etc.) —
 * cada faixa mostra a cadeia de fases resolvida e as recompensas possíveis (TemplateIds + cartas de
 * Drop_Condiction/Drop_Item), igual o editor de Missões (`pages/Quests.tsx`, mesmo padrão de preview ao vivo
 * + painel lateral + clique-pra-focar).
 *
 * Diferencial deste editor: a cadeia de fases (`Game.SetupMissions("1072,1073")`, código do script, não dado
 * de banco) só é conhecida reconstruindo o jogo de fato — `GET /api/admin/dungeons/:id/diagnostics`
 * (`apps/api/src/lib/pve-diagnostics.ts`) faz isso e devolve a cadeia + avisos quando uma sessão referenciada
 * não tem linha em `Mission_Info` (a masmorra termina ali sem erro visível — `docs/guides/pve.md` §1.1,
 * tarefa `pve-cadeia`). Esses avisos aparecem na própria faixa da dificuldade, não precisam o dono jogar até
 * o fim pra descobrir.
 *
 * Como lê esse código (cada variável):
 * - `DungeonsPage`: abas Visual/Tabela/Fases/NPCs/Drops.
 * - `DungeonEditor`: busca a masmorra (`getQuery`) + diagnóstico (`dungeonDiagnosticsQuery`); `useForm` +
 *   `useWatch` pro preview ao vivo (mesmos helpers de `crud/schema.ts` de `SchemaForm`/`Quests.tsx`).
 * - `DungeonPreview`: `GamePanel` com uma `DifficultyLane` por dificuldade configurada.
 * - `DifficultyLane`: badge da dificuldade + faixa de recompensas (TemplateIds) + `MissionChain`.
 * - `MissionChain`: cartão por sessão resolvida (nome/título real) + `CardPool` (itens de Drop_Item, se a
 *   fase tiver cartas) + cartão fantasma pontilhado por sessão faltando (aviso).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ApiError,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  GamePanel,
  GamePanelBody,
  GamePanelHeader,
  Hotspot,
  Input,
  PageHeader,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
} from "@ddtank/ui";
import { AlertTriangle, Castle, Flag, Info, Save, Search, Skull } from "lucide-react";
import { api } from "@/lib/api";
import { useI18n, useText } from "@/i18n";
import { getQuery, listQuery, useResourceMutations } from "@/crud/api";
import { FieldInput } from "@/crud/FieldInput";
import { ResourcePage } from "@/crud/ResourcePage";
import { buildSchema, fieldInForm, fromFormValues, toFormValues } from "@/crud/schema";
import type { FieldDef, Row } from "@/crud/types";
import { getItemCached, type ItemResumo } from "@/resources/items";
import { dropConditions, dropItems } from "@/resources/drops";
import { dungeons, missions, npcs } from "@/resources/content";

type DungeonRow = Row & { ID: number; Name?: string };

interface ChainMission {
  session: number;
  id: number;
  name: string;
  title: string | null;
  cardDropId: number | null;
}
interface DungeonDifficultyDiagnostics {
  hardLevel: number;
  field: string;
  script: string;
  totalMissionCount: number;
  resolvedCount: number;
  missingSessionKeys: number[];
  missingMissionScripts: { missionId: number; script: string }[];
  missions: ChainMission[];
  error?: string;
}

function dungeonDiagnosticsQuery(pveId: number) {
  return queryOptions({
    queryKey: ["dungeon-diagnostics", pveId],
    queryFn: () => api.get<{ items: DungeonDifficultyDiagnostics[] }>(`/api/admin/dungeons/${pveId}/diagnostics`),
    staleTime: 10_000,
  });
}

const DIFFICULTIES = [
  { field: "SimpleGameScript", templateField: "SimpleTemplateIds", labelKey: "fácil", tone: "mint" as const },
  { field: "NormalGameScript", templateField: "NormalTemplateIds", labelKey: "normal", tone: "sky" as const },
  { field: "HardGameScript", templateField: "HardTemplateIds", labelKey: "difícil", tone: "coral" as const },
  { field: "TerrorGameScript", templateField: "TerrorTemplateIds", labelKey: "herói", tone: "grape" as const },
];

/** Small real-art chip: item icon via the existing `/api/admin/item-icons/:id.png` cache (no name lookup —
 *  used in tight rows where the tooltip carries the name). */
function ItemIcon({ templateId }: { templateId: number }) {
  const [item, setItem] = useState<ItemResumo | null>(null);
  useEffect(() => {
    let vivo = true;
    void getItemCached(templateId).then((r) => vivo && setItem(r));
    return () => {
      vivo = false;
    };
  }, [templateId]);
  return item?.iconUrl ? (
    <img src={item.iconUrl} alt="" title={item.Name} loading="lazy" className="size-7 shrink-0 rounded-md border border-line bg-night-deep object-contain" />
  ) : (
    <span title={`#${templateId}`} className="grid size-7 shrink-0 place-items-center rounded-md border border-line bg-night-deep font-mono text-[9px] text-muted">
      #{templateId}
    </span>
  );
}

/** Card pool of one resolved mission (`Drop_Condiction` "Copy" -> `Drop_Item`), fetched only when the mission
 *  actually has one (`cardDropId` from the diagnostics response). */
function CardPool({ dropId }: { dropId: number }) {
  const { t } = useI18n();
  const { data } = useQuery(listQuery(dropItems, { page: 1, pageSize: 20, sort: "Id", extra: { cf_DropId: String(dropId) } }));
  const rows = data?.items ?? [];
  if (!rows.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{t("dungeons.cardPool")}</span>
      {rows.map((r) => (
        <ItemIcon key={String(r.Id)} templateId={Number(r.ItemId)} />
      ))}
    </div>
  );
}

/** The resolved chain for one difficulty: a card per session, in order, plus a dashed "missing" card for
 *  every session `SetupMissions` referenced that has no `Mission_Info` row (the actual class of bug this
 *  editor exists to surface — see the file banner). */
function MissionChain({ diag, onOpenMissions }: { diag: DungeonDifficultyDiagnostics; onOpenMissions: () => void }) {
  const { t } = useI18n();
  if (diag.error) return <p className="text-xs text-coral">{t("dungeons.diagError", { message: diag.error })}</p>;
  const resolved = new Map(diag.missions.map((m) => [m.session, m]));
  const cards = Array.from({ length: Math.max(diag.totalMissionCount, diag.missions.length) }, (_, i) => i + 1);
  return (
    <div className="flex flex-wrap gap-2">
      {cards.map((session) => {
        const mi = resolved.get(session);
        const isBoss = session === diag.totalMissionCount && !!mi;
        if (!mi) {
          return (
            <Hotspot key={session} label={t("dungeons.missingSession", { n: session })} onClick={onOpenMissions} className="rounded-xl border-2 border-dashed border-coral/60 bg-coral/10 p-2">
              <div className="flex items-center gap-1.5 text-coral">
                <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                <span className="text-xs font-semibold">{t("dungeons.session", { n: session })}</span>
              </div>
            </Hotspot>
          );
        }
        return (
          <Hotspot key={session} onClick={onOpenMissions} className="min-w-32 rounded-xl border border-line bg-night-deep/40 p-2">
            <div className="flex items-center gap-1.5">
              {isBoss ? <Skull className="size-3.5 shrink-0 text-coral" aria-hidden /> : <Flag className="size-3.5 shrink-0 text-sky" aria-hidden />}
              <span className="text-xs font-semibold text-ink">{t("dungeons.session", { n: session })}</span>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted" title={mi.name}>
              {mi.title || mi.name || `#${mi.id}`}
            </p>
            {mi.cardDropId != null && <CardPool dropId={mi.cardDropId} />}
          </Hotspot>
        );
      })}
    </div>
  );
}

interface DifficultyLaneProps {
  dungeon: Row;
  diffField: (typeof DIFFICULTIES)[number];
  diag: DungeonDifficultyDiagnostics | undefined;
  diagLoading: boolean;
  focused: string | null;
  onFocus: (name: string) => void;
  onOpenMissions: () => void;
}
function DifficultyLane({ dungeon, diffField, diag, diagLoading, focused, onFocus, onOpenMissions }: DifficultyLaneProps) {
  const { t } = useI18n();
  const text = useText();
  const script = String(dungeon[diffField.field] ?? "");
  if (!script) return null;
  const templateIds = String(dungeon[diffField.templateField] ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

  return (
    <div className="rounded-xl border border-line/70 bg-night-deep/30 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Hotspot active={focused === diffField.field} onClick={() => onFocus(diffField.field)}>
          <Badge tone={diffField.tone} className="capitalize">
            {diffField.labelKey}
          </Badge>
        </Hotspot>
        {diag && diag.missingSessionKeys.length > 0 && (
          <Badge tone="coral">
            <AlertTriangle className="size-3" aria-hidden /> {diag.missingSessionKeys.length}
          </Badge>
        )}
        {diag && diag.missingMissionScripts.length > 0 && (
          <Badge tone="sun">
            <Info className="size-3" aria-hidden /> {diag.missingMissionScripts.length}
          </Badge>
        )}
      </div>

      {templateIds.length > 0 && (
        <div className="mb-2">
          <Hotspot active={focused === diffField.templateField} onClick={() => onFocus(diffField.templateField)} className="block w-fit p-1">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{t("dungeons.rewards")}</p>
            <div className="flex flex-wrap gap-1">
              {templateIds.map((tid) => (
                <ItemIcon key={tid} templateId={tid} />
              ))}
            </div>
          </Hotspot>
        </div>
      )}

      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{t("dungeons.chain")}</p>
      {diagLoading ? (
        <Skeleton className="h-14" />
      ) : diag ? (
        <MissionChain diag={diag} onOpenMissions={onOpenMissions} />
      ) : (
        <p className="text-xs text-muted">{text(dungeons.description)}</p>
      )}
    </div>
  );
}

function DungeonPicker({ selectedId, onSelect }: { selectedId: number | null; onSelect: (id: number) => void }) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery(listQuery(dungeons, { page: 1, pageSize: 50, q: q || undefined, sort: "Ordering" }));
  const rows = (data?.items ?? []) as DungeonRow[];
  return (
    <Card className="flex max-h-[75vh] flex-col overflow-hidden p-0">
      <div className="border-b border-line p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("dungeons.pickerPlaceholder")}
            aria-label={t("dungeons.pickerPlaceholder")}
            className="pl-9"
          />
        </div>
      </div>
      <ul className="flex-1 overflow-y-auto p-2">
        {!isLoading && rows.length === 0 && <li className="p-3 text-sm text-muted">{t("dungeons.pickerEmpty")}</li>}
        {rows.map((r) => (
          <li key={r.ID}>
            <button
              type="button"
              onClick={() => onSelect(r.ID)}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-panel-2",
                selectedId === r.ID && "bg-sun/15 font-semibold text-sun",
              )}
            >
              <Castle className="size-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{r.Name || `#${r.ID}`}</span>
              <span className="font-mono text-xs text-muted">#{r.ID}</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function DungeonEditor({ dungeonId, onOpenMissions }: { dungeonId: number; onOpenMissions: () => void }) {
  const { t } = useI18n();
  const text = useText();
  const { data, isLoading } = useQuery(getQuery(dungeons, dungeonId));
  const { data: diagData, isLoading: diagLoading } = useQuery(dungeonDiagnosticsQuery(dungeonId));
  const { update } = useResourceMutations(dungeons);
  const diagByField = useMemo(() => new Map((diagData?.items ?? []).map((d) => [d.field, d])), [diagData]);

  const fields = useMemo(() => dungeons.fields.filter((f) => fieldInForm(f, "edit")), []);
  const schema = useMemo(() => buildSchema(dungeons.fields, "edit", t, text), [t, text]);
  const defaultValues = useMemo(() => toFormValues(dungeons.fields, data, "edit"), [data]);
  const { control, handleSubmit, formState } = useForm<Row>({
    resolver: zodResolver(schema) as unknown as Resolver<Row>,
    defaultValues,
    values: defaultValues,
    resetOptions: { keepDirtyValues: false },
  });
  const live = useWatch({ control });

  const [focused, setFocused] = useState<string | null>(null);
  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const focus = (name: string) => {
    setFocused(name);
    const el = fieldRefs.current[name];
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    (el?.querySelector("input, textarea, select, button") as HTMLElement | undefined)?.focus();
  };

  if (isLoading || !data) return <Skeleton className="h-96 lg:col-span-2" />;

  const submit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync({ id: dungeonId, body: fromFormValues(dungeons.fields, values, "edit") });
      toast.success(t("crud.saved"));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t("common.error"));
    }
  });

  const sections: { title?: string; fields: FieldDef[] }[] = [];
  for (const f of fields) {
    const title = f.section ? text(f.section) : undefined;
    let s = sections.find((x) => x.title === title);
    if (!s) sections.push((s = { title, fields: [] }));
    s.fields.push(f);
  }

  const pic = String(live.Pic ?? "").trim();
  const hasDifficulty = DIFFICULTIES.some((d) => String(live[d.field] ?? ""));

  return (
    <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <GamePanel>
        <GamePanelHeader
          icon={Castle}
          title={
            <Hotspot active={focused === "Name"} onClick={() => focus("Name")}>
              {String(live.Name || "—")}
            </Hotspot>
          }
        />
        <GamePanelBody>
          <div className="flex flex-wrap items-center gap-3">
            {pic && (
              <Hotspot active={focused === "Pic"} onClick={() => focus("Pic")} className="p-1">
                <img
                  src={`/resource/image/map/${encodeURIComponent(pic)}/icon.png`}
                  alt=""
                  loading="lazy"
                  className="size-16 rounded-lg border border-line bg-night-deep object-contain"
                />
              </Hotspot>
            )}
            <Hotspot active={focused === "LevelLimits"} onClick={() => focus("LevelLimits")}>
              <Badge tone="sky">{t("dungeons.levelMin", { n: String(live.LevelLimits ?? 0) })}</Badge>
            </Hotspot>
          </div>

          {!!live.Description && (
            <Hotspot active={focused === "Description"} onClick={() => focus("Description")} className="block w-full p-2">
              <p className="text-sm text-ink">{String(live.Description)}</p>
            </Hotspot>
          )}

          <div className="flex flex-col gap-3">
            {hasDifficulty ? (
              DIFFICULTIES.map((d) => (
                <DifficultyLane
                  key={d.field}
                  dungeon={live}
                  diffField={d}
                  diag={diagByField.get(d.field)}
                  diagLoading={diagLoading}
                  focused={focused}
                  onFocus={focus}
                  onOpenMissions={onOpenMissions}
                />
              ))
            ) : (
              <p className="text-sm text-muted">{t("dungeons.noDifficulties")}</p>
            )}
          </div>
        </GamePanelBody>
      </GamePanel>
      <Card className="flex max-h-[75vh] flex-col overflow-hidden p-0">
        <div className="flex items-center justify-between gap-2 border-b border-line p-4">
          <h3 className="title-plate text-lg">{t("dungeons.editPanel")}</h3>
          <Button type="submit" size="sm" disabled={formState.isSubmitting || !formState.isDirty}>
            <Save className="size-4" /> {t("crud.save")}
          </Button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          {sections.map((s, i) => (
            <fieldset key={s.title ?? i} className={cn(s.title && "rounded-2xl border border-line p-3 pt-1")}>
              {s.title && <legend className="px-1 font-display text-sun">{s.title}</legend>}
              <div className="flex flex-col gap-3">
                {s.fields.map((f) => (
                  <div
                    key={f.name}
                    ref={(el) => {
                      fieldRefs.current[f.name] = el;
                    }}
                    className={cn("rounded-xl p-1.5 transition-colors duration-150 ease-out", focused === f.name && "bg-sun/10 ring-1 ring-sun")}
                  >
                    <Field label={text(f.label)} htmlFor={`dve-${f.name}`} hint={text(f.hint)}>
                      <Controller
                        control={control}
                        name={f.name}
                        render={({ field }) => (
                          <FieldInput field={f} id={`dve-${f.name}`} mode="edit" value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
                        )}
                      />
                    </Field>
                  </div>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </Card>
    </form>
  );
}

function DropsPanel() {
  return (
    <div className="flex flex-col gap-4">
      <ResourcePage def={dropConditions} embedded />
      <ResourcePage def={dropItems} embedded />
    </div>
  );
}

export function DungeonsPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState("visual");
  const [dungeonId, setDungeonId] = useState<number | null>(null);
  return (
    <div>
      <PageHeader title={t("dungeons.title")} description={t("dungeons.lead")} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="visual">{t("dungeons.visual")}</TabsTrigger>
          <TabsTrigger value="table">{t("dungeons.table")}</TabsTrigger>
          <TabsTrigger value="missions">{t("dungeons.missions")}</TabsTrigger>
          <TabsTrigger value="npcs">{t("dungeons.npcs")}</TabsTrigger>
          <TabsTrigger value="drops">{t("dungeons.drops")}</TabsTrigger>
        </TabsList>
        <TabsContent value="visual">
          <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <DungeonPicker selectedId={dungeonId} onSelect={setDungeonId} />
            {dungeonId === null ? <EmptyState title={t("dungeons.none")} /> : <DungeonEditor dungeonId={dungeonId} onOpenMissions={() => setTab("missions")} />}
          </div>
        </TabsContent>
        <TabsContent value="table">
          <ResourcePage def={dungeons} embedded />
        </TabsContent>
        <TabsContent value="missions">
          <ResourcePage def={missions} embedded />
        </TabsContent>
        <TabsContent value="npcs">
          <ResourcePage def={npcs} embedded />
        </TabsContent>
        <TabsContent value="drops">
          <DropsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
