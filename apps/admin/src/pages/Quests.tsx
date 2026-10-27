/**
 * Editor visual de Missões (site-admin-redesign, editor #1 de `docs/plan/SITE-ADMIN-REDESIGN.md`).
 *
 * Replica a janela de missão do jogo (`vendor/DDTank41/Source Flash/src/quest/QuestInfoPanelView.as` —
 * descrição + condições obrigatórias/opcionais; `quest/QuestRewardView.as` — recompensas: exp/ouro/cupom/
 * honra/medalha + itens) como um PREVIEW ao lado de um painel de edição (`quests.fields`, mesma lista do
 * recurso genérico). Clicar num elemento do preview (`Hotspot`) foca o campo correspondente no painel —
 * `focus()` desloca e ilumina o campo, não só rola até ele. O preview é alimentado por `useWatch`, então
 * toda tecla digitada no painel já aparece na janela de jogo antes de salvar.
 *
 * Condições (`quest-conditions`) e itens de recompensa (`quest-goods`) são mostrados no preview (dados reais,
 * via `cf_QuestID=<id>` — filtro de coluna genérico já existente, `docs/features/admin.md`), mas editados nas
 * abas "Condições"/"Prêmios" (`ResourcePage embedded`, igual ao padrão de `pages/Events.tsx`) — editar um
 * array de linhas filho dentro do mesmo painel lateral ficaria apertado demais pra ser "bonito".
 *
 * Como lê esse código (cada variável):
 * - `QuestsPage`: abas Visual/Tabela/Condições/Prêmios; Visual = `QuestPicker` (lista + busca) + `QuestEditor`.
 * - `QuestEditor`: busca a missão (`getQuery`) + suas condições/prêmios (`listQuery` com `cf_QuestID`); `useForm`
 *   (mesmos helpers de `crud/schema.ts` que `SchemaForm` usa) + `useWatch` pro preview ao vivo; `focused`/`focus()`
 *   = campo atualmente destacado no painel, `fieldRefs` = nó DOM de cada campo pra rolar/focar.
 * - `QuestPreview`: janela de jogo (`GamePanel`); cada `Hotspot` chama `onFocus(nomeDoCampo)`.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  RewardChip,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
} from "@ddtank/ui";
import { Award, Circle, Coins, Flame, MapPin, Save, ScrollText, Search, ShieldCheck, Ticket, Zap } from "lucide-react";
import { useI18n, useText } from "@/i18n";
import { getQuery, listQuery, useResourceMutations } from "@/crud/api";
import { FieldInput } from "@/crud/FieldInput";
import { ResourcePage } from "@/crud/ResourcePage";
import { buildSchema, fieldInForm, fromFormValues, toFormValues } from "@/crud/schema";
import type { FieldDef, Row } from "@/crud/types";
import { getItemCached, type ItemResumo } from "@/resources/items";
import { getRefCached } from "@/crud/refs";
import { questConditions, questGoods, quests } from "@/resources/content";

type QuestRow = Row & { ID: number; Title?: string };

function QuestPicker({ selectedId, onSelect }: { selectedId: number | null; onSelect: (id: number) => void }) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery(listQuery(quests, { page: 1, pageSize: 50, q: q || undefined, sort: "ID" }));
  const rows = (data?.items ?? []) as QuestRow[];
  return (
    <Card className="flex max-h-[75vh] flex-col overflow-hidden p-0">
      <div className="border-b border-line p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("quests.pickerPlaceholder")}
            aria-label={t("quests.pickerPlaceholder")}
            className="pl-9"
          />
        </div>
      </div>
      <ul className="flex-1 overflow-y-auto p-2">
        {!isLoading && rows.length === 0 && <li className="p-3 text-sm text-muted">{t("quests.pickerEmpty")}</li>}
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
              <ScrollText className="size-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{r.Title || `#${r.ID}`}</span>
              <span className="font-mono text-xs text-muted">#{r.ID}</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** One real item reward in the preview: icon via the existing `/api/admin/item-icons/:id.png` cache. */
function GoodsChip({ row, onFocus, active }: { row: Row; onFocus: () => void; active: boolean }) {
  const [item, setItem] = useState<ItemResumo | null>(null);
  const templateId = Number(row.RewardItemID);
  useEffect(() => {
    let vivo = true;
    void getItemCached(templateId).then((r) => vivo && setItem(r));
    return () => {
      vivo = false;
    };
  }, [templateId]);
  return (
    <Hotspot label={`Editar prêmio ${item?.Name ?? `#${templateId}`}`} active={active} onClick={onFocus}>
      <RewardChip
        iconUrl={item?.iconUrl}
        tone={row.IsSelect ? "grape" : "sun"}
        label={`×${row.RewardItemCount ?? 1}`}
        title={item?.Name ?? `#${templateId}`}
      />
    </Hotspot>
  );
}

/** One quest-chain map thumbnail: reuses `/api/admin/map-icons/:id.png` (same art the dungeon card will use). */
function MapThumb({ mapId, active, onClick }: { mapId: number; active: boolean; onClick: () => void }) {
  const [name, setName] = useState("");
  useEffect(() => {
    let vivo = true;
    void getRefCached("maps", mapId).then((r) => vivo && setName(r?.label ?? ""));
    return () => {
      vivo = false;
    };
  }, [mapId]);
  return (
    <Hotspot label="Editar mapa da missão" active={active} onClick={onClick} className="inline-flex items-center gap-2 p-1.5">
      <img
        src={`/api/admin/map-icons/${mapId}.png`}
        alt=""
        loading="lazy"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
        className="size-10 shrink-0 rounded-lg border border-line bg-night-deep object-contain"
      />
      <span className="flex items-center gap-1 text-sm text-ink">
        <MapPin className="size-3.5 text-sky" aria-hidden /> {name || `#${mapId}`}
      </span>
    </Hotspot>
  );
}

interface QuestPreviewProps {
  quest: Row;
  conditions: Row[];
  goods: Row[];
  focused: string | null;
  onFocus: (name: string) => void;
  onOpenConditions: () => void;
  onOpenRewards: () => void;
}

/** The game window itself: `GamePanel` dressed like `QuestInfoPanelView`/`QuestRewardView` (see file banner). */
function QuestPreview({ quest, conditions, goods, focused, onFocus, onOpenConditions, onOpenRewards }: QuestPreviewProps) {
  const { t } = useI18n();
  const necessary = conditions.filter((c) => !c.isOpitional);
  const optional = conditions.filter((c) => c.isOpitional);

  const currencyRewards: { key: string; icon: typeof Zap; tone: "mint" | "sun" | "sky" | "grape" | "coral"; label: string; title: string }[] = [];
  const n = (v: unknown) => Number(v) || 0;
  if (n(quest.RewardGP) > 0) currencyRewards.push({ key: "RewardGP", icon: Zap, tone: "mint", label: `+${quest.RewardGP}`, title: "Experiência" });
  if (n(quest.RewardGold) > 0) currencyRewards.push({ key: "RewardGold", icon: Coins, tone: "sun", label: `+${quest.RewardGold}`, title: "Ouro" });
  if (n(quest.RewardMoney) > 0) currencyRewards.push({ key: "RewardMoney", icon: Ticket, tone: "sky", label: `+${quest.RewardMoney}`, title: "Cupons" });
  if (n(quest.RewardOffer) > 0) currencyRewards.push({ key: "RewardOffer", icon: ShieldCheck, tone: "grape", label: `+${quest.RewardOffer}`, title: "Mérito" });
  if (n(quest.RewardGiftToken) > 0) currencyRewards.push({ key: "RewardGiftToken", icon: Award, tone: "coral", label: `+${quest.RewardGiftToken}`, title: "Medalhas" });
  if (n(quest.RewardBuffID) > 0) currencyRewards.push({ key: "RewardBuffID", icon: Flame, tone: "coral", label: `${quest.RewardBuffDate ?? 0}h`, title: "Buff" });

  return (
    <GamePanel>
      <GamePanelHeader
        icon={ScrollText}
        title={
          // No explicit `label`: the hotspot's visible text IS the quest title, so it should also be this
          // <h3>'s accessible name — an override here would make the heading announce "edit title" instead.
          <Hotspot active={focused === "Title"} onClick={() => onFocus("Title")}>
            {String(quest.Title || "—")}
          </Hotspot>
        }
      />
      <GamePanelBody>
        <div className="flex flex-wrap gap-2">
          <Hotspot active={focused === "NeedMinLevel" || focused === "NeedMaxLevel"} onClick={() => onFocus("NeedMinLevel")}>
            <Badge tone="sky">{t("quests.levelRange", { min: String(quest.NeedMinLevel ?? 1), max: String(quest.NeedMaxLevel ?? 100) })}</Badge>
          </Hotspot>
          {!!quest.CanRepeat && (
            <Hotspot active={focused === "CanRepeat"} onClick={() => onFocus("CanRepeat")}>
              <Badge tone="mint">{t("quests.repeatable")}</Badge>
            </Hotspot>
          )}
          {n(quest.MapID) > 0 && <MapThumb mapId={n(quest.MapID)} active={focused === "MapID"} onClick={() => onFocus("MapID")} />}
        </div>

        <Hotspot active={focused === "Detail"} onClick={() => onFocus("Detail")} className="block w-full p-2">
          <p className="text-sm text-ink">{String(quest.Detail || "—")}</p>
        </Hotspot>

        {!!quest.Objective && (
          <Hotspot active={focused === "Objective"} onClick={() => onFocus("Objective")} className="block w-full p-2">
            <p className="font-display text-sm text-sun">{String(quest.Objective)}</p>
          </Hotspot>
        )}

        <div className="rounded-xl border border-line/70 bg-night-deep/30 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="title-plate text-sm text-ink">{t("quests.conditions")}</h4>
            <Button type="button" size="sm" variant="ghost" onClick={onOpenConditions}>
              {t("quests.editConditions")}
            </Button>
          </div>
          {conditions.length === 0 ? (
            <p className="text-xs text-muted">{t("quests.conditionsEmpty")}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {necessary.length > 0 && (
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{t("quests.necessary")}</p>
                  {necessary.map((c) => (
                    <ConditionRow key={String(c.CondictionID)} row={c} />
                  ))}
                </div>
              )}
              {optional.length > 0 && (
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{t("quests.optional")}</p>
                  {optional.map((c) => (
                    <ConditionRow key={String(c.CondictionID)} row={c} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-line/70 bg-night-deep/30 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="title-plate text-sm text-ink">{t("quests.rewards")}</h4>
            <Button type="button" size="sm" variant="ghost" onClick={onOpenRewards}>
              {t("quests.editRewards")}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {currencyRewards.map((r) => (
              <Hotspot key={r.key} label={`Editar recompensa ${r.title}`} active={focused === r.key} onClick={() => onFocus(r.key)}>
                <RewardChip icon={r.icon} tone={r.tone} label={r.label} title={r.title} />
              </Hotspot>
            ))}
            {goods.map((g) => (
              <GoodsChip key={`${g.QuestID}-${g.RewardItemID}`} row={g} active={false} onFocus={onOpenRewards} />
            ))}
            {currencyRewards.length === 0 && goods.length === 0 && <p className="text-xs text-muted">{t("quests.rewardsEmpty")}</p>}
          </div>
        </div>
      </GamePanelBody>
    </GamePanel>
  );
}

/** Per-player progress (status/isComplete in `QuestConditionView.as`) isn't admin data — this is the
 *  condition's definition, always shown as pending (`Circle`), not a specific player's state. */
function ConditionRow({ row }: { row: Row }) {
  return (
    <div className="flex items-center gap-2 py-1 text-sm text-ink">
      <Circle className="size-4 shrink-0 text-muted" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{String(row.CondictionTitle || "—")}</span>
    </div>
  );
}

/** Side panel: every editable `quests` field, grouped by `section` — same grouping `SchemaForm` uses — each
 *  wrapped so `focus(name)` (triggered by a preview `Hotspot`) can scroll to it and highlight it. */
function QuestEditor({ questId, onOpenConditions, onOpenRewards }: { questId: number; onOpenConditions: () => void; onOpenRewards: () => void }) {
  const { t } = useI18n();
  const text = useText();
  const { data, isLoading } = useQuery(getQuery(quests, questId));
  const { data: conditionsData } = useQuery(listQuery(questConditions, { page: 1, pageSize: 50, sort: "CondictionID", extra: { cf_QuestID: String(questId) } }));
  const { data: goodsData } = useQuery(listQuery(questGoods, { page: 1, pageSize: 50, sort: "RewardItemID", extra: { cf_QuestID: String(questId) } }));
  const { update } = useResourceMutations(quests);

  const fields = useMemo(() => quests.fields.filter((f) => fieldInForm(f, "edit")), []);
  const schema = useMemo(() => buildSchema(quests.fields, "edit", t, text), [t, text]);
  const defaultValues = useMemo(() => toFormValues(quests.fields, data, "edit"), [data]);
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
      await update.mutateAsync({ id: questId, body: fromFormValues(quests.fields, values, "edit") });
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

  return (
    <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <QuestPreview
        quest={live}
        conditions={(conditionsData?.items ?? []) as Row[]}
        goods={(goodsData?.items ?? []) as Row[]}
        focused={focused}
        onFocus={focus}
        onOpenConditions={onOpenConditions}
        onOpenRewards={onOpenRewards}
      />
      <Card className="flex max-h-[75vh] flex-col overflow-hidden p-0">
        <div className="flex items-center justify-between gap-2 border-b border-line p-4">
          <h3 className="title-plate text-lg">{t("quests.editPanel")}</h3>
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
                    <Field label={text(f.label)} htmlFor={`qve-${f.name}`} hint={text(f.hint)}>
                      <Controller
                        control={control}
                        name={f.name}
                        render={({ field }) => (
                          <FieldInput field={f} id={`qve-${f.name}`} mode="edit" value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
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

export function QuestsPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState("visual");
  const [questId, setQuestId] = useState<number | null>(null);
  return (
    <div>
      <PageHeader title={t("quests.title")} description={t("quests.lead")} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="visual">{t("quests.visual")}</TabsTrigger>
          <TabsTrigger value="table">{t("quests.table")}</TabsTrigger>
          <TabsTrigger value="conditions">{t("quests.conditions")}</TabsTrigger>
          <TabsTrigger value="rewards">{t("quests.rewards")}</TabsTrigger>
        </TabsList>
        <TabsContent value="visual">
          <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <QuestPicker selectedId={questId} onSelect={setQuestId} />
            {questId === null ? (
              <EmptyState title={t("quests.none")} />
            ) : (
              <QuestEditor questId={questId} onOpenConditions={() => setTab("conditions")} onOpenRewards={() => setTab("rewards")} />
            )}
          </div>
        </TabsContent>
        <TabsContent value="table">
          <ResourcePage def={quests} embedded />
        </TabsContent>
        <TabsContent value="conditions">
          <ResourcePage def={questConditions} embedded />
        </TabsContent>
        <TabsContent value="rewards">
          <ResourcePage def={questGoods} embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
