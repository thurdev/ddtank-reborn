/**
 * `m3-seven-double` / `m3-launcher-login` / `m3-misc-sweep` (docs/plan/TASKS.md): todos no-op puro —
 * ver `apps/game/src/handlers/eventos/sete-dobrado.ts`, `launcher-login.ts`, `sweep-diversos.ts` pro
 * achado de cada código contra o C# original. Cada teste manda o pacote exato que o cliente 6600 manda
 * (`GameSocketOut.as`/`GameInSocketOut.as`) e confirma: não derruba a conexão, não responde no mesmo
 * código (ou responde sem nenhum campo extra, quando listado) — igual ao original.
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

describe("148 SEVEN_DOUBLE (m3-seven-double): tela nunca abre no original, no-op", () => {
  it("sub 3 CALL (val, isBand): sem resposta", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(148, (o) => { o.writeByte(3); o.writeInt(42); o.writeBoolean(false); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 148)).toBe(false);
    c.close();
  });

  it("sub 9 READY e 35 IS_CAN_ENTER: sem resposta (inalcançável sem START_OR_END)", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(148, (o) => { o.writeByte(9); });
    c.out(148, (o) => { o.writeByte(35); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 148)).toBe(false);
    c.close();
  });
});

describe("208 LAUNCHER_LOGIN (m3-launcher-login): flag de cliente puro, descartado também no original", () => {
  it("sendDeskTopLogin(0): sem resposta, sem crash", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(208, (o) => { o.writeInt(0); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 208)).toBe(false);
    c.close();
  });
});

describe("m3-misc-sweep: códigos pequenos restantes, todos no-op (ver sweep-diversos.ts)", () => {
  it("101 BATTLE_COMPANION_GIVE (id, bagType, place): 100% morto no original", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(101, (o) => { o.writeInt(11101); o.writeInt(1); o.writeInt(0); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 101)).toBe(false);
    c.close();
  });

  it("147 FIND_BACK_INCOME (type, findBackType, isBand): 100% morto no original", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(147, (o) => { o.writeInt(1); o.writeBoolean(true); o.writeBoolean(false); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 147)).toBe(false);
    c.close();
  });

  it("152 FIGHTFOOTBALLTIMETAKEOUT (place): real no original, mas depende de subsistema não portado — stub", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(152, (o) => { o.writeByte(0); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 152)).toBe(false);
    c.close();
  });

  it("156 TRANSNATIONAL_BUYGOODS (id): real no original, mas depende de room type não portado — stub", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(156, (o) => { o.writeInt(5001); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 156)).toBe(false);
    c.close();
  });

  it("157 RECHARGE/getspree (sub, rewardId, type, regetType, time): 100% morto no original", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(157, (o) => { o.writeInt(1); o.writeInt(1); o.writeInt(1); o.writeInt(0); o.writeInt(0); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 157)).toBe(false);
    c.close();
  });

  it("164 UPDATE_PLAYER_PROPERTY (sem corpo): 100% morto no original", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(164, () => {});
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 164)).toBe(false);
    c.close();
  });

  it("207 REQUEST_FRIENDS_PAY (sub byte + corpo variável): handler original só lê o sub e nunca responde", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    // requestAuctionPay(auctionID, name, msg) — sub + int + 2 str; o original nem lê esses 3 campos.
    c.out(207, (o) => { o.writeByte(3); o.writeInt(77); o.writeUTF("nick"); o.writeUTF(""); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 207)).toBe(false);
    c.close();
  });

  it("327 FAST_AUCTION_SMALL_BUGLE (auctionId): alcançável pelo cliente, 100% morto no servidor original", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(327, (o) => { o.writeInt(123); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 327)).toBe(false);
    c.close();
  });

  it("360 GET_CSM_BOX (sem corpo): 100% morto no original", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(360, () => {});
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 360)).toBe(false);
    c.close();
  });
});
