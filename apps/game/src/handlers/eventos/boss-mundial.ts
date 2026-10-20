/**
 * Aba no jogo: ícone do hall "Boss mundial" (sala-lobby + luta em grupo contra um chefe único, com ranking
 * por dano). A janela em si (quando abre/fecha, HP, recompensas de ranking) é decidida pelo agendador
 * (`agendador.ts`, `app."ScheduledEvents"` kind "worldboss"); este arquivo é só a SALA: quem entrou, posição,
 * dano causado, revive/refight pago, buff de dano.
 * Pacotes: 102 WORLDBOSS_CMD (sub 2 EnterRoom, 32 EnterRoom-lobby, 33 LeaveRoom, 34 AddPlayer, 35 Move,
 *   36 Status, 37 RequestRevive, 38 BuyBuff; subs 0/1/5/8/10/11 são respostas do servidor, não pedidos do cliente).
 * C#: `WorldBossHandler.cs` → `WorldBoss/Handle/*.cs`, `BaseWorldBossRoom.ReduceBlood`/`UpdateRank`.
 * Como testar: `apps/game/test/events.test.ts` (`worldBossDamage`). Manual: `docs/features/boss-mundial.md`.
 */
import { sql } from "drizzle-orm";
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { claimOnce, grantRewards, type Reward } from "../../game/events.js";
import type { ActiveWindow } from "../../game/scheduler.js";
import { mailItems } from "../bolsa/correio-excedente.js";
import * as Out from "../../packets/out.js";
import { eventsRuntime, type EventsRuntime } from "./agendador.js";

// ------------------------------------------------------------------ estado em memória
export interface BossPlayer { x: number; y: number; state: number }
export interface WorldBossState {
  window: ActiveWindow | null;
  name: string;
  resourceId: string;
  pveId: number;
  maxBlood: number;
  blood: number;
  players: Map<number, BossPlayer>;
  /** userId -> damage/honor this window (UpdateRank). */
  rank: Map<number, { nick: string; damage: number; honor: number }>;
}

// ------------------------------------------------------------------ pacotes
/**
 * 102/0 OPEN (AbstractPacketLib.SendOpenWorldBoss :2593) with the live window.
 * 6600 reads total_Blood as a Long and +3 ints after reviveMoney (reFightMoney/addInjureBuffMoney/
 * addInjureValue, not implemented -> 0) — same diff as Out.openWorldBoss (packets/out.ts), see
 * research/6600/packets-m1.md.
 */
export function worldBossOpen(rt: EventsRuntime, p_: GamePlayer): GSPacket {
  const b = rt.boss;
  const open = !!b.window;
  const is6600 = p_.clientKind === "6600";
  const p = new GSPacket(102);
  p.writeByte(0);
  p.writeString(open ? b.resourceId : "0");
  p.writeInt(open ? b.pveId : 0);
  p.writeString("Fera Divina");
  p.writeString(b.name);
  if (is6600) p.writeLong(b.maxBlood); else p.writeInt(b.maxBlood);
  p.writeInt(0); p.writeInt(0);
  p.writeInt(1); p.writeInt(265); p.writeInt(1030);
  Out.wd(p, b.window?.start ?? new Date(0)); Out.wd(p, b.window?.end ?? new Date(0));
  p.writeInt(b.window ? Math.round((b.window.end.getTime() - b.window.start.getTime()) / 60000) : 0);
  p.writeBoolean(!open || b.blood <= 0); // fightOver
  p.writeBoolean(!open); // roomClose
  p.writeInt(11573); p.writeInt(0); p.writeInt(15); p.writeInt(1000);
  if (is6600) { p.writeInt(0); p.writeInt(0); p.writeInt(0); } // reFightMoney/addInjureBuffMoney/addInjureValue (6600-only)
  p.writeInt(1); p.writeInt(1); p.writeString("Aumentar Dano"); p.writeInt(30); p.writeString("Dano base aumenta em 200."); p.writeInt(-1);
  p.writeBoolean(true); p.writeBoolean(false);
  return p;
}

export function rankList(rt: EventsRuntime): { id: number; nick: string; damage: number }[] {
  return [...rt.boss.rank.entries()].map(([id, r]) => ({ id, nick: r.nick, damage: r.damage })).sort((a, b) => b.damage - a.damage);
}

function worldBossRanking(rt: EventsRuntime, final: boolean): GSPacket {
  const list = rankList(rt).slice(0, 10);
  const p = new GSPacket(102);
  p.writeByte(10);
  p.writeBoolean(final);
  p.writeInt(list.length);
  for (const r of list) { p.writeInt(r.id); p.writeString(r.nick); p.writeInt(r.damage); }
  return p;
}

/**
 * Called by the fight layer (or tests) with the damage a player dealt to the world boss (BaseWorldBossRoom.ReduceBlood
 * + UpdateRank). ch-eventos: a autoridade do HP/ranking compartilhado é o canal LÍDER (`ctx.leader`,
 * `bus/leader.ts`) — um canal seguidor nunca decrementa o próprio `blood` direto, só repassa o pedido pro líder
 * via barramento (`ctx.crossChannel.bossDamage`) e espera o `ch:boss:sync` (bus/cross-channel.ts) espelhar o
 * valor novo de volta (`mirrorBossSync` abaixo). Sem barramento ativo (NoopBus/canal único) este canal É o
 * líder sempre (`bus/leader.ts wireLeaderElection`), então o caminho é idêntico a antes desta tarefa: aplica
 * direto, síncrono, sem round-trip nenhum.
 */
export function worldBossDamage(ctx: ServerContext, p: GamePlayer, damage: number): void {
  if (!ctx.leader.isLeader()) {
    ctx.crossChannel.bossDamage(p.id, p.info.NickName ?? "", damage);
    return;
  }
  applyBossDamage(ctx, p.id, p.info.NickName ?? "", damage);
}

/**
 * Aplicação autoritativa do dano — só roda no líder (direto, ou atendendo um `ch:boss:damage` repassado por um
 * seguidor, ver `bus/cross-channel.ts`). Único lugar que de fato decrementa `blood`/atualiza `rank`; notifica os
 * jogadores da sala NESTE canal (igual sempre) e replica o estado novo pros outros canais
 * (`ctx.crossChannel.bossSync`, no-op sem barramento ativo — single-channel continua idêntico a antes).
 */
export function applyBossDamage(ctx: ServerContext, userId: number, nick: string, damage: number): void {
  const rt = eventsRuntime(ctx);
  const b = rt.boss;
  if (!b.window || damage <= 0 || b.blood <= 0) return;
  const dealt = Math.min(damage, b.blood);
  b.blood -= dealt;
  const r = b.rank.get(userId) ?? { nick, damage: 0, honor: 0 };
  r.damage += dealt;
  r.honor += Math.floor(dealt / 1000);
  b.rank.set(userId, r);
  const up = new GSPacket(102);
  up.writeByte(5); up.writeBoolean(false); up.writeInt(b.maxBlood); up.writeInt(b.blood);
  for (const id of b.players.keys()) ctx.world.get(id)?.send(up);
  const defeated = b.blood <= 0;
  if (defeated) {
    const over = new GSPacket(102);
    over.writeByte(8); over.writeBoolean(true);
    for (const pl of ctx.world.all()) pl.send(over);
  }
  ctx.crossChannel.bossSync({ blood: b.blood, maxBlood: b.maxBlood, defeated, rankTop: rankList(rt).slice(0, 10) });
}

/** ch-eventos: snapshot que o líder manda pra um canal seguidor espelhar a abertura da janela (`ch:boss:open`). */
export interface BossOpenSnapshot {
  name: string; resourceId: string; pveId: number; maxBlood: number; blood: number;
  startMs: number; endMs: number; key: string; notice: string;
}
/** ch-eventos: snapshot que o líder manda depois de aplicar um dano (seu ou repassado) — `ch:boss:sync`. */
export interface BossSyncSnapshot {
  blood: number; maxBlood: number; defeated: boolean;
  rankTop: { id: number; nick: string; damage: number }[];
}

/** ch-eventos: espelha num canal SEGUIDOR o estado que o líder acabou de replicar (`ch:boss:sync`). */
export function mirrorBossSync(ctx: ServerContext, snap: BossSyncSnapshot): void {
  const rt = eventsRuntime(ctx);
  const b = rt.boss;
  if (!b.window) return; // ainda não espelhamos o open (corrida bem rara) — o próximo ch:boss:open já traz o estado certo
  b.blood = snap.blood;
  b.maxBlood = snap.maxBlood;
  b.rank = new Map(snap.rankTop.map((r) => [r.id, { nick: r.nick, damage: r.damage, honor: 0 }]));
  const up = new GSPacket(102);
  up.writeByte(5); up.writeBoolean(false); up.writeInt(b.maxBlood); up.writeInt(b.blood);
  for (const id of b.players.keys()) ctx.world.get(id)?.send(up);
  if (snap.defeated) {
    const over = new GSPacket(102);
    over.writeByte(8); over.writeBoolean(true);
    for (const pl of ctx.world.all()) pl.send(over);
  }
}

/** ch-eventos: espelha num canal SEGUIDOR a abertura que o líder decidiu de verdade (`ch:boss:open`). */
export function mirrorBossOpen(ctx: ServerContext, snap: BossOpenSnapshot): void {
  const rt = eventsRuntime(ctx);
  const b = rt.boss;
  b.name = snap.name; b.resourceId = snap.resourceId; b.pveId = snap.pveId;
  b.maxBlood = snap.maxBlood; b.blood = snap.blood;
  b.players.clear(); b.rank.clear();
  // Janela sintética: só pro `!!b.window`/datas do pacote 0 OPEN (worldBossOpen) e pro status() — quem de fato
  // tickou o scheduler contra app.ScheduledEvents foi o líder; este canal só espelha o resultado.
  b.window = {
    ev: { id: 0, kind: "worldboss", title: "", enabled: true, weekdays: "", startTime: "", durationMin: Math.max(1, Math.round((snap.endMs - snap.startMs) / 60_000)), startDate: null, endDate: null, params: {} },
    start: new Date(snap.startMs), end: new Date(snap.endMs), key: snap.key,
  };
  for (const p of ctx.world.all()) p.send(worldBossOpen(rt, p));
  if (snap.notice) for (const p of ctx.world.all()) p.send(Out.message(1, snap.notice));
}

/**
 * ch-eventos: espelha num canal SEGUIDOR o fechamento (`ch:boss:close`) — o líder já pagou os prêmios (uma vez
 * só, `finishWorldBoss` abaixo); aqui só limpa o estado local e manda a MESMA ranking final (sub 10) + "fim de
 * luta" (sub 1 OVER) pra sala local, igual o líder manda pra sala dele em `finishWorldBoss`.
 */
export function mirrorBossClose(ctx: ServerContext, rankTop: { id: number; nick: string; damage: number }[]): void {
  const rt = eventsRuntime(ctx);
  const members = rt.boss.players;
  const final = new GSPacket(102);
  final.writeByte(10); final.writeBoolean(true); final.writeInt(rankTop.length);
  for (const r of rankTop) { final.writeInt(r.id); final.writeString(r.nick); final.writeInt(r.damage); }
  const over = new GSPacket(102);
  over.writeByte(1);
  for (const pl of ctx.world.all()) { if (members.has(pl.id)) pl.send(final); pl.send(over); }
  rt.boss.window = null;
  rt.boss.players.clear();
}

/** World boss end: ranking rewards (params.rankAwards [{rank, giftToken?, gold?, items?}], claim per window) + 102/1 OVER. */
export async function finishWorldBoss(ctx: ServerContext, rt: EventsRuntime, w: ActiveWindow): Promise<void> {
  const awards = (Array.isArray(w.ev.params.rankAwards) ? w.ev.params.rankAwards : []) as { rank: number; giftToken?: number; gold?: number; items?: Reward[] }[];
  const list = rankList(rt);
  for (const [i, r] of list.entries()) {
    const tier = awards.filter((a) => i + 1 <= a.rank).sort((a, b) => a.rank - b.rank)[0];
    if (!tier || !(await claimOnce(ctx.db.db, r.id, "worldboss", w.key.slice(0, 64)))) continue;
    const rewards: Reward[] = [...(tier.items ?? [])];
    if (tier.giftToken) rewards.push({ templateId: -1100, count: tier.giftToken });
    if (tier.gold) rewards.push({ templateId: -100, count: tier.gold });
    const pl = ctx.world.get(r.id);
    if (pl) {
      const g = grantRewards(pl, rewards, ctx.templates.findItem, ctx.now());
      if (g.overflow.length) await mailItems(ctx, pl, g.overflow, "Boss mundial", 12);
      pl.sendMessage(0, `Boss mundial: ${i + 1}º lugar (${r.damage} de dano). Prêmio: ${g.summary.join(", ")}.`);
    } else if (!(await ctx.crossChannel.deliverReward(r.id, rewards, `Boss mundial: ${i + 1}º lugar (${r.damage} de dano)`))) {
      // ch-eventos: tentou achar o ganhador em outro canal (bus/cross-channel.ts deliverReward) antes de
      // desistir — nenhum canal tinha ele online (ou barramento inativo/canal único): moeda direto no banco,
      // igual sempre (itens de recompensa ficam só pra quando dá pra entregar na bolsa de alguém online).
      await offlineCurrency(ctx, r.id, rewards);
    }
  }
  const final = worldBossRanking(rt, true);
  const over = new GSPacket(102);
  over.writeByte(1);
  for (const pl of ctx.world.all()) { if (rt.boss.players.has(pl.id)) pl.send(final); pl.send(over); }
  rt.boss.window = null;
  rt.boss.players.clear();
}

/** Currency rewards for offline players (items are skipped: world-boss tiers default to gift tokens). */
async function offlineCurrency(ctx: ServerContext, userId: number, rewards: Reward[]): Promise<void> {
  const gt = rewards.filter((r) => r.templateId === -1100).reduce((s, r) => s + r.count, 0);
  const gold = rewards.filter((r) => r.templateId === -100).reduce((s, r) => s + r.count, 0);
  if (gt || gold) await ctx.db.db.execute(sql`UPDATE player."Sys_Users_Detail" SET "GiftToken" = "GiftToken" + ${gt}, "Gold" = "Gold" + ${gold} WHERE "UserID" = ${userId}`);
}

function enterPkt(p: GamePlayer, bp: BossPlayer): GSPacket {
  const c = p.info;
  const o = new GSPacket(102);
  o.writeByte(3);
  o.writeInt(c.Grade); o.writeInt(c.Hide); o.writeInt(c.Repute ?? 0); o.writeInt(c.ID); o.writeString(c.NickName ?? "");
  o.writeByte(c.typeVIP ?? 0); o.writeInt(c.VIPLevel ?? 0); o.writeBoolean(!!c.Sex);
  o.writeString(c.Style ?? ""); o.writeString(c.Colors ?? ""); o.writeString(c.Skin ?? "");
  o.writeInt(bp.x); o.writeInt(bp.y); o.writeInt(c.FightPower ?? 0); o.writeInt(c.Win); o.writeInt(c.Total); o.writeInt(c.Offer);
  o.writeByte(bp.state); o.writeInt(0); o.writeInt(0); o.writeInt(0);
  return o;
}

/** WorldBoss/Handle/*.cs (byte sub). The fight itself is a PvE room type 14 on `pveId` (RoomMgr). */
export function worldBossCmd(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const rt = eventsRuntime(ctx);
  const b = rt.boss;
  const sub = pkt.readByte();
  const toRoom = (o: GSPacket) => { for (const id of b.players.keys()) ctx.world.get(id)?.send(o); };
  switch (sub) {
    case 32: { // EnterRoom
      const o = new GSPacket(102);
      o.writeByte(2); o.writeBoolean(!!b.window); o.writeBoolean(false); o.writeInt(0); o.writeInt(0);
      p.send(o);
      return;
    }
    case 34: { // AddPlayer
      const x = pkt.readInt();
      const y = pkt.readInt();
      if (!b.window) return;
      const bp: BossPlayer = { x: x || 265, y: y || 1030, state: 1 };
      const isNew = !b.players.has(p.id);
      b.players.set(p.id, bp);
      if (!b.rank.has(p.id)) b.rank.set(p.id, { nick: p.info.NickName ?? "", damage: 0, honor: 0 });
      if (isNew) toRoom(enterPkt(p, bp));
      for (const [id, o] of b.players) { const op = ctx.world.get(id); if (op && id !== p.id) p.send(enterPkt(op, o)); }
      const up = new GSPacket(102);
      up.writeByte(5); up.writeBoolean(false); up.writeInt(b.maxBlood); up.writeInt(b.blood);
      p.send(up);
      p.send(worldBossRanking(rt, false));
      return;
    }
    case 33: { // LeaveRoom
      if (!b.players.delete(p.id)) return;
      const o = new GSPacket(102);
      o.writeByte(4); o.writeInt(p.id);
      toRoom(o); p.send(o);
      return;
    }
    case 35: { // Move
      const x = pkt.readInt(); const y = pkt.readInt(); const path = pkt.readString();
      const bp = b.players.get(p.id);
      if (!bp) return;
      bp.x = x; bp.y = y;
      const o = new GSPacket(102);
      o.writeByte(6); o.writeInt(p.id); o.writeInt(x); o.writeInt(y); o.writeString(path);
      toRoom(o);
      return;
    }
    case 36: { // Status
      const st = pkt.readByte();
      const bp = b.players.get(p.id);
      if (!bp) return;
      // WorldBoss/Handle/Status.cs: state 3 (dead/back from the fight) only leaves the fight room; the player stays in
      // the boss room (fixed: we removed them, so 37 REQUEST_REVIVE was refused with "not enough Xu")
      if (st !== 3 || bp.state !== 3) {
        const o = new GSPacket(102);
        o.writeByte(7); o.writeInt(p.id); o.writeByte(st); o.writeInt(bp.x); o.writeInt(bp.y);
        toRoom(o);
      }
      bp.state = st;
      return;
    }
    case 37: { // RequestRevive: int type (1 revive / 2 refight), bool bind — ReviveMoney 1000 / ReFightMoney 1200
      const type = pkt.readInt(); pkt.readBoolean();
      const cost = type === 2 ? 1200 : 1000;
      if (!b.window) return;
      // RequestRevive.cs:32-37 charges via Player.MoneyDirect (GamePlayer.cs:3427-3444): eligibility checks the
      // COMBINED pool (Money + MoneyLock), and the deduction (RemoveMoney, GamePlayer.cs:414 here) spends bound
      // money first. Deviation fixed: this used to check/deduct only p.info.Money, so a player sitting on
      // enough locked (bound) Xu but short on free Xu was wrongly refused instead of being charged from the lock.
      if (p.info.Money + p.info.MoneyLock < cost) return p.sendMessage(0, ctx.lang.t("UserBuyItemHandler.NoMoney"));
      p.removeMoney(cost);
      const o = new GSPacket(102);
      o.writeByte(11); o.writeInt(p.id);
      toRoom(o);
      return;
    }
    case 38: {
      // BuyBuff: no original cobra 30 Money e o buff vira CreatePayBuffer dentro da luta (GameRoomCreate.cs:46-47) —
      // camada de efeito que o nosso motor de luta ainda não tem. Cobrar sem entregar nada seria vender vento:
      // recusa SEM cobrar até o efeito existir (task m4-catchbeast-buff, mesma lacuna do buff da Captura do Nian).
      if (!b.players.has(p.id)) return;
      p.sendMessage(0, "O reforço de dano do boss mundial ainda não está disponível neste servidor.");
      return;
    }
  }
}

/** Removes a quitting player from the boss room. */
export function eventsOnQuit(ctx: ServerContext, p: GamePlayer): void {
  const b = eventsRuntime(ctx).boss;
  if (b.players.delete(p.id)) {
    const o = new GSPacket(102);
    o.writeByte(4); o.writeInt(p.id);
    for (const id of b.players.keys()) ctx.world.get(id)?.send(o);
  }
}
