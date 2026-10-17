/**
 * Aba no jogo: ícone "Caminho da luz" (lightRoad) — janela abria decorativa (só o aviso de aberto/fechado
 * em `session/login.ts`, `Out.lightRoadOpen`), nenhuma regra real no servidor original nem em nenhum fork
 * pesquisado (`research/qa/pendencias-sem-fonte.md`, `research/qa/feature-sources.md`).
 * Pacotes: 145 ACTIVITY_SYSTEM — um byte inicial decide o sub-sistema, igual ao cliente
 * (`SocketManager.activitySystem`): 7-13 = Semana da Sociedade (`sociedade/semana-da-sociedade.ts`), 37-45 =
 * LanternRiddles (sem handler aqui, não pedido), 64-66 = Caminho da Luz (`LightRoadPackageType`, este arquivo).
 * Este arquivo também é o ÚNICO ponto de registro do pacote 145 (`activitySystemRouter`, chamado por
 * `eventos/index.ts`) — decide pra onde o byte vai.
 *
 * Design novo (regra própria, sem fonte C#; detalhe completo em `research/qa/feature-designs.md`): tabuleiro
 * semanal de `lightRoad.spaces` (12) espaços; 1ª escolha do dia é grátis, as próximas custam Ouro crescente
 * (`lightRoad.pickCost`); escolher um espaço ainda não revelado sorteia 1 prêmio do pool configurável
 * (`lightRoad.pool`, admin) e marca o bit — bitmask + contador do dia persistidos por semana
 * (`app."LightRoadProgress"`, chave `weekKey()`); vira tabuleiro novo sozinho quando a semana troca (sem
 * cron de reset — é só a chave mudando).
 * Como testar: `apps/game/test/events.test.ts` (bloco "145 sub 64-66 LIGHTROAD").
 */
import type { GSPacket } from "@ddt/protocol";
import { PacketOut } from "@ddt/protocol";
import { num, pool, type PoolItem } from "./agendador.js";
import { loadProgress, saveProgress } from "../../db/light-road.js";
import { dayKey, grantRewards, weekKey, type Reward } from "../../game/events.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { mailItems } from "../bolsa/correio-excedente.js";
import { guildMemberWeekRouter } from "../sociedade/semana-da-sociedade.js";

function reply145(sub: number, playerId = 0): PacketOut {
  const p = new PacketOut(145, playerId);
  p.writeByte(sub);
  return p;
}

const DEFAULT_LIGHTROAD_POOL: PoolItem[] = [
  { templateId: 11107, count: 500, weight: 25 }, { templateId: -200, count: 2000, weight: 20 },
  { templateId: 11456, count: 3, weight: 15 }, { templateId: 11408, count: 5, weight: 15 }, { templateId: -100, count: 20, weight: 10 },
];

function pick(rows: PoolItem[], rnd: () => number): PoolItem | null {
  if (!rows.length) return null;
  const total = rows.reduce((s, r) => s + (r.weight ?? 1), 0);
  let roll = rnd() * total;
  for (const r of rows) { roll -= r.weight ?? 1; if (roll <= 0) return r; }
  return rows[rows.length - 1]!;
}

/** 64 ENTER_GAME (cliente, sem payload): manda o bitmask atual + janela (texto fixo, sem data real por ativação). */
async function enterGame(ctx: ServerContext, p: GamePlayer, week: string): Promise<void> {
  const row = await loadProgress(ctx.db.db, p.id, week);
  const out = reply145(65);
  out.writeInt(row.Bits);
  out.writeString("Semana atual"); out.writeString("Termina toda segunda-feira");
  p.send(out);
}

/** 66 BECHOOSE_POINT (cliente): `int space` (1-based, igual ao `LightGiftInfo.Space` do cliente). */
async function choosePoint(ctx: ServerContext, p: GamePlayer, pkt: GSPacket, week: string, rnd: () => number): Promise<void> {
  const space = pkt.readInt();
  const spaces = num(ctx, "lightroad", "spaces", 12);
  if (space < 1 || space > spaces) return;
  const bit = space - 1;
  const row = await loadProgress(ctx.db.db, p.id, week);
  if ((row.Bits >> bit) & 1) return p.sendMessage(0, "Esse espaço já foi revelado essa semana.");
  const today = dayKey(ctx.now());
  if (row.DayKey !== today) { row.DayKey = today; row.PicksToday = 0; }
  const freePicks = num(ctx, "lightroad", "freePicks", 1);
  if (row.PicksToday >= freePicks) {
    const cost = num(ctx, "lightroad", "pickCost", 100) * (row.PicksToday - freePicks + 1);
    if (p.info.Gold < cost) return p.sendMessage(0, `Essa escolha custa ${cost} Ouro (grátis esgotada por hoje).`);
    p.removeGold(cost);
  }
  row.PicksToday++;
  row.Bits |= 1 << bit;
  await saveProgress(ctx.db.db, p.id, week, row);
  const rows = pool(ctx, "lightroad", DEFAULT_LIGHTROAD_POOL);
  const won = pick(rows, rnd);
  if (won) {
    const reward: Reward = { templateId: won.templateId, count: won.count, validDate: won.validDate ?? 0, isBind: won.isBind ?? true };
    const g = grantRewards(p, [reward], ctx.templates.findItem, ctx.now());
    if (g.overflow.length) await mailItems(ctx, p, g.overflow, "Prêmio do Caminho da Luz");
    p.sendMessage(0, `Caminho da Luz: espaço ${space} revelado — você ganhou ${g.summary.join(", ")}.`);
  }
  const out = reply145(66);
  out.writeInt(row.Bits);
  p.send(out);
}

/**
 * Roteador do pacote 145 ACTIVITY_SYSTEM inteiro — chamado por `eventos/index.ts`. Lê o byte inicial e
 * despacha igual ao `SocketManager.activitySystem` do cliente (7-13 Semana da Sociedade, 64-66 Caminho da
 * Luz; 37-45 LanternRiddles não tem handler aqui — fora do pedido desta sessão, fica sem resposta como já
 * era antes).
 */
export async function activitySystemRouter(ctx: ServerContext, p: GamePlayer, pkt: GSPacket, rnd: () => number = Math.random): Promise<void> {
  const sub = pkt.readByte();
  if (sub >= 7 && sub <= 13) return guildMemberWeekRouter(ctx, p, sub, pkt);
  if (sub < 64 || sub > 66) return; // LanternRiddles (37-45) ou lixo — sem handler, igual ao original
  const week = weekKey(ctx.now());
  if (sub === 64) return enterGame(ctx, p, week);
  if (sub === 66) return choosePoint(ctx, p, pkt, week, rnd);
}
