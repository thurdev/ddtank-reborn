/**
 * Aba no jogo: ícone do hall "Liga" (Chiến thần / Deus da Guerra — stats fixos de referência + prestígio +
 * ranking semanal) e "Liga de elite" (EliteGame — janela por horário/nota, sala de combate pontuada +
 * chaveamento eliminatório real).
 * A janela em si é decidida pelo agendador (`agendador.ts`, kinds "league"/"elite"/"elite_champion");
 * este arquivo é o que o cliente lê/manda enquanto a janela está aberta, e o motor de chaveamento (m3-elite-brackets).
 * Pacotes: 132 BATTLEGROUND (sub 3 info/rank/prestígio, sub 5 stats de referência fixos),
 *   162 ELITEGAME (sub 1 status, sub 2 entrar na sala, sub 3 meu rank/pontuação, sub 4 campeões).
 * C#: `BattleGroundHandler.cs`, `EliteGameHandler.cs`.
 * Como testar: `apps/game/test/elite-brackets.test.ts` (162 ELITEGAME). `132 BATTLEGROUND` sem teste dedicado
 * ainda. Manual: `docs/features/eventos.md`.
 */
import { sql } from "drizzle-orm";
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer, RoomMember } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { RoomType } from "../../rooms/room.js";
import * as Out from "../../packets/out.js";
import { claimOnce, grantRewards, type Reward } from "../../game/events.js";
import { mailItems } from "../bolsa/correio-excedente.js";
import { eventsRuntime, type EventsRuntime } from "./agendador.js";
import type { ActiveWindow } from "../../game/scheduler.js";

/** 162/1 (resposta de status) — compartilhado com o agendador (broadcast quando a janela elite abre/fecha). */
export function eliteStatusPkt(status: number): GSPacket {
  const p = new GSPacket(162);
  p.writeByte(1);
  p.writeInt(status);
  return p;
}

// ------------------------------------------------------------------ 132 BATTLEGROUND (liga / Chiến thần)
/** PlayerBattle's reference stats are hard-coded constants in the original too (not derived from the player). */
const BATTLE_REF = { Agility: 1600, Attack: 1700, Blood: 25000, Damage: 1000, Defend: 1500, Energy: 293, Guard: 500, Lucky: 1500 };
const FAIR_BATTLE_DAY_PRESTIGE = 2000;

async function leagueRank(ctx: ServerContext, userId: number): Promise<number> {
  const res = (await ctx.db.db.execute(sql`
    SELECT rnk FROM (SELECT "UserID", RANK() OVER (ORDER BY "weeklyScore" DESC) rnk FROM player."Sys_User_Match_Info") x WHERE "UserID" = ${userId}`)) as unknown;
  const rows = (Array.isArray(res) ? res : ((res as { rows?: unknown[] }).rows ?? [])) as { rnk: number }[];
  return rows[0]?.rnk ?? 0;
}

export async function battleGroundHandler(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const b = pkt.readByte();
  const out = new GSPacket(132, p.id);
  if (b === 3) {
    const b2 = pkt.readByte();
    out.writeByte(3); out.writeBoolean(true); out.writeByte(b2);
    if (b2 === 2) out.writeInt(await leagueRank(ctx, p.id));
    else if (b2 === 1) { out.writeInt(p.match.addDayPrestge ?? 0); out.writeInt(p.match.totalPrestige ?? 0); out.writeInt(FAIR_BATTLE_DAY_PRESTIGE); }
    p.send(out);
  } else if (b === 5) {
    out.writeByte(5);
    out.writeInt(BATTLE_REF.Attack); out.writeInt(BATTLE_REF.Defend); out.writeInt(BATTLE_REF.Agility); out.writeInt(BATTLE_REF.Lucky);
    out.writeInt(BATTLE_REF.Damage); out.writeInt(BATTLE_REF.Guard); out.writeInt(BATTLE_REF.Blood); out.writeInt(BATTLE_REF.Energy);
    p.send(out);
  }
}

// ------------------------------------------------------------------ 162 ELITEGAME: brackets (m3-elite-brackets)
/**
 * Quem joga contra quem e como a fase avança. O motor de pareamento/avanço real do original NUNCA esteve em
 * nenhum vendor que temos: `Game.Logic/ExerciseMgr.cs` só GUARDA estado (`AddEliteRound`/`dictionary_1`
 * EliteGameChampionPlayersList); todo escritor de verdade (`Game.Server/LoginServerConnector.cs:1386-1452`,
 * `HandlerEliteGameRoundAdd`/`HandlerEliteGameSynPlayers`/`HandlerEliteGameStatusUpdate`) só RECEBE de um
 * processo "Center"/login-server externo que não está em nenhum dump do vendor — mesma categoria de decisão já
 * tomada pra King Division/Crosszone (`research/6600/crosszone.md`: motor local em vez do cross-server
 * ausente). Confirmado pelo cliente real (`eliteGame/EliteGameController.as`):
 *  - fase de pontuação: sala PvP normal, `94 GAME_ROOM` roomType `eRoomType.EliteGameScore`=12
 *    (`joinEliteGame` → `sendCreateRoom("",12,3)`) — NUNCA passa pelo 162.
 *  - fase de campeão: `162/2` (`sendEliteGameStart`) + `sendCreateRoom("",13,3)` (`eRoomType.EliteGameChampion`=13).
 * Tamanho do bracket (16) e os dois grupos de nível (30-40/41-50) batem com `EliteGameTopSixteenInfo`/
 * `topSixteen30_40`/`paarungRound30_40`/`topSixteen41_50`/`paarungRound41_50` (`EliteGameModel.as`) — forte
 * confirmação do desenho. A matemática exata de seed/colocação abaixo é reconstrução nossa (documentada como
 * tal, não um chute apresentado como fato — o C# original nunca teve esse motor em nenhum dump).
 * `EliteGameHandler.cs case 2: if (ExerciseMgr.EliteStatus == 5 ...)` checa os bits de PONTUAÇÃO (1|4) pra
 * liberar a sala de CAMPEÃO — mesma categoria de bug de copy-paste já encontrado e corrigido em outro handler
 * deste projeto (`m3-king-bless-deed`, `SendDeedMain` usando `KingBlessIndex` em vez de `DeedIndex`); como o
 * motor de campeonato nunca rodou em produção (sem o processo externo), esse branch nunca foi exercitado —
 * aqui ele é CORRIGIDO pra checar os bits de CAMPEÃO (2|8) de verdade, não replicado.
 */
export const ELITE_BRACKET_SIZE = 16;
const ELITE_MIN_GRADE = 30;
const ELITE_MID_GRADE = 40;
const ELITE_MAX_GRADE = 50;

export interface EliteSeed { userId: number; nick: string; score: number }
export interface EliteMatch { a: number | null; b: number | null; winner: number | null; inProgress: boolean }
export interface EliteGroup {
  gameType: 1 | 2;
  seeds: EliteSeed[];
  round: number;
  totalRounds: number;
  matches: EliteMatch[];
  /** userId -> round eliminated at (1-indexed); the champion is never added here. */
  eliminatedAt: Map<number, number>;
  champion: number | null;
}
export interface EliteBracketState {
  groups: Map<1 | 2, EliteGroup>;
}
export function defaultEliteBracket(): EliteBracketState {
  return { groups: new Map() };
}

function groupFor(grade: number): 1 | 2 | null {
  if (grade < ELITE_MIN_GRADE || grade > ELITE_MAX_GRADE) return null;
  return grade <= ELITE_MID_GRADE ? 1 : 2;
}
function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/** A match missing one side (bye, from padding to a power of two) auto-advances the present side. */
function resolveByes(group: EliteGroup): void {
  for (const m of group.matches) {
    if (m.winner != null || (m.a == null && m.b == null)) continue;
    if (m.a == null) m.winner = m.b;
    else if (m.b == null) m.winner = m.a;
  }
  maybeAdvanceRound(group);
}

/** Once every match of the current round has a winner, builds the next round (or crowns the champion). */
function maybeAdvanceRound(group: EliteGroup): void {
  if (group.champion != null) return;
  if (!group.matches.every((m) => m.winner != null)) return;
  const winners = group.matches.map((m) => m.winner!);
  for (const m of group.matches) {
    const loser = m.winner === m.a ? m.b : m.a;
    if (loser != null) group.eliminatedAt.set(loser, group.round);
  }
  if (winners.length <= 1) {
    group.champion = winners[0] ?? null;
    return;
  }
  group.round++;
  group.matches = [];
  for (let i = 0; i < winners.length; i += 2) group.matches.push({ a: winners[i]!, b: winners[i + 1] ?? null, winner: null, inProgress: false });
  resolveByes(group); // defensive — real byes only ever happen building round 1
}

function buildGroup(gameType: 1 | 2, seeds: EliteSeed[]): EliteGroup | null {
  if (seeds.length < 2) return null;
  const size = nextPow2(Math.min(seeds.length, ELITE_BRACKET_SIZE));
  const totalRounds = Math.log2(size);
  const padded: (EliteSeed | null)[] = seeds.slice(0, size);
  while (padded.length < size) padded.push(null);
  const matches: EliteMatch[] = [];
  // standard single-elimination seeding: 1 vs N, 2 vs N-1, ...
  for (let i = 0; i < size / 2; i++) matches.push({ a: padded[i]?.userId ?? null, b: padded[size - 1 - i]?.userId ?? null, winner: null, inProgress: false });
  const group: EliteGroup = { gameType, seeds: padded.filter((s): s is EliteSeed => !!s), round: 1, totalRounds, matches, eliminatedAt: new Map(), champion: null };
  resolveByes(group);
  return group;
}

function findMatch(group: EliteGroup, userId: number): EliteMatch | null {
  return group.matches.find((m) => m.winner == null && (m.a === userId || m.b === userId)) ?? null;
}

/** 162/4's roundsReached/eliminated/rank per `EliteGameController.__detailHandler`'s reader (id/name/rank/int/int). */
function placementOf(group: EliteGroup, userId: number): { rank: number; roundsReached: number; eliminated: boolean } {
  if (group.champion === userId) return { rank: 1, roundsReached: group.totalRounds, eliminated: false };
  const r = group.eliminatedAt.get(userId);
  if (r == null) return { rank: 0, roundsReached: Math.max(0, group.round - 1), eliminated: false }; // still in the running
  return { rank: 2 ** (group.totalRounds - r) + 1, roundsReached: r, eliminated: true }; // tied placement tier
}

/** `elite` (score) status bits (1 grupo 30-40 / 4 grupo 41-50). `criar-sala.ts` consulta antes de abrir sala 12. */
export function eliteScoreOpenFor(rt: EventsRuntime, grade: number): boolean {
  const grp = groupFor(grade);
  return !!grp && !!(rt.eliteStatus & (grp === 1 ? 1 : 4));
}

/** `fight/ddt.ts` onPlayerGameOver → server.ts hook: ladder do ELITE_GAME_SCORE room (sem fonte C# — motor
 *  real era externo; constantes nossas, documentadas, admin pode ajustar via Server_Config no futuro). */
export function updateEliteScore(p: GamePlayer, win: boolean): void {
  const K_WIN = 15;
  const K_LOSE = 10;
  p.info.EliteScore = Math.max(0, (p.info.EliteScore ?? 0) + (win ? K_WIN : -K_LOSE));
}

/** `elite_champion` onStart (agendador.ts): monta os dois brackets top-16 a partir de `Sys_Users_Detail.EliteScore`. */
export async function startEliteChampion(ctx: ServerContext, rt: EventsRuntime): Promise<void> {
  const res = (await ctx.db.db.execute(sql`
    SELECT "UserID", "NickName", "EliteScore", "Grade" FROM player."Sys_Users_Detail"
    WHERE "Grade" BETWEEN ${ELITE_MIN_GRADE} AND ${ELITE_MAX_GRADE} AND "EliteScore" > 0 ORDER BY "EliteScore" DESC`)) as unknown;
  const rows = (Array.isArray(res) ? res : ((res as { rows?: unknown[] }).rows ?? [])) as { UserID: number; NickName: string; EliteScore: number; Grade: number }[];
  rt.elite.groups.clear();
  let bits = 0;
  for (const gt of [1, 2] as const) {
    const seeds = rows.filter((r) => groupFor(r.Grade) === gt).slice(0, ELITE_BRACKET_SIZE).map((r) => ({ userId: r.UserID, nick: r.NickName, score: r.EliteScore }));
    const group = buildGroup(gt, seeds);
    if (group) { rt.elite.groups.set(gt, group); bits |= gt === 1 ? 2 : 8; }
  }
  rt.eliteStatus = (rt.eliteStatus & ~10) | bits; // só os bits de campeão (2|8) — score (1|4) é de outra janela
  for (const p of ctx.world.all()) p.send(eliteStatusPkt(rt.eliteStatus));
  if (bits) for (const p of ctx.world.all()) p.send(Out.message(1, "Fase de campeões da Liga de Elite começou! Entre pelo ícone no hall."));
}

/** `elite_champion` onEnd (agendador.ts): prêmio por colocação final, 1× por jogador+janela (`claimOnce`). */
export async function finishEliteChampion(ctx: ServerContext, rt: EventsRuntime, w: ActiveWindow): Promise<void> {
  const awards = (Array.isArray(w.ev.params.eliteAwards) ? w.ev.params.eliteAwards : []) as { rank: number; giftToken?: number; gold?: number; items?: Reward[] }[];
  for (const [gt, group] of rt.elite.groups) {
    for (const s of group.seeds) {
      const info = placementOf(group, s.userId);
      const tier = awards.filter((a) => info.rank > 0 && info.rank <= a.rank).sort((a, b) => a.rank - b.rank)[0];
      if (!tier || !(await claimOnce(ctx.db.db, s.userId, "elite", `${w.key.slice(0, 50)}:${gt}`))) continue;
      const rewards: Reward[] = [...(tier.items ?? [])];
      if (tier.giftToken) rewards.push({ templateId: -1100, count: tier.giftToken });
      if (tier.gold) rewards.push({ templateId: -100, count: tier.gold });
      const pl = ctx.world.get(s.userId);
      if (pl) {
        const g = grantRewards(pl, rewards, ctx.templates.findItem, ctx.now());
        if (g.overflow.length) await mailItems(ctx, pl, g.overflow, "Liga de Elite", 12);
        pl.sendMessage(0, `Liga de Elite: ${info.rank}º lugar. Prêmio: ${g.summary.join(", ")}.`);
      } else {
        // m3-elite-brackets (simplificação documentada): entrega offline é só moeda direto no banco, sem o
        // round-trip cross-channel que o boss mundial tem (`bus/cross-channel.ts deliverReward`) — feature de
        // um canal só por ora, follow-up se vier a ser pedido (mesma categoria de m3-ringstation-2).
        const gt_ = rewards.filter((r) => r.templateId === -1100).reduce((a, r) => a + r.count, 0);
        const gold = rewards.filter((r) => r.templateId === -100).reduce((a, r) => a + r.count, 0);
        if (gt_ || gold) await ctx.db.db.execute(sql`UPDATE player."Sys_Users_Detail" SET "GiftToken" = "GiftToken" + ${gt_}, "Gold" = "Gold" + ${gold} WHERE "UserID" = ${s.userId}`);
      }
    }
  }
  rt.elite.groups.clear();
  rt.eliteStatus &= ~10;
  for (const p of ctx.world.all()) p.send(eliteStatusPkt(rt.eliteStatus));
}

/** `fight/ddt.ts` onGameOver → server.ts hook: resolve 1 round do bracket de campeão (RoomType.EliteGameChampion). */
export function eliteChampionGameOver(ctx: ServerContext, g: { players: { member: RoomMember; win: boolean }[] }): void {
  const rt = eventsRuntime(ctx);
  const winner = g.players.find((x) => x.win)?.member;
  if (!winner) return;
  for (const [, group] of rt.elite.groups) {
    const match = group.matches.find((m) => m.inProgress && (m.a === winner.id || m.b === winner.id));
    if (match) {
      match.winner = winner.id;
      maybeAdvanceRound(group);
      return;
    }
  }
}

/** `onPlayerFlee` hook (server.ts): fugir de uma luta de campeão conta como derrota (mesmo padrão do m3-ringstation). */
export function eliteChampionFlee(ctx: ServerContext, p: GamePlayer): void {
  const rt = eventsRuntime(ctx);
  for (const [, group] of rt.elite.groups) {
    const match = group.matches.find((m) => m.inProgress && (m.a === p.id || m.b === p.id));
    if (match) {
      match.winner = match.a === p.id ? match.b : match.a;
      maybeAdvanceRound(group);
      return;
    }
  }
}

async function eliteSelfRank(ctx: ServerContext, userId: number): Promise<number> {
  const res = (await ctx.db.db.execute(sql`
    SELECT rnk FROM (SELECT "UserID", RANK() OVER (ORDER BY "EliteScore" DESC) rnk FROM player."Sys_Users_Detail"
      WHERE "Grade" BETWEEN ${ELITE_MIN_GRADE} AND ${ELITE_MAX_GRADE} AND "EliteScore" > 0) x WHERE "UserID" = ${userId}`)) as unknown;
  const rows = (Array.isArray(res) ? res : ((res as { rows?: unknown[] }).rows ?? [])) as { rnk: number }[];
  return rows[0]?.rnk ?? 0;
}

/** EliteGameHandler: 1 status, 2 champion-room trigger (real bracket match, see above), 3 rank/score, 4 champions list. */
export async function eliteGameHandler(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const rt = eventsRuntime(ctx);
  const sub = pkt.readByte();
  const out = new GSPacket(162);
  if (sub === 1) {
    out.writeByte(1); out.writeInt(rt.eliteStatus);
    p.send(out);
    return;
  }
  if (sub === 2) {
    if (!ctx.cfg.ALL_OPEN && p.info.Grade < ELITE_MIN_GRADE) return;
    const grp = groupFor(p.info.Grade);
    const bit = grp === 1 ? 2 : grp === 2 ? 8 : 0;
    if (!grp || !(rt.eliteStatus & bit)) return;
    const group = rt.elite.groups.get(grp);
    const match = group ? findMatch(group, p.id) : null;
    if (!group || !match || match.inProgress) return;
    const opponentId = match.a === p.id ? match.b : match.a;
    if (opponentId == null) return; // defensive — byes auto-resolve at round build time
    out.writeByte(2);
    p.send(out);
    const opponent = ctx.world.get(opponentId);
    if (!opponent) {
      // offline opponent = W.O. (forfeit) — see the "simplificação documentada" note above `finishEliteChampion`.
      match.winner = p.id;
      maybeAdvanceRound(group);
      p.sendMessage(0, "Seu adversário da Liga de Elite não está online — você avança por W.O.");
      return;
    }
    match.inProgress = true;
    ctx.rooms.createEliteChampionRoom(p, opponent);
    return;
  }
  if (sub === 3) {
    out.writeByte(3);
    out.writeInt(await eliteSelfRank(ctx, p.id));
    out.writeInt(p.info.EliteScore ?? 0);
    p.send(out);
    return;
  }
  if (sub === 4) {
    const gt = pkt.readInt();
    const group = rt.elite.groups.get(gt === 2 ? 2 : 1);
    out.writeByte(4);
    out.writeInt(gt);
    const seeds = group?.seeds ?? [];
    out.writeInt(seeds.length);
    for (const s of seeds) {
      const info = placementOf(group!, s.userId);
      out.writeInt(s.userId); out.writeString(s.nick); out.writeInt(info.rank); out.writeInt(info.roundsReached); out.writeInt(info.eliminated ? 1 : 0);
    }
    p.send(out);
    return;
  }
}
