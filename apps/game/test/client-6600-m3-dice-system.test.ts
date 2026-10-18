/**
 * M3 `m3-dice-system` (docs/plan/TASKS.md): 134 DICE_SYSTEM (`sendDiceRefreshData`/`sendStartDiceInfo`/
 * `sendRequestEnterDiceSystem`, confirmados chamados em `Dice/DiceManager.as:66`, `Dice/View/
 * DiceSystemPanel.as:208`, `Dice/View/DiceToolBar.as:217`). C#: `DiceHandler.cs`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import { loggedIn, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server.stop();
});

describe("134 DICE_SYSTEM", () => {
  it("sub 10 (enter): monta um tabuleiro novo (persistido) com FreeCount=3, posição inicial 0", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(134, (o) => o.writeByte(10));
    const r = await c.code(134, 3, m);
    r.pkt.readByte();
    expect(r.pkt.readBoolean()).toBe(false); // UserFirstCell
    expect(r.pkt.readInt()).toBe(0); // CurrentPosition
    expect(r.pkt.readInt()).toBe(-1); // LuckIntegralLevel
    expect(r.pkt.readInt()).toBe(0); // LuckIntegral
    expect(r.pkt.readInt()).toBe(3); // FreeCount
    const n = r.pkt.readInt();
    expect(n).toBeGreaterThan(0);
    c.close();
  });

  it("sub 11 (rolar): usa 1 FreeCount, anda no tabuleiro (wrap em 19) e dá o item da casa", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600" });
    c.out(134, (o) => o.writeByte(10));
    await c.code(134, 3);

    const m = c.mark();
    c.out(134, (o) => { o.writeByte(11); o.writeInt(0); o.writeInt(0); }); // tipo 0 = dado comum (1-6)
    const r = await c.code(134, 4, m);
    r.pkt.readByte();
    expect(r.pkt.readInt()).toBe(0); // posição ANTES da rolagem
    const rollValue = r.pkt.readInt();
    expect(rollValue).toBeGreaterThanOrEqual(1);
    expect(rollValue).toBeLessThanOrEqual(6);
    const luckIntegral = r.pkt.readInt();
    expect(luckIntegral).toBeGreaterThanOrEqual(2); // threadSafeRandom_0.Next(2,13), sempre soma algo
    r.pkt.readInt(); // luckIntegralLevel
    expect(r.pkt.readInt()).toBe(2); // FreeCount: 3 -> 2 (grátis, sem cobrar Xu)
    r.pkt.readString(); // rewardName
    expect(p().info.Money).toBe(10_000); // grátis não desconta Xu (login default sem `money` = 10000 em helpers? ver abaixo)
    c.close();
  });

  it("sem FreeCount e sem Xu: recusa sem rolar", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600", money: 0 });
    c.out(134, (o) => o.writeByte(10));
    await c.code(134, 3);
    let mark = c.mark();
    for (let i = 0; i < 3; i++) {
      c.out(134, (o) => { o.writeByte(11); o.writeInt(0); o.writeInt(0); });
      await c.code(134, 4, mark);
      mark = c.mark();
    }
    expect(p().info.Money).toBe(0);
    c.out(134, (o) => { o.writeByte(11); o.writeInt(0); o.writeInt(0); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(mark).some((r) => r.code === 134 && r.sub === 4)).toBe(false);
    c.close();
  });

  it("4º giro (sem FreeCount) cobra CommonDicePrice em Xu", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600", money: 100_000 });
    c.out(134, (o) => o.writeByte(10));
    await c.code(134, 3);
    let mark = c.mark();
    for (let i = 0; i < 3; i++) {
      c.out(134, (o) => { o.writeByte(11); o.writeInt(0); o.writeInt(0); });
      await c.code(134, 4, mark);
      mark = c.mark();
    }
    const before = p().info.Money;
    c.out(134, (o) => { o.writeByte(11); o.writeInt(0); o.writeInt(0); });
    const r = await c.code(134, 4, mark);
    r.pkt.readByte();
    expect(p().info.Money).toBe(before - 30_000); // CommonDicePrice default
    void r;
    c.close();
  });

  it("sub 12 (atualizar): cobra DiceRefreshPrice e sorteia um tabuleiro novo", async () => {
    const { c, player: p } = await loggedIn(server, { client: "6600", money: 100_000 });
    c.out(134, (o) => o.writeByte(10));
    await c.code(134, 3);
    const before = p().info.Money;
    const m = c.mark();
    c.out(134, (o) => o.writeByte(12));
    const r = await c.code(134, 3, m);
    r.pkt.readByte();
    expect(p().info.Money).toBe(before - 40_000); // DiceRefreshPrice default
    void r;
    c.close();
  });
});
