/**
 * M1 client detection (docs/plan/MIGRACAO-6600.md, research/6600/packets-m1.md): pins the 4.1 and 6600
 * layouts of every login-burst packet that changed shape (same `ePackageType` code, different fields) or
 * collided (259 FIRSTRECHARGE vs CONSUME_RANK), using a real login through the FakeClient harness.
 *
 * Each `readXxx` function below reads a captured packet FIELD BY FIELD in the exact order the AS3 manager
 * named in packets-m1.md reads it (one readInt/readString/... per AS3 statement). If our writer wrote too
 * few bytes for that layout, a later read would silently return zero-padding from the oversized backing
 * buffer instead of throwing (unlike the real Flash `Error #2030`) — so the real assertion is
 * `pkt.offset === pkt.length` at the end: every byte written was read, and nothing more.
 */
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { HDR_SIZE, type GSPacket } from "@ddt/protocol";
import type { GameServer } from "../src/server.js";
import * as Out from "../src/packets/out.js";
import type { CardView } from "../src/packets/out.js";
import type { QuestDataRow } from "../src/db/social.js";
import { loggedIn, startServer, type Received } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  // ALL_OPEN: ships 137 LEFT_GUN_ROULETTE on login too (session/login.ts sendActivityIcons) so Detalhe F
  // (packets-m1.md) is actually exercised instead of being skipped.
  server = await startServer({ ALL_OPEN: "true" });
});
afterAll(async () => {
  await server?.stop();
});

/** Fails loudly (not silently over-reading zero padding) when a date is missing: `validateDateParts` throws on 0000. */
function readDate(p: GSPacket): void {
  p.readDateTime(true);
}

// ---------------------------------------------------------------------------------------------- 1 LOGIN reply
function readLogin41(p: GSPacket): void {
  p.readByte(); p.readInt(); // status, zoneId
  for (let i = 0; i < 7; i++) p.readInt(); // Attack..Gold
  p.readInt(); // Money
  p.readInt(); // medal
  p.readInt(); p.readInt(); p.readInt(); // Score, Hide, FightPower
  p.readInt(); p.readInt(); p.readString(); p.readInt(); p.readString(); readDate(p); // apprentice..freezesDate
  p.readByte(); p.readInt(); p.readInt(); readDate(p); readDate(p); // typeVIP..LastDate
  p.readInt(); readDate(p); p.readBoolean(); p.readInt(); // VIPNextLevelDaysNeeded..OptionOnOff
  p.readInt(); p.readString(); p.readInt(); p.readInt(); // AchievementPoint, Honor, honorId, totalGameTime
  p.readBoolean(); p.readString(); p.readString(); // Sex, styleAndSkin, Skin
  p.readInt(); p.readString(); p.readInt(); p.readInt(); // ConsortiaID, ConsortiaName, badgeID, DutyLevel
  p.readString(); p.readInt(); p.readString(); p.readInt(); // DutyName, Right, ChairmanName, ConsortiaHonor
  p.readInt(); p.readBoolean(); p.readString(); p.readString(); p.readInt(); p.readString(); // ConsortiaRiches..LoginName
  p.readInt(); p.readString(); p.readString(); // Nimbus, PvePermission, fightLibMission
  p.readInt(); p.readInt(); p.readInt(); // userGuildProgress, receiebox, receieGrade
  p.readInt(); // needGetBoxTime
  readDate(p); readDate(p); p.readInt(); // LastSpaDate, shopFinallyGottenTime, UseOffer
  p.readInt(); p.readInt(); p.readInt(); p.readBoolean(); p.readInt(); // dailyScore..DailyLeagueLastScore
  p.readInt(); p.readInt(); p.readInt(); // weeklyScore, weeklyGameCount, weeklyRanking
  for (let i = 0; i < 5; i++) p.readInt(); // texp 5
  p.readInt(); p.readInt(); readDate(p); // texpTaskCount, texpCount, texpTaskDate
  p.readBoolean(); p.readInt(); p.readInt(); readDate(p); p.readInt(); // isOldPlayer..lastLuckNum
  p.readInt(); p.readInt(); p.readInt(); p.readInt(); // accumulativeLoginDays, accumulativeAwardDays, totemId, necklaceExp
  p.readInt(); // fineSuitExp
}

function readLogin6600(p: GSPacket): void {
  p.readByte(); p.readInt(); // status, zoneId
  for (let i = 0; i < 7; i++) p.readInt(); // Attack..Gold
  p.readInt(); // Money
  p.readInt(); p.readInt(); // BandMoney, discard
  p.readInt(); p.readInt(); p.readInt(); // Score, Hide, FightPower
  p.readInt(); p.readInt(); p.readString(); p.readInt(); p.readString(); readDate(p);
  p.readByte(); p.readInt(); p.readInt(); readDate(p); readDate(p);
  p.readInt(); readDate(p); p.readBoolean(); p.readInt();
  p.readInt(); p.readString(); p.readInt(); p.readInt();
  p.readBoolean(); p.readString(); p.readString();
  p.readInt(); p.readString(); p.readInt(); p.readInt();
  p.readString(); p.readInt(); p.readString(); p.readInt();
  p.readInt(); p.readBoolean(); p.readString(); p.readString(); p.readInt(); p.readString();
  p.readInt(); p.readString(); p.readString();
  p.readInt(); // userGuildProgress (no receiebox trio here, 6600 moves it later)
  readDate(p); readDate(p); p.readInt(); // LastSpaDate, shopFinallyGottenTime, UseOffer
  p.readInt(); p.readInt(); p.readInt(); p.readBoolean(); p.readInt();
  p.readInt(); p.readInt(); p.readInt();
  for (let i = 0; i < 5; i++) p.readInt();
  p.readInt(); p.readInt(); readDate(p);
  p.readBoolean(); p.readInt(); p.readInt(); readDate(p); p.readInt();
  p.readBoolean(); p.readInt(); p.readInt(); p.readInt(); // isOld, CardSoul, GetSoulCount, uesedFinishTime
  p.readInt(); p.readInt(); // totemId, necklaceExp
  p.readInt(); p.readInt(); // accumulativeLoginDays, accumulativeAwardDays
  p.readInt(); p.readInt(); p.readInt(); // receiebox, receieGrade, needGetBoxTime (moved here)
  p.readInt(); p.readString(); p.readInt(); p.readInt(); p.readInt(); // isFirstDivorce, PveEpicPermission, MountsType, PetsID, horseRaceCanRaceTime
}

// --------------------------------------------------------------------------------------- 38 UPDATE_PRIVATE_INFO
function readPrivate41(p: GSPacket): void {
  p.readInt(); p.readInt(); p.readInt(); p.readInt(); p.readInt(); // Money, medal, Score, Gold, Gift
  p.readInt(); p.readInt(); p.readInt(); p.readInt(); // damageScores, petScore, hardCurrency, myHonor
}
function readPrivate6600(p: GSPacket): void {
  p.readInt(); p.readInt(); p.readInt(); // Money, BandMoney, discard
  p.readInt(); p.readInt(); p.readInt(); // Score, Gold, badLuckNumber
  p.readInt(); p.readInt(); // damageScores, petScore
  p.readInt(); p.readInt(); // myHonor, hardCurrency (swapped vs 4.1)
}

// --------------------------------------------------------------------------------------- 67 UPDATE_PLAYER_INFO
function readPublic41(p: GSPacket): void {
  for (let i = 0; i < 11; i++) p.readInt(); // GP..Luck
  p.readInt(); p.readInt(); // hp, Hide
  p.readString(); p.readString(); p.readString(); p.readBoolean(); // Style, Colors, Skin, IsShowConsortia
  p.readInt(); p.readString(); p.readInt(); p.readInt(); p.readInt(); // ConsortiaID..badgeID, unknown1, unknown2
  p.readInt(); p.readString(); p.readString(); p.readInt(); // Nimbus, PvePermission, fightLibMission, FightPower
  p.readInt(); p.readInt(); p.readString(); p.readInt(); // apprenticeshipState..graduatesCount
  p.readString(); p.readInt(); p.readString(); // honourOfMaster, AchievementPoint, honor
  readDate(p); // LastSpaDate
  p.readInt(); p.readInt(); readDate(p); p.readInt(); // charmGP, unknown3, shopFinallyGottenTime, UseOffer
  p.readInt(); p.readInt(); p.readInt(); p.readInt(); p.readInt(); // dailyScore..weeklyGameCount
  for (let i = 0; i < 5; i++) p.readInt(); // texp 5
  p.readInt(); p.readInt(); readDate(p); // texpTaskCount, texpCount, texpTaskDate
  const len = p.readInt(); // dungeonFlag count
  for (let i = 0; i < len; i++) { p.readInt(); p.readByte(); }
  p.readInt(); p.readInt(); // evolutionGrade, evolutionExp
}
function readPublic6600(p: GSPacket): void {
  for (let i = 0; i < 11; i++) p.readInt(); // GP..Luck
  p.readInt(); p.readInt(); // MagicAttack, MagicDefence
  p.readInt(); p.readInt(); // hp, Hide
  p.readString(); p.readString(); p.readString(); p.readBoolean();
  p.readInt(); p.readString(); p.readInt(); p.readInt(); p.readInt();
  p.readInt(); p.readString(); p.readString(); p.readInt();
  p.readInt(); p.readInt(); p.readString(); p.readInt();
  p.readString(); p.readInt(); p.readString();
  p.readInt(); // honorId
  readDate(p);
  p.readInt(); p.readInt(); readDate(p); p.readInt();
  p.readInt(); p.readInt(); p.readInt(); p.readInt(); p.readInt();
  p.readInt(); // leagueMoney
  for (let i = 0; i < 5; i++) p.readInt();
  p.readInt(); p.readInt(); readDate(p);
  const len = p.readInt();
  for (let i = 0; i < len; i++) { p.readInt(); p.readByte(); }
  p.readString(); // PveEpicPermission
  p.readInt(); p.readInt(); // evolutionGrade, evolutionExp
}

// --------------------------------------------------------------------------------------------- 102/0 world boss
function readWorldBoss41(p: GSPacket): void {
  p.readByte(); p.readString(); p.readInt(); p.readString(); p.readString(); // sub, resourceId, pveId, discard, name
  p.readInt(); // total_Blood (Int)
  p.readInt(); p.readInt(); // boss_x, boss_y
  const n = p.readInt();
  for (let i = 0; i < n; i++) { p.readInt(); p.readInt(); }
  readDate(p); readDate(p); p.readInt(); p.readBoolean(); p.readBoolean(); // begin, end, fight_time, fightOver, roomClose
  p.readInt(); p.readInt(); p.readInt(); p.readInt(); // ticketID, need_ticket_count, timeCD, reviveMoney
  const buffCount = p.readInt();
  for (let i = 0; i < buffCount; i++) { p.readInt(); p.readString(); p.readInt(); p.readString(); p.readInt(); }
  p.readBoolean(); p.readBoolean(); // isShowBlood, autoBlood
}
function readWorldBoss6600(p: GSPacket): void {
  p.readByte(); p.readString(); p.readInt(); p.readString(); p.readString();
  p.readLong(); // total_Blood (Long!)
  p.readInt(); p.readInt();
  const n = p.readInt();
  for (let i = 0; i < n; i++) { p.readInt(); p.readInt(); }
  readDate(p); readDate(p); p.readInt(); p.readBoolean(); p.readBoolean();
  p.readInt(); p.readInt(); p.readInt(); p.readInt();
  p.readInt(); p.readInt(); p.readInt(); // reFightMoney, addInjureBuffMoney, addInjureValue
  const buffCount = p.readInt();
  for (let i = 0; i < buffCount; i++) { p.readInt(); p.readString(); p.readInt(); p.readString(); p.readInt(); }
  p.readBoolean(); p.readBoolean();
}

// -------------------------------------------------------------------------------------------- 64 GRID_GOODS
function readGridGoodsItem41(p: GSPacket): void {
  for (let i = 0; i < 5; i++) p.readInt(); // UserID, ItemID, Count, Place, TemplateID
  for (let i = 0; i < 4; i++) p.readInt(); // AttackCompose..LuckCompose
  p.readInt(); p.readInt(); p.readBoolean(); p.readBoolean(); // StrengthenLevel, StrengthenExp, IsBinds, IsJudge
  readDate(p); p.readInt(); p.readString(); p.readString(); p.readBoolean(); // BeginDate, ValidDate, Color, Skin, IsUsed
  for (let i = 0; i < 6; i++) p.readInt(); // Hole1-6
  p.readString(); p.readInt(); readDate(p); p.readInt(); // Pic, RefineryLevel, DiscolorValidDate, StrengthenTimes
  p.readByte(); p.readInt(); p.readByte(); p.readInt(); // Hole5Level, Hole5Exp, Hole6Level, Hole6Exp
  const isGold = p.readBoolean();
  if (isGold) { p.readInt(); readDate(p); } // goldValidDate, goldBeginTime
  p.readString(); p.readString(); readDate(p); // latentEnergyCurStr (written twice, sic), latentEnergyEndTime
}
function readGridGoodsItem6600(p: GSPacket): void {
  readGridGoodsItem41(p);
  p.readInt(); p.readInt(); p.readBoolean(); p.readInt(); p.readInt(); // MagicAttack, MagicDefence, goodsLock, MagicExp, MagicLevel
}
/** Reads a whole 64 packet body (bagType, len, then len*(slot, hasItem, [item])); returns bagType + item count. */
function readGridGoods(p: GSPacket, clientKind: "41" | "6600"): { bagType: number; items: number } {
  const bagType = p.readInt();
  const len = p.readInt();
  let items = 0;
  for (let i = 0; i < len; i++) {
    p.readInt(); // slot
    if (p.readBoolean()) { items++; (clientKind === "6600" ? readGridGoodsItem6600 : readGridGoodsItem41)(p); }
  }
  return { bagType, items };
}

// --------------------------------------------------------------------------------- 137 LEFT_GUN_ROULETTE
function readRoulette(p: GSPacket, clientKind: "41" | "6600"): void {
  const type = p.readInt();
  const typeI = p.readInt();
  expect(type).toBe(1);
  expect(typeI).toBe(1);
  const open = p.readBoolean();
  if (open) {
    const count = p.readInt();
    const result = p.readString();
    expect(count).toBe(0);
    // 6600 only stops reading (no 20-int array) when result === "0" (research/6600/packets-m1.md Detalhe F).
    expect(result).toBe(clientKind === "6600" ? "0" : "");
  }
}

// --------------------------------------------------------------------------------------------------- 259
function readFirstRecharge41(p: GSPacket): void {
  p.readBoolean(); p.readBoolean();
}
function readConsumeRank6600(p: GSPacket): void {
  const actId = p.readString();
  const isOpen = p.readBoolean();
  expect(actId).toBe("");
  expect(isOpen).toBe(false);
}

function expectFullyConsumed(r: Received): void {
  expect(r.pkt.offset).toBe(r.pkt.length);
}

/** Same check as `expectFullyConsumed`, for a packet built directly (no FakeClient round trip). */
function expectPacketFullyConsumed(p: GSPacket): void {
  expect(p.offset).toBe(p.length);
}

// --------------------------------------------------------------------------------------------- 216 CARDS_DATA
function readCardsData41(p: GSPacket): { userId: number; cards: number } {
  const userId = p.readInt();
  const len = p.readInt();
  let cards = 0;
  for (let i = 0; i < len; i++) {
    p.readInt(); // place
    if (!p.readBoolean()) continue;
    cards++;
    for (let i2 = 0; i2 < 2; i2++) p.readInt(); // CardID, UserID
    p.readInt(); p.readInt(); p.readInt(); // Count, Place, TemplateID
    for (let i2 = 0; i2 < 4; i2++) p.readInt(); // Attack..Luck
    p.readInt(); p.readInt(); p.readInt(); p.readInt(); // Damage, Guard, Level, CardGP
    p.readBoolean(); // isFirstGet
  }
  return { userId, cards };
}
function readCardsData6600(p: GSPacket): { userId: number; zoneId: number; cards: number } {
  const userId = p.readInt();
  const zoneId = p.readInt();
  const len = p.readInt();
  let cards = 0;
  for (let i = 0; i < len; i++) {
    p.readInt(); // place
    if (!p.readBoolean()) continue;
    cards++;
    p.readInt(); p.readInt(); p.readInt(); p.readInt(); p.readInt(); // CardID, CardType, UserID, Place, TemplateID
    p.readBoolean(); // isFirstGet (moved here)
    for (let i2 = 0; i2 < 4; i2++) p.readInt(); // Attack..Luck
    p.readInt(); p.readInt(); // Damage, Guard (no Level/CardGP in 6600)
  }
  return { userId, zoneId, cards };
}

// ------------------------------------------------------------------------------------------------- 178 QUEST
const QUEST_STATES_LEN = 200; // default size of `QuestInventory.states` (game/quests.ts)

/** `readBytes()` with no length reads "the rest of the packet" (matches the AS3 tail byte array, which has
 * no length prefix of its own) — that would hide an off-by-one-field bug in the loop above by just eating
 * whatever's left. Asserting the exact tail length BEFORE consuming it is what actually proves every
 * per-quest field above was read correctly. */
function readQuests41(p: GSPacket): number {
  const len = p.readInt();
  for (let i = 0; i < len; i++) {
    p.readInt(); p.readBoolean(); // QuestID, IsComplete
    for (let i2 = 0; i2 < 4; i2++) p.readInt(); // Condition1-4
    readDate(p); p.readInt(); p.readInt(); p.readBoolean(); // CompletedDate, RepeatFinish, RandDobule, IsExist
  }
  expect(p.length - p.offset).toBe(QUEST_STATES_LEN);
  p.readBytes(QUEST_STATES_LEN); // states tail
  return len;
}
function readQuests6600(p: GSPacket): number {
  const len = p.readInt();
  for (let i = 0; i < len; i++) {
    p.readInt(); p.readBoolean();
    for (let i2 = 0; i2 < 4; i2++) p.readInt();
    readDate(p); p.readInt(); p.readInt(); p.readBoolean();
    p.readInt(); // QuestLevel
    const n = p.readInt(); // Condition5-8 array length
    for (let i2 = 0; i2 < n; i2++) { p.readInt(); p.readInt(); }
    p.readBoolean(); // isGet
  }
  expect(p.length - p.offset).toBe(QUEST_STATES_LEN);
  p.readBytes(QUEST_STATES_LEN);
  return len;
}

describe.each([["41"], ["6600"]] as const)("login burst packets — client %s", (clientKind) => {
  it("1 LOGIN, 38/67 UPDATE_*_INFO, 64 GRID_GOODS, 259, 102/0 WORLDBOSS OPEN, 137 LEFT_GUN_ROULETTE, 142 KING_BLESS_MAIN all parse with no EOF / leftover bytes", async () => {
    const { c } = await loggedIn(server, { client: clientKind, weapon: 7001 });

    const login = await c.code(1);
    (clientKind === "6600" ? readLogin6600 : readLogin41)(login.pkt);
    expectFullyConsumed(login);

    const priv = await c.code(38);
    (clientKind === "6600" ? readPrivate6600 : readPrivate41)(priv.pkt);
    expectFullyConsumed(priv);

    const pub = await c.code(67);
    (clientKind === "6600" ? readPublic6600 : readPublic41)(pub.pkt);
    expectFullyConsumed(pub);

    const money259 = await c.code(259);
    (clientKind === "6600" ? readConsumeRank6600 : readFirstRecharge41)(money259.pkt);
    expectFullyConsumed(money259);

    const boss = await c.code(102, 0);
    (clientKind === "6600" ? readWorldBoss6600 : readWorldBoss41)(boss.pkt);
    expectFullyConsumed(boss);

    // 137 only ships when ALL_OPEN/EVENTS_ALL_OPEN — not on by default in this harness; skip if absent.
    const rouletteIdx = c.received.findIndex((x) => x.code === 137);
    if (rouletteIdx >= 0) {
      const roulette = c.received[rouletteIdx]!;
      roulette.pkt.offset = 20;
      readRoulette(roulette.pkt, clientKind);
      expectFullyConsumed(roulette);
    }

    // 64 GRID_GOODS: the login burst sends one per bag; find the EquipBag one (bagType 0) carrying the
    // weapon seeded in slot 6 by `loggedIn({ weapon: 7001 })` so the "has item" branch (with the 6600 magic
    // tail) is actually exercised, not just the empty-slot shortcut.
    const gridGoods = c.received.filter((x) => x.code === 64);
    expect(gridGoods.length).toBeGreaterThan(0);
    let equipBagItems = 0;
    for (const g of gridGoods) {
      g.pkt.offset = 20;
      const { bagType, items } = readGridGoods(g.pkt, clientKind);
      expectFullyConsumed(g);
      if (bagType === 0) equipBagItems += items;
    }
    expect(equipBagItems).toBeGreaterThan(0);

    // 142 KING_BLESS_MAIN: 6600-only code (no 4.1 collision, research/6600/packets-m1.md) — must exist for
    // 6600 (otherwise KingBlessManager._endTime stays null -> TypeError #1009) and must NOT exist for 4.1.
    const kingBless = c.received.find((x) => x.code === 142);
    if (clientKind === "6600") {
      expect(kingBless).toBeDefined();
      kingBless!.pkt.offset = 20;
      const index = kingBless!.pkt.readInt();
      readDate(kingBless!.pkt);
      expect(index).toBe(0);
      if (index > 0) kingBless!.pkt.readInt(); // (not expected here: closed state)
      expectFullyConsumed(kingBless!);
    } else {
      expect(kingBless).toBeUndefined();
    }
  });
});

// 216 CARDS_DATA and 178 QUEST only ship when the player actually has a card/quest (flushCards/questInv.sendAll
// return early otherwise) — a fresh test character has neither, so these call the builders directly with a
// synthetic fixture instead of going through a full login, same spirit as Round 1's helper functions.
describe.each([["41"], ["6600"]] as const)("216 CARDS_DATA / 178 QUEST builders — client %s", (clientKind) => {
  const card: CardView = {
    CardID: 1001, UserID: 55, Count: 1, Place: 0, TemplateID: 2001, Attack: 10, Defence: 20, Agility: 30, Luck: 40,
    AttackReset: 1, DefenceReset: 2, AgilityReset: 3, LuckReset: 4, Damage: 50, Guard: 60, Level: 3, CardGP: 70, isFirstGet: true,
  };

  it("cardData (own cards)", () => {
    const p = Out.cardData(55, [{ place: 0, card }, { place: 1, card: null }], clientKind, 7);
    p.offset = HDR_SIZE;
    if (clientKind === "6600") {
      const r = readCardsData6600(p);
      expect(r).toEqual({ userId: 55, zoneId: 7, cards: 1 });
    } else {
      const r = readCardsData41(p);
      expect(r).toEqual({ userId: 55, cards: 1 });
    }
    expectPacketFullyConsumed(p);
  });

  it("playerCardData (GET_PLAYER_CARD reply)", () => {
    const p = Out.playerCardData(999, [card], clientKind, 7);
    p.offset = HDR_SIZE;
    if (clientKind === "6600") {
      const r = readCardsData6600(p);
      expect(r).toEqual({ userId: 999, zoneId: 7, cards: 1 });
    } else {
      const r = readCardsData41(p);
      expect(r).toEqual({ userId: 999, cards: 1 });
    }
    expectPacketFullyConsumed(p);
  });

  it("updateQuests (178)", () => {
    const quest = {
      QuestID: 42, IsComplete: false, Condition1: 1, Condition2: 2, Condition3: 3, Condition4: 4,
      CompletedDate: new Date("2020-01-01T00:00:00Z"), RepeatFinish: 0, RandDobule: 0, IsExist: true,
    } as unknown as QuestDataRow;
    const p = Out.updateQuests(55, new Uint8Array(QUEST_STATES_LEN), [quest], clientKind);
    p.offset = HDR_SIZE;
    const len = (clientKind === "6600" ? readQuests6600 : readQuests41)(p);
    expect(len).toBe(1);
    expectPacketFullyConsumed(p);
  });
});
