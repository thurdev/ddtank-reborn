/**
 * Character load/save — ports of PlayerBussiness procs used by GamePlayer.LoadFromDatabase / SaveIntoDatabase:
 *  SP_Users_SingleByUserID (+ joined guild / duty / VIP / password columns), SP_Get_UserTexp_By_ID,
 *  SP_GetSingleUserMatchInfo, SP_Users_Update, SP_UserTexp_Update, SP_UpdateUserMatch, SP_Users_SingleByNickName,
 *  ManageBussiness.ForbidPlayerByUserID.
 */
import { and, eq, sql } from "drizzle-orm";
import { player, type Database } from "@ddt/db";
import { defaultMatch, defaultTexp, SAVED_DETAIL_COLUMNS, type DetailRow, type MatchRow, type PlayerInfo, type TexpInfo } from "../game/player-info.js";

const D = player.Sys_Users_Detail;

export interface CharacterLookup {
  UserID: number;
  UserName: string;
  NickName: string | null;
  IsExist: boolean;
  ForbidDate: Date;
}

/** Character row by account name (case-insensitive, like SP_Users_LoginWeb @UserName). */
export async function findCharacterByUserName(db: Database, userName: string): Promise<CharacterLookup | null> {
  const rows = await db
    .select({ UserID: D.UserID, UserName: D.UserName, NickName: D.NickName, IsExist: D.IsExist, ForbidDate: D.ForbidDate })
    .from(D)
    .where(sql`lower(${D.UserName}) = lower(${userName})`)
    .limit(1);
  const r = rows[0];
  return r ? { ...r, UserName: r.UserName ?? userName } : null;
}

export async function findUserIdByNickName(db: Database, nick: string): Promise<number | null> {
  const rows = await db.select({ UserID: D.UserID }).from(D).where(eq(D.NickName, nick)).limit(1);
  return rows[0]?.UserID ?? null;
}

function decodeWeakless(s: string | null | undefined): Uint8Array {
  if (!s) return new Uint8Array(0);
  try {
    return new Uint8Array(Buffer.from(s, "base64"));
  } catch {
    return new Uint8Array(0);
  }
}

/** SP_Users_SingleByUserID: detail + guild + duty + VIP + bag password info. */
export async function loadPlayerInfo(db: Database, userId: number): Promise<PlayerInfo | null> {
  const rows = await db.select().from(D).where(eq(D.UserID, userId)).limit(1);
  const d = rows[0];
  if (!d) return null;
  return buildPlayerInfo(db, d);
}

export async function loadPlayerInfoByNick(db: Database, nick: string): Promise<PlayerInfo | null> {
  const rows = await db.select().from(D).where(eq(D.NickName, nick)).limit(1);
  return rows[0] ? buildPlayerInfo(db, rows[0]) : null;
}

async function buildPlayerInfo(db: Database, d: DetailRow): Promise<PlayerInfo> {
  const userId = d.UserID;
  const now = new Date();
  const [vipRows, pwdRows, texp, guild] = await Promise.all([
    db.select().from(player.Sys_VIP_Info).where(eq(player.Sys_VIP_Info.UserID, userId)).limit(1),
    db.select().from(player.Sys_Users_Password).where(eq(player.Sys_Users_Password.UserID, userId)).limit(1),
    loadTexp(db, userId),
    d.ConsortiaID > 0 ? loadGuildColumns(db, d.ConsortiaID, userId) : Promise.resolve(null),
  ]);
  const vip = vipRows[0];
  const pwd = pwdRows[0];
  const hasBagPassword = !!d.PasswordTwo && d.PasswordTwo.length > 0;
  return {
    ...d,
    ID: userId,
    Attack: 0,
    Defence: 0,
    Agility: 0,
    Luck: 0,
    hp: 0,
    ConsortiaName: guild?.ConsortiaName ?? "",
    ConsortiaLevel: guild?.Level ?? 0,
    ConsortiaRepute: guild?.Repute ?? 0,
    ConsortiaHonor: guild?.Honor ?? 0,
    ConsortiaRiches: guild?.Riches ?? 0,
    StoreLevel: guild?.StoreLevel ?? 0,
    ShopLevel: guild?.ShopLevel ?? 0,
    SmithLevel: guild?.SmithLevel ?? 0,
    SkillLevel: guild?.SkillLevel ?? 0,
    DutyLevel: guild?.DutyLevel ?? 0,
    DutyName: guild?.DutyName ?? "",
    Right: guild?.Right ?? 0,
    ChairmanName: guild?.ChairmanName ?? "",
    IsBanChat: guild?.IsBanChat ?? false,
    badgeID: guild ? guild.BadgeID : d.badgeID,
    typeVIP: vip?.typeVIP ?? 0,
    VIPLevel: vip?.VIPLevel ?? 0,
    VIPExp: vip?.VIPExp ?? 0,
    VIPExpireDay: vip?.VIPExpireDay ?? now,
    VIPLastDate: vip?.VIPLastdate ?? now,
    VIPNextLevelDaysNeeded: vip?.VIPNextLevelDaysNeeded ?? 0,
    CanTakeVipReward: vip?.CanTakeVipReward ?? false,
    LastVIPPackTime: vip?.LastVIPPackTime ?? now,
    HasBagPassword: hasBagPassword,
    IsLocked: hasBagPassword,
    PasswordQuest1: pwd?.PasswordQuestion1 ?? "",
    PasswordQuest2: pwd?.PasswordQuestion2 ?? "",
    FailedPasswordAttemptCount: pwd?.FailedPasswordAttemptCount ?? 5,
    Texp: texp,
    weaklessGuildProgress: decodeWeakless(d.WeaklessGuildProgressStr),
  };
}

async function loadGuildColumns(db: Database, consortiaId: number, userId: number) {
  const C = player.Consortia;
  const U = player.Consortia_Users;
  const Du = player.Consortia_Duty;
  const rows = await db
    .select({
      ConsortiaName: C.ConsortiaName,
      Level: C.Level,
      Repute: C.Repute,
      Honor: C.Honor,
      Riches: C.Riches,
      StoreLevel: C.StoreLevel,
      ShopLevel: C.ShopLevel,
      SmithLevel: C.SmithLevel,
      SkillLevel: C.SkillLevel,
      ChairmanName: C.ChairmanName,
      BadgeID: C.BadgeID,
      IsBanChat: U.IsBanChat,
      DutyLevel: Du.Level,
      DutyName: Du.DutyName,
      Right: Du.Right,
    })
    .from(C)
    .leftJoin(U, and(eq(U.ConsortiaID, C.ConsortiaID), eq(U.UserID, userId), eq(U.IsExist, true)))
    .leftJoin(Du, eq(Du.DutyID, U.DutyID))
    .where(and(eq(C.ConsortiaID, consortiaId), eq(C.IsExist, true)))
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  return { ...r, IsBanChat: r.IsBanChat ?? false, DutyLevel: r.DutyLevel ?? 0, DutyName: r.DutyName ?? "", Right: r.Right ?? 0 };
}

/** SP_Get_UserTexp_By_ID. */
export async function loadTexp(db: Database, userId: number): Promise<TexpInfo> {
  const rows = await db.select().from(player.Sys_Users_Texp).where(eq(player.Sys_Users_Texp.UserID, userId)).limit(1);
  return rows[0] ?? defaultTexp(userId);
}

/** SP_GetSingleUserMatchInfo. */
export async function loadMatchInfo(db: Database, userId: number): Promise<MatchRow> {
  const rows = await db.select().from(player.Sys_User_Match_Info).where(eq(player.Sys_User_Match_Info.UserID, userId)).limit(1);
  return rows[0] ?? defaultMatch(userId);
}

/** SP_Users_Update (+ SP_UserTexp_Update, SP_UpdateUserMatch) — upserts the side tables. */
export async function savePlayerInfo(db: Database, info: PlayerInfo, match?: MatchRow): Promise<void> {
  const set: Record<string, unknown> = {};
  for (const k of SAVED_DETAIL_COLUMNS) set[k] = info[k];
  await db.update(D).set(set as Partial<DetailRow>).where(eq(D.UserID, info.ID));
  const t = info.Texp;
  await db
    .insert(player.Sys_Users_Texp)
    .values({ ...t, UserID: info.ID })
    .onConflictDoUpdate({ target: player.Sys_Users_Texp.UserID, set: { ...t, UserID: info.ID } });
  // Sys_VIP_Info (SP_VIPRenewal_Single / UpdateVIPInfo): upsert, the original only UPDATEd an existing row
  const vip = {
    UserID: info.ID, typeVIP: info.typeVIP, VIPLevel: info.VIPLevel, VIPExp: info.VIPExp, VIPExpireDay: info.VIPExpireDay, VIPLastdate: info.VIPLastDate,
    VIPNextLevelDaysNeeded: info.VIPNextLevelDaysNeeded, CanTakeVipReward: info.CanTakeVipReward, LastVIPPackTime: info.LastVIPPackTime,
  };
  await db.insert(player.Sys_VIP_Info).values(vip).onConflictDoUpdate({ target: player.Sys_VIP_Info.UserID, set: vip });
  if (match) {
    const { ID: _id, ...m } = match;
    await db
      .insert(player.Sys_User_Match_Info)
      .values({ ...m, UserID: info.ID })
      .onConflictDoUpdate({ target: player.Sys_User_Match_Info.UserID, set: { ...m, UserID: info.ID } });
  }
}

/** Only the online flag (PlayerInfo.State) — used on login/logout without a full save. */
export async function setOnlineState(db: Database, userId: number, state: number): Promise<void> {
  await db.update(D).set({ State: state }).where(eq(D.UserID, userId));
}

/** ManageBussiness.ForbidPlayerByUserID(id, forbidDate, isExist, reason). */
export async function forbidPlayer(db: Database, userId: number, until: Date, isExist: boolean, reason: string): Promise<void> {
  await db.update(D).set({ ForbidDate: until, IsExist: isExist, ForbidReason: reason }).where(eq(D.UserID, userId));
}

/** Online count for the server heartbeat. */
export async function resetAllOnline(db: Database): Promise<void> {
  await db.update(D).set({ State: 0 }).where(eq(D.State, 1));
}
