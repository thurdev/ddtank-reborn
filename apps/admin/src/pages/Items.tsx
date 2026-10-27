/**
 * Editor visual de Itens/Loja (site-admin-redesign, editor #4 de `docs/plan/SITE-ADMIN-REDESIGN.md`).
 *
 * Replica a dica de item do jogo (ícone grande, nome colorido pela qualidade, categoria, nível mínimo,
 * atributos ATK/DEF/AGI/SOR, descrição — `shop/view/ShopItemCell.as` + o mesmo resumo que
 * `resources/items.ts` `formataAtributosItem` já usa no picker) como preview, com uma seção "Na loja"
 * (ofertas reais de `game."Shop"` que vendem este `TemplateID`). Mesmo padrão de preview `GamePanel` ao
 * vivo + painel lateral + clique-pra-focar de `pages/Quests.tsx`/`pages/Dungeons.tsx`/`pages/Events.tsx`.
 *
 * O gerador de ícone por IA (`ItemIconGenerator`, já usado no diálogo de edição genérico) entra no painel
 * lateral deste editor também — não dá pra "ver o item como no jogo" sem poder trocar o ícone dele.
 *
 * Como lê esse código (cada variável):
 * - `ItemsPage`: abas Visual/Tabela/Loja.
 * - `ItemEditor`: busca o item (`getQuery`) + ofertas de loja (`listQuery` com `cf_TemplateID`); `useForm` +
 *   `useWatch` pro preview ao vivo (mesmos helpers de `crud/schema.ts`).
 * - `ItemPreview`: `GamePanel` estilo dica de item; `ShopOffer` lista as ofertas reais.
 */
import { useMemo, useRef, useState } from "react";
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
import { Save, Search, ShoppingBag, Sword } from "lucide-react";
import { useI18n, useText } from "@/i18n";
import { getQuery, listQuery, useResourceMutations } from "@/crud/api";
import { FieldInput } from "@/crud/FieldInput";
import { FlashImg } from "@/lib/flashAssets";
import { ResourcePage } from "@/crud/ResourcePage";
import { buildSchema, fieldInForm, fromFormValues, toFormValues } from "@/crud/schema";
import type { FieldDef, Row, Tone } from "@/crud/types";
import { ITEM_CATEGORIES, QUALITY, items } from "@/resources/items";
import { ItemIconGenerator } from "@/resources/ItemIconGenerator";
import { shop } from "@/resources/content";

/** Item tooltip art (`vendor/DDTank41/Source Flash/src/shop/view/ShopItemCell.as` + the generic goods
 * tooltip, `coreiconandtip` module) — only the stat LABELS are real art here (`GoodsLevel` "Nível. Lv.",
 * `GoodsTipItemHert` "Dano", `GoodsTipItemDefence` "Armadura", `GoodsTipItemArmAngle` "Ângulo"), all
 * visually verified pt-BR; no full tooltip frame bitmap was found at a usable size, so the panel chrome
 * stays the same textured-parchment treatment as the quest/dungeon windows for visual consistency. */
const TIP_MODULE = "coreiconandtip";

/** "Original (VN)" reference — same contract as `Quests.tsx`'s `OriginalTextNote` (not shared yet, see that
 *  file's comment on this). */
function OriginalTextNote({ data, field }: { data: Row; field: string }) {
  const original = data[`${field}__original`];
  if (typeof original !== "string" || !original.trim() || original === data[field]) return null;
  return (
    <p className="mt-1 line-clamp-2 rounded-lg bg-night-deep/50 px-2 py-1 text-xs text-muted" title={original}>
      <span className="font-semibold text-muted/80">Original (VN):</span> {original}
    </p>
  );
}

type ItemRow = Row & { TemplateID: number; Name?: string };

function ItemPicker({ selectedId, onSelect }: { selectedId: number | null; onSelect: (id: number) => void }) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery(listQuery(items, { page: 1, pageSize: 50, q: q || undefined, sort: "TemplateID" }));
  const rows = (data?.items ?? []) as ItemRow[];
  return (
    <Card className="flex max-h-[75vh] flex-col overflow-hidden p-0">
      <div className="border-b border-line p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("items.pickerPlaceholder")} aria-label={t("items.pickerPlaceholder")} className="pl-9" />
        </div>
      </div>
      <ul aria-label={t("items.title")} className="flex-1 overflow-y-auto p-2">
        {!isLoading && rows.length === 0 && <li className="p-3 text-sm text-muted">{t("items.pickerEmpty")}</li>}
        {rows.map((r) => (
          <li key={r.TemplateID}>
            <button
              type="button"
              onClick={() => onSelect(r.TemplateID)}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-panel-2",
                selectedId === r.TemplateID && "bg-sun/15 font-semibold text-sun",
              )}
            >
              <img
                src={`/api/admin/item-icons/${r.TemplateID}.png`}
                alt=""
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
                className="size-6 shrink-0 rounded-md border border-line bg-night-deep object-contain"
              />
              <span className="min-w-0 flex-1 truncate">{r.Name || `#${r.TemplateID}`}</span>
              <span className="font-mono text-xs text-muted">#{r.TemplateID}</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** One real shop offer selling this item (`game."Shop"`, filtered by the generic `cf_TemplateID` column
 *  filter — the column is numeric even though the admin `FieldDef` for it is `item-picker`, which is all
 *  the server-side resolver (`admin.ts`) looks at). */
function ShopOffer({ row, onOpen }: { row: Row; onOpen: () => void }) {
  return (
    <Hotspot onClick={onOpen} className="rounded-xl border border-line bg-night-deep/40 p-2">
      <div className="flex items-center gap-2 text-sm">
        <ShoppingBag className="size-3.5 shrink-0 text-sun" aria-hidden />
        <span className="font-semibold text-ink">#{String(row.ShopID)}</span>
        <span className="font-mono text-xs text-muted">{String(row.AUnit ?? 0)}</span>
        {!!row.IsCheap && <Badge tone="coral">%</Badge>}
      </div>
    </Hotspot>
  );
}

function ItemEditor({ templateId, onOpenShop }: { templateId: number; onOpenShop: () => void }) {
  const { t } = useI18n();
  const text = useText();
  const { data, isLoading } = useQuery(getQuery(items, templateId));
  const { data: shopData } = useQuery(listQuery(shop, { page: 1, pageSize: 20, sort: "-ID", extra: { cf_TemplateID: String(templateId) } }));
  const { update } = useResourceMutations(items);

  const fields = useMemo(() => items.fields.filter((f) => fieldInForm(f, "edit")), []);
  const schema = useMemo(() => buildSchema(items.fields, "edit", t, text), [t, text]);
  const defaultValues = useMemo(() => toFormValues(items.fields, data, "edit"), [data]);
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
      await update.mutateAsync({ id: templateId, body: fromFormValues(items.fields, values, "edit") });
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

  const quality = QUALITY.find((o) => String(o.value) === String(live.Quality));
  const category = ITEM_CATEGORIES.find((o) => String(o.value) === String(live.CategoryID));
  // Real label art (`GoodsTipItemHert`/`GoodsTipItemDefence`/`GoodsTipItemArmAngle`, see file banner) for the
  // 3 that have a verified pt-BR bitmap; Luck has none exported at a usable size, stays a plain badge.
  const stats: { key: string; asset?: string; label: string; value: unknown }[] = [
    { key: "Attack", asset: "asset.core.tip.GoodsTipItemHert", label: "Dano", value: live.Attack },
    { key: "Defence", asset: "asset.core.tip.GoodsTipItemDefence", label: "Armadura", value: live.Defence },
    { key: "Agility", asset: "asset.core.tip.GoodsTipItemArmAngle", label: "Ângulo", value: live.Agility },
    { key: "Luck", label: "Sorte", value: live.Luck },
  ].filter((s) => Number(s.value) > 0);
  const shopRows = shopData?.items ?? [];

  return (
    <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div
        className="relative rounded-xl border-[3px] p-4"
        style={{ borderColor: "#8a6a3a", backgroundColor: "#2b1a0e", backgroundRepeat: "repeat", boxShadow: "0 18px 40px -18px rgb(0 0 0 / 0.85)" }}
      >
        <h3 className="mb-3 flex items-center gap-2">
          <Sword className="size-4 shrink-0 text-sun" aria-hidden />
          <Hotspot active={focused === "Name"} onClick={() => focus("Name")} className="title-plate text-base text-[#ffe564]" style={{ textShadow: "0 2px 0 #000" }}>
            {String(live.Name || "—")}
          </Hotspot>
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <Hotspot active={focused === "TemplateID"} onClick={() => focus("TemplateID")} className="p-1">
            <img
              src={`/api/admin/item-icons/${templateId}.png`}
              alt=""
              loading="lazy"
              className="size-20 rounded-xl border-2 border-line bg-night-deep object-contain"
            />
          </Hotspot>
          <div className="flex flex-col gap-1.5">
            <Hotspot active={focused === "Quality"} onClick={() => focus("Quality")}>
              <Badge tone={(quality?.tone as Tone) ?? "neutral"}>{text(quality?.label) || `Qualidade ${live.Quality}`}</Badge>
            </Hotspot>
            <Hotspot active={focused === "CategoryID"} onClick={() => focus("CategoryID")} className="inline-flex items-center gap-1.5 p-0.5">
              <FlashImg module={TIP_MODULE} className="asset.core.tip.GoodsType" alt="Tipo" />
              <Badge tone="sky">{text(category?.label) || `Categoria ${live.CategoryID}`}</Badge>
            </Hotspot>
            <Hotspot active={focused === "NeedLevel"} onClick={() => focus("NeedLevel")} className="inline-flex items-center gap-1.5 p-0.5">
              <FlashImg module={TIP_MODULE} className="asset.core.tip.GoodsLevel" alt="Nível" />
              <span className="font-mono text-sm text-ink">{String(live.NeedLevel ?? 1)}</span>
            </Hotspot>
          </div>
        </div>

        {stats.length > 0 && (
          <div className="mt-3 flex flex-col gap-1.5">
            {stats.map((s) => (
              <Hotspot key={s.key} active={focused === s.key} onClick={() => focus(s.key)} className="inline-flex w-fit items-center gap-2 p-0.5">
                {s.asset ? <FlashImg module={TIP_MODULE} className={s.asset} alt={s.label} /> : <span className="text-xs text-muted">{s.label}</span>}
                <span className="font-mono text-sm text-[#ffde00]">+{String(s.value)}</span>
              </Hotspot>
            ))}
          </div>
        )}

        {!!live.Description && (
          <Hotspot active={focused === "Description"} onClick={() => focus("Description")} className="mt-3 block w-full rounded-lg bg-night-deep/40 p-2">
            <p className="text-sm text-[#eeeeee]">{String(live.Description)}</p>
          </Hotspot>
        )}

        <div className="mt-3 rounded-xl border border-line/70 bg-night-deep/30 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t("items.inShop")}</p>
            <Button type="button" size="sm" variant="ghost" onClick={onOpenShop}>
              {t("items.openShop")}
            </Button>
          </div>
          {shopRows.length === 0 ? (
            <p className="text-xs text-muted">{t("items.notInShop")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {shopRows.map((r) => (
                <ShopOffer key={String(r.ID)} row={r} onOpen={onOpenShop} />
              ))}
            </div>
          )}
        </div>
      </div>
      <Card className="flex max-h-[75vh] flex-col overflow-hidden p-0">
        <div className="flex items-center justify-between gap-2 border-b border-line p-4">
          <h3 className="title-plate text-lg">{t("items.editPanel")}</h3>
          <Button type="submit" size="sm" disabled={formState.isSubmitting || !formState.isDirty}>
            <Save className="size-4" /> {t("crud.save")}
          </Button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <ItemIconGenerator templateId={templateId} iconUrlAtual={`/api/admin/item-icons/${templateId}.png`} />
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
                    <Field label={text(f.label)} htmlFor={`ive-${f.name}`} hint={text(f.hint)}>
                      <Controller
                        control={control}
                        name={f.name}
                        render={({ field }) => (
                          <FieldInput field={f} id={`ive-${f.name}`} mode="edit" value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
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

export function ItemsPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState("visual");
  const [templateId, setTemplateId] = useState<number | null>(null);
  return (
    <div>
      <PageHeader title={t("items.title")} description={t("items.lead")} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="visual">{t("items.visual")}</TabsTrigger>
          <TabsTrigger value="table">{t("items.table")}</TabsTrigger>
          <TabsTrigger value="shop">{t("items.shop")}</TabsTrigger>
        </TabsList>
        <TabsContent value="visual">
          <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <ItemPicker selectedId={templateId} onSelect={setTemplateId} />
            {templateId === null ? <EmptyState title={t("items.none")} /> : <ItemEditor templateId={templateId} onOpenShop={() => setTab("shop")} />}
          </div>
        </TabsContent>
        <TabsContent value="table">
          <ResourcePage def={items} embedded />
        </TabsContent>
        <TabsContent value="shop">
          <ResourcePage def={shop} embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
