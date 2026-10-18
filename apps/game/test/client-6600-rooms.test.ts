/**
 * m2-salas (docs/plan/TASKS.md, research/6600/packets-m1.md "M2 salas"): pins the room-flow packets fixed for
 * the 6600 client from "create/enter room" up to (and including) the battle-loading packets — 94/0
 * SendRoomCreate, 94/4 SendRoomPlayerAdd (re-verified with the new `activityTanabataNum` field), 91/101
 * GAME_CREATE and 91/103 GAME_LOAD. Same method as `client-6600.test.ts`/`client-6600-actions.test.ts`: read a
 * captured packet FIELD BY FIELD in the exact order the AS3 reader cited in the research doc reads it, then
 * assert `offset === length` (no EOF, no leftover bytes) for both clientKinds.
 */
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { HDR_SIZE, type GSPacket, type PacketOut } from "@ddt/protocol";
import { GameServer, payTakeCard } from "../src/server.js";
import { testConfig } from "../src/config.js";
import { DdtFightEngine } from "../src/fight/ddt.js";
import { type BotProvider, VirtualPlayer } from "../src/bots/bot.js";
import * as Out from "../src/packets/out.js";
import { type FakeClient, loggedIn, sharedDb, testKey } from "./helpers.js";

let server: GameServer;
let engine: DdtFightEngine;
let clock = Date.now();
let botSeq = 9900;
const bots: BotProvider = {
  acquire: (level) => new VirtualPlayer({ id: ++botSeq, nickname: `RoomBot${botSeq}`, sex: true, level, weaponTemplateId: 7001 }),
  release: () => {},
};

beforeAll(async () => {
  const db = await sharedDb();
  engine = new DdtFightEngine({ manualClock: true, seed: () => 7, payTakeCard: (m) => payTakeCard(m) });
  const cfg = testConfig({ GAME_PORT: "0", WS_PORT: "0", POLICY_PORT: "0", ADMIN_PORT: "0", BIND_HOST: "127.0.0.1", LOG_LEVEL: "silent", PACKET_RATE_BURST: "100000", PACKET_RATE_PER_SEC: "100000" } as never);
  server = await new GameServer(cfg, { db, rsaKey: testKey(), fight: engine, bots }).start();
  (server.ctx.rooms as unknown as { o: { botFallbackSec: number } }).o.botFallbackSec = 0;
});
afterAll(async () => {
  await server?.stop();
});

function readDate(p: GSPacket): void {
  p.readDateTime(true);
}
function expectFullyConsumed(p: GSPacket): void {
  expect(p.offset).toBe(p.length);
}

const roomCmd = (c: FakeClient, sub: number, fill: (p: PacketOut) => void = () => {}) =>
  c.out(94, (p) => {
    p.writeInt(sub);
    fill(p);
  });

/** GameInSocketOut.as sendCreateRoom: 4.1 has no trailing field; 6600 adds +1 bool `isDouble` (not read back
 * server-side by either version's GameRoomCreate.cs handler — see criar-sala.ts). */
function createRoom(c: FakeClient, clientKind: "41" | "6600", roomType: number, timeType: number, name: string, pwd = "") {
  roomCmd(c, 0, (p) => {
    p.writeByte(roomType); p.writeByte(timeType); p.writeUTF(name); p.writeUTF(pwd);
    if (clientKind === "6600") p.writeBoolean(false); // isDouble
  });
}

async function lobby(clientKind: "41" | "6600", roomType = 0) {
  const x = await loggedIn(server, { client: clientKind, grade: 20 });
  x.c.out(16);
  await x.c.code(94, 9);
  createRoom(x.c, clientKind, roomType, 2, "m");
  await x.c.code(94, 0);
  return x;
}

// ----------------------------------------------------------------------------------------- 94/0 SendRoomCreate
function readRoomCreate(p: GSPacket, clientKind: "41" | "6600"): void {
  expect(p.readByte()).toBe(0);
  p.readInt(); p.readByte(); p.readByte(); p.readByte(); // RoomId, RoomType, HardLevel, TimeMode
  p.readByte(); p.readByte(); p.readByte(); p.readBoolean(); // PlayerCount, viewerCnt, PlacesCount, Password?
  p.readInt(); p.readBoolean(); p.readString(); p.readByte(); p.readInt(); // MapId, IsPlaying, Name, GameType, LevelLimits
  p.readBoolean(); p.readBoolean(); p.readBoolean(); p.readString(); // isCrosszone, isWithinLeageTime, isOpenBoss, Pic
  if (clientKind === "6600") p.readBoolean(); // isShowGameLoading
}

// ------------------------------------------------------------------------------------- 94/4 SendRoomPlayerAdd
function readRoomPlayerAdd(p: GSPacket, clientKind: "41" | "6600"): void {
  expect(p.readByte()).toBe(4);
  p.readBoolean(); p.readByte(); p.readByte(); p.readBoolean();
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

// ---------------------------------------------------------------------------------------------- 91/101 GAME_CREATE
function readGameCreatePlayer(p: GSPacket, clientKind: "41" | "6600"): void {
  p.readInt(); p.readString(); p.readInt(); p.readString(); p.readBoolean(); // zoneId, zoneName, ID, NickName, isViewer
  p.readByte(); p.readInt(); p.readBoolean(); p.readInt(); p.readString(); // typeVIP, VIPLevel, Sex, Hide, Style
  p.readString(); p.readString(); p.readInt(); p.readInt(); // Colors, Skin, Grade, Repute
  const weaponId = p.readInt();
  if (weaponId !== 0) { p.readInt(); p.readString(); readDate(p); } // refinery, weaponName, date
  p.readInt(); // secondWeaponTemplateId
  if (clientKind === "6600") p.readInt(); // pvpBadgeId
  p.readInt(); p.readBoolean(); p.readInt(); p.readString(); // Nimbus, IsShowConsortia, ConsortiaID, ConsortiaName
  p.readInt(); p.readInt(); p.readInt(); p.readInt(); p.readInt(); // badgeID, ConsortiaLevel, ConsortiaRepute, Win, Total
  p.readInt(); p.readInt(); p.readInt(); p.readString(); // FightPower, apprenticeshipState, masterID, masterOrApprentices
  p.readInt(); p.readString(); p.readInt(); p.readBoolean(); p.readInt(); // AchievementPoint, Honor, Offer, DailyLeagueFirst, DailyLeagueLastScore
  const married = p.readBoolean();
  if (married) { p.readInt(); p.readString(); }
  for (let i = 0; i < 6; i++) expect(p.readInt()).toBe(clientKind === "6600" ? 5 : 0); // addition %
  p.readInt(); p.readInt(); p.readInt(); // team, livingId, maxBlood
  const hasPet = p.readInt();
  if (hasPet) {
    p.readInt(); p.readInt(); p.readInt(); p.readString(); p.readInt(); p.readInt(); // place, templateId, id, name, userId, level
    const n = p.readInt();
    for (let i = 0; i < n; i++) { p.readInt(); p.readInt(); }
  }
  if (clientKind === "6600") p.readInt(); // HorseSkillEquip.Length
}

function readGameCreate(p: GSPacket, clientKind: "41" | "6600"): number {
  expect(p.readByte()).toBe(101);
  p.readInt(); p.readInt(); p.readInt(); // roomType, gameType, timeType
  const n = p.readInt();
  for (let i = 0; i < n; i++) readGameCreatePlayer(p, clientKind);
  return n;
}

// ---------------------------------------------------------------------------------------------- 91/103 GAME_LOAD
function readGameLoad(p: GSPacket): void {
  expect(p.readByte()).toBe(103);
  p.readInt(); p.readInt(); // maxTime, mapId
  const files = p.readInt();
  for (let i = 0; i < files; i++) { p.readInt(); p.readString(); p.readString(); }
  const pets = p.readInt();
  for (let i = 0; i < pets; i++) { p.readString(); p.readString(); }
}

describe.each([["41"], ["6600"]] as const)("m2-salas — client %s", (clientKind) => {
  it("94/0 SendRoomCreate (room create ack) parses with no EOF / leftover bytes", async () => {
    const x = await lobby(clientKind);
    const created = await x.c.code(94, 0);
    readRoomCreate(created.pkt, clientKind);
    expectFullyConsumed(created.pkt);
    x.c.close();
  });

  it("94/4 SendRoomPlayerAdd (own player entering the room) parses with no EOF / leftover bytes", async () => {
    const x = await lobby(clientKind);
    const added = await x.c.code(94, 4);
    readRoomPlayerAdd(added.pkt, clientKind);
    expectFullyConsumed(added.pkt);
    x.c.close();
  });

  it("91/101 GAME_CREATE then 91/103 GAME_LOAD (PvP vs bot fallback) reach the battle loading screen with no EOF", async () => {
    const x = await lobby(clientKind);
    roomCmd(x.c, 7); // GAME_START
    for (let i = 0; i < 500 && !x.c.received.some((r) => r.code === 91 && r.sub === 103); i++) {
      engine.tick((clock += 40));
      await new Promise((r) => setTimeout(r, 2));
    }
    const create = await x.c.code(91, 101);
    const n = readGameCreate(create.pkt, clientKind);
    expect(n).toBe(2); // the player + the fallback bot
    expectFullyConsumed(create.pkt);
    const load = await x.c.code(91, 103);
    readGameLoad(load.pkt);
    expectFullyConsumed(load.pkt);
    x.c.close();
  }, 20000);
});

// ------------------------------------------------------------------------------------ mixed-clientKind broadcast
describe("m2-salas — mixed room (4.1 host + 6600 guest) GAME_CREATE", () => {
  it("each receiver gets its own clientKind layout from the same match, no EOF for either", async () => {
    const a = await lobby("41", 1); // Freedom room (2 human players, no bot fallback needed)
    const b = await loggedIn(server, { client: "6600", grade: 20 });
    b.c.out(16);
    await b.c.code(94, 9);
    // entrar-sala.ts Login.cs: bool isInvite, int hall, int isRnd ("sel" — -1 means "explicit roomId follows").
    roomCmd(b.c, 1, (p) => { p.writeBoolean(false); p.writeInt(1); p.writeInt(-1); p.writeInt(a.player().currentRoom!.RoomId); p.writeUTF(""); });
    await b.c.code(94, 0);
    roomCmd(b.c, 15, (p) => p.writeByte(1)); // GAME_PLAYER_STATE_CHANGE: guest readies up (host is auto-ready)
    await b.c.code(94, 15);
    roomCmd(a.c, 7); // GAME_START (host only — SwitchTeamAction/StartGameAction both gate on room.host === p)
    for (let i = 0; i < 500 && !(a.c.received.some((r) => r.code === 91 && r.sub === 103) && b.c.received.some((r) => r.code === 91 && r.sub === 103)); i++) {
      engine.tick((clock += 40));
      await new Promise((r) => setTimeout(r, 2));
    }
    const createA = await a.c.code(91, 101);
    readGameCreate(createA.pkt, "41");
    expectFullyConsumed(createA.pkt);
    const createB = await b.c.code(91, 101);
    readGameCreate(createB.pkt, "6600");
    expectFullyConsumed(createB.pkt);
    a.c.close();
    b.c.close();
  }, 20000);
});
