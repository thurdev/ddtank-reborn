/**
 * "Tem que salvar tudo que o jogador faz": transferência de atributos (61) e fusão (78) pelo caminho real de
 * pacotes, depois desconecta (quitPlayer -> saveIntoDatabase) e confere o que ficou gravado no banco.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import { ItemInfo } from "../src/game/item.js";
import { loadUserItems } from "../src/db/items.js";
import { loggedIn, sleep, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => { server = await startServer(); });
afterAll(async () => { await server?.stop(); });

type W = { writeByte(n: number): void; writeInt(n: number): void; writeBoolean(b: boolean): void };
const move = (from: [number, number], to: [number, number], count: number) => (x: W) => {
  x.writeByte(from[0]); x.writeInt(from[1]); x.writeByte(to[0]); x.writeInt(to[1]); x.writeInt(count); x.writeBoolean(true);
};
const dbItems = async (userId: number) => {
  const m = await loadUserItems(server.ctx.db.db, userId, (id) => server.ctx.templates.findItem(id));
  return [...m.values()].flat();
};

describe("Forja grava no banco", () => {
  it("transferência: o +N e a composição trocam de item e continuam assim depois de sair", async () => {
    const tpl = server.ctx.templates;
    const hats = [...tpl.items.values()].filter((t) => t.CategoryID === 1 && t.CanStrengthen && t.CanCompose && t.Quality >= 4).slice(0, 2);
    expect(hats.length).toBe(2);
    const { c, ch, player: p } = await loggedIn(server, { gold: 1_000_000 });
    const pl = p();
    const a = ItemInfo.createFromTemplate(hats[0]!, 1, 101); a.StrengthenLevel = 9; a.AttackCompose = 30;
    const b = ItemInfo.createFromTemplate(hats[1]!, 1, 101);
    pl.equipBag.addItemTo(a, 40); pl.equipBag.addItemTo(b, 41);
    await pl.saveIntoDatabase(server.ctx.db.db); // itens já existem no banco (ItemID > 0), como no jogo real
    c.out(122); await sleep(60);
    c.out(49, move([0, 40], [12, 0], 1)); await sleep(60);
    c.out(49, move([0, 41], [12, 1], 1)); await sleep(60);
    c.out(61, (x) => { x.writeBoolean(true); x.writeBoolean(true); });
    await sleep(150);
    c.close();
    await sleep(400);
    const rows = await dbItems(ch.userId);
    const ra = rows.find((r) => r.TemplateID === hats[0]!.TemplateID)!;
    const rb = rows.find((r) => r.TemplateID === hats[1]!.TemplateID)!;
    expect(ra.StrengthenLevel).toBe(0);
    expect(rb.StrengthenLevel).toBe(9);
    expect(rb.AttackCompose).toBe(30);
  });

  it("qualquer mudança no item (mesmo sem marcar isDirty) e consumo de pilha vão pro banco ao sair", async () => {
    const tpl = server.ctx.templates;
    const stoneT = tpl.findItem(11024)!;
    const hat = [...tpl.items.values()].find((t) => t.CategoryID === 1 && t.CanStrengthen)!;
    const { c, ch, player: p } = await loggedIn(server, { gold: 1_000_000 });
    const pl = p();
    const st = ItemInfo.createFromTemplate(stoneT, 8, 101); st.Count = 8;
    const h = ItemInfo.createFromTemplate(hat, 1, 101);
    pl.propBag.addItemTo(st, 0); pl.equipBag.addItemTo(h, 40);
    await pl.saveIntoDatabase(server.ctx.db.db);
    // como um handler que mexe direto no item sem marcar sujo
    h.StrengthenLevel = 7; h.AttackCompose = 12; h.isDirty = false;
    pl.propBag.removeCountFromStack(st, 3);
    c.close();
    await sleep(400);
    const rows = await dbItems(ch.userId);
    expect(rows.find((r) => r.TemplateID === hat.TemplateID)?.StrengthenLevel).toBe(7);
    expect(rows.find((r) => r.TemplateID === hat.TemplateID)?.AttackCompose).toBe(12);
    expect(rows.filter((r) => r.TemplateID === 11024).reduce((a, r) => a + r.Count, 0)).toBe(5);
  });

  it("313 ITEM_CELL_IS_LOCKED: trava/destrava o cadeado do slot e persiste ao sair", async () => {
    const tpl = server.ctx.templates;
    const stoneT = [...tpl.items.values()].find((t) => t.CategoryID !== 1)!;
    const { c, ch, player: p } = await loggedIn(server, { gold: 1_000_000 });
    const pl = p();
    const it = ItemInfo.createFromTemplate(stoneT, 1, 101);
    pl.propBag.addItemTo(it, 0);
    await pl.saveIntoDatabase(server.ctx.db.db);
    expect(it.cellLocked).toBe(false);

    c.out(313, (x) => { x.writeInt(1); x.writeInt(0); x.writeBoolean(true); }); // PropBag=1, slot 0, lock
    await sleep(60);
    expect(pl.propBag.getItemAt(0)!.cellLocked).toBe(true);

    c.close();
    await sleep(400);
    const rows = await dbItems(ch.userId);
    expect(rows.find((r) => r.TemplateID === stoneT.TemplateID)?.cellLocked).toBe(true);
  });

  it("110/111 ITEM_REFINERY (design próprio): sobe StrengthenRefineryLevel gastando Ouro, persiste ao sair", async () => {
    const tpl = server.ctx.templates;
    const weaponT = [...tpl.items.values()].find((t) => t.CanStrengthen)!;
    const { c, ch, player: p } = await loggedIn(server, { gold: 10_000 });
    const pl = p();
    const w = ItemInfo.createFromTemplate(weaponT, 1, 101);
    pl.equipBag.addItemTo(w, 40);
    await pl.saveIntoDatabase(server.ctx.db.db);

    c.out(111, (x) => { x.writeInt(0); x.writeInt(40); }); // preview
    const prev = await c.code(111);
    prev.pkt.readInt(); prev.pkt.readInt();
    expect(prev.pkt.readInt()).toBe(0); // level atual
    expect(prev.pkt.readInt()).toBe(1); // próximo nível
    expect(prev.pkt.readInt()).toBe(90); // chance default do nível 0
    expect(prev.pkt.readInt()).toBe(800); // custo default do nível 0

    const goldBefore = pl.info.Gold;
    const mark = c.mark();
    c.out(110, (x) => { x.writeInt(0); x.writeInt(40); }); // commit (90% chance, rnd=Math.random real)
    const res = await c.code(110, undefined, mark);
    res.pkt.readInt(); res.pkt.readInt();
    const success = res.pkt.readBoolean();
    expect(pl.info.Gold).toBe(goldBefore - 800);
    if (success) expect(pl.equipBag.getItemAt(40)!.StrengthenRefineryLevel).toBe(1);

    c.close();
    await sleep(400);
    const rows = await dbItems(ch.userId);
    expect(rows.find((r) => r.TemplateID === weaponT.TemplateID)?.StrengthenRefineryLevel).toBe(success ? 1 : 0);
  });
});
