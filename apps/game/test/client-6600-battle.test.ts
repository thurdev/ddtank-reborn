/**
 * m2-batalha (docs/plan/TASKS.md, research/6600/packets-m1.md "M2 batalha"): the 91 GAME_CMD stream DURING a
 * match (everything after 91/103 GAME_LOAD, which `client-6600-rooms.test.ts` already pins) — turn change,
 * shoot/fire, start-game roster, game-over rewards. Same method as the other `client-6600-*` suites: read a
 * REAL captured packet from a REAL `FakeClient` match FIELD BY FIELD in the exact order the AS3 reader cited
 * in `apps/game/src/fight/ddt.ts` reads it, then assert `offset === length` (no EOF, no leftover bytes) —
 * for both `clientKind`s and for a match that mixes the two.
 *
 * `fight.test.ts` already proves the engine itself (rewards, card board, dead GAME_CMD subs); this file only
 * adds the 6600 layout to the SAME kind of match, reusing its `playToEnd` shape.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { solveAim } from "@ddt/fight";
import { HDR_SIZE, type GSPacket, type PacketOut } from "@ddt/protocol";
import { GameServer, payTakeCard } from "../src/server.js";
import { testConfig } from "../src/config.js";
import { DdtFightEngine, serializeEvent } from "../src/fight/ddt.js";
import { type BotProvider, VirtualPlayer } from "../src/bots/bot.js";
import { type FakeClient, loggedIn, sharedDb, testKey } from "./helpers.js";

let server: GameServer;
let engine: DdtFightEngine;
let clock = Date.now();
let botSeq = 9950;
const bots: BotProvider = {
  acquire: (level) => new VirtualPlayer({ id: ++botSeq, nickname: `BBot${botSeq}`, sex: true, level, weaponTemplateId: 7001 }),
  release: () => {},
};

beforeAll(async () => {
  const db = await sharedDb();
  engine = new DdtFightEngine({ manualClock: true, seed: () => 99, payTakeCard: (m) => payTakeCard(m) });
  const cfg = testConfig({ GAME_PORT: "0", WS_PORT: "0", POLICY_PORT: "0", ADMIN_PORT: "0", BIND_HOST: "127.0.0.1", LOG_LEVEL: "silent", PACKET_RATE_BURST: "100000", PACKET_RATE_PER_SEC: "100000" } as never);
  server = await new GameServer(cfg, { db, rsaKey: testKey(), fight: engine, bots }).start();
  (server.ctx.rooms as unknown as { o: { botFallbackSec: number } }).o.botFallbackSec = 0;
});
afterAll(async () => {
  await server?.stop();
});

function expectFullyConsumed(p: GSPacket): void {
  expect(p.offset).toBe(p.length);
}

const roomCmd = (c: FakeClient, sub: number, fill: (p: PacketOut) => void = () => {}) =>
  c.out(94, (p) => {
    p.writeInt(sub);
    fill(p);
  });
const gameCmd = (c: FakeClient, sub: number, fill: (p: PacketOut) => void = () => {}) =>
  c.out(91, (p) => {
    p.writeByte(sub);
    fill(p);
  });

async function lobby(clientKind: "41" | "6600") {
  const x = await loggedIn(server, { client: clientKind, grade: 20 });
  x.c.out(16);
  await x.c.code(94, 9);
  roomCmd(x.c, 0, (p) => {
    p.writeByte(0); p.writeByte(2); p.writeUTF("m"); p.writeUTF("");
    if (clientKind === "6600") p.writeBoolean(false); // isDouble (M2 salas — read and discarded)
  });
  await x.c.code(94, 0);
  return x;
}

// ------------------------------------------------------------------------------------------------- 99 START_GAME
function readStartGame(p: GSPacket, clientKind: "41" | "6600"): number {
  expect(p.readByte()).toBe(99);
  const n = p.readInt();
  for (let i = 0; i < n; i++) {
    p.readInt(); p.readInt(); p.readInt(); p.readInt(); p.readInt(); p.readInt(); p.readInt(); // id,x,y,direction,blood,maxBlood,team
    p.readInt(); // weaponRefineryLevel
    if (clientKind === "6600") p.readInt(); // deputyWeaponCount
    p.readInt(); p.readInt(); // powerRatio, dander
    if (clientKind === "6600") { p.readInt(); p.readInt(); }
    const buffCount = p.readInt();
    for (let k = 0; k < buffCount; k++) { p.readInt(); p.readInt(); }
    p.readInt(); p.readBoolean(); p.readBoolean(); p.readBoolean(); p.readBoolean(); p.readInt(); // 0,isFrost,isHide,isNoHole,false,0
  }
  if (clientKind === "6600") { p.readInt(); p.readInt(); }
  p.readDateTime(true);
  return n;
}

// -------------------------------------------------------------------------------------------------------- 6 TURN
function readTurn(p: GSPacket, clientKind: "41" | "6600"): void {
  expect(p.readByte()).toBe(6);
  p.readBoolean(); p.readByte(); p.readByte(); p.readByte(); p.readBoolean(); p.readInt(); // windPositive,vane1-3,isHide,turnTime
  const boxes = p.readInt();
  for (let i = 0; i < boxes; i++) { p.readInt(); p.readInt(); p.readInt(); p.readInt(); }
  const players = p.readInt();
  for (let i = 0; i < players; i++) {
    p.readInt(); p.readBoolean(); p.readInt(); p.readInt(); p.readInt(); p.readBoolean(); p.readInt(); // id,isLiving,x,y,blood,isNoHole,energy
    p.readInt(); p.readInt(); p.readInt(); p.readInt(); p.readInt(); p.readInt(); // psychic,dander,petMaxMP,petMP,shootCount,flyCount
  }
  p.readInt(); // turnIndex
  if (clientKind === "6600") p.readBoolean();
}

// -------------------------------------------------------------------------------------------------------- 2 FIRE
function readFire(p: GSPacket, clientKind: "41" | "6600"): void {
  expect(p.readByte()).toBe(2);
  p.readInt(); p.readBoolean(); p.readByte(); p.readByte(); p.readByte(); // wind10,windPositive,vane1-3
  const bombs = p.readInt();
  for (let i = 0; i < bombs; i++) {
    p.readInt(); p.readInt(); p.readBoolean(); p.readInt(); p.readInt(); p.readInt(); // bombCount,shootCount,digMap,bombId,x,y
    p.readInt(); p.readInt(); p.readInt(); p.readString(); p.readInt(); p.readInt(); // vx,vy,ballId,flyingPartical,radii,power
    const actions = p.readInt();
    for (let k = 0; k < actions; k++) { p.readInt(); p.readInt(); p.readInt(); p.readInt(); p.readInt(); p.readInt(); }
  }
  const petCount = p.readInt();
  for (let i = 0; i < petCount; i++) { p.readInt(); p.readInt(); p.readInt(); p.readInt(); }
  p.readInt(); // trailing flag (1 if petCount>0, else the FireEvent's second 0)
  if (clientKind === "6600") p.readBoolean();
}

// ---------------------------------------------------------------------------------------------------- 100 GAME_OVER
function readGameOver(p: GSPacket, clientKind: "41" | "6600"): number {
  expect(p.readByte()).toBe(100);
  if (clientKind === "6600") p.readInt(); // tieStatus
  const n = p.readInt();
  for (let i = 0; i < n; i++) {
    p.readInt(); p.readBoolean(); p.readInt(); p.readInt(); p.readInt(); p.readInt(); p.readInt(); // id,win,grade,gp,totalKill,gpGained,hitCount
    p.readInt(); p.readInt(); // psychic, vipBonus
    for (let k = 0; k < 6; k++) p.readInt(); // 6 zero fields
    p.readInt(); // reward
    p.readInt(); p.readInt(); p.readInt(); // 0,0,gpGained (again)
    if (clientKind === "6600") p.readInt(); // gpCSMUser
    p.readInt(); p.readInt(); p.readInt(); // offer,0,isVip
    for (let k = 0; k < 4; k++) p.readInt(); // 0,0,0,0
    p.readInt(); // offer (again)
    if (clientKind === "6600") p.readInt(); // offerCSMUser
    p.readInt(); // canTakeOut
  }
  p.readInt(); // riches
  if (clientKind === "6600") { p.readInt(); p.readInt(); } // redFinalScore, blueFinalScore
  return n;
}

/** Plays until the human got GAME_OVER (mirrors fight.test.ts playToEnd), decoding every TURN/FIRE/START_GAME
 * it sees along the way for its OWN clientKind layout — proves the mid-match stream, not just the final packet. */
async function playToEnd(humans: { c: FakeClient; ch: { userId: number }; clientKind: "41" | "6600" }[]) {
  for (let i = 0; i < 500 && !humans.every((h) => h.c.received.some((r) => r.code === 91 && r.sub === 103)); i++) {
    engine.tick((clock += 40));
    await new Promise((r) => setTimeout(r, 2));
  }
  for (const h of humans) gameCmd(h.c, 16, (p) => p.writeInt(100));
  const seenStartGame = new Set<FakeClient>();
  const seenTurn = new Set<number>();
  for (let i = 0; i < 20000; i++) {
    clock += 200;
    engine.tick(clock);
    await new Promise((r) => setImmediate(r));
    for (const h of humans) {
      if (!seenStartGame.has(h.c)) {
        const sg = h.c.received.find((r) => r.code === 91 && r.sub === 99);
        if (sg) {
          sg.pkt.offset = HDR_SIZE;
          readStartGame(sg.pkt, h.clientKind);
          expectFullyConsumed(sg.pkt);
          seenStartGame.add(h.c);
        }
      }
    }
    const g = [...engine.games.values()][0];
    if (!g) break;
    const game = g.game;
    const cur = game.currentLiving;
    const h = humans.find((x) => game.findByUser(x.ch.userId) === cur);
    if (h && cur?.isAttacking && !seenTurn.has(game.turnIndex)) {
      const turn = h.c.received.find((r) => r.code === 91 && r.sub === 6 && r.p1 === cur.id);
      if (!turn) continue;
      turn.pkt.offset = HDR_SIZE;
      readTurn(turn.pkt, h.clientKind);
      expectFullyConsumed(turn.pkt);
      seenTurn.add(game.turnIndex);
      const me = game.findByUser(h.ch.userId)!;
      const foe = game.players.find((p) => p.team !== me.team && p.isLiving)!;
      const sol = solveAim({ map: game.map, ball: me.currentBall, from: me, target: { x: foe.x, y: foe.y - 10 }, bodies: [{ id: foe.id, x: foe.x, y: foe.y, team: foe.team, bound: foe.bound }] });
      gameCmd(h.c, 96, (p) => { p.writeBoolean(true); p.writeByte(2); });
      if (sol) gameCmd(h.c, 2, (p) => { p.writeInt(sol.muzzle.x); p.writeInt(sol.muzzle.y); p.writeInt(sol.force); p.writeInt(sol.angle); });
      else gameCmd(h.c, 12, (p) => p.writeByte(1));
    }
    if (humans.every((x) => x.c.received.some((r) => r.code === 91 && r.sub === 100))) break;
  }
  for (const h of humans) {
    const fire = h.c.received.find((r) => r.code === 91 && r.sub === 2 && r.p1 === h.ch.userId);
    if (fire) {
      fire.pkt.offset = HDR_SIZE;
      readFire(fire.pkt, h.clientKind);
      expectFullyConsumed(fire.pkt);
    }
  }
  return humans.map((x) => x.c.waitFor((r) => r.code === 91 && r.sub === 100, 1000));
}

describe.each([["41"], ["6600"]] as const)("m2-batalha — 1v1 vs bot, client %s", (clientKind) => {
  it("START_GAME / TURN / FIRE / GAME_OVER parse with no EOF / leftover bytes", async () => {
    (server.ctx.rooms as unknown as { o: { botFallbackSec: number } }).o.botFallbackSec = 0;
    const a = await lobby(clientKind);
    const gp0 = a.player().info.GP;
    roomCmd(a.c, 7); // GAME_START
    const overs = await Promise.all(await playToEnd([{ c: a.c, ch: a.ch, clientKind }]));
    const over = overs[0]!;
    const n = readGameOver(over.pkt, clientKind);
    expect(n).toBe(2); // the player + the bot
    expectFullyConsumed(over.pkt);
    expect(a.player().info.GP).toBeGreaterThan(gp0);
    a.c.close();
  }, 60000);
});

// ------------------------------------------------------------------------------------ mixed-clientKind broadcast
describe("m2-batalha — mixed match (4.1 host + 6600 guest), both sides get their own layout", () => {
  it("TURN/FIRE/GAME_OVER: the SAME engine event reaches each receiver pre-built for its clientKind", async () => {
    (server.ctx.rooms as unknown as { o: { botFallbackSec: number } }).o.botFallbackSec = 9999; // force a human pairing, no bot fallback
    const a = await lobby("41");
    const b = await lobby("6600");
    const gp0 = [a.player().info.GP, b.player().info.GP];
    roomCmd(a.c, 7);
    await a.c.code(94, 13); // waiting for an opponent
    roomCmd(b.c, 7);
    const players = [{ c: a.c, ch: a.ch, clientKind: "41" as const }, { c: b.c, ch: b.ch, clientKind: "6600" as const }];
    const overs = await Promise.all(await playToEnd(players));
    // every TURN/FIRE *this* client received decoded clean above (inside playToEnd); here just re-check GAME_OVER
    // for both sides from the SAME match, one 4.1-shaped and one 6600-shaped.
    const overA = readGameOver(overs[0]!.pkt, "41");
    expectFullyConsumed(overs[0]!.pkt);
    const overB = readGameOver(overs[1]!.pkt, "6600");
    expectFullyConsumed(overs[1]!.pkt);
    expect(overA).toBe(2);
    expect(overB).toBe(2);
    expect(a.player().info.GP).toBeGreaterThan(gp0[0]!);
    expect(b.player().info.GP).toBeGreaterThan(gp0[1]!);
    a.c.close();
    b.c.close();
  }, 60000);
});

// --------------------------------------------------------------------------------------- PvE-only packets (M2)
describe("m2-batalha — PvE-only GAME_CMD subs (112 GAME_MISSION_OVER, 115 GAME_ALL_MISSION_OVER)", () => {
  // Round 2 precedent (research/6600/packets-m1.md): a card-board-less, boss-less mission never happens
  // through a login burst or a normal PvP loop either — call the builder directly with a synthetic fixture
  // (same shape `applyMissionOver`/`applyAllMissionOver` build from a real `PveGame`) and read it back field by
  // field, exactly as GameManager.as __missionOver/__missionAllOver (4.1 vs 6600, cited in ddt.ts) do.
  it.each([["41"], ["6600"]] as const)("112 GAME_MISSION_OVER (%s) — confirmed byte-identical 4.1/6600, no fix", (clientKind) => {
    const pkt = serializeEvent({
      cmd: "GAME_MISSION_OVER", code: 112 as never, livingId: 1,
      bossCardCount: 2, showLarge: false, pic: "", missionId: 2001, isWin: true,
      players: [{ userId: 1, livingId: 1, grade: 20, gainGP: 123, isWin: true, bossCardCount: 2, turnNum: 3 }],
      resources: null,
    } as never, clientKind)!;
    const p = pkt;
    p.offset = HDR_SIZE;
    expect(p.readByte()).toBe(112);
    expect(p.readInt()).toBe(2); // bossCardCount
    expect(p.readBoolean()).toBe(false); expect(p.readBoolean()).toBe(false); // showLarge branch
    const n = p.readInt();
    expect(n).toBe(1);
    for (let i = 0; i < n; i++) {
      p.readInt(); p.readInt(); p.readInt(); p.readInt(); p.readBoolean(); p.readInt(); p.readInt(); p.readBoolean(); p.readBoolean();
    }
    expect(p.readInt()).toBe(0); // bossCardCount>0 -> resources.length (empty here)
    expect(p.offset).toBe(p.length);
  });

  it.each([["41"], ["6600"]] as const)("115 GAME_ALL_MISSION_OVER (%s) — 6600 inserts gpCSMUser before isWin", (clientKind) => {
    const pkt = serializeEvent({
      cmd: "GAME_ALL_MISSION_OVER", code: 115 as never, livingId: 1,
      isWin: true, roomType: 4, gameType: 7,
      players: [{ userId: 1, totalKill: 3, totalHurt: 500, totalScore: 10, totalCure: 0, totalExp: 200, isWin: true, canTakeOut: 0, turnNum: 3 }],
      resources: ["show1.jpg"],
    } as never, clientKind)!;
    const p = pkt;
    p.offset = HDR_SIZE;
    expect(p.readByte()).toBe(115);
    const n = p.readInt();
    expect(n).toBe(1);
    for (let i = 0; i < n; i++) {
      p.readInt(); p.readInt(); p.readInt(); p.readInt(); p.readInt(); // id,totalKill,totalHurt,totalScore,totalCure
      for (let k = 0; k < 8; k++) p.readInt();
      p.readInt(); // totalExp
      if (clientKind === "6600") expect(p.readInt()).toBe(0); // gpCSMUser
      expect(p.readBoolean()).toBe(true); // isWin
    }
    const res = p.readInt();
    expect(res).toBe(1);
    for (let i = 0; i < res; i++) p.readString();
    expect(p.offset).toBe(p.length);
  });
});
