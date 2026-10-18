/**
 * M3 `m3-figurino` (docs/plan/TASKS.md, research/6600/packets-m1.md "M3 figurino"): PLAYER_DRESS (237, 6600
 * "figurino"/dress room) end to end — login burst, save/switch preset, lock, fold — plus the magic-stats
 * aggregation (GamePlayer.magicAttack/magicDefence) that `handlers/bolsa/vestir-6600.ts`/`game/stats.ts`
 * now wire into the real equip pipeline. Same method as the other `client-6600-*` suites: build the exact
 * packet the AS3 client sends (field order confirmed against `GameSocketOut.as`/`PlayerDressHandler.cs`),
 * run it through the real handler via `FakeClient`, decode the response field by field in the order the
 * AS3 reader cited in `vestir-6600.ts` reads it, `offset === length` at the end.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { player } from "@ddt/db";
import type { GSPacket } from "@ddt/protocol";
import type { GameServer } from "../src/server.js";
import { BagType, ItemInfo, type ItemTemplate } from "../src/game/item.js";
import { loggedIn, sharedDb, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server?.stop();
});

function expectFullyConsumed(p: GSPacket): void {
  expect(p.offset).toBe(p.length);
}

const tpl = (o: Partial<ItemTemplate>): ItemTemplate => ({
  TemplateID: 1, CategoryID: 7, Attack: 0, Defence: 0, Agility: 0, Luck: 0, Property1: 0, Property2: 0, Property3: 0, Property4: 0,
  Property5: 0, Property6: 0, Property7: 0, Property8: 0, Hole: "", MaxCount: 1, Level: 3, ...o,
}) as ItemTemplate;

// --------------------------------------------------------------------------------- login burst (sub 1 + sub 2)
describe("237 PLAYER_DRESS — login burst (6600 only)", () => {
  it("6600: manda sub 1 (3 modelos vazios) + sub 2 (slot 0) logo depois do 142 KING_BLESS_MAIN", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const idxKingBless = c.received.findIndex((r) => r.code === 142);
    expect(idxKingBless).toBeGreaterThanOrEqual(0);
    expect(c.received[idxKingBless + 1]!.code).toBe(237);
    expect(c.received[idxKingBless + 1]!.sub).toBe(1);
    expect(c.received[idxKingBless + 2]!.code).toBe(237);
    expect(c.received[idxKingBless + 2]!.sub).toBe(2);

    const p1 = c.received[idxKingBless + 1]!.pkt;
    p1.offset = 20;
    expect(p1.readByte()).toBe(1);
    expect(p1.readInt()).toBe(3); // sempre 3 modelos (DressModel.DRESS_LEN / combo "model1/2/3")
    for (let slot = 0; slot < 3; slot++) {
      expect(p1.readInt()).toBe(slot);
      expect(p1.readInt()).toBe(0); // conta nova: nenhum preset salvo ainda
    }
    expectFullyConsumed(p1);

    const p2 = c.received[idxKingBless + 2]!.pkt;
    p2.offset = 20;
    expect(p2.readByte()).toBe(2);
    expect(p2.readInt()).toBe(0); // CurentDressModel default (migration 0013)
    expectFullyConsumed(p2);
    c.close();
  });

  it("4.1: nunca manda 237 no burst de login (sem figurino, sem colisão com o mural)", async () => {
    const { c } = await loggedIn(server, { client: "41" });
    expect(c.received.some((r) => r.code === 237)).toBe(false);
    c.close();
  });
});

// ------------------------------------------------------------------------------- sub 1 GET_DRESS_MODEL (save)
describe("237/1 GET_DRESS_MODEL — salvar modelo (6600)", () => {
  it("salva o modelo 0 a partir de 2 itens equipados, dá ItemID real pro item ainda não persistido", async () => {
    const tplStore = server.ctx.templates;
    const hatId = 960001, clothId = 960002;
    tplStore.items.set(hatId, tpl({ TemplateID: hatId, CategoryID: 1 }));
    tplStore.items.set(clothId, tpl({ TemplateID: clothId, CategoryID: 5 }));
    const { c, player: p } = await loggedIn(server, { client: "6600" });

    const hat = ItemInfo.createFromTemplate(tplStore.items.get(hatId)!, 1, 0, server.ctx.now());
    const cloth = ItemInfo.createFromTemplate(tplStore.items.get(clothId)!, 1, 0, server.ctx.now());
    expect(hat.ItemID).toBe(0); // ainda não persistido — o save (sub 1) tem que dar um ItemID real
    p().equipBag.beginChanges();
    p().equipBag.addItemTo(hat, 0);
    p().equipBag.addItemTo(cloth, 4);
    p().equipBag.commitChanges();
    await p().saveIntoDatabase(server.ctx.db.db); // persiste o cloth também, igual ao mover.ts normal

    const m = c.mark();
    c.out(237, (o) => {
      o.writeByte(1);
      o.writeInt(0); // slot
      o.writeInt(2); // count
      o.writeInt(BagType.EquipBag); o.writeInt(0); // (bagType, place=0: hat)
      o.writeInt(BagType.EquipBag); o.writeInt(4); // (bagType, place=4: cloth)
    });
    const r1 = await c.code(237, 1, m);
    expect(r1.pkt.readByte()).toBe(1);
    expect(r1.pkt.readInt()).toBe(3);
    expect(r1.pkt.readInt()).toBe(0); // slot 0
    expect(r1.pkt.readInt()).toBe(2); // 2 itens salvos
    const got0 = { itemId: r1.pkt.readInt(), templateId: r1.pkt.readInt() };
    const got1 = { itemId: r1.pkt.readInt(), templateId: r1.pkt.readInt() };
    expect(hat.ItemID).toBeGreaterThan(0); // AddGoods (PlayerDressHandler.cs:35-38) deu um ItemID real
    expect([got0, got1]).toEqual(
      expect.arrayContaining([
        { itemId: hat.ItemID, templateId: hatId },
        { itemId: cloth.ItemID, templateId: clothId },
      ]),
    );
    expect(r1.pkt.readInt()).toBe(1); expect(r1.pkt.readInt()).toBe(0); // slot 1 vazio
    expect(r1.pkt.readInt()).toBe(2); expect(r1.pkt.readInt()).toBe(0); // slot 2 vazio
    expectFullyConsumed(r1.pkt);

    const r2 = await c.code(237, 2, m);
    expect(r2.pkt.readByte()).toBe(2);
    expect(r2.pkt.readInt()).toBe(0); // CurentDressModel inalterado — salvar não troca o modelo ativo
    expectFullyConsumed(r2.pkt);

    const db = (await sharedDb()).db;
    const [extra] = await db.select().from(player.Sys_Users_Extra).where(eq(player.Sys_Users_Extra.UserID, p().id));
    expect(extra!.DressModelArr).toBe(`${hat.ItemID}|${hatId};${cloth.ItemID}|${clothId},,`);
    c.close();
  });

  it("lista de (bagType,place) vazia/sem item válido não manda resposta (SaveDressModel no-op numa lista vazia)", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(237, (o) => { o.writeByte(1); o.writeInt(0); o.writeInt(1); o.writeInt(BagType.EquipBag); o.writeInt(7); }); // slot 7 vazio
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 237)).toBe(false);
    c.close();
  });
});

// -------------------------------------------------------------------------------- sub 2 CURRENT_MODEL (switch)
describe("237/2 CURRENT_MODEL — trocar modelo ativo (6600)", () => {
  it("troca pra slot 1 e persiste CurentDressModel (bookkeeping — não re-equipa nada; o cliente já mandou os 49 antes)", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(237, (o) => { o.writeByte(2); o.writeInt(1); });
    const r = await c.code(237, 2, m);
    expect(r.pkt.readByte()).toBe(2);
    expect(r.pkt.readInt()).toBe(1);
    expectFullyConsumed(r.pkt);
    expect(p().currentDressModel).toBe(1);
    const db = (await sharedDb()).db;
    const [extra] = await db.select().from(player.Sys_Users_Extra).where(eq(player.Sys_Users_Extra.UserID, p().id));
    expect(extra!.CurentDressModel).toBe(1);
    c.close();
  });
});

// --------------------------------------------------------------------------------------- sub 7 LOCK_DRESSBAG
describe("237/7 LOCK_DRESSBAG (6600)", () => {
  it("ack puro, sem payload além do sub-byte", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(237, (o) => o.writeByte(7));
    const r = await c.code(237, 7, m);
    expect(r.pkt.readByte()).toBe(7);
    expectFullyConsumed(r.pkt);
    c.close();
  });
});

// ----------------------------------------------------------------------------------------- sub 6 FOLD_DRESS
describe("237/6 FOLD_DRESS — mesclar validade de itens duplicados (6600)", () => {
  it("soma ValidDate no item de origem e remove o de destino (sem duplicar item, ver vestir-6600.ts)", async () => {
    const tplStore = server.ctx.templates;
    const dupId = 960010;
    tplStore.items.set(dupId, tpl({ TemplateID: dupId, CategoryID: 1 }));
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    const now = server.ctx.now();
    const from = ItemInfo.createFromTemplate(tplStore.items.get(dupId)!, 1, 0, now);
    from.ValidDate = 10; from.IsUsed = true; from.BeginDate = now;
    const to = ItemInfo.createFromTemplate(tplStore.items.get(dupId)!, 1, 0, now);
    to.ValidDate = 5; to.IsUsed = true; to.BeginDate = now;
    p().equipBag.beginChanges();
    p().equipBag.addItemTo(from, 40); // slots de estoque, fora da região equipada — sem checagem de CanEquip
    p().equipBag.addItemTo(to, 41);
    p().equipBag.commitChanges();

    const m = c.mark();
    c.out(237, (o) => {
      o.writeByte(6);
      o.writeInt(1);
      o.writeInt(BagType.EquipBag); o.writeInt(40); // fromPlace
      o.writeInt(BagType.EquipBag); o.writeInt(41); // toPlace
    });
    const r = await c.code(64, undefined, m); // GRID_GOODS do slot 40 atualizado (equipBag.updateItem)
    expect(r.pkt.readInt()).toBe(BagType.EquipBag);
    const n = r.pkt.readInt();
    expect(n).toBe(1);
    expect(r.pkt.readInt()).toBe(40);
    expect(from.ValidDate).toBe(15); // 10 + 5, somado em memória antes do pacote sair
    // destino consumido: o .cs original não removia (bag errada em AvatarBag.RemoveAllItem) e duplicava o item
    expect(p().equipBag.getItemAt(41)).toBeFalsy();
    c.close();
  });

  it("TemplateID diferente não mescla (sem efeito, sem pacote)", async () => {
    const tplStore = server.ctx.templates;
    const id1 = 960011, id2 = 960012;
    tplStore.items.set(id1, tpl({ TemplateID: id1, CategoryID: 1 }));
    tplStore.items.set(id2, tpl({ TemplateID: id2, CategoryID: 1 }));
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    const now = server.ctx.now();
    const from = ItemInfo.createFromTemplate(tplStore.items.get(id1)!, 1, 0, now);
    from.ValidDate = 10;
    const to = ItemInfo.createFromTemplate(tplStore.items.get(id2)!, 1, 0, now);
    to.ValidDate = 5;
    p().equipBag.beginChanges();
    p().equipBag.addItemTo(from, 42);
    p().equipBag.addItemTo(to, 43);
    p().equipBag.commitChanges();

    const m = c.mark();
    c.out(237, (o) => { o.writeByte(6); o.writeInt(1); o.writeInt(BagType.EquipBag); o.writeInt(42); o.writeInt(BagType.EquipBag); o.writeInt(43); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 64)).toBe(false);
    expect(from.ValidDate).toBe(10);
    c.close();
  });
});

// --------------------------------------------------------------------------- magic stats aggregation (m3-figurino)
describe("67 UPDATE_PLAYER_INFO — MagicAttack/MagicDefence agregados dos itens equipados (6600)", () => {
  it("equipar um item com MagicAttack/MagicDefence reflete em GamePlayer e no pacote 67", async () => {
    const tplStore = server.ctx.templates;
    const relicId = 960020;
    tplStore.items.set(relicId, tpl({ TemplateID: relicId, CategoryID: 1 }));
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    expect(p().magicAttack).toBe(0);
    expect(p().magicDefence).toBe(0);

    const relic = ItemInfo.createFromTemplate(tplStore.items.get(relicId)!, 1, 0, server.ctx.now());
    relic.MagicAttack = 42; relic.MagicDefence = 17;
    const m = c.mark();
    p().equipBag.beginChanges();
    p().equipBag.addItemTo(relic, 0); // onEquipChanged -> updatePlayerProperties -> recalcStats (síncrono)
    p().equipBag.commitChanges();

    expect(p().magicAttack).toBe(42);
    expect(p().magicDefence).toBe(17);

    const r = await c.code(67, undefined, m);
    for (let i = 0; i < 11; i++) r.pkt.readInt(); // GP..Luck
    expect(r.pkt.readInt()).toBe(42); // MagicAttack
    expect(r.pkt.readInt()).toBe(17); // MagicDefence
    c.close();
  });

  it("4.1: 67 não ganha os campos MagicAttack/MagicDefence (layout inalterado)", async () => {
    const tplStore = server.ctx.templates;
    const relicId = 960021;
    tplStore.items.set(relicId, tpl({ TemplateID: relicId, CategoryID: 1 }));
    const { c, player: p } = await loggedIn(server, { client: "41" });
    const relic = ItemInfo.createFromTemplate(tplStore.items.get(relicId)!, 1, 0, server.ctx.now());
    relic.MagicAttack = 99; relic.MagicDefence = 88; // mesmo campo real existe (Sys_Users_Goods), só não é lido pelo cliente 4.1
    const m = c.mark();
    p().equipBag.beginChanges();
    p().equipBag.addItemTo(relic, 0);
    p().equipBag.commitChanges();
    expect(p().magicAttack).toBe(99); // GamePlayer agrega igual, só o PACOTE que não manda pro cliente 4.1
    const r = await c.code(67, undefined, m);
    const pkt = r.pkt;
    for (let i = 0; i < 11; i++) pkt.readInt(); // GP..Luck
    // sem os +2 ints de MagicAttack/MagicDefence no meio (Detalhe C, só 6600) — decodifica o resto do layout
    // 4.1 inteiro (sem honorId/leagueMoney/PveEpicPermission) e exige offset===length: se os 2 ints de magic
    // estivessem presentes mesmo assim, sobrariam 8 bytes no final (ou os campos a seguir desalinhariam).
    pkt.readInt(); pkt.readInt(); // hp, Hide
    pkt.readString(); pkt.readString(); pkt.readString(); pkt.readBoolean(); // Style, Colors, Skin, IsShowConsortia
    pkt.readInt(); pkt.readString(); pkt.readInt(); pkt.readInt(); pkt.readInt();
    pkt.readInt(); pkt.readString(); pkt.readString(); pkt.readInt();
    pkt.readInt(); pkt.readInt(); pkt.readString(); pkt.readInt();
    pkt.readString(); pkt.readInt(); pkt.readString();
    pkt.readDateTime(true);
    pkt.readInt(); pkt.readInt(); pkt.readDateTime(true); pkt.readInt();
    pkt.readInt(); pkt.readInt(); pkt.readInt(); pkt.readInt(); pkt.readInt();
    for (let i = 0; i < 5; i++) pkt.readInt();
    pkt.readInt(); pkt.readInt(); pkt.readDateTime(true);
    const len = pkt.readInt();
    for (let i = 0; i < len; i++) { pkt.readInt(); pkt.readByte(); }
    pkt.readInt(); pkt.readInt(); // evolutionGrade, evolutionExp
    expectFullyConsumed(pkt);
    c.close();
  });
});
