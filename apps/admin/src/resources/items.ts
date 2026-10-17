import { createElement } from "react";
import { Store, Sword } from "lucide-react";
import { defineResource, type FieldDef, type FieldOption, type FilterDef, type RowAction } from "@/crud/types";
import type { Row } from "@/crud/types";
import { api } from "@/lib/api";

/**
 * Item templates: game."Shop_Goods" (PK TemplateID) — packages/db/src/schema/game.ts,
 * C#: vendor/DDTank41/SqlDataProvider/Data/ItemTemplateInfo.cs. Column names are kept verbatim.
 * CategoryID mapeado 1:1 de `EquipType.as:163-327` (vendor/DDTank41/Source Flash/src/ddt/data/EquipType.as) —
 * é a mesma categoria que `item-icon.ts` usa p/ resolver o ícone, por isso cobre tudo (equipáveis + consumíveis
 * + prop de pet/fazenda), não só o agrupamento de abas da loja (esse outro é `game."Shop_Goods_Categorys"`).
 */
export const ITEM_CATEGORIES: FieldOption[] = [
  { value: 1, label: "Chapéu" },
  { value: 2, label: "Óculos" },
  { value: 3, label: "Cabelo" },
  { value: 4, label: "Olhos" },
  { value: 5, label: "Roupa" },
  { value: 6, label: "Rosto" },
  { value: 7, label: "Arma", tone: "coral" },
  { value: 8, label: "Bracelete" },
  { value: 9, label: "Anel" },
  { value: 10, label: "Item de batalha", tone: "sky" },
  { value: 11, label: "Consumível / material", tone: "mint" },
  { value: 12, label: "Tarefa (missão)" },
  { value: 13, label: "Traje" },
  { value: 14, label: "Colar" },
  { value: 15, label: "Asas", tone: "grape" },
  { value: 16, label: "Balão de chat" },
  { value: 17, label: "Arma secundária", tone: "coral" },
  { value: 18, label: "Caixa de carta" },
  { value: 19, label: "Pedra de cura" },
  { value: 20, label: "Exp. de item" },
  { value: 21, label: "Catharine" },
  { value: 23, label: "Exp. de item (tarefa)" },
  { value: 24, label: "Carta de título" },
  { value: 25, label: "Pacote de presente" },
  { value: 26, label: "Carta equipável" },
  { value: 27, label: "Arma temporária", tone: "coral" },
  { value: 28, label: "Bracelete temporário" },
  { value: 29, label: "Anel temporário" },
  { value: 30, label: "Tarefa ativa / efeito" },
  { value: 31, label: "Arma secundária temporária", tone: "coral" },
  { value: 32, label: "Semente" },
  { value: 33, label: "Adubo" },
  { value: 34, label: "Comida" },
  { value: 35, label: "Ovo de pet" },
  { value: 36, label: "Vegetal" },
  { value: 40, label: "Emblema" },
  { value: 50, label: "Equip. de pet (braço)" },
  { value: 51, label: "Equip. de pet (cabeça)" },
  { value: 52, label: "Equip. de pet (roupa)" },
];

export const QUALITY: FieldOption[] = [
  { value: 1, label: "Comum", tone: "neutral" },
  { value: 2, label: "Incomum", tone: "mint" },
  { value: 3, label: "Raro", tone: "sky" },
  { value: 4, label: "Épico", tone: "grape" },
  { value: 5, label: "Lendário", tone: "sun" },
];

export const SEX_OPTIONS: FieldOption[] = [
  { value: 0, label: "Ambos" },
  { value: 1, label: "Masculino" },
  { value: 2, label: "Feminino" },
];

/** Moeda da oferta (ShopMgr.GetItemPrice, apps/game/src/handlers/shop-prop.ts:35-51 — código negativo = "balde"). */
export const SHOP_CURRENCY_OPTIONS: FieldOption[] = [
  { value: -3, label: "Ouro (Gold)" },
  { value: -1, label: "Cupom (Money)" },
  { value: -2, label: "Mérito (Offer)" },
  { value: -4, label: "Medalhas (GiftToken)" },
  { value: -6, label: "Medal" },
];

/**
 * Coluna "Ícone" da tabela (lista): `iconUrl` vem do overlay do backend (`/api/admin/item-icons/:templateId.png`,
 * rota pública — por isso dá pra usar direto num `<img>`). Lazy + 40px (`size-10`) + placeholder "—" atrás do
 * `<img>` (fica visível quando o ícone não existe/404, já que o `onError` só esconde a própria imagem).
 * Como lê esse código (cada variável): `row` linha atual (usa só `row.iconUrl`); função plana (sem hook/estado)
 * igual `MapPreview` de `resources/content.ts`, por isso o arquivo continua `.ts` (sem JSX).
 */
function ItemIconPreview(_v: unknown, row: Row) {
  return createElement(
    "span",
    { className: "relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-night-deep" },
    createElement("span", { className: "absolute font-mono text-[9px] text-muted" }, "—"),
    createElement("img", {
      src: String(row.iconUrl ?? ""),
      alt: "",
      loading: "lazy",
      onError: (e: { currentTarget: HTMLImageElement }) => {
        e.currentTarget.style.display = "none";
      },
      className: "relative z-10 size-full object-contain",
    }),
  );
}

/**
 * Tile da "Grade de ícones" (`gridView`, ~120/página): ícone 64px + nome curto, com TemplateID como placeholder
 * atrás do ícone (igual `ItemIconPreview`) e no `title` (tooltip) — herdado do wrapper `<button>` do `ResourcePage`
 * (`${rowTitle} · #${id}`), então aqui só monta o conteúdo visual. Clique abre a edição (feito pelo `ResourcePage`).
 */
function ItemTile(row: Row) {
  return createElement(
    "span",
    { className: "flex w-full flex-col items-center gap-1" },
    createElement(
      "span",
      { className: "relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-night-deep" },
      createElement("span", { className: "absolute font-mono text-[10px] text-muted" }, `#${String(row.TemplateID ?? "")}`),
      createElement("img", {
        src: String(row.iconUrl ?? ""),
        alt: "",
        loading: "lazy",
        onError: (e: { currentTarget: HTMLImageElement }) => {
          e.currentTarget.style.display = "none";
        },
        className: "relative z-10 size-full object-contain",
      }),
    ),
    createElement(
      "span",
      { className: "line-clamp-2 w-full px-0.5 text-center text-[11px] leading-tight text-ink" },
      String(row.Name ?? `#${String(row.TemplateID ?? "")}`),
    ),
  );
}

/**
 * Filtros server-side da página Itens (toolbar, enviados como query params pelo `ResourcePage` via `extra`),
 * cruzados no backend em `apps/api/src/routes/admin.ts` (bloco "Filtros extras da página Itens"):
 * `category`/`sex`/`quality` = igualdade; `levelMin`/`levelMax`/`idMin`/`idMax` = faixa; `inShop` = existe/não
 * existe em `game."Shop"` (a tabela que o jogo lê em `ShopItemList.ashx` — é o pedido do dono de achar trajes
 * antigos que existem mas não estão na loja).
 */
export const ITEM_FILTERS: FilterDef[] = [
  { name: "category", label: "Categoria", type: "select", options: ITEM_CATEGORIES },
  { name: "sex", label: "Sexo", type: "select", options: SEX_OPTIONS },
  { name: "quality", label: "Qualidade", type: "select", options: QUALITY },
  {
    name: "inShop",
    label: "Na loja?",
    type: "select",
    options: [
      { value: "1", label: "Sim" },
      { value: "0", label: "Não" },
    ],
  },
  { name: "levelMin", label: "Nível mín.", type: "number", placeholder: "Nv mín" },
  { name: "levelMax", label: "Nível máx.", type: "number", placeholder: "Nv máx" },
  { name: "idMin", label: "TemplateID mín.", type: "number", placeholder: "ID mín" },
  { name: "idMax", label: "TemplateID máx.", type: "number", placeholder: "ID máx" },
];

/**
 * Campos do diálogo "Adicionar à loja" (ação de linha/tile): cria uma oferta em `game."Shop"` pro item clicado.
 * `ShopID`/`TemplateID` reais ficam de fora — `ShopID` o admin escolhe (aba da loja), `TemplateID`/`ID` o backend
 * preenche (`POST /api/admin/items/:templateId/add-to-shop`, ver admin.ts). Mesmos nomes de `resources/content.ts`
 * (`shop.fields`) pra bater 1:1 com as colunas de `game."Shop"`.
 */
const ADD_TO_SHOP_FIELDS: FieldDef[] = [
  { name: "ShopID", label: "ShopID (aba)", type: "number", required: true, min: 1, default: 1, hint: "Aba da loja onde o item aparece (igual ao campo ShopID do recurso Loja)." },
  { name: "BuyType", label: "BuyType", type: "number", default: 0, hint: "Tipo de moeda/compra, como no original." },
  { name: "AUnit", label: "AUnit", type: "number", default: 1, section: "Preços / validade" },
  { name: "BUnit", label: "BUnit", type: "number", default: 0, section: "Preços / validade" },
  { name: "CUnit", label: "CUnit", type: "number", default: 0, section: "Preços / validade" },
  { name: "Beat", label: "Beat (desconto)", type: "number", int: false, default: 1, section: "Preços / validade" },
  { name: "Sort", label: "Ordem", type: "number", default: 0, section: "Exibição" },
  { name: "LimitCount", label: "Limite de compras", type: "number", default: -1, section: "Exibição" },
  { name: "LimitGrade", label: "Nível mínimo p/ comprar", type: "number", default: 0, section: "Exibição" },
  { name: "CanBuy", label: "À venda", type: "boolean", default: true, section: "Exibição" },
];

export const addToShopAction: RowAction = {
  id: "add-to-shop",
  label: "Adicionar à loja",
  icon: Store,
  tone: "primary",
  path: "add-to-shop",
  fields: ADD_TO_SHOP_FIELDS,
  success: "Item adicionado à loja",
};

/**
 * Resumo de item p/ o picker (só leitura, mesmo contrato REST).
 * Como lê esse código (cada variável):
 * - `TemplateID`: PK em `game."Shop_Goods"`, valor gravado no formulário.
 * - `Name`: nome exibido no picker e na busca `q`.
 * - `CategoryID`/`Quality`/`NeedLevel`: filtros visuais na lista.
 * - `Attack`/`Defence`/`Agility`/`Luck`: atributos exibidos abaixo do nome.
 * - `iconUrl`: ícone (`/api/admin/item-icons/:templateId.png`, vazio = sem ícone).
 */
export interface ItemResumo {
  TemplateID: number;
  Name: string;
  iconUrl?: string;
  CategoryID?: number;
  Quality?: number;
  NeedLevel?: number;
  Attack?: number;
  Defence?: number;
  Agility?: number;
  Luck?: number;
}

const numOuNulo = (v: unknown): number | undefined => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const linhaParaResumo = (linha: Row): ItemResumo => ({
  TemplateID: Number(linha.TemplateID),
  Name: String(linha.Name ?? ""),
  iconUrl: String(linha.iconUrl ?? ""),
  CategoryID: numOuNulo(linha.CategoryID),
  Quality: numOuNulo(linha.Quality),
  NeedLevel: numOuNulo(linha.NeedLevel),
  Attack: numOuNulo(linha.Attack),
  Defence: numOuNulo(linha.Defence),
  Agility: numOuNulo(linha.Agility),
  Luck: numOuNulo(linha.Luck),
});

/**
 * Texto curto `Nome + atributos` do picker.
 * Como lê esse código (cada variável):
 * - `item`: resumo vindo do lookup.
 * - `partes`: fragmentos `Nv/ATK/DEF/AGI/SOR` filtrados (só valores > 0).
 */
export function formataAtributosItem(item: ItemResumo): string {
  const partes: string[] = [`#${item.TemplateID}`];
  if ((item.NeedLevel ?? 0) > 0) partes.push(`Nv ${item.NeedLevel}`);
  if ((item.Attack ?? 0) > 0) partes.push(`ATK ${item.Attack}`);
  if ((item.Defence ?? 0) > 0) partes.push(`DEF ${item.Defence}`);
  if ((item.Agility ?? 0) > 0) partes.push(`AGI ${item.Agility}`);
  if ((item.Luck ?? 0) > 0) partes.push(`SOR ${item.Luck}`);
  return partes.join(" • ");
}

/**
 * Busca itens por nome via `GET /api/admin/items?q=...` (sem mudar REST).
 * Como lê esse código (cada variável):
 * - `termo`: texto digitado no picker, enviado como `q`.
 * - `limite`: `pageSize` da listagem (padrão 20).
 * - `categoryIds`: filtro opcional por `CategoryID` (ex. picker de arma só mostra categoria 7/27), enviado como `category`.
 * - `qs`: query string `page/pageSize/q/category` do contrato atual.
 */
export async function searchItensPorNome(termo: string, limite = 20, categoryIds?: number[]): Promise<ItemResumo[]> {
  const q = termo.trim();
  if (!q) return [];
  const qs = new URLSearchParams({ page: "1", pageSize: String(limite), q });
  if (categoryIds?.length) qs.set("category", categoryIds.join(","));
  const res = await api.get<{ items: Row[] }>(`/api/admin/items?${qs}`);
  return (res.items ?? []).map(linhaParaResumo);
}

/**
 * Lê um item pelo `TemplateID` p/ exibir o atual selecionado.
 * Como lê esse código (cada variável):
 * - `templateId`: PK digitada/selecionada no formulário.
 * - retorno: resumo ou `null` (id vazio/inválido ou 404).
 */
export async function getItemPorTemplateId(templateId: number): Promise<ItemResumo | null> {
  if (!Number.isFinite(templateId) || templateId <= 0) return null;
  try {
    const linha = await api.get<Row>(`/api/admin/items/${encodeURIComponent(String(Math.trunc(templateId)))}`);
    if (!linha || linha.TemplateID === undefined) return null;
    return linhaParaResumo(linha);
  } catch {
    return null;
  }
}

/**
 * Cache (por sessão da aba) de lookups de item por `TemplateID`, compartilhado entre o picker (form) e a
 * célula da lista (muitas linhas podem repetir o mesmo item, ex. mesma arma em vários bots).
 * Como lê esse código (cada variável): `lookupCache` mapa TemplateID -> Promise do resumo (memoiza em voo).
 */
const lookupCache = new Map<number, Promise<ItemResumo | null>>();
export function getItemCached(templateId: number): Promise<ItemResumo | null> {
  if (!Number.isFinite(templateId) || templateId <= 0) return Promise.resolve(null);
  let p = lookupCache.get(templateId);
  if (!p) {
    p = getItemPorTemplateId(templateId);
    lookupCache.set(templateId, p);
  }
  return p;
}

export const items = defineResource({
  name: "items",
  table: 'game."Shop_Goods"',
  label: { "pt-BR": "Itens", en: "Items" },
  singular: { "pt-BR": "item", en: "item" },
  description: "Modelos de itens (Shop_Goods): atributos, requisitos e regras.",
  icon: Sword,
  group: "content",
  idField: "TemplateID",
  titleField: "Name",
  defaultSort: "TemplateID",
  searchPlaceholder: "Buscar por nome ou TemplateID…",
  filters: ITEM_FILTERS,
  gridView: { pageSize: 120, render: ItemTile },
  rowActions: [addToShopAction],
  fields: [
    { name: "_icon", label: "Ícone", type: "image", list: true, form: false, render: ItemIconPreview },
    { name: "TemplateID", label: "TemplateID", type: "number", list: true, sortable: true, min: 1, form: "create", section: "Geral", hint: "Em branco = gera o próximo ID livre automaticamente." },
    { name: "Name", label: "Nome", type: "text", required: true, maxLength: 200, list: true, sortable: true, section: "Geral" },
    { name: "CategoryID", label: "Categoria", type: "select", required: true, options: ITEM_CATEGORIES, list: true, sortable: true, section: "Geral" },
    { name: "Quality", label: "Qualidade", type: "select", required: true, options: QUALITY, list: true, section: "Geral" },
    { name: "inShop", label: "Na loja?", type: "boolean", list: true, form: false, section: "Geral" },
    { name: "Pic", label: "Pic (recurso)", type: "text", hint: "Nome da pasta/arquivo de imagem no CDN do cliente", list: true, section: "Geral" },
    { name: "NeedSex", label: "Sexo", type: "select", options: [{ value: 0, label: "Ambos" }, { value: 1, label: "Masculino" }, { value: 2, label: "Feminino" }], default: 0, section: "Geral" },
    { name: "Price", label: "Preço base", type: "number", min: 0, default: 0, section: "Geral" },
    { name: "Description", label: "Descrição", type: "textarea", section: "Geral" },
    { name: "Remark", label: "Observação", type: "text", section: "Geral" },

    { name: "NeedLevel", label: "Nível mínimo", type: "number", min: 0, max: 100, default: 1, list: true, sortable: true, section: "Atributos" },
    { name: "Level", label: "Nível do item", type: "number", min: 0, default: 1, section: "Atributos" },
    { name: "Attack", label: "Ataque", type: "number", min: 0, default: 0, list: true, sortable: true, section: "Atributos" },
    { name: "Defence", label: "Defesa", type: "number", min: 0, default: 0, list: true, sortable: true, section: "Atributos" },
    { name: "Agility", label: "Agilidade", type: "number", min: 0, default: 0, section: "Atributos" },
    { name: "Luck", label: "Sorte", type: "number", min: 0, default: 0, section: "Atributos" },
    { name: "MaxCount", label: "Pilha máxima", type: "number", min: 1, default: 1, section: "Atributos" },
    { name: "SuitId", label: "Conjunto (SuitId)", type: "number", min: 0, default: 0, section: "Atributos" },
    { name: "Hole", label: "Buracos (Hole)", type: "text", section: "Atributos" },
    { name: "Data", label: "Data", type: "text", hint: "Parâmetro específico da categoria", section: "Atributos" },

    { name: "CanEquip", label: "Equipável", type: "boolean", section: "Regras" },
    { name: "CanUse", label: "Usável", type: "boolean", section: "Regras" },
    { name: "CanDrop", label: "Pode largar", type: "boolean", section: "Regras" },
    { name: "CanDelete", label: "Pode excluir", type: "boolean", default: true, section: "Regras" },
    { name: "CanStrengthen", label: "Pode fortalecer", type: "boolean", section: "Regras" },
    { name: "CanCompose", label: "Pode compor", type: "boolean", section: "Regras" },
    { name: "BindType", label: "Vínculo (BindType)", type: "number", min: 0, default: 0, section: "Regras" },
    { name: "FusionType", label: "FusionType", type: "number", min: 0, default: 0, section: "Regras" },
    { name: "RefineryLevel", label: "RefineryLevel", type: "number", min: 0, default: 0, section: "Regras" },
    { name: "Script", label: "Script", type: "text", hint: "Script de efeito (opcional)", section: "Regras" },
  ],
});
