/**
 * Server -> client packet builders: port of Game.Server/Packets/Packets/AbstractPacketLib.cs (line refs per builder)
 * and Game.Logic BaseGame.SendCreateGame / SendStartLoading. Builders only BUILD; callers send.
 */
import { PacketOut, compressPacket } from "@ddt/protocol";
import type { ItemInfo } from "../game/item.js";
import type { PlayerInventory } from "../game/inventory.js";
import type { PlayerInfo, MatchRow, ClientKind } from "../game/player-info.js";
import type { AchievementDataRow, BuffRow, ExtraRow, QuestDataRow, RecordRow } from "../db/social.js";
import { MIN_DATE, wireDate, addDays } from "../util/time.js";

export function wd(p: PacketOut, d: Date | null | undefined): void {
  p.writeDateTime(wireDate(d), true);
}

/** What the builders need to know about a player (GamePlayer or a bot). */
export interface PlayerView {
  id: number;
  info: PlayerInfo;
  match: MatchRow;
  zoneId: number;
  zoneName: string;
  roomIndex: number;
  roomTeam: number;
  inRoom: boolean;
  pingTime: number;
  weaponTemplateId: number;
  secondWeaponTemplateId: number;
  medal: number;
  /** M1 client detection (research/6600/packets-m1.md): "41" or "6600", from app.LoginSessions.Client. */
  clientKind: ClientKind;
}

/** 2 KIT_USER (SendKitoff, :896). */
export function kitoff(msg: string): PacketOut {
  const p = new PacketOut(2);
  p.writeString(msg);
  return p;
}

/** 3 SYS_MESSAGE (SendMessage, :925). */
export function message(type: number, msg: string): PacketOut {
  const p = new PacketOut(3);
  p.writeInt(type);
  p.writeString(msg);
  return p;
}

/**
 * 1 LOGIN success (SendLoginSuccess, :763; 4.1 AS3 ServerManager.__onLoginComplete).
 * 6600 reads the SAME code 1 but a different layout (vendor/DDT-6600/.../ServerManager.as:294-415 vs
 * vendor/DDTank41/"Source Flash"/src/ddt/manager/ServerManager.as:211-343): +1 int after Money (BandMoney +
 * a discarded int, 4.1 only has `medal`), +4 ints (isOld/CardSoul/GetSoulCount/uesedFinishTime) before
 * totemId, the BossBox trio (receiebox/receieGrade/needGetBoxTime) MOVED from right after userGuildProgress
 * to right after accumulativeAwardDays, and +4 new tail fields (isFirstDivorce/PveEpicPermission/
 * MountsType/PetsID/horseRaceCanRaceTime, all 6600-only systems -> zero/empty). See research/6600/packets-m1.md.
 */
export function loginSuccess(v: PlayerView, extra: ExtraRow | null, now = new Date()): PacketOut {
  const c = v.info;
  const is6600 = v.clientKind === "6600";
  const p = new PacketOut(1, c.ID);
  p.writeByte(0);
  p.writeInt(v.zoneId);
  p.writeInt(c.Attack); p.writeInt(c.Defence); p.writeInt(c.Agility); p.writeInt(c.Luck);
  p.writeInt(c.GP); p.writeInt(c.Repute); p.writeInt(c.Gold); p.writeInt(c.Money + c.MoneyLock);
  if (is6600) {
    p.writeInt(0); // BandMoney (6600-only union currency, not implemented)
    p.writeInt(0); // discarded int (ServerManager.as:319, pkg.readInt() with no assignment)
  } else {
    p.writeInt(v.medal);
  }
  p.writeInt(0); p.writeInt(c.Hide); p.writeInt(c.FightPower); // Score (unused -> 0), Hide, FightPower
  p.writeInt(c.apprenticeshipState); p.writeInt(c.masterID); p.writeString(c.masterOrApprentices ?? "");
  p.writeInt(c.graduatesCount); p.writeString(c.honourOfMaster ?? ""); wd(p, c.freezesDate);
  p.writeByte(c.typeVIP); p.writeInt(c.VIPLevel); p.writeInt(c.VIPExp); wd(p, c.VIPExpireDay); wd(p, c.LastDate);
  p.writeInt(c.VIPNextLevelDaysNeeded); wd(p, now); p.writeBoolean(c.CanTakeVipReward); p.writeInt(c.OptionOnOff);
  p.writeInt(c.AchievementPoint); p.writeString(c.Honor); p.writeInt(c.honorId); p.writeInt(c.OnlineTime);
  p.writeBoolean(c.Sex); p.writeString(`${c.Style}&${c.Colors}`); p.writeString(c.Skin);
  p.writeInt(c.ConsortiaID); p.writeString(c.ConsortiaName); p.writeInt(c.badgeID); p.writeInt(c.DutyLevel);
  p.writeString(c.DutyName); p.writeInt(c.Right); p.writeString(c.ChairmanName); p.writeInt(c.ConsortiaHonor);
  p.writeInt(c.ConsortiaRiches); p.writeBoolean(c.HasBagPassword); p.writeString(c.PasswordQuest1);
  p.writeString(c.PasswordQuest2); p.writeInt(c.FailedPasswordAttemptCount); p.writeString(c.UserName ?? "");
  p.writeInt(c.Nimbus); p.writeString(c.PvePermission ?? ""); p.writeString(c.FightLabPermission ?? "");
  p.writeInt(99999); // userGuildProgress (unused -> placeholder, as before)
  if (!is6600) { p.writeInt(c.BoxProgression); p.writeInt(c.GetBoxLevel); p.writeInt(c.AlreadyGetBox); }
  wd(p, extra?.LastTimeHotSpring ?? now); wd(p, c.ShopFinallyGottenTime); p.writeInt(c.RichesRob + c.RichesOffer);
  const m = v.match;
  p.writeInt(m.dailyScore); p.writeInt(m.dailyWinCount); p.writeInt(m.dailyGameCount); p.writeBoolean(m.DailyLeagueFirst);
  p.writeInt(m.DailyLeagueLastScore); p.writeInt(m.weeklyScore); p.writeInt(m.weeklyGameCount); p.writeInt(m.weeklyRanking);
  const t = c.Texp;
  p.writeInt(t.spdTexpExp); p.writeInt(t.attTexpExp); p.writeInt(t.defTexpExp); p.writeInt(t.hpTexpExp); p.writeInt(t.lukTexpExp);
  p.writeInt(t.texpTaskCount); p.writeInt(t.texpCount); wd(p, t.texpTaskDate);
  p.writeBoolean(false); p.writeInt(c.badLuckNumber); p.writeInt(0); wd(p, now); p.writeInt(0);
  if (is6600) {
    // isOld / IsOldPlayer (m3-eventos-b): NOT part of the card-soul system despite sitting next to it in the
    // wire layout — it is `Sys_Users_Detail.IsOldPlayer` (SqlDataProvider/Data/PlayerInfo.cs), read by
    // `ServerManager.as:398 self.isOld = pkg.readBoolean()` and gates the "old player" hall button
    // (`PlayerTool.as` `_selfInfo.isOld`) — see game/old-player.ts `applyOldPlayerEligibility`, called at
    // login (session/login.ts) BEFORE this packet is built.
    p.writeBoolean(c.IsOldPlayer);
    p.writeInt(0); p.writeInt(0); p.writeInt(0); // CardSoul, GetSoulCount, uesedFinishTime
    p.writeInt(c.totemId); p.writeInt(c.necklaceExp);
    p.writeInt(c.accumulativeLoginDays); p.writeInt(c.accumulativeAwardDays);
    p.writeInt(c.BoxProgression); p.writeInt(c.GetBoxLevel); p.writeInt(c.AlreadyGetBox); // receiebox/receieGrade/needGetBoxTime, moved here
    p.writeInt(0); // isFirstDivorce (6600-only marriage variant, not implemented)
    p.writeString(""); // PveEpicPermission (6600-only PvE épico, not implemented)
    p.writeInt(0); p.writeInt(0); // MountsType, PetsID (Montaria, M1 schema-only so far)
    p.writeInt(0); // horseRaceCanRaceTime (Corrida de cavalos, not implemented)
  } else {
    p.writeInt(c.accumulativeLoginDays); p.writeInt(c.accumulativeAwardDays); p.writeInt(c.totemId); p.writeInt(c.necklaceExp);
    p.writeInt(0); // fineSuitExp (4.1-only, already unused)
  }
  return p;
}

/**
 * 38 UPDATE_PRIVATE_INFO (SendUpdatePrivateInfo, :939; IsOpenPetScore=false).
 * 6600 reads the same code with +1 int (BandMoney + a discarded int instead of just `medal`) and the
 * tail two fields swapped (myHonor before hardCurrency, not after) — PlayerManager.as __updatePrivateInfo
 * (4.1 line 1557 vs 6600 line 1991). See research/6600/packets-m1.md.
 */
export function privateInfo(c: PlayerInfo, medal: number, clientKind: ClientKind = "41"): PacketOut {
  const p = new PacketOut(38, c.ID);
  p.writeInt(c.Money + c.MoneyLock);
  if (clientKind === "6600") {
    p.writeInt(0); // BandMoney (6600-only union currency, not implemented)
    p.writeInt(0); // discarded int (PlayerManager.as:1996, e.pkg.readInt() with no assignment)
    p.writeInt(c.Score); p.writeInt(c.Gold); p.writeInt(c.badLuckNumber); p.writeInt(c.damageScores); p.writeInt(c.petScore);
    p.writeInt(c.myHonor); p.writeInt(c.hardCurrency); // order swapped vs 4.1
  } else {
    p.writeInt(medal); p.writeInt(c.Score); p.writeInt(c.Gold); p.writeInt(c.GiftToken);
    p.writeInt(c.damageScores); p.writeInt(c.petScore); p.writeInt(c.hardCurrency); p.writeInt(c.myHonor);
  }
  return p;
}

/**
 * 67 UPDATE_PLAYER_INFO (SendUpdatePublicPlayer, :958).
 * 6600 reads the same code with +2 ints after Luck (MagicAttack/MagicDefence — "dano mágico por item",
 * m3-figurino: sum of the equipped items' MagicAttack/MagicDefence, see game/stats.ts StatResult.magicAttack
 * doc and docs/plan/MIGRACAO-6600.md §2.2), +1 int after honor (honorId), +1 int after weeklyGameCount
 * (leagueMoney), +1 string before evolutionGrade (PveEpicPermission) — PlayerManager.as __updatePlayerInfo
 * (4.1 line 1658 vs 6600 line 2088). See research/6600/packets-m1.md.
 */
export function publicPlayer(c: PlayerInfo, m: MatchRow, clientKind: ClientKind = "41", magicAttack = 0, magicDefence = 0): PacketOut {
  const p = new PacketOut(67, c.ID);
  for (const x of [c.GP, c.Offer, c.RichesOffer, c.RichesRob, c.Win, c.Total, c.Escape, c.Attack, c.Defence, c.Agility, c.Luck]) p.writeInt(x);
  const is6600 = clientKind === "6600";
  if (is6600) { p.writeInt(magicAttack); p.writeInt(magicDefence); }
  p.writeInt(c.hp); p.writeInt(c.Hide);
  p.writeString(c.Style); p.writeString(c.Colors); p.writeString(c.Skin); p.writeBoolean(c.IsShowConsortia);
  p.writeInt(c.ConsortiaID); p.writeString(c.ConsortiaName); p.writeInt(c.badgeID); p.writeInt(0); p.writeInt(0);
  p.writeInt(c.Nimbus); p.writeString(c.PvePermission ?? ""); p.writeString(c.FightLabPermission ?? ""); p.writeInt(c.FightPower);
  p.writeInt(c.apprenticeshipState); p.writeInt(c.masterID); p.writeString(c.masterOrApprentices ?? ""); p.writeInt(c.graduatesCount);
  p.writeString(c.honourOfMaster ?? ""); p.writeInt(c.AchievementPoint); p.writeString(c.Honor);
  if (is6600) p.writeInt(c.honorId);
  wd(p, c.LastSpaDate);
  p.writeInt(c.charmGP); p.writeInt(0); wd(p, c.ShopFinallyGottenTime); p.writeInt(c.RichesRob + c.RichesOffer);
  p.writeInt(m.addDayPrestge); p.writeInt(m.dailyWinCount); p.writeInt(m.dailyGameCount); p.writeInt(m.totalPrestige); p.writeInt(m.weeklyGameCount);
  if (is6600) p.writeInt(c.LeagueMoney); // m3-ringstation: AddLeagueMoney (arena "distintivo")
  const t = c.Texp;
  p.writeInt(t.spdTexpExp); p.writeInt(t.attTexpExp); p.writeInt(t.defTexpExp); p.writeInt(t.hpTexpExp); p.writeInt(t.lukTexpExp);
  p.writeInt(t.texpTaskCount); p.writeInt(t.texpCount); wd(p, t.texpTaskDate);
  p.writeInt(0); // dungeonFlag count (0 entries, as before)
  if (is6600) p.writeString(""); // PveEpicPermission (6600-only PvE épico, not implemented)
  p.writeInt(c.evolutionGrade); p.writeInt(c.evolutionExp);
  return p;
}

/** 4 PING (SendPingTime, :1019). */
export function pingTime(antiAddiction: number): PacketOut {
  const p = new PacketOut(4);
  p.writeInt(antiAddiction);
  return p;
}

/** 5 SYS_DATE (SendDateTime, :1143). */
export function dateTime(now = new Date()): PacketOut {
  const p = new PacketOut(5);
  wd(p, now);
  return p;
}

/** 13 DAILY_AWARD (SendDailyAward, :1150). */
export function dailyAward(lastAward: Date, now = new Date()): PacketOut {
  const p = new PacketOut(13);
  p.writeBoolean(lastAward.toISOString().slice(0, 10) !== now.toISOString().slice(0, 10));
  p.writeInt(0);
  return p;
}

/** 15 weakless guild progress (SendWeaklessGuildProgress, :2069). */
export function weaklessGuild(c: PlayerInfo): PacketOut {
  const p = new PacketOut(15, c.ID);
  p.writeInt(c.weaklessGuildProgress.length);
  for (const b of c.weaklessGuildProgress) p.writeByte(b);
  return p;
}

/** 34 USER_RANK list (AbstractPacketLib.SendUserRanks :2088): int count, each {int NewTitleID, str Name, date
 *  BeginDate, date EndDate (Validate 0 -> BeginDate+1y, else BeginDate+Validate days)}. */
export function userRanks(id: number, ranks: { NewTitleID: number; Name: string | null; BeginDate: Date; Validate: number }[] = []): PacketOut {
  const p = new PacketOut(34, id);
  p.writeInt(ranks.length);
  for (const r of ranks) {
    p.writeInt(r.NewTitleID); p.writeString(r.Name ?? "");
    wd(p, r.BeginDate);
    wd(p, r.Validate > 0 ? new Date(r.BeginDate.getTime() + r.Validate * 86_400_000) : new Date(r.BeginDate.getTime() + 365 * 86_400_000));
  }
  return p;
}

/** 92 VIP (SendOpenVIP, :2140). */
export function openVip(c: PlayerInfo): PacketOut {
  const p = new PacketOut(92, c.ID);
  p.writeByte(c.typeVIP); p.writeInt(c.VIPLevel); p.writeInt(c.VIPExp); wd(p, c.VIPExpireDay); wd(p, c.LastDate);
  p.writeInt(c.VIPNextLevelDaysNeeded); p.writeBoolean(c.CanTakeVipReward);
  return p;
}

/** 167 player property breakdown (SendUpdatePlayerProperty, :2110) — texp/card/suit/bead sources all 0 for now. */
export function playerProperty(id: number): PacketOut {
  const p = new PacketOut(167, id);
  p.writeInt(id);
  for (let i = 0; i < 4 * 4; i++) p.writeInt(0);
  for (let i = 0; i < 6; i++) p.writeInt(0);
  return p;
}

/**
 * 6600-only per-item tail (magic-stone damage system, not implemented -> zero/false). Shared by every
 * item-info writer below so a future one (shop/mail attachment) picks it up the same way.
 * - GRID_GOODS (64): PlayerManager.as __updateInventorySlot (6600 line ~366-383 vs 4.1, which stops at
 *   latentEnergyEndTime): MagicAttack/MagicDefence (2 ints, read unconditionally — EquipType.isMagicStone
 *   decides only where the client STORES them, not whether it reads them), goodsLock (bool), MagicExp (int),
 *   MagicLevel (int).
 * - ITEM_EQUIP (74): PlayerManager.as __itemEquip (6600 line 615 vs 4.1): +1 int, MagicLevel only.
 * See research/6600/packets-m1.md packet 64/74.
 */
function writeItemMagicTail(p: PacketOut, full: boolean): void {
  if (full) { p.writeInt(0); p.writeInt(0); p.writeBoolean(false); p.writeInt(0); } // MagicAttack/MagicDefence, goodsLock, MagicExp
  p.writeInt(0); // MagicLevel
}

/** 64 GRID_GOODS (SendUpdateInventorySlot, :1538). */
export function inventorySlots(ownerId: number, bag: PlayerInventory, slots: number[], now = new Date(), clientKind: ClientKind = "41"): PacketOut {
  const p = new PacketOut(64, ownerId);
  p.writeInt(bag.bagType);
  p.writeInt(slots.length);
  for (const s of slots) {
    p.writeInt(s);
    const it = bag.getItemAt(s);
    // Pedras de estrela/fantasma (CategoryID 11, Property1 117/118): o cliente 4.1 nunca inicializa
    // StoreModel._canGhostPropList (StoreModel.as:137-158 vs :255) e dá null ref ao montar a Forja — que roda no
    // HallStateView.enter (checkShowStoreFromShop) e deixa o lobby cinza/travado. O item fica no banco, só não vai pro cliente.
    if (!it || (it.template.CategoryID === 11 && (Number(it.template.Property1) === 117 || Number(it.template.Property1) === 118))) {
      p.writeBoolean(false);
      continue;
    }
    p.writeBoolean(true);
    p.writeInt(it.UserID); p.writeInt(it.ItemID); p.writeInt(it.Count); p.writeInt(it.Place); p.writeInt(it.TemplateID);
    p.writeInt(it.AttackCompose); p.writeInt(it.DefendCompose); p.writeInt(it.AgilityCompose); p.writeInt(it.LuckCompose);
    p.writeInt(it.StrengthenLevel); p.writeInt(it.StrengthenExp); p.writeBoolean(it.IsBinds); p.writeBoolean(it.IsJudge);
    wd(p, it.BeginDate); p.writeInt(it.ValidDate); p.writeString(it.Color ?? ""); p.writeString(it.Skin ?? ""); p.writeBoolean(it.IsUsed);
    for (const h of [it.Hole1, it.Hole2, it.Hole3, it.Hole4, it.Hole5, it.Hole6]) p.writeInt(h);
    p.writeString(it.Pic); p.writeInt(it.RefineryLevel); wd(p, addDays(now, 5)); p.writeInt(it.StrengthenTimes);
    p.writeByte(it.Hole5Level); p.writeInt(it.Hole5Exp); p.writeByte(it.Hole6Level); p.writeInt(it.Hole6Exp);
    p.writeBoolean(it.isGold);
    if (it.isGold) {
      p.writeInt(it.goldValidDate);
      wd(p, it.goldBeginTime);
    }
    // C# writes latentEnergyCurStr twice (sic).
    p.writeString(it.latentEnergyCurStr); p.writeString(it.latentEnergyCurStr); wd(p, it.latentEnergyEndTime);
    if (clientKind === "6600") writeItemMagicTail(p, true);
  }
  return p;
}

/** 178 quest list (SendUpdateQuests, :1672). */
/**
 * 178 quest list (SendUpdateQuests, :1672; TaskManager.as __updateAcceptedTask).
 * 6600 reads +3 fields per quest after IsExist (4.1 line 599 vs 6600 line 807-817): QuestLevel (int, not
 * tracked -> 0), a Condition5-8 array (always length 4 in the C# itself — `new int[4]` — written as
 * index/value pairs; we don't track Condition5-8 either -> 0), isGet/IsAccept (bool — true: by the time we
 * send a quest here the player already has it). The trailing `states` byte array is unchanged in both.
 * See research/6600/packets-m1.md.
 */
export function updateQuests(id: number, states: Uint8Array, quests: QuestDataRow[], clientKind: ClientKind = "41"): PacketOut {
  const p = new PacketOut(178, id);
  p.writeInt(quests.length);
  for (const q of quests) {
    p.writeInt(q.QuestID); p.writeBoolean(q.IsComplete);
    p.writeInt(q.Condition1); p.writeInt(q.Condition2); p.writeInt(q.Condition3); p.writeInt(q.Condition4);
    const d = wireDate(q.CompletedDate);
    wd(p, new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())));
    p.writeInt(q.RepeatFinish); p.writeInt(q.RandDobule); p.writeBoolean(q.IsExist);
    if (clientKind === "6600") {
      p.writeInt(0); // QuestLevel (not implemented)
      p.writeInt(4); // Condition5-8 array length (fixed at 4 in the C# itself)
      for (let i = 0; i < 4; i++) { p.writeInt(i + 4); p.writeInt(0); } // Condition5-8 (not tracked)
      p.writeBoolean(true); // isGet/IsAccept
    }
  }
  p.write(states);
  return p;
}

/** 228 init achievements + 229 records (SendInitAchievements, :734). */
export function achievementRecords(code: 228 | 229, id: number, recs: RecordRow[]): PacketOut {
  const p = new PacketOut(code, id);
  p.writeInt(recs.length);
  for (const r of recs) {
    p.writeInt(r.RecordID);
    p.writeInt(r.Total);
  }
  return p;
}

/** 231 achievement data (SendUpdateAchievementData, :638). */
export function achievementData(id: number, rows: AchievementDataRow[]): PacketOut {
  const p = new PacketOut(231, id);
  p.writeInt(rows.length);
  for (const r of rows) {
    p.writeInt(r.AchievementID);
    p.writeInt(r.CompletedDate.getUTCFullYear()); p.writeInt(r.CompletedDate.getUTCMonth() + 1); p.writeInt(r.CompletedDate.getUTCDate());
  }
  return p;
}

/** 186 buff list (SendBufferList, :1723). Pay buffs (ValidDate in minutes) are sent in days. */
export function bufferList(playerId: number, buffs: BuffRow[]): PacketOut {
  const p = new PacketOut(186, playerId);
  p.writeInt(buffs.length);
  for (const b of buffs) {
    p.writeInt(b.Type); p.writeBoolean(b.IsExist); wd(p, b.BeginDate); p.writeInt(b.ValidDate);
    p.writeInt(b.Value); p.writeInt(b.ValidCount); p.writeInt(b.TemplateID);
  }
  return p;
}

/** 227 ENTHRALL_LIGHT (SendEnthrallLight, :413). */
export function enthrallLight(): PacketOut {
  const p = new PacketOut(227);
  p.writeBoolean(false); p.writeInt(0); p.writeBoolean(false); p.writeBoolean(false);
  return p;
}

export interface AvatarCollectView { AvatarID: number; Sex: number; TimeEnd: Date; items: { TemplateID: number }[] }
/** 402/5 AVATAR_COLLECTION GET_ALL_INFO (SendAvatarCollect, AbstractPacketLib.cs:2552): the full set dump. */
export function avatarCollect(sets: AvatarCollectView[]): PacketOut {
  const p = new PacketOut(402);
  p.writeByte(5);
  p.writeInt(sets.length);
  for (const s of sets) {
    p.writeInt(s.AvatarID); p.writeInt(s.Sex); p.writeInt(s.items.length);
    for (const it of s.items) p.writeInt(it.TemplateID);
    wd(p, s.TimeEnd);
  }
  return p;
}
/** 402/3 AVATAR_COLLECTION ACTIVE echo (AvatarCollectionHandler.cs case 3, :78-83): confirms the item just unlocked. */
export function avatarCollectActive(id: number, templateId: number, sex: number): PacketOut {
  const p = new PacketOut(402);
  p.writeByte(3); p.writeInt(id); p.writeInt(templateId); p.writeInt(sex);
  return p;
}
/** 402/4 AVATAR_COLLECTION DELAY_TIME (AvatarCollectionHandler.cs case 3, :69-77): set just reached half-collected. */
export function avatarCollectDelay(avatarId: number, sex: number, timeEnd: Date): PacketOut {
  const p = new PacketOut(402);
  p.writeByte(4); p.writeInt(avatarId); p.writeInt(sex); wd(p, timeEnd);
  return p;
}

/**
 * 259 FIRSTRECHARGE (SendUpdateFirstRecharge, :465). 4.1-only code: 6600's enum reuses 259 for
 * `CONSUME_RANK` (ePackageType.as: FIRSTRECHARGE=259 in 4.1, CONSUME_RANK=259 in 6600 — a genuine code
 * collision, not just a layout change). NEVER send this to a 6600 client — use consumeRankClosed instead.
 * See research/6600/packets-m1.md.
 */
export function firstRecharge(isRecharged: boolean, isGetAward: boolean): PacketOut {
  const p = new PacketOut(259);
  p.writeBoolean(isRecharged); p.writeBoolean(isGetAward);
  return p;
}

/**
 * 259 CONSUME_RANK closed/no-activity (6600 only; collides with 4.1's FIRSTRECHARGE at the same code — see
 * firstRecharge above). ConsumeRankManager.__updateInfo (consumeRank/ConsumeRankManager.as:52-59) reads
 * actId:UTF, isOpen:bool and returns immediately when isOpen is false, so this 2-field packet never crashes
 * even though "consume rank" ranking itself isn't implemented yet.
 */
export function consumeRankClosed(): PacketOut {
  const p = new PacketOut(259);
  p.writeString(""); p.writeBoolean(false);
  return p;
}

/**
 * 142 KING_BLESS_MAIN closed (6600-only code, no collision with 4.1 — the value doesn't exist in the 4.1
 * enum at all, see research/6600/packets-m1.md). SendKingBlessMain (AbstractPacketLib.cs:2299-2315): int
 * KingBlessIndex, date KingBlessEnddate, and only if KingBlessIndex>0 an int count + count*(int,int) buff
 * map. Never sent before (not a 4.1 feature) -> AS3 KingBlessManager._endTime stayed null forever ->
 * TypeError #1009 in getRemainTimeTxt() the first time HallStateView/PlayerTool reads it. KingBlessIndex=0
 * takes the same "not open" early return as a real closed blessing (KingBlessManager.as:173).
 */
export function kingBlessClosed(): PacketOut {
  const p = new PacketOut(142);
  p.writeInt(0);
  wd(p, MIN_DATE);
  return p;
}

/**
 * 165 LUCKSTONE_CONFIG closed ("Pedra da Sorte"/Luck Stone caddy exchange — m3-caddy-loteria). Mirrors
 * `LuckStoneEnableHandler.cs` (6600, `PacketHandler(165)`): clones the client's own (empty) request, clears
 * its context and appends 2 dates + a bool. The PROACTIVE push builder in the same codebase,
 * `AbstractPacketLib.SendLuckStoneEnable` (:2504-2512), always writes `isOpen=false` too — the feature is
 * permanently closed in the decompiled 6600 server, not just slow to open. `requestForLuckStone()`
 * (`GameSocketOut.as:2786`) sends code 165 with zero fields.
 */
export function luckStoneConfigClosed(now: Date): PacketOut {
  const p = new PacketOut(165);
  wd(p, now);
  wd(p, addDays(now, 7));
  p.writeBoolean(false);
  return p;
}

/**
 * 97 LUCKSTONE_RANK_LIMIT closed (m3-caddy-loteria). Unlike 165 above, no `PacketHandler(97)` class exists
 * anywhere in the decompiled 6600 server (confirmed by grep across `Game.Server.Packets.Client` and
 * `ePackageType.cs` — the constant is only ever declared, never handled) — genuinely dead server-side,
 * consistent with 165's permanently-closed signal (the rank screen is only reachable once Luck Stone is
 * open). Reply format from the AS3 reader contract (`RouletteManager.luckStoneRankLimit`,
 * `RouletteManager.as:115-159`): bool isStart; isStart=false branch then reads str lastTime, bool isOpen,
 * int count, count*(int Rank, int UserID, int LuckStone, int TemplateID, str Nickname). This takes that
 * branch with an empty list so a client that ever asks doesn't hang forever waiting for a reply that the
 * original would never send.
 */
export function luckStoneRankLimitClosed(): PacketOut {
  const p = new PacketOut(97);
  p.writeBoolean(false);
  p.writeString("");
  p.writeBoolean(false);
  p.writeInt(0);
  return p;
}

/**
 * 170 CARDS_SLOT reply (m3-cards-slot). `AbstractPacketLib.SendPlayerCardSlot` has 2 overloads (single card /
 * `List<UsersCardInfo>`) that write the EXACT same shape, just a different `count` — this builder takes an
 * array and covers both (`cards.length` becomes `count`):
 * int PlayerID, int ZoneID, int CardSoul, int count, count*(int Place, int Type, int Level, int CardGP).
 */
export function playerCardSlot(id: number, zoneId: number, cardSoul: number, cards: { Place: number; Type: number; Level: number; CardGP: number }[]): PacketOut {
  const p = new PacketOut(170, id);
  p.writeInt(id); p.writeInt(zoneId); p.writeInt(cardSoul); p.writeInt(cards.length);
  for (const c of cards) { p.writeInt(c.Place); p.writeInt(c.Type); p.writeInt(c.Level); p.writeInt(c.CardGP); }
  return p;
}

/**
 * 237 PLAYER_DRESS (6600-only "figurino"/dress room — collides with 4.1's MARRYINFO_UPDATE, see
 * `handlers/casamento/index.ts` and research/6600/packets-m1.md "M3 figurino"). 3 builders, one per
 * sub-command the server sends (`PlayerDressType.as`):
 *
 * - sub 1 GET_DRESS_MODEL (SendSetDressModelArr, AbstractPacketLib.cs:1544): int model count (always 3 —
 *   `dictionary_0` keys 0/1/2, `DressModel.DRESS_LEN`/combo box "model1/2/3"), then per model int slot, int
 *   item count, count*(int ItemID, int TemplateID). Sent at login (GamePlayer.cs:3644 AvatarBag.UpdateInfo)
 *   and after every save (sub 1 request, `vestir-6600.ts`).
 * - sub 2 CURRENT_MODEL (SendCurentDressModel, :1564): int current slot. Sent at login and after a switch
 *   (sub 2 request) or a save (echoes the slot that was ALREADY current, saving to a slot doesn't switch
 *   to it — PlayerAvataInventory.SaveDressModel never touches CurrentModel).
 * - sub 7 LOCK_DRESSBAG (PlayerDressHandler.cs:93-95): bare ack, no payload beyond the sub-byte itself.
 */
export function dressModelArr(id: number, models: Map<number, { itemId: number; templateId: number }[]>): PacketOut {
  const p = new PacketOut(237, id);
  p.writeByte(1);
  p.writeInt(3);
  for (let slot = 0; slot < 3; slot++) {
    const list = models.get(slot) ?? [];
    p.writeInt(slot);
    p.writeInt(list.length);
    for (const e of list) { p.writeInt(e.itemId); p.writeInt(e.templateId); }
  }
  return p;
}

export function currentDressModel(id: number, slot: number): PacketOut {
  const p = new PacketOut(237, id);
  p.writeByte(2);
  p.writeInt(slot);
  return p;
}

export function playerDressLockAck(id: number): PacketOut {
  const p = new PacketOut(237, id);
  p.writeByte(7);
  return p;
}

/**
 * 102/0 world boss OPEN (SendOpenWorldBoss, :2593) with BaseWorldBossRoom defaults (boss closed).
 * 6600 reads total_Blood as a Long (WorldBossManager.as:148 `readLong()` vs 4.1 line 161 `readInt()`) and
 * +3 ints after reviveMoney (reFightMoney/addInjureBuffMoney/addInjureValue, WorldBossManager.as:169-171,
 * not read at all in 4.1). See research/6600/packets-m1.md.
 */
export function openWorldBoss(clientKind: ClientKind = "41"): PacketOut {
  const p = new PacketOut(102);
  p.writeByte(0); p.writeString("0"); p.writeInt(0); p.writeString("Fera Divina"); p.writeString("boss");
  if (clientKind === "6600") p.writeLong(0); else p.writeInt(0); // total_Blood: 6600 reads a Long, not an Int
  p.writeInt(0); p.writeInt(0); p.writeInt(1); p.writeInt(0); p.writeInt(0);
  wd(p, MIN_DATE); wd(p, MIN_DATE); p.writeInt(0); p.writeBoolean(true); p.writeBoolean(true);
  p.writeInt(0); p.writeInt(0); p.writeInt(0); p.writeInt(0);
  if (clientKind === "6600") { p.writeInt(0); p.writeInt(0); p.writeInt(0); } // reFightMoney/addInjureBuffMoney/addInjureValue (6600-only)
  p.writeInt(1); p.writeInt(1); p.writeString("Aumentar Dano"); p.writeInt(30); p.writeString("Dano base aumenta em 200."); p.writeInt(-1);
  p.writeBoolean(true); p.writeBoolean(false);
  return p;
}

/** 42 LEAGUE_START_NOTICE (SendLeagueNotice, :2283). */
export function leagueNotice(id: number, restCount: number, maxCount: number, type: number): PacketOut {
  const p = new PacketOut(42, id);
  p.writeByte(type);
  p.writeInt(restCount);
  if (type === 1) p.writeInt(maxCount);
  return p;
}

/** 145 guild member week open/close (SendGuildMemberWeekOpenClose, :2647). */
export function guildMemberWeek(userId: number): PacketOut {
  const p = new PacketOut(145, userId);
  p.writeByte(0); p.writeBoolean(false); p.writeString("2022-05-29 06:10:50.170"); p.writeString("2023-05-12 00:42:54.000");
  return p;
}

/** 95 NECKLACE_STRENGTH (SendNecklaceStrength, :2675). */
export function necklace(c: PlayerInfo): PacketOut {
  const p = new PacketOut(95, c.ID);
  p.writeInt(c.necklaceExp); p.writeInt(c.necklaceExpAdd);
  return p;
}

// --------------------------------------------------------------------------------- hall (262 NEW_HALL, 6600-only)
// m2-newhall (docs/plan/TASKS.md). 6600-exclusive: ePackageType.NEW_HALL=262 doesn't exist in the 4.1 enum at
// all (no collision risk, never sent to clientKind "41" — see game/new-hall.ts). Sub-codes: NewHallPackageType
// (ddt/data/socket/NewHallPackageType.as 6600 / Game.Server.Packets.NewHallPackageType.cs 6600):
// 0 PLAYERINFO, 1 OTHERPLAYERINFO, 2 PLAYEREXIT, 3 PLAYERMOVE, 4 ADDPLAYE, 5 MODIFYDRESS, 7 PLAYERHID,
// 8 PLAYERSHOW (client->server only, no dedicated reply besides 7+0 below), 9 UPDATEPETS (client->server
// only). 6 PLAYERONLINE / 10 UPDATEPLAYERTITLE / 99 NEWHALL_BATTLE: confirmed the C# never sends/handles
// them (no `[Attribute13(6|10|99)]` class in Game.Server.NewHall.Handle, no `new GSPacketIn(262)` with those
// bytes anywhere) — dead protocol on both client and server, nothing to port (see research/6600/packets-m1.md
// "M2 newhall").

/** What the 262 NEW_HALL writers need about a player sharing the hall (HallPlayerView.readPlayerInfoPkg, 16
 *  fields, AS3 :418-438). `MountsType` is always 0 (Montaria, m1-schema-only, no writer anywhere sets a real
 *  value yet — same stub as `loginSuccess`/`userEquip`). */
export interface HallPlayerView {
  info: PlayerInfo;
  /** GamePlayer.PosX/PosY (6600 C#, default 1560/500 — GamePlayer.cs ctor:1926-1927). */
  posX: number;
  posY: number;
  /** GamePlayer.PlayerCharacter.PetsID: session-only "pet shown in the hall" toggle (9 UPDATEPETS), not a
   *  persisted system (same Montaria/pet-display gap as MountsType). */
  petsId: number;
}

function writeHallPlayerFields(p: PacketOut, v: HallPlayerView): void {
  const c = v.info;
  p.writeInt(c.ID); p.writeString(c.NickName ?? ""); p.writeInt(c.VIPLevel); p.writeInt(c.typeVIP);
  p.writeBoolean(c.Sex); p.writeString(c.Style); p.writeString(c.Colors);
  p.writeInt(0); // MountsType (Montaria, not implemented)
  p.writeInt(v.petsId);
  p.writeInt(v.posX); p.writeInt(v.posY);
  p.writeInt(c.ConsortiaID); p.writeInt(c.badgeID); p.writeString(c.ConsortiaName); p.writeString(c.Honor); p.writeInt(c.honorId);
}

/** 262/0 PLAYERINFO reply (NewHallRoom.SendPlayerInfo, :33): own position + every other hall occupant the
 *  requester can see (empty when `self` is hidden — NewHallRoom.GetPlayersSafe, :218). This is the packet
 *  `HallPlayerView.__onFriendPlayerInfo` (AS3 :193-223) needs before it calls `addSelfPlayer()` — without it
 *  `_selfPlayer`/`_sceneScene` are never created and `setSelfPlayerPos()` NPEs on `this._sceneScene.hit(pos)`
 *  the moment a building is clicked (see research/6600/packets-m1.md "M2 newhall"). */
export function newHallSelfInfo(self: HallPlayerView, others: HallPlayerView[]): PacketOut {
  const p = new PacketOut(262);
  p.writeByte(0);
  p.writeInt(self.posX); p.writeInt(self.posY);
  p.writeInt(others.length);
  for (const v of others) writeHallPlayerFields(p, v);
  return p;
}

/** 262/1 OTHERPLAYERINFO (NewHallRoom.SendOtherFriendPlayerInfo, :64): "a player just joined the hall",
 *  broadcast to everyone else already registered. */
export function newHallOtherPlayerInfo(v: HallPlayerView): PacketOut {
  const p = new PacketOut(262);
  p.writeByte(1);
  writeHallPlayerFields(p, v);
  return p;
}

/** 262/2 PLAYEREXIT (NewHallRoom.RemovePlayer, :175-189). */
export function newHallPlayerExit(id: number): PacketOut {
  const p = new PacketOut(262);
  p.writeByte(2);
  p.writeInt(id);
  return p;
}

/** 262/3 PLAYERMOVE (NewHallRoom.PlayerMove, :110-121): broadcast of the final walk-target the mover sent
 *  (the receiver re-runs its own mesh pathfinding from the last known point to this one, same as self-move
 *  — `HallPlayerView.__onFriendPlayerMove`, AS3 :348-367). */
export function newHallPlayerMove(id: number, x: number, y: number): PacketOut {
  const p = new PacketOut(262);
  p.writeByte(3);
  p.writeInt(id); p.writeInt(x); p.writeInt(y);
  return p;
}

/** 262/4 ADDPLAYE (NewHallRoom.SendAddPlayer, :87-108): reply to a client that saw an unknown ID move and
 *  asked for its info (`sendAddNewPlayer`) — same body as OTHERPLAYERINFO, broadcast to everyone but the
 *  described player (method_1(pkg, player)), not only to whoever asked (replicated as-is, not "fixed"). */
export function newHallAddPlayer(v: HallPlayerView): PacketOut {
  const p = new PacketOut(262);
  p.writeByte(4);
  writeHallPlayerFields(p, v);
  return p;
}

/** 262/5 MODIFYDRESS (NewHallRoom via PlayerModifyDress.cs): "this player's look changed", broadcast to
 *  everyone else. Same fields as OTHERPLAYERINFO/ADDPLAYE; `AS3 __onAddModifyPlayerDress` re-adds the
 *  player sprite with the new Style/Colors. */
export function newHallModifyDress(v: HallPlayerView): PacketOut {
  const p = new PacketOut(262);
  p.writeByte(5);
  writeHallPlayerFields(p, v);
  return p;
}

/** 262/7 PLAYERHID (NewHallRoom.HidePlayerInfo, :24-31): echoes the player's own hide flag back to them —
 *  `AS3 __onPlayerHid` only reads this one boolean (DailyButtunBar eye icon). Always followed by
 *  `newHallSelfInfo` (HidePlayerInfo always calls SendPlayerInfo right after). */
export function newHallPlayerHid(hide: boolean): PacketOut {
  const p = new PacketOut(262);
  p.writeByte(7);
  p.writeBoolean(hide);
  return p;
}

// --------------------------------------------------------------------------------- 153 CONSORTIA_BATTLE (6600-only)
// m3-consortia-battle (docs/plan/TASKS.md). Guild-war walkable arena ("factionwarmap.swf", consortionBattle/*).
// Entry: 94 GAME_ROOM sub 18 SINGLE_ROOM_BEGIN num=4 (handlers/salas/iniciar-cena-unica.ts), not this code.
// Sub-codes (ConsBatPackageType.cs / ddt/data/socket/ConsBatPackageType.as): 1 START_OR_CLOSE, 2 ENTER_SELF_INFO,
// 3 ADD_PLAYER (dual use: client "give me the roster" request AND this packet's list reply), 4 PLAYER_MOVE,
// 5 DELETE_PLAYER, 6 CHALLENGE, 7 PLAYER_STATUS, 9 UPDATE_SCENE_INFO, 16 UPDATE_SCORE, 17 CONSUME, 21 CONFIRM_ENTER
// (same list-reply body as 3). 16/17 are themselves `Console.WriteLine` stubs in the leaked C#
// (`ConsortiaBattleHander.cs`) — scoring/rewards tracked as follow-up `m3-consortia-battle-2`.

/** What the roster/status builders below need about one registered player: the room-tracked
 *  `ConsortiaBattlePlayerInfo` fields (SqlDataProvider/Data/ConsortiaBattlePlayerInfo.cs) PLUS the live
 *  appearance fields the AS3 reader also expects (see field-count note on `consBatPlayerView` below). */
export interface ConsBatPlayerView {
  id: number;
  tombstoneEndTime: Date;
  status: number;
  posX: number;
  posY: number;
  sex: boolean;
  consortiaId: number;
  consortiaName: string;
  winningStreak: number;
  failBuffCount: number;
  /** Session "pet shown" field (same one the 262 NEW_HALL writers use, `hallPetsId` — no persisted Montaria/pet-
   *  display system yet, see `HallPlayerView.petsId` above). */
  petsId: number;
  style: string;
  colors: string;
}

/**
 * Shared body for 153/3 ADD_PLAYER (list reply) and 153/21 CONFIRM_ENTER (identical payload in the original —
 * `BaseConsBatRoom.SendUpdateRoom`/`SendConfirmEnterRoom`, :108-128/:260-280) — one roster row.
 *
 * Field-count fix (not a replicated bug): the leaked `BaseConsBatRoom.cs` only writes the first 10 fields
 * (through `failBuffCount`); the AS3 reader (`ConsortiaBattleManager.as addPlayerInfo`, :562-602) then
 * unconditionally reads 4 MORE — a padding int (discarded, written 0 here), PetsID, Sex again and
 * Style/Colors — needed to render the OTHER player's sprite (`ddt.data.player.PlayerInfo` base class the
 * class extends). Sending the short C# body would desync every field after it for that peer (byte-buffer.ts:
 * reads past the sent length return zeros, not a protocol error, so the client silently renders a
 * garbled/default sprite instead of erroring) — written in full here since the client is fixed.
 */
function writeConsBatPlayerRow(p: PacketOut, v: ConsBatPlayerView): void {
  p.writeInt(v.id);
  p.writeDateTime(v.tombstoneEndTime);
  p.writeByte(v.status);
  p.writeInt(v.posX); p.writeInt(v.posY);
  p.writeBoolean(v.sex);
  p.writeInt(v.consortiaId); p.writeString(v.consortiaName);
  p.writeInt(v.winningStreak); p.writeInt(v.failBuffCount);
  p.writeInt(0); // padding int the AS3 reader discards (pkg.readInt() with no assignment)
  p.writeInt(v.petsId);
  p.writeBoolean(v.sex);
  p.writeString(v.style); p.writeString(v.colors);
}

/** 153/3 ADD_PLAYER / 153/21 CONFIRM_ENTER roster reply. */
export function consBatPlayerList(rows: ConsBatPlayerView[]): PacketOut {
  const p = new PacketOut(153);
  p.writeByte(3);
  p.writeInt(rows.length);
  for (const v of rows) writeConsBatPlayerRow(p, v);
  return p;
}

/** What `consBatSelfInfo` needs (the scene totals carried on `ConsBatPlayerInfo`, see game/consortia-battle.ts). */
export interface ConsBatSelfInfo {
  tombstoneEndTime: Date;
  posX: number;
  posY: number;
  curHp: number;
  victoryCount: number;
  winningStreak: number;
  score: number;
  isPowerFullUsed: boolean;
  isDoubleScoreUsed: boolean;
}

/** 153/2 ENTER_SELF_INFO (BaseConsBatRoom.AddPlayer, :74-87): `isJump=true` is what makes the AS3 client call
 *  `StateManager.setState(CONSORTIA_BATTLE_SCENE)` (ConsortiaBattleManager.as :370-377) — always true here,
 *  the original never has a caller that passes `false` either. */
export function consBatSelfInfo(isJump: boolean, v: ConsBatSelfInfo): PacketOut {
  const p = new PacketOut(153);
  p.writeByte(2);
  p.writeBoolean(isJump);
  p.writeDateTime(v.tombstoneEndTime);
  p.writeInt(v.posX); p.writeInt(v.posY);
  p.writeInt(v.curHp); p.writeInt(v.victoryCount); p.writeInt(v.winningStreak); p.writeInt(v.score);
  p.writeBoolean(v.isDoubleScoreUsed); p.writeBoolean(v.isPowerFullUsed);
  return p;
}

/** 153/4 PLAYER_MOVE (ConsortiaBattleHander.cs case 4, :21-35): broadcast to EVERY registered player including
 *  the sender — replicated as-is (`method_0`/`method_1(pkg, null)`, no "except"); the AS3 `movePlayer` reader
 *  ignores an echo of its own id (ConsortiaBattleManager.as :525-528), so this is harmless. */
export function consBatPlayerMove(id: number, x: number, y: number, path: string): PacketOut {
  const p = new PacketOut(153, id);
  p.writeByte(4);
  p.writeInt(id); p.writeInt(x); p.writeInt(y); p.writeString(path);
  return p;
}

/** 153/5 DELETE_PLAYER (BaseConsBatRoom.RemovePlayer, :90-106). */
export function consBatDeletePlayer(id: number): PacketOut {
  const p = new PacketOut(153);
  p.writeByte(5);
  p.writeInt(id);
  return p;
}

/** 153/7 PLAYER_STATUS (BaseConsBatRoom.SendUpdatePlayerStatus, :163-175), same field-count fix as the roster
 *  row above — the AS3 `updatePlayerStatus` reader (:457-494) reads the identical padding/PetsID/Sex/Style/
 *  Colors tail after `failBuffCount`, just without the consortia/initial-sex fields (those never change after
 *  the player is created, so this update doesn't resend them). */
export function consBatPlayerStatus(v: { id: number; tombstoneEndTime: Date; status: number; posX: number; posY: number; winningStreak: number; failBuffCount: number; petsId: number; sex: boolean; style: string; colors: string }): PacketOut {
  const p = new PacketOut(153, v.id);
  p.writeByte(7);
  p.writeInt(v.id);
  p.writeDateTime(v.tombstoneEndTime);
  p.writeByte(v.status);
  p.writeInt(v.posX); p.writeInt(v.posY);
  p.writeInt(v.winningStreak); p.writeInt(v.failBuffCount);
  p.writeInt(0);
  p.writeInt(v.petsId);
  p.writeBoolean(v.sex);
  p.writeString(v.style); p.writeString(v.colors);
  return p;
}

/** 153/1 START_OR_CLOSE (ConsBatPackageType.START_OR_CLOSE): never actually sent by the leaked 6600 server
 *  (grepped every `new GSPacketIn(153` in vendor/DDT-6600/Source — no caller writes byte 1), same gap as
 *  world-boss/league/elite had before this codebase's `app."ScheduledEvents"` scheduler (handlers/eventos/
 *  agendador.ts) filled it in; the AS3 reader (`ConsortiaBattleManager.as openOrCloseHandler`, :646-667) is
 *  fully intact and is what gates the hall entry button (`ConsortiaBattleManager.instance.isOpen`/`isCanEnter`
 *  — `ConsortiaBattleEntryBtn.as:113`, `HallRightIconView.as:463`), so wiring this for real is what makes the
 *  button (and therefore the whole feature) reachable at all. */
export function consBatOpenClose(open: boolean, start?: Date, end?: Date, canEnter?: boolean): PacketOut {
  const p = new PacketOut(153);
  p.writeByte(1);
  p.writeBoolean(open);
  if (open) {
    p.writeDateTime(start ?? new Date());
    p.writeDateTime(end ?? new Date());
    p.writeBoolean(!!canEnter);
  }
  return p;
}

// ---------------------------------------------------------------------------------------------- scene / rooms

/**
 * 18 SCENE_ADD_USER (SendSceneAddPlayer, :1196) — broadcast in the hall waiting room, where 4.1 and 6600
 * clients can be mixed (see room-mgr.ts `sendToWaitingByKind`). 6600 reads the same fields plus +1 bool
 * `isOld` at the very end — real `Sys_Users_Detail.IsOldPlayer` (m3-eventos-b, see `loginSuccess` above and
 * `game/old-player.ts`), not a card-soul field.
 * `RoomListController.as __addWaitingPlayer` (4.1:166-194 vs 6600:200-229). See research/6600/packets-m1.md.
 */
export function sceneAddPlayer(c: PlayerInfo, clientKind: ClientKind = "41"): PacketOut {
  const p = new PacketOut(18, c.ID);
  p.writeInt(c.Grade); p.writeBoolean(c.Sex); p.writeString(c.NickName ?? ""); p.writeByte(c.typeVIP); p.writeInt(c.VIPLevel);
  p.writeString(c.ConsortiaName); p.writeInt(c.Offer); p.writeInt(c.Win); p.writeInt(c.Total); p.writeInt(c.Escape);
  p.writeInt(c.ConsortiaID); p.writeInt(c.Repute); p.writeBoolean(c.IsMarried);
  if (c.IsMarried) {
    p.writeInt(c.SpouseID);
    p.writeString(c.SpouseName ?? "");
  }
  p.writeString(c.UserName ?? ""); p.writeInt(c.FightPower); p.writeInt(c.apprenticeshipState);
  if (clientKind === "6600") p.writeBoolean(c.IsOldPlayer); // isOld (real value, m3-eventos-b)
  return p;
}

/** 21 SCENE_REMOVE_USER (SendSceneRemovePlayer, :1224). */
export function sceneRemovePlayer(id: number): PacketOut {
  return new PacketOut(21, id);
}

export interface RoomView {
  RoomId: number; RoomType: number; HardLevel: number; TimeMode: number; PlayerCount: number; viewerCnt: number;
  maxViewerCnt: number; PlacesCount: number; Password: string; MapId: number; IsPlaying: boolean; Name: string;
  GameType: number; LevelLimits: number; isCrosszone: boolean; isWithinLeageTime: boolean; isOpenBoss: boolean; Pic: string;
}

/** 94/9 room list (SendUpdateRoomList, :1166) — at most 9 rooms per page. */
export function roomList(rooms: RoomView[]): PacketOut {
  const p = new PacketOut(94);
  p.writeByte(9);
  p.writeInt(rooms.length);
  const n = Math.min(rooms.length, 9);
  p.writeInt(n);
  for (let i = 0; i < n; i++) {
    const r = rooms[i]!;
    p.writeInt(r.RoomId); p.writeByte(r.RoomType); p.writeByte(r.TimeMode); p.writeByte(r.PlayerCount); p.writeByte(r.viewerCnt);
    p.writeByte(r.maxViewerCnt); p.writeByte(r.PlacesCount); p.writeBoolean(!!r.Password); p.writeInt(r.MapId); p.writeBoolean(r.IsPlaying);
    p.writeString(r.Name); p.writeByte(r.GameType); p.writeByte(r.HardLevel); p.writeInt(r.LevelLimits); p.writeBoolean(r.isOpenBoss);
  }
  return p;
}

/**
 * 94/0 room create (SendRoomCreate, 4.1 :1366 / 6600 :1436). 6600 adds +1 trailing bool `isShowGameLoading`
 * (6600 C# always writes `false` here too — `RoomManager.as __createRoom` 4.1:285-308 vs 6600:529-569, the
 * extra field is 6600:550 `_isShowGameLoading = evt.pkg.readBoolean()`; confirmed against the 6600
 * `AbstractPacketLib.SendRoomCreate` which hardcodes `WriteBoolean(false)` — m2-salas,
 * research/6600/packets-m1.md "M2 salas"). Not reading it would EOF the 6600 client on every room
 * creation/entry, since this packet is sent right after `GAME_ROOM_CREATE`/`GAME_ROOM_LOGIN`.
 */
export function roomCreate(r: RoomView, clientKind: ClientKind = "41"): PacketOut {
  const p = new PacketOut(94);
  p.writeByte(0); p.writeInt(r.RoomId); p.writeByte(r.RoomType); p.writeByte(r.HardLevel); p.writeByte(r.TimeMode);
  p.writeByte(r.PlayerCount); p.writeByte(r.viewerCnt); p.writeByte(r.PlacesCount); p.writeBoolean(!!r.Password);
  p.writeInt(r.MapId); p.writeBoolean(r.IsPlaying); p.writeString(r.Name); p.writeByte(r.GameType); p.writeInt(r.LevelLimits);
  p.writeBoolean(r.isCrosszone); p.writeBoolean(r.isWithinLeageTime); p.writeBoolean(r.isOpenBoss); p.writeString(r.Pic);
  if (clientKind === "6600") p.writeBoolean(false); // isShowGameLoading (6600-only UI flag, server always sends false)
  return p;
}

/** 94/1 (SendRoomLoginResult, :1395). */
export function roomLoginResult(ok: boolean): PacketOut {
  const p = new PacketOut(94);
  p.writeByte(1);
  p.writeBoolean(ok);
  return p;
}

/** 94/2 (SendGameRoomSetupChange, :1468). */
export function roomSetupChange(r: RoomView): PacketOut {
  const p = new PacketOut(94);
  p.writeByte(2); p.writeBoolean(r.isOpenBoss);
  if (r.isOpenBoss) p.writeString(r.Pic);
  p.writeInt(r.MapId); p.writeByte(r.RoomType); p.writeString(r.Password ?? ""); p.writeString(r.Name ?? "Gunny1");
  p.writeByte(r.TimeMode); p.writeByte(r.HardLevel); p.writeInt(r.LevelLimits); p.writeBoolean(r.isCrosszone);
  return p;
}

/**
 * 94/4 (SendRoomPlayerAdd, :1231 4.1 / :1305 6600). Pets not ported: pet count 0.
 * Broadcast to the whole room (`rooms/room.ts`), which can mix 4.1 and 6600 players — the layout here
 * depends on the RECEIVER's client, not the entering player's (`v`), so `receiverKind` is a separate
 * param; callers must build one `PacketOut` per receiver clientKind (see `room.ts` broadcast call sites).
 * 6600 diffs vs 4.1 (`RoomManager.as __addPlayerInRoom` 4.1:333-453 vs 6600:637-754, confirmed against
 * `AbstractPacketLib.cs` `SendRoomPlayerAdd` on both sides — m2-salas, research/6600/packets-m1.md "M2 salas"):
 * +1 int `activityTanabataNum` (6600 `player.Actives.Info.activityTanabataNum`, read right after `zoneID`
 * and before `ID`, 6600:679/6600 C# line WriteInt before player.ID — Coleta/Tanabata event, not ported -> 0)
 * and +1 bool `isOld` right after `DailyLeagueLastScore`, before the pet-count loop — real
 * `Sys_Users_Detail.IsOldPlayer` (m3-eventos-b, see `loginSuccess` above and `game/old-player.ts`).
 */
export function roomPlayerAdd(v: PlayerView, receiverKind: ClientKind = "41"): PacketOut {
  const c = v.info;
  const p = new PacketOut(94, v.id);
  p.writeByte(4); p.writeBoolean(v.inRoom); p.writeByte(v.roomIndex); p.writeByte(v.roomTeam); p.writeBoolean(false);
  p.writeInt(c.Grade); p.writeInt(c.Offer); p.writeInt(c.Hide); p.writeInt(c.Repute); p.writeInt(Math.trunc(v.pingTime / 1000 / 10));
  p.writeInt(v.zoneId);
  if (receiverKind === "6600") p.writeInt(0); // activityTanabataNum (Coleta/Tanabata, not implemented)
  p.writeInt(c.ID); p.writeString(c.NickName ?? ""); p.writeByte(c.typeVIP); p.writeInt(c.VIPLevel);
  p.writeBoolean(c.Sex); p.writeString(c.Style); p.writeString(c.Colors); p.writeString(c.Skin);
  p.writeInt(v.weaponTemplateId); p.writeInt(v.secondWeaponTemplateId);
  p.writeInt(c.ConsortiaID); p.writeString(c.ConsortiaName); p.writeInt(c.badgeID); p.writeInt(c.Win); p.writeInt(c.Total);
  p.writeInt(c.Escape); p.writeInt(c.ConsortiaLevel); p.writeInt(c.ConsortiaRepute); p.writeBoolean(c.IsMarried);
  if (c.IsMarried) {
    p.writeInt(c.SpouseID);
    p.writeString(c.SpouseName ?? "");
  }
  p.writeString(c.UserName ?? ""); p.writeInt(c.Nimbus); p.writeInt(c.FightPower); p.writeInt(c.apprenticeshipState);
  p.writeInt(c.masterID); p.writeString(c.masterOrApprentices ?? ""); p.writeInt(c.graduatesCount); p.writeString(c.honourOfMaster ?? "");
  p.writeBoolean(v.match.DailyLeagueFirst); p.writeInt(v.match.DailyLeagueLastScore);
  if (receiverKind === "6600") p.writeBoolean(c.IsOldPlayer); // isOld (real value, m3-eventos-b)
  p.writeInt(0);
  return p;
}

/** 94/5 (SendRoomPlayerRemove, :1321). */
export function roomPlayerRemove(id: number, zoneId: number): PacketOut {
  const p = new PacketOut(94, id, id);
  p.writeByte(5);
  p.writeInt(zoneId);
  return p;
}

/** 94/6 (SendRoomPlayerChangedTeam, :1356). */
export function roomChangedTeam(id: number, team: number, index: number): PacketOut {
  const p = new PacketOut(94, id);
  p.writeByte(6); p.writeByte(team); p.writeByte(index);
  return p;
}

/** 94/15 (SendRoomUpdatePlayerStates, :1332). */
export function roomPlayerStates(states: number[]): PacketOut {
  const p = new PacketOut(94);
  p.writeByte(15);
  for (const s of states) p.writeByte(s);
  return p;
}

/** 94/10 (SendRoomUpdatePlacesStates, :1344). */
export function roomPlacesStates(states: number[]): PacketOut {
  const p = new PacketOut(94);
  p.writeByte(10);
  for (const s of states) p.writeInt(s);
  return p;
}

/** 94/13 pair-up start, 94/11 cancel (:1404, :1426), 94/12 room type (:1417). */
export function roomByte(sub: number, extra?: number): PacketOut {
  const p = new PacketOut(94);
  p.writeByte(sub);
  if (extra !== undefined) p.writeByte(extra);
  return p;
}

// ---------------------------------------------------------------------------------------------- social

/**
 * 160/160 (SendAddFriend, :502).
 * 6600 reads the same fields plus +1 bool `isOld` (real `Sys_Users_Detail.IsOldPlayer`, m3-eventos-b, see
 * `loginSuccess` above and `game/old-player.ts`) and +1 date `LastLoginDate` (real value, we track it as
 * `PlayerInfo.LastDate`) right after `IsMarried` — PlayerManager.as __friendAdd (4.1:655-726 vs 6600:867-940).
 * See research/6600/packets-m1.md.
 */
export function addFriend(u: PlayerInfo, relation: number, state: boolean, clientKind: ClientKind = "41"): PacketOut {
  const p = new PacketOut(160, u.ID);
  p.writeByte(160); p.writeBoolean(state);
  if (state) {
    p.writeInt(u.ID); p.writeString(u.NickName ?? ""); p.writeByte(u.typeVIP); p.writeInt(u.VIPLevel); p.writeBoolean(u.Sex);
    p.writeString(u.Style); p.writeString(u.Colors); p.writeString(u.Skin); p.writeInt(u.State === 1 ? 1 : 0); p.writeInt(u.Grade);
    p.writeInt(u.Hide); p.writeString(u.ConsortiaName); p.writeInt(u.Total); p.writeInt(u.Escape); p.writeInt(u.Win); p.writeInt(u.Offer);
    p.writeInt(u.Repute); p.writeInt(relation); p.writeString(u.UserName ?? ""); p.writeInt(u.Nimbus); p.writeInt(u.FightPower);
    p.writeInt(u.apprenticeshipState); p.writeInt(u.masterID); p.writeString(u.masterOrApprentices ?? ""); p.writeInt(u.graduatesCount);
    p.writeString(u.honourOfMaster ?? ""); p.writeInt(u.AchievementPoint); p.writeString(u.Honor); p.writeBoolean(u.IsMarried);
    if (clientKind === "6600") { p.writeBoolean(u.IsOldPlayer); wd(p, u.LastDate); } // isOld (real), LastLoginDate (real)
  }
  return p;
}

/** 160/161 (SendFriendRemove, :543). */
export function friendRemove(friendId: number): PacketOut {
  const p = new PacketOut(160, friendId);
  p.writeByte(161);
  return p;
}

/** 160/165 (SendFriendState, :551). */
export function friendState(playerId: number, state: number, typeVip: number, vipLevel: number): PacketOut {
  const p = new PacketOut(160, playerId);
  p.writeByte(165); p.writeInt(state); p.writeInt(typeVip); p.writeInt(vipLevel); p.writeBoolean(true);
  return p;
}

/** 160/51 (sendOneOnOneTalk, :563). */
export function oneOnOneTalk(receiverId: number, senderNick: string, msg: string, playerId: number, now = new Date()): PacketOut {
  const p = new PacketOut(160, playerId);
  p.writeByte(51); p.writeInt(receiverId); p.writeString(senderNick); wd(p, now); p.writeString(msg); p.writeBoolean(false);
  return p;
}

/**
 * 74 ITEM_EQUIP (SendUserEquip, :1035 4.1 / :952 6600) — zlib-compressed body. Gem souls not ported (count 0).
 * 6600 reads the same code with a ~15-field header diff (PlayerManager.as __itemEquip 4.1:321-515 vs
 * 6600:452-717, confirmed against `AbstractPacketLib.cs:952-1114` SendUserEquip):
 * - +1 int `player.ZoneID` right after `player.ID`, before NickName (channel disambiguator — we don't have
 *   channels yet, see docs/plan/TASKS.md `ch-*`, so defaults to 0, same stub `cardData`/`playerCardData` use).
 * - +1 bool `isOpenKingBless` between VIPLevel and Win (6600-only king-bless system — see `kingBlessClosed()`,
 *   always sent closed -> `false` here too).
 * - +1 int `curHorseLevel`/`MountLv` right after necklaceExp (Montaria, M1-schema-only so far -> `0`).
 * - Per item: +1 int `MagicLevel` at the very end (same `writeItemMagicTail` tail as 64 GRID_GOODS, `full:
 *   false` — 6600 only reads this one extra field here, not the other four).
 * - New tail after the item list, replacing the 4.1 bare `gemSoul count=0`: `beadItems.Count`(0, BeadBag not
 *   ported), `UserGemStone.Count`(0, same shape 4.1 ends with), `player.evolutionGrade`/`evolutionExp` (real
 *   values, already tracked — see `publicPlayer`), `player.MagicAttack`/`MagicDefence` (m3-figurino: sum of
 *   the `items` passed in — same equip-slot-only list the caller already filters to, see
 *   `handlers/bolsa/ver-equipamento.ts` — not a separate reliquary bag, see game/stats.ts
 *   StatResult.magicAttack doc), `magicStones.Count`(0), `player.MountsType`(0, Montaria again).
 * Checked against the real C#: `LastLoginDate` (`DateTime.Now.AddDays(-2)`) and `DailyLeagueFirst`/
 * `DailyLeagueLastScore` (`false`/`0`) are hardcoded THE SAME WAY in the 6600 source too — no diff there
 * despite an earlier note in research/6600/packets-m1.md Round 2 saying otherwise; corrected in this round.
 * `apprenticeshipState`/`masterID`/`masterOrApprentices`/`graduatesCount`/`honourOfMaster` are also sent as
 * dummy `0`/`0`/""`/0`/""` by the 6600 C# itself, same precedent as Detalhe A (loginSuccess) — we keep the
 * REAL values since the client only cares about the field's type, not a specific value. See
 * research/6600/packets-m1.md packet 74.
 */
export function userEquip(c: PlayerInfo, items: ItemInfo[], now = new Date(), clientKind: ClientKind = "41", zoneId = 0): PacketOut {
  const p = new PacketOut(74, c.ID);
  const is6600 = clientKind === "6600";
  p.writeInt(c.ID);
  if (is6600) p.writeInt(zoneId); // player.ZoneID (channels not implemented yet -> 0)
  p.writeString(c.NickName ?? ""); p.writeInt(c.Agility); p.writeInt(c.Attack); p.writeString(c.Colors); p.writeString(c.Skin);
  p.writeInt(c.Defence); p.writeInt(c.GP); p.writeInt(c.Grade); p.writeInt(c.Luck); p.writeInt(c.hp); p.writeInt(c.Hide); p.writeInt(c.Repute);
  p.writeBoolean(c.Sex); p.writeString(c.Style); p.writeInt(c.Offer); p.writeByte(c.typeVIP); p.writeInt(c.VIPLevel);
  if (is6600) p.writeBoolean(false); // isOpenKingBless (6600-only, always closed — see kingBlessClosed())
  p.writeInt(c.Win);
  p.writeInt(c.Total); p.writeInt(c.Escape); p.writeInt(c.ConsortiaID); p.writeString(c.ConsortiaName); p.writeInt(c.badgeID);
  p.writeInt(c.RichesOffer); p.writeInt(c.RichesRob); p.writeBoolean(c.IsMarried); p.writeInt(c.SpouseID); p.writeString(c.SpouseName ?? "");
  p.writeString(c.DutyName); p.writeInt(c.Nimbus); p.writeInt(c.FightPower); p.writeInt(c.apprenticeshipState); p.writeInt(c.masterID);
  p.writeString(c.masterOrApprentices ?? ""); p.writeInt(c.graduatesCount); p.writeString(c.honourOfMaster ?? ""); p.writeInt(c.AchievementPoint);
  p.writeString(c.Honor); wd(p, addDays(now, -2));
  const t = c.Texp;
  p.writeInt(t.spdTexpExp); p.writeInt(t.attTexpExp); p.writeInt(t.defTexpExp); p.writeInt(t.hpTexpExp); p.writeInt(t.lukTexpExp);
  p.writeBoolean(false); p.writeInt(0); p.writeInt(c.totemId); p.writeInt(c.necklaceExp);
  if (is6600) p.writeInt(0); // curHorseLevel/MountLv (Montaria, not implemented)
  p.writeInt(items.length);
  for (const it of items) {
    p.writeByte(it.BagType); p.writeInt(it.UserID); p.writeInt(it.ItemID); p.writeInt(it.Count); p.writeInt(it.Place); p.writeInt(it.TemplateID);
    p.writeInt(it.AttackCompose); p.writeInt(it.DefendCompose); p.writeInt(it.AgilityCompose); p.writeInt(it.LuckCompose); p.writeInt(it.StrengthenLevel);
    p.writeBoolean(it.IsBinds); p.writeBoolean(it.IsJudge); wd(p, it.BeginDate); p.writeInt(it.ValidDate); p.writeString(it.Color ?? "");
    p.writeString(it.Skin ?? ""); p.writeBoolean(it.IsUsed);
    for (const h of [it.Hole1, it.Hole2, it.Hole3, it.Hole4, it.Hole5, it.Hole6]) p.writeInt(h);
    p.writeString(it.Pic); p.writeInt(it.RefineryLevel); wd(p, now); p.writeByte(it.Hole5Level); p.writeInt(it.Hole5Exp);
    p.writeByte(it.Hole6Level); p.writeInt(it.Hole6Exp); p.writeBoolean(it.isGold);
    if (it.isGold) {
      p.writeInt(it.goldValidDate);
      wd(p, it.goldBeginTime);
    }
    p.writeString(it.latentEnergyCurStr); p.writeString(it.latentEnergyNewStr); wd(p, it.latentEnergyEndTime);
    if (is6600) writeItemMagicTail(p, false); // +1 int MagicLevel
  }
  if (is6600) {
    p.writeInt(0); // beadItems.Count (BeadBag system not ported)
    p.writeInt(0); // UserGemStone.Count (same shape as the 4.1 tail below, still empty)
    p.writeInt(c.evolutionGrade); p.writeInt(c.evolutionExp);
    // m3-figurino: sum of `items`' MagicAttack/MagicDefence (equip slots only, see doc above).
    p.writeInt(items.reduce((s, it) => s + it.MagicAttack, 0));
    p.writeInt(items.reduce((s, it) => s + it.MagicDefence, 0));
    p.writeInt(0); // magicStones.Count
    p.writeInt(0); // player.MountsType (Montaria, not implemented)
  } else {
    p.writeInt(0); // gem souls (GemstonInitInfo list), always empty today
  }
  compressPacket(p);
  return p;
}

/** 117 MAIL_RESPONSE (SendMailResponse, :1749). */
export function mailResponse(playerId: number, type: number): PacketOut {
  const p = new PacketOut(117);
  p.writeInt(playerId);
  p.writeInt(type);
  return p;
}

// ---------------------------------------------------------------------------------------------- game (fight)

export interface FightPlayerView extends PlayerView {
  team: number;
  livingId: number;
  maxBlood: number;
  weaponRefineryLevel: number;
  weaponName: string;
  /** battle pet (BaseGame.SendCreateGame :2120): place, template, id, name, owner, level, [slot, skillId] */
  pet?: { place: number; templateId: number; id: number; name: string; userId: number; level: number; skillEquip: [number, number][] } | null;
}

/**
 * 91/101 GAME_CREATE (Game.Logic/BaseGame.cs:2037 `SendCreateGame`, 4.1 and 6600 share this file almost
 * verbatim — 6600's is decompiled/obfuscated but the diff is confirmed field-by-field against
 * `GameManager.as createGameInfo` 4.1:505-692 vs 6600:893-1141, m2-salas, research/6600/packets-m1.md
 * "M2 salas"). 6600 diffs, per player:
 * - +1 int `pvpBadgeId` right after the 2nd weapon id, before `Nimbus` (6600 C# writes a hardcoded 0 here
 *   too — not a tracked feature, always 0).
 * - the 6 "addition" ints (GM/Auncher Experience/Offer/Riches addition, read as `/100` percentages) are
 *   hardcoded `5` (5%) in 6600's C# instead of 4.1's `0` — a real server-sent VALUE difference, not a
 *   layout one, but worth matching since it's free.
 * - +1 trailing int-count `HorseSkillEquip.Length` (+N ints) per player, after the pet block (Montaria
 *   skills, 6600-only, not ported -> always 0 equipped skills).
 * Broadcast to the whole match (mixed 4.1/6600 possible in a Match-queue pairing) — callers must build one
 * `PacketOut` per receiver clientKind, same pattern as `roomPlayerAdd`/`sceneAddPlayer` (see `fight/ddt.ts`).
 */
export function gameCreate(roomType: number, gameType: number, timeType: number, players: FightPlayerView[], clientKind: ClientKind = "41"): PacketOut {
  const is6600 = clientKind === "6600";
  const p = new PacketOut(91);
  p.writeByte(101); p.writeInt(roomType); p.writeInt(gameType); p.writeInt(timeType); p.writeInt(players.length);
  for (const f of players) {
    const c = f.info;
    p.writeInt(f.zoneId); p.writeString(f.zoneName); p.writeInt(c.ID); p.writeString(c.NickName ?? ""); p.writeBoolean(false);
    p.writeByte(c.typeVIP); p.writeInt(c.VIPLevel); p.writeBoolean(c.Sex); p.writeInt(c.Hide); p.writeString(c.Style);
    p.writeString(c.Colors); p.writeString(c.Skin); p.writeInt(c.Grade); p.writeInt(c.Repute);
    if (f.weaponTemplateId <= 0) p.writeInt(0);
    else {
      p.writeInt(f.weaponTemplateId); p.writeInt(f.weaponRefineryLevel); p.writeString(f.weaponName); wd(p, MIN_DATE);
    }
    p.writeInt(f.secondWeaponTemplateId > 0 ? f.secondWeaponTemplateId : 0);
    if (is6600) p.writeInt(0); // pvpBadgeId (not tracked, 6600 server itself always sends 0)
    p.writeInt(c.Nimbus); p.writeBoolean(c.IsShowConsortia); p.writeInt(c.ConsortiaID); p.writeString(c.ConsortiaName);
    p.writeInt(c.badgeID); p.writeInt(c.ConsortiaLevel); p.writeInt(c.ConsortiaRepute); p.writeInt(c.Win); p.writeInt(c.Total);
    p.writeInt(c.FightPower); p.writeInt(c.apprenticeshipState); p.writeInt(c.masterID); p.writeString(c.masterOrApprentices ?? "");
    p.writeInt(c.AchievementPoint); p.writeString(c.Honor); p.writeInt(c.Offer); p.writeBoolean(f.match.DailyLeagueFirst);
    p.writeInt(f.match.DailyLeagueLastScore); p.writeBoolean(c.IsMarried);
    if (c.IsMarried) {
      p.writeInt(c.SpouseID);
      p.writeString(c.SpouseName ?? "");
    }
    const addition = is6600 ? 5 : 0;
    for (let i = 0; i < 6; i++) p.writeInt(addition);
    p.writeInt(f.team); p.writeInt(f.livingId); p.writeInt(f.maxBlood);
    if (!f.pet) p.writeInt(0);
    else {
      const pt = f.pet;
      p.writeInt(1); p.writeInt(pt.place); p.writeInt(pt.templateId); p.writeInt(pt.id); p.writeString(pt.name); p.writeInt(pt.userId); p.writeInt(pt.level);
      p.writeInt(pt.skillEquip.length);
      for (const [slot, id] of pt.skillEquip) { p.writeInt(slot); p.writeInt(id); }
    }
    if (is6600) p.writeInt(0); // HorseSkillEquip.Length (Montaria, not ported)
  }
  return p;
}

/** 91/103 GAME_LOAD (BaseGame.cs:2916 SendStartLoading). */
export function gameLoad(maxTime: number, mapId: number, files: { type: number; path: string; className: string }[], petSkills: { pic: string; effect: string }[] = []): PacketOut {
  const p = new PacketOut(91);
  p.writeByte(103); p.writeInt(maxTime); p.writeInt(mapId); p.writeInt(files.length);
  for (const f of files) {
    p.writeInt(f.type);
    p.writeString(f.path);
    p.writeString(f.className);
  }
  p.writeInt(petSkills.length);
  for (const s of petSkills) {
    p.writeString(s.pic);
    p.writeString(s.effect);
  }
  return p;
}

// ---------------------------------------------------------------------------------------------- pets / cards

/** Pet block of 68/1 (AbstractPacketLib.SendUpdateUserPet :203; client PlayerManager.__updatePet). */
export interface PetView {
  ID: number; TemplateID: number; Name: string; UserID: number; Place?: number; Attack: number; Defence: number; Luck: number; Agility: number; Blood: number;
  Damage: number; Guard: number; AttackGrow: number; DefenceGrow: number; LuckGrow: number; AgilityGrow: number; BloodGrow: number; DamageGrow: number;
  GuardGrow: number; Level: number; GP: number; MaxGP: number; Hunger: number; PetHappyStar: number; MP: number; Skill: string; SkillEquip: string;
  IsEquip: boolean; currentStarExp: number; PetHappyStarReduce?: (v: number) => number;
  petEquips?: { eqType: number; eqTemplateID: number; startTime: Date; ValidDate: number }[];
}
const pairs = (s: string) => (s || "").split("|").map((x) => x.split(",").map(Number)).filter((a) => a.length >= 2 && a.every(Number.isFinite));

/** 68/1 UPDATE_PET: slots of `userId`'s pet bag (null = slot emptied); attributes minus the happiness reduction. */
export function updateUserPet(userId: number, zoneId: number, slots: { place: number; pet: PetView | null }[], eat: { weaponLevel: number; clothesLevel: number; hatLevel: number }): PacketOut {
  const p = new PacketOut(68, userId);
  p.writeByte(1); p.writeInt(userId); p.writeInt(zoneId); p.writeInt(slots.length);
  for (const { place, pet } of slots) {
    p.writeInt(place);
    if (!pet) { p.writeBoolean(false); continue; }
    const r = pet.PetHappyStarReduce ?? (() => 0);
    p.writeBoolean(true); p.writeInt(pet.ID); p.writeInt(pet.TemplateID); p.writeString(pet.Name); p.writeInt(pet.UserID);
    p.writeInt(pet.Attack - r(pet.Attack)); p.writeInt(pet.Defence - r(pet.Defence)); p.writeInt(pet.Luck - r(pet.Luck));
    p.writeInt(pet.Agility - r(pet.Agility)); p.writeInt(pet.Blood - r(pet.Blood)); p.writeInt(pet.Damage); p.writeInt(pet.Guard);
    p.writeInt(pet.AttackGrow); p.writeInt(pet.DefenceGrow); p.writeInt(pet.LuckGrow); p.writeInt(pet.AgilityGrow); p.writeInt(pet.BloodGrow);
    p.writeInt(pet.DamageGrow); p.writeInt(pet.GuardGrow); p.writeInt(pet.Level); p.writeInt(pet.GP); p.writeInt(pet.MaxGP); p.writeInt(pet.Hunger);
    p.writeInt(pet.PetHappyStar); p.writeInt(pet.MP);
    const sk = pairs(pet.Skill);
    p.writeInt(sk.length);
    for (const [id, slot] of sk) { p.writeInt(id!); p.writeInt(slot!); }
    const eq = pairs(pet.SkillEquip);
    p.writeInt(eq.length);
    for (const [id, slot] of eq) { p.writeInt(slot!); p.writeInt(id!); }
    p.writeBoolean(pet.IsEquip);
    const eqs = pet.petEquips ?? [];
    p.writeInt(eqs.length);
    for (const eq of eqs) { p.writeInt(eq.eqType); p.writeInt(eq.eqTemplateID); p.writeDateTime(wireDate(eq.startTime), true); p.writeInt(eq.ValidDate); }
    p.writeInt(pet.currentStarExp);
  }
  p.writeInt(eat.weaponLevel); p.writeInt(eat.clothesLevel); p.writeInt(eat.hatLevel);
  return p;
}

/** 68/5 REFRESH_PET (AbstractPacketLib.SendRefreshPet:2226): the rolled adopt-pet offer; sends nothing when empty
 * (matches the original — an empty array means "no packet", not "empty list"). */
export function refreshPet(pets: PetView[], refreshBtn: boolean): PacketOut | null {
  if (!pets.length) return null;
  const p = new PacketOut(68);
  p.writeByte(5); p.writeBoolean(refreshBtn); p.writeInt(pets.length);
  for (const pet of pets) {
    p.writeInt(pet.Place ?? 0); p.writeInt(pet.TemplateID); p.writeString(pet.Name);
    p.writeInt(pet.Attack); p.writeInt(pet.Defence); p.writeInt(pet.Luck); p.writeInt(pet.Agility); p.writeInt(pet.Blood);
    p.writeInt(pet.Damage); p.writeInt(pet.Guard); p.writeInt(pet.AttackGrow); p.writeInt(pet.DefenceGrow); p.writeInt(pet.LuckGrow);
    p.writeInt(pet.AgilityGrow); p.writeInt(pet.BloodGrow); p.writeInt(pet.DamageGrow); p.writeInt(pet.GuardGrow);
    p.writeInt(pet.Level); p.writeInt(pet.GP); p.writeInt(pet.MaxGP); p.writeInt(pet.Hunger); p.writeInt(pet.MP);
    const sk = pairs(pet.Skill);
    p.writeInt(sk.length);
    for (const [id, slot] of sk) { p.writeInt(id!); p.writeInt(slot!); }
    p.writeInt(10); p.writeInt(10); p.writeInt(100); // val/val2/val3 (unused UI constants, hard-coded in the original too)
  }
  return p;
}

/** 68/22 PET_RISINGSTAR reply (PetRisingStar.cs:108). */
export function petRisingStarReply(success: boolean): PacketOut {
  const p = new PacketOut(68);
  p.writeByte(22); p.writeBoolean(success);
  return p;
}

/** 68/23 PET_EVOLUTION reply (PetEvolution.cs:52) — player-wide "evolution" tier, not the pet's own template. */
export function petEvolutionReply(leveledUp: boolean): PacketOut {
  const p = new PacketOut(68);
  p.writeByte(23); p.writeBoolean(leveledUp);
  return p;
}

/** 68/33 EAT_PETS info (AbstractPacketLib.SendEatPetsInfo). */
export function eatPetsInfo(info: { weaponExp: number; weaponLevel: number; clothesExp: number; clothesLevel: number; hatExp: number; hatLevel: number }): PacketOut {
  const p = new PacketOut(68);
  p.writeByte(33); p.writeInt(info.weaponExp); p.writeInt(info.weaponLevel); p.writeInt(info.clothesExp); p.writeInt(info.clothesLevel); p.writeInt(info.hatExp); p.writeInt(info.hatLevel);
  return p;
}

/** 68/2 ADD_PET reply (AddPet.cs:58): hatched template, shows the "got a pet" frame. */
export function petAdded(templateId: number): PacketOut {
  const p = new PacketOut(68);
  p.writeByte(2); p.writeInt(templateId); p.writeBoolean(true);
  return p;
}

export interface CardView {
  CardID: number; UserID: number; Count: number; Place: number; TemplateID: number; Attack: number; Defence: number; Agility: number; Luck: number;
  AttackReset: number; DefenceReset: number; AgilityReset: number; LuckReset: number; Damage: number; Guard: number; Level: number; CardGP: number; isFirstGet: boolean;
}
/**
 * 216 CARDS_DATA (SendUpdateCardData(bag, slots) :1602): Total* = rolled + reset values.
 * 6600 (AbstractPacketLib.cs:1731-1757 vs 4.1): header gains `player.ZoneID` (+1 int, right after userId);
 * per-card the field SET actually shrinks (14 fields -> 12) and reorders: CardID, CardType (new; we don't
 * track it -> 0), UserID, Place, TemplateID, isFirstGet (moved right after TemplateID instead of last),
 * Attack, Defence, Agility, Luck, Damage, Guard — `Count` and `Level`/`CardGP` are dropped entirely for
 * this packet in 6600 (PlayerManager.as __getCards, 4.1 line 1110 vs 6600 line 1475). See
 * research/6600/packets-m1.md.
 */
export function cardData(userId: number, slots: { place: number; card: CardView | null }[], clientKind: ClientKind = "41", zoneId = 0): PacketOut {
  const p = new PacketOut(216, userId);
  p.writeInt(userId);
  if (clientKind === "6600") p.writeInt(zoneId);
  p.writeInt(slots.length);
  for (const { place, card: c } of slots) {
    p.writeInt(place);
    if (!c || c.TemplateID === 0) { p.writeBoolean(false); continue; }
    p.writeBoolean(true);
    if (clientKind === "6600") {
      p.writeInt(c.CardID); p.writeInt(0) /* CardType, not tracked */; p.writeInt(c.UserID); p.writeInt(c.Place); p.writeInt(c.TemplateID);
      p.writeBoolean(c.isFirstGet);
      p.writeInt(c.Attack + c.AttackReset); p.writeInt(c.Defence + c.DefenceReset); p.writeInt(c.Agility + c.AgilityReset); p.writeInt(c.Luck + c.LuckReset);
      p.writeInt(c.Damage); p.writeInt(c.Guard);
    } else {
      p.writeInt(c.CardID); p.writeInt(c.UserID); p.writeInt(c.Count); p.writeInt(c.Place); p.writeInt(c.TemplateID);
      p.writeInt(c.Attack + c.AttackReset); p.writeInt(c.Defence + c.DefenceReset); p.writeInt(c.Agility + c.AgilityReset); p.writeInt(c.Luck + c.LuckReset);
      p.writeInt(c.Damage); p.writeInt(c.Guard); p.writeInt(c.Level); p.writeInt(c.CardGP); p.writeBoolean(c.isFirstGet);
    }
  }
  return p;
}

// ------------------------------------------------------------------ hall activity icons (PlayerActives.SendEvent, GamePlayer.cs:3362)
/** 87/1 NEWCHICKENBOX_SYS CHICKENBOXOPEN (AbstractPacketLib.SendChickenBoxOpen :2446): prices are written last-to-first. */
export function chickenBoxOpen(userId: number, openCardPrice: number[], eagleEyePrice: number[], flushPrice: number, end: Date): PacketOut {
  const p = new PacketOut(87, userId);
  p.writeInt(1);
  p.writeInt(openCardPrice.length); for (let i = openCardPrice.length; i > 0; i--) p.writeInt(openCardPrice[i - 1]!);
  p.writeInt(eagleEyePrice.length); for (let i = eagleEyePrice.length; i > 0; i--) p.writeInt(eagleEyePrice[i - 1]!);
  p.writeInt(flushPrice);
  p.writeDateTime(end);
  return p;
}
/** 87/25 NEWCHICKENBOX_SYS ACTIVITY_OPEN = Lucky Star icon (SendLuckStarOpen :2466). */
export function luckStarOpen(userId: number): PacketOut {
  const p = new PacketOut(87, userId);
  p.writeInt(25);
  return p;
}
/**
 * 137 LEFT_GUN_ROULETTE type 1 / TYPEI_ISOPEN 1 (LeftGunRouletteManager.__openRoulett): open, 0 spins left ->
 * icon only. Same code/fields in both clients, but the "0 spins -> stop reading" guard differs: 4.1 checks
 * `count <= 0` alone (roulette/LeftGunRouletteManager.as:102, 4.1), 6600 checks `count <= 0 && result == "0"`
 * (same file, 6600, line 112) — an empty-string reward fails that second half, so the 6600 client falls
 * through into reading a 20-int array we never sent (EOF). Send reward "0" for 6600 to take the same
 * early-return path as 4.1. See research/6600/packets-m1.md.
 */
export function leftGunRouletteOpen(userId: number, open: boolean, clientKind: ClientKind = "41"): PacketOut {
  const p = new PacketOut(137, userId);
  p.writeInt(1); p.writeInt(1); p.writeBoolean(open);
  if (open) { p.writeInt(0); p.writeString(clientKind === "6600" ? "0" : ""); }
  return p;
}
/** 145 ACTIVITY_SYSTEM sub 64 LightRoad ACTIVATIONTYPE (LightRoadManager.openOrclose). */
export function lightRoadOpen(userId: number, open: boolean): PacketOut {
  const p = new PacketOut(145, userId);
  p.writeByte(64); p.writeBoolean(open);
  return p;
}
/** 145 ACTIVITY_SYSTEM sub 7 GuildMemberWeek OPEN (GuildMemberWeekManager.openOrclose). */
export function guildMemberWeekOpen(userId: number, start: string, end: string): PacketOut {
  const p = new PacketOut(145, userId);
  p.writeByte(7); p.writeBoolean(true); p.writeString(start); p.writeString(end);
  return p;
}
/** 80 LITTLEGAME_ACTIVED (ePackageType.as:482; LittleGameManager.__actived reads one bool). Toggles the
 *  "littlegamenote" hall-icon badge for the Termas minigame ("Đại chiến Hút Gà" / littleGame.swf) — a
 *  separate top-level packet, NOT part of 166 LITTLEGAME_COMMAND. See research/qa/hall-icons.md. */
export function littleGameActived(userId: number, actived: boolean): PacketOut {
  const p = new PacketOut(80, userId);
  p.writeBoolean(actived);
  return p;
}
/** 258/0 NOVICEACTIVITY_MESSAGE case 0 (NoviceActivityManager.__updateNovice, noviceactivity.swf): one
 *  activity-tab row (1-based index) + the shared start/end window the client needs so
 *  NoviceActivityManager.checkTime() returns true and HallStateView.addNoviceActivityAct() fires
 *  updateSwitchHandler(LIMITACTIVITY, true). The original never shipped a C# sender for this (see
 *  novato.ts header) — conditions/awardGot are intentionally always 0 (nothing locked/claimed) here;
 *  the real gate for claiming stays in noviceActivity()/claimOnce. Design note: research/qa/feature-designs.md
 *  §novato. The client does `endDate.date -= 1` after reading, so callers should pass `end` one day past
 *  the window they actually want. */
export function noviceActivityRow(userId: number, index: number, start: Date, end: Date): PacketOut {
  const p = new PacketOut(258, userId);
  p.writeInt(0); p.writeInt(index); p.writeInt(0); p.writeInt(0);
  p.writeDateTime(start); p.writeDateTime(end);
  return p;
}

// ---------------------------------------------------------------------------------------------- progression (handlers/progression.ts)
/** 136 TOTEM (SendPlayerRefreshTotem, AbstractPacketLib.cs:2657): the 1st int is always 1 (unused flag — client
 *  TotemMainView.refresh reads it and discards it), the 2nd is written into the client's `damageScores` field
 *  (that's the field the totem UI happens to reuse to show current honor — not actually damage score). */
export function totemRefresh(userId: number, myHonor: number, totemId: number): PacketOut {
  const p = new PacketOut(136, userId);
  p.writeInt(1); p.writeInt(myHonor); p.writeInt(totemId);
  return p;
}
/** 96 HONOR_UP_COUNT (SendUpdateUpCount, AbstractPacketLib.cs:2667). */
export function honorUpCount(userId: number, maxBuyHonor: number): PacketOut {
  const p = new PacketOut(96, userId);
  p.writeInt(maxBuyHonor);
  return p;
}
/** 88 (SendInsufficientMoney, GamePlayer.cs:4629): type + a hardcoded `false` the client never reads meaningfully. */
export function insufficientMoney(userId: number, type: number): PacketOut {
  const p = new PacketOut(88, userId);
  p.writeByte(type); p.writeBoolean(false);
  return p;
}
/**
 * 216 CARDS_DATA, GET_PLAYER_CARD (18) reply (SendUpdateCardData(PlayerInfo,List<UsersCardInfo>), :1641): same
 * item layout as `cardData` but keyed by the viewed player's id, not the viewer's, and always `true`.
 * `clientKind`/`zoneId` here are the REQUESTING player's (`p` in cartas-do-jogador.ts) — same header shape
 * as 6600's `SendPlayerCardInfo` (AbstractPacketLib.cs:1766-1768: `m_gameClient.Player...ZoneId`, i.e. the
 * sender's own zone, not the viewed target's). See `cardData` above and research/6600/packets-m1.md.
 */
export function playerCardData(targetId: number, cards: CardView[], clientKind: ClientKind = "41", zoneId = 0): PacketOut {
  const p = new PacketOut(216, targetId);
  p.writeInt(targetId);
  if (clientKind === "6600") p.writeInt(zoneId);
  p.writeInt(cards.length);
  for (const c of cards) {
    p.writeInt(c.Place); p.writeBoolean(true);
    if (clientKind === "6600") {
      p.writeInt(c.CardID); p.writeInt(0) /* CardType, not tracked */; p.writeInt(c.UserID); p.writeInt(c.Place); p.writeInt(c.TemplateID);
      p.writeBoolean(c.isFirstGet);
      p.writeInt(c.Attack + c.AttackReset); p.writeInt(c.Defence + c.DefenceReset); p.writeInt(c.Agility + c.AgilityReset); p.writeInt(c.Luck + c.LuckReset);
      p.writeInt(c.Damage); p.writeInt(c.Guard);
    } else {
      p.writeInt(c.CardID); p.writeInt(c.UserID); p.writeInt(c.Count); p.writeInt(c.Place); p.writeInt(c.TemplateID);
      p.writeInt(c.Attack + c.AttackReset); p.writeInt(c.Defence + c.DefenceReset); p.writeInt(c.Agility + c.AgilityReset); p.writeInt(c.Luck + c.LuckReset);
      p.writeInt(c.Damage); p.writeInt(c.Guard); p.writeInt(c.Level); p.writeInt(c.CardGP); p.writeBoolean(c.isFirstGet);
    }
  }
  return p;
}
/**
 * 93 CAN_CARD_LOTTERY, GOTO_CARD_LOTTERY (239) reply (LotteryContorller.__onGotoCardLottery, SocketManager.as:679):
 * no C# handler exists for the card/luck lottery screens in vendor/DDTank41 (confirmed: no PacketHandler for
 * 104/105/239/93/11 anywhere in Game.Server) — client always navigates to the card-choosing screen regardless of
 * `allow` (it only reads the bool, never branches on it), so this just feeds `LotteryModel.cardLotteryMoney`.
 * See research/qa/port-B.md "CARD_LOTTERY/LUCK_LOTTERY/GOTO_CARD_LOTTERY/ACTIVE_PULLDOWN" for the full note.
 */
export function canCardLottery(userId: number, allow: boolean, money: number): PacketOut {
  const p = new PacketOut(93, userId);
  p.writeBoolean(allow); p.writeInt(money);
  return p;
}
/** 251 LOTTERY_AWARD, LUCK_LOTTERY (105) reply (LotteryContorller.__onLuckyLottery): code 1 = won (TemplateId +
 *  timeLimit), 2 = lost (no extra fields), 3 = message only (messageTip). No reward table exists server-side
 *  (see canCardLottery's note) so handlers/progression.ts only ever sends code 3. */
export function luckLotteryAward(userId: number, code: 1 | 2 | 3, extra?: { templateId: number; timeLimit: number } | { messageTip: string }): PacketOut {
  const p = new PacketOut(251, userId);
  p.writeInt(code);
  if (code === 1 && extra && "templateId" in extra) { p.writeInt(extra.templateId); p.writeInt(extra.timeLimit); }
  if (code === 3 && extra && "messageTip" in extra) p.writeString(extra.messageTip);
  return p;
}
/** 11 ACTIVE_PULLDOWN (NovicePlatinumCard.__activeSocket) reply: `ok` closes the dialog, `false` re-enables the button. */
export function activePullDownResult(userId: number, ok: boolean): PacketOut {
  const p = new PacketOut(11, userId);
  p.writeBoolean(ok);
  return p;
}

/**
 * 284 MAGIC_STONE_MONSTER_INFO reply (m3-magic-stone-monster, 6600 only). `MagicStoneMonsterInfoHandler.cs:10-13`:
 * int NormalFightNum, int HardFightNum (player."Sys_Users_Extra", columns added this task).
 */
export function magicStoneMonsterInfo(id: number, normalFightNum: number, hardFightNum: number): PacketOut {
  const p = new PacketOut(284, id);
  p.writeInt(normalFightNum);
  p.writeInt(hardFightNum);
  return p;
}

/**
 * 142 KING_BLESS_MAIN / 2272 DEED_MAIN push (m3-king-bless-deed, 6600 only). `AbstractPacketLib.
 * SendKingBlessMain`/`SendDeedMain`: int Index, DateTime Enddate, and — only when `index > 0` — int count +
 * count*(int effectKey, int effectValue). The per-stat effect dictionary (`PlayerExtra.SetupKingBless`/
 * `SetupDeed`: STRENGTH_ENCHANCE/PET_STAR/HORSE_LIGHT/HORSE_ANGER/... keyed by a numeric slot) is never
 * consumed by this port's `game/stats.ts` (no FightPower hook for it, same unported-combat-effect-layer gap
 * as GAME_CMD's card-set bonuses, HANDLERS.md row 91) — always sent with 0 entries here; the buff ICON +
 * countdown (what `KingBlessManager`/`DeedManager` actually render) work correctly either way.
 * FIXED vs the original: `SendDeedMain` gates its entries on `Extra.Info.KingBlessIndex > 0` (copy-paste bug,
 * decompiled source) instead of `DeedIndex` — harmless for OUR 0-entry dictionary, but on the real server
 * this would desync the client's read when a player has an active Deed but no active King's Blessing
 * (`DeedManager.as:195` reads the extra bytes based on ITS OWN `DeedIndex` field, unconditionally). Gated on
 * the right field here (`code` tells which packet: 142 reads `index`=KingBlessIndex, 2272 reads `index`=DeedIndex).
 */
export function kingBlessOrDeedMain(code: 142 | 2272, id: number, index: number, enddate: Date): PacketOut {
  const p = new PacketOut(code, id);
  p.writeInt(index);
  p.writeDateTime(enddate);
  if (index > 0) p.writeInt(0); // count — effect dictionary not reconstructed, see note above
  return p;
}

/**
 * 140 TRUSTEESHIP sub 1 (START_EVENT) reply (m3-trusteeship, 6600 only, no C# source — `GameTrusteeshipCommand.cs`
 * is a pure stub). `TrusteeshipManager.updateData`: int spiritValue, int count, count*(int questId, Date endTime).
 * Sent after START/CANCEL/SPEED_UP/USE_SPIRIT_ITEM (the client only wires sub 1 and sub 4 replies — `SocketManager.
 * as:1472-1483` — so every mutating sub replies with the full refreshed list on sub 1, same as the original
 * would have had to if it existed).
 */
export function trusteeshipData(id: number, spiritValue: number, active: { questId: number; endTime: Date }[]): PacketOut {
  const p = new PacketOut(140, id);
  p.writeByte(1);
  p.writeInt(spiritValue);
  p.writeInt(active.length);
  for (const a of active) { p.writeInt(a.questId); p.writeDateTime(a.endTime); }
  return p;
}

/** 140 TRUSTEESHIP sub 4 (BUY_SPIRIT_EVENT) reply: int spiritValue only (`TrusteeshipManager.updateSpiritValue`). */
export function trusteeshipSpirit(id: number, spiritValue: number): PacketOut {
  const p = new PacketOut(140, id);
  p.writeByte(4);
  p.writeInt(spiritValue);
  return p;
}

/**
 * 134 DICE_SYSTEM sub 3 (DICE_RECEIVE_DATA) reply (m3-dice-system, 6600 only). `AbstractPacketLib.
 * SendDiceReceiveData`: bool UserFirstCell, int CurrentPosition, int LuckIntegralLevel, int LuckIntegral, int
 * FreeCount, int count, count*(int TemplateID, int index, int StrengthenLevel, int Count, int ValidDate, bool
 * IsBinds). Sent on sub 10 (enter/`ReceiveData`) and sub 12 (refresh/`CreateDiceAward`, same reply).
 */
export function diceReceiveData(id: number, userFirstCell: boolean, currentPosition: number, luckIntegralLevel: number, luckIntegral: number, freeCount: number, board: { templateId: number; strengthenLevel: number; count: number; validDate: number; isBind: boolean }[]): PacketOut {
  const p = new PacketOut(134, id);
  p.writeByte(3);
  p.writeBoolean(userFirstCell);
  p.writeInt(currentPosition);
  p.writeInt(luckIntegralLevel);
  p.writeInt(luckIntegral);
  p.writeInt(freeCount);
  p.writeInt(board.length);
  board.forEach((it, i) => { p.writeInt(it.templateId); p.writeInt(i); p.writeInt(it.strengthenLevel); p.writeInt(it.count); p.writeInt(it.validDate); p.writeBoolean(it.isBind); });
  return p;
}

/**
 * 134 DICE_SYSTEM sub 4 (DICE_RECEIVE_RESULT) reply — raw inline packet in the original (`DiceHandler.
 * method_0`, not one of `AbstractPacketLib`'s named writers): int positionBeforeRoll, int rollValue, int
 * LuckIntegral, int LuckIntegralLevel, int FreeCount, string RewardName. `DiceController.__receiveResult`
 * reads "position" then animates the dice moving `rollValue` steps from there — the server never sends the
 * post-roll position, only these two (confirmed against the client reader, `Dice/Controller/DiceController.
 * as:353-376`).
 */
export function diceRollResult(id: number, positionBeforeRoll: number, rollValue: number, luckIntegral: number, luckIntegralLevel: number, freeCount: number, rewardName: string): PacketOut {
  const p = new PacketOut(134, id);
  p.writeByte(4);
  p.writeInt(positionBeforeRoll);
  p.writeInt(rollValue);
  p.writeInt(luckIntegral);
  p.writeInt(luckIntegralLevel);
  p.writeInt(freeCount);
  p.writeString(rewardName);
  return p;
}

// ---------------------------------------------------------------------- 404 RING_STATION (Arena Ranqueada)
// Sub-codes (RingStationPackageType.as): 1 VIEWINFO, 2 BUYCOUNTORTIME, 3 ARMORY, 4 NEWBATTLEFIELD, 5 CHALLENGE,
// 6 FIGHTFLAG, 7 SENDSIGNMSG. 48 LANDERSAWARD_RECEIVE / 49 LANDERSAWARD_GET / 64 DUNGEON_UPDATEEXP are a
// SEPARATE, unrelated "microend download reward" feature with no server handler in the leaked C# at all
// (`Game.Server.RingStation.Handle` only registers codes 1-7, `Attribute15(1..7)`) — not RingStation ranking,
// tracked as `m3-ringstation-2`.

/** One row of the challenge list GetInfo shows (`RingStationView.as readPersonInfo`) — a ranked neighbor or
 *  the baseline practice bot (rank 0). */
export interface RingStationChallengeView {
  info: PlayerInfo;
  weaponId: number;
  rank: number;
  signMsg: string;
}

function writeRingStationPerson(p: PacketOut, v: RingStationChallengeView): void {
  const c = v.info;
  p.writeInt(c.ID);
  p.writeString(c.UserName ?? "");
  p.writeString(c.NickName ?? "");
  p.writeByte(c.typeVIP);
  p.writeInt(c.VIPLevel);
  p.writeInt(c.Grade);
  p.writeBoolean(c.Sex);
  p.writeString(c.Style ?? "");
  p.writeString(c.Colors ?? "");
  p.writeString(c.Skin ?? "");
  p.writeString(c.ConsortiaName ?? "");
  p.writeInt(c.Hide);
  p.writeInt(c.Offer);
  p.writeInt(c.Win);
  p.writeInt(c.Total);
  p.writeInt(c.Escape);
  p.writeInt(c.Repute);
  p.writeInt(c.Nimbus);
  p.writeInt(c.GP);
  p.writeInt(c.FightPower);
  p.writeInt(c.AchievementPoint);
  p.writeInt(v.rank);
  p.writeInt(v.weaponId);
  p.writeString(v.signMsg);
}

/** 404/1 VIEWINFO (RingStationViewInfo.cs): own rank/counts/sign/award info + up to 4 challenge candidates. */
export function ringStationInfo(id: number, self: {
  rank: number; challengeNum: number; buyCount: number; buyPrice: number; challengeTime: Date; cdPrice: number;
  signMsg: string; awardNum: number; awardTime: Date; championText: string;
}, candidates: RingStationChallengeView[]): PacketOut {
  const p = new PacketOut(404, id);
  p.writeByte(1);
  p.writeInt(self.rank);
  p.writeInt(self.challengeNum);
  p.writeInt(self.buyCount);
  p.writeInt(self.buyPrice);
  wd(p, self.challengeTime);
  p.writeInt(self.cdPrice);
  p.writeInt(0);
  p.writeString(self.signMsg);
  p.writeInt(self.awardNum);
  wd(p, self.awardTime);
  p.writeString(self.championText);
  p.writeInt(candidates.length);
  for (const v of candidates) writeRingStationPerson(p, v);
  return p;
}

/** 404/2 BUYCOUNTORTIME, "buy time" branch (RingStationBuyBattleCountOrTime.cs, `flag=true`): cooldown cleared. */
export function ringStationBuyTimeResult(id: number, ok: boolean): PacketOut {
  const p = new PacketOut(404, id);
  p.writeByte(2);
  p.writeBoolean(true);
  p.writeBoolean(ok);
  return p;
}

/** 404/2 BUYCOUNTORTIME, "buy extra challenge count" branch (`flag=false`): new buyCount/challengeNum totals. */
export function ringStationBuyCountResult(id: number, buyCount: number, challengeNum: number): PacketOut {
  const p = new PacketOut(404, id);
  p.writeByte(2);
  p.writeBoolean(false);
  p.writeInt(buyCount);
  p.writeInt(challengeNum);
  return p;
}

/** 404/3 ARMORY (RingStationArmory.cs): top-50 ranking list. */
export function ringStationArmory(id: number, rows: { rank: number; grade: number; nickName: string; fightPower: number; total: number }[]): PacketOut {
  const p = new PacketOut(404, id);
  p.writeByte(3);
  p.writeInt(rows.length);
  for (const r of rows) {
    p.writeInt(r.rank); p.writeInt(r.grade); p.writeString(r.nickName); p.writeInt(r.fightPower); p.writeInt(r.total);
  }
  return p;
}

/** 404/4 NEWBATTLEFIELD (RingStationBattleField.cs): last 10 fight-log entries for this player. */
export function ringStationBattleField(id: number, rows: { dareFlag: boolean; userName: string; successFlag: boolean; level: number }[]): PacketOut {
  const p = new PacketOut(404, id);
  p.writeByte(4);
  p.writeInt(rows.length);
  for (const r of rows) {
    p.writeBoolean(r.dareFlag); p.writeString(r.userName); p.writeBoolean(r.successFlag); p.writeInt(r.level);
  }
  return p;
}

/** 404/6 FIGHTFLAG (RingStationFightFlag.cs): the original writes a hardcoded `0`/`now` with no real state. */
export function ringStationFightFlag(id: number): PacketOut {
  const p = new PacketOut(404, id);
  p.writeByte(6);
  p.writeInt(0);
  wd(p, new Date());
  return p;
}

// ------------------------------------------------------------------------- 261 COLLECTION_TASK (Coleta, m4-coleta)
/** What `CollectionTaskRoom.SendPlayerInfos`/`SendAddPlayer` write per occupant (ID, NickName, VIPLevel, typeVIP,
 *  Sex, Style, Colors, MountsType, CollectionTaskPosX/PosY, ConsortiaID, badgeID, ConsortiaName, Honor) — a
 *  shorter block than `HallPlayerView` (no petsId/honorId, the 6600 enum for this scene never had them). */
export interface CollectionTaskPlayerView {
  info: PlayerInfo;
  x: number;
  y: number;
}

function writeCollectionTaskFields(p: PacketOut, v: CollectionTaskPlayerView): void {
  const c = v.info;
  p.writeInt(c.ID); p.writeString(c.NickName ?? ""); p.writeInt(c.VIPLevel); p.writeInt(c.typeVIP);
  p.writeBoolean(c.Sex); p.writeString(c.Style); p.writeString(c.Colors);
  p.writeInt(0); // MountsType (Montaria, not implemented — same gap as the hall's HallPlayerView)
  p.writeInt(v.x); p.writeInt(v.y);
  p.writeInt(c.ConsortiaID); p.writeInt(c.badgeID); p.writeString(c.ConsortiaName); p.writeString(c.Honor);
}

/** 261/5 INIT_PLAYERS (CollectionTaskRoom.SendPlayerInfos, :24-50): writes the REAL occupant count even though
 *  only the first 20 bodies follow (`num = min(20, length)`) — a 21st+ occupant's id/x/y would make the AS3
 *  reader (`CollectionTaskMainView.initPlayers`, :92-107) under-read past this packet's end; replicated as-is
 *  (same "no cap in the real client math" category as other M3 room caps, not fixed here). */
export function collectionTaskInit(players: CollectionTaskPlayerView[]): PacketOut {
  const p = new PacketOut(261);
  p.writeByte(5);
  p.writeInt(players.length);
  for (const v of players.slice(0, 20)) writeCollectionTaskFields(p, v);
  return p;
}

/**
 * 261/2 WALK (CollectionTaskRoom.PlayerMove, :73-84), broadcast to everyone but the mover. **Fixed vs the
 * original**: the real `PlayerMove.CommandHandler` (`Game.Server.CollectionTask.Handle/PlayerMove.cs:8-16`)
 * only writes byte+id+x+y — THREE fields — but the AS3 reader (`CollectionTaskMainView.movePlayer`, :150-178)
 * unconditionally also calls `pkg.readUTF()` for a path string, then `pathStr.split(",")`. Every other player's
 * remote walk in the real 6600 server reads one phantom empty string as the whole path (`[""]`), builds a
 * `Point(undefined, NaN)` and asks the renderer to walk there — a visible glitch, not a deliberate design
 * (nothing downstream depends on the broken path, so there is no "faithful bug" worth keeping). This builder
 * writes a real 1-point path ("x,y") so the receiving client's own pathfinder walks straight to the same spot
 * the sender did, same end position either way.
 */
export function collectionTaskWalk(id: number, x: number, y: number): PacketOut {
  const p = new PacketOut(261);
  p.writeByte(2);
  p.writeInt(id); p.writeInt(x); p.writeInt(y);
  p.writeString(`${x},${y}`);
  return p;
}

/** 261/4 QUIT (CollectionTaskRoom.RemovePlayer, :112-126): broadcast to everyone still in the room (no
 *  "except" — the removed player is already out of the dictionary by the time this is built). */
export function collectionTaskQuit(id: number): PacketOut {
  const p = new PacketOut(261);
  p.writeByte(4);
  p.writeInt(id);
  return p;
}

// ------------------------------------------------------------------------- 277 RESCUE (Resgate, m4-resgate)
// No C# implementation exists anywhere in vendor/DDT-6600/Source (confirmed: no `PacketHandler(277`, no
// `RESCUE`/`Rescue` hit outside the bare `ePackageType.RESCUE = 277` enum entry) — this whole feature, 6
// fixed "scenes" (sceneId 1-6), 3 star-tier rewards each, 3 buyable consumables (arrow/bloodPack/kingBless),
// is designed from the AS3 contract only (`rescue/` client sources), same category as `m3-trusteeship`.
export interface RescueSceneView { sceneId: number; starCount: number; rewardStatus: number; freeCount: number; remainSecond: number; cleanCDcount: number }

/** 277/1 IS_OPEN (`RescueManager.__addRescueBtn`): gates the hall icon (`HallIconType.RESCUE`), admin-controlled
 *  via `app."ScheduledEvents"` kind "rescue" (agendador.ts) — the original never had a real sender for this at
 *  all (same "feature nobody ever turned on" category as consortia_battle before the scheduler wired it). */
export function rescueOpenClose(open: boolean): PacketOut {
  const p = new PacketOut(277);
  p.writeByte(1);
  p.writeBoolean(open);
  return p;
}

/** 277/7 FRAME_INFO reply (`RescueMainFrame.__updateView`, :317-350): one block per requested scene —
 *  sceneId, starCount (best stars ever earned, drives the star icons), rewardStatus (2 bits per tier, tier 0
 *  in the low bits — `status & 3` then `status >>= 2`, 0 locked/1 unlocked/2 claimed), freeCount (free
 *  challenges left today), remainSecond (cooldown left), cleanCDcount (times paid to skip today, feeds the
 *  increasing price). */
export function rescueFrameInfo(scenes: RescueSceneView[]): PacketOut {
  const p = new PacketOut(277);
  p.writeByte(7);
  p.writeInt(scenes.length);
  for (const s of scenes) {
    p.writeInt(s.sceneId); p.writeInt(s.starCount); p.writeInt(s.rewardStatus); p.writeInt(s.freeCount);
    p.writeInt(s.remainSecond); p.writeInt(s.cleanCDcount);
  }
  return p;
}

/** 277/2 ITEM_INFO reply (`RescueMainFrame.__updateItem`, :204-210): arrow / bloodPack / kingBless counts, in
 *  that exact order (matches the 3 `RescueShopItem` rows, `type` 0/1/2). */
export function rescueItemInfo(arrow: number, bloodPack: number, kingBless: number): PacketOut {
  const p = new PacketOut(277);
  p.writeByte(2);
  p.writeInt(arrow); p.writeInt(bloodPack); p.writeInt(kingBless);
  return p;
}

/** 277/4 BUY_ITEM ack (`RescueMainFrame.__buyItem`, :212-215): the client's only reaction is to immediately
 *  re-request ITEM_INFO — no payload needed, same "ack that triggers a re-query" shape as 277/5 below. */
export function rescueBuyItemAck(): PacketOut {
  const p = new PacketOut(277);
  p.writeByte(4);
  return p;
}

/** 277/5 CLEAN_CD ack (`RescueMainFrame.__cleanCD`, :217-220): same shape as BUY_ITEM — the client reacts by
 *  re-requesting FRAME_INFO for the current scene, so no payload is needed here either. */
export function rescueCleanCdAck(): PacketOut {
  const p = new PacketOut(277);
  p.writeByte(5);
  return p;
}

/** 277/6 FIGHT_RESULT (`RescueManager.__fightResultHandler`, :71-82), sent when a Rescue PvE mission ends:
 *  score, star (this run's tier, 0-3), sceneId, isWin. Computed server-side from the real fight outcome
 *  (`GamePlayer.OnGameOver`'s kill count) — never trusted from the client (no original data defines a
 *  score/star formula; see `game/rescue.ts` for ours). */
export function rescueFightResult(score: number, star: number, sceneId: number, isWin: boolean): PacketOut {
  const p = new PacketOut(277);
  p.writeByte(6);
  p.writeInt(score); p.writeInt(star); p.writeInt(sceneId); p.writeBoolean(isWin);
  return p;
}

/** 277/8 GET_PRIZE ack (`RescuePrizeItem` claim click): `ok=false` covers "not unlocked yet" and "already
 *  claimed" alike (`rewardStatus` already told the client which tiers are claimable, so the original never
 *  needed a distinct error reason here). */
export function rescueGetPrizeResult(sceneId: number, index: number, ok: boolean): PacketOut {
  const p = new PacketOut(277);
  p.writeByte(8);
  p.writeInt(sceneId); p.writeInt(index); p.writeBoolean(ok);
  return p;
}

/** 84/1/3 GROWTHPACKAGE_ISOPEN (`SendGrowthPackageIsOpen`, `AbstractPacketLib.cs:2353`, 6600 only): pushed
 *  once at login when `Server_Config` `IsPromotePackageOpen` is truthy — gates the Passe Clássico hall icon
 *  client-side (`GrowthPackageManager.showEnterIcon`). See `handlers/eventos/passe-classico.ts`. */
export function growthPackageIsOpen(open: boolean): PacketOut {
  const p = new PacketOut(84);
  p.writeInt(1); // GrowthPackageType.GROWTHPACKAGE (packet-84 family selector, same value as GROWTHPACKAGE_OPEN)
  p.writeInt(3); // GrowthPackageType.GROWTHPACKAGE_ISOPEN
  p.writeBoolean(open);
  return p;
}

/** 84/1/(1 or 2) GROWTHPACKAGE_OPEN (at login) / GROWTHPACKAGE_UPDATEDATA (after a claim) reply
 *  (`SendGrowthPackageOpen`/`SendGrowthPackageUpadte`, `AbstractPacketLib.cs:2363-2403`, 6600 only):
 *  `availTime` (tiers claimed so far, 0-9) + 9 completion flags (`i < availTime`) — same byte layout for
 *  both, only the sub-opcode differs (`GrowthPackageModel.updateData` reads them identically). */
export function growthPackageState(kind: "open" | "update", availTime: number): PacketOut {
  const p = new PacketOut(84);
  p.writeInt(1); // GrowthPackageType.GROWTHPACKAGE
  p.writeInt(kind === "open" ? 1 : 2); // GROWTHPACKAGE_OPEN / GROWTHPACKAGE_UPDATEDATA
  p.writeInt(availTime);
  for (let i = 0; i < 9; i++) p.writeInt(i < availTime ? 1 : 0);
  return p;
}
