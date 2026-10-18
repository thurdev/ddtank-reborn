/**
 * M2 `m2-loja` (docs/plan/TASKS.md, research/6600/packets-m1.md "M2 loja/correio"): pins the 6600-only wire
 * differences found for shop (44 BUY_GOODS) and mail (116 SEND_MAIL) and the behavior they unlock (loja
 * barata/desconto via `goodsType===2`, anexo único com `Count` parcial no correio). Same method as
 * `client-6600-actions.test.ts`: build the packet the AS3 client of each `clientKind` actually sends (field
 * order confirmed against `GameSocketOut.as`/`UserBuyItemHandler.cs`/`UserSendMailHandler.cs`), run it
 * through the real handler via `FakeClient`, and assert the resulting server state.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { player } from "@ddt/db";
import type { GameServer } from "../src/server.js";
import { ItemInfo } from "../src/game/item.js";
import { toShopItemFromCheap, type ShopCheapRow } from "../src/db/templates.js";
import { loggedIn, sharedDb, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server?.stop();
});

describe("44 BUY_GOODS — client 6600 (goodsType + isBand fields, research/6600/packets-m1.md M2)", () => {
  it("normal shop (goodsType=1): the +2 fields (leading goodsType, trailing isBand) don't shift the other fields", async () => {
    const tpl = server.ctx.templates;
    const goods = [...tpl.shop.values()].find(
      (s) => s.ShopID === 1 && tpl.isOnShop(s.ID) && s.AUnit > 0 && s.APrice1 === -1 && s.AValue1 > 0 && s.APrice2 === -1 && s.APrice3 === -1 && tpl.findItem(s.TemplateID),
    );
    expect(goods).toBeDefined();
    const { c, player: p } = await loggedIn(server, { client: "6600", money: 1_000_000 });
    const money = p().info.Money;
    const m = c.mark();
    c.out(44, (x) => {
      x.writeInt(1); // count
      x.writeInt(1); // goodsType (1 = loja normal) — campo novo do 6600, ANTES do goodsId
      x.writeInt(goods!.ID); x.writeInt(1); x.writeUTF(""); x.writeBoolean(false); x.writeUTF(""); x.writeInt(0);
      x.writeBoolean(false); // isBand — campo novo do 6600, descartado pelo handler
      x.writeInt(0); // buyFrom (não lido pelo nosso handler, igual ao C# original depois do loop)
    });
    const r = await c.code(44, undefined, m);
    expect(r.pkt.readInt()).toBe(1);
    expect(p().info.Money).toBe(money - Math.trunc(goods!.AValue1 * goods!.Beat));
    const t = tpl.findItem(goods!.TemplateID)!;
    const bag = p().getItemInventory(t)!;
    expect(bag.getItems().find((i) => i.TemplateID === goods!.TemplateID)).toBeDefined();
    c.close();
  });

  it("loja barata/desconto (goodsType=2): resolve via tpl.shopCheap (Shop_Cheap_Items), não Shop_Goods", async () => {
    const tpl = server.ctx.templates;
    const anyItem = 11101; // mesmo template usado em mail.test.ts — garantido presente no seed e empilhável
    const cheapId = 900001;
    const row: ShopCheapRow = {
      ID: cheapId, TemplateID: anyItem, LableType: 0, LimitGrade: 0,
      AUnit: 1, APrice: -1, AValue: 777, BUnit: 0, BPrice: 0, BValue: 0, CUnit: 0, CPrice: 0, CValue: 0,
      StartDate: new Date(0), EndDate: new Date(Date.now() + 86_400_000), BuyType: 0,
    } as ShopCheapRow;
    tpl.shopCheap.set(cheapId, row);
    // confere o mapeamento ShopMgr.GetShopItemDisCountById (ShopID forçado a 3, só 1 preço por tier)
    const shopItem = toShopItemFromCheap(row);
    expect(shopItem).toMatchObject({ ShopID: 3, APrice1: -1, APrice2: 0, APrice3: 0, AValue1: 777 });
    const { c, player: p } = await loggedIn(server, { client: "6600", money: 1_000_000 });
    const money = p().info.Money;
    const m = c.mark();
    c.out(44, (x) => {
      x.writeInt(1);
      x.writeInt(2); // goodsType = 2 -> loja barata (ShopMgr.GetShopItemDisCountById)
      x.writeInt(cheapId); x.writeInt(1); x.writeUTF(""); x.writeBoolean(false); x.writeUTF(""); x.writeInt(0);
      x.writeBoolean(true); // isBand: descartado também pro caminho da loja barata
      x.writeInt(0);
    });
    const r = await c.code(44, undefined, m);
    expect(r.pkt.readInt()).toBe(1);
    expect(p().info.Money).toBe(money - 777);
    const t = tpl.findItem(anyItem)!;
    const bag = p().getItemInventory(t)!;
    expect(bag.getItems().some((i) => i.TemplateID === anyItem)).toBe(true);
    tpl.shopCheap.delete(cheapId);
    c.close();
  });

  it("loja barata expirada (EndDate <= now) é tratada como item inexistente (ShopMgr.IsOnShop EndDate > Now)", async () => {
    const tpl = server.ctx.templates;
    const anyItem = 11101;
    const cheapId = 900002;
    tpl.shopCheap.set(cheapId, {
      ID: cheapId, TemplateID: anyItem, LableType: 0, LimitGrade: 0,
      AUnit: 1, APrice: -1, AValue: 1, BUnit: 0, BPrice: 0, BValue: 0, CUnit: 0, CPrice: 0, CValue: 0,
      StartDate: new Date(0), EndDate: new Date(0), BuyType: 0,
    } as ShopCheapRow);
    const { c, player: p } = await loggedIn(server, { client: "6600", money: 1_000_000 });
    const money = p().info.Money;
    const m = c.mark();
    c.out(44, (x) => {
      x.writeInt(1);
      x.writeInt(2);
      x.writeInt(cheapId); x.writeInt(1); x.writeUTF(""); x.writeBoolean(false); x.writeUTF(""); x.writeInt(0);
      x.writeBoolean(false);
      x.writeInt(0);
    });
    // "buy.length === 0" -> handler retorna sem mandar o ack 44; confere que nada foi cobrado nem respondido.
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 44)).toBe(false);
    expect(p().info.Money).toBe(money);
    tpl.shopCheap.delete(cheapId);
    c.close();
  });
});

describe("116 SEND_MAIL — client 6600 (anexo único com Count parcial, research/6600/packets-m1.md M2)", () => {
  it("destaca só `count` unidades da pilha; a sobra fica na bolsa do remetente", async () => {
    const db = (await sharedDb()).db;
    const a = await loggedIn(server, { client: "6600", gold: 1000, money: 500 });
    const b = await loggedIn(server, { client: "6600" });
    const t = server.ctx.templates.findItem(11101)!;
    const it = ItemInfo.createFromTemplate(t, 5, 0);
    it.IsBinds = false;
    expect(a.player().propBag.addItem(it)).toBe(true);
    const place = it.Place;

    const m = b.c.mark();
    a.c.out(116, (o) => {
      o.writeUTF(b.ch.nick); o.writeUTF("hi"); o.writeUTF("body"); o.writeBoolean(false); o.writeInt(0); o.writeInt(0);
      o.writeByte(1); o.writeInt(place); o.writeInt(2); // bagType, place, Count (6600: só 1 slot, com Count)
    });
    const ok = await a.c.code(116);
    expect(ok.pkt.readBoolean()).toBe(true);
    await b.c.code(117, undefined, m); // MAIL_RESPONSE -> recarrega LoadUserMail.ashx

    // sobra (5-2=3) volta pra bolsa do remetente como linha nova
    expect(a.player().propBag.getItemCount(11101)).toBe(3);
    expect(a.player().info.Gold).toBe(900); // taxa de 100 Ouro cobrada

    const [mail] = await db.select().from(player.User_Messages).where(eq(player.User_Messages.ReceiverID, b.ch.userId));
    expect(mail!.Annex1).toBeTruthy();
    const goods = (await db.select().from(player.Sys_Users_Goods).where(eq(player.Sys_Users_Goods.ItemID, Number(mail!.Annex1))))[0]!;
    expect(goods.Count).toBe(2);
    expect(goods.UserID).toBe(0);
    a.c.close();
    b.c.close();
  });

  it("item travado: sem anexo (filtro silencioso, igual à 4.1), mas a carta ainda vai se tiver Money", async () => {
    const db = (await sharedDb()).db;
    const a = await loggedIn(server, { client: "6600", gold: 1000, money: 500 });
    const b = await loggedIn(server, { client: "6600" });
    const t = server.ctx.templates.findItem(11101)!;
    const it = ItemInfo.createFromTemplate(t, 1, 0);
    it.IsBinds = true; // travado -> bloco de anexo do 6600 não roda
    expect(a.player().propBag.addItem(it)).toBe(true);
    const place = it.Place;

    a.c.out(116, (o) => {
      o.writeUTF(b.ch.nick); o.writeUTF("hi"); o.writeUTF("body"); o.writeBoolean(false); o.writeInt(0); o.writeInt(50);
      o.writeByte(1); o.writeInt(place); o.writeInt(1);
    });
    const ok = await a.c.code(116);
    expect(ok.pkt.readBoolean()).toBe(true);
    // item travado nunca saiu da bolsa
    expect(a.player().propBag.getItemAt(place)?.ItemID).toBe(it.ItemID);
    const [mail] = await db.select().from(player.User_Messages).where(eq(player.User_Messages.ReceiverID, b.ch.userId));
    expect(mail!.Annex1).toBeFalsy();
    expect(mail!.Money).toBe(50);
    a.c.close();
    b.c.close();
  });

  it("count maior que a pilha: mensagem de erro e NENHUM 116 de volta (UserSendMailHandler.cs 6600: return 0 sem SendTCP)", async () => {
    const a = await loggedIn(server, { client: "6600", gold: 1000 });
    const b = await loggedIn(server, { client: "6600" });
    const t = server.ctx.templates.findItem(11101)!;
    const it = ItemInfo.createFromTemplate(t, 1, 0);
    it.IsBinds = false;
    expect(a.player().propBag.addItem(it)).toBe(true);
    const place = it.Place;
    const m = a.c.mark();
    a.c.out(116, (o) => {
      o.writeUTF(b.ch.nick); o.writeUTF("hi"); o.writeUTF("body"); o.writeBoolean(false); o.writeInt(0); o.writeInt(0);
      o.writeByte(1); o.writeInt(place); o.writeInt(99); // count > item.Count (1)
    });
    await new Promise((res) => setTimeout(res, 150));
    expect(a.c.received.slice(m).some((r) => r.code === 116)).toBe(false); // sem reply
    expect(a.player().propBag.getItemAt(place)?.ItemID).toBe(it.ItemID); // item intacto, nada cobrado
    a.c.close();
    b.c.close();
  });
});
