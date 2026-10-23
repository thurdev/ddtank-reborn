/**
 * 41-loja-estoque-global (168 GOODS_COUNT + 44 BUY_GOODS ShopID 20): estoque diário GLOBAL (servidor
 * inteiro, não por jogador) — `WorldMgr.GetAllShopFreeCount`/`UpdateShopFreeCount` nunca tinham sido
 * portados; 168 sempre respondia uma lista vazia e o ShopID 20 só checava o flag por jogador
 * (`ShopFinallyGottenTime`). Usa um item sintético de ShopID 20 (seed real não garante ter um com
 * `LimitCount` configurado) inserido direto nos mapas em memória de `Templates` (mesmo padrão de
 * `toShopItem(...)` usado em `handlers.test.ts`), sem tocar o banco.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import { loggedIn, startServer } from "./helpers.js";
import type { ShopItemInfo } from "../src/db/templates.js";
import { getAllShopFreeCount } from "../src/handlers/loja/estoque-diario.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server?.stop();
});

/** Item grátis de ShopID 20 (preço 0 em todas as 3 tiers), estoque global `limit`. */
function freeShop20Item(id: number, templateId: number, limit: number): ShopItemInfo {
  return {
    ID: id, ShopID: 20, TemplateID: templateId, BuyType: 0, IsBind: 1, Beat: 1, LimitCount: limit,
    AUnit: 1, APrice1: -1, AValue1: 0, APrice2: -1, AValue2: 0, APrice3: -1, AValue3: 0,
    BUnit: 7, BPrice1: -1, BValue1: 0, BPrice2: -1, BValue2: 0, BPrice3: -1, BValue3: 0,
    CUnit: 30, CPrice1: -1, CValue1: 0, CPrice2: -1, CValue2: 0, CPrice3: -1, CValue3: 0,
  };
}

describe("168 GOODS_COUNT + 44 BUY_GOODS ShopID 20 (chapel-free-item daily global stock)", () => {
  it("decrements a SHARED pool across different players (not per-player), refuses when sold out, and 168 reports the real remaining count", async () => {
    const tpl = server.ctx.templates;
    const anyShop = [...tpl.shop.values()].find((s) => tpl.findItem(s.TemplateID));
    expect(anyShop).toBeDefined();
    const templateId = anyShop!.TemplateID;
    const shopItemId = 9_900_001; // sentinel ID, doesn't collide with seed data
    tpl.shop.set(shopItemId, freeShop20Item(shopItemId, templateId, 2)); // global stock: only 2 units today
    tpl.showList.add(shopItemId);

    const a = await loggedIn(server, { money: 0 });
    const b = await loggedIn(server, { money: 0 });
    const c = await loggedIn(server, { money: 0 });

    const buy = (client: typeof a, expectSuccess: boolean) => async () => {
      const mark = client.c.mark();
      client.c.out(44, (x) => {
        x.writeInt(1);
        x.writeInt(shopItemId); x.writeInt(1); x.writeUTF(""); x.writeBoolean(false); x.writeUTF(""); x.writeInt(0);
      });
      // Sold-out refusal is an early `return` in comprar.ts (matching the original's `return 1`): no 44
      // reply at all, just a 3 sendMessage. Success always gets the 44 ack.
      await client.c.code(expectSuccess ? 44 : 3, undefined, mark);
      const bag = client.player().getItemInventory(tpl.findItem(templateId)!);
      const got = bag?.getItems().some((i) => i.TemplateID === templateId) ?? false;
      expect(got).toBe(expectSuccess);
    };

    // player A: 1st global unit (also consumes their own per-day flag).
    await buy(a, true)();
    expect(getAllShopFreeCount(server.ctx).find(([id]) => id === shopItemId)?.[1]).toBe(1);

    // player B (never bought before): the 2nd and LAST global unit — proves the pool is shared, not per-player.
    await buy(b, true)();
    expect(getAllShopFreeCount(server.ctx).find(([id]) => id === shopItemId)?.[1]).toBe(0);

    // player C: pool is empty — refused even though C never claimed their own daily item.
    await buy(c, false)();
    expect(getAllShopFreeCount(server.ctx).find(([id]) => id === shopItemId)?.[1]).toBe(0); // still 0, not negative

    // 168 GOODS_COUNT reports the real remaining count (0) for this shop item, matching the in-memory pool.
    const mark168 = c.c.mark();
    c.c.out(168);
    const reply = await c.c.code(168, undefined, mark168);
    const n1 = reply.pkt.readInt();
    const entries: Array<[number, number]> = [];
    for (let i = 0; i < n1; i++) entries.push([reply.pkt.readInt(), reply.pkt.readInt()]);
    expect(entries.find(([id]) => id === shopItemId)?.[1]).toBe(0);
    expect(reply.pkt.readInt()).toBe(0); // 3 trailing reserved ints (AbstractPacketLib.SendShopGoodsCountUpdate)
    expect(reply.pkt.readInt()).toBe(0);
    expect(reply.pkt.readInt()).toBe(0);

    a.c.close(); b.c.close(); c.c.close();
  });

  it("a cart that fails the overall funds check never burns a global stock slot (griefing fix, not in the exploit-replication sense but worth not reproducing)", async () => {
    const tpl = server.ctx.templates;
    const anyShop = [...tpl.shop.values()].find((s) => tpl.findItem(s.TemplateID));
    const templateId = anyShop!.TemplateID;
    const shopItemId = 9_900_002;
    tpl.shop.set(shopItemId, freeShop20Item(shopItemId, templateId, 5));
    tpl.showList.add(shopItemId);
    // an expensive 2nd line the player can't afford (ShopID 1, real seeded price).
    const expensive = [...tpl.shop.values()].find((s) => s.ShopID === 1 && tpl.isOnShop(s.ID) && s.AUnit > 0 && s.APrice1 === -1 && s.AValue1 > 0 && s.APrice2 === -1 && s.APrice3 === -1 && tpl.findItem(s.TemplateID));
    expect(expensive).toBeDefined();

    const { c, player: p } = await loggedIn(server, { money: 0 }); // can't afford the 2nd line at all
    const mark = c.mark();
    c.out(44, (x) => {
      x.writeInt(2);
      x.writeInt(shopItemId); x.writeInt(1); x.writeUTF(""); x.writeBoolean(false); x.writeUTF(""); x.writeInt(0);
      x.writeInt(expensive!.ID); x.writeInt(1); x.writeUTF(""); x.writeBoolean(false); x.writeUTF(""); x.writeInt(0);
    });
    await c.code(44, undefined, mark);
    const bag = p().getItemInventory(tpl.findItem(templateId)!);
    expect(bag?.getItems().some((i) => i.TemplateID === templateId) ?? false).toBe(false); // whole cart aborted, nothing delivered
    expect(getAllShopFreeCount(server.ctx).find(([id]) => id === shopItemId)).toBeUndefined(); // stock never touched

    c.close();
  });
});
