import { Dice5, Gift } from "lucide-react";
import { defineResource } from "@/crud/types";

/**
 * Pools de recompensa (`game."Drop_Condiction"` + `game."Drop_Item"`), referenciados por `NPC_Info.DropId`
 * (drop ao matar um NPC, `CondictionType` 3 = NPC) e por `Mission_Info.Id` via `Drop_Condiction.Para1 =
 * ",<MissionId>,"` (cartas ao vencer a fase, `CondictionType` 5 = Copy) — ver `docs/guides/pve.md` §3
 * ("Recompensas da fase") e §4. Não tinham recurso no painel ainda (só na whitelist da API,
 * `admin-resources.ts`) — adicionados para o editor visual de Instâncias (site-admin-redesign, editor #2)
 * conseguir listar/criar o pool de cartas de uma fase.
 */
export const dropConditions = defineResource({
  name: "drop-conditions",
  table: 'game."Drop_Condiction"',
  label: { "pt-BR": "Condições de drop", en: "Drop conditions" },
  singular: { "pt-BR": "condição de drop", en: "drop condition" },
  description: "Agrupa um pool de Drop_Item sob um DropID; CondictionType 3 = drop de NPC, 5 = cartas de fase (Copy).",
  icon: Gift,
  group: "content",
  idField: "DropID",
  titleField: "Name",
  defaultSort: "DropID",
  fields: [
    { name: "DropID", label: "DropID", type: "number", required: true, list: true, sortable: true, form: "create" },
    { name: "CondictionType", label: "Tipo", type: "number", required: true, list: true, hint: "3 = drop de NPC, 5 = cartas de fase (Copy)" },
    { name: "Name", label: "Nome", type: "text", list: true, span: 2 },
    { name: "Para1", label: "Para1", type: "text", list: true, hint: "Tipo 5 (cartas de fase): \",<Id da Mission_Info>,\"" },
    { name: "Para2", label: "Para2", type: "text", hint: "Tipo 5: \",1,\"" },
    { name: "Detail", label: "Detalhe", type: "textarea" },
  ],
});

export const dropItems = defineResource({
  name: "drop-items",
  table: 'game."Drop_Item"',
  label: { "pt-BR": "Itens de drop", en: "Drop items" },
  singular: { "pt-BR": "item de drop", en: "drop item" },
  description: "Itens possíveis de um DropID, com peso de sorteio e validade.",
  icon: Dice5,
  group: "content",
  idField: "Id",
  titleField: "ItemId",
  defaultSort: "DropId",
  fields: [
    { name: "Id", label: "Id", type: "number", list: true, sortable: true, form: "create" },
    { name: "DropId", label: "DropID", type: "ref", refResource: "drop-conditions", refLabel: "Name", required: true, list: true, sortable: true },
    { name: "ItemId", label: "Item", type: "item-picker", required: true, list: true },
    { name: "Random", label: "Peso (Random)", type: "number", min: 0, default: 0, list: true, hint: "Peso relativo de sorteio dentro do DropID" },
    { name: "ValueDate", label: "Validade (dias)", type: "number", min: 0, default: 0 },
    { name: "IsBind", label: "Vinculado", type: "boolean", default: false },
    { name: "BeginData", label: "BeginData", type: "number", default: 0 },
    { name: "EndData", label: "EndData", type: "number", default: 0 },
    { name: "IsTips", label: "Mostrar na dica", type: "boolean", default: false, list: true },
    { name: "IsLogs", label: "Registrar em log", type: "boolean", default: false },
  ],
});
