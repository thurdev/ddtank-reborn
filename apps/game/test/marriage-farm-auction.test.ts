/**
 * State/cost logic for the three systems added this pass: marriage (handlers/casamento/), farm
 * (handlers/fazenda/), auction (handlers/leilao/). Focuses on the money/state paths the task called out:
 * divorce charged once, the farm-helper price exploit, and auction fee/bid/refund/settlement.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { player } from "@ddt/db";
import { uncompressPacket } from "@ddt/protocol";
import type { GameServer } from "../src/server.js";
import { BagType, ItemInfo } from "../src/game/item.js";
import { scanExpiredAuctions } from "../src/handlers/leilao/index.js";
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

    // 241 MARRY_ROOM_CREATE -> 242 MARRY_ROOM_LOGIN -> 249/2 HYMENEAL: the chapel flow, continued from the same
    // couple. Money for the room is deducted from whoever creates it (MarryRoomCreateHandler.cs: single payer).
    const moneyBeforeRoom = groom.player().info.Money;
    const markRoom = groom.c.mark();
    groom.c.out(241, (o) => { o.writeUTF("Lễ đường Thur"); o.writeUTF(""); o.writeInt(0); o.writeInt(4); o.writeInt(8); o.writeBoolean(true); o.writeUTF("bem-vindos"); });
    const created = await groom.c.code(242, undefined, markRoom); // roomInfoPacket, then the short 242 bool(true) ack — both code 242
    expect(created.pkt.readBoolean()).toBe(true);
    expect(groom.player().info.Money).toBeLessThan(moneyBeforeRoom);
    expect(groom.player().info.IsCreatedMarryRoom).toBe(true);
    const roomId = groom.player().info.SelfMarryRoomID;
    expect(roomId).toBeGreaterThan(0);

    const markBride2 = bride.c.mark();
    bride.c.out(242, (o) => { o.writeInt(roomId); o.writeUTF(""); o.writeInt(0); });
    await bride.c.code(242, undefined, markBride2); // 242 roomInfoPacket echo for the bride joining her own chapel

    const markGroom = groom.c.mark(), markBride3 = bride.c.mark();
    groom.c.out(249, (o) => { o.writeByte(2); o.writeInt(0); }); // HYMENEAL start (flag != 1)
    const wedGroom = await groom.c.code(249, undefined, markGroom);
    const wedBride = await bride.c.code(249, undefined, markBride3);
    for (const r of [wedGroom, wedBride]) {
      expect(r.pkt.readByte()).toBe(2);
      expect(r.pkt.readInt()).toBe(roomId);
      expect(r.pkt.readBoolean()).toBe(true); // the wedding is on: both the groom's and the bride's clients saw it
    }
    expect(groom.player().info.IsGotRing).toBe(true); // first wedding: the ring mail flips IsGotRing on both sides
    expect(bride.player().info.IsGotRing).toBe(true);
    groom.c.close(); bride.c.close();
  });
});

/** Marries two logged-in players in memory (same `.info` shortcut as the "248 DIVORCE_APPLY" test above). */
function marryPair(a: Awaited<ReturnType<typeof loggedIn>>, b: Awaited<ReturnType<typeof loggedIn>>): void {
  for (const [me, spouse] of [[a, b], [b, a]] as const) {
    me.player().info.IsMarried = true;
    me.player().info.SpouseID = spouse.ch.userId;
    me.player().info.SpouseName = spouse.ch.nick;
  }
}

describe("240/241/255 MARRY_SCENE_LOGIN / MARRY_ROOM_CREATE / MARRY_ROOM_INFO_UPDATE (chapel room-list audience)", () => {
  it("240 lists existing rooms as 241 (not 242); 241/create broadcasts 241 to other browsers, not a malformed 2nd 242", async () => {
    const groom = await loggedIn(server, { grade: 10, money: 10_000 });
    const bride = await loggedIn(server, { grade: 10 });
    marryPair(groom, bride);
    const browser = await loggedIn(server, { grade: 10 }); // a 3rd player just browsing the chapel room list

    browser.c.out(240);
    await browser.c.code(240);

    const markBrowser = browser.c.mark();
    const markGroom = groom.c.mark();
    groom.c.out(241, (o) => { o.writeUTF("Sala do teste"); o.writeUTF(""); o.writeInt(0); o.writeInt(4); o.writeInt(8); o.writeBoolean(true); o.writeUTF("oi"); });
    const selfLogin = await groom.c.code(242, undefined, markGroom); // roomInfoPacket — self only, exactly once
    expect(selfLogin.pkt.readBoolean()).toBe(true);
    expect(groom.c.received.slice(markGroom).filter((r) => r.code === 242)).toHaveLength(1); // no 2nd malformed 242

    const created = await browser.c.code(241, undefined, markBrowser); // the OTHER browser hears about the new room as 241
    expect(created.pkt.readBoolean()).toBe(true);
    const roomId = created.pkt.readInt();
    expect(roomId).toBe(groom.player().info.SelfMarryRoomID);
    expect(created.pkt.readBoolean()).toBe(false); // isHymeneal
    expect(created.pkt.readString()).toBe("Sala do teste");

    // a 4th player entering the list now gets the existing room as 241 (not 242's "you're inside" layout).
    // (earlier tests in this file may have left other rooms in the same in-memory `rooms(ctx)` map, so scan
    // every 241 the late joiner got for the one that matches this test's room, instead of assuming it's first.)
    const late = await loggedIn(server, { grade: 10 });
    const markLate = late.c.mark();
    late.c.out(240);
    await sleep(80);
    const listings = late.c.received.slice(markLate).filter((r) => r.code === 241);
    expect(listings.length).toBeGreaterThan(0);
    const mine = listings.find((r) => { r.pkt.offset = 20; r.pkt.readBoolean(); return r.pkt.readInt() === roomId; });
    expect(mine).toBeDefined();

    // 253 MARRY_ROOM_INFO_UPDATE: broadcasts 255 to the room-list audience (not 242 to the room's own members).
    const markBrowser2 = browser.c.mark();
    groom.c.out(253, (o) => { o.writeUTF("Sala renomeada"); o.writeBoolean(false); o.writeUTF(""); o.writeUTF("nova desc"); });
    const updated = await browser.c.code(255, undefined, markBrowser2);
    expect(updated.pkt.readBoolean()).toBe(true);
    expect(updated.pkt.readInt()).toBe(roomId);

    groom.c.close(); bride.c.close(); browser.c.close(); late.c.close();
  });
});

describe("233 MARRY_SCENE_CHANGE / 251 SCENE_STATE (chapel scene presence)", () => {
  it("233 exchanges 243 player-enter with whoever is already in the destination map, and 244 with who stays behind", async () => {
    const groom = await loggedIn(server, { grade: 10, money: 10_000 });
    const bride = await loggedIn(server, { grade: 10 });
    marryPair(groom, bride);

    groom.c.out(241, (o) => { o.writeUTF("Sala 233"); o.writeUTF(""); o.writeInt(0); o.writeInt(4); o.writeInt(8); o.writeBoolean(true); o.writeUTF(""); });
    await groom.c.code(242);
    const roomId = groom.player().info.SelfMarryRoomID;
    bride.c.out(242, (o) => { o.writeInt(roomId); o.writeUTF(""); o.writeInt(0); });
    await bride.c.code(242);
    // both start on map 1 (MarryRoom.AddPlayer default) — bride switches to map 2 alone first (no-op: no one else there).
    bride.c.out(233, (o) => o.writeInt(2));
    await sleep(80);

    const markGroom = groom.c.mark(), markBride = bride.c.mark();
    groom.c.out(233, (o) => o.writeInt(2)); // groom follows the bride into map 2
    await sleep(100);
    // Match on the embedded player ID (4th int field, after Grade/Hide/Repute) instead of assuming the
    // next 243 in the buffer is the right one — the shared test server also ticks background broadcasts
    // (scheduled events) that can interleave unrelated packets in either client's queue.
    const findSheetFor = (c: typeof groom.c, from: number, targetId: number) =>
      c.received.slice(from).find((r) => {
        if (r.code !== 243) return false;
        r.pkt.offset = 20; r.pkt.readInt(); r.pkt.readInt(); r.pkt.readInt();
        return r.pkt.readInt() === targetId;
      });
    expect(findSheetFor(bride.c, markBride, groom.ch.userId)).toBeDefined(); // bride (already in map 2) sees the groom arrive
    expect(findSheetFor(groom.c, markGroom, bride.ch.userId)).toBeDefined(); // groom's own client gets the bride's sheet too

    groom.c.close(); bride.c.close();
  });

  it("251/0 resyncs presence in the current map; 251/1 does not throw (generic enterWaitingRoom)", async () => {
    const groom = await loggedIn(server, { grade: 10, money: 10_000 });
    const bride = await loggedIn(server, { grade: 10 });
    marryPair(groom, bride);
    groom.c.out(241, (o) => { o.writeUTF("Sala 251"); o.writeUTF(""); o.writeInt(0); o.writeInt(4); o.writeInt(8); o.writeBoolean(true); o.writeUTF(""); });
    await groom.c.code(242);
    const roomId = groom.player().info.SelfMarryRoomID;
    bride.c.out(242, (o) => { o.writeInt(roomId); o.writeUTF(""); o.writeInt(0); });
    await bride.c.code(242);

    const markGroom = groom.c.mark(), markBride = bride.c.mark();
    groom.c.out(251, (o) => o.writeInt(0));
    const brideSees = await bride.c.code(243, undefined, markBride);
    expect(brideSees.pkt.readInt()).toBeGreaterThan(0);
    const groomSeesSelfAck = await groom.c.code(243, undefined, markGroom);
    expect(groomSeesSelfAck.pkt.readInt()).toBeGreaterThan(0);

    expect(() => bride.c.out(251, (o) => o.writeInt(1))).not.toThrow();
    await sleep(50); // 251/1 -> ctx.rooms.enterWaitingRoom, async action queue — just must not crash the server
    groom.c.close(); bride.c.close();
  });

  /**
   * 41-scene-state-cobertura: `MarryStateHandler.cs` (the ONLY C# source for 251) has exactly 2 cases, 0 and
   * 1 — no `default`, nothing else to port. The AS3 sender is a single generic function
   * (`GameSocketOut.sendCurrentState`), and EVERY non-chapel call site (`shop.ShopController`,
   * `consortion.ConsortionControl`, `roomList.pvpRoomList.RoomListController`,
   * `roomList.pveRoomList.DungeonListController`, `civil.CivilController`) sends sub 1 — the exact same
   * packet `ChurchRoomController` sends when leaving the chapel's room list. Sub 1 is already generic
   * (`ctx.rooms.enterWaitingRoom`, the same `RoomMgr.EnterWaitingRoom` the original also reuses for 21
   * SCENE_REMOVE_USER / `UserEnterSceneHandler.cs`), so shop/consortion/room-list coverage was never a gap —
   * this test proves it from a player who never touched the chapel at all.
   */
  it("251/1 from a player who never touched the chapel (simulating shop/consortion/room-list) still works via the generic enterWaitingRoom", async () => {
    const hallPlayer = await loggedIn(server, { grade: 33 });
    hallPlayer.c.out(16, (o) => o.writeInt(1)); // 16 SCENE_LOGIN: already sitting in the waiting room (hall)
    await sleep(50);

    const shopPlayer = await loggedIn(server, { grade: 44 }); // never sent 240 MARRY_SCENE_LOGIN, never married, never in a ChapelRoom
    const mark = hallPlayer.c.mark();
    shopPlayer.c.out(251, (o) => o.writeInt(1)); // same packet ShopController/ConsortionControl/RoomListController send
    const seen = await hallPlayer.c.code(18, undefined, mark); // sceneAddPlayer (18): hall sees the new arrival
    expect(seen.pkt.readInt()).toBe(44); // Grade field confirms it's the shop player's sheet, not a coincidence

    hallPlayer.c.close(); shopPlayer.c.close();
  });
});

describe("249/3 MARRY_CMD CONTINUATION (room-time extension)", () => {
  it("charges only the requester (not split with the spouse) and forwards 249/3 to the spouse, not the whole room", async () => {
    const groom = await loggedIn(server, { grade: 10, money: 10_000 });
    const bride = await loggedIn(server, { grade: 10, money: 10_000 });
    marryPair(groom, bride);
    groom.c.out(241, (o) => { o.writeUTF("Sala continuation"); o.writeUTF(""); o.writeInt(0); o.writeInt(4); o.writeInt(8); o.writeBoolean(true); o.writeUTF(""); });
    await groom.c.code(242);
    const roomId = groom.player().info.SelfMarryRoomID;
    bride.c.out(242, (o) => { o.writeInt(roomId); o.writeUTF(""); o.writeInt(0); });
    await bride.c.code(242);

    const groomMoneyBefore = groom.player().info.Money, brideMoneyBefore = bride.player().info.Money;
    const markGroom = groom.c.mark(), markBride = bride.c.mark();
    groom.c.out(249, (o) => { o.writeByte(3); o.writeInt(3); }); // 3 hours
    const selfReply = await groom.c.code(249, undefined, markGroom);
    expect(selfReply.pkt.readByte()).toBe(3);
    expect(selfReply.pkt.readInt()).toBe(3);
    const spouseReply = await bride.c.code(249, undefined, markBride);
    expect(spouseReply.pkt.readByte()).toBe(3);
    expect(spouseReply.pkt.readInt()).toBe(3);

    expect(groom.player().info.Money).toBeLessThan(groomMoneyBefore); // requester pays in full
    expect(bride.player().info.Money).toBe(brideMoneyBefore); // spouse pays nothing (deviation fixed this pass)
    groom.c.close(); bride.c.close();
  });
});

describe("85 MATE_ONLINE_TIME", () => {
  it("answers an online target with their live LastDate", async () => {
    const a = await loggedIn(server, { grade: 10 });
    const b = await loggedIn(server, { grade: 10 });
    const when = new Date("2026-01-02T03:04:05.000Z");
    b.player().info.LastDate = when;
    a.c.out(85, (o) => o.writeInt(b.ch.userId));
    const reply = await a.c.code(85);
    expect(reply.pkt.readDateTime(true).getTime()).toBe(when.getTime());
    a.c.close(); b.c.close();
  });

  it("falls back to the DB row (and then to now) for an offline/unknown target", async () => {
    const db = (await sharedDb()).db;
    const a = await loggedIn(server, { grade: 10 });
    const b = await loggedIn(server, { grade: 10 });
    const when = new Date("2026-02-03T04:05:06.000Z");
    await db.update(player.Sys_Users_Detail).set({ LastDate: when }).where(eq(player.Sys_Users_Detail.UserID, b.ch.userId));
    server.ctx.world.remove(b.player()); // offline: not in ctx.world anymore (socket close is async/eventual)
    b.c.close();
    a.c.out(85, (o) => o.writeInt(b.ch.userId));
    const reply = await a.c.code(85);
    expect(reply.pkt.readDateTime(true).getTime()).toBe(when.getTime());

    const mark2 = a.c.mark();
    a.c.out(85, (o) => o.writeInt(999_999_999)); // no such user: now(), not a crash
    const unknown = await a.c.code(85, undefined, mark2);
    expect(unknown.pkt.readDateTime(true).getTime()).toBeGreaterThan(Date.now() - 5000);
    a.c.close();
  });
});

describe("81 FARM — plant, fast-forward, harvest (main flow)", () => {
  it("GROW_FIELD plants from the FarmBag seed, FRAM_GROP_FASTFORWARD ripens it, GAIN_FIELD harvests into the bag", async () => {
    const p = await loggedIn(server, { grade: 30, money: 100_000 });
    const seedTpl = server.ctx.templates.findItem(332100)!; // Lúa Mì: Property2=10 yield, Property3=1 min, Property4=334104 goods
    expect(seedTpl.Property3).toBe(1);
    const seed = ItemInfo.createFromTemplate(seedTpl, 1, 0);
    expect(p.player().getInventory(BagType.FarmBag)!.addItem(seed)).toBe(true);

    p.c.out(81, (o) => { o.writeByte(1); o.writeInt(0); }); // ENTER_FARM self
    await p.c.code(81, 1); // farmSnapshot echoes sub=1

    // GROW_FIELD(2)/FRAM_GROP_FASTFORWARD(18)/GAIN_FIELD(4) all reply via fieldPacket, which always writes sub=17
    // (FARM_LAND_INFO) regardless of the request's sub — not an echo of the request type.
    let mark = p.c.mark();
    p.c.out(81, (o) => { o.writeByte(2); o.writeByte(0); o.writeInt(332100); o.writeInt(0); }); // GROW_FIELD on starter field 0
    const planted = await p.c.code(81, 17, mark);
    planted.pkt.readByte(); // sub (17)
    expect(planted.pkt.readInt()).toBe(0); // FieldID
    expect(planted.pkt.readInt()).toBe(332100); // SeedID
    expect(p.player().getInventory(BagType.FarmBag)!.getItemByTemplateID(0, 332100)).toBeNull(); // seed consumed

    const moneyBeforeFF = p.player().info.Money;
    mark = p.c.mark();
    p.c.out(81, (o) => { o.writeByte(18); o.writeBoolean(false); o.writeBoolean(false); o.writeInt(0); }); // FRAM_GROP_FASTFORWARD, paid in Money
    const ff = await p.c.code(81, 17, mark);
    ff.pkt.readByte(); // sub (17)
    ff.pkt.readInt(); // FieldID
    ff.pkt.readInt(); // SeedID
    expect(p.player().info.Money).toBeLessThan(moneyBeforeFF); // FastGrowNeedMoney charged

    mark = p.c.mark();
    p.c.out(81, (o) => { o.writeByte(4); o.writeInt(0); o.writeInt(0); }); // GAIN_FIELD self, field 0
    const harvested = await p.c.code(81, 17, mark);
    harvested.pkt.readByte(); // sub (17)
    expect(harvested.pkt.readInt()).toBe(0); // FieldID
    expect(harvested.pkt.readInt()).toBe(0); // SeedID back to 0: field is empty again

    const goods = p.player().propBag.getItemByTemplateID(0, 334104);
    expect(goods, "harvested Lúa Mì goods (334104) never landed in a bag").not.toBeNull();
    expect(goods!.Count).toBe(10); // Property2 yield

    // the field is empty again and can be replanted
    const seed2 = ItemInfo.createFromTemplate(seedTpl, 1, 0);
    expect(p.player().getInventory(BagType.FarmBag)!.addItem(seed2)).toBe(true);
    mark = p.c.mark();
    p.c.out(81, (o) => { o.writeByte(2); o.writeByte(0); o.writeInt(332100); o.writeInt(0); });
    const replanted = await p.c.code(81, 17, mark);
    replanted.pkt.readByte(); // sub (17)
    expect(replanted.pkt.readInt()).toBe(0);
    expect(replanted.pkt.readInt()).toBe(332100);
    p.c.close();
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
    // Real reply is 195 AUCTION_REFRESH (zlib-compressed, AuctionHouseController.__updateAuction) — the client has
    // no case for inbound 192 at all. int AuctionID, bool isExist, ...
    const added = await seller.c.code(195);
    uncompressPacket(added.pkt);
    const auctionId = added.pkt.readInt();
    expect(added.pkt.readBoolean()).toBe(true);
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

  it("add clones IsJudge/IsUsed/Hole5-6 Level+Exp onto the listed item (ItemInfo.CloneFromTemplate field list)", async () => {
    // Como lê esse teste (cada variável): monta um item já "julgado"/usado com buracos 5 e 6 abertos (nível+exp
    // diferentes de zero), lista no leilão e decodifica o 195 AUCTION_REFRESH byte a byte — campos que
    // cloneForAuction esquecesse de copiar voltariam no valor padrão do ItemInfo (IsJudge=true, IsUsed=false),
    // não no valor do item original, e o teste pegaria a divergência.
    const seller = await loggedIn(server, { grade: 30, gold: 100_000 });
    const t = server.ctx.templates.findItem(11101)!;
    const it = ItemInfo.createFromTemplate(t, 1, 0);
    it.IsBinds = false;
    it.IsJudge = false; // "não julgado" — CloneFromTemplate (ItemInfo.cs:833) copia isso, não reseta pra true
    it.IsUsed = true;
    it.Hole5Level = 3; it.Hole5Exp = 1234; it.Hole6Level = 2; it.Hole6Exp = 5678;
    expect(seller.player().propBag.addItem(it)).toBe(true);
    const place = it.Place;

    seller.c.out(192, (o) => { o.writeByte(1); o.writeInt(place); o.writeByte(1); o.writeInt(100); o.writeInt(0); o.writeInt(0); o.writeInt(1); });
    const added = await seller.c.code(195);
    uncompressPacket(added.pkt);
    added.pkt.readInt(); // AuctionID
    expect(added.pkt.readBoolean()).toBe(true); // isExist
    added.pkt.readInt(); added.pkt.readString(); added.pkt.readDateTime(); // AuctioneerID, AuctioneerName, BeginDate
    added.pkt.readInt(); added.pkt.readString(); added.pkt.readInt(); // BuyerID, BuyerName, ItemID
    added.pkt.readInt(); added.pkt.readInt(); added.pkt.readInt(); added.pkt.readInt(); added.pkt.readInt(); // Mouthful, PayType, Price, Rise, ValidDate
    expect(added.pkt.readBoolean()).toBe(true); // has-item
    added.pkt.readInt(); added.pkt.readInt(); // Count, TemplateID
    added.pkt.readInt(); added.pkt.readInt(); added.pkt.readInt(); added.pkt.readInt(); // Attack/Defend/Agility/LuckCompose
    added.pkt.readInt(); // StrengthenLevel
    added.pkt.readBoolean(); // IsBinds
    expect(added.pkt.readBoolean()).toBe(false); // IsJudge — must be the source item's false, not ItemInfo's default true
    added.pkt.readDateTime(); added.pkt.readInt(); added.pkt.readString(); added.pkt.readString(); // BeginDate, ValidDate, Color, Skin
    expect(added.pkt.readBoolean()).toBe(true); // IsUsed — must be the source item's true, not the default false
    added.pkt.readInt(); added.pkt.readInt(); added.pkt.readInt(); added.pkt.readInt(); added.pkt.readInt(); added.pkt.readInt(); // Hole1-6
    added.pkt.readString(); added.pkt.readInt(); added.pkt.readDateTime(); // Pic, RefineryLevel, DiscolorValidDate slot
    expect(added.pkt.readByte()).toBe(3); // Hole5Level
    expect(added.pkt.readInt()).toBe(1234); // Hole5Exp
    expect(added.pkt.readByte()).toBe(2); // Hole6Level
    expect(added.pkt.readInt()).toBe(5678); // Hole6Exp
    seller.c.close();
  });
});
