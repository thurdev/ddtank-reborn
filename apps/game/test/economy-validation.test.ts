import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { game, player as schema } from "@ddt/db";
import { eq } from "drizzle-orm";
import type { PacketOut } from "@ddt/protocol";
import type { GameServer } from "../src/server.js";
import type { GamePlayer } from "../src/game/player.js";
import { ItemInfo } from "../src/game/item.js";
import { loggedIn, startServer } from "./helpers.js";

let server: GameServer;
const ACTIVE_ID = 987001;
beforeAll(async () => {
  server = await startServer();
  await server.ctx.db.db.insert(game.Active).values({ ActiveID: ACTIVE_ID, Title: "Troca de teste", StartDate: new Date("2020-01-01"), EndDate: new Date("2099-01-01") });
  await server.ctx.db.db.insert(game.Active_Convert_Item).values([
    { ActiveID: ACTIVE_ID, TemplateID: 11023, ItemType: 0, ItemCount: 2 },
    { ActiveID: ACTIVE_ID, TemplateID: 11024, ItemType: 0, ItemCount: 3 },
    { ActiveID: ACTIVE_ID, TemplateID: 11025, ItemType: 1, ItemCount: 1 },
  ]);
  await server.ctx.templates.loadActiveExchange(server.ctx.db.db);
});
afterAll(async () => { await server?.stop(); });

function put(p: GamePlayer, templateId: number, slot: number, count: number) {
  const base = server.ctx.templates.findItem(templateId) ?? { ...server.ctx.templates.findItem(11023)!, TemplateID: templateId };
  const item = ItemInfo.createFromTemplate(base, count, 101);
  item.Count = count;
  expect(p.propBag.addItemTo(item, slot)).toBe(true);
  return item;
}
async function send(c: Awaited<ReturnType<typeof loggedIn>>["c"], code: number, fill: (pkt: PacketOut) => void) {
  c.out(code, fill);
  await Promise.all([...server.clients].map((client) => client.idle()));
}
const offer = (pkt: PacketOut, slots: [number, number][], count = slots.length) => {
  pkt.writeInt(ACTIVE_ID); pkt.writeInt(count);
  for (const [id, slot] of slots) { pkt.writeInt(id); pkt.writeInt(slot); pkt.writeInt(1); }
};

describe("GOODS_EXCHANGE: receita autoritativa", () => {
  it.each([
    ["vazia", [], 0],
    ["negativa", [], -1],
    ["incompleta", [[11023, 0]], 1],
    ["slot repetido", [[11023, 0], [11023, 0]], 2],
    ["template forjado", [[11023, 0], [11024, 0]], 2],
    ["truncada", [[11023, 0]], 2],
  ] as [string, [number, number][], number][])("recusa oferta %s sem cobrar ou premiar", async (_label, slots, count) => {
    const { c, player } = await loggedIn(server);
    const p = player();
    const a = put(p, 11023, 0, 2), b = put(p, 11024, 1, 3);
    await send(c, 31, (pkt) => offer(pkt, slots, count));
    expect([a.Count, b.Count]).toEqual([2, 3]);
    expect(p.propBag.getItemCount(11025)).toBe(0);
  });
  it("consome todos os ingredientes uma vez e persiste o resultado", async () => {
    const { c, player } = await loggedIn(server);
    const p = player();
    put(p, 11023, 0, 2); put(p, 11024, 1, 3);
    await send(c, 31, (pkt) => offer(pkt, [[11023, 0], [11024, 1]]));
    expect(p.propBag.getItemCount(11023)).toBe(0);
    expect(p.propBag.getItemCount(11024)).toBe(0);
    expect(p.propBag.getItemCount(11025)).toBe(1);
    await send(c, 31, (pkt) => offer(pkt, [[11023, 0], [11024, 1]]));
    expect(p.propBag.getItemCount(11025)).toBe(1);
    await p.saveIntoDatabase(server.ctx.db.db);
    const rows = await server.ctx.db.db.select().from(schema.Sys_Users_Goods).where(eq(schema.Sys_Users_Goods.UserID, p.id));
    expect(rows.filter((row) => row.IsExist && row.TemplateID === 11025).map((row) => row.Count)).toEqual([1]);
  });
  it("não consome materiais quando o prêmio não existe", async () => {
    const { c, player } = await loggedIn(server);
    const p = player();
    const a = put(p, 11023, 0, 2), b = put(p, 11024, 1, 3);
    const rows = server.ctx.templates.activeConvertItems.get(ACTIVE_ID)!;
    server.ctx.templates.activeConvertItems.set(ACTIVE_ID, rows.filter((row) => row.ItemType === 0));
    try { await send(c, 31, (pkt) => offer(pkt, [[11023, 0], [11024, 1]])); }
    finally { server.ctx.templates.activeConvertItems.set(ACTIVE_ID, rows); }
    expect([a.Count, b.Count]).toEqual([2, 3]);
  });
  it("respeita validade do evento e trava da bolsa", async () => {
    const { c, player } = await loggedIn(server);
    const p = player();
    const a = put(p, 11023, 0, 2), b = put(p, 11024, 1, 3);
    const active = server.ctx.templates.actives.get(ACTIVE_ID)!;
    server.ctx.templates.actives.set(ACTIVE_ID, { ...active, EndDate: new Date(0) });
    try { await send(c, 31, (pkt) => offer(pkt, [[11023, 0], [11024, 1]])); }
    finally { server.ctx.templates.actives.set(ACTIVE_ID, active); }
    p.info.HasBagPassword = true; p.info.IsLocked = true;
    await send(c, 31, (pkt) => offer(pkt, [[11023, 0], [11024, 1]]));
    expect([a.Count, b.Count]).toEqual([2, 3]);
    expect(p.propBag.getItemCount(11025)).toBe(0);
  });
});

describe("PROP_USE: não confia no tipo/quantidade do cliente", () => {
  it.each([
    ["tipo forjado", 11023, 1, [11963], true],
    ["pilha insuficiente", 11963, 1, [11963, 11963], true],
    ["pacote truncado", 11963, 2, [11963], false],
  ] as [string, number, number, number[], boolean][])("recusa %s sem dar cupons", async (_label, id, count, ids, trailing) => {
    const { c, player } = await loggedIn(server);
    const p = player(), item = put(p, id, 0, count), before = p.info.GiftToken;
    await send(c, 66, (pkt) => {
      pkt.writeInt(1); pkt.writeInt(0); pkt.writeInt(ids.length);
      for (const template of ids) pkt.writeInt(template);
      if (trailing) { pkt.writeInt(0); pkt.writeBoolean(false); }
    });
    expect(p.info.GiftToken).toBe(before);
    expect(item.Count).toBe(count);
    expect(item.IsExist).toBe(true);
  });
  it("usa a quantidade possuída e recusa o replay", async () => {
    const { c, player } = await loggedIn(server);
    const p = player(); put(p, 11963, 0, 2);
    const fill = (pkt: PacketOut) => { for (const n of [1, 0, 2, 11963, 11963, 0]) pkt.writeInt(n); pkt.writeBoolean(false); };
    const before = p.info.GiftToken;
    await send(c, 66, fill);
    expect(p.info.GiftToken - before).toBeGreaterThanOrEqual(2);
    expect(p.info.GiftToken - before).toBeLessThanOrEqual(1998);
    expect(p.propBag.getItemAt(0)).toBeNull();
    const after = p.info.GiftToken;
    await send(c, 66, fill);
    expect(p.info.GiftToken).toBe(after);
  });
  it("ativa 201316 no estado persistido do pacote 84 e consome só uma unidade", async () => {
    const { c, player } = await loggedIn(server, { grade: 20 });
    const p = player(), item = put(p, 201316, 0, 2);
    const fill = (pkt: PacketOut) => { for (const n of [1, 0, 1, 201316, 0]) pkt.writeInt(n); pkt.writeBoolean(false); };
    await send(c, 66, fill);
    expect(item.Count).toBe(1);
    const [saved] = await server.ctx.db.db.select().from(schema.Sys_Active_System_Data).where(eq(schema.Sys_Active_System_Data.UserID, p.id));
    expect(saved?.ChickActiveData.split(",").slice(0, 2)).toEqual(["1", "2"]);
    await send(c, 66, fill);
    expect(item.Count).toBe(1);
    const mark = c.mark();
    await send(c, 84, (pkt) => { pkt.writeInt(2); pkt.writeInt(3); });
    const reply = await c.code(84, undefined, mark);
    expect([reply.pkt.readInt(), reply.pkt.readInt(), reply.pkt.readInt()]).toEqual([2, 1, 1]);
  });
  it("não vende uma prop pelo preço de outro produto", async () => {
    const { c, player } = await loggedIn(server);
    const p = player();
    const shop = [...server.ctx.templates.shop.values()].find((row) => row.TemplateID === 10001)!;
    const other = [...server.ctx.templates.shop.values()].find((row) => row.TemplateID !== 10001)!;
    const prop = ItemInfo.createFromTemplate(server.ctx.templates.findItem(10001)!, 1, 101);
    p.fightBag.addItemTo(prop, 0);
    const before = p.info.Gold;
    await send(c, 55, (pkt) => { pkt.writeInt(0); pkt.writeInt(other.ID); });
    expect(p.info.Gold).toBe(before);
    expect(p.fightBag.getItemAt(0)).toBe(prop);
    await send(c, 55, (pkt) => { pkt.writeInt(0); pkt.writeInt(shop.ID); });
    expect(p.fightBag.getItemAt(0)).toBeNull();
  });
});
