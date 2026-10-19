/**
 * RingStationMgr (vendor/DDT-6600/Source/Game.Server/Game.Server.RingStation/RingStationMgr.cs) — Arena
 * Ranqueada (404 RING_STATION, `ringstation.swf`). Challenging a real player fights a server-side SNAPSHOT of
 * their actual stats/equipment (`CreateRingStationChallenge`/`BaseRoomRingStation.PickUpNpcId`, fed through the
 * original's separate Fighting.Server `ProxyRoomMgr.StartWithNpcUnsafe`) — never the client-reported result of
 * a fight that never happened server-side. The original's own RingStationBattleServer/dictionary_0 plumbing
 * (a second TCP relay to Fighting.Server) has no equivalent here: `rooms/room-mgr.ts createRingStationBattle`
 * just hands the snapshot bot straight to `FightEngine.startPvp`, same pattern as the Match-queue bot fallback
 * and `createConsortiaBattleRoom`.
 *
 * Exploit avoided: the original's own `RingStationChallenge.cs` only decrements `ChallengeNum`/sets the
 * 10-minute cooldown AFTER the fight resolves (`UpdateRingBattleFields`, called from `RingstationResult`) —
 * nothing stops a client from firing `sendRingStationChallenge` many times back-to-back before the first fight
 * even starts, spawning unlimited concurrent rooms/bots and collecting unlimited League Money per "challenge
 * window" (ChallengeNum/CanChallenge both still read the pre-fight value). `pending` below closes that: a
 * second challenge from the same player while one is still in flight is rejected, matching the spirit of "one
 * challenge in flight per player" without changing the original's reward timing (ChallengeNum/ChallengeTime
 * still update at fight-end, byte-for-byte the same formula).
 */
import type { GSPacket } from "@ddt/protocol";
import type { Database } from "@ddt/db";
import * as Out from "../packets/out.js";
import type { RoomMember } from "./player.js";
import type { GamePlayer } from "./player.js";
import type { PlayerInfo } from "./player-info.js";
import { defaultMatch, defaultTexp } from "./player-info.js";
import type { ServerContext } from "../session/context.js";
import { loadPlayerInfo } from "../db/characters.js";
import {
  appendBattleField, countRanked, loadOrCreateRingStationConfig, loadRingStationInRankWindow,
  loadRingStationRow, saveRingStationRow, newRingStationRow,
  type RingStationConfigRow, type RingStationRow,
} from "../db/ringstation.js";

/** RingStationMgr.GetWeaponID: slot 6 of the Style csv ("tplId|pic"), 7008 (fists) when absent/malformed. */
export function weaponIdFromStyle(style: string | null | undefined): number {
  const slot = (style ?? "").split(",")[6];
  const tpl = slot?.split("|")[0];
  const n = tpl ? parseInt(tpl, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 7008;
}

/**
 * UserRingStationInfo.CanChallenge: `(600000 - elapsedMs) / 10 / 60 / 1000 <= 0`, three CASCADED INTEGER
 * divisions (not one divide by 600000) — ported literally, truncation bug and all. Each `/N` floors toward
 * zero like C#'s `int/int`, and that cascade makes the final `/1000` hit 0 for ANY `elapsedMs >= 1`: in
 * practice this "10-minute cooldown" lets a second challenge through almost immediately (only `elapsedMs ===
 * 0`, i.e. the very same millisecond as the last `ChallengeTime` write, is blocked). Not a dupe/currency/
 * rank exploit to fix — mirroring the live server's actual behavior, not the "10 minutes" the field name and
 * `AddMinutes(10)`/`AddMinutes(-1)` callers suggest was intended; `pending` above is what actually caps the
 * challenge rate (one fight in flight per player).
 */
export function canChallenge(row: RingStationRow, now = Date.now()): boolean {
  const elapsed = now - row.ChallengeTime.getTime();
  const a = Math.trunc((600000 - elapsed) / 10);
  const b = Math.trunc(a / 60);
  const c = Math.trunc(b / 1000);
  return c <= 0;
}

/** RingstationConfigInfo.AwardNumByRank: periodic ladder reward shown in GetInfo (mailed out is m3-ringstation-2). */
export function awardNumByRank(cfg: RingStationConfigRow, rank: number): number {
  if (rank === 0) return 0;
  return rank > 0 && rank < 30 ? cfg.AwardNum - 10 * rank : cfg.AwardNum - 350;
}

/** RingstationConfigInfo.AwardBattleByRank: League Money for one battle, by the CHALLENGER's rank BEFORE it. */
export function awardBattleByRank(cfg: RingStationConfigRow, rank: number, isWin: boolean): number {
  if (rank === 0) return isWin ? 10 : 5;
  const spec = isWin ? cfg.AwardFightWin : cfg.AwardFightLost;
  if (!spec) return 0;
  for (const part of spec.split("|")) {
    const [range, amountStr] = part.split(",");
    if (!range || amountStr === undefined) continue;
    const [minStr, maxStr] = range.split("-");
    const min = Number(minStr), max = Number(maxStr);
    if (rank < min || rank > max) continue;
    return Number(amountStr) || 0;
  }
  return 0;
}

/** BaseRingStationChallenges: the "no rank yet" practice opponent — always available, never OnFight-locked,
 *  never swaps rank. Same fixed stats as the original (a made-up "normal player", not a real account).
 *  Simplification: the original dresses it from a pool of 25 pre-built "virtual player" outfits
 *  (`RingStationMgr.SetupVirtualPlayer`/`GetVirtualPlayerInfo`, random item-template pics) — visual only,
 *  doesn't affect combat; we use one fixed plain outfit instead of porting that pool. */
const BASELINE_INFO = {
  ID: -1, UserID: -1, UserName: "NormalInfo", Sex: false, Grade: 25, Style: ",,,,,,7008|0,,,,,,,,,", Colors: ",,,,,,,,,,,,,,,",
  Skin: "", Hide: 1111111111, Honor: "", Attack: 225, Defence: 160, Agility: 50, Luck: 60, hp: 3500,
  ConsortiaID: 0, ConsortiaName: "", ConsortiaLevel: 0, ConsortiaRepute: 0, Texp: defaultTexp(-1), typeVIP: 1, VIPLevel: 1,
  Offer: 0, Win: 0, Total: 0, Escape: 0, Repute: 0, Nimbus: 0, GP: 1437053, FightPower: 14370, AchievementPoint: 0,
} as unknown as PlayerInfo;

/** RoomMember snapshot of a real player's (or the baseline bot's) stats — fights with the defender's REAL
 *  Attack/Defence/Agility/Luck/hp/equip visuals (`info`), `baseAttack`/`baseDefence` cached the same way the
 *  original caches `BaseDamage`/`BaseGuard` (whenever that player last opened their own panel, `ensureOwnRow`
 *  below) so the fight engine (`fight/ddt.ts specOf`) weighs the weapon the same way a real seat would, not the
 *  generic "100 base" fallback used for nameless `VirtualPlayer` bots. */
export class RingStationBot implements RoomMember {
  readonly isBot = true;
  currentRoom = null as RoomMember["currentRoom"];
  roomIndex = -1;
  roomTeam = 1;
  isViewer = false;
  readonly playerState = 1;
  readonly clientKind = "41" as const;
  readonly hasMainWeapon = true;

  constructor(readonly info: PlayerInfo, private readonly weaponTemplateId: number, readonly baseAttack: number, readonly baseDefence: number) {}

  /** Never the real UserID: this object never touches `ctx.world`, but stays clear of it anyway. */
  get id(): number { return -1_000_000 - Math.abs(this.info.ID); }

  view(): Out.PlayerView {
    return {
      id: this.id, info: this.info, match: defaultMatch(this.id), zoneId: 0, zoneName: "", roomIndex: this.roomIndex,
      roomTeam: this.roomTeam, inRoom: false, pingTime: 0, weaponTemplateId: this.weaponTemplateId,
      secondWeaponTemplateId: 0, medal: 0, clientKind: this.clientKind,
    };
  }
  send(_pkt: GSPacket): void {}
  sendMessage(): void {}
}

/** Builds the always-available practice opponent (Rank 0, `isAutoBot` path of `GetRingStationChallenge`). */
export function baselineBot(): RingStationBot {
  return new RingStationBot(BASELINE_INFO, weaponIdFromStyle(BASELINE_INFO.Style), 242, 120);
}

/** Pending challenge, kept only for the lifetime of one fight (challenge -> onFightOver). Mirrors the
 *  challenger's own `DareFlag`/`SuccessFlag` fields (GamePlayer.cs) — `dare` is always this player's own
 *  entry, `success` is the real defender's (absent for the baseline bot, same as the original). */
export interface PendingRingStationFight {
  dare: { userId: number; userName: string; levelBefore: number; battleTime: Date };
  success: { userId: number; userName: string; levelBefore: number; battleTime: Date } | null;
}

/** RoomMgr.RingStationMgr-equivalent runtime state: `onFight` mirrors `UserRingStationInfo.OnFight` (memory
 *  only, never persisted — same as the original's property, whose setter never marks `_isDirty`), `pending`
 *  guards against the concurrent-challenge exploit described in the file banner. One per channel (`ctx.ringStation`). */
export class RingStationRoom {
  private readonly onFight = new Set<number>();
  private readonly pending = new Map<number, PendingRingStationFight>();
  private config: RingStationConfigRow | null = null;

  async getConfig(db: Database): Promise<RingStationConfigRow> {
    if (!this.config) this.config = await loadOrCreateRingStationConfig(db);
    return this.config;
  }

  isLocked(userId: number): boolean { return this.onFight.has(userId); }
  lock(userId: number): void { this.onFight.add(userId); }
  unlock(userId: number): void { this.onFight.delete(userId); }

  hasPending(challengerId: number): boolean { return this.pending.has(challengerId); }
  setPending(challengerId: number, p: PendingRingStationFight): void { this.pending.set(challengerId, p); }
  takePending(challengerId: number): PendingRingStationFight | undefined {
    const p = this.pending.get(challengerId);
    this.pending.delete(challengerId);
    return p;
  }
}

/** RingStationViewInfo.cs / RingStationMgr.LoadRingStationInfo: cache this player's OWN current base atk/def +
 *  weapon into their row every time they open the panel — this is what lets a LATER challenger fight an
 *  accurate snapshot of them even if they're offline by then. Creates the row on first visit. */
export async function ensureOwnRow(ctx: ServerContext, p: GamePlayer): Promise<RingStationRow> {
  const cfg = await ctx.ringStation.getConfig(ctx.db.db);
  const weaponId = weaponIdFromStyle(p.info.Style);
  const existing = await loadRingStationRow(ctx.db.db, p.id);
  // RingStationMgr.LoadRingStationInfo: `(int)(1.0 - Agility * 0.001)` truncates to 0 for any realistic
  // Agility — only ever read back by the original's separate Fighting.Server relay (`BaseAgility`, see file
  // banner), which we don't have an equivalent of; kept for schema fidelity, not read anywhere in this port.
  const baseEnergy = Math.trunc(1 - p.info.Agility * 0.001);
  if (!existing) {
    const row = newRingStationRow(p.id, weaponId, p.baseAttack, p.baseDefence, baseEnergy, cfg);
    return saveRingStationRow(ctx.db.db, row);
  }
  if (existing.BaseDamage !== p.baseAttack || existing.BaseGuard !== p.baseDefence || existing.WeaponID !== weaponId) {
    existing.BaseDamage = p.baseAttack;
    existing.BaseGuard = p.baseDefence;
    existing.WeaponID = weaponId;
    return saveRingStationRow(ctx.db.db, existing);
  }
  return existing;
}

/** RingStationMgr.GetRingStationChallenge: a specific REAL opponent only when the client passed a non-zero
 *  rank (i.e. picked one of the ranked neighbors GetInfo showed) AND that row still exists; otherwise the
 *  baseline practice bot, same fallback as the original. */
export async function resolveChallengeTarget(ctx: ServerContext, targetUserId: number, rank: number): Promise<{ bot: RingStationBot; row: RingStationRow | null }> {
  if (rank !== 0) {
    const row = await loadRingStationRow(ctx.db.db, targetUserId);
    if (row) {
      const info = ctx.world.get(targetUserId)?.info ?? (await loadPlayerInfo(ctx.db.db, targetUserId));
      if (info) return { bot: new RingStationBot(info, row.WeaponID, row.BaseDamage, row.BaseGuard), row };
    }
  }
  return { bot: baselineBot(), row: null };
}

/** One entry of the challenge list GetInfo shows (`readPersonInfo` in the client) — a real ranked neighbor or
 *  the baseline practice bot, each with its own ladder-facing fields (`rank`/`signMsg`/`weaponId`) alongside
 *  the full `PlayerInfo` the client renders the little character with. */
export interface ChallengeListEntry { info: PlayerInfo; weaponId: number; rank: number; signMsg: string }

function baselineEntry(): ChallengeListEntry {
  const bot = baselineBot();
  return { info: bot.info, weaponId: weaponIdFromStyle(bot.info.Style), rank: 0, signMsg: "" };
}

/** RingStationMgr.GetRingStationInfos: up to 4 random neighbors within the rank window, falling back to the
 *  baseline bot alone when nobody else is ranked yet (new ladder / self is the only entry). */
export async function pickChallengeList(ctx: ServerContext, selfUserId: number, selfRank: number): Promise<ChallengeListEntry[]> {
  const WINDOW = 10;
  if (selfRank > 0) {
    const total = await countRanked(ctx.db.db);
    let min = selfRank, max = total;
    const half = Math.floor(WINDOW / 2);
    if (selfRank !== total && total - selfRank >= half) {
      if (total - selfRank > WINDOW) { min = selfRank - half; max = selfRank + half; }
    } else min = total - WINDOW;
    if (min < half) { max = min + WINDOW; min = 0; }
    if (min < 0) min = 0;
    const pool = await loadRingStationInRankWindow(ctx.db.db, selfUserId, min, max);
    const picked: RingStationRow[] = [];
    while (picked.length < 4 && pool.length) picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]!);
    const out: ChallengeListEntry[] = [];
    for (const r of picked) {
      const info = ctx.world.get(r.UserID)?.info ?? (await loadPlayerInfo(ctx.db.db, r.UserID));
      if (info) out.push({ info, weaponId: r.WeaponID, rank: r.Rank, signMsg: r.signMsg });
    }
    if (out.length) return out;
  }
  return [baselineEntry()];
}

/**
 * RingStationMgr.UpdateRingBattleFields + GamePlayer.AddPrestige/RingstationResult, run from the fight's
 * `onPlayerGameOver` hook (server.ts) for `RoomType.RingStation`. Order matches the original exactly: the
 * League Money award uses the challenger's rank BEFORE this update; the rank swap/battle-log update happens
 * after. Never trusts `isWin` from the client — it comes from the fight engine's own result.
 */
export async function onFightOver(ctx: ServerContext, challenger: GamePlayer, isWin: boolean): Promise<void> {
  const pending = ctx.ringStation.takePending(challenger.id);
  if (!pending) return;
  const db = ctx.db.db;
  const cfg = await ctx.ringStation.getConfig(db);
  const row = await loadRingStationRow(db, challenger.id);
  if (!row) return;

  const award = awardBattleByRank(cfg, row.Rank, isWin);
  if (award > 0) {
    challenger.addLeagueMoney(award);
    challenger.sendMessage(0, ctx.lang.t(isWin ? "Ringstasion.BattleWin" : "Ringstasion.BattleLost", award));
  }

  if (row.Rank === 0) row.Rank = (await countRanked(db)) + 1;
  if (row.ChallengeNum > 0) {
    row.ChallengeNum--;
    row.ChallengeTime = new Date(Date.now() + 10 * 60_000);
  }
  if (isWin) row.Total++;

  let defenderRow: RingStationRow | null = null;
  if (pending.success) defenderRow = await loadRingStationRow(db, pending.success.userId);
  let swapped = false;
  if (isWin && defenderRow && row.Rank > defenderRow.Rank) {
    const challengerRank = row.Rank;
    row.Rank = defenderRow.Rank;
    defenderRow.Rank = challengerRank;
    swapped = true;
  }
  await saveRingStationRow(db, row);

  const dareLevel = pending.dare.levelBefore === row.Rank ? 0 : row.Rank;
  await appendBattleField(db, { UserID: pending.dare.userId, DareFlag: true, UserName: pending.dare.userName, SuccessFlag: isWin, Level: dareLevel, BattleTime: pending.dare.battleTime });

  if (pending.success) {
    // Unconditional on finding the row again: never leave the defender's OnFight lock stuck even if their
    // row vanished between the challenge and this fight ending.
    ctx.ringStation.unlock(pending.success.userId);
    if (defenderRow) {
      if (swapped) await saveRingStationRow(db, defenderRow);
      const successLevel = pending.success.levelBefore === defenderRow.Rank ? 0 : defenderRow.Rank;
      await appendBattleField(db, { UserID: pending.success.userId, DareFlag: false, UserName: pending.success.userName, SuccessFlag: !isWin, Level: successLevel, BattleTime: pending.success.battleTime });
    }
  }
}
