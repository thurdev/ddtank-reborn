/**
 * M3 `m3-shop-buylimited` (docs/plan/TASKS.md): 288 SHOP_BUYLIMITEDCOUNT (6600 only — a 4.1 nunca manda esse
 * código) + o enforcement real contra `Shop.LimitCount` em `comprar.ts` (44 BUY_GOODS). O
 * `ShopBuyLimitedCountHandler.cs` decompilado sempre responde `int(0)` e nunca lê `LimitCount` — aqui
 * completamos o lado servidor com um contador por jogador+item+dia (`app."ShopBuyLimited"`).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import type { ShopItemInfo } from "../src/db/templates.js";
import { loggedIn, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server?.stop();
});

const GOODS_ID = 930001;
const ITEM_TEMPLATE = 11101; // mesmo item usado em mail.test.ts / client-6600-m2-loja.test.ts: empilhável, no seed

function setupLimitedGoods(server: GameServer): void {
  const row: ShopItemInfo = {
    ID: GOODS_ID, ShopID: 1, TemplateID: ITEM_TEMPLATE, BuyType: 0, IsBind: 1, Beat: 1, LimitCount: 2,
    AUnit: 1, APrice1: -1, AValue1: 100, APrice2: 0, AValue2: 0, APrice3: 0, AValue3: 0,
    BUnit: 0, BPrice1: 0, BValue1: 0, BPrice2: 0, BValue2: 0, BPrice3: 0, BValue3: 0,
    CUnit: 0, CPrice1: 0, CValue1: 0, CPrice2: 0, CValue2: 0, CPrice3: 0, CValue3: 0,
  };
  server.ctx.templates.shop.set(GOODS_ID, row);
  server.ctx.templates.showList.add(GOODS_ID);
}

function buyOnce(c: import("./helpers.js").FakeClient): void {
  c.out(44, (x) => {
    x.writeInt(1); // count (1 linha)
    x.writeInt(1); // goodsType = 1 (loja normal)
    x.writeInt(GOODS_ID); x.writeInt(1); x.writeUTF(""); x.writeBoolean(false); x.writeUTF(""); x.writeInt(0);
    x.writeBoolean(false); // isBand — descartado
  });
}

describe("288 SHOP_BUYLIMITEDCOUNT + Shop.LimitCount em 44 BUY_GOODS (6600)", () => {
  it("288 sem compras hoje: lista vazia", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(288);
    const r = await c.code(288, undefined, m);
    expect(r.pkt.readInt()).toBe(0);
    c.close();
  });

  it("compra até o LimitCount passa, a próxima é bloqueada sem cobrar 3ª vez, e 288 reflete o contador", async () => {
    setupLimitedGoods(server);
    const { c, player: p } = await loggedIn(server, { client: "6600", money: 100_000 });
    const start = p().info.Money;

    const m1 = c.mark();
    buyOnce(c);
    await c.code(44, undefined, m1);
    expect(p().info.Money).toBe(start - 100);

    const m2 = c.mark();
    buyOnce(c);
    await c.code(44, undefined, m2);
    expect(p().info.Money).toBe(start - 200); // 2ª compra, ainda no limite (LimitCount=2)

    // 3ª compra: linha é descartada (continue), nenhum pacote 44 sai, sem cobrança
    const m3 = c.mark();
    buyOnce(c);
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m3).some((r) => r.code === 44)).toBe(false);
    expect(p().info.Money).toBe(start - 200); // sem 3ª cobrança (sem exploit de ultrapassar o limite)

    const m4 = c.mark();
    c.out(288);
    const r = await c.code(288, undefined, m4);
    expect(r.pkt.readInt()).toBe(1);
    expect(r.pkt.readInt()).toBe(GOODS_ID);
    expect(r.pkt.readInt()).toBe(2); // contador persistido = 2 compras bem-sucedidas, não 3
    c.close();
  });

  it("LimitCount 0/não configurado: compra sem limite, sem contador novo (sem mudar comportamento existente)", async () => {
    const otherId = 930002;
    const row: ShopItemInfo = {
      ID: otherId, ShopID: 1, TemplateID: ITEM_TEMPLATE, BuyType: 0, IsBind: 1, Beat: 1, LimitCount: 0,
      AUnit: 1, APrice1: -1, AValue1: 50, APrice2: 0, AValue2: 0, APrice3: 0, AValue3: 0,
      BUnit: 0, BPrice1: 0, BValue1: 0, BPrice2: 0, BValue2: 0, BPrice3: 0, BValue3: 0,
      CUnit: 0, CPrice1: 0, CValue1: 0, CPrice2: 0, CValue2: 0, CPrice3: 0, CValue3: 0,
    };
    server.ctx.templates.shop.set(otherId, row);
    server.ctx.templates.showList.add(otherId);
    const { c, player: p } = await loggedIn(server, { client: "6600", money: 100_000 });
    const start = p().info.Money;
    for (let i = 0; i < 3; i++) {
      const m = c.mark();
      c.out(44, (x) => {
        x.writeInt(1); x.writeInt(1);
        x.writeInt(otherId); x.writeInt(1); x.writeUTF(""); x.writeBoolean(false); x.writeUTF(""); x.writeInt(0);
        x.writeBoolean(false);
      });
      await c.code(44, undefined, m);
    }
    expect(p().info.Money).toBe(start - 150); // 3 compras, nenhuma bloqueada
    const m4 = c.mark();
    c.out(288);
    const r = await c.code(288, undefined, m4);
    expect(r.pkt.readInt()).toBe(0); // sem LimitCount configurado -> nunca grava contador
    c.close();
  });
});
