import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import { loggedIn, sharedDb, startServer } from "./helpers.js";
import { player } from "@ddt/db";
import { and, eq } from "drizzle-orm";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server.stop();
});

/** Reads a 178 QUEST_UPDATE body: quest ids + IsComplete + Condition1. */
function readQuests(pkt: import("@ddt/protocol").GSPacket) {
  pkt.offset = 20;
  const n = pkt.readInt();
  const out: { id: number; done: boolean; c1: number }[] = [];
  for (let i = 0; i < n; i++) {
    const id = pkt.readInt();
    const done = pkt.readBoolean();
    const c1 = pkt.readInt();
    pkt.readInt(); pkt.readInt(); pkt.readInt();
    pkt.readDateTime(); pkt.readInt(); pkt.readInt(); pkt.readBoolean();
    out.push({ id, done, c1 });
  }
  return out;
}

describe("quests (176/177/179/181)", () => {
  it("sends an (empty) 178 at login, adds client-requested quests, tracks wins and pays rewards", async () => {
    const { c, ch, player: p } = await loggedIn(server, { grade: 10 });
    const first = await c.code(178);
    expect(readQuests(first.pkt)).toEqual([]);

    // quest 6: DirectFinish (16) + 1 item reward; quest 341: win 4 Match games (6:0:4), 2000 gold, 1500 GP
    let mark = c.mark();
    c.out(176, (o) => { o.writeInt(3); o.writeInt(6); o.writeInt(341); o.writeInt(999999); });
    const upd = await c.waitFor((r) => r.code === 178 && readQuests(r.pkt).some((q) => q.id === 341), 4000, mark);
    expect(readQuests(upd.pkt).find((q) => q.id === 341)!.c1).toBe(4);
    expect([...p().questInv!.list.keys()].sort((a, b) => a - b)).toEqual([6, 341]);
    expect(p().questInv!.list.get(341)!.data.Condition1).toBe(4);

    mark = c.mark();
    c.out(179, (o) => { o.writeInt(6); o.writeInt(0); });
    const fin = await c.code(179, undefined, mark);
    expect(fin.pkt.readInt()).toBe(6);
    expect(p().questInv!.isQuestFinish(6)).toBe(true);
    expect(p().questInv!.list.has(6)).toBe(false);

    // not done yet -> no 179
    await new Promise((r) => setTimeout(r, 1100));
    mark = c.mark();
    c.out(179, (o) => { o.writeInt(341); o.writeInt(0); });
    await new Promise((r) => setTimeout(r, 300));
    expect(c.received.slice(mark).some((r) => r.code === 179)).toBe(false);

    for (let i = 0; i < 4; i++) p().questInv!.onGameOver({ roomType: 0, gameType: 0, isWin: true, kills: 1, playerCount: 2 });
    expect(p().questInv!.list.get(341)!.data.Condition1).toBe(0);
    const gold0 = p().info.Gold;
    await new Promise((r) => setTimeout(r, 1100));
    mark = c.mark();
    c.out(179, (o) => { o.writeInt(341); o.writeInt(0); });
    await c.code(179, undefined, mark);
    expect(p().info.Gold).toBe(gold0 + 2000);

    // persisted on save
    await p().saveIntoDatabase((await sharedDb()).db);
    const rows = await (await sharedDb()).db.select().from(player.QuestData).where(and(eq(player.QuestData.UserID, ch.userId)));
    expect(rows.map((r) => [r.QuestID, r.IsComplete]).sort()).toEqual([[341, true], [6, true]]);
    c.close();
  });

  /**
   * Regression: QuestInventory.Finish dropped RewardRiches and RewardBuffID entirely (quests.ts previously only
   * granted Gold/Money/GiftToken/Offer/GP). Quest 640 ("Kèn triệu tập 1", real seed data) is a repeatable guild
   * quest: 23 GamesByGame(gameType 1, ×3) + riches/GP/gold/offer/medal(11408) rewards — exactly the "guild +
   * repeatable + money types" combination from the basics-sweep feedback.
   */
  it("guild quest 640 (repeatable, condition 23) pays riches + gold + offer + GP + item reward", async () => {
    const { c, player: p } = await loggedIn(server, { grade: 12 });
    p().info.ConsortiaID = 1; // join a guild (RewardRiches only applies to guild members)
    expect(p().questInv!.add(640)).toBe("");
    p().questInv!.list.get(640)!.data.RandDobule = 1; // make the reward math deterministic (Rands is a 7% double-roll)
    for (let i = 0; i < 3; i++) p().questInv!.onGameOver({ roomType: 0, gameType: 1, isWin: false, kills: 0, playerCount: 2 });
    expect(p().questInv!.canCompleted(p().questInv!.list.get(640)!)).toBe(true);
    const before = { gold: p().info.Gold, offer: p().info.Offer, giftToken: p().info.GiftToken, riches: p().info.RichesOffer, gp: p().info.GP, medal: p().medal };
    expect(p().questInv!.finish(640, 0)).toBe(true);
    expect(p().info.Gold).toBe(before.gold + 500);
    expect(p().info.GiftToken).toBe(before.giftToken + 15);
    expect(p().info.Offer).toBe(before.offer + 20);
    expect(p().info.RichesOffer).toBe(before.riches + 20); // previously silently dropped
    expect(p().info.GP).toBeGreaterThan(before.gp);
    expect(p().medal).toBe(before.medal + 2);
    // repeatable: RepeatMax 1 -> exhausted after one claim this cycle
    expect(p().questInv!.list.get(640)!.data.IsComplete).toBe(true);
    c.close();
  });

  it("buff reward (RewardBuffID/RewardBuffDate) grants a timed buff — no real quest uses it, so inject a template", async () => {
    const { c, player: p } = await loggedIn(server, { grade: 12 });
    const t = server.ctx.templates;
    const buffItemId = 900201;
    t.items.set(buffItemId, { TemplateID: buffItemId, CategoryID: 60, Property1: 777, Property2: 42, Property3: 1, MaxCount: 1 } as never);
    const questId = 900202;
    t.quests.set(questId, {
      info: {
        ID: questId, QuestID: questId, Title: "test", Detail: "", Objective: "", NeedMinLevel: 0, NeedMaxLevel: 99,
        PreQuestID: "0,", NextQuestID: "0,", IsOther: 0, CanRepeat: false, RepeatInterval: 0, RepeatMax: 0,
        RewardGP: 0, RewardGold: 0, RewardGiftToken: 0, RewardOffer: 0, RewardRiches: 0, RewardBuffID: buffItemId,
        RewardBuffDate: 2, RewardMoney: 0, RewardMedal: 0, Rands: "0", StartDate: new Date(0), EndDate: new Date(Date.UTC(2050, 0, 1)),
        RandDouble: 1, TimeMode: false, MapID: 0, AutoEquip: false, Rank: null, StarLev: 0, NotMustCount: 0,
      } as never,
      conds: [], goods: [],
    });
    expect(p().questInv!.add(questId)).toBe("");
    expect(p().questInv!.finish(questId, 0)).toBe(true);
    const buff = p().buffs.find((b) => b.Type === 777);
    expect(buff).toBeDefined();
    expect(buff!.Value).toBe(42);
    expect(buff!.ValidDate).toBe(2 * 60); // RewardBuffDate is in hours
    c.close();
  });
});
