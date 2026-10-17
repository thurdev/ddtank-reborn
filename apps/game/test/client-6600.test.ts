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
import type { GSPacket } from "@ddt/protocol";
import type { GameServer } from "../src/server.js";
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

describe.each([["41"], ["6600"]] as const)("login burst packets — client %s", (clientKind) => {
  it("1 LOGIN, 38/67 UPDATE_*_INFO, 259, 102/0 WORLDBOSS OPEN, 137 LEFT_GUN_ROULETTE all parse with no EOF / leftover bytes", async () => {
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
  });
});
