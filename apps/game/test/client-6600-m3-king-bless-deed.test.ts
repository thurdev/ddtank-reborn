/**
 * M3 `m3-king-bless-deed` (docs/plan/TASKS.md): 142 KING_BLESS_MAIN (`sendOpenKingBless`/`sendOpenDeed`,
 * confirmados chamados em `kingBless/view/KingBlessMainFrame.as:257/268` e `ddt/view/common/DeedIcon.as:101`)
 * + 143 KING_BLESS_USE_ITEM (`sendUseItemKingBless`, `BagView.as:2669` — `sendUseItemDeed` é inalcançável,
 * ver cabeçalho de `handlers/progressao/juramento-do-rei.ts`). C#: `KingBlessHandler.cs`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { player as playerSchema } from "@ddt/db";
import type { GameServer } from "../src/server.js";
import { createCharacter, loggedIn, sharedDb, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server?.stop();
});

describe("142 KING_BLESS_MAIN — Escritura (type 10, Deed)", () => {
  it("cobra DanDanBuffPrice, abre a Escritura e renova a validade em +7 dias nas chamadas seguintes", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600", money: 10_000 });
    const before = p().info.Money;
    const m = c.mark();
    c.out(142, (o) => { o.writeByte(10); o.writeInt(p().id); o.writeUTF(""); o.writeBoolean(false); });
    const r = await c.code(2272, undefined, m);
    expect(r.pkt.readInt()).toBe(10); // DeedIndex
    expect(p().info.Money).toBe(before - 3000); // GameProperties.DanDanBuffPrice default
    expect(p().extra?.DeedIndex).toBe(10);

    const end1 = p().extra!.DeedEnddate.getTime();
    const m2 = c.mark();
    c.out(142, (o) => { o.writeByte(10); o.writeInt(p().id); o.writeUTF(""); o.writeBoolean(false); });
    await c.code(2272, undefined, m2);
    expect(p().extra!.DeedEnddate.getTime()).toBeGreaterThan(end1); // renovado (+7 dias de novo)
    c.close();
  });

  it("sem Xu suficiente: recusa sem cobrar", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600", money: 100 });
    const before = p().info.Money;
    const m = c.mark();
    c.out(142, (o) => { o.writeByte(10); o.writeInt(p().id); o.writeUTF(""); o.writeBoolean(false); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 2272)).toBe(false);
    expect(p().info.Money).toBe(before);
    c.close();
  });
});

describe("142 KING_BLESS_MAIN — Bênção do Rei (type 1-3)", () => {
  it("auto-presente (próprio ID): cobra o preço do nível, ativa a Bênção por 30 dias", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600", money: 10_000 });
    const before = p().info.Money;
    const m = c.mark();
    c.out(142, (o) => { o.writeByte(1); o.writeInt(p().id); o.writeUTF(""); o.writeBoolean(false); });
    const r = await c.code(142, undefined, m);
    expect(r.pkt.readInt()).toBe(1); // KingBlessIndex
    expect(p().info.Money).toBe(before - 475); // KingBuffPrice default, nível 1
    expect(p().extra?.KingBlessIndex).toBe(1);
  });

  it("presentear um amigo ONLINE: o amigo recebe o push 142 + aviso no chat, quem paga é o remetente", async () => {
    const { c: giver, player: pGiver } = await loggedIn(server, { client: "6600", money: 10_000 });
    const { c: friend, player: pFriend } = await loggedIn(server, { client: "6600" });
    const beforeGiver = pGiver().info.Money;
    const m = friend.mark();
    giver.out(142, (o) => { o.writeByte(2); o.writeInt(pFriend().id); o.writeUTF(""); o.writeBoolean(false); });
    const r = await friend.code(142, undefined, m);
    expect(r.pkt.readInt()).toBe(2); // KingBlessIndex do AMIGO
    expect(pFriend().extra?.KingBlessIndex).toBe(2);
    expect(pGiver().info.Money).toBe(beforeGiver - 1425); // nível 2 — quem paga é o remetente
    expect(pGiver().extra?.KingBlessIndex ?? 0).toBe(0); // o remetente não ganhou a bênção pra si
    giver.close();
    friend.close();
  });

  it("presentear um nível MENOR que o já ativo: recusa sem cobrar nem reduzir o nível", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600", money: 10_000 });
    const m0 = c.mark();
    c.out(142, (o) => { o.writeByte(3); o.writeInt(p().id); o.writeUTF(""); o.writeBoolean(false); });
    await c.code(142, undefined, m0); // 142 KING_BLESS_MAIN closed já foi mandado no burst de login (código 142!) — precisa do `from` pra não casar com ele
    const afterTier3 = p().info.Money;
    const m = c.mark();
    c.out(142, (o) => { o.writeByte(1); o.writeInt(p().id); o.writeUTF(""); o.writeBoolean(false); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 142)).toBe(false);
    expect(p().info.Money).toBe(afterTier3); // não cobrou
    expect(p().extra?.KingBlessIndex).toBe(3); // continua no nível 3
    c.close();
  });

  it("presentear um jogador OFFLINE existente: aplica no banco sem precisar dele online", async () => {
    const db = await sharedDb();
    const offline = await createCharacter(db, { client: "6600" });
    const { c, player: p } = await loggedIn(server, { client: "6600", money: 10_000 });
    const m = c.mark();
    c.out(142, (o) => { o.writeByte(1); o.writeInt(offline.userId); o.writeUTF(""); o.writeBoolean(false); });
    const r = await c.code(142, undefined, m);
    expect(r.pkt.readInt()).toBe(0); // self (remetente) não mudou
    const rows = await db.db.select().from(playerSchema.Sys_Users_Extra).where(eq(playerSchema.Sys_Users_Extra.UserID, offline.userId));
    expect(rows[0]?.KingBlessIndex).toBe(1);
    c.close();
  });

  it("jogador alvo inexistente: recusa sem cobrar", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600", money: 10_000 });
    const before = p().info.Money;
    const m = c.mark();
    c.out(142, (o) => { o.writeByte(1); o.writeInt(999_999_999); o.writeUTF(""); o.writeBoolean(false); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 142)).toBe(false);
    expect(p().info.Money).toBe(before);
    c.close();
  });
});

describe("143 KING_BLESS_USE_ITEM", () => {
  it("item sem CategoryID 11/Property1 39: ignora (sem efeito, sem crash)", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(143, (o) => { o.writeInt(50); o.writeInt(0); }); // slot 50 da EquipBag: vazio (sem item nenhum)
    await new Promise((res) => setTimeout(res, 100));
    expect(c.received.slice(m).some((r) => r.code === 143 || r.code === 142)).toBe(false);
    c.close();
  });
});
