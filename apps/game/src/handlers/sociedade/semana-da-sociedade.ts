/**
 * Aba no jogo: ícone "Semana da sociedade" (guildMemberWeek) — janela abria decorativa (só o aviso de
 * aberto/fechado em `session/login.ts`), nenhuma regra real no servidor original nem em nenhum fork
 * pesquisado (`research/qa/pendencias-sem-fonte.md`, `research/qa/feature-sources.md`: `LightRoadPackageType`/
 * `GuildMemberWeekPackageType` só aparecem como enum, nunca com handler de verdade).
 * Pacotes: 145 ACTIVITY_SYSTEM sub 7-13 (`GuildMemberWeekPackageType`), roteado por `eventos/index.ts`
 * (o pacote 145 é compartilhado com `eventos/caminho-da-luz.ts` — o byte inicial decide pra onde vai, igual
 * ao `SocketManager.activitySystem` do cliente: 7-13 aqui, 64-66 lá).
 *
 * Design novo (regra própria, sem fonte C#; detalhe completo em `research/qa/feature-designs.md`): "livro de
 * pontos" semanal do clã — cada membro doa Moedas (múltiplos de 10, igual ao cliente:
 * `GuildMemberWeekController.CheckAddBookIsOK` só aceita 0 ou ≥10 por "slot") que vira contribuição pessoal
 * (`app."GuildMemberWeekContribution"`, chave `weekKey()`); ranking dos 10 maiores contribuidores do clã na
 * semana. No reset semanal (`weeklyReset`, `eventos/agendador.ts`), os 3 primeiros ganham prêmio e um aviso
 * no chat do clã.
 * Como testar: `apps/game/test/consortia.test.ts` (bloco "145 sub 7-13 GUILDMEMBERWEEK").
 */
import type { GSPacket } from "@ddt/protocol";
import { PacketOut } from "@ddt/protocol";
import * as Db from "../../db/consortia.js";
import { addContribution, consortiaWithContributions, myContribution, topContributors } from "../../db/guild-week.js";
import { grantRewards, weekKey, type Reward } from "../../game/events.js";
import { consortiaMgr, ConsortiaMgr } from "../../game/consortia-mgr.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { mailItems } from "../bolsa/correio-excedente.js";
import { eventsRuntime } from "../eventos/agendador.js";

function reply145(sub: number, playerId = 0): PacketOut {
  const p = new PacketOut(145, playerId);
  p.writeByte(sub);
  return p;
}

const GMWC_SLOTS = 10;

async function memberName(ctx: ServerContext, cid: number, userId: number): Promise<string> {
  const online = ctx.world.get(userId);
  if (online) return online.info.NickName ?? `#${userId}`;
  const m = await Db.getMember(ctx.db.db, cid, userId).catch(() => null);
  return m?.UserName ?? `#${userId}`;
}

async function sendTop10(ctx: ServerContext, p: GamePlayer, week: string): Promise<void> {
  const cid = p.info.ConsortiaID;
  const top = await topContributors(ctx.db.db, cid, week);
  const out = reply145(8);
  out.writeString("Semana termina toda segunda-feira."); // upData — texto fixo, sem janela de horário própria
  out.writeInt(top.length);
  for (let i = 0; i < top.length; i++) {
    const row = top[i]!;
    out.writeInt(row.UserID); out.writeString(await memberName(ctx, cid, row.UserID)); out.writeInt(i + 1); out.writeInt(row.Total);
  }
  p.send(out);
  const mine = await myContribution(ctx.db.db, cid, p.id, week);
  const rank = top.findIndex((r) => r.UserID === p.id);
  const myRank = reply145(11);
  myRank.writeInt(rank === -1 ? 0 : rank + 1); myRank.writeInt(mine);
  p.send(myRank);
}

/** Roteador de 145 sub 7-13 (sub já lido pelo chamador em `eventos/index.ts`). */
export async function guildMemberWeekRouter(ctx: ServerContext, p: GamePlayer, sub: number, pkt: GSPacket): Promise<void> {
  if (p.info.ConsortiaID === 0) return;
  const week = weekKey(ctx.now());
  switch (sub) {
    case 8: // ENTER_GAME (cliente): sem payload — manda o ranking atual + minha posição.
      return sendTop10(ctx, p, week);
    case 9: // CLOSE (cliente): sem payload, sem resposta — só fecha a janela do lado do cliente.
      return;
    case 10: { // SEND_ADDRUNKING (cliente): int count(10) + 10 ints (0 ou ≥10 cada).
      const count = pkt.readInt();
      const slots: number[] = [];
      for (let i = 0; i < count; i++) slots.push(pkt.readInt());
      if (slots.length !== GMWC_SLOTS || slots.some((v) => v < 0 || (v > 0 && v < 10))) return p.sendMessage(0, "Cada doação precisa ser 0 ou pelo menos 10 Moedas.");
      const total = slots.reduce((a, b) => a + b, 0);
      if (total <= 0) return;
      if (p.info.Money + p.info.MoneyLock < total) return p.sendMessage(0, "Moedas insuficientes.");
      p.removeMoney(total);
      const newTotal = await addContribution(ctx.db.db, p.info.ConsortiaID, p.id, week, total);
      const m = await consortiaMgr(ctx);
      const log = reply145(10);
      const line = `${p.info.NickName ?? `#${p.id}`} doou ${total} Moedas pra Semana da Sociedade!`;
      log.writeInt(1); log.writeString(line);
      const echo = reply145(12, p.id);
      echo.writeInt(1); echo.writeInt(total); echo.writeString(`Contribuição total na semana: ${newTotal}.`);
      for (const o of m.online(p.info.ConsortiaID)) { o.send(log); if (o === p) o.send(echo); }
      return sendTop10(ctx, p, week);
    }
  }
}

const DEFAULT_GUILDWEEK_REWARDS: Reward[][] = [
  [{ templateId: -200, count: 20000 }], [{ templateId: -200, count: 10000 }], [{ templateId: -200, count: 5000 }],
];

/** `app."ScheduledEvents"` kind "guildweek" `params.rewards` = `Reward[][]` (1 lista por posição do top 3). */
function guildWeekRewardTiers(ctx: ServerContext): Reward[][] {
  const rewards = eventsRuntime(ctx).scheduler.events.find((e) => e.kind === "guildweek")?.params?.rewards;
  if (Array.isArray(rewards) && rewards.every((tier) => Array.isArray(tier))) return rewards as Reward[][];
  return DEFAULT_GUILDWEEK_REWARDS;
}

/**
 * Apuração de fim de semana (chamado por `eventos/agendador.ts` `weeklyReset` pra todo clã com contribuição
 * na semana `week`): top 3 contribuidores ganham prêmio (`guildweek.rewards`, admin) + aviso no chat do clã.
 */
export async function settleGuildWeek(ctx: ServerContext, week: string): Promise<void> {
  const db = ctx.db.db;
  const m = await consortiaMgr(ctx);
  const rewardTiers = guildWeekRewardTiers(ctx);
  for (const cid of await consortiaWithContributions(db, week)) {
    const top = await topContributors(db, cid, week, 3);
    for (let i = 0; i < top.length; i++) {
      const row = top[i]!;
      const rewards = rewardTiers[i];
      if (!rewards) continue;
      const online = ctx.world.get(row.UserID);
      const name = await memberName(ctx, cid, row.UserID);
      const msg = m.t("Consortia.GuildWeek.Winner", "{0}º lugar na Semana da Sociedade: {1} ({2} Moedas doadas)!", i + 1, name, row.Total);
      for (const o of m.online(cid)) o.send(ConsortiaMgr.taskChat(msg));
      if (online) {
        const g = grantRewards(online, rewards, ctx.templates.findItem, ctx.now());
        if (g.overflow.length) await mailItems(ctx, online, g.overflow, "Premiação da Semana da Sociedade");
        online.sendMessage(0, msg);
      }
    }
  }
}
