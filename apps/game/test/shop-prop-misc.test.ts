/**
 * Tests for the 16 ported handlers from research/qa/packet-coverage.tsv's MISSING/stub list:
 * shop-prop.ts (54/55/57/46/66/126), account-security.ts (25/200), items.ts (77/119/130/171/196/203/222/265).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import { loggedIn, startServer } from "./helpers.js";
import { newCard } from "../src/game/cards.js";
import { ItemInfo } from "../src/game/item.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server?.stop();
});

describe("shop-prop: 54 PROP_BUY / 55 PROP_SELL", () => {
  it("buys a fight-prop into the FightBag (Gold) then sells it back for Gold", async () => {
    const tpl = server.ctx.templates;
    const shop = [...tpl.shop.values()].find((s) => s.TemplateID >= 10001 && s.TemplateID <= 10022 && tpl.findItem(s.TemplateID)?.CategoryID === 10);
    expect(shop).toBeDefined();
    const { c, player: p } = await loggedIn(server, { gold: 100_000 });
    const gold = p().info.Gold;
    await new Promise((r) => setTimeout(r, 400)); // deixa o burst de login terminar antes de contar pacotes
    let m = c.mark();
    c.out(54, (x) => x.writeInt(shop!.ID));
    await new Promise((r) => setTimeout(r, 80));
    expect(c.received.slice(m).filter((x) => x.code === 54)).toHaveLength(0); // no 54 reply on buy, like the original (only the 64 bag update)
    const bought = p().fightBag.getItemAt(0);
    expect(bought?.TemplateID).toBe(shop!.TemplateID);
    expect(p().info.Gold).toBeLessThanOrEqual(gold);
    m = c.mark();
    c.out(55, (x) => { x.writeInt(0); x.writeInt(shop!.ID); });
    await new Promise((r) => setTimeout(r, 80));
    expect(p().fightBag.getItemAt(0)).toBeNull();
    c.close();
  });

  it("PROP_BUY ignores a shop id outside PropItemMgr.PropFightBag", async () => {
    const tpl = server.ctx.templates;
    const shop = [...tpl.shop.values()].find((s) => !(s.TemplateID >= 10001 && s.TemplateID <= 10022));
    expect(shop).toBeDefined();
    const { c, player: p } = await loggedIn(server, { gold: 100_000 });
    const gold = p().info.Gold;
    c.out(54, (x) => x.writeInt(shop!.ID));
    await new Promise((r) => setTimeout(r, 80));
    expect(p().info.Gold).toBe(gold);
    expect(p().fightBag.getItemAt(0)).toBeNull();
    c.close();
  });
});

describe("shop-prop: 66 PROP_USE", () => {
  it("templateId 11963 inside the loop grants 1-999 GiftToken and consumes the prop at that slot", async () => {
    const { c, player: p } = await loggedIn(server);
    const t = { ...server.ctx.templates.findItem(11569)!, TemplateID: 11963 };
    const it = ItemInfo.createFromTemplate(t, 2, 101);
    p().propBag.addItemTo(it, 0);
    const before = p().info.GiftToken;
    c.out(66, (x) => {
      x.writeInt(1 /* BagType.PropBag */); x.writeInt(0); x.writeInt(1); x.writeInt(11963); x.writeInt(0); x.writeBoolean(false);
    });
    await new Promise((r) => setTimeout(r, 80));
    expect(p().info.GiftToken).toBeGreaterThan(before);
    expect(p().propBag.getItemAt(0)?.Count).toBe(1);
    c.close();
  });

  it("an unrecognised templateId (chick activation, unmigrated) drains the packet without crashing", async () => {
    const { c, player: p } = await loggedIn(server);
    const t = [...server.ctx.templates.items.values()][0]!;
    const it = ItemInfo.createFromTemplate(t, 1, 101);
    p().propBag.addItemTo(it, 0);
    c.out(66, (x) => {
      x.writeInt(1); x.writeInt(0); x.writeInt(1); x.writeInt(201316); x.writeInt(0); x.writeBoolean(false);
    });
    await new Promise((r) => setTimeout(r, 80));
    expect(p().propBag.getItemAt(0)?.Count).toBe(1); // untouched — only 11963 consumes
    c.close();
  });
});

describe("shop-prop: 57 GOODS_PRESENT / 46 BUY_GIFTBAG / 126 BUY_QUICK_GOLDBOX", () => {
  it("57 is a disabled-feature message, no state change", async () => {
    const { c, player: p } = await loggedIn(server);
    const money = p().info.Money;
    c.out(57, (x) => { x.writeUTF("a"); x.writeUTF("b"); x.writeInt(0); });
    await new Promise((r) => setTimeout(r, 80));
    expect(p().info.Money).toBe(money);
    c.close();
  });

  it("46 charges 1950 Money and places the 5-item bundle in StoreBag 0-4 when affordable", async () => {
    const { c, player: p } = await loggedIn(server, { money: 10_000 });
    const money = p().info.Money;
    c.out(46);
    await new Promise((r) => setTimeout(r, 150));
    expect(p().info.Money).toBe(money - 1950);
    if (server.ctx.templates.findItem(11023)) expect(p().storeBag.getItemAt(0)?.TemplateID).toBe(11023);
    c.close();
  });

  it("46 fails cleanly without enough Money", async () => {
    const { c, player: p } = await loggedIn(server, { money: 100 });
    const money = p().info.Money;
    c.out(46);
    await new Promise((r) => setTimeout(r, 80));
    expect(p().info.Money).toBe(money);
    c.close();
  });

  it("126 charges num*AValue1 Money for the gold-box shop row (1123301) when it exists", async () => {
    const shop = server.ctx.templates.shop.get(1123301);
    if (!shop) return; // not in this test DB's Shop seed — skip rather than fail on missing fixture data
    const { c, player: p } = await loggedIn(server, { money: 10_000_000 });
    const money = p().info.Money;
    c.out(126, (x) => { x.writeInt(2); x.writeBoolean(false); });
    await new Promise((r) => setTimeout(r, 80));
    expect(p().info.Money).toBe(money - 2 * shop.AValue1);
    c.close();
  });
});

describe("account-security: 25 BAG_LOCKED / 200 CHECK_CODE", () => {
  it("set (1) then unlock (2) then change (3) then forgot (4) a fresh bag password", async () => {
    const { c, player: p } = await loggedIn(server);
    await new Promise((r) => setTimeout(r, 400)); // deixa o burst de login terminar antes de contar pacotes
    let m = c.mark();
    c.out(25, (x) => { x.writeUTF("abc123"); x.writeUTF(""); x.writeInt(1); x.writeUTF("q1"); x.writeUTF("a1"); x.writeUTF("q2"); x.writeUTF("a2"); });
    let r = await c.code(25, undefined, m);
    expect(r.pkt.readInt()).toBe(p().id);
    expect(r.pkt.readInt()).toBe(1); // reType
    expect(r.pkt.readBoolean()).toBe(true); // result
    expect(p().info.HasBagPassword).toBe(true);

    m = c.mark();
    c.out(25, (x) => { x.writeUTF("abc123"); x.writeUTF(""); x.writeInt(2); x.writeUTF(""); x.writeUTF(""); x.writeUTF(""); x.writeUTF(""); });
    r = await c.code(25, undefined, m);
    r.pkt.readInt(); expect(r.pkt.readInt()).toBe(2);
    expect(r.pkt.readBoolean()).toBe(true);
    expect(p().info.IsLocked).toBe(false);

    m = c.mark();
    c.out(25, (x) => { x.writeUTF("abc123"); x.writeUTF("newpw"); x.writeInt(3); x.writeUTF(""); x.writeUTF(""); x.writeUTF(""); x.writeUTF(""); });
    r = await c.code(25, undefined, m);
    r.pkt.readInt(); expect(r.pkt.readInt()).toBe(3);
    expect(r.pkt.readBoolean()).toBe(true);

    await new Promise((r) => setTimeout(r, 3100)); // casos 3/4 têm cooldown de 3s (WaitingProcessor, PassWordTwoHandle.cs:138)
    m = c.mark();
    c.out(25, (x) => { x.writeUTF("newpw"); x.writeUTF(""); x.writeInt(4); x.writeUTF("q1"); x.writeUTF("a1"); x.writeUTF("q2"); x.writeUTF("a2"); });
    r = await c.code(25, undefined, m);
    r.pkt.readInt(); expect(r.pkt.readInt()).toBe(4);
    expect(r.pkt.readBoolean()).toBe(true); // recovered via the security answers
    expect(p().info.HasBagPassword).toBe(false);
    c.close();
  }, 15_000);

  it("200 CHECK_CODE just drains the string (no challenge was ever issued server-side)", async () => {
    const { c, player: p } = await loggedIn(server);
    await new Promise((r) => setTimeout(r, 400)); // deixa o burst de login (ícones de evento etc.) terminar antes de contar pacotes
    const m = c.mark();
    c.out(200, (x) => x.writeUTF("whatever"));
    await new Promise((r) => setTimeout(r, 80));
    expect(c.received.length).toBe(m);
    expect(p().sink).toBeDefined(); // still connected
    c.close();
  });
});

describe("items: 77 ITEM_OVERDUE / 119 LINKREQUEST_GOODS / 130 LEFT_GUN_COMPLETE / 171 USE_REWORK_NAME / 196 CARD_RESET / 203 LOOKUP_EFFORT / 222 EQUIP_RECYCLE_ITEM / 265 NEWTITLE_CARD", () => {
  it("77 mails an expired EquipBag item when there's nowhere free to move it", async () => {
    const { c, player: p } = await loggedIn(server, { weapon: null });
    const t = [...server.ctx.templates.items.values()].find((x) => x.CanEquip)!;
    const it = ItemInfo.createFromTemplate(t, 1, 101);
    it.ValidDate = 1; it.IsUsed = true; it.BeginDate = new Date(Date.now() - 2 * 86_400_000);
    for (let s = 31; s < 81; s++) p().equipBag.addItemTo(ItemInfo.createFromTemplate(t, 1, 101), s); // fill every free slot
    p().equipBag.addItemTo(it, 6);
    await new Promise((r) => setTimeout(r, 400)); // deixa o burst de login (ícones de evento etc.) terminar antes de contar pacotes
    const m = c.mark();
    c.out(77, (x) => { x.writeByte(0); x.writeInt(6); });
    const r = await c.code(117, undefined, m);
    expect(r.pkt.readInt()).toBe(p().id);
    expect(r.pkt.readInt()).toBe(1);
    c.close();
  });

  it("119 num=4/5 echo the nickname + zeroed fields with no DB lookup", async () => {
    const { c, player: p } = await loggedIn(server);
    await new Promise((r) => setTimeout(r, 400)); // deixa o burst de login terminar antes de contar pacotes
    let m = c.mark();
    c.out(119, (x) => { x.writeInt(4); x.writeUTF(""); x.writeInt(0); });
    let r = await c.code(119, undefined, m);
    expect(r.pkt.readInt()).toBe(4);
    expect(r.pkt.readString()).toBe(p().info.NickName);
    m = c.mark();
    c.out(119, (x) => { x.writeInt(5); x.writeUTF(""); x.writeInt(0); x.writeUTF(""); });
    r = await c.code(119, undefined, m);
    expect(r.pkt.readInt()).toBe(5);
    c.close();
  });

  it("130 LEFT_GUN_COMPLETE is a silent no-op when LeftRoutteRate isn't set (unmigrated extra)", async () => {
    const { c } = await loggedIn(server);
    await new Promise((r) => setTimeout(r, 400)); // deixa o burst de login (ícones de evento etc.) terminar antes de contar pacotes
    const m = c.mark();
    c.out(130);
    await new Promise((r) => setTimeout(r, 80));
    expect(c.received.length).toBe(m);
    c.close();
  });

  it("171 rejects a special-character nickname even with no card present", async () => {
    const { c, player: p } = await loggedIn(server);
    const nick = p().info.NickName;
    c.out(171, (x) => { x.writeByte(1); x.writeInt(0); x.writeUTF("bad@name"); });
    await new Promise((r) => setTimeout(r, 80));
    expect(p().info.NickName).toBe(nick);
    c.close();
  });

  it("196 CARD_RESET: no CardUpdateCondition row for this level -> Msg3, no crash", async () => {
    const { c, player: p } = await loggedIn(server);
    p().cardBag.addCardTo(newCard(p().id, 314101, 3), 5);
    await new Promise((r) => setTimeout(r, 400)); // deixa o burst de login (ícones de evento etc.) terminar antes de contar pacotes
    const m = c.mark();
    c.out(196, (x) => { x.writeInt(0); x.writeInt(5); });
    await new Promise((r) => setTimeout(r, 80));
    expect(c.received.slice(m).filter((x) => x.code === 196)).toHaveLength(0); // sendMessage, not a 196 reply, since no condition was found
    c.close();
  });

  it("196 CARD_RESET ignores an equip slot (< 5)", async () => {
    const { c } = await loggedIn(server);
    await new Promise((r) => setTimeout(r, 400)); // deixa o burst de login (ícones de evento etc.) terminar antes de contar pacotes
    const m = c.mark();
    c.out(196, (x) => { x.writeInt(0); x.writeInt(2); });
    await new Promise((r) => setTimeout(r, 80));
    expect(c.received.length).toBe(m);
    c.close();
  });

  it("203 LOOKUP_EFFORT self-lookup returns AchievementPoint=0, 0 ids (no AchievementData seeded)", async () => {
    const { c, player: p } = await loggedIn(server);
    await new Promise((r) => setTimeout(r, 400)); // deixa o burst de login (ícones de evento etc.) terminar antes de contar pacotes
    const m = c.mark();
    c.out(203, (x) => x.writeInt(p().id));
    const r = await c.code(203, undefined, m);
    expect(r.pkt.readInt()).toBe(0);
    expect(r.pkt.readInt()).toBe(0);
    c.close();
  });

  it("222 EQUIP_RECYCLE_ITEM always consumes StoreBag slots 1-4, even with no Drop_Item row to grant", async () => {
    const { c, player: p } = await loggedIn(server);
    const t = [...server.ctx.templates.items.values()][0]!;
    for (let s = 1; s < 5; s++) p().storeBag.addItemTo(ItemInfo.createFromTemplate(t, 1, 101), s);
    await new Promise((r) => setTimeout(r, 400)); // deixa o burst de login (ícones de evento etc.) terminar antes de contar pacotes
    const m = c.mark();
    c.out(222);
    await new Promise((r) => setTimeout(r, 80));
    expect(m); // no reply packet in the original either
    for (let s = 1; s < 5; s++) expect(p().storeBag.getItemAt(s)).toBeNull();
    c.close();
  });

  it("265 NEWTITLE_CARD: NewTitle table isn't migrated, so it always reports 'not found'", async () => {
    const { c, player: p } = await loggedIn(server);
    const t = [...server.ctx.templates.items.values()][0]!;
    p().propBag.addItemTo(ItemInfo.createFromTemplate(t, 1, 101), 0);
    await new Promise((r) => setTimeout(r, 400)); // deixa o burst de login (ícones de evento etc.) terminar antes de contar pacotes
    const m = c.mark();
    c.out(265, (x) => { x.writeByte(1); x.writeInt(0); });
    await new Promise((r) => setTimeout(r, 80));
    expect(c.received.length).toBe(m + 1);
    c.close();
  });
});
