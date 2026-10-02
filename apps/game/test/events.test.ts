import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { game } from "@ddt/db";
import type { GameServer } from "../src/server.js";
import type { ServerContext } from "../src/session/context.js";
import { EventScheduler, nextStart, occurrenceAt, rateOf, windowsAt, type ScheduledEvent } from "../src/game/scheduler.js";
import { claimOnce } from "../src/game/events.js";
import { eventsRuntime, weeklyReset, worldBossDamage } from "../src/handlers/events.js";
import { loggedIn, sharedDb, startServer } from "./helpers.js";

const ev = (o: Partial<ScheduledEvent>): ScheduledEvent => ({
  id: 1, kind: "worldboss", title: "", enabled: true, weekdays: "0,1,2,3,4,5,6", startTime: "12:00", durationMin: 30,
  startDate: null, endDate: null, params: {}, ...o,
});

describe("EventScheduler windows", () => {
  it("opens daily windows at HH:MM UTC for durationMin", () => {
    const e = ev({});
    expect(occurrenceAt(e, new Date("2026-10-02T11:59:59Z"))).toBeNull();
    const w = occurrenceAt(e, new Date("2026-10-02T12:10:00Z"))!;
    expect(w.start.toISOString()).toBe("2026-10-02T12:00:00.000Z");
    expect(w.end.toISOString()).toBe("2026-10-02T12:30:00.000Z");
    expect(occurrenceAt(e, new Date("2026-10-02T12:30:00Z"))).toBeNull();
  });
  it("respects weekdays, midnight crossing, date range and enabled", () => {
    // 2026-10-03 is a Saturday (6)
    const sat = ev({ weekdays: "6", startTime: "23:00", durationMin: 120 });
    expect(occurrenceAt(sat, new Date("2026-10-04T00:30:00Z"))?.start.toISOString()).toBe("2026-10-03T23:00:00.000Z");
    expect(occurrenceAt(sat, new Date("2026-10-02T23:30:00Z"))).toBeNull(); // Friday
    expect(occurrenceAt({ ...sat, enabled: false }, new Date("2026-10-03T23:30:00Z"))).toBeNull();
    expect(occurrenceAt({ ...sat, endDate: new Date("2026-10-03T00:00:00Z") }, new Date("2026-10-03T23:30:00Z"))).toBeNull();
    expect(nextStart(sat, new Date("2026-10-02T10:00:00Z"))?.toISOString()).toBe("2026-10-03T23:00:00.000Z");
  });
  it("double exp/gold rate = max of open windows", () => {
    const now = new Date("2026-10-04T10:00:00Z"); // Sunday
    const open = windowsAt([ev({ id: 2, kind: "double_exp", weekdays: "0", startTime: "00:00", durationMin: 1440, params: { rate: 3 } }), ev({ id: 3, kind: "double_exp", weekdays: "0", startTime: "09:00", durationMin: 120, params: { rate: 2 } })], now);
    expect(rateOf(open, "double_exp")).toBe(3);
    expect(rateOf(open, "double_gold")).toBe(1);
  });
  it("fires start once and end once per occurrence; force/stop", async () => {
    let now = new Date("2026-10-02T11:59:00Z");
    const log: string[] = [];
    const s = new EventScheduler(() => now, { onStart: (w) => void log.push(`start ${w.ev.kind}`), onEnd: (w) => void log.push(`end ${w.ev.kind}`) });
    s.setEvents([ev({})]);
    await s.tick();
    now = new Date("2026-10-02T12:00:00Z");
    await s.tick();
    await s.tick();
    now = new Date("2026-10-02T12:31:00Z");
    await s.tick();
    expect(log).toEqual(["start worldboss", "end worldboss"]);
    s.force("league", 10);
    await s.tick();
    expect(s.isOpen("league")).toBeTruthy();
    s.stop("league");
    await s.tick();
    expect(s.isOpen("league")).toBeUndefined();
    expect(log.slice(2)).toEqual(["start league", "end league"]);
  });
});

let server: GameServer;
let ctx: ServerContext;
beforeAll(async () => {
  server = await startServer();
  ctx = (server as unknown as { ctx: ServerContext }).ctx;
  const h = await sharedDb();
  await h.db.delete(game.Daily_Award);
  await h.db.insert(game.Daily_Award).values([
    { ID: 9001, Type: 1, TemplateID: -100, Count: 500, ValidDate: 0, IsBinds: true, Sex: 0, AwardDays: 3, GetWay: 0 },
    { ID: 9002, Type: 7, TemplateID: -1100, Count: 100, ValidDate: 0, IsBinds: true, Sex: 0, AwardDays: 3, GetWay: 0 },
  ] as never);
  await h.db.insert(game.Achievement).values({ ID: 99001, PlaceID: 1, Title: "Lv5", Detail: "", NeedMinLevel: 0, NeedMaxLevel: 100, PreAchievementID: "0,", IsOther: 0, AchievementType: 1, CanHide: false, StartDate: new Date("2000-01-01"), EndDate: new Date("2100-01-01"), AchievementPoint: 10, IsActive: 1, PicID: 1, IsShare: false } as never).onConflictDoNothing();
  await h.db.insert(game.AchievementCondition).values({ AchievementID: 99001, CondictionID: 1, CondictionType: 10, Condiction_Para1: "0", Condiction_Para2: 5 } as never).onConflictDoNothing();
  await h.db.insert(game.Achievement).values({ ID: 99002, PlaceID: 1, Title: "Lv90", Detail: "", NeedMinLevel: 0, NeedMaxLevel: 100, PreAchievementID: "0,", IsOther: 0, AchievementType: 1, CanHide: false, StartDate: new Date("2000-01-01"), EndDate: new Date("2100-01-01"), AchievementPoint: 10, IsActive: 1, PicID: 1, IsShare: false } as never).onConflictDoNothing();
  await h.db.insert(game.AchievementCondition).values({ AchievementID: 99002, CondictionID: 1, CondictionType: 10, Condiction_Para1: "0", Condiction_Para2: 90 } as never).onConflictDoNothing();
  await eventsRuntime(ctx).reload();
});
afterAll(async () => {
  await server.stop();
});

describe("event claims (idempotency)", () => {
  it("claimOnce lets exactly one of N concurrent claims win", async () => {
    const h = await sharedDb();
    const res = await Promise.all(Array.from({ length: 8 }, () => claimOnce(h.db, 424242, "test", "k1")));
    expect(res.filter(Boolean)).toHaveLength(1);
  });

  it("13/5 signs once a day, 90 pays a reached tier once a month", async () => {
    const { c, ch: p } = await loggedIn(server, { gold: 0 });
    const h = await sharedDb();
    // three earlier sign-ins this month (+ today = 4 >= tier 3)
    const now = new Date();
    const d = now.getUTCDate();
    const days = Array.from({ length: d - 1 }, (_, i) => (i < 3 ? "True" : "False"));
    await h.db.execute(sql`DELETE FROM player."DailyLogList" WHERE "UserID" = ${p.userId}`);
    await h.db.execute(sql`INSERT INTO player."DailyLogList" ("UserID","UserAwardLog","DayLog","LastDate") VALUES (${p.userId}, 3, ${days.join(",")}, ${now})`);
    for (let i = 0; i < 3; i++) c.out(13, (o) => o.writeInt(5));
    await new Promise((r) => setTimeout(r, 400));
    const [row] = ((await h.db.execute(sql`SELECT "DayLog" FROM player."DailyLogList" WHERE "UserID" = ${p.userId}`)) as unknown as { rows: { DayLog: string }[] }).rows;
    expect(row!.DayLog.split(",").filter((x) => x === "True")).toHaveLength(d >= 4 ? 4 : Math.min(d, 4));
    const gp = ctx.world.get(p.userId)!;
    const g0 = gp.info.GiftToken;
    for (let i = 0; i < 3; i++) c.out(90, (o) => o.writeInt(3));
    await new Promise((r) => setTimeout(r, 400));
    if (d >= 3) {
      expect(gp.info.Gold).toBe(500);
      expect(gp.info.GiftToken - g0).toBe(100);
    }
    c.out(90, (o) => o.writeInt(18)); // tier not configured / not reached
    await new Promise((r) => setTimeout(r, 200));
    expect(gp.info.Gold).toBe(d >= 3 ? 500 : 0);
    c.close();
  });

  it("13/0 daily award once per day", async () => {
    const { c, ch: p } = await loggedIn(server);
    const gp = ctx.world.get(p.userId)!;
    const before = gp.info.DayLoginCount ?? 0;
    for (let i = 0; i < 3; i++) { c.out(13, (o) => o.writeInt(0)); await new Promise((r) => setTimeout(r, 550)); }
    expect((gp.info.DayLoginCount ?? 0) - before).toBe(1);
    c.close();
  });

  it("230 only completes achievements whose records are reached, once", async () => {
    const { c, ch: p } = await loggedIn(server, { grade: 10 });
    await c.code(228);
    let m = c.mark();
    c.out(230, (o) => o.writeInt(99002)); // needs level 90
    c.out(230, (o) => o.writeInt(99001));
    c.out(230, (o) => o.writeInt(99001));
    const r = await c.code(230, undefined, m);
    expect(r.pkt.readInt()).toBe(99001);
    await new Promise((res) => setTimeout(res, 300));
    expect(c.received.slice(m).filter((x) => x.code === 230)).toHaveLength(1);
    expect(ctx.world.get(p.userId)!.info.AchievementPoint).toBe(10);
    m = c.mark();
    c.close();
  });

  it("53 time box: server-side online minutes, once per box", async () => {
    const h = await sharedDb();
    await h.db.insert(game.LoadUserBox).values({ ID: 99901, Type: 0, Level: 100, Condition: 15, TemplateID: 11023 } as never).onConflictDoNothing();
    await eventsRuntime(ctx).reload();
    const { c, ch: p } = await loggedIn(server, { grade: 10 });
    const box = (m: number) => c.out(53, (o) => { o.writeInt(1); o.writeInt(0); void m; });
    let m = c.mark();
    box(0); // too early: 0 minutes online
    let r = await c.code(53, undefined, m);
    r.pkt.readInt(); r.pkt.readInt();
    expect(r.pkt.readBoolean()).toBe(false);
    const real = ctx.now;
    ctx.now = () => new Date(Date.now() + 16 * 60_000);
    try {
      m = c.mark();
      box(0);
      r = await c.code(53, undefined, m);
      r.pkt.readInt(); r.pkt.readInt();
      expect(r.pkt.readBoolean()).toBe(true);
      expect(r.pkt.readInt()).toBe(15);
      expect(ctx.world.get(p.userId)!.info.BoxProgression).toBe(15);
    } finally {
      ctx.now = real;
    }
    c.close();
  });

  it("weekly reset runs once per window; world boss ranking rewards once", async () => {
    const h = await sharedDb();
    expect(await weeklyReset(ctx, "test-week")).toBe(true);
    expect(await weeklyReset(ctx, "test-week")).toBe(false);
    void h;
    const { c, ch: p } = await loggedIn(server);
    const rt = eventsRuntime(ctx);
    rt.scheduler.setEvents([{ id: 77, kind: "worldboss", title: "t", enabled: false, weekdays: "", startTime: "00:00", durationMin: 1, startDate: null, endDate: null, params: { bossHp: 1000, rankAwards: [{ rank: 1, giftToken: 50 }] } }]);
    rt.scheduler.force("worldboss", 5);
    await rt.scheduler.tick();
    expect(rt.boss.window).toBeTruthy();
    const gp = ctx.world.get(p.userId)!;
    const g0 = gp.info.GiftToken;
    worldBossDamage(ctx, gp, 300);
    expect(rt.boss.blood).toBe(700);
    rt.scheduler.stop("worldboss");
    await rt.scheduler.tick();
    await rt.scheduler.tick();
    expect(rt.boss.window).toBeNull();
    expect(gp.info.GiftToken - g0).toBe(50);
    c.close();
  });
});
