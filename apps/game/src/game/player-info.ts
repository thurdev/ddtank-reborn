/**
 * PlayerInfo (SqlDataProvider/Data/PlayerInfo.cs) = player."Sys_Users_Detail" row + the joined columns returned by
 * SP_Users_SingleByUserID (guild, duty, VIP, password questions) + computed stats (Attack/Defence/Agility/Luck/hp).
 */
import type { player } from "@ddt/db";

export type DetailRow = typeof player.Sys_Users_Detail.$inferSelect;
export type MatchRow = typeof player.Sys_User_Match_Info.$inferSelect;

export interface TexpInfo {
  UserID: number;
  spdTexpExp: number;
  attTexpExp: number;
  defTexpExp: number;
  hpTexpExp: number;
  lukTexpExp: number;
  texpTaskCount: number;
  texpCount: number;
  texpTaskDate: Date;
}

export interface PlayerInfo extends DetailRow {
  /** PlayerInfo.ID (= UserID). */
  ID: number;
  // computed by PlayerEquipInventory.UpdatePlayerProperties
  Attack: number;
  Defence: number;
  Agility: number;
  Luck: number;
  hp: number;
  // guild (Consortia / Consortia_Users / Consortia_Duty)
  ConsortiaName: string;
  ConsortiaLevel: number;
  ConsortiaRepute: number;
  ConsortiaHonor: number;
  ConsortiaRiches: number;
  StoreLevel: number;
  ShopLevel: number;
  SmithLevel: number;
  SkillLevel: number;
  DutyLevel: number;
  DutyName: string;
  Right: number;
  ChairmanName: string;
  IsBanChat: boolean;
  // VIP (Sys_VIP_Info)
  typeVIP: number;
  VIPLevel: number;
  VIPExp: number;
  VIPExpireDay: Date;
  VIPLastDate: Date;
  VIPNextLevelDaysNeeded: number;
  CanTakeVipReward: boolean;
  LastVIPPackTime: Date;
  // bag password (Sys_Users_Password, PasswordTwo)
  HasBagPassword: boolean;
  IsLocked: boolean;
  PasswordQuest1: string;
  PasswordQuest2: string;
  FailedPasswordAttemptCount: number;
  Texp: TexpInfo;
  /** WeaklessGuildProgressStr decoded (base64). */
  weaklessGuildProgress: Uint8Array;
}

export function defaultTexp(userId: number, now = new Date()): TexpInfo {
  return {
    UserID: userId,
    spdTexpExp: 0,
    attTexpExp: 0,
    defTexpExp: 0,
    hpTexpExp: 0,
    lukTexpExp: 0,
    texpTaskCount: 0,
    texpCount: 0,
    texpTaskDate: now,
  };
}

export function defaultMatch(userId: number): MatchRow {
  return {
    ID: 0,
    UserID: userId,
    dailyScore: 0,
    dailyWinCount: 0,
    dailyGameCount: 0,
    weeklyScore: 0,
    weeklyRanking: 0,
    weeklyGameCount: 0,
    DailyLeagueFirst: false,
    DailyLeagueLastScore: 0,
    addDayPrestge: 0,
    totalPrestige: 0,
    restCount: 0,
    leagueItemsGet: 0,
    leagueGrade: 0,
    eliteScore: 0,
    eliteRank: 0,
    WeeklyWinCount: 0,
  };
}

/** Columns of Sys_Users_Detail written back by SavePlayer (subset of SP_Users_Update's 86 parameters that are columns). */
export const SAVED_DETAIL_COLUMNS = [
  "Colors", "ConsortiaID", "Gold", "GP", "Grade", "Money", "Style", "State", "Hide", "ExpendDate", "Win", "Total",
  "Escape", "Skin", "Offer", "AntiAddiction", "RichesOffer", "RichesRob", "CheckCount", "MarryInfoID", "DayLoginCount",
  "Nimbus", "LastAward", "GiftToken", "QuestSite", "PvePermission", "FightPower", "AnswerSite", "LastAuncherAward",
  "ChatCount", "SpaPubGoldRoomLimit", "LastSpaDate", "FightLabPermission", "SpaPubMoneyRoomLimit", "IsInSpaPubGoldToday",
  "IsInSpaPubMoneyToday", "AchievementPoint", "LastWeekly", "LastWeeklyVersion", "WeaklessGuildProgressStr", "IsOldPlayer",
  "Score", "OptionOnOff", "isOldPlayerHasValidEquitAtLogin", "badLuckNumber", "luckyNum", "lastLuckyNumDate", "lastLuckNum",
  "IsShowConsortia", "NewDay", "Medal", "Honor", "IsRecharged", "IsGetAward", "evolutionGrade", "evolutionExp",
  "hardCurrency", "EliteScore", "UseOffer", "ShopFinallyGottenTime", "MoneyLock", "LastGetEgg", "IsFistGetPet",
  "LastRefreshPet", "petScore", "accumulativeLoginDays", "accumulativeAwardDays", "honorId", "Repute", "damageScores",
  "totemId", "myHonor", "MaxBuyHonor", "necklaceExp", "necklaceExpAdd", "OnlineTime", "LastDate", "BoxGetDate",
  "AlreadyGetBox", "BoxProgression", "GetBoxLevel", "charmGP", "Sex", "NickName",
] as const satisfies readonly (keyof DetailRow)[];
