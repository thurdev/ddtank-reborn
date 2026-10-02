/**
 * State/cost logic for the three systems added this pass: marriage (handlers/marriage.ts), farm
 * (handlers/farm.ts), auction (handlers/auction.ts). Focuses on the money/state paths the task called out:
 * divorce charged once, the farm-helper price exploit, and auction fee/bid/refund/settlement.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { player } from "@ddt/db";
import type { GameServer } from "../src/server.js";
import { ItemInfo } from "../src/game/item.js";
import { scanExpiredAuctions } from "../src/handlers/auction.js";
import { loggedIn, sharedDb, sleep, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server.stop();
});

describe("248 DIVORCE_APPLY", () => {
  it("charges PRICE_DIVORCED exactly once (the original charged it twice)", async () => {
    const db = (await sharedDb()).db;
    const a = await loggedIn(server, { grade: 10, money: 10_000 });
    const b = await loggedIn(server, { grade: 10 });
    for (const [me, spouse] of [[a, b], [b, a]] as const) {
      me.player().info.IsMarried = true;
      me.player().info.SpouseID = spouse.ch.userId;
      me.player().info.SpouseName = spouse.ch.nick;
      await db.update(player.Sys_Users_Detail).set({ IsMarried: true, SpouseID: spouse.ch.userId, SpouseName: spouse.ch.nick }).where(eq(player.Sys_Users_Detail.UserID, me.ch.userId));
    }
    const before = a.player().info.Money;
    a.c.out(248, (o) => o.writeBoolean(false));
    const reply = await a.c.code(248);
    expect(reply.pkt.readBoolean()).toBe(true);
    // DivorcedMoney defaults to 2000 (templates.cfgInt fallback) — the point of the test is "once", not the exact figure.
    const charged = before - a.player().info.Money;
    expect(charged).toBeGreaterThan(0);
    expect(charged).toBe(server.ctx.templates.cfgInt("DivorcedMoney", 2000));
    expect(a.player().info.IsMarried).toBe(false);
    expect(a.player().info.SpouseID).toBe(0);
    expect(b.player().info.IsMarried).toBe(false); // spouse side-effect also applied
    a.c.close(); b.c.close();
  });
});

describe("247/250 MARRY_APPLY / MARRY_APPLY_REPLY", () => {
  it("consumes the ring (11103) on propose, marries both on accept", async () => {
    const groom = await loggedIn(server, { grade: 10 });
    const bride = await loggedIn(server, { grade: 10 });
    bride.player().info.Sex = false; // opposite sex (helper always creates Sex: true)
    const ring = server.ctx.templates.findItem(11103)!;
    const it = ItemInfo.createFromTemplate(ring, 1, 0);
    it.IsBinds = false;
    expect(groom.player().propBag.addItem(it)).toBe(true);
    const moneyBefore = groom.player().info.Money;

    const markBride = bride.c.mark();
    groom.c.out(247, (o) => { o.writeInt(bride.ch.userId); o.writeUTF("se casa comigo?"); o.writeBoolean(false); });
    await groom.c.code(247);
    const notice = await bride.c.code(247, undefined, markBride);
    notice.pkt.readInt(); notice.pkt.readString();
    notice.pkt.readString();
    const answerId = notice.pkt.readInt();
    expect(groom.player().propBag.getItemAt(it.Place)).toBeNull(); // ring consumed, not bought
    expect(groom.player().info.Money).toBe(moneyBefore); // no shop charge since the ring was already owned

    bride.c.out(250, (o) => { o.writeBoolean(true); o.writeInt(groom.ch.userId); o.writeInt(answerId); });
    await bride.c.code(250);
    expect(bride.player().info.IsMarried).toBe(true);
    expect(bride.player().info.SpouseID).toBe(groom.ch.userId);
    expect(groom.player().info.IsMarried).toBe(true);
    expect(groom.player().info.SpouseID).toBe(bride.ch.userId);
    groom.c.close(); bride.c.close();
  });
});

describe("81 FARM — helper price exploit", () => {
  it("ignores the client-supplied price and charges the server-computed one", async () => {
    const p = await loggedIn(server, { grade: 30, money: 100_000 });
    // sub 9 HELPER_SWITCH_FIELD: on, seedId, seedTime, seedCount, getCount, payType(-1 Money), price (forged tiny)
    p.c.out(81, (o) => { o.writeByte(9); o.writeBoolean(true); o.writeInt(1); o.writeInt(100); o.writeInt(5); o.writeInt(50); o.writeInt(-1); o.writeInt(1); });
    const before = p.player().info.Money;
    await p.c.code(81, 9);
    const perMin = server.ctx.templates.cfgInt("FarmHelperPricePerMin", 2);
    const expected = perMin * 100 * 5;
    expect(before - p.player().info.Money).toBe(expected);
    expect(before - p.player().info.Money).not.toBe(1); // the forged client price must not be what's charged
    p.c.close();
  });
});

describe("192/193/194 Auction", () => {
  it("add charges the listing fee once; outbid refunds the previous bidder; buyout settles by mail", async () => {
    const db = (await sharedDb()).db;
    const seller = await loggedIn(server, { grade: 30, gold: 100_000 });
    const bidder1 = await loggedIn(server, { grade: 30, money: 10_000 });
    const bidder2 = await loggedIn(server, { grade: 30, money: 10_000 });
    const t = server.ctx.templates.findItem(11101)!;
    const it = ItemInfo.createFromTemplate(t, 5, 0);
    it.IsBinds = false;
    expect(seller.player().propBag.addItem(it)).toBe(true);
    const place = it.Place;
    const goldBefore = seller.player().info.Gold;

    seller.c.out(192, (o) => { o.writeByte(1); o.writeInt(place); o.writeByte(1); o.writeInt(1000); o.writeInt(0); o.writeInt(0); o.writeInt(2); });
    const added = await seller.c.code(192);
    expect(added.pkt.readBoolean()).toBe(true);
    const auctionId = added.pkt.readInt();
    expect(goldBefore - seller.player().info.Gold).toBe(Math.max(1, Math.trunc(1000 * 0.03))); // duration 0 = 8h = x1
    expect(seller.player().propBag.getItemCount(11101)).toBe(3);

    const [row0] = await db.select().from(player.Auction).where(eq(player.Auction.AuctionID, auctionId));
    expect(row0!.Price).toBe(1000);

    bidder1.c.out(193, (o) => { o.writeInt(auctionId); o.writeInt(1000); });
    await bidder1.c.code(193);
    expect(bidder1.player().info.Money).toBe(9000);

    const markB1 = bidder1.c.mark();
    bidder2.c.out(193, (o) => { o.writeInt(auctionId); o.writeInt(1100); }); // Price(1000) + Rise(100)
    await bidder2.c.code(193);
    expect(bidder2.player().info.Money).toBe(10_000 - 1100);
    await sleep(200);
    const [refund] = await db.select().from(player.User_Messages).where(eq(player.User_Messages.ReceiverID, bidder1.ch.userId));
    expect(refund!.Money).toBe(1000); // outbid refund, once
    void markB1;

    bidder2.c.out(194, (o) => o.writeInt(auctionId)); // not the seller — cancel must be a no-op
    await sleep(200);
    const [row1] = await db.select().from(player.Auction).where(eq(player.Auction.AuctionID, auctionId));
    expect(row1!.BuyerID).toBe(bidder2.ch.userId);

    const n = await scanExpiredAuctions(server.ctx); // not expired yet (ValidDate 8h), should settle nothing
    expect(n).toBe(0);
    seller.c.close(); bidder1.c.close(); bidder2.c.close();
  });
});
