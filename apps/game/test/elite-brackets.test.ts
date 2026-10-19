/**
 * m3-elite-brackets (docs/plan/TASKS.md): `162 ELITEGAME` real matchmaking/bracket engine.
 * Same method as `ringstation.test.ts`/`consortia-battle.test.ts`: send the exact packet the AS3 client sends
 * through the real handler via `FakeClient` (confirms a real `94/0` roomCreate happened), and exercise the
 * round-resolution functions (`eliteChampionGameOver`/`eliteChampionFlee`) directly — they're the SAME
 * functions `server.ts`'s `onGameOver`/`onPlayerFlee` hooks call, so this covers the wiring without
 * reconstructing the whole combat-simulation harness (`fight.test.ts`).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { player } from "@ddt/db";
import type { GameServer } from "../src/server.js";
import type { ServerContext } from "../src/session/context.js";
import type { ActiveWindow } from "../src/game/scheduler.js";
import type { GamePlayer } from "../src/game/player.js";
import { RoomType } from "../src/rooms/room.js";
import { eventsRuntime } from "../src/handlers/eventos/agendador.js";
import {
  eliteChampionFlee, eliteChampionGameOver, eliteScoreOpenFor, finishEliteChampion, startEliteChampion, updateEliteScore,
} from "../src/handlers/eventos/liga-elite.js";
import { createCharacter, FakeClient, loggedIn, sharedDb, startServer } from "./helpers.js";

let server: GameServer;
let ctx: ServerContext;
beforeAll(async () => { server = await startServer(); ctx = (server as unknown as { ctx: ServerContext }).ctx; });
afterAll(async () => { await server.stop(); });

async function setElite(userId: number, grade: number, eliteScore: number): Promise<void> {
  const h = await sharedDb();
  await h.db.update(player.Sys_Users_Detail).set({ Grade: grade, EliteScore: eliteScore }).where(eq(player.Sys_Users_Detail.UserID, userId));
}

/** `startEliteChampion` seeds from EVERY grade-30..50 row with EliteScore>0 — isolates each test's own bracket
 *  from leftovers an earlier test in this file (shared PGlite DB) left behind. */
async function clearAllEliteScores(): Promise<void> {
  const h = await sharedDb();
  await h.db.execute(sql`UPDATE player."Sys_Users_Detail" SET "EliteScore" = 0 WHERE "Grade" BETWEEN 30 AND 50`);
}

/** Logs the test harness in as an already-created character row (same account `createCharacter` made). */
async function loginAs(ch: { user: string; pass: string }) {
  const c = FakeClient.memory(server);
  c.login(ch.user, ch.pass);
  await c.code(95);
  return c;
}

/**
 * The real disconnect handler (`server.ts`: `void c.idle().then(() => quitPlayer(...))`) saves the player
 * (incl. `EliteScore`) to the DB on its OWN schedule, detached from the socket close event — `waitClosed()`
 * only confirms the transport closed, not that the quit/save finished. Poll `ctx.world` (removed only after
 * `doQuit`'s `saveIntoDatabase` settles, `session/login.ts`) so the NEXT test's `clearAllEliteScores()` can't
 * race a delayed save that would resurrect a stale score.
 */
async function waitQuit(userId: number, timeoutMs = 2000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (ctx.world.get(userId)) {
    if (Date.now() > deadline) throw new Error(`waitQuit timeout for ${userId}`);
    await new Promise((r) => setTimeout(r, 10));
  }
}

function fakeWindow(params: Record<string, unknown> = {}): ActiveWindow {
  const now = new Date();
  return {
    ev: { id: 999, kind: "elite_champion", title: "", enabled: true, weekdays: "", startTime: "00:00", durationMin: 30, startDate: null, endDate: null, params },
    start: now,
    end: new Date(now.getTime() + 30 * 60_000),
    key: `test:${now.toISOString()}:${Math.random()}`,
  };
}

describe("162 ELITEGAME — score phase (real PvP room, roomType 12)", () => {
  it("updateEliteScore: win adds, lose subtracts with a floor of 0", () => {
    const p = { info: { EliteScore: 5 } } as unknown as GamePlayer;
    updateEliteScore(p, true);
    expect(p.info.EliteScore).toBe(20);
    updateEliteScore(p, false);
    expect(p.info.EliteScore).toBe(10);
    updateEliteScore(p, false);
    updateEliteScore(p, false);
    expect(p.info.EliteScore).toBe(0); // never goes negative
  });

  it("eliteScoreOpenFor: grade buckets 30-40/41-50 gate independently by bit 1/4", () => {
    const rt = eventsRuntime(ctx);
    rt.eliteStatus = 1; // only group 1 (30-40) open
    expect(eliteScoreOpenFor(rt, 35)).toBe(true);
    expect(eliteScoreOpenFor(rt, 45)).toBe(false);
    expect(eliteScoreOpenFor(rt, 20)).toBe(false); // below the age-group floor entirely
    rt.eliteStatus = 0;
  });

  it("94 GAME_ROOM create roomType=12 is refused when the score window is closed for that grade bucket", async () => {
    eventsRuntime(ctx).eliteStatus = 0;
    const { c } = await loggedIn(server, { grade: 35 });
    const m = c.mark();
    c.out(94, (p) => { p.writeInt(0 /* GAME_ROOM_CREATE */); p.writeByte(12 /* RoomType.EliteGameScore */); p.writeByte(2); p.writeUTF("elite-room"); p.writeUTF(""); });
    await new Promise((r) => setTimeout(r, 80));
    expect(c.received.slice(m).some((r) => r.code === 94 && r.sub === 0)).toBe(false); // no roomCreate
    c.close();
  });

  it("94 GAME_ROOM create roomType=12 succeeds when the window is open for the player's grade bucket", async () => {
    const rt = eventsRuntime(ctx);
    rt.eliteStatus = 1; // group 1 (30-40) open
    const { c } = await loggedIn(server, { grade: 35 });
    c.out(94, (p) => { p.writeInt(0 /* GAME_ROOM_CREATE */); p.writeByte(12 /* RoomType.EliteGameScore */); p.writeByte(2); p.writeUTF("elite-room"); p.writeUTF(""); });
    await c.code(94, 0); // real roomCreate
    const room = server.ctx.rooms.rooms.find((r) => r.RoomType === RoomType.EliteGameScore && r.IsUsing);
    expect(room).toBeDefined();
    rt.eliteStatus = 0;
    c.close();
  });
});

describe("162 ELITEGAME — champion phase (real single-elimination bracket, roomType 13)", () => {
  it("startEliteChampion: seeds a bracket per grade group from Sys_Users_Detail.EliteScore, ignores players outside 30-50 or with 0 score", async () => {
    const h = await sharedDb();
    await clearAllEliteScores();
    const a = await createCharacter(h, { grade: 35 }); await setElite(a.userId, 35, 300);
    const b = await createCharacter(h, { grade: 36 }); await setElite(b.userId, 36, 100);
    const outOfRange = await createCharacter(h, { grade: 20 }); await setElite(outOfRange.userId, 20, 999999);
    const zeroScore = await createCharacter(h, { grade: 37 }); // EliteScore stays 0 (default) -> excluded

    const rt = eventsRuntime(ctx);
    await startEliteChampion(ctx, rt);
    const group1 = rt.elite.groups.get(1);
    expect(group1).toBeDefined();
    const ids = group1!.seeds.map((s) => s.userId);
    expect(ids).toContain(a.userId);
    expect(ids).toContain(b.userId);
    expect(ids).not.toContain(outOfRange.userId);
    expect(ids).not.toContain(zeroScore.userId);
    expect(rt.eliteStatus & 2).toBe(2); // champion bit for group 1 is on
    await finishEliteChampion(ctx, rt, fakeWindow());
  });

  it("162/2: offline opponent is ruled a walkover — the present player advances without a fight", async () => {
    const h = await sharedDb();
    await clearAllEliteScores();
    const online = await createCharacter(h, { grade: 35 }); await setElite(online.userId, 35, 500);
    const offline = await createCharacter(h, { grade: 35 }); await setElite(offline.userId, 35, 10);
    const rt = eventsRuntime(ctx);
    await startEliteChampion(ctx, rt);
    const group = rt.elite.groups.get(1)!;
    expect(group.seeds).toHaveLength(2);

    const c = await loginAs(online);
    c.out(162, (p) => { p.writeByte(2); });
    const r = await c.code(162, 2);
    expect(r.pkt.readByte()).toBe(2); // sub echo (ack before resolving the walkover)
    expect(group.champion).toBe(online.userId); // 2-player bracket: one walkover crowns the champion immediately
    c.close();
    await waitQuit(online.userId);
    await finishEliteChampion(ctx, rt, fakeWindow());
  });

  it("162/2: both sides online launches a real room (94/0) and the round only resolves on a real fight result", async () => {
    const h = await sharedDb();
    await clearAllEliteScores();
    const a = await createCharacter(h, { grade: 35 }); await setElite(a.userId, 35, 500);
    const b = await createCharacter(h, { grade: 35 }); await setElite(b.userId, 35, 400);
    const rt = eventsRuntime(ctx);
    await startEliteChampion(ctx, rt);
    const group = rt.elite.groups.get(1)!;

    const ca = await loginAs(a);
    const cb = await loginAs(b);
    ca.out(162, (p) => { p.writeByte(2); });
    await ca.code(162, 2);
    await ca.code(94, 0); // real roomCreate for the seat that triggered it
    await cb.code(94, 0); // the opponent is pulled in directly too (no lobby/ready step, same as createConsortiaBattleRoom)
    const room = server.ctx.rooms.rooms.find((r) => r.RoomType === RoomType.EliteGameChampion && r.IsUsing);
    expect(room).toBeDefined();
    expect(room!.PlayerCount).toBe(2);
    expect(group.champion).toBeNull(); // not resolved yet — only a real fight result does that

    // resolve it directly (same function server.ts's onGameOver hook calls — see fight.test.ts for the full combat harness)
    eliteChampionGameOver(ctx, { players: [{ member: server.ctx.world.get(a.userId)!, win: true }, { member: server.ctx.world.get(b.userId)!, win: false }] });
    expect(group.champion).toBe(a.userId);

    ca.close(); cb.close();
    await Promise.all([waitQuit(a.userId), waitQuit(b.userId)]);
    await finishEliteChampion(ctx, rt, fakeWindow());
  });

  it("eliteChampionFlee: fleeing a champion-bracket fight counts as a loss for the fleeing side", async () => {
    const h = await sharedDb();
    await clearAllEliteScores();
    const a = await createCharacter(h, { grade: 35 }); await setElite(a.userId, 35, 500);
    const b = await createCharacter(h, { grade: 35 }); await setElite(b.userId, 35, 400);
    const rt = eventsRuntime(ctx);
    await startEliteChampion(ctx, rt);
    const group = rt.elite.groups.get(1)!;
    group.matches[0]!.inProgress = true; // as if createEliteChampionRoom already launched the real fight

    const ca = await loginAs(a);
    eliteChampionFlee(ctx, server.ctx.world.get(a.userId)!);
    expect(group.champion).toBe(b.userId); // a fled -> b wins the only match in a 2-player bracket
    ca.close();
    await waitQuit(a.userId);
    await finishEliteChampion(ctx, rt, fakeWindow());
  });

  it("finishEliteChampion: grants the champion's reward once (claimOnce), clears the champion bits, and does not re-grant on a second call for the same window", async () => {
    const h = await sharedDb();
    await clearAllEliteScores();
    const a = await createCharacter(h, { grade: 35, gold: 0 }); await setElite(a.userId, 35, 500);
    const b = await createCharacter(h, { grade: 35 }); await setElite(b.userId, 35, 400);
    const rt = eventsRuntime(ctx);
    await startEliteChampion(ctx, rt);
    const group = rt.elite.groups.get(1)!;
    group.matches[0]!.inProgress = true; // as if createEliteChampionRoom already launched the real fight
    eliteChampionGameOver(ctx, { players: [{ member: { id: a.userId } as unknown as GamePlayer, win: true }, { member: { id: b.userId } as unknown as GamePlayer, win: false }] });
    expect(group.champion).toBe(a.userId);

    const w = fakeWindow({ eliteAwards: [{ rank: 1, gold: 5000 }] });
    await finishEliteChampion(ctx, rt, w);
    const [row1] = await h.db.select({ Gold: player.Sys_Users_Detail.Gold }).from(player.Sys_Users_Detail).where(eq(player.Sys_Users_Detail.UserID, a.userId));
    expect(row1!.Gold).toBe(5000); // offline delivery path (direct DB credit) since `a` isn't logged in here
    expect(rt.eliteStatus & 2).toBe(0); // champion bit cleared

    // re-running finish for the SAME window key must not pay twice (claimOnce) — rebuild the resolved group,
    // since the first finishEliteChampion already cleared rt.elite.groups.
    rt.elite.groups.set(1, group);
    await finishEliteChampion(ctx, rt, w);
    const [row2] = await h.db.select({ Gold: player.Sys_Users_Detail.Gold }).from(player.Sys_Users_Detail).where(eq(player.Sys_Users_Detail.UserID, a.userId));
    expect(row2!.Gold).toBe(5000); // unchanged — claimOnce refused the duplicate
  });
});
