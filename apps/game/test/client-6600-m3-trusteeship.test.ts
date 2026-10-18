/**
 * M3 `m3-trusteeship` (docs/plan/TASKS.md): 140 TRUSTEESHIP (`sendTrusteeshipStart/Cancel/SpeedUp/BuySpirit/
 * UseSpiritItem`, confirmados chamados em `quest/TrusteeshipView.as`/`TrusteeshipManager.as`/
 * `ddt/command/QuickUseFrame.as:127`). Sem handler C# em nenhum vendor — ver cabeçalho de
 * `handlers/missoes/curadoria.ts`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, and } from "drizzle-orm";
import { player as playerSchema } from "@ddt/db";
import type { GameServer } from "../src/server.js";
import { loggedIn, sharedDb, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server.stop();
});

const T = playerSchema.Sys_Users_Trusteeship;

describe("140 TRUSTEESHIP", () => {
  it("START cobra energia espiritual, persiste EndTime no banco e aparece na lista; CANCEL remove sem gastar de novo", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    c.out(176, (o) => { o.writeInt(1); o.writeInt(341); }); // quest 341: 4 vitórias Match (ver quests.test.ts)
    await c.code(178);

    const m = c.mark();
    c.out(140, (o) => { o.writeByte(1); o.writeInt(341); });
    const r = await c.code(140, 1, m);
    r.pkt.readByte(); // sub 1 (START/refresh)
    expect(r.pkt.readInt()).toBe(80); // spirit 100 - CollocationCost default 20
    const count = r.pkt.readInt();
    expect(count).toBe(1);
    expect(r.pkt.readInt()).toBe(341); // questId
    expect(p().extra?.TrusteeshipSpirit).toBe(80);

    const db = await sharedDb();
    const rows = await db.db.select().from(T).where(and(eq(T.UserID, p().id), eq(T.QuestID, 341)));
    expect(rows).toHaveLength(1);

    const m2 = c.mark();
    c.out(140, (o) => { o.writeByte(2); o.writeInt(341); });
    const r2 = await c.code(140, 1, m2);
    r2.pkt.readByte();
    expect(r2.pkt.readInt()).toBe(80); // CANCEL não devolve a energia (igual não devolver pelo "Iniciar" de novo)
    expect(r2.pkt.readInt()).toBe(0); // lista vazia
    const rowsAfter = await db.db.select().from(T).where(and(eq(T.UserID, p().id), eq(T.QuestID, 341)));
    expect(rowsAfter).toHaveLength(0);
    c.close();
  });

  it("quando o prazo (tempo do SERVIDOR) já passou, a próxima ação entrega a missão de verdade (QuestInventory.finish) e remove a entrada", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    c.out(176, (o) => { o.writeInt(1); o.writeInt(341); });
    await c.code(178);
    c.out(140, (o) => { o.writeByte(1); o.writeInt(341); });
    await c.code(140, 1);
    expect(p().questInv!.list.has(341)).toBe(true);

    const db = await sharedDb();
    await db.db.update(T).set({ EndTime: new Date(Date.now() - 1000) }).where(and(eq(T.UserID, p().id), eq(T.QuestID, 341)));

    const m = c.mark();
    c.out(140, (o) => { o.writeByte(2); o.writeInt(999_999); }); // cancel de um id qualquer só pra disparar o sweep
    await c.code(140, 1, m);
    expect(p().questInv!.list.has(341)).toBe(false); // entregue de verdade (removida do questInv)
    const rows = await db.db.select().from(T).where(and(eq(T.UserID, p().id), eq(T.QuestID, 341)));
    expect(rows).toHaveLength(0);
    c.close();
  });

  it("BUY_SPIRIT cobra Xu e aumenta a energia espiritual, capado no máximo", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600", money: 10_000 });
    c.out(176, (o) => { o.writeInt(1); o.writeInt(341); });
    await c.code(178);
    c.out(140, (o) => { o.writeByte(1); o.writeInt(341); }); // gasta 20 de energia (fica em 80)
    await c.code(140, 1);
    expect(p().extra?.TrusteeshipSpirit).toBe(80);

    const before = p().info.Money;
    const m = c.mark();
    c.out(140, (o) => { o.writeByte(4); o.writeBoolean(false); });
    const r = await c.code(140, 4, m);
    r.pkt.readByte();
    expect(r.pkt.readInt()).toBe(100); // 80 + QuestCollocationEnergyBuyCount default (20), capado em 100
    expect(p().info.Money).toBe(before - 3000); // QuestCollocationEnergyBuyCost default
    c.close();
  });

  it("SPEED_UP cobra Xu/minuto restante; fica GRÁTIS com uma Bênção do Rei ativa", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600", money: 1_000_000 });
    c.out(176, (o) => { o.writeInt(1); o.writeInt(341); });
    await c.code(178);
    c.out(140, (o) => { o.writeByte(1); o.writeInt(341); });
    await c.code(140, 1);

    const mBless = c.mark();
    c.out(142, (o) => { o.writeByte(1); o.writeInt(p().id); o.writeUTF(""); o.writeBoolean(false); });
    await c.code(142, undefined, mBless); // 142 KING_BLESS_MAIN closed já foi mandado no burst de login — precisa do `from`
    expect(p().extra?.KingBlessIndex).toBeGreaterThan(0);

    const before = p().info.Money;
    const m = c.mark();
    c.out(140, (o) => { o.writeByte(3); o.writeInt(341); o.writeBoolean(false); });
    await c.code(140, 1, m);
    expect(p().info.Money).toBe(before); // grátis
    expect(p().questInv!.list.has(341)).toBe(false); // terminou na hora
    c.close();
  });
});
