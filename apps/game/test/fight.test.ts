/** End-to-end battles over the real protocol with the @ddt/fight engine (manual clock so a game takes ms, not minutes). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { solveAim } from "@ddt/fight";
import { GameServer, payTakeCard } from "../src/server.js";
import { testConfig } from "../src/config.js";
import { DdtFightEngine } from "../src/fight/ddt.js";
import { type BotProvider, VirtualPlayer } from "../src/bots/bot.js";
import { type FakeClient, loggedIn, sharedDb, testKey } from "./helpers.js";

let server: GameServer;
let engine: DdtFightEngine;
let clock = Date.now();
let botSeq = 900;
const bots: BotProvider = {
  acquire: (level) => new VirtualPlayer({ id: ++botSeq, nickname: `Bot${botSeq}`, sex: true, level, weaponTemplateId: 7001 }),
  release: () => {},
};

beforeAll(async () => {
  const db = await sharedDb();
  engine = new DdtFightEngine({ manualClock: true, seed: () => 42, payTakeCard: (m) => payTakeCard(m) });
  const cfg = testConfig({ GAME_PORT: "0", WS_PORT: "0", POLICY_PORT: "0", ADMIN_PORT: "0", BIND_HOST: "127.0.0.1", LOG_LEVEL: "silent", PACKET_RATE_BURST: "100000", PACKET_RATE_PER_SEC: "100000" } as never);
  server = await new GameServer(cfg, { db, rsaKey: testKey(), fight: engine, bots }).start();
  (server.ctx.rooms as unknown as { o: { botFallbackSec: number } }).o.botFallbackSec = 0;
});
afterAll(async () => {
  await server?.stop();
});

const roomCmd = (c: FakeClient, sub: number, fill: (p: import("@ddt/protocol").PacketOut) => void = () => {}) =>
  c.out(94, (p) => {
    p.writeInt(sub);
    fill(p);
  });
const gameCmd = (c: FakeClient, sub: number, fill: (p: import("@ddt/protocol").PacketOut) => void = () => {}) =>
  c.out(91, (p) => {
    p.writeByte(sub);
    fill(p);
  });

async function lobby() {
  const x = await loggedIn(server, { grade: 20 });
  x.c.out(16);
  await x.c.code(94, 9);
  roomCmd(x.c, 0, (p) => {
    p.writeByte(0); p.writeByte(2); p.writeUTF("m"); p.writeUTF("");
  });
  await x.c.code(94, 0);
  return x;
}

/** Plays until both clients got GAME_OVER: whoever gets TURN aims with the solver and fires (FIRE_TAG + FIRE). */
async function playToEnd(humans: { c: FakeClient; ch: { userId: number } }[]) {
  for (let i = 0; i < 500 && !humans.every((h) => h.c.received.some((r) => r.code === 91 && r.sub === 103)); i++) {
    engine.tick((clock += 40));
    await new Promise((r) => setTimeout(r, 2));
  }
  for (const h of humans) gameCmd(h.c, 16, (p) => p.writeInt(100));
  const seen = new Set<number>();
  for (let i = 0; i < 20000; i++) {
    clock += 200;
    engine.tick(clock);
    await new Promise((r) => setImmediate(r));
    const g = [...engine.games.values()][0];
    if (!g) break;
    const game = g.game;
    const cur = game.currentLiving;
    const h = humans.find((x) => game.findByUser(x.ch.userId) === cur);
    if (h && cur?.isAttacking && !seen.has(game.turnIndex)) {
      const turn = h.c.received.find((r) => r.code === 91 && r.sub === 6 && r.p1 === cur.id);
      if (!turn) continue;
      seen.add(game.turnIndex);
      const me = game.findByUser(h.ch.userId)!;
      const foe = game.players.find((p) => p.team !== me.team && p.isLiving)!;
      const sol = solveAim({ map: game.map, ball: me.currentBall, from: me, target: { x: foe.x, y: foe.y - 10 }, bodies: [{ id: foe.id, x: foe.x, y: foe.y, team: foe.team, bound: foe.bound }] });
      gameCmd(h.c, 96, (p) => { p.writeBoolean(true); p.writeByte(2); });
      if (sol) gameCmd(h.c, 2, (p) => { p.writeInt(sol.muzzle.x); p.writeInt(sol.muzzle.y); p.writeInt(sol.force); p.writeInt(sol.angle); });
      else gameCmd(h.c, 12, (p) => p.writeByte(1));
    }
    if (humans.every((x) => x.c.received.some((r) => r.code === 91 && r.sub === 100))) break;
  }
  return humans.map((x) => x.c.waitFor((r) => r.code === 91 && r.sub === 100, 1000));
}

describe("@ddt/fight adapter", () => {
  it("1v1 PvP (auto-match) is played to the end with rewards", async () => {
    const a = await lobby();
    const b = await lobby();
    (server.ctx.rooms as unknown as { o: { botFallbackSec: number } }).o.botFallbackSec = 9999;
    const gp0 = [a.player().info.GP, b.player().info.GP];
    roomCmd(a.c, 7);
    await a.c.code(94, 13);
    roomCmd(b.c, 7);
    const overs = await Promise.all(await playToEnd([a, b]));
    const fires = a.c.received.filter((r) => r.code === 91 && r.sub === 2).length;
    expect(fires).toBeGreaterThan(0);
    expect(a.c.received.some((r) => r.code === 91 && r.sub === 99)).toBe(true); // START_GAME
    const over = overs[0]!;
    over.pkt.readByte();
    expect(over.pkt.readInt()).toBe(2);
    const wins: boolean[] = [];
    for (let i = 0; i < 2; i++) {
      over.pkt.readInt();
      wins.push(over.pkt.readBoolean());
      for (let k = 0; k < 26; k++) over.pkt.readInt();
    }
    expect(wins.filter(Boolean).length).toBe(1);
    expect(a.player().info.GP).toBeGreaterThan(gp0[0]!);
    expect(b.player().info.GP).toBeGreaterThan(gp0[1]!);
    expect(a.player().info.Total + b.player().info.Total).toBeGreaterThanOrEqual(2);
    // card window (20 s) then the game stops and rooms are released
    for (let i = 0; i < 200 && engine.games.size; i++) engine.tick((clock += 200));
    expect(engine.games.size).toBe(0);
    expect(a.player().currentRoom?.IsPlaying).toBe(false);
    a.c.close();
    b.c.close();
  }, 60000);

  it("1v1 vs bot (VirtualPlayer) is played to the end", async () => {
    (server.ctx.rooms as unknown as { o: { botFallbackSec: number } }).o.botFallbackSec = 0;
    const a = await lobby();
    const gp0 = a.player().info.GP;
    roomCmd(a.c, 7);
    const overs = await Promise.all(await playToEnd([a]));
    expect(overs.length).toBe(1);
    const fires = a.c.received.filter((r) => r.code === 91 && r.sub === 2);
    expect(new Set(fires.map((f) => f.p1)).size).toBe(2); // both the human and the bot fired
    expect(a.player().info.GP).toBeGreaterThan(gp0);
    // Card board: the client's countdown ends with BOSS_TAKE_CARD(100) -> the server answers TAKE_CARD (98) auto.
    const mark = a.c.mark();
    gameCmd(a.c, 130, (p) => p.writeByte(100));
    const card = await a.c.code(91, 98, mark);
    card.pkt.readByte();
    expect(card.pkt.readBoolean()).toBe(true); // isAuto
    expect(card.pkt.readByte()).toBe(0); // first free card
    a.c.close();
  }, 60000);

  it("GAME_CMD 114 PAYMENT_TAKE_CARD charges Money and grants one extra pick", async () => {
    (server.ctx.rooms as unknown as { o: { botFallbackSec: number } }).o.botFallbackSec = 0;
    const a = await lobby();
    roomCmd(a.c, 7);
    await Promise.all(await playToEnd([a]));
    const money0 = a.player().info.Money; // after the match's own money/GP rewards, before the paid pick
    const mark = a.c.mark();
    gameCmd(a.c, 114, (p) => p.writeByte(1)); // pay to flip card index 1 (non-VIP: 486 Money)
    const paid = await a.c.code(91, 98, mark);
    paid.pkt.readByte();
    expect(paid.pkt.readBoolean()).toBe(false); // isAuto false: a real paid pick, not the countdown fallback
    expect(paid.pkt.readByte()).toBe(1);
    expect(a.player().info.Money).toBe(money0 - 486);
    a.c.close();
  }, 60000);

  it("82 GAME_MISSION_START (GameUserStartHandler): flag gates the call, forwarded to the room's active game.missionStart() with no host check", async () => {
    (server.ctx.rooms as unknown as { o: { botFallbackSec: number } }).o.botFallbackSec = 0;
    const a = await lobby();
    roomCmd(a.c, 7);
    for (let i = 0; i < 50 && !a.player().currentRoom?.game; i++) { engine.tick((clock += 40)); await new Promise((r) => setTimeout(r, 2)); }
    const room = a.player().currentRoom!;
    let called = 0;
    (room.game as unknown as { missionStart: () => void }).missionStart = () => { called++; };
    a.c.out(82, (p) => p.writeBoolean(false));
    await new Promise((r) => setTimeout(r, 5));
    expect(called).toBe(0); // GameUserStartHandler.cs:11 — ReadBoolean() must be true
    a.c.out(82, (p) => p.writeBoolean(true));
    await new Promise((r) => setTimeout(r, 5));
    expect(called).toBe(1);
    a.c.close();
  }, 60000);

  it("GAME_CMD subs confirmed dead in the original (3 BLAST, 10 MOVESTOP, 19 CHANGEBALL, 21 KILLSELF, 22 BEAT, 97 WANNA_LEADER) are accepted without a server reply or crash", async () => {
    (server.ctx.rooms as unknown as { o: { botFallbackSec: number } }).o.botFallbackSec = 0;
    const a = await lobby();
    roomCmd(a.c, 7);
    for (let i = 0; i < 50 && !a.c.received.some((r) => r.code === 91 && r.sub === 99); i++) { engine.tick((clock += 40)); await new Promise((r) => setTimeout(r, 2)); }
    for (const sub of [3, 10, 19, 21, 22, 97]) gameCmd(a.c, sub, (p) => p.writeInt(0));
    engine.tick((clock += 40));
    await new Promise((r) => setTimeout(r, 5));
    expect(a.c.closed).toBe(false); // the connection survives every one of them
    a.c.close();
  }, 60000);
});
