/**
 * Forja › Forno › Aprimorar (308 EQUIP_BRING_UP). Equipamento alvo (storeBag slot 0) devora cartas
 * (CategoryID 8/9) da EquipBag ou compra EXP com Money, evoluindo pela cadeia `FusionType` ao cruzar
 * `Property2` do próximo item.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import { ItemInfo } from "../src/game/item.js";
import { loadPlayerInfo } from "../src/db/characters.js";
import { loggedIn, sleep, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => { server = await startServer(); });
afterAll(async () => { await server?.stop(); });

describe("308 EQUIP_BRING_UP", () => {
  it("devora 1 carta (CategoryID 8) e soma a EXP dela ao equipamento alvo", async () => {
    const tpl = server.ctx.templates;
    // Template com FusionType auto-referente (cadeia "trivial"): devorar sobe curExp sem nunca cruzar
    // o próprio Property2 numa carta só, então não evolui — simples de prever.
    const tagT = [...tpl.items.values()].find((t) => t.CategoryID === 7 && t.FusionType !== 0 && t.Property3 === 0)!;
    const cardT = [...tpl.items.values()].find((t) => (t.CategoryID === 8 || t.CategoryID === 9) && t.Property3 === 0)!;
    const { c, player: p } = await loggedIn(server);
    const pl = p();
    const tagItem = ItemInfo.createFromTemplate(tagT, 1, 101);
    pl.storeBag.addItemTo(tagItem, 0);
    const eaten = ItemInfo.createFromTemplate(cardT, 1, 101);
    eaten.curExp = 10; // < nextTemplate.Property2 do tagT — garante que não evolui nesta chamada
    pl.equipBag.addItemTo(eaten, 20);

    c.out(308, (x) => { x.writeInt(1); x.writeInt(0); x.writeInt(20); }); // count=1, bagType=0 (ignorado), place=20
    const r = await c.code(308);
    expect(r.pkt.readBoolean()).toBe(true); // exp!=0 → isSuccessful
    await sleep(60);

    expect(pl.equipBag.getItemAt(20)).toBeNull(); // carta devorada
    const nowItem = pl.storeBag.getItemAt(0)!;
    expect(nowItem.TemplateID).toBe(tagT.TemplateID); // não evoluiu (10 < Property2 do próximo)
    expect(nowItem.curExp).toBe(10);
    c.close();
  });

  it("carta travada (cellLocked) ou categoria errada não é devorada", async () => {
    const tpl = server.ctx.templates;
    const tagT = [...tpl.items.values()].find((t) => t.CategoryID === 7 && t.FusionType !== 0)!;
    const cardT = [...tpl.items.values()].find((t) => t.CategoryID === 8)!;
    const { c, player: p } = await loggedIn(server);
    const pl = p();
    pl.storeBag.addItemTo(ItemInfo.createFromTemplate(tagT, 1, 101), 0);
    const locked = ItemInfo.createFromTemplate(cardT, 1, 101);
    locked.cellLocked = true;
    locked.curExp = 999;
    pl.equipBag.addItemTo(locked, 21);

    c.out(308, (x) => { x.writeInt(1); x.writeInt(0); x.writeInt(21); });
    const r = await c.code(308);
    expect(r.pkt.readBoolean()).toBe(false); // exp fica 0: nada devorado
    await sleep(60);
    expect(pl.equipBag.getItemAt(21)).not.toBeNull(); // carta travada continua lá
    c.close();
  });

  it("evolui pro próximo item da cadeia quando a EXP acumulada cruza o Property2", async () => {
    const tpl = server.ctx.templates;
    // 7086 -> FusionType 7057 (cadeia real, dois templates DIFERENTES — confirmado no banco de dados).
    const tagT = tpl.findItem(7086)!;
    const cardT = [...tpl.items.values()].find((t) => (t.CategoryID === 8 || t.CategoryID === 9) && t.Property3 === 0)!;
    const nextT = tpl.findItem(tagT.FusionType)!;
    expect(nextT.TemplateID).not.toBe(tagT.TemplateID);
    const { c, player: p } = await loggedIn(server);
    const pl = p();
    pl.storeBag.addItemTo(ItemInfo.createFromTemplate(tagT, 1, 101), 0);
    // EXP de sobra pra cruzar nextT.Property2 numa carta só.
    const eaten = ItemInfo.createFromTemplate(cardT, 1, 101);
    eaten.curExp = nextT.Property2;
    pl.equipBag.addItemTo(eaten, 22);

    c.out(308, (x) => { x.writeInt(1); x.writeInt(0); x.writeInt(22); });
    const r = await c.code(308);
    expect(r.pkt.readBoolean()).toBe(true);
    await sleep(60);

    const evolved = pl.storeBag.getItemAt(0)!;
    expect(evolved.TemplateID).toBe(nextT.TemplateID); // evoluiu
    c.close();
  });

  it("count<=0: compra EXP direto com Money (35/un)", async () => {
    const tpl = server.ctx.templates;
    const tagT = [...tpl.items.values()].find((t) => t.CategoryID === 7 && t.FusionType !== 0 && t.Property3 === 0)!;
    const { c, ch, player: p } = await loggedIn(server, { money: 100_000 });
    const pl = p();
    pl.storeBag.addItemTo(ItemInfo.createFromTemplate(tagT, 1, 101), 0);
    const moneyBefore = pl.info.Money;

    c.out(308, (x) => { x.writeInt(0); x.writeInt(0); x.writeInt(20); }); // count=0, (não usado), exp=20
    const r = await c.code(308);
    expect(r.pkt.readBoolean()).toBe(true);
    await sleep(60);

    expect(pl.info.Money).toBe(moneyBefore - 35 * 20);
    expect(pl.storeBag.getItemAt(0)!.curExp).toBe(20);

    c.close();
    await sleep(400);
    const info = await loadPlayerInfo(server.ctx.db.db, ch.userId);
    expect(info?.Money).toBe(moneyBefore - 35 * 20); // save-quit-reload
  });
});
