/**
 * 404 RING_STATION persistence (Arena Ranqueada) — `player."Sys_User_RingStation"` (UserRingStationInfo, one
 * row per player, m1-schema), `player."Ringstation_Battle_Field"` (RingstationBattleFieldInfo, append-only
 * fight log) and `game."Ringstation_Config"` (RingstationConfigInfo, single admin-tunable row). All 3 tables
 * already exist since migration 0013 (m1-schema) — nothing new to migrate here.
 *
 * C#: `Game.Server.RingStation/RingStationMgr.cs` (`vendor/DDT-6600/Source/Game.Server/Game.Server.RingStation`).
 */
import { and, desc, eq, gte, inArray, lte, ne } from "drizzle-orm";
import { game, player, type Database } from "@ddt/db";

const R = player.Sys_User_RingStation;
export type RingStationRow = typeof R.$inferSelect;

const BF = player.Ringstation_Battle_Field;
export type BattleFieldRow = typeof BF.$inferSelect;

const CFG = game.Ringstation_Config;
export type RingStationConfigRow = typeof CFG.$inferSelect;

const D = player.Sys_Users_Detail;

export function newRingStationRow(userId: number, weaponId: number, baseDamage: number, baseGuard: number, baseEnergy: number, cfg: RingStationConfigRow): RingStationRow {
  const now = new Date();
  return {
    ID: 0, UserID: userId, Rank: 0, WeaponID: weaponId, signMsg: "", ChallengeNum: cfg.ChallengeNum, buyCount: cfg.buyCount,
    Total: 0, ChallengeTime: now, LastDate: now, BaseDamage: baseDamage, BaseGuard: baseGuard, BaseEnergy: baseEnergy,
  };
}

export async function loadRingStationRow(db: Database, userId: number): Promise<RingStationRow | null> {
  const rows = await db.select().from(R).where(eq(R.UserID, userId)).limit(1);
  return rows[0] ?? null;
}

/** Upsert by ID (new rows get `ID: 0` from `newRingStationRow`, so a fresh insert path is taken once). */
export async function saveRingStationRow(db: Database, row: RingStationRow): Promise<RingStationRow> {
  const { ID, ...rest } = row;
  if (ID > 0) {
    await db.update(R).set(rest).where(eq(R.ID, ID));
    return row;
  }
  const [inserted] = await db.insert(R).values(rest).returning();
  return inserted!;
}

/** RingStationMgr.GetRingStationRanks: top 50 by Rank asc (0 = unranked, never shown). */
export async function loadRingStationRanks(db: Database, limit = 50): Promise<RingStationRow[]> {
  return db.select().from(R).where(ne(R.Rank, 0)).orderBy(R.Rank).limit(limit);
}

/** RingStationMgr.FindRingStationInfoByRank: every OTHER ranked player with Rank in [min, max]. */
export async function loadRingStationInRankWindow(db: Database, excludeUserId: number, min: number, max: number): Promise<RingStationRow[]> {
  return db.select().from(R).where(and(ne(R.UserID, excludeUserId), ne(R.Rank, 0), gte(R.Rank, min), lte(R.Rank, max)));
}

/** Count of currently-ranked players (Rank != 0) — used to assign the next free rank to a first-time fighter. */
export async function countRanked(db: Database): Promise<number> {
  const rows = await db.select({ UserID: R.UserID }).from(R).where(ne(R.Rank, 0));
  return rows.length;
}

/** Armory list fields only (RingStationArmory.cs): no need for the full `loadPlayerInfo` join. */
export async function loadBasicInfos(db: Database, userIds: number[]): Promise<Map<number, { Grade: number; NickName: string; FightPower: number; Total: number }>> {
  if (!userIds.length) return new Map();
  const rows = await db.select({ UserID: D.UserID, Grade: D.Grade, NickName: D.NickName, FightPower: D.FightPower, Total: D.Total }).from(D).where(inArray(D.UserID, userIds));
  return new Map(rows.map((r) => [r.UserID, { Grade: r.Grade, NickName: r.NickName ?? "", FightPower: r.FightPower, Total: r.Total }]));
}

/** RingStationMgr.GetRingBattleFields: last 10 log rows for this player, newest first. */
export async function loadBattleField(db: Database, userId: number, limit = 10): Promise<BattleFieldRow[]> {
  return db.select().from(BF).where(eq(BF.UserID, userId)).orderBy(desc(BF.BattleTime)).limit(limit);
}

export async function appendBattleField(db: Database, row: Omit<BattleFieldRow, "ID">): Promise<void> {
  await db.insert(BF).values(row);
}

/** RingStationMgr.Init defaults when the config row doesn't exist yet. */
export function newRingStationConfig(): Omit<RingStationConfigRow, "ID"> {
  const awardTime = new Date();
  awardTime.setDate(awardTime.getDate() + 3);
  return {
    ChallengeNum: 10, buyCount: 10, buyPrice: 8000, cdPrice: 10000, AwardTime: awardTime, AwardNum: 450,
    AwardFightWin: "1-50,25|51-100,20|101-1000000,15", AwardFightLost: "1-50,15|51-100,10|101-1000000,5",
    ChampionText: "", IsFirstUpdateRank: false,
  };
}

/** Loads the single config row, creating it with the original defaults on first use (fresh DB = no legacy rows). */
export async function loadOrCreateRingStationConfig(db: Database): Promise<RingStationConfigRow> {
  const rows = await db.select().from(CFG).limit(1);
  if (rows[0]) return rows[0];
  const [inserted] = await db.insert(CFG).values(newRingStationConfig()).returning();
  return inserted!;
}

export async function saveRingStationConfig(db: Database, row: RingStationConfigRow): Promise<void> {
  const { ID, ...rest } = row;
  await db.update(CFG).set(rest).where(eq(CFG.ID, ID));
}
