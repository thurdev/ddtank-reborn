/**
 * `m3-item-refinery` (docs/plan/TASKS.md): 210 ITEM_REFINERY no cliente 6600 (era 110 na 4.1 — valor de
 * enum trocado, ver `handlers/forja/refinaria.ts`). Mesmo padrão probabilístico de
 * `forge-persist.test.ts` ("110/111 ITEM_REFINERY", 4.1): roda com `rnd=Math.random` real, cobre os dois
 * desfechos (sucesso/falha) sem travar o teste num resultado só.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import { ItemInfo } from "../src/game/item.js";
import { loggedIn, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server?.stop();
});

describe("210 ITEM_REFINERY — client 6600 (valor de enum trocado, mesma lógica de forge-persist.test.ts)", () => {
  it("6600: sobe StrengthenRefineryLevel pelo código 210, gastando o mesmo Ouro que 110 na 4.1", async () => {
    const tpl = server.ctx.templates;
    const weaponT = [...tpl.items.values()].find((t) => t.CanStrengthen)!;
    const { c, player: p } = await loggedIn(server, { client: "6600", gold: 10_000 });
    const pl = p();
    const w = ItemInfo.createFromTemplate(weaponT, 1, 101);
    pl.equipBag.addItemTo(w, 40);
    const goldBefore = pl.info.Gold;

    const mark = c.mark();
    c.out(210, (x) => { x.writeInt(0); x.writeInt(40); });
    const res = await c.code(210, undefined, mark);
    expect(res.pkt.readInt()).toBe(0); // bagType
    expect(res.pkt.readInt()).toBe(40); // place
    const success = res.pkt.readBoolean();
    res.pkt.readInt(); res.pkt.readInt(); res.pkt.readInt(); // level, chance, cost
    expect(res.pkt.offset).toBe(res.pkt.length);
    expect(pl.info.Gold).toBe(goldBefore - 800); // custo nível 0, igual à 4.1
    if (success) expect(pl.equipBag.getItemAt(40)!.StrengthenRefineryLevel).toBe(1);
    c.close();
  });

  it("6600 nunca responde ao código 110 (é GAME_CAPTAIN_CHOICE/SEPARATE_ACTIVITY nesse cliente, não Refinaria)", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(110, (x) => { x.writeInt(0); x.writeInt(40); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 110)).toBe(false);
    c.close();
  });

  it("4.1 nunca responde ao código 210 (handler é 6600-only)", async () => {
    const { c } = await loggedIn(server, { client: "41" });
    const m = c.mark();
    c.out(210, (x) => { x.writeInt(0); x.writeInt(40); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 210)).toBe(false);
    c.close();
  });
});
