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
import { Minus, MapPin, Plus, Save, ScrollText, Search } from "lucide-react";
import { useI18n, useText } from "@/i18n";
import { getQuery, listQuery, useResourceMutations } from "@/crud/api";
import { FieldInput } from "@/crud/FieldInput";
import { FlashImg, useFlashLibrary, resolveFlashAsset } from "@/lib/flashAssets";
import { ResourcePage } from "@/crud/ResourcePage";
import { buildSchema, fieldInForm, fromFormValues, toFormValues } from "@/crud/schema";
import type { FieldDef, Row } from "@/crud/types";
import { getItemCached, type ItemResumo } from "@/resources/items";
import { getRefCached } from "@/crud/refs";
import { questConditions, questGoods, quests } from "@/resources/content";

/** The quest window's exported art module (`apps/client/public/assets/flash/ui/vietnam/swf/quest/`) — see
 * `vendor/DDTank41/Source Flash/src/quest/QuestInfoPanelView.as`/`QuestRewardView.as` for the component this
 * mirrors, and `FlashImg`'s doc comment for how the art is served. Every PNG referenced below was visually
 * verified to already carry pt-BR text (e.g. "Objetivo da tarefa:", "Recompensa:", "Prêmios a escolher:") —
 * it's the same export the live client uses, not the vendor Vietnamese/Chinese original. */
const QUEST_MODULE = "quest";
/** AS3 class -> currency reward icon, in `QuestRewardView.as` `addReward`'s switch order (exp/gold/coin/
 * rich/honor/gift/medal/rank) — `rich` and `rank` have no field in `quests.fields` yet, skipped; `medal` is
 * skipped here on purpose too, matching `addReward`'s own early return for it (never shown in-game either). */
const CURRENCY_REWARD_ART: { field: string; asset: string; title: string }[] = [
  { field: "RewardGP", asset: "asset.core.quest.RewardText.Type1", title: "Experiência" },
  { field: "RewardGold", asset: "asset.core.quest.RewardText.Type2", title: "Ouro" },
  { field: "RewardMoney", asset: "asset.core.quest.RewardText.Type3", title: "Cupons" },
  { field: "RewardOffer", asset: "asset.core.quest.RewardText.Type5", title: "Mérito" },
  { field: "RewardGiftToken", asset: "asset.core.quest.RewardText.Type6", title: "Medalhas" },
];

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

/** One real item reward cell: `QuestRewardCellBG` (the actual in-game reward-slot art, 158×55 — icon well on
 *  the left, wood nameplate on the right) with a real item icon (`/api/admin/item-icons/:id.png`) and name
 *  overlaid, matching `QuestRewardCell.as`'s layout. */
function GoodsChip({ row, onFocus, active }: { row: Row; onFocus: () => void; active: boolean }) {
  const { data: lib } = useFlashLibrary(QUEST_MODULE);
  const cellBg = resolveFlashAsset(lib, QUEST_MODULE, "asset.core.quest.QuestRewardCellBG");
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
    <Hotspot
      label={`Editar prêmio ${item?.Name ?? `#${templateId}`}`}
      active={active}
      onClick={onFocus}
      className="relative block shrink-0 overflow-hidden bg-cover bg-center p-0"
      style={{ width: 158, height: 55, backgroundImage: cellBg ? `url(${cellBg.url})` : undefined }}
    >
      {item?.iconUrl && <img src={item.iconUrl} alt="" className="absolute left-[6px] top-[6px] size-10 object-contain" />}
      <span className="absolute left-[52px] right-2 top-2 truncate text-left text-[11px] font-semibold text-[#ffff99]">{item?.Name ?? `#${templateId}`}</span>
      <span className="absolute bottom-1.5 left-[52px] font-mono text-[10px] text-white">{`×${row.RewardItemCount ?? 1}`}</span>
      {!!row.IsSelect && <span className="absolute right-1 top-1 rounded-sm bg-grape/80 px-1 text-[9px] font-bold text-white">opcional</span>}
    </Hotspot>
  );
}

/** Zoom controls (the owner asked for "1:1 scale (with zoom)", not a shrink-to-fit card): the preview below
 *  renders at the window's real content width (560px, from `QuestRewardCell`'s 2×186px grid +
 *  `QuestInfoPanelView`'s left margin) and `zoom` (CSS `zoom`, reflows layout — unlike `transform: scale`,
 *  which would leave stale empty space) scales it for the admin's screen. */
function useZoom(initial = 0.85) {
  const [zoom, setZoom] = useState(initial);
  return {
    zoom,
    controls: (
      <div className="flex items-center justify-end gap-1">
        <Button type="button" size="icon" variant="secondary" aria-label="Diminuir zoom" onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))}>
          <Minus className="size-4" />
        </Button>
        <span className="w-12 text-center font-mono text-xs text-muted">{Math.round(zoom * 100)}%</span>
        <Button type="button" size="icon" variant="secondary" aria-label="Aumentar zoom" onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))}>
          <Plus className="size-4" />
        </Button>
      </div>
    ),
  };
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

/** A real section-label bitmap (e.g. "Objetivo da tarefa:", "Recompensa:") as a `Hotspot` header — the label
 *  art itself isn't editable (it's not game data), so focus lands on `focusField` when one's given. */
function SectionLabel({ asset, focused, onFocus, focusField }: { asset: string; focused: string | null; onFocus: (n: string) => void; focusField?: string }) {
  const { data: lib } = useFlashLibrary(QUEST_MODULE);
  const art = resolveFlashAsset(lib, QUEST_MODULE, asset);
  if (!art) return null;
  const img = <img src={art.url} alt="" className="h-auto" />;
  return focusField ? (
    <Hotspot active={focused === focusField} onClick={() => onFocus(focusField)} className="mb-1.5 inline-block p-0.5">
      {img}
    </Hotspot>
  ) : (
    <div className="mb-1.5">{img}</div>
  );
}

/** The game window itself — real exported art (quest module) laid out per `QuestInfoPanelView.as`/
 *  `QuestRewardView.as`'s structure: title bar, level/repeat/map badges, description, objective, required/
 *  optional conditions, currency rewards, item reward cells. See `useZoom`'s comment for the 560px content
 *  width this renders at. */
function QuestPreview({ quest, conditions, goods, focused, onFocus, onOpenConditions, onOpenRewards }: QuestPreviewProps) {
  const { t } = useI18n();
  const { data: lib } = useFlashLibrary(QUEST_MODULE);
  const { zoom, controls } = useZoom();
  const titleBg = resolveFlashAsset(lib, QUEST_MODULE, "asset.core.quest.titleBG");
  const leather = resolveFlashAsset(lib, QUEST_MODULE, "asset.core.quest.leftBGStyle1");
  const necessary = conditions.filter((c) => !c.isOpitional);
  const optional = conditions.filter((c) => c.isOpitional);
  const n = (v: unknown) => Number(v) || 0;
  const activeCurrency = CURRENCY_REWARD_ART.filter((c) => n(quest[c.field]) > 0);

  return (
    <div className="flex flex-col gap-2">
      {controls}
      <div className="overflow-auto rounded-2xl border border-line bg-night-deep/60 p-4">
        {/* 560px = the window's real content width (QuestRewardCell's 2×186px grid + ROW_X=18 left margin,
         *  QuestRewardView.as/QuestRewardCell.as) — not an arbitrary card width. */}
        <div style={{ zoom, width: 560 }} className="mx-auto select-none">
          <div
            className="relative rounded-lg border-[3px] p-4"
            style={{
              borderColor: "#8a6a3a",
              backgroundColor: "#2b1a0e",
              backgroundImage: leather ? `url(${leather.url})` : undefined,
              backgroundRepeat: "repeat",
              boxShadow: "0 18px 40px -18px rgb(0 0 0 / 0.85), inset 0 0 0 1px rgb(0 0 0 / 0.4)",
            }}
          >
            <h3 className="relative mb-3 flex items-center justify-center" style={{ height: 35 }}>
              {titleBg && <img src={titleBg.url} alt="" className="absolute inset-0 h-full w-full" style={{ objectFit: "fill" }} />}
              <Hotspot
                active={focused === "Title"}
                onClick={() => onFocus("Title")}
                className="title-plate relative z-10 px-2 text-base text-[#ffe564]"
                style={{ textShadow: "0 2px 0 #000" }}
              >
                {String(quest.Title || "—")}
              </Hotspot>
            </h3>

            <div className="mb-3 flex flex-wrap gap-2">
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

            <SectionLabel asset="asset.core.quest.QuestInfoDescTitle" focused={focused} onFocus={onFocus} focusField="Detail" />
            <Hotspot active={focused === "Detail"} onClick={() => onFocus("Detail")} className="mb-3 block w-full p-1.5">
              <p className="text-sm leading-relaxed text-[#eeeeee]">{String(quest.Detail || "—")}</p>
            </Hotspot>

            {!!quest.Objective && (
              <Hotspot active={focused === "Objective"} onClick={() => onFocus("Objective")} className="mb-3 block w-full p-1.5">
                <p className="font-display text-sm text-[#ffde00]">{String(quest.Objective)}</p>
              </Hotspot>
            )}

            <div className="mb-3">
              {conditions.length === 0 ? (
                <>
                  <SectionLabel asset="asset.core.quest.necessary" focused={focused} onFocus={onFocus} />
                  <p className="text-xs text-[#cbb892]">{t("quests.conditionsEmpty")}</p>
                  <Button type="button" size="sm" variant="ghost" className="mt-1" onClick={onOpenConditions}>
                    {t("quests.editConditions")}
                  </Button>
                </>
              ) : (
                <>
                  {necessary.length > 0 && (
                    <div className="mb-2">
                      <SectionLabel asset="asset.core.quest.necessary" focused={focused} onFocus={onFocus} />
                      {necessary.map((c) => (
                        <ConditionRow key={String(c.CondictionID)} row={c} onClick={onOpenConditions} />
                      ))}
                    </div>
                  )}
                  {optional.length > 0 && (
                    <div>
                      <SectionLabel asset="asset.core.quest.notNecessary" focused={focused} onFocus={onFocus} />
                      {optional.map((c) => (
                        <ConditionRow key={String(c.CondictionID)} row={c} onClick={onOpenConditions} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <SectionLabel asset="asset.core.quest.RewardText.OptionalTitle" focused={focused} onFocus={onFocus} />
              <div className="mb-2 flex flex-wrap items-center gap-3">
                {activeCurrency.map((c) => (
                  <Hotspot key={c.field} label={`Editar recompensa ${c.title}`} active={focused === c.field} onClick={() => onFocus(c.field)} className="inline-flex items-center gap-1 p-1">
                    <FlashImg module={QUEST_MODULE} className={c.asset} alt={c.title} />
                    <span className="font-mono text-xs text-[#ffde00]">+{String(quest[c.field])}</span>
                  </Hotspot>
                ))}
              </div>
              {goods.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {goods.map((g) => (
                    <GoodsChip key={`${g.QuestID}-${g.RewardItemID}`} row={g} active={false} onFocus={onOpenRewards} />
                  ))}
                </div>
              )}
              {activeCurrency.length === 0 && goods.length === 0 && <p className="text-xs text-[#cbb892]">{t("quests.rewardsEmpty")}</p>}
              <Button type="button" size="sm" variant="ghost" className="mt-2" onClick={onOpenRewards}>
                {t("quests.editRewards")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Per-player progress (status/isComplete in `QuestConditionView.as`) isn't admin data — this is the
 *  condition's definition, always shown as pending, not a specific player's state. Clicking jumps to the
 *  "Condições" tab (conditions are edited there, not in the side panel — see file banner). */
function ConditionRow({ row, onClick }: { row: Row; onClick: () => void }) {
  return (
    <Hotspot onClick={onClick} className="mb-0.5 flex w-full items-center gap-2 px-1.5 py-1 text-left text-sm">
      <span className="size-1.5 shrink-0 rounded-full bg-[#ffde00]" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-[#ffde00]">{String(row.CondictionTitle || "—")}</span>
    </Hotspot>
  );
}

/** Side panel: every editable `quests` field, grouped by `section` — same grouping `SchemaForm` uses — each
 *  wrapped so `focus(name)` (triggered by a preview `Hotspot`) can scroll to it and highlight it. */
/**
 * "Original (VN)" reference (site-admin-redesign, owner's fix #1): `<field>__original` comes from the admin
 * API's translation overlay (`apps/api/src/lib/i18n-admin.ts`) — always the raw vendor `game."Quest"` value,
 * read-only, never what's saved. Shown only when it differs from the current (pt-BR overlay or still-raw)
 * value, so an already-translated field doesn't repeat itself.
 */
function OriginalTextNote({ data, field }: { data: Row; field: string }) {
  const original = data[`${field}__original`];
  if (typeof original !== "string" || !original.trim() || original === data[field]) return null;
  return (
    <p className="mt-1 line-clamp-2 rounded-lg bg-night-deep/50 px-2 py-1 text-xs text-muted" title={original}>
      <span className="font-semibold text-muted/80">Original (VN):</span> {original}
    </p>
  );
}

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
                    <OriginalTextNote data={data} field={f.name} />
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
