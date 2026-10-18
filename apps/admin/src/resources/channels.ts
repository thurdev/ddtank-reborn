import { Radio } from "lucide-react";
import { defineResource } from "@/crud/types";

/**
 * ch-admin: CRUD de canais (player."Server_List"), um canal = uma linha mostrada no seletor "Canal" do
 * cliente (ServerList.ashx, `apps/api/src/request/endpoints/ServerList.ts`). Hoje só existe o canal ID 4
 * "Reborn"; esta página é o que permite ao dono criar/editar Canal 1, 2, 3… (ver
 * `docs/plan/TASKS.md` "2. Canais" e `docs/plan/MIGRACAO-6600.md` "Requisito futuro: vários canais").
 *
 * `State` usa o enum original do cliente (`ddt/data/ServerInfo.as`): 1 manutenção, 2 aberto, 4 quase
 * cheio, 5 cheio. `Enabled`/`SortOrder`/`InternalUrl`/`PvpOnly` são colunas novas (migração
 * `0014_sad_cardiac.sql`, ver `packages/db/README.md`).
 */
export const channels = defineResource({
  name: "server-list",
  table: 'player."Server_List"',
  label: { "pt-BR": "Canais", en: "Channels" },
  singular: { "pt-BR": "canal", en: "channel" },
  description: "Canais do jogo (Canal 1, 2, 3…) mostrados no seletor de servidor do cliente.",
  icon: Radio,
  group: "server",
  idField: "ID",
  titleField: "Name",
  defaultSort: "SortOrder",
  searchPlaceholder: "Nome do canal…",
  fields: [
    { name: "ID", label: "ID", type: "number", required: true, list: true, sortable: true, form: "create", hint: "Igual ao SERVER_ID do processo apps/game que serve este canal." },
    { name: "Name", label: "Nome", type: "text", required: true, maxLength: 50, list: true, sortable: true, span: 2 },
    { name: "Enabled", label: "Ativo", type: "boolean", default: true, list: true, inlineToggle: true, hint: "Desligado = sai da listagem (ServerList.ashx/launcher)." },
    { name: "SortOrder", label: "Ordem", type: "number", default: 0, list: true, sortable: true, hint: "Ordem de exibição no seletor de canal." },
    {
      name: "State",
      label: "Estado",
      type: "select",
      required: true,
      list: true,
      sortable: true,
      default: 2,
      options: [
        { value: 1, label: "Em manutenção", tone: "coral" },
        { value: 2, label: "Aberto", tone: "mint" },
        { value: 4, label: "Quase cheio", tone: "sun" },
        { value: 5, label: "Cheio", tone: "coral" },
      ],
    },
    { name: "IP", label: "Host público", type: "text", placeholder: "127.0.0.1", hint: "Vazio = usa GAME_HOST do servidor (fallback atual)." },
    { name: "Port", label: "Porta pública (TCP real)", type: "number", min: 0, hint: "Vazio/0 = usa GAME_PORT do servidor. O cliente 4.1 soma 69 na porta; o 6600 usa direto." },
    { name: "Online", label: "Online", type: "number", list: true, sortable: true, readOnly: true, hint: "Canal local: valor em tempo real do apps/game. Outros canais: valor desta linha." },
    { name: "Total", label: "Capacidade máxima", type: "number", min: 0, default: 1000, list: true, sortable: true, required: true },
    { name: "Room", label: "Salas máximas", type: "number", min: 0, default: 200, required: true },
    { name: "MustLevel", label: "Nível máximo", type: "number", min: 0, default: 0, hint: "0 = sem limite. Jogadores com nível acima não entram neste canal." },
    { name: "LowestLevel", label: "Nível mínimo", type: "number", min: 0, default: 0, hint: "Jogadores com nível abaixo não entram neste canal." },
    { name: "NewerServer", label: "Canal novato", type: "boolean", default: false, list: true, inlineToggle: true },
    { name: "PvpOnly", label: "Só PvP", type: "boolean", default: false, list: true, inlineToggle: true },
    { name: "ZoneId", label: "ZoneId", type: "number", default: 1, required: true, section: "Avançado" },
    { name: "ZoneName", label: "ZoneName", type: "text", default: "Server S1", required: true, section: "Avançado" },
    { name: "InternalUrl", label: "URL interna (admin channel)", type: "text", section: "Avançado", placeholder: "http://127.0.0.1:9400", hint: "Vazio = este canal é servido por este próprio apps/api (GAME_INTERNAL_URL do .env). Preencher quando outro processo apps/game servir este canal (ch-processo)." },
    { name: "Remark", label: "Observação", type: "text", maxLength: 200, section: "Avançado" },
  ],
});
