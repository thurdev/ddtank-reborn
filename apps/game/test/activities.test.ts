import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { game, player } from "@ddt/db";
import type { GameServer } from "../src/server.js";
import type { ServerContext } from "../src/session/context.js";
import { eventsRuntime } from "../src/handlers/eventos/agendador.js";
import { getNoviceCondition } from "../src/game/novice-activity.js";
import { drawDistinct, type Card } from "../src/handlers/eventos/bau-da-galinha.js";
import { luckyDraw } from "../src/handlers/eventos/estrela-da-sorte.js";
import { pickLotteryBoard } from "../src/handlers/eventos/roleta.js";
import { labyrinthTryAgainMoney, type LabyrinthRow } from "../src/handlers/eventos/labirinto.js";
import { ItemInfo } from "../src/game/item.js";
import { loggedIn, sharedDb, startServer } from "./helpers.js";

let server: GameServer;
let ctx: ServerContext;
beforeAll(async () => { server = await startServer(); ctx = (server as unknown as { ctx: ServerContext }).ctx; });
afterAll(async () => { await server.stop(); });

describe("caddy/lottery pure helpers", () => {
  it("pickLotteryBoard: always 18 slots, dedups by (template,count), samples with repeats if the pool is small", () => {
    const rows = [1, 2, 3].map((i) => ({ ID: 1, TemplateId: i, IsSelect: false, IsBind: true, ItemValid: 0, ItemCount: 1, StrengthenLevel: 0, AttackCompose: 0, DefendCompose: 0, AgilityCompose: 0, LuckCompose: 0, Random: 100, IsTips: 0, IsLogs: false }));
    const board = pickLotteryBoard(rows as never, () => 0.5);
    expect(board).toHaveLength(18);
    expect(board.every((r) => [1, 2, 3].includes(r.TemplateId))).toBe(true);
  });

  it("drawDistinct: never repeats a templateId while the pool has unused ones", () => {
    const pool = [{ templateId: 1, count: 1 }, { templateId: 2, count: 1 }, { templateId: 3, count: 1 }, { templateId: 4, count: 1 }];
    const cards = drawDistinct(pool, 4);
    expect(new Set(cards.map((c) => c.templateId)).size).toBe(4);
    cards.forEach((c, i) => expect(c.position).toBe(i));
  });

  it("luckyDraw: weighted pick stays within the board, coin slot re-rolls ~97% of the time", () => {
    const rewards: Card[] = [
      { templateId: 201193, count: 1, strengthenLevel: 0, validDate: 0, atk: 0, def: 0, agi: 0, luck: 0, position: 0, isSelected: false, isSeeded: false, isBind: true, weight: 10000 },
      { templateId: 99, count: 1, strengthenLevel: 0, validDate: 0, atk: 0, def: 0, agi: 0, luck: 0, position: 1, isSelected: false, isSeeded: false, isBind: true, weight: 1 },
    ];
    let sawOther = false;
    for (let i = 0; i < 50; i++) if (luckyDraw({ rewards, award: null, lastTurn: 0, coins: 500, rowId: null }).templateId === 99) sawOther = true;
    expect(sawOther).toBe(true); // the coin-reroll rule must occasionally land on the only other slot
  });
});

describe("131 LABYRINTH economy", () => {
  it("labyrinthTryAgainMoney: price big every even checkpoint floor below myProgress, else small", () => {
    eventsRuntime(ctx).scheduler.setEvents([{ id: 1, kind: "labyrinth", title: "", enabled: true, weekdays: "", startTime: "00:00", durationMin: 0, startDate: null, endDate: null, params: { priceBig: 5000, priceSmall: 1000 } }]);
    const row = (currentFloor: number, myProgress: number): LabyrinthRow => ({ UserID: 1, myProgress, myRanking: 0, completeChallenge: false, isDoubleAward: false, currentFloor, accumulateExp: 0, remainTime: 0, currentRemainTime: 0, cleanOutAllTime: 0, cleanOutGold: 0, tryAgainComplete: false, isInGame: false, isCleanOut: false, serverMultiplyingPower: false, LastDate: new Date(), ProcessAward: "-1" });
    expect(labyrinthTryAgainMoney(ctx, row(0, 5))).toBe(5000);
    expect(labyrinthTryAgainMoney(ctx, row(1, 5))).toBe(1000);
    eventsRuntime(ctx).scheduler.setEvents([]);
  });

  it("131 sub 3 CLEAN_OUT: refuses without enough giftToken, settles currentFloor=myProgress and pays GP once myProgress>0", async () => {
    const { c, ch: p } = await loggedIn(server, { grade: 10 });
    const h = await sharedDb();
    await h.db.insert(player.Sys_Users_Labyrinth).values({ UserID: p.userId, myProgress: 4, myRanking: 0, completeChallenge: true, isDoubleAward: false, currentFloor: 0, accumulateExp: 0, remainTime: 0, currentRemainTime: 0, cleanOutAllTime: 0, cleanOutGold: 50, tryAgainComplete: true, isInGame: false, isCleanOut: false, serverMultiplyingPower: false, LastDate: new Date(), ProcessAward: "-1" } as never).onConflictDoNothing();
    eventsRuntime(ctx).scheduler.setEvents([{ id: 2, kind: "labyrinth", title: "", enabled: true, weekdays: "", startTime: "00:00", durationMin: 0, startDate: null, endDate: null, params: { cleanOutGiftToken: 0 } }]);
    const gp = ctx.world.get(p.userId)!;
    const gpBefore = gp.info.GP;
    const m = c.mark();
    c.out(131, (o) => o.writeInt(3));
    await c.code(131, undefined, m);
    const [row] = await h.db.select().from(player.Sys_Users_Labyrinth).where(eq(player.Sys_Users_Labyrinth.UserID, p.userId));
    expect(row!.currentFloor).toBe(4);
    expect(gp.info.GP).toBeGreaterThan(gpBefore);
    eventsRuntime(ctx).scheduler.setEvents([]);
    c.close();
  });
});

describe("132 league battleground stats", () => {
  it("sub 5 returns the original's fixed reference stats (not derived from the player)", async () => {
    const { c } = await loggedIn(server);
    const m = c.mark();
    c.out(132, (o) => o.writeByte(5));
    const r = await c.code(132, undefined, m);
    expect(r.pkt.readByte()).toBe(5);
    expect(r.pkt.readInt()).toBe(1700); // Attack
    expect(r.pkt.readInt()).toBe(1500); // Defend
    expect(r.pkt.readInt()).toBe(1600); // Agility
    expect(r.pkt.readInt()).toBe(1500); // Lucky
    c.close();
  });

  it("sub 3/b2=1 returns MatchInfo prestige + the fixed fairBattleDayPrestige", async () => {
    const { c } = await loggedIn(server);
    const m = c.mark();
    c.out(132, (o) => { o.writeByte(3); o.writeByte(1); });
    const r = await c.code(132, undefined, m);
    r.pkt.readByte(); r.pkt.readBoolean(); r.pkt.readByte();
    r.pkt.readInt(); r.pkt.readInt();
    expect(r.pkt.readInt()).toBe(2000);
    c.close();
  });
});

describe("258 NOVICEACTIVITY: real progress counter (not Grade), sequential tiers (anti-skip), claim-once", () => {
  it("grants tier 1 once real progress reaches its Condition; a repeat claims nothing more", async () => {
    const h = await sharedDb();
    await h.db.delete(game.Event_Reward_Goods).where(eq(game.Event_Reward_Goods.ActivityType, 9001));
    await h.db.delete(game.Event_Reward_Info).where(eq(game.Event_Reward_Info.ActivityType, 9001));
    await h.db.insert(game.Event_Reward_Goods).values({ ActivityType: 9001, SubActivityType: 1, TemplateId: -100, Count: 777, IsBind: true, ValidDate: 0 } as never);
    await h.db.insert(game.Event_Reward_Info).values({ ActivityType: 9001, SubActivityType: 1, Condition: 5 } as never);
    await eventsRuntime(ctx).reload();
    const { c, ch: p } = await loggedIn(server, { gold: 0 });
    const gp = ctx.world.get(p.userId)!;
    // Real progress counter (game/novice-activity.ts), not Grade — reached the tier-1 threshold (5).
    gp.noviceProgress.set(9001, { UserID: p.userId, ActivityType: 9001, Conditions: 5, AwardGot: 0, PeriodKey: "" });
    const goldBefore = gp.info.Gold;
    const m = c.mark();
    c.out(258, (o) => { o.writeInt(9001); o.writeInt(1); });
    await c.code(3, undefined, m); // GM_NOTICE reply ("Nhận quà sự kiện thành công!")
    expect(gp.info.Gold).toBe(goldBefore + 777);
    const after1 = gp.info.Gold;
    c.out(258, (o) => { o.writeInt(9001); o.writeInt(1); });
    await new Promise((r) => setTimeout(r, 200));
    expect(gp.info.Gold).toBe(after1); // claimOnce refuses the repeat — no double grant
    c.close();
  });

  it("refuses when real progress hasn't reached the Condition yet — Grade alone no longer decides it", async () => {
    const h = await sharedDb();
    await h.db.delete(game.Event_Reward_Goods).where(eq(game.Event_Reward_Goods.ActivityType, 9002));
    await h.db.delete(game.Event_Reward_Info).where(eq(game.Event_Reward_Info.ActivityType, 9002));
    await h.db.insert(game.Event_Reward_Goods).values({ ActivityType: 9002, SubActivityType: 1, TemplateId: -100, Count: 999, IsBind: true, ValidDate: 0 } as never);
    await h.db.insert(game.Event_Reward_Info).values({ ActivityType: 9002, SubActivityType: 1, Condition: 5 } as never);
    await eventsRuntime(ctx).reload();
    // High Grade on purpose: the pre-41-novato-progresso code compared the tier index against Grade directly,
    // so this would have wrongly passed before. Real progress for ActivityType 9002 was never touched (stays 0).
    const { c, ch: p } = await loggedIn(server, { grade: 99, gold: 0 });
    const gp = ctx.world.get(p.userId)!;
    const goldBefore = gp.info.Gold;
    c.out(258, (o) => { o.writeInt(9002); o.writeInt(1); });
    await new Promise((r) => setTimeout(r, 200));
    expect(gp.info.Gold).toBe(goldBefore);
    c.close();
  });

  it("anti-skip: a client SubActivityType past tier 1 is ignored — the real next tier comes from AwardGot, never jumps ahead", async () => {
    const h = await sharedDb();
    await h.db.delete(game.Event_Reward_Goods).where(eq(game.Event_Reward_Goods.ActivityType, 9003));
    await h.db.delete(game.Event_Reward_Info).where(eq(game.Event_Reward_Info.ActivityType, 9003));
    await h.db.insert(game.Event_Reward_Goods).values([
      { ActivityType: 9003, SubActivityType: 1, TemplateId: -100, Count: 100, IsBind: true, ValidDate: 0 },
      { ActivityType: 9003, SubActivityType: 2, TemplateId: -100, Count: 200, IsBind: true, ValidDate: 0 },
    ] as never);
    await h.db.insert(game.Event_Reward_Info).values([
      { ActivityType: 9003, SubActivityType: 1, Condition: 5 },
      { ActivityType: 9003, SubActivityType: 2, Condition: 10 },
    ] as never);
    await eventsRuntime(ctx).reload();
    const { c, ch: p } = await loggedIn(server, { gold: 0 });
    const gp = ctx.world.get(p.userId)!;
    // Progress already past BOTH thresholds, but tier 1 (AwardGot=0) was never claimed yet.
    gp.noviceProgress.set(9003, { UserID: p.userId, ActivityType: 9003, Conditions: 10, AwardGot: 0, PeriodKey: "" });
    const goldBefore = gp.info.Gold;
    // Client asks straight for tier 2 (SubActivityType=2): NoviceActivityGetAward.cs:22-28 ignores it (only "==1" matters)
    // and computes the real tier from AwardGot (0*2+1=1 -> tier 1).
    c.out(258, (o) => { o.writeInt(9003); o.writeInt(2); });
    await new Promise((r) => setTimeout(r, 200));
    expect(gp.info.Gold).toBe(goldBefore + 100); // tier 1's reward, not tier 2's
    // AwardGot is now 1: the SAME request (still SubActivityType=2) correctly advances to the real tier 2 next (1*2+1=3 -> tier 2).
    c.out(258, (o) => { o.writeInt(9003); o.writeInt(2); });
    await new Promise((r) => setTimeout(r, 200));
    expect(gp.info.Gold).toBe(goldBefore + 100 + 200);
    c.close();
  });
});

describe("258 NOVICEACTIVITY: real server-side triggers feed the counter (not client-trusted)", () => {
  it("GamePlayer.addGP bumps GRADE_UP_ACTIVE (1) to the new Grade on level-up (high-water mark)", async () => {
    const { c, ch: p } = await loggedIn(server, { grade: 1 });
    const gp = ctx.world.get(p.userId)!;
    gp.gradeForGp = (v) => (v >= 100 ? 5 : undefined); // force a level-up to Grade 5 once enough GP accrues
    expect(getNoviceCondition(gp, 1, ctx.now())).toBe(1); // already backfilled at login (UpdateLevel, GamePlayer.cs:2969) to the starting Grade
    gp.addGP(100, false);
    expect(gp.info.Grade).toBe(5);
    expect(getNoviceCondition(gp, 1, ctx.now())).toBe(5);
    c.close();
  });

  it("GamePlayer.removeMoney bumps USE_MONEY_ACTIVE (3) and its weekly twin (5) by the amount spent (running total)", async () => {
    const { c, ch: p } = await loggedIn(server, { money: 1000 });
    const gp = ctx.world.get(p.userId)!;
    expect(getNoviceCondition(gp, 3, ctx.now())).toBe(0);
    gp.removeMoney(300);
    expect(getNoviceCondition(gp, 3, ctx.now())).toBe(300);
    expect(getNoviceCondition(gp, 5, ctx.now())).toBe(300);
    gp.removeMoney(50);
    expect(getNoviceCondition(gp, 3, ctx.now())).toBe(350); // running total, not a high-water mark
    c.close();
  });
});

describe("84 ACTIVITY_PACKAGE ChickActivation", () => {
  it("OPENKEY: wrong code -> NotExit message, no key opened", async () => {
    const { c } = await loggedIn(server, { grade: 10 });
    const m = c.mark();
    c.out(84, (o) => { o.writeInt(2); o.writeInt(1); o.writeUTF("WRONGCODE12345"); }); // 14 chars, not in the default pool
    await c.code(3, undefined, m); // GM_NOTICE "ActivityPackageHandler.ChickActivation.NotExit"
    c.close();
  });

  it("OPENKEY: the built-in default code activates once; a second player reusing it gets IsUsed", async () => {
    const { c: a } = await loggedIn(server, { grade: 10 }); // Grade<=15 -> KeyOpenedType 1
    const m = a.mark();
    a.out(84, (o) => { o.writeInt(2); o.writeInt(1); o.writeUTF("DDTANKREBORN01"); });
    const r = await a.code(84, undefined, m);
    expect(r.pkt.readInt()).toBe(2); // CHICKACTIVATION
    expect(r.pkt.readInt()).toBe(2); // CHICKACTIVATION_UPDATE
    expect(r.pkt.readInt()).toBe(1); // IsKeyOpened
    a.close();

    const { c: b } = await loggedIn(server, { grade: 10 });
    const m2 = b.mark();
    b.out(84, (o) => { o.writeInt(2); o.writeInt(1); o.writeUTF("DDTANKREBORN01"); });
    await b.code(3, undefined, m2); // "IsUsed" — claimOnce refuses the already-consumed code
    b.close();
  });

  it("GETAWARD without an opened key refuses with NotActive; opening then claiming the daily tier mails the reward once", async () => {
    const h = await sharedDb();
    const { c, ch: p } = await loggedIn(server, { grade: 10 });
    const m0 = c.mark();
    c.out(84, (o) => { o.writeInt(2); o.writeInt(2); o.writeInt(1); o.writeInt(0); }); // GETAWARD daily, no key yet
    await c.code(3, undefined, m0); // NotActive

    const openCode = `OPENCODE${Date.now() % 1000000}`.padEnd(14, "0").slice(0, 14);
    const m1 = c.mark();
    eventsRuntime(ctx).scheduler.setEvents([{ id: 50, kind: "chickactivation", title: "", enabled: true, weekdays: "", startTime: "00:00", durationMin: 0, startDate: null, endDate: null, params: { codes: [openCode] } }]);
    c.out(84, (o) => { o.writeInt(2); o.writeInt(1); o.writeUTF(openCode); });
    await c.code(84, undefined, m1);

    const before = (await h.db.select().from(player.User_Messages).where(eq(player.User_Messages.ReceiverID, p.userId))).length;
    const m2 = c.mark();
    c.out(84, (o) => { o.writeInt(2); o.writeInt(2); o.writeInt(1); o.writeInt(0); }); // GETAWARD daily
    await c.code(84, undefined, m2); // CHICKACTIVATION_UPDATE reply
    const after = (await h.db.select().from(player.User_Messages).where(eq(player.User_Messages.ReceiverID, p.userId))).length;
    expect(after).toBeGreaterThan(before); // mailed, not put in the bag (matches WorldEventMgr.SendItemsToMails)

    eventsRuntime(ctx).scheduler.setEvents([]);
    c.close();
  });

  it("GETAWARD daily tier: claim-once — a second claim the same day gets NotFoundAward, no second mail", async () => {
    const h = await sharedDb();
    const { c, ch: p } = await loggedIn(server, { grade: 10 });
    const openCode = `OPENCODE${Date.now() % 1000000}`.padEnd(14, "0").slice(0, 14);
    eventsRuntime(ctx).scheduler.setEvents([{ id: 51, kind: "chickactivation", title: "", enabled: true, weekdays: "", startTime: "00:00", durationMin: 0, startDate: null, endDate: null, params: { codes: [openCode] } }]);
    const m0 = c.mark();
    c.out(84, (o) => { o.writeInt(2); o.writeInt(1); o.writeUTF(openCode); });
    await c.code(84, undefined, m0);

    const m1 = c.mark();
    c.out(84, (o) => { o.writeInt(2); o.writeInt(2); o.writeInt(1); o.writeInt(0); }); // 1st GETAWARD daily -> mails
    await c.code(84, undefined, m1);
    let afterFirst = (await h.db.select().from(player.User_Messages).where(eq(player.User_Messages.ReceiverID, p.userId))).length;

    // Fri/Sat/Sun: a 2nd click on a daily slot (awardType <= 7) falls through to the weekend tier
    // (`AwardType <= 10`, ActivityPackageHandler.cs:214) — same as C#. Claim it, then the next click is refused.
    if ([0, 5, 6].includes(new Date().getUTCDay())) {
      const mw = c.mark();
      c.out(84, (o) => { o.writeInt(2); o.writeInt(2); o.writeInt(1); o.writeInt(0); });
      await c.code(84, undefined, mw);
      afterFirst = (await h.db.select().from(player.User_Messages).where(eq(player.User_Messages.ReceiverID, p.userId))).length;
    }

    const m2 = c.mark();
    c.out(84, (o) => { o.writeInt(2); o.writeInt(2); o.writeInt(1); o.writeInt(0); }); // 2nd GETAWARD daily, same UTC day
    await c.code(3, undefined, m2); // NotFoundAward — chickStatusInts already flags the day as claimed
    const afterSecond = (await h.db.select().from(player.User_Messages).where(eq(player.User_Messages.ReceiverID, p.userId))).length;
    expect(afterSecond).toBe(afterFirst); // no duplicate mail — same-day reuse refused

    eventsRuntime(ctx).scheduler.setEvents([]);
    c.close();
  });

  it("item 201316 (PropUseHandler.cs:31-43, 66 PROP_USE) opens the same key as OPENKEY — one unit consumed, not re-openable", async () => {
    const { c, player } = await loggedIn(server, { grade: 10 });
    const p = player();
    const t = ctx.templates.findItem(201316);
    expect(t).toBeTruthy();
    const item = ItemInfo.createFromTemplate(t!, 2, 0, ctx.now());
    p.propBag.addItem(item);
    const place = item.Place;

    const m0 = c.mark();
    c.out(66, (o) => { o.writeInt(1 /* bagType PropBag, BagType.PropBag=1 */); o.writeInt(place); o.writeInt(1 /* count */); o.writeInt(201316); o.writeInt(0 /* payType */); o.writeBoolean(false); });
    await c.code(84, undefined, m0); // CHICKACTIVATION_UPDATE (chickReplyPkt type 2) — isKeyOpened=1
    expect(p.propBag.getItemAt(place)?.Count).toBe(1); // exactly 1 unit consumed

    // reusing the item once the key is already open is refused (activateChickItem's data.isKeyOpened guard) —
    // no reply packet at all (ctx.lang message only), matching ActivityPackageHandler's silent-ignore style.
    const m1 = c.mark();
    c.out(66, (o) => { o.writeInt(1); o.writeInt(place); o.writeInt(1); o.writeInt(201316); o.writeInt(0); o.writeBoolean(false); });
    await new Promise((r) => setTimeout(r, 100));
    expect(c.received.slice(m1).some((r) => r.code === 84)).toBe(false);
    expect(p.propBag.getItemAt(place)?.Count).toBe(1); // second unit NOT consumed (refused before removeCountFromStack)

    c.close();
  });
});
