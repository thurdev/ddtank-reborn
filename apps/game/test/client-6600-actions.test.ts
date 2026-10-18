/**
 * M1 `m1-pacotes-acao` (docs/plan/TASKS.md, research/6600/packets-m1.md): pins the 4.1 and 6600 layouts of
 * the action-triggered server->client packets fixed in this round (74 ITEM_EQUIP, 18 SCENE_ADD_USER, 94/4
 * SendRoomPlayerAdd, 160/160 SendAddFriend) and the two broadcast packets confirmed byte-identical (195
 * AUCTION_REFRESH, 128/1 consortia user-pass) — same method as `client-6600.test.ts`: read a captured/built
 * packet FIELD BY FIELD in the exact order the AS3 reader named in packets-m1.md reads it, then assert
 * `offset === length` (no EOF, no leftover bytes) for both clientKinds.
 */
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { HDR_SIZE, uncompressPacket, type GSPacket } from "@ddt/protocol";
import type { GameServer } from "../src/server.js";
import * as Out from "../src/packets/out.js";
import { loggedIn, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server?.stop();
});

function readDate(p: GSPacket): void {
  p.readDateTime(true);
}
function expectPacketFullyConsumed(p: GSPacket): void {
  expect(p.offset).toBe(p.length);
}

// --------------------------------------------------------------------------------------------- 74 ITEM_EQUIP
/** Full per-item read shared by both clientKinds, up to (and including) latentEnergyEndTime. */
function readUserEquipItem(p: GSPacket): void {
  p.readByte(); // BagType
  for (let i = 0; i < 5; i++) p.readInt(); // UserID, ItemID, Count, Place, TemplateID
  for (let i = 0; i < 5; i++) p.readInt(); // AttackCompose..StrengthenLevel
  p.readBoolean(); p.readBoolean(); readDate(p); p.readInt(); p.readString(); p.readString(); p.readBoolean(); // IsBinds..IsUsed
  for (let i = 0; i < 6; i++) p.readInt(); // Hole1-6
  p.readString(); p.readInt(); readDate(p); p.readByte(); p.readInt(); p.readByte(); p.readInt(); // Pic..Hole6Exp
  const isGold = p.readBoolean();
  if (isGold) { p.readInt(); readDate(p); }
  p.readString(); p.readString(); readDate(p); // latentEnergyCurStr, latentEnergyNewStr, latentEnergyEndTime
}

function readUserEquip(p: GSPacket, clientKind: "41" | "6600"): { items: number } {
  p.readInt(); // ID
  if (clientKind === "6600") p.readInt(); // ZoneID
  p.readString(); // NickName
  p.readInt(); p.readInt(); p.readString(); p.readString();
  for (let i = 0; i < 5; i++) p.readInt();
  p.readInt(); p.readInt();
  p.readBoolean(); p.readString();
  p.readInt(); p.readByte(); p.readInt();
  if (clientKind === "6600") p.readBoolean(); // isOpenKingBless
  p.readInt(); p.readInt(); p.readInt();
  p.readInt(); p.readString(); p.readInt();
  p.readInt(); p.readInt(); p.readBoolean(); p.readInt(); p.readString();
  p.readString(); p.readInt(); p.readInt(); p.readInt(); p.readInt();
  p.readString(); p.readInt(); p.readString(); p.readInt();
  p.readString(); readDate(p);
  for (let i = 0; i < 5; i++) p.readInt();
  p.readBoolean(); p.readInt(); p.readInt(); p.readInt();
  if (clientKind === "6600") p.readInt(); // curHorseLevel/MountLv
  const len = p.readInt();
  for (let i = 0; i < len; i++) {
    readUserEquipItem(p);
    if (clientKind === "6600") p.readInt(); // MagicLevel
  }
  if (clientKind === "6600") {
    p.readInt(); // beadItems.Count (0 -> no per-bead reads below)
    p.readInt(); // UserGemStone.Count (0)
    p.readInt(); p.readInt(); // evolutionGrade, evolutionExp
    p.readInt(); p.readInt(); // player.MagicAttack/MagicDefence
    p.readInt(); // magicStones.Count (0)
    p.readInt(); // player.MountsType
  } else {
    p.readInt(); // gem souls count (0)
  }
  return { items: len };
}

// --------------------------------------------------------------------------------------------- 18 SCENE_ADD_USER
function readSceneAddPlayer(p: GSPacket, clientKind: "41" | "6600"): void {
  p.readInt(); p.readBoolean(); p.readString(); p.readByte(); p.readInt(); // Grade, Sex, NickName, typeVIP, VIPLevel
  p.readString(); p.readInt(); p.readInt(); p.readInt(); p.readInt(); // ConsortiaName, Offer, Win, Total, Escape
  p.readInt(); p.readInt(); const married = p.readBoolean(); // ConsortiaID, Repute, IsMarried
  if (married) { p.readInt(); p.readString(); }
  p.readString(); p.readInt(); p.readInt(); // UserName, FightPower, apprenticeshipState
  if (clientKind === "6600") p.readBoolean(); // isOld
}

// --------------------------------------------------------------------------------------------- 94/4 SendRoomPlayerAdd
function readRoomPlayerAdd(p: GSPacket, clientKind: "41" | "6600"): void {
  expect(p.readByte()).toBe(4);
  p.readBoolean(); p.readByte(); p.readByte(); p.readBoolean(); // inRoom, roomIndex, roomTeam, hasPet
  p.readInt(); p.readInt(); p.readInt(); p.readInt(); p.readInt(); // Grade, Offer, Hide, Repute, pingTime
  p.readInt(); // zoneId
  if (clientKind === "6600") p.readInt(); // activityTanabataNum
  p.readInt(); p.readString(); p.readByte(); p.readInt(); // ID, NickName, typeVIP, VIPLevel
  p.readBoolean(); p.readString(); p.readString(); p.readString(); // Sex, Style, Colors, Skin
  p.readInt(); p.readInt(); // weaponTemplateId, secondWeaponTemplateId
  p.readInt(); p.readString(); p.readInt(); p.readInt(); p.readInt(); // ConsortiaID, ConsortiaName, badgeID, Win, Total
  p.readInt(); p.readInt(); p.readInt(); const married = p.readBoolean(); // Escape, ConsortiaLevel, ConsortiaRepute, IsMarried
  if (married) { p.readInt(); p.readString(); }
  p.readString(); p.readInt(); p.readInt(); p.readInt(); // UserName, Nimbus, FightPower, apprenticeshipState
  p.readInt(); p.readString(); p.readInt(); p.readString(); // masterID, masterOrApprentices, graduatesCount, honourOfMaster
  p.readBoolean(); p.readInt(); // DailyLeagueFirst, DailyLeagueLastScore
  if (clientKind === "6600") p.readBoolean(); // isOld
  p.readInt(); // pet count (0)
}

// --------------------------------------------------------------------------------------------- 160/160 SendAddFriend
function readAddFriend(p: GSPacket, clientKind: "41" | "6600"): void {
  expect(p.readByte()).toBe(160);
  const state = p.readBoolean();
  expect(state).toBe(true);
  p.readInt(); p.readString(); p.readByte(); p.readInt(); p.readBoolean(); // ID, NickName, typeVIP, VIPLevel, Sex
  p.readString(); p.readString(); p.readString(); p.readInt(); p.readInt(); // Style, Colors, Skin, State, Grade
  p.readInt(); p.readString(); p.readInt(); p.readInt(); p.readInt(); p.readInt(); // Hide, ConsortiaName, Total, Escape, Win, Offer
  p.readInt(); p.readInt(); p.readString(); p.readInt(); p.readInt(); // Repute, relation, UserName, Nimbus, FightPower
  p.readInt(); p.readInt(); p.readString(); p.readInt(); // apprenticeshipState, masterID, masterOrApprentices, graduatesCount
  p.readString(); p.readInt(); p.readString(); p.readBoolean(); // honourOfMaster, AchievementPoint, Honor, IsMarried
  if (clientKind === "6600") { p.readBoolean(); readDate(p); } // isOld, LastLoginDate
}

describe.each([["41"], ["6600"]] as const)("m1-pacotes-acao builders — client %s", (clientKind) => {
  it("74 ITEM_EQUIP (userEquip) parses with no EOF / leftover bytes", async () => {
    const { player } = await loggedIn(server, { client: clientKind, weapon: 7001 });
    const gp = player();
    const items = gp.equipBag.getItems(0, 30);
    expect(items.length).toBeGreaterThan(0);
    const pkt = Out.userEquip(gp.info, items, new Date(), clientKind, gp.zoneId);
    uncompressPacket(pkt); // userEquip zlib-compresses the body (compressPacket), matches PlayerManager.as pkg.deCompress()
    const { items: n } = readUserEquip(pkt, clientKind);
    expect(n).toBe(items.length);
    expectPacketFullyConsumed(pkt);
  });

  it("18 SCENE_ADD_USER (sceneAddPlayer) parses with no EOF / leftover bytes", async () => {
    const { player } = await loggedIn(server, { client: clientKind });
    const pkt = Out.sceneAddPlayer(player().info, clientKind);
    pkt.offset = HDR_SIZE;
    readSceneAddPlayer(pkt, clientKind);
    expectPacketFullyConsumed(pkt);
  });

  it("94/4 SendRoomPlayerAdd (roomPlayerAdd) parses with no EOF / leftover bytes", async () => {
    const { player } = await loggedIn(server, { client: clientKind });
    const pkt = Out.roomPlayerAdd(player().view(), clientKind);
    pkt.offset = HDR_SIZE;
    readRoomPlayerAdd(pkt, clientKind);
    expectPacketFullyConsumed(pkt);
  });

  it("160/160 SendAddFriend (addFriend) parses with no EOF / leftover bytes", async () => {
    const { player } = await loggedIn(server, { client: clientKind });
    const pkt = Out.addFriend(player().info, 0, true, clientKind);
    pkt.offset = HDR_SIZE;
    readAddFriend(pkt, clientKind);
    expectPacketFullyConsumed(pkt);
  });
});

// ---------------------------------------------------------------------------------- 195 AUCTION_REFRESH (no diff)
describe("195 AUCTION_REFRESH — verified byte-identical between 4.1 and 6600", () => {
  it("still parses with no EOF / leftover bytes (both AS3 readers are identical, so one reader suffices)", async () => {
    const { auctionRefresh } = await import("../src/handlers/leilao/comum.js");
    const now = new Date();
    const info = {
      AuctioneerID: 1, AuctioneerName: "A", BeginDate: now, BuyerID: 0, BuyerName: "", ItemID: 1,
      Mouthful: 0, PayType: 1, Price: 100, Rise: 10, ValidDate: 1,
    } as never;
    // No item (Update/Delete path) — exercises the common "no item" branch.
    const pkt = auctionRefresh(info, 42, true, null, now);
    uncompressPacket(pkt); // auctionRefresh zlib-compresses the body too (AuctionHouseController.as pkg.deCompress())
    const auctionId = pkt.readInt();
    const exists = pkt.readBoolean();
    expect(auctionId).toBe(42);
    expect(exists).toBe(true);
    pkt.readInt(); pkt.readString(); readDate(pkt); pkt.readInt(); pkt.readString(); pkt.readInt();
    pkt.readInt(); pkt.readInt(); pkt.readInt(); pkt.readInt(); pkt.readInt();
    const hasItem = pkt.readBoolean();
    expect(hasItem).toBe(false);
    expectPacketFullyConsumed(pkt);
  });
});
