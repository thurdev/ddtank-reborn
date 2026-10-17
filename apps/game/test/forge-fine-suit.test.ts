/**
 * Forja › Forno › Refinar conjunto (295 STORE_FINE_SUIT). Consome `SetsBuildTemp.UseItemTemplate` da
 * bolsa pra subir `fineSuitExp`, com teto por nível e troco em itens quando sobra EXP.
 * Seed real: `packages/db/drizzle/0010_forja_specs_seed.sql` — nível 1 (`SetsType` 1) usa o item 11169
 * (Property2=10 XP/unidade), `Exp` teto 205; nível 2 começa em 483.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import { ItemInfo } from "../src/game/item.js";
import { loadPlayerInfo } from "../src/db/characters.js";
import { loggedIn, sleep, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => { server = await startServer(); });
afterAll(async () => { await server?.stop(); });

const FORGE_SUIT = 1;
const MATERIAL_TEMPLATE = 11169; // SetsBuildTemp Level 1, Property2=10

describe("295 STORE_FINE_SUIT", () => {
  it("consome N unidades e soma Property2*N de fineSuitExp", async () => {
    const tpl = server.ctx.templates;
    const material = tpl.findItem(MATERIAL_TEMPLATE)!;
    expect(material.Property2).toBe(10);
    const { c, player: p } = await loggedIn(server);
    const pl = p();
    pl.propBag.addItemTo(ItemInfo.createFromTemplate(material, 50, 101), 0);
    expect(pl.info.fineSuitExp).toBe(0);

    c.out(295, (x) => { x.writeByte(FORGE_SUIT); x.writeInt(5); });
    const r = await c.code(295);
    expect(r.pkt.readByte()).toBe(FORGE_SUIT);
    expect(r.pkt.readBoolean()).toBe(true);
    expect(r.pkt.readInt()).toBe(50);
    await sleep(60);

    expect(pl.info.fineSuitExp).toBe(50);
    expect(pl.propBag.getItemCount(MATERIAL_TEMPLATE)).toBe(45);
    c.close();
  });

  it("count=0 usa toda a pilha; acima do teto do nível devolve o troco em itens", async () => {
    const tpl = server.ctx.templates;
    const material = tpl.findItem(MATERIAL_TEMPLATE)!;
    const lvl1 = tpl.findNextSetsBuild(0)!;
    expect(lvl1.Exp).toBe(205); // teto do nível 1 (seed real)
    const { c, ch, player: p } = await loggedIn(server);
    const pl = p();
    pl.propBag.addItemTo(ItemInfo.createFromTemplate(material, 30, 101), 0); // 30*10=300 > 205

    c.out(295, (x) => { x.writeByte(FORGE_SUIT); x.writeInt(0); }); // count=0 = usar tudo
    const r = await c.code(295);
    expect(r.pkt.readByte()).toBe(FORGE_SUIT);
    expect(r.pkt.readBoolean()).toBe(true);
    expect(r.pkt.readInt()).toBe(205); // clampado no teto do nível 1
    await sleep(60);

    expect(pl.info.fineSuitExp).toBe(205);
    // 30 consumidas, (300-205)/10=9 devolvidas como troco -> saldo final 30-30+9=9.
    expect(pl.propBag.getItemCount(MATERIAL_TEMPLATE)).toBe(9);

    const next = tpl.findNextSetsBuild(205)!;
    expect(next.Level).toBe(2); // 205 não é < 205, pula pro próximo nível

    c.close();
    await sleep(400); // save-quit-reload
    const info = await loadPlayerInfo(server.ctx.db.db, ch.userId);
    expect(info?.fineSuitExp).toBe(205);
  });

  it("sem o item do nível atual na bolsa: result=false, fineSuitExp não muda", async () => {
    const { c, player: p } = await loggedIn(server);
    const pl = p();
    c.out(295, (x) => { x.writeByte(FORGE_SUIT); x.writeInt(1); });
    const r = await c.code(295);
    expect(r.pkt.readByte()).toBe(FORGE_SUIT);
    expect(r.pkt.readBoolean()).toBe(false);
    expect(r.pkt.readInt()).toBe(0);
    expect(pl.info.fineSuitExp).toBe(0);
    c.close();
  });
});
