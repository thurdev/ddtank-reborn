import { Sword } from "lucide-react";
import { defineResource, type FieldOption } from "@/crud/types";

/**
 * Item templates: game."Shop_Goods" (PK TemplateID) — packages/db/src/schema/game.ts,
 * C#: vendor/DDTank41/SqlDataProvider/Data/ItemTemplateInfo.cs. Column names are kept verbatim.
 * Category labels are best-effort (full list lives in game."Shop_Goods_Categorys").
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
  { value: 13, label: "Traje" },
  { value: 14, label: "Colar" },
  { value: 15, label: "Asas", tone: "grape" },
  { value: 16, label: "Balão de chat" },
  { value: 17, label: "Arma secundária", tone: "coral" },
];

export const QUALITY: FieldOption[] = [
  { value: 1, label: "Comum", tone: "neutral" },
  { value: 2, label: "Incomum", tone: "mint" },
  { value: 3, label: "Raro", tone: "sky" },
  { value: 4, label: "Épico", tone: "grape" },
  { value: 5, label: "Lendário", tone: "sun" },
];

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
  fields: [
    { name: "TemplateID", label: "TemplateID", type: "number", required: true, list: true, sortable: true, min: 1, form: "create", section: "Geral" },
    { name: "Name", label: "Nome", type: "text", required: true, maxLength: 200, list: true, sortable: true, section: "Geral" },
    { name: "CategoryID", label: "Categoria", type: "select", required: true, options: ITEM_CATEGORIES, list: true, sortable: true, section: "Geral" },
    { name: "Quality", label: "Qualidade", type: "select", required: true, options: QUALITY, list: true, section: "Geral" },
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
