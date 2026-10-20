/**
 * Task 41-instancias: dungeon unlock (level + previous-difficulty clear) and the NPC balance multiplier
 * layer. See docs/features/instancias.md.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { app, seedDatabase } from "@ddt/db";
import type { GameServer } from "../src/server.js";
import { RoomType } from "../src/rooms/room.js";
import { recordPveClear, loadClearedDifficulties } from "../src/db/pve-progress.js";
import { dungeonDifficultyLadder, isDungeonUnlocked, type PveInfoLike } from "../src/game/pve-unlock.js";
import { scalePveNpc, scalePveDrop } from "../src/fight/ddt.js";
import { FakeClient, loggedIn, startServer } from "./helpers.js";
import type { NpcInfo } from "@ddt/fight";

describe("pve-unlock (pure logic)", () => {
  const info: PveInfoLike = { ID: 1, LevelLimits: 10, SimpleTemplateIds: "1,2", NormalTemplateIds: "3,4", HardTemplateIds: "", TerrorTemplateIds: "5" };

  it("dungeonDifficultyLadder skips empty/blank TemplateIds fields (Hard has none here)", () => {
    expect(dungeonDifficultyLadder(info)).toEqual([0, 1, 3]); // Simple, Normal, Terror -- Hard (2) has no data
  });

  it("the -100 'closed' sentinel (game.Pve_Info ID 12) does not count as having data", () => {
    expect(dungeonDifficultyLadder({ ID: 2, LevelLimits: 0, SimpleTemplateIds: "-100" })).toEqual([]);
  });

  it("first (lowest) difficulty never needs a previous clear, but does need the level", () => {
    expect(isDungeonUnlocked(info, 0, 10, new Set())).toEqual({ unlocked: true });
    expect(isDungeonUnlocked(info, 0, 9, new Set())).toEqual({ unlocked: false, reason: "level" });
  });

  it("a later difficulty needs the PREVIOUS one in the ladder cleared, not difficulty-1 literally", () => {
    // ladder is [0,1,3] -- Terror(3)'s previous is Normal(1), not Hard(2) which this dungeon never had.
    expect(isDungeonUnlocked(info, 3, 10, new Set([0]))).toEqual({ unlocked: false, reason: "clear", requiresClearOf: 1 });
    expect(isDungeonUnlocked(info, 3, 10, new Set([0, 1]))).toEqual({ unlocked: true });
  });

  it("a hardLevel the dungeon has no data for is never unlocked (defensive)", () => {
    expect(isDungeonUnlocked(info, 2, 999, new Set([0, 1, 3]))).toEqual({ unlocked: false, reason: "level" });
  });

  it("allOpen bypasses both gates; requireClear:false bypasses only the clear gate", () => {
    expect(isDungeonUnlocked(info, 3, 0, new Set(), { allOpen: true })).toEqual({ unlocked: true });
    expect(isDungeonUnlocked(info, 3, 10, new Set(), { requireClear: false })).toEqual({ unlocked: true });
  });
});

describe("fight/ddt.ts scalePveNpc/scalePveDrop (app.PveBalance multipliers)", () => {
  const npc: NpcInfo = { ID: 1, Name: "x", Level: 1, Camp: 1, Type: 0, X: 0, Y: 0, Width: 1, Height: 1, Blood: 1000, MoveMin: 0, MoveMax: 0, BaseDamage: 100, BaseGuard: 50, Defence: 20, Agility: 0, Lucky: 0, Attack: 10, ModelID: "", ResourcesPath: "", Experience: 30, Delay: 0, Immunity: 0, FireX: 0, FireY: 0, DropId: 0, CurrentBallId: 0, Script: "" };

  it("the neutral 1.0/1.0/1.0/1.0 balance (no app.PveBalance row) returns the exact same object (no allocation)", () => {
    expect(scalePveNpc(npc, { hp: 1, damage: 1, defence: 1, reward: 1 })).toBe(npc);
  });

  it("scales HP/damage/defence/reward independently, rounding and never zeroing HP out", () => {
    const s = scalePveNpc(npc, { hp: 2, damage: 1.5, defence: 0.5, reward: 3 });
    expect(s.Blood).toBe(2000);
    expect(s.BaseDamage).toBe(150);
    expect(s.Attack).toBe(15);
    expect(s.BaseGuard).toBe(25);
    expect(s.Defence).toBe(10);
    expect(s.Experience).toBe(90);
    expect(scalePveNpc({ ...npc, Blood: 1 }, { hp: 0.001, damage: 1, defence: 1, reward: 1 }).Blood).toBe(1); // floor, never 0
  });

  it("scalePveDrop scales item counts (min 1) and leaves null/mult-1 untouched", () => {
    expect(scalePveDrop(null, 2)).toBeNull();
    const items = [{ templateId: 100, count: 10 }, { templateId: -100, count: 1 }];
    expect(scalePveDrop(items, 1)).toBe(items); // no-op fast path
    expect(scalePveDrop(items, 2.5)).toEqual([{ templateId: 100, count: 25 }, { templateId: -100, count: 3 }]); // min 1
  });
});

describe("db/pve-progress (app.PveInstanceClear)", () => {
  it("recordPveClear upserts and increments ClearCount; loadClearedDifficulties returns the set", async () => {
    const server = await startServer();
    const userId = 900001;
    expect(await loadClearedDifficulties(server.ctx, userId, 77)).toEqual(new Set());
    await recordPveClear(server.ctx, userId, 77, 0);
    expect(await loadClearedDifficulties(server.ctx, userId, 77)).toEqual(new Set([0]));
    await recordPveClear(server.ctx, userId, 77, 0);
    await recordPveClear(server.ctx, userId, 77, 1);
    expect(await loadClearedDifficulties(server.ctx, userId, 77)).toEqual(new Set([0, 1]));
    const [row] = await server.ctx.db.db.select().from(app.PveInstanceClear)
      .where(sql`${app.PveInstanceClear.UserID} = ${userId} AND ${app.PveInstanceClear.PveId} = 77 AND ${app.PveInstanceClear.HardLevel} = 0`);
    expect(row!.ClearCount).toBe(2);
    await server.stop();
  });
});

// ------------------------------------------------------------------------------------- integration (room flow)

const roomCmd = (c: FakeClient, sub: number, fill: (p: import("@ddt/protocol").PacketOut) => void = () => {}) =>
  c.out(94, (p) => { p.writeInt(sub); fill(p); });

// game."Pve_Info" ID 2 "Huyệt Ma Kiến" (Ant Cave), a real 4.1 dungeon: Type=4 (RoomType.Dungeon), LevelLimits=8,
// Simple(0) + Normal(1) both populated with real scripts (AntCaveSimpleGame/AntCaveNormalGame) -- already
// exercised end-to-end by packages/fight/test/pve.test.ts ("dungeon Ant Cave easy"), so using it here means
// the positive path (a dungeon actually starting fighting) is never in doubt -- only the gate is under test.
const DUNGEON_ID = 2;

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
  // apps/game's shared test DB only seeds a performance whitelist (test/helpers.ts SEED_TABLES) that excludes
  // Pve_Info/NPC_Info/Mission_Info -- load the real committed seed rows for this one dungeon so the fight
  // engine behaves exactly like production (packages/fight/test/pve.test.ts already proves dungeon 2 works).
  await seedDatabase(server.ctx.db, { only: ["Pve_Info", "NPC_Info", "Mission_Info"] });
  await server.ctx.templates.load(server.ctx.db.db, server.cfg.SERVER_ID, server.cfg.DEFAULT_LANG);
});
afterAll(async () => {
  await server.stop();
});

describe("41-instancias: server-authoritative dungeon unlock at GAME_START (94/7)", () => {
  it("refuses to start Normal (1) before the player ever cleared Simple (0), even though the client set it up itself", async () => {
    const host = await loggedIn(server, { grade: 20 });
    roomCmd(host.c, 0, (p) => { p.writeByte(RoomType.Dungeon); p.writeByte(2); p.writeUTF("masmorra"); p.writeUTF(""); });
    await host.c.code(94, 0);
    const mark = host.c.mark();
    // GAME_ROOM_SETUP_CHANGE: mapId, roomType, isOpenBoss, password, name, timeMode, hardLevel, levelLimits, isCrosszone
    roomCmd(host.c, 2, (p) => { p.writeInt(DUNGEON_ID); p.writeByte(RoomType.Dungeon); p.writeBoolean(false); p.writeUTF(""); p.writeUTF("masmorra"); p.writeByte(0); p.writeByte(1); p.writeInt(2); p.writeBoolean(false); });
    await host.c.code(94, 2, mark);
    const m2 = host.c.mark();
    roomCmd(host.c, 7); // GAME_START
    const refusal = await host.c.code(3, undefined, m2); // sendMessage(3, ...)
    refusal.pkt.offset = 20;
    refusal.pkt.readInt(); // message type (already filtered by code===3)
    expect(refusal.pkt.readString()).toContain("dificuldade anterior");
    expect(host.c.received.slice(m2).some((r) => r.code === 91)).toBe(false); // the fight engine never started
    host.c.close();
  });

  it("allows Simple (0) with no prior clear, then Normal (1) once Simple is actually cleared", async () => {
    const host = await loggedIn(server, { grade: 20 });
    roomCmd(host.c, 0, (p) => { p.writeByte(RoomType.Dungeon); p.writeByte(2); p.writeUTF("masmorra2"); p.writeUTF(""); });
    await host.c.code(94, 0);
    let mark = host.c.mark();
    roomCmd(host.c, 2, (p) => { p.writeInt(DUNGEON_ID); p.writeByte(RoomType.Dungeon); p.writeBoolean(false); p.writeUTF(""); p.writeUTF("masmorra2"); p.writeByte(0); p.writeByte(0); p.writeInt(2); p.writeBoolean(false); });
    await host.c.code(94, 2, mark);
    mark = host.c.mark();
    roomCmd(host.c, 7);
    await host.c.waitFor((r) => r.code === 91, 4000, mark); // Simple actually starts fighting

    await recordPveClear(server.ctx, host.ch.userId, DUNGEON_ID, 0);

    const guest = await loggedIn(server, { grade: 20 });
    roomCmd(guest.c, 0, (p) => { p.writeByte(RoomType.Dungeon); p.writeByte(2); p.writeUTF("masmorra3"); p.writeUTF(""); });
    await guest.c.code(94, 0);
    mark = guest.c.mark();
    roomCmd(guest.c, 2, (p) => { p.writeInt(DUNGEON_ID); p.writeByte(RoomType.Dungeon); p.writeBoolean(false); p.writeUTF(""); p.writeUTF("masmorra3"); p.writeByte(0); p.writeByte(1); p.writeInt(2); p.writeBoolean(false); });
    await guest.c.code(94, 2, mark);
    await recordPveClear(server.ctx, guest.ch.userId, DUNGEON_ID, 0); // this player's own clear, not the host's
    mark = guest.c.mark();
    roomCmd(guest.c, 7);
    await guest.c.waitFor((r) => r.code === 91, 4000, mark); // Normal actually starts now
    host.c.close(); guest.c.close();
  });

  it("level gate still applies regardless of clears: a level-5 player cannot start even Simple (LevelLimits=8)", async () => {
    const host = await loggedIn(server, { grade: 5 });
    roomCmd(host.c, 0, (p) => { p.writeByte(RoomType.Dungeon); p.writeByte(2); p.writeUTF("masmorra4"); p.writeUTF(""); });
    await host.c.code(94, 0);
    const mark = host.c.mark();
    roomCmd(host.c, 2, (p) => { p.writeInt(DUNGEON_ID); p.writeByte(RoomType.Dungeon); p.writeBoolean(false); p.writeUTF(""); p.writeUTF("masmorra4"); p.writeByte(0); p.writeByte(0); p.writeInt(1); p.writeBoolean(false); });
    await host.c.code(94, 2, mark);
    const m2 = host.c.mark();
    roomCmd(host.c, 7);
    const refusal = await host.c.code(3, undefined, m2);
    refusal.pkt.offset = 20; refusal.pkt.readInt();
    expect(refusal.pkt.readString()).toContain("nível");
    host.c.close();
  });
});
