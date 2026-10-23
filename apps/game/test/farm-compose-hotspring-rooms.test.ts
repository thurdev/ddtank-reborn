/**
 * Covers the gaps this pass closed (see research/qa/port-D.md for the full writeup):
 *  - 81 FARM subs that have no C# handler at all: ACCELERATE_FIELD(3), COMPOSE_FOOD(5), FARM_GIFTPACKS(20).
 *  - 175 HOTSPRING_ROOM_CREATE + 191 subs RENEWAL_FEE(3)/EDIT(6)/ADMIN_REMOVE_PLAYER(9)/PLAYER_CONTINUE(10): a new,
 *    from-scratch private-room feature (no C# server code ever implemented these either).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { GameServer } from "../src/server.js";
import { BagType, ItemInfo } from "../src/game/item.js";
import { hotSpringMgr } from "../src/handlers/termas/index.js";
import { loggedIn, sharedDb, sleep, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  const db = (await sharedDb()).db;
  await db.execute(sql`INSERT INTO game."HotSpringRoom" ("roomNumber","roomID","roomName","roomType","maxCount") VALUES (1, 1, 'Spa 1', 2, 10) ON CONFLICT DO NOTHING`);
  server = await startServer();
});
afterAll(async () => {
  await server.stop();
});

describe("81 FARM — ACCELERATE_FIELD(3), no C# handler, new port", () => {
  it("consumes 1 fertilizer and adds its Property1 minutes to AccelerateTime", async () => {
    const p = await loggedIn(server, { grade: 30, money: 100_000 });
    const seedTpl = server.ctx.templates.findItem(332100)!; // Lúa Mì: Property3=1 min to ripen
    const seed = ItemInfo.createFromTemplate(seedTpl, 1, 0);
    expect(p.player().getInventory(BagType.FarmBag)!.addItem(seed)).toBe(true);
    p.c.out(81, (o) => { o.writeByte(2); o.writeByte(0); o.writeInt(332100); o.writeInt(0); }); // GROW_FIELD on starter field 0
    await p.c.code(81, 2); // SendSeeding echoes sub 2 (not 17 — no C# writer ever sends sub 17 for packet 81)

    const fertTpl = server.ctx.templates.findItem(333101)!; // Phân Bón Thường: Property1=60 minutes
    expect(fertTpl.Property1).toBe(60);
    const fert = ItemInfo.createFromTemplate(fertTpl, 1, 0);
    expect(p.player().getItemInventory(fertTpl)!.addItem(fert)).toBe(true);

    const mark = p.c.mark();
    p.c.out(81, (o) => { o.writeByte(3); o.writeByte(13); o.writeInt(0); o.writeInt(333101); o.writeInt(0); }); // ACCELERATE_FIELD on field 0
    const reply = await p.c.code(81, 3, mark);
    expect(reply.pkt.readByte()).toBe(3); // sub
    expect(reply.pkt.readInt()).toBe(1); // batch count
    expect(reply.pkt.readBoolean()).toBe(true); // ok
    expect(reply.pkt.readInt()).toBe(0); // fieldId
    reply.pkt.readInt(); // gainCount
    expect(reply.pkt.readInt()).toBe(60); // AccelerateTime == fertilizer's Property1

    expect(p.player().getItemInventory(fertTpl)!.getItemByTemplateID(0, 333101)).toBeNull(); // fertilizer consumed
    p.c.close();
  });
});

describe("81 FARM — COMPOSE_FOOD(5), no C# handler, new port", () => {
  it("consumes the recipe's vegetables and grants the food item", async () => {
    const p = await loggedIn(server, { grade: 30 });
    // Recipe for FoodID 334101: 10x each of 336101/336102/336103/336104 (verbatim foodcomposelist.xml row set).
    for (const vegId of [336101, 336102, 336103, 336104]) {
      const t = server.ctx.templates.findItem(vegId)!;
      const it = ItemInfo.createFromTemplate(t, 10, 0);
      expect(p.player().getItemInventory(t)!.addItem(it)).toBe(true);
    }
    const foodT = server.ctx.templates.findItem(334101)!;
    const before = p.player().getItemInventory(foodT)?.getItemCount(334101) ?? 0;

    p.c.out(81, (o) => { o.writeByte(5); o.writeInt(334101); o.writeInt(1); });
    await sleep(150); // COMPOSE_FOOD has no reply the client reads (dead event in the AS3 client); just let it process

    for (const vegId of [336101, 336102, 336103, 336104]) {
      const t = server.ctx.templates.findItem(vegId)!;
      expect(p.player().getItemInventory(t)!.getItemByTemplateID(0, vegId)).toBeNull(); // all 10 consumed
    }
    const after = p.player().getItemInventory(foodT)!.getItemCount(334101);
    expect(after).toBe(before + 1);
    p.c.close();
  });

  it("refuses when an ingredient is short (no partial consumption)", async () => {
    const p = await loggedIn(server, { grade: 30 });
    const t = server.ctx.templates.findItem(336101)!;
    const it = ItemInfo.createFromTemplate(t, 5, 0); // only 5, recipe needs 10
    expect(p.player().getItemInventory(t)!.addItem(it)).toBe(true);
    p.c.out(81, (o) => { o.writeByte(5); o.writeInt(334101); o.writeInt(1); });
    await sleep(150);
    expect(p.player().getItemInventory(t)!.getItemCount(336101)).toBe(5); // untouched
    p.c.close();
  });
});

describe("81 FARM — FARM_GIFTPACKS(20), no C# handler, new port", () => {
  it("grants a once-per-day gift when visiting a friend's farm, not a second time the same day", async () => {
    const owner = await loggedIn(server, { grade: 30 });
    const visitor = await loggedIn(server, { grade: 30 });
    visitor.c.out(81, (o) => { o.writeByte(1); o.writeInt(owner.ch.userId); }); // ENTER_FARM on the owner's farm
    await visitor.c.code(81, 1);

    const before = visitor.player().info.Money;
    visitor.c.out(81, (o) => { o.writeByte(20); o.writeInt(owner.ch.userId); });
    await sleep(150);
    const reward = server.ctx.templates.cfgInt("FarmGiftPacksMoney", 500);
    expect(visitor.player().info.Money).toBe(before + reward);

    visitor.c.out(81, (o) => { o.writeByte(20); o.writeInt(owner.ch.userId); }); // same day again — blocked
    await sleep(150);
    expect(visitor.player().info.Money).toBe(before + reward);
    owner.c.close(); visitor.c.close();
  });
});

describe("175 HOTSPRING_ROOM_CREATE + private-room subs, no C# server code at all, new feature", () => {
  it("creates a private room, owner enters free, RENEWAL_FEE/EDIT/ADMIN_REMOVE_PLAYER/PLAYER_CONTINUE all work", async () => {
    const owner = await loggedIn(server, { grade: 10, gold: 100_000 });
    const guest = await loggedIn(server, { grade: 10, gold: 100_000 });

    const goldBefore = owner.player().info.Gold;
    owner.c.out(175, (o) => { o.writeUTF("Sala do Thur"); o.writeUTF(""); o.writeUTF("bem-vindos"); o.writeInt(4); });
    const created = await owner.c.code(175);
    expect(created.pkt.readBoolean()).toBe(true);
    const roomId = created.pkt.readInt();
    expect(created.pkt.readString()).toBe("Sala do Thur");
    created.pkt.readString(); // password
    const initialMinutes = created.pkt.readInt();
    expect(initialMinutes).toBe(server.ctx.templates.cfgInt("HotSpringRoomInitialMinutes", 60));
    const createGold = server.ctx.templates.cfgInt("HotSpringRoomCreateGold", 20000);
    expect(goldBefore - owner.player().info.Gold).toBe(createGold);

    // owner enters their own room for free (no 10000 gold charge)
    const goldBeforeEnter = owner.player().info.Gold;
    owner.c.out(202, (o) => { o.writeInt(roomId); o.writeString(""); });
    await owner.c.code(202);
    expect(owner.player().info.Gold).toBe(goldBeforeEnter);

    // a guest pays the normal 10000 gold to join
    const guestGoldBefore = guest.player().info.Gold;
    guest.c.out(202, (o) => { o.writeInt(roomId); o.writeString(""); });
    await guest.c.code(202);
    expect(guestGoldBefore - guest.player().info.Gold).toBe(10000);

    // 191/3 RENEWAL_FEE: owner pays to extend the room's rental countdown
    const m = await hotSpringMgr(server.ctx);
    const room = m.rooms.get(roomId)!;
    const minutesBefore = room.info.effectiveTime;
    const renewalGold = server.ctx.templates.cfgInt("HotSpringRoomRenewalGold", 3000);
    const goldBeforeRenew = owner.player().info.Gold;
    owner.c.out(191, (o) => { o.writeByte(3); o.writeInt(roomId); });
    await sleep(150);
    expect(room.info.effectiveTime).toBeGreaterThan(minutesBefore);
    expect(goldBeforeRenew - owner.player().info.Gold).toBe(renewalGold);

    // 191/6 EDIT: owner renames the room
    owner.c.out(191, (o) => { o.writeByte(6); o.writeUTF("Nova Sala"); o.writeUTF(""); o.writeUTF("editado"); });
    await sleep(150);
    expect(room.info.roomName).toBe("Nova Sala");

    // a guest can't edit someone else's room
    guest.c.out(191, (o) => { o.writeByte(6); o.writeUTF("Hackeado"); o.writeUTF(""); o.writeUTF(""); });
    await sleep(150);
    expect(room.info.roomName).toBe("Nova Sala");

    // 191/9 ADMIN_REMOVE_PLAYER: owner kicks the guest
    const fromGuest = guest.c.mark();
    owner.c.out(191, (o) => { o.writeByte(9); o.writeInt(guest.ch.userId); });
    const kicked = await guest.c.waitFor((r) => r.code === 199, 2000, fromGuest);
    expect(kicked.pkt.readInt()).toBe(guest.ch.userId);

    // 191/10 PLAYER_CONTINUE(false): owner leaves their own room voluntarily
    const fromOwner = owner.c.mark();
    owner.c.out(191, (o) => { o.writeByte(10); o.writeBoolean(false); });
    await owner.c.waitFor((r) => r.code === 199, 2000, fromOwner);
    expect(room.count).toBe(0);
    owner.c.close(); guest.c.close();
  });

  it("second private room for the same owner is refused", async () => {
    const owner = await loggedIn(server, { grade: 10, gold: 100_000 });
    owner.c.out(175, (o) => { o.writeUTF("Primeira"); o.writeUTF(""); o.writeUTF(""); o.writeInt(4); });
    const first = await owner.c.code(175);
    expect(first.pkt.readBoolean()).toBe(true);

    const mark = owner.c.mark();
    owner.c.out(175, (o) => { o.writeUTF("Segunda"); o.writeUTF(""); o.writeUTF(""); o.writeInt(4); });
    const second = await owner.c.code(175, undefined, mark);
    expect(second.pkt.readBoolean()).toBe(false);
    owner.c.close();
  });
});

describe("135 (farm arrange), no C# handler anywhere, new feature (research/qa/feature-sources.md)", () => {
  it("harvests the friend's ripe field into their bag, tips the helper, blocks a same-day repeat, then hits the daily-friend cap", async () => {
    const owner = await loggedIn(server, { grade: 30 });
    const visitor = await loggedIn(server, { grade: 30 });

    const seedTpl = server.ctx.templates.findItem(332100)!; // Lúa Mì: Property2=10 yield, Property4=334104 goods
    const seed = ItemInfo.createFromTemplate(seedTpl, 1, 0);
    expect(owner.player().getInventory(BagType.FarmBag)!.addItem(seed)).toBe(true);
    owner.c.out(81, (o) => { o.writeByte(1); o.writeInt(0); }); // ENTER_FARM self
    await owner.c.code(81, 1);
    owner.c.out(81, (o) => { o.writeByte(2); o.writeByte(0); o.writeInt(332100); o.writeInt(0); }); // GROW_FIELD field 0
    await owner.c.code(81, 2); // SendSeeding
    owner.c.out(81, (o) => { o.writeByte(18); o.writeBoolean(false); o.writeBoolean(false); o.writeInt(0); }); // FRAM_GROP_FASTFORWARD -> ripe now
    await owner.c.code(81, 3); // SenddoMature (batched slots report, not an echo of sub 18)

    visitor.c.out(81, (o) => { o.writeByte(1); o.writeInt(owner.ch.userId); }); // ENTER_FARM on owner's farm
    await visitor.c.code(81, 1);

    const tip = server.ctx.templates.cfgInt("FarmArrangeMoney", 300);
    const visitorMoneyBefore = visitor.player().info.Money;
    visitor.c.out(135, (o) => { o.writeInt(1); o.writeInt(owner.ch.userId); });
    const first = await visitor.c.code(135);
    expect(first.pkt.readInt()).toBe(0); // success
    expect(visitor.player().info.Money).toBe(visitorMoneyBefore + tip);

    const goods = owner.player().propBag.getItemByTemplateID(0, 334104);
    expect(goods, "arrange must harvest into the OWNER's bag, not the helper's").not.toBeNull();
    expect(goods!.Count).toBe(10); // seed template's Property2 yield

    // same friend again the same day — blocked (code 1), no extra tip
    const mark = visitor.c.mark();
    visitor.c.out(135, (o) => { o.writeInt(1); o.writeInt(owner.ch.userId); });
    const repeat = await visitor.c.code(135, undefined, mark);
    expect(repeat.pkt.readInt()).toBe(1);
    expect(visitor.player().info.Money).toBe(visitorMoneyBefore + tip);

    owner.c.close(); visitor.c.close();
  });

  it("hits the daily distinct-friends cap (code 2) after FarmArrangeDailyLimit helps", async () => {
    const visitor = await loggedIn(server, { grade: 30 });
    const limit = server.ctx.templates.cfgInt("FarmArrangeDailyLimit", 5);
    for (let i = 0; i < limit; i++) {
      const friend = await loggedIn(server, { grade: 30 });
      visitor.c.out(81, (o) => { o.writeByte(1); o.writeInt(friend.ch.userId); });
      await visitor.c.code(81, 1);
      const mark = visitor.c.mark();
      visitor.c.out(135, (o) => { o.writeInt(1); o.writeInt(friend.ch.userId); });
      const r = await visitor.c.code(135, undefined, mark);
      expect(r.pkt.readInt()).toBe(0);
      friend.c.close();
    }
    const oneMore = await loggedIn(server, { grade: 30 });
    visitor.c.out(81, (o) => { o.writeByte(1); o.writeInt(oneMore.ch.userId); });
    await visitor.c.code(81, 1);
    const mark = visitor.c.mark();
    visitor.c.out(135, (o) => { o.writeInt(1); o.writeInt(oneMore.ch.userId); });
    const capped = await visitor.c.code(135, undefined, mark);
    expect(capped.pkt.readInt()).toBe(2); // daily helper cap reached
    oneMore.c.close(); visitor.c.close();
  });
});
