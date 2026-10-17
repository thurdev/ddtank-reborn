/**
 * Auto-split da Forja pelo caminho real de pacotes (como o cliente faz): 122 limpa a bancada (instala o hook),
 * 49 CHANGE_PLACE_GOODS move a arma pro slot 5 e a pilha de pedras (com quantidade) pra um slot de pedra.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import { ItemInfo } from "../src/game/item.js";
import { loggedIn, sleep, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => { server = await startServer(); });
afterAll(async () => { await server?.stop(); });

const STONE = 11024; // Pedra de Fortalecimento 5 (CategoryID 11, Property1 2)
const move = (from: [number, number], to: [number, number], count: number) => (x: { writeByte(n: number): void; writeInt(n: number): void; writeBoolean(b: boolean): void }) => {
  x.writeByte(from[0]); x.writeInt(from[1]); x.writeByte(to[0]); x.writeInt(to[1]); x.writeInt(count); x.writeBoolean(true);
};

describe("auto-split da Forja via pacotes", () => {
  it("fortalecer: arma no 5 + pilha de 9000 pedras no slot 0 -> divide 3000 em cada slot 0-2", async () => {
    const tpl = server.ctx.templates;
    const stoneT = tpl.findItem(STONE)!;
    const weaponT = [...tpl.items.values()].find((t) => t.CategoryID === 7 && t.CanStrengthen)!;
    const { c, player: p } = await loggedIn(server);
    const pl = p();
    const st = ItemInfo.createFromTemplate(stoneT, 9000, 101); st.Count = 9000;
    pl.propBag.addItemTo(st, 0);
    const w = ItemInfo.createFromTemplate(weaponT, 1, 101);
    pl.equipBag.addItemTo(w, 40);
    c.out(122);
    await sleep(80);
    c.out(49, move([0, 40], [12, 5], 1));
    await sleep(80);
    c.out(49, move([1, 0], [12, 0], 9000));
    await sleep(150);
    const counts = [0, 1, 2, 3, 4, 5].map((s) => pl.storeBag.getItemAt(s)?.Count ?? 0);
    expect(pl.storeBag.getItemAt(5)?.TemplateID).toBe(weaponT.TemplateID);
    expect(counts.slice(0, 3)).toEqual([3000, 3000, 3000]);
    expect(counts.slice(3, 5)).toEqual([0, 0]);
    c.close();
  });

  it("fusão: pilha de 9000 no slot 1 -> divide igual nos 4 slots (2250 cada)", async () => {
    const stoneT = server.ctx.templates.findItem(STONE)!;
    const { c, player: p } = await loggedIn(server);
    const pl = p();
    const st = ItemInfo.createFromTemplate(stoneT, 9000, 101); st.Count = 9000;
    pl.propBag.addItemTo(st, 0);
    c.out(122);
    await sleep(80);
    c.out(49, move([1, 0], [12, 1], 9000));
    await sleep(150);
    expect([1, 2, 3, 4].map((s) => pl.storeBag.getItemAt(s)?.Count ?? 0)).toEqual([2250, 2250, 2250, 2250]);
    c.close();
  });

  it("fortalecer SEM arma: pilha no slot 1 vai pra 1-4, cliente não pede preview -> em 600ms volta pra 0-2", async () => {
    const stoneT = server.ctx.templates.findItem(STONE)!;
    const { c, player: p } = await loggedIn(server);
    const pl = p();
    const st = ItemInfo.createFromTemplate(stoneT, 9000, 101); st.Count = 9000;
    pl.propBag.addItemTo(st, 0);
    c.out(122); await sleep(80);
    c.out(49, move([1, 0], [12, 1], 9000));
    await sleep(900);
    expect([0, 1, 2, 3, 4].map((s) => pl.storeBag.getItemAt(s)?.Count ?? 0)).toEqual([3000, 3000, 3000, 0, 0]);
    c.close();
  });

  it("fusão com preview do cliente: fica 2250 x4 (não reorganiza)", async () => {
    const stoneT = server.ctx.templates.findItem(STONE)!;
    const { c, player: p } = await loggedIn(server);
    const pl = p();
    const st = ItemInfo.createFromTemplate(stoneT, 9000, 101); st.Count = 9000;
    pl.propBag.addItemTo(st, 0);
    c.out(122); await sleep(80);
    c.out(49, move([1, 0], [12, 1], 9000));
    await sleep(100);
    c.out(78, (x: { writeByte(n: number): void }) => x.writeByte(0)); // o cliente pede preview quando 1-4 enchem
    await sleep(900);
    expect([1, 2, 3, 4].map((s) => pl.storeBag.getItemAt(s)?.Count ?? 0)).toEqual([2250, 2250, 2250, 2250]);
    c.close();
  });
});
