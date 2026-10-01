import { Sword } from "lucide-react";
import { defineResource, type FieldOption } from "@/crud/types";

/**
 * Item templates (original table Shop_Goods / ItemTemplateInfo,
 * vendor/DDTank41/SqlDataProvider/Data/ItemTemplateInfo.cs). Field names are camelCase of the C# properties.
 * Category labels are best-effort; confirm against the client before relying on them.
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
  label: { "pt-BR": "Itens", en: "Items" },
  singular: { "pt-BR": "item", en: "item" },
  description: "Modelos de itens: atributos, requisitos e ícone.",
  icon: Sword,
  group: "content",
  idField: "templateId",
  titleField: "name",
  defaultSort: "templateId",
  searchPlaceholder: "Buscar por nome ou ID…",
  fields: [
    { name: "pic", label: "Ícone", type: "image", list: true, uploadFolder: "images/items", section: "Geral" },
    { name: "templateId", label: "TemplateID", type: "number", required: true, list: true, sortable: true, min: 1, form: "create", section: "Geral" },
    { name: "name", label: "Nome", type: "text", required: true, maxLength: 50, list: true, sortable: true, section: "Geral" },
    { name: "categoryId", label: "Categoria", type: "select", required: true, options: ITEM_CATEGORIES, list: true, section: "Geral" },
    { name: "quality", label: "Qualidade", type: "select", required: true, options: QUALITY, list: true, section: "Geral" },
    { name: "needSex", label: "Sexo", type: "select", options: [{ value: 0, label: "Ambos" }, { value: 1, label: "Masculino" }, { value: 2, label: "Feminino" }], default: 0, section: "Geral" },
    { name: "description", label: "Descrição", type: "textarea", section: "Geral" },

    { name: "needLevel", label: "Nível mínimo", type: "number", min: 0, max: 100, default: 1, list: true, sortable: true, section: "Atributos" },
    { name: "level", label: "Nível do item", type: "number", min: 0, default: 1, section: "Atributos" },
    { name: "attack", label: "Ataque", type: "number", min: 0, default: 0, list: true, sortable: true, section: "Atributos" },
    { name: "defence", label: "Defesa", type: "number", min: 0, default: 0, list: true, sortable: true, section: "Atributos" },
    { name: "agility", label: "Agilidade", type: "number", min: 0, default: 0, section: "Atributos" },
    { name: "luck", label: "Sorte", type: "number", min: 0, default: 0, section: "Atributos" },
    { name: "maxCount", label: "Pilha máxima", type: "number", min: 1, default: 1, section: "Atributos" },
    { name: "suitId", label: "Conjunto (SuitId)", type: "number", min: 0, default: 0, section: "Atributos" },

    { name: "canEquip", label: "Equipável", type: "boolean", section: "Regras" },
    { name: "canUse", label: "Usável", type: "boolean", section: "Regras" },
    { name: "canDrop", label: "Pode largar", type: "boolean", section: "Regras" },
    { name: "canDelete", label: "Pode excluir", type: "boolean", default: true, section: "Regras" },
    { name: "canStrengthen", label: "Pode fortalecer", type: "boolean", section: "Regras" },
    { name: "canCompose", label: "Pode compor", type: "boolean", section: "Regras" },
    { name: "bindType", label: "Vínculo", type: "select", options: [{ value: 0, label: "Livre" }, { value: 1, label: "Ao equipar" }, { value: 2, label: "Ao obter" }], default: 0, section: "Regras" },
    { name: "script", label: "Script", type: "text", hint: "Script de efeito (opcional)", section: "Regras" },
  ],
});
