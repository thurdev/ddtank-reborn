import { CalendarDays, Castle, ScrollText, ShoppingBag } from "lucide-react";
import { defineResource, type FieldOption } from "@/crud/types";

export const shop = defineResource({
  name: "shop",
  label: { "pt-BR": "Loja", en: "Shop" },
  singular: { "pt-BR": "oferta", en: "offer" },
  description: "Itens à venda na loja do jogo, preços e validade.",
  icon: ShoppingBag,
  group: "content",
  idField: "id",
  titleField: "itemName",
  defaultSort: "-id",
  fields: [
    { name: "id", label: "ID", type: "number", list: true, sortable: true, form: false },
    { name: "templateId", label: "TemplateID do item", type: "number", required: true, min: 1, list: true },
    { name: "itemName", label: "Item", type: "text", list: true, sortable: true, readOnly: true, form: "edit" },
    {
      name: "shopType",
      label: "Aba da loja",
      type: "select",
      required: true,
      list: true,
      options: [
        { value: "weapon", label: "Armas", tone: "coral" },
        { value: "equip", label: "Equipamentos", tone: "sky" },
        { value: "beauty", label: "Visual", tone: "grape" },
        { value: "prop", label: "Itens", tone: "mint" },
        { value: "special", label: "Especial", tone: "sun" },
      ],
    },
    {
      name: "currency",
      label: "Moeda",
      type: "select",
      required: true,
      list: true,
      options: [
        { value: "money", label: "Cupons", tone: "sky" },
        { value: "gold", label: "Ouro", tone: "sun" },
        { value: "giftToken", label: "Medalhas", tone: "grape" },
      ],
    },
    { name: "price", label: "Preço", type: "number", required: true, min: 0, list: true, sortable: true },
    { name: "validDays", label: "Validade (dias)", type: "number", min: 0, default: 0, hint: "0 = permanente", list: true },
    { name: "discount", label: "Desconto (%)", type: "number", min: 0, max: 100, default: 0 },
    { name: "sortOrder", label: "Ordem", type: "number", default: 0, sortable: true },
    { name: "onSale", label: "À venda", type: "boolean", default: true, list: true, inlineToggle: true },
  ],
});

const QUEST_TYPES: FieldOption[] = [
  { value: "main", label: "Principal", tone: "sun" },
  { value: "branch", label: "Secundária", tone: "sky" },
  { value: "daily", label: "Diária", tone: "mint" },
  { value: "guild", label: "Guilda", tone: "grape" },
  { value: "event", label: "Evento", tone: "coral" },
];

export const quests = defineResource({
  name: "quests",
  label: { "pt-BR": "Missões", en: "Quests" },
  singular: { "pt-BR": "missão", en: "quest" },
  description: "Missões e tarefas: requisitos, condições e recompensas.",
  icon: ScrollText,
  group: "content",
  idField: "id",
  titleField: "title",
  defaultSort: "id",
  fields: [
    { name: "id", label: "ID", type: "number", list: true, sortable: true, required: true, form: "create" },
    { name: "title", label: "Título", type: "text", required: true, list: true, sortable: true, span: 2 },
    { name: "type", label: "Tipo", type: "select", required: true, options: QUEST_TYPES, list: true },
    { name: "levelMin", label: "Nível mín.", type: "number", min: 1, max: 100, default: 1, list: true },
    { name: "levelMax", label: "Nível máx.", type: "number", min: 1, max: 100, default: 100 },
    { name: "preQuestIds", label: "Missões anteriores (IDs)", type: "tags" },
    { name: "description", label: "Descrição", type: "textarea" },
    {
      name: "conditions",
      label: "Condições",
      type: "json",
      default: [{ type: "win_pvp", target: 0, count: 3 }],
      hint: "Lista de condições (tipo, alvo, quantidade).",
    },
    { name: "rewardExp", label: "EXP", type: "number", min: 0, default: 0, section: "Recompensas", list: true },
    { name: "rewardGold", label: "Ouro", type: "number", min: 0, default: 0, section: "Recompensas" },
    { name: "rewardMoney", label: "Cupons", type: "number", min: 0, default: 0, section: "Recompensas" },
    { name: "rewardItems", label: "Itens", type: "json", default: [], section: "Recompensas", hint: '[{"templateId": 11020, "count": 1, "validDays": 0}]' },
    { name: "repeatable", label: "Repetível", type: "boolean", section: "Recompensas" },
    { name: "active", label: "Ativa", type: "boolean", default: true, list: true, inlineToggle: true },
  ],
});

export const EVENT_TYPES: FieldOption[] = [
  { value: "exp", label: "EXP em dobro", tone: "mint" },
  { value: "gold", label: "Bônus de ouro", tone: "sun" },
  { value: "drop", label: "Bônus de drop", tone: "sky" },
  { value: "login", label: "Recompensa de login", tone: "grape" },
  { value: "boss", label: "Chefe mundial", tone: "coral" },
  { value: "tournament", label: "Torneio PvP", tone: "coral" },
  { value: "holiday", label: "Data comemorativa", tone: "neutral" },
];

export const events = defineResource({
  name: "events",
  label: { "pt-BR": "Eventos", en: "Events" },
  singular: { "pt-BR": "evento", en: "event" },
  icon: CalendarDays,
  group: "content",
  hidden: true, // shown through the custom /events page (calendar + table)
  idField: "id",
  titleField: "name",
  defaultSort: "startAt",
  fields: [
    { name: "id", label: "ID", type: "number", list: false, form: false },
    { name: "name", label: "Nome", type: "text", required: true, list: true, sortable: true, span: 2 },
    { name: "type", label: "Tipo", type: "select", required: true, options: EVENT_TYPES, list: true },
    { name: "multiplier", label: "Multiplicador", type: "number", int: false, step: 0.1, min: 1, max: 10, default: 2, list: true },
    { name: "startAt", label: "Início", type: "datetime", required: true, list: true, sortable: true },
    { name: "endAt", label: "Fim", type: "datetime", required: true, list: true, sortable: true },
    { name: "color", label: "Cor no calendário", type: "color", default: "#ffc531" },
    { name: "description", label: "Descrição", type: "textarea" },
    { name: "config", label: "Parâmetros extras", type: "json", default: {} },
    { name: "active", label: "Ativo", type: "boolean", default: true, list: true, inlineToggle: true },
  ],
});

export const dungeons = defineResource({
  name: "dungeons",
  label: { "pt-BR": "Masmorras PvE", en: "PvE dungeons" },
  singular: { "pt-BR": "masmorra", en: "dungeon" },
  description: "Missões cooperativas contra NPCs: mapa, dificuldades, script de IA e recompensas.",
  icon: Castle,
  group: "content",
  idField: "id",
  titleField: "name",
  defaultSort: "levelLimit",
  fields: [
    { name: "pic", label: "Imagem", type: "image", list: true, uploadFolder: "images/pve" },
    { name: "id", label: "ID", type: "number", required: true, list: true, sortable: true, form: "create" },
    { name: "name", label: "Nome", type: "text", required: true, list: true, sortable: true },
    { name: "mapId", label: "Mapa (MapID)", type: "number", required: true, min: 0 },
    { name: "levelLimit", label: "Nível mínimo", type: "number", min: 1, max: 100, default: 10, list: true, sortable: true },
    { name: "maxPlayers", label: "Máx. jogadores", type: "number", min: 1, max: 4, default: 4, list: true },
    {
      name: "difficulties",
      label: "Dificuldades",
      type: "tags",
      default: ["easy", "normal", "hard"],
      hint: "easy, normal, hard, hero",
      list: true,
    },
    { name: "script", label: "Script de IA", type: "text", required: true, hint: "Nome da classe de missão (ex.: GameServerScript.AI.Missions.XXX)", span: 2 },
    { name: "ticketTemplateId", label: "Ingresso (TemplateID)", type: "number", min: 0, default: 0 },
    { name: "dailyLimit", label: "Entradas por dia", type: "number", min: 0, default: 0, hint: "0 = ilimitado" },
    { name: "rewards", label: "Recompensas por dificuldade", type: "json", default: { easy: [], normal: [], hard: [], hero: [] } },
    { name: "active", label: "Disponível", type: "boolean", default: true, list: true, inlineToggle: true },
  ],
});
