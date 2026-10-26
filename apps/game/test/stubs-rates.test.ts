/**
 * Tests for the 41-stubs-rates batch: the 8 codes `tools/qa/packet-coverage.mjs` reported as STUB
 * (32 COLLECTINFO, 50 FIGHT_NPC, 89 QUESTION_REPLY, 167 CHURCH_MOVIE_OVER, 188 USE_CONSORTIA_REWORK_NAME,
 * 205 USE_CHANGE_COLOR_SHELL, 214 USER_RELOAD_GIFT, 224 CID_CHECK).
 *
 * 32/50/89/167/205/214/224: confirmed dead on the C# server side too (no `[PacketHandler(...)]` class at all,
 * only the enum entry) — a faithful noop, not a pending port. Only 188 had a real handler
 * (`UseConsortiaReworkNameHandler.cs`) left to port; see `handlers/bolsa/trocar-apelido-guilda.ts`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { player } from "@ddt/db";
import type { GameServer } from "../src/server.js";
import { ItemInfo, type ItemTemplate } from "../src/game/item.js";
import { loggedIn, sharedDb, sleep, startServer } from "./helpers.js";

// player."Consortia_Level" as shipped (Project_Player34) — igual a consortia.test.ts; precisa estar semeada
// pra `checkCreate`/`createGuildWithMember` funcionarem (SEED_TABLES em helpers.ts não inclui essa tabela).
const LEVELS = [
  [1, 100, 0, 500, 1000, 5000, 10000], [2, 105, 630, 2500, 5000, 50000, 30000], [3, 110, 1500, 8500, 17000, 150000, 70000],
  [4, 115, 6300, 18500, 37000, 250000, 150000], [5, 120, 18600, 32500, 65000, 700000, 200000], [6, 125, 50400, 50500, 101000, 0, 400000],
].map(([Level, Count, Riches, StoreRiches, SmithRiches, ShopRiches, BufferRiches]) => ({ Level: Level!, Count: Count!, Riches: Riches!, Reward: 0, NeedGold: 100000, StoreRiches: StoreRiches!, SmithRiches: SmithRiches!, ShopRiches: ShopRiches!, BufferRiches: BufferRiches!, KickMax: 20 }));

let server: GameServer;
beforeAll(async () => {
  const db = (await sharedDb()).db;
  const n = await db.select().from(player.Consortia_Level);
  if (!n.length) await db.insert(player.Consortia_Level).values(LEVELS.map((l) => ({ ...l, Deduct: 0, NeedItem: 0, BossCount: 0 })));
  server = await startServer();
});
afterAll(async () => {
  await server?.stop();
});

const tpl = (o: Partial<ItemTemplate>): ItemTemplate => ({
  TemplateID: 1, CategoryID: 7, Attack: 0, Defence: 0, Agility: 0, Luck: 0, Property1: 0, Property2: 0, Property3: 0, Property4: 0,
  Property5: 0, Property6: 0, Property7: 0, Property8: 0, Hole: "", MaxCount: 1, Level: 3, BindType: 0, ...o,
}) as ItemTemplate;

/** Cria um clã com `a` (presidente) e põe `b` como membro — mesmo atalho de consortia.test.ts. */
async function createGuildWithMember(s: GameServer) {
  const a = await loggedIn(s, { gold: 150000, money: 2000 });
  const b = await loggedIn(s, { gold: 0, money: 3000 });
  const name = `G${Date.now() % 1e6}${Math.floor(Math.random() * 1000)}`;
  a.c.out(129, (o) => { o.writeInt(1); o.writeUTF(name); });
  const cr = await a.c.code(129, 1);
  cr.pkt.readByte(); cr.pkt.readString(); cr.pkt.readBoolean();
  const cid = cr.pkt.readInt();
  b.c.out(129, (o) => { o.writeInt(0); o.writeInt(cid); });
  const ap = await b.c.code(129, 0);
  ap.pkt.readByte(); ap.pkt.readInt(); ap.pkt.readBoolean();
  const db = (await sharedDb()).db;
  const [apply] = await db.select().from(player.Consortia_Apply_Users).where(eq(player.Consortia_Apply_Users.UserID, b.ch.userId));
  const mark = b.c.mark();
  a.c.out(129, (o) => { o.writeInt(4); o.writeInt(apply!.ID); });
  await a.c.code(129, 4);
  await b.c.code(128, 1, mark);
  return { a, b, cid };
}

describe("pacotes mortos confirmados no C# original (noop fiel, 41-stubs-rates)", () => {
  it("32 COLLECTINFO / 50 FIGHT_NPC / 89 QUESTION_REPLY / 167 CHURCH_MOVIE_OVER / 205 USE_CHANGE_COLOR_SHELL / 214 USER_RELOAD_GIFT / 224 CID_CHECK: consomem o pacote e não respondem nada, sem derrubar a conexão", async () => {
    const { c } = await loggedIn(server);
    await sleep(300); // deixa o burst de login terminar antes de contar pacotes
    const m = c.mark();
    c.out(32, (p) => { p.writeByte(1); p.writeUTF("123456"); }); // sendCollectInfoValidate
    c.out(50); // sendBeginFightNpc — sem corpo
    c.out(89, (p) => p.writeInt(1)); // sendQuestionReply
    c.out(167, (p) => { p.writeInt(1); p.writeUTF("x"); }); // sendChurchMovieOver
    c.out(205, (p) => { p.writeByte(6); p.writeInt(0); }); // sendUseChangeColorShell
    c.out(214); // sendReloadGift — sem corpo
    c.out(224); // sendCIDCheck — sem corpo
    await sleep(150);
    expect(c.received.slice(m)).toHaveLength(0);
    // a conexão segue viva: um pacote normal depois ainda responde.
    c.out(119, (p) => { p.writeInt(4); p.writeUTF(""); p.writeInt(0); });
    const r = await c.code(119, undefined, m);
    expect(r.pkt.readInt()).toBe(4);
    c.close();
  });

  it("224 CID_CHECK também aceita o outro formato real (sendCIDInfo: bool + 2 strings) sem responder", async () => {
    const { c } = await loggedIn(server);
    await sleep(300);
    const m = c.mark();
    c.out(224, (p) => { p.writeBoolean(false); p.writeUTF("nome"); p.writeUTF("123456789"); });
    await sleep(100);
    expect(c.received.slice(m)).toHaveLength(0);
    c.close();
  });
});

describe("188 USE_CONSORTIA_REWORK_NAME (trocar-apelido-guilda.ts)", () => {
  it("presidente troca o nome do clã: cartão consumido, Consortia.ConsortiaName atualizado + histórico em Rename_Consortia", async () => {
    const { a, cid } = await createGuildWithMember(server);
    const p = a.player();
    const card = ItemInfo.createFromTemplate(tpl({ TemplateID: 11993 }), 1, 101);
    p.propBag.addItemTo(card, 2);
    const newName = `R${Date.now() % 1e6}${Math.floor(Math.random() * 1000)}`;
    a.c.out(188, (x) => { x.writeInt(cid); x.writeByte(1); x.writeInt(2); x.writeUTF(newName); });
    await sleep(150);
    expect(p.propBag.getItemAt(2)).toBeNull();
    const db = (await sharedDb()).db;
    const [row] = await db.select().from(player.Consortia).where(eq(player.Consortia.ConsortiaID, cid));
    expect(row!.ConsortiaName).toBe(newName);
    const hist = await db.select().from(player.Rename_Consortia).where(eq(player.Rename_Consortia.ConsortiaID, cid));
    expect(hist.some((h) => h.ConsortiaName === newName)).toBe(true);
    a.c.close();
  });

  it("quem manda não é o presidente: Msg2, nada muda", async () => {
    const { b, cid } = await createGuildWithMember(server);
    const p = b.player();
    const card = ItemInfo.createFromTemplate(tpl({ TemplateID: 11993 }), 1, 101);
    p.propBag.addItemTo(card, 2);
    const m = b.c.mark();
    b.c.out(188, (x) => { x.writeInt(cid); x.writeByte(1); x.writeInt(2); x.writeUTF("QualquerNome"); });
    const r = await b.c.code(3, undefined, m);
    expect(r.pkt.readInt()).toBe(0);
    expect(r.pkt.readString()).toBe("Só o líder do Clã pode alterar o nome.");
    expect(p.propBag.getItemAt(2)).not.toBeNull();
    b.c.close();
  });

  it("clã inexistente: Msg1", async () => {
    const { a } = await createGuildWithMember(server);
    const p = a.player();
    const card = ItemInfo.createFromTemplate(tpl({ TemplateID: 11993 }), 1, 101);
    p.propBag.addItemTo(card, 2);
    const m = a.c.mark();
    a.c.out(188, (x) => { x.writeInt(999999999); x.writeByte(1); x.writeInt(2); x.writeUTF("QualquerNome"); });
    const r = await a.c.code(3, undefined, m);
    expect(r.pkt.readInt()).toBe(0);
    expect(r.pkt.readString()).toBe("O Clã não existe.");
    a.c.close();
  });

  it("item no slot não é o cartão de nome do clã: silencioso (sem mensagem, sem consumir)", async () => {
    const { a, cid } = await createGuildWithMember(server);
    const p = a.player();
    const wrong = ItemInfo.createFromTemplate(tpl({ TemplateID: 1 }), 1, 101);
    p.propBag.addItemTo(wrong, 2);
    const m = a.c.mark();
    a.c.out(188, (x) => { x.writeInt(cid); x.writeByte(1); x.writeInt(2); x.writeUTF("QualquerNome"); });
    await sleep(100);
    expect(a.c.received.slice(m)).toHaveLength(0);
    expect(p.propBag.getItemAt(2)).not.toBeNull();
    a.c.close();
  });

  it("jogador fora de clã: silencioso mesmo com o cartão certo no slot", async () => {
    const { c, player: p } = await loggedIn(server);
    const card = ItemInfo.createFromTemplate(tpl({ TemplateID: 11993 }), 1, 101);
    p().propBag.addItemTo(card, 2);
    await sleep(300); // deixa o burst de login (amigos/eventos etc.) terminar antes de contar pacotes
    const m = c.mark();
    c.out(188, (x) => { x.writeInt(0); x.writeByte(1); x.writeInt(2); x.writeUTF("QualquerNome"); });
    await sleep(100);
    expect(c.received.slice(m)).toHaveLength(0);
    c.close();
  });

  it("nome já usado (pelo próprio clã do presidente, igual à SP_Users_RenameConsortia): Msg3, cartão intacto", async () => {
    const { a, cid } = await createGuildWithMember(server);
    const p = a.player();
    const db = (await sharedDb()).db;
    const [c0] = await db.select().from(player.Consortia).where(eq(player.Consortia.ConsortiaID, cid));
    const card = ItemInfo.createFromTemplate(tpl({ TemplateID: 11993 }), 1, 101);
    p.propBag.addItemTo(card, 2);
    const m = a.c.mark();
    a.c.out(188, (x) => { x.writeInt(cid); x.writeByte(1); x.writeInt(2); x.writeUTF(c0!.ConsortiaName); });
    const r = await a.c.code(3, undefined, m);
    expect(r.pkt.readInt()).toBe(0);
    expect(r.pkt.readString()).toBe("Este nome de Clã já está em uso.");
    expect(p.propBag.getItemAt(2)).not.toBeNull();
    a.c.close();
  });
});
