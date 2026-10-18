/**
 * `m3-sell-goods` (docs/plan/TASKS.md): 48 SEll_GOODS (`handlers/bolsa/vender-item.ts`). Mesmo método dos
 * outros `client-6600-*`: monta o pacote EXATO campo a campo, roda pelo handler de verdade via `FakeClient`,
 * confere efeito + resposta, `offset === length`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import { ItemInfo, type ItemTemplate } from "../src/game/item.js";
import { loggedIn, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server?.stop();
});

const tpl = (o: Partial<ItemTemplate>): ItemTemplate => ({
  TemplateID: 1, CategoryID: 10, Attack: 0, Defence: 0, Agility: 0, Luck: 0, Property1: 0, Property2: 0, Property3: 0, Property4: 0,
  Property5: 0, Property6: 0, Property7: 0, Property8: 0, Hole: "", MaxCount: 99, Level: 1, ReclaimType: 0, ReclaimValue: 0, ...o,
}) as ItemTemplate;

describe("48 SEll_GOODS — vender item direto da bolsa (design próprio, código morto nos dois clientes)", () => {
  it("vende a pilha toda da PropBag por ouro (ReclaimType 1), credita e remove o item", async () => {
    const tplStore = server.ctx.templates;
    const tplId = 981001;
    tplStore.items.set(tplId, tpl({ TemplateID: tplId, ReclaimType: 1, ReclaimValue: 50 }));
    const { c, player: p } = await loggedIn(server, { client: "41" });
    const it = ItemInfo.createFromTemplate(tplStore.items.get(tplId)!, 3, 0, server.ctx.now());
    p().propBag.beginChanges();
    p().propBag.addItemTo(it, 0);
    p().propBag.commitChanges();
    const goldBefore = p().info.Gold;

    const m = c.mark();
    c.out(48, (x) => x.writeInt(0));
    const r = await c.code(48, undefined, m);
    expect(r.pkt.readInt()).toBe(0); // place
    expect(r.pkt.readBoolean()).toBe(true); // success
    expect(r.pkt.readInt()).toBe(3); // count (pilha toda, sem campo de count no pedido)
    expect(r.pkt.readInt()).toBe(1); // ReclaimType
    expect(r.pkt.readInt()).toBe(150); // 3 * 50
    expect(r.pkt.offset).toBe(r.pkt.length);
    expect(p().info.Gold).toBe(goldBefore + 150);
    expect(p().propBag.getItemAt(0)).toBeNull();
    c.close();
  });

  it("recusa item travado por cadeado de slot (cellLocked) — não vende, não credita", async () => {
    const tplStore = server.ctx.templates;
    const tplId = 981002;
    tplStore.items.set(tplId, tpl({ TemplateID: tplId, ReclaimType: 1, ReclaimValue: 999 }));
    const { c, player: p } = await loggedIn(server, { client: "41" });
    const it = ItemInfo.createFromTemplate(tplStore.items.get(tplId)!, 1, 0, server.ctx.now());
    it.cellLocked = true;
    p().propBag.beginChanges();
    p().propBag.addItemTo(it, 1);
    p().propBag.commitChanges();
    const goldBefore = p().info.Gold;

    const m = c.mark();
    c.out(48, (x) => x.writeInt(1));
    const r = await c.code(48, undefined, m);
    expect(r.pkt.readInt()).toBe(1);
    expect(r.pkt.readBoolean()).toBe(false);
    expect(p().info.Gold).toBe(goldBefore);
    expect(p().propBag.getItemAt(1)).not.toBeNull();
    c.close();
  });

  it("recusa item não vendável (ReclaimType 3), recusa bolsa travada (BAGLOCK) e responde no slot vazio", async () => {
    const tplStore = server.ctx.templates;
    const tplId = 981003;
    tplStore.items.set(tplId, tpl({ TemplateID: tplId, ReclaimType: 3, ReclaimValue: 1 }));
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    const it = ItemInfo.createFromTemplate(tplStore.items.get(tplId)!, 1, 0, server.ctx.now());
    p().propBag.beginChanges();
    p().propBag.addItemTo(it, 2);
    p().propBag.commitChanges();

    let m = c.mark();
    c.out(48, (x) => x.writeInt(2));
    let r = await c.code(48, undefined, m);
    expect(r.pkt.readInt()).toBe(2);
    expect(r.pkt.readBoolean()).toBe(false);
    expect(p().propBag.getItemAt(2)).not.toBeNull(); // ReclaimType 3: never sold

    // slot vazio: manda mensagem (3) + ack de falha (48), nenhum efeito
    m = c.mark();
    c.out(48, (x) => x.writeInt(99));
    r = await c.code(48, undefined, m);
    expect(r.pkt.readInt()).toBe(99);
    expect(r.pkt.readBoolean()).toBe(false);
    expect(c.received.slice(m).some((x) => x.code === 3)).toBe(true); // mensagem de chat também chegou

    // bolsa travada (BAGLOCK): recusa mesmo item vendável — só a mensagem (3), nenhum pacote 48
    const tplId2 = 981004;
    tplStore.items.set(tplId2, tpl({ TemplateID: tplId2, ReclaimType: 1, ReclaimValue: 100 }));
    const it2 = ItemInfo.createFromTemplate(tplStore.items.get(tplId2)!, 1, 0, server.ctx.now());
    p().propBag.beginChanges();
    p().propBag.addItemTo(it2, 3);
    p().propBag.commitChanges();
    p().info.HasBagPassword = true; p().info.IsLocked = true;
    const goldBefore = p().info.Gold;
    m = c.mark();
    c.out(48, (x) => x.writeInt(3));
    await c.code(3, undefined, m); // só a mensagem "Bag.Locked" chega
    expect(c.received.slice(m).some((x) => x.code === 48)).toBe(false);
    expect(p().info.Gold).toBe(goldBefore);
    expect(p().propBag.getItemAt(3)).not.toBeNull();
    c.close();
  });
});
