import { Scale, Trophy } from "lucide-react";
import { defineResource } from "@/crud/types";

/**
 * Task 41-instancias (docs/features/instancias.md): multiplicadores de balanceamento por masmorra+dificuldade,
 * aplicados pelo motor de luta ao instanciar os NPCs da missão (apps/game/src/fight/ddt.ts `scalePveNpc`/
 * `scalePveDrop`) e à recompensa (Experience do NPC + quantidade de drop). Ausência de linha = 1.0 em tudo
 * (sem alteração — mesmo comportamento da 4.1 original). Toda escrita aqui recarrega o cache do apps/game
 * (`/reload-templates`, ver apps/api/src/routes/admin.ts `afterWrite`), então o efeito é imediato, sem precisar
 * reiniciar o servidor nem o jogador relogar.
 */
const HARD_LEVELS = [
  { value: 0, label: "Simples", tone: "mint" as const },
  { value: 1, label: "Normal", tone: "sky" as const },
  { value: 2, label: "Difícil", tone: "sun" as const },
  { value: 3, label: "Terror", tone: "coral" as const },
  { value: 4, label: "Épico", tone: "grape" as const },
  { value: 5, label: "Pesadelo (só Masmorra)", tone: "neutral" as const },
];

export const pveBalance = defineResource({
  name: "pve-balance",
  table: 'app."PveBalance"',
  label: { "pt-BR": "Balanceamento de masmorras", en: "Dungeon balance" },
  singular: { "pt-BR": "ajuste", en: "override" },
  description: "Multiplicadores de HP/dano/defesa dos NPCs e de recompensa, por masmorra + dificuldade (docs/features/instancias.md).",
  icon: Scale,
  group: "content",
  idField: ["PveId", "HardLevel"],
  defaultSort: "PveId",
  fields: [
    { name: "PveId", label: "Masmorra", type: "ref", refResource: "dungeons", refLabel: "Name", required: true, list: true, sortable: true, form: "create" },
    { name: "HardLevel", label: "Dificuldade", type: "select", options: HARD_LEVELS, required: true, list: true, form: "create" },
    { name: "NpcHpMult", label: "Mult. HP dos NPCs", type: "number", int: false, min: 0.1, max: 10, step: 0.05, default: 1, list: true },
    { name: "NpcDamageMult", label: "Mult. dano dos NPCs", type: "number", int: false, min: 0.1, max: 10, step: 0.05, default: 1, list: true },
    { name: "NpcDefenceMult", label: "Mult. defesa dos NPCs", type: "number", int: false, min: 0.1, max: 10, step: 0.05, default: 1, list: true },
    { name: "RewardMult", label: "Mult. recompensa (exp + drop)", type: "number", int: false, min: 0.1, max: 10, step: 0.05, default: 1, list: true },
    { name: "UpdatedAt", label: "Atualizado", type: "datetime", form: false, list: true },
  ],
});

/**
 * Task 41-instancias: progresso de desbloqueio por jogador (quem já zerou qual dificuldade de qual masmorra).
 * Só leitura/exclusão — nunca criado pelo admin (o jogo é quem grava, ao vencer a masmorra de verdade). Excluir
 * uma linha aqui "trava de novo" aquele jogador na dificuldade seguinte (ferramenta de suporte/depuração).
 */
export const pveClears = defineResource({
  name: "pve-clears",
  table: 'app."PveInstanceClear"',
  label: { "pt-BR": "Progresso de masmorras", en: "Dungeon clears" },
  singular: { "pt-BR": "registro", en: "clear" },
  description: "Quem já venceu qual dificuldade de qual masmorra (desbloqueia a próxima). Só suporte/depuração.",
  icon: Trophy,
  group: "content",
  hidden: true,
  idField: ["UserID", "PveId", "HardLevel"],
  defaultSort: "LastClearedAt",
  fields: [
    { name: "UserID", label: "Jogador", type: "ref", refResource: "players", refLabel: "NickName", required: true, list: true, sortable: true },
    { name: "PveId", label: "Masmorra", type: "ref", refResource: "dungeons", refLabel: "Name", required: true, list: true, sortable: true },
    { name: "HardLevel", label: "Dificuldade", type: "select", options: HARD_LEVELS, required: true, list: true },
    { name: "ClearCount", label: "Vezes", type: "number", default: 0, list: true },
    { name: "FirstClearedAt", label: "1ª vez", type: "datetime", form: false, list: true },
    { name: "LastClearedAt", label: "Última vez", type: "datetime", form: false, list: true, sortable: true },
  ],
});
