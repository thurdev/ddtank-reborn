/**
 * Editor visual de NPCs/Bosses (site-admin-redesign, editor #5 de `docs/plan/SITE-ADMIN-REDESIGN.md`).
 *
 * Preview: ficha de combate do NPC (nome, nível, vida/ataque/defesa/agilidade/sorte, EXP, projétil) + o
 * pool de drop real (`game."Drop_Item"` filtrado por `DropId` — `NPC_Info.DropId` É o `Drop_Condiction.
 * DropID`, `CondictionType` 3 "NPC", `docs/guides/pve.md` §4 — mais direto que o de Missões, que precisa
 * casar por `Para1`). Mesmo padrão de preview `GamePanel` ao vivo + painel lateral + clique-pra-focar.
 *
 * Arte real do NPC (`ResourcesPath`, um `.swf` Flash tipo `image/game/living/Living002.swf`) **não** entra
 * no preview: não existe rota que exporte um frame/thumbnail dele pra PNG (diferente de item/mapa, que já
 * têm `/api/admin/item-icons`/`map-icons`) — construir isso exigiria o pipeline de export de SWF
 * (`tools/swf-export`, fora do escopo read-only do vendor nesta tarefa). O preview mostra `ModelID`/
 * `ResourcesPath` como texto focável em vez de inventar um caminho de imagem incerto.
 *
 * Como lê esse código (cada variável):
 * - `NpcsPage`: abas Visual/Tabela/Drops.
 * - `NpcEditor`: busca o NPC (`getQuery`) + drop pool (`listQuery` com `cf_DropId`); `useForm` + `useWatch`
 *   pro preview ao vivo (mesmos helpers de `crud/schema.ts`).
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
import { Save, Search, Skull, Sword, Zap } from "lucide-react";
import { useI18n, useText } from "@/i18n";
import { getQuery, listQuery, useResourceMutations } from "@/crud/api";
import { FieldInput } from "@/crud/FieldInput";
import { FlashImg } from "@/lib/flashAssets";
import { ResourcePage } from "@/crud/ResourcePage";
import { buildSchema, fieldInForm, fromFormValues, toFormValues } from "@/crud/schema";
import type { FieldDef, Row } from "@/crud/types";
import { getItemCached, type ItemResumo } from "@/resources/items";
import { dropItems } from "@/resources/drops";
import { npcs } from "@/resources/content";

/** Combat-sheet labels (generic item/goods tooltip module, reused here: a monster's stat block uses the
 * same "Vida"/"Nível"/"Dano" vocabulary as an item tooltip) — `asset.core.tip.hp` ("Vida"),
 * `asset.core.tip.GoodsLevel` ("Nível. Lv."), `asset.core.tip.GoodsTipItemHert` ("Dano"), all visually
 * verified pt-BR (same module `Items.tsx` uses — see that file's banner). No real art module was found
 * specifically for the in-room NPC nameplate/HP bar, so this reuses the tooltip vocabulary instead of
 * guessing at an asset that doesn't exist. */
const TIP_MODULE = "coreiconandtip";

/** "Original (VN)" reference — same contract as `Quests.tsx`'s `OriginalTextNote`. */
function OriginalTextNote({ data, field }: { data: Row; field: string }) {
  const original = data[`${field}__original`];
  if (typeof original !== "string" || !original.trim() || original === data[field]) return null;
  return (
    <p className="mt-1 line-clamp-2 rounded-lg bg-night-deep/50 px-2 py-1 text-xs text-muted" title={original}>
      <span className="font-semibold text-muted/80">Original (VN):</span> {original}
    </p>
  );
}

type NpcRow = Row & { ID: number; Name?: string };

function NpcPicker({ selectedId, onSelect }: { selectedId: number | null; onSelect: (id: number) => void }) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery(listQuery(npcs, { page: 1, pageSize: 50, q: q || undefined, sort: "ID" }));
  const rows = (data?.items ?? []) as NpcRow[];
  return (
    <Card className="flex max-h-[75vh] flex-col overflow-hidden p-0">
      <div className="border-b border-line p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("npcs.pickerPlaceholder")} aria-label={t("npcs.pickerPlaceholder")} className="pl-9" />
        </div>
      </div>
      <ul aria-label={t("npcs.title")} className="flex-1 overflow-y-auto p-2">
        {!isLoading && rows.length === 0 && <li className="p-3 text-sm text-muted">{t("npcs.pickerEmpty")}</li>}
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
              <Skull className="size-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{r.Name || `#${r.ID}`}</span>
              <span className="font-mono text-xs text-muted">#{r.ID}</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function DropIcon({ templateId }: { templateId: number }) {
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

function NpcEditor({ npcId, onOpenDrops }: { npcId: number; onOpenDrops: () => void }) {
  const { t } = useI18n();
  const text = useText();
  const { data, isLoading } = useQuery(getQuery(npcs, npcId));
  const { update } = useResourceMutations(npcs);

  const fields = useMemo(() => npcs.fields.filter((f) => fieldInForm(f, "edit")), []);
  const schema = useMemo(() => buildSchema(npcs.fields, "edit", t, text), [t, text]);
  const defaultValues = useMemo(() => toFormValues(npcs.fields, data, "edit"), [data]);
  const { control, handleSubmit, formState } = useForm<Row>({
    resolver: zodResolver(schema) as unknown as Resolver<Row>,
    defaultValues,
    values: defaultValues,
    resetOptions: { keepDirtyValues: false },
  });
  const live = useWatch({ control });
  const dropId = Number(live.DropId) || 0;
  const { data: dropData } = useQuery({ ...listQuery(dropItems, { page: 1, pageSize: 20, sort: "Id", extra: { cf_DropId: String(dropId) } }), enabled: dropId > 0 });

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
      await update.mutateAsync({ id: npcId, body: fromFormValues(npcs.fields, values, "edit") });
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

  const dropRows = dropData?.items ?? [];
  const isBoss = Number(live.Level ?? 0) >= 30 || /boss|chefe/i.test(String(live.Script ?? ""));

  return (
    <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div
        className="relative rounded-xl border-[3px] p-4"
        style={{ borderColor: "#8a6a3a", backgroundColor: "#2b1a0e", boxShadow: "0 18px 40px -18px rgb(0 0 0 / 0.85)" }}
      >
        <h3 className="mb-3 flex items-center gap-2">
          {isBoss ? <Skull className="size-4 shrink-0 text-coral" aria-hidden /> : <Sword className="size-4 shrink-0 text-sun" aria-hidden />}
          <Hotspot active={focused === "Name"} onClick={() => focus("Name")} className="title-plate text-base text-[#ffe564]" style={{ textShadow: "0 2px 0 #000" }}>
            {String(live.Name || "—")}
          </Hotspot>
        </h3>
        <div className="flex flex-wrap gap-3">
          <Hotspot active={focused === "Level"} onClick={() => focus("Level")}>
            <Badge tone="sky">{t("npcs.level", { n: String(live.Level ?? 1) })}</Badge>
          </Hotspot>
          <Hotspot active={focused === "Blood"} onClick={() => focus("Blood")} className="inline-flex items-center gap-1.5 p-0.5">
            <FlashImg module={TIP_MODULE} className="asset.core.tip.hp" alt="Vida" />
            <span className="font-mono text-sm text-[#ffde00]">{String(live.Blood ?? 0)}</span>
          </Hotspot>
          <Hotspot active={focused === "Attack"} onClick={() => focus("Attack")} className="inline-flex items-center gap-1.5 p-0.5">
            <FlashImg module={TIP_MODULE} className="asset.core.tip.GoodsTipItemHert" alt="Dano" />
            <span className="font-mono text-sm text-[#ffde00]">{String(live.Attack ?? 0)}</span>
          </Hotspot>
          <Hotspot active={focused === "Experience"} onClick={() => focus("Experience")}>
            <Badge tone="mint">
              <Zap className="size-3" aria-hidden /> {String(live.Experience ?? 0)}
            </Badge>
          </Hotspot>
        </div>

        <Hotspot active={focused === "ResourcesPath"} onClick={() => focus("ResourcesPath")} className="mt-3 flex items-center gap-3 rounded-lg bg-night-deep/40 p-2">
          <span className="grid size-16 shrink-0 place-items-center rounded-xl border-2 border-dashed border-line bg-night-deep/50 text-muted">
            {isBoss ? <Skull className="size-8" aria-hidden /> : <Sword className="size-8" aria-hidden />}
          </span>
          <div className="text-xs text-muted">
            <p className="font-mono">{String(live.ModelID || "—")}</p>
            <p className="font-mono">{String(live.ResourcesPath || "—")}</p>
            <p className="mt-1">{t("npcs.artNote")}</p>
          </div>
        </Hotspot>

        {!!live.Script && (
          <Hotspot active={focused === "Script"} onClick={() => focus("Script")} className="mt-2 block w-fit p-1">
            <span className="font-mono text-xs text-sky">{String(live.Script)}</span>
          </Hotspot>
        )}

        <div className="mt-3 rounded-xl border border-line/70 bg-night-deep/30 p-3">
          <div className="mb-2 flex items-center justify-between">
            <Hotspot active={focused === "DropId"} onClick={() => focus("DropId")}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t("npcs.drops")}</p>
            </Hotspot>
            <Button type="button" size="sm" variant="ghost" onClick={onOpenDrops}>
              {t("npcs.editDrops")}
            </Button>
          </div>
          {dropRows.length === 0 ? (
            <p className="text-xs text-muted">{t("npcs.dropsEmpty")}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {dropRows.map((r) => (
                <DropIcon key={String(r.Id)} templateId={Number(r.ItemId)} />
              ))}
            </div>
          )}
        </div>
      </div>
      <Card className="flex max-h-[75vh] flex-col overflow-hidden p-0">
        <div className="flex items-center justify-between gap-2 border-b border-line p-4">
          <h3 className="title-plate text-lg">{t("npcs.editPanel")}</h3>
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
                    <Field label={text(f.label)} htmlFor={`nve-${f.name}`} hint={text(f.hint)}>
                      <Controller
                        control={control}
                        name={f.name}
                        render={({ field }) => (
                          <FieldInput field={f} id={`nve-${f.name}`} mode="edit" value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
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

export function NpcsPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState("visual");
  const [npcId, setNpcId] = useState<number | null>(null);
  return (
    <div>
      <PageHeader title={t("npcs.title")} description={t("npcs.lead")} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="visual">{t("npcs.visual")}</TabsTrigger>
          <TabsTrigger value="table">{t("npcs.table")}</TabsTrigger>
          <TabsTrigger value="drops">{t("npcs.drops")}</TabsTrigger>
        </TabsList>
        <TabsContent value="visual">
          <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <NpcPicker selectedId={npcId} onSelect={setNpcId} />
            {npcId === null ? <EmptyState title={t("npcs.none")} /> : <NpcEditor npcId={npcId} onOpenDrops={() => setTab("drops")} />}
          </div>
        </TabsContent>
        <TabsContent value="table">
          <ResourcePage def={npcs} embedded />
        </TabsContent>
        <TabsContent value="drops">
          <ResourcePage def={dropItems} embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
