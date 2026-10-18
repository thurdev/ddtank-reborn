/**
 * M3 `m3-mystery-shop` (docs/plan/TASKS.md): 278 MYSTERY_SHOP ("Loja Cigana", `gypsyshop.swf`, 6600 only — a
 * 4.1 nunca manda esse código). Template em memória (`server.ctx.templates.mysteryShop`, 0 linhas na origem,
 * ver `handlers/loja/loja-cigana.ts`), pacote via `FakeClient`, decodifica a resposta na ordem exata que
 * `PlayerActives.cs:SendGypsyShopPlayerInfo`/`GypsyShopBuy.cs` escrevem.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import { loggedIn, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server?.stop();
});

function setupPool(server: GameServer): void {
  server.ctx.templates.mysteryShop = new Map([
    [1, [
      { ID: 920001, LableType: 1, InfoID: 11101, Unit: 1, Num: 3, Price: 500, CanBuy: 1, Random: 10 },
      { ID: 920002, LableType: 1, InfoID: 11101, Unit: 2, Num: 1, Price: 50, CanBuy: 1, Random: 10 },
    ]],
    [2, [
      { ID: 920003, LableType: 2, InfoID: 11101, Unit: 1, Num: 1, Price: 100, CanBuy: 1, Random: 1 },
    ]],
  ]);
}

describe("278 MYSTERY_SHOP — Loja Cigana (6600)", () => {
  it("sub 2 (PLAYER_INFO) sem pool configurada: 0 slots, sem crash (robustez sobre GetRateAward)", async () => {
    server.ctx.templates.mysteryShop = new Map();
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(278, (o) => o.writeByte(2));
    const r = await c.code(278, 2, m);
    expect(r.pkt.readByte()).toBe(2);
    expect(r.pkt.readInt()).toBe(0); // CurRefreshedTimes
    expect(r.pkt.readInt()).toBe(0); // length
    c.close();
  });

  it("sub 2 rola até 8 slots (ou o tamanho da pool) e persiste entre chamadas no mesmo dia", async () => {
    setupPool(server);
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(278, (o) => o.writeByte(2));
    const r = await c.code(278, 2, m);
    expect(r.pkt.readByte()).toBe(2);
    expect(r.pkt.readInt()).toBe(0);
    const n = r.pkt.readInt();
    expect(n).toBeGreaterThan(0);
    const firstRoll: number[] = [];
    for (let i = 0; i < n; i++) {
      const gypsyId = r.pkt.readInt(); r.pkt.readInt(); r.pkt.readInt(); r.pkt.readInt(); r.pkt.readInt(); r.pkt.readInt();
      firstRoll.push(gypsyId);
    }
    // segunda chamada no mesmo dia: mesmos slots (persistidos, sem re-rolar)
    const m2 = c.mark();
    c.out(278, (o) => o.writeByte(2));
    const r2 = await c.code(278, 2, m2);
    r2.pkt.readByte(); r2.pkt.readInt();
    const n2 = r2.pkt.readInt();
    const secondRoll: number[] = [];
    for (let i = 0; i < n2; i++) { secondRoll.push(r2.pkt.readInt()); r2.pkt.readInt(); r2.pkt.readInt(); r2.pkt.readInt(); r2.pkt.readInt(); r2.pkt.readInt(); }
    expect(secondRoll).toEqual(firstRoll);
    c.close();
  });

  it("sub 3 (BUY) com Unit=1 cobra Money, dá o item e zera CanBuy (sem comprar 2x)", async () => {
    setupPool(server);
    const { c, player: p } = await loggedIn(server, { client: "6600", money: 10_000 });
    c.out(278, (o) => o.writeByte(2));
    const info = await c.code(278, 2);
    info.pkt.readByte(); info.pkt.readInt();
    const n = info.pkt.readInt();
    const slots: { id: number; unit: number; price: number }[] = [];
    for (let i = 0; i < n; i++) {
      const id = info.pkt.readInt(); const unit = info.pkt.readInt(); const price = info.pkt.readInt();
      info.pkt.readInt(); info.pkt.readInt(); info.pkt.readInt();
      slots.push({ id, unit, price });
    }
    const target = slots.find((s) => s.unit === 1);
    expect(target).toBeDefined();
    const before = p().info.Money;
    const t = server.ctx.templates;
    const itemsBefore = p().getTemplateCount(11101, t.findItem);

    const m = c.mark();
    c.out(278, (o) => { o.writeByte(3); o.writeInt(target!.id); o.writeBoolean(false); });
    const r = await c.code(278, 3, m);
    expect(r.pkt.readByte()).toBe(3);
    expect(r.pkt.readInt()).toBe(target!.id);
    expect(r.pkt.readBoolean()).toBe(true);
    expect(r.pkt.readInt()).toBe(0); // CanBuy zerado
    expect(p().info.Money).toBe(before - target!.price);
    expect(p().getTemplateCount(11101, t.findItem)).toBeGreaterThan(itemsBefore);

    // comprar de novo o mesmo slot falha (CanBuy já é 0)
    const m2 = c.mark();
    c.out(278, (o) => { o.writeByte(3); o.writeInt(target!.id); o.writeBoolean(false); });
    const r2 = await c.code(278, 3, m2);
    expect(r2.pkt.readByte()).toBe(3);
    expect(r2.pkt.readInt()).toBe(target!.id);
    expect(r2.pkt.readBoolean()).toBe(false);
    expect(p().info.Money).toBe(before - target!.price); // sem cobrar 2x
    c.close();
  });

  it("sub 3 com Unit=2 (Honor) falha sem saldo e não cobra nem dá o item", async () => {
    setupPool(server);
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    p().info.myHonor = 0;
    c.out(278, (o) => o.writeByte(2));
    const info = await c.code(278, 2);
    info.pkt.readByte(); info.pkt.readInt();
    const n = info.pkt.readInt();
    const slots: { id: number; unit: number; price: number }[] = [];
    for (let i = 0; i < n; i++) {
      const id = info.pkt.readInt(); const unit = info.pkt.readInt(); const price = info.pkt.readInt();
      info.pkt.readInt(); info.pkt.readInt(); info.pkt.readInt();
      slots.push({ id, unit, price });
    }
    const target = slots.find((s) => s.unit === 2);
    expect(target).toBeDefined();
    const m = c.mark();
    c.out(278, (o) => { o.writeByte(3); o.writeInt(target!.id); o.writeBoolean(false); });
    const r = await c.code(278, 3, m);
    expect(r.pkt.readByte()).toBe(3);
    expect(r.pkt.readInt()).toBe(target!.id);
    expect(r.pkt.readBoolean()).toBe(false);
    expect(p().info.myHonor).toBe(0);
    c.close();
  });

  it("sub 4 (RARE_ITEM_INFO) devolve só InfoID, até 6, sem sortear (primeiros da pool LableType 2)", async () => {
    setupPool(server);
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(278, (o) => o.writeByte(4));
    const r = await c.code(278, 4, m);
    expect(r.pkt.readByte()).toBe(4);
    expect(r.pkt.readInt()).toBe(1);
    expect(r.pkt.readInt()).toBe(11101);
    c.close();
  });

  it("sub 5 (REFRESH) com Honor insuficiente falha sem rolar de novo nem mandar pacote 278", async () => {
    setupPool(server);
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    p().info.myHonor = 0;
    const m = c.mark();
    c.out(278, (o) => o.writeByte(5));
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 278)).toBe(false);
    c.close();
  });

  it("sub 5 (REFRESH) com Honor suficiente cobra, incrementa CurRefreshedTimes e rerola", async () => {
    setupPool(server);
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    p().info.myHonor = 10_000;
    const m = c.mark();
    c.out(278, (o) => o.writeByte(5));
    const r = await c.code(278, 2, m);
    expect(r.pkt.readByte()).toBe(2);
    expect(r.pkt.readInt()).toBe(1); // CurRefreshedTimes incrementado 0 -> 1
    expect(p().info.myHonor).toBe(10_000 - 500); // custo = 0*0*30+500
    c.close();
  });

  it("4.1: nunca manda 278 (feature nova do 6600)", async () => {
    const { c } = await loggedIn(server, { client: "41" });
    expect(c.received.some((r) => r.code === 278)).toBe(false);
    c.close();
  });
});
