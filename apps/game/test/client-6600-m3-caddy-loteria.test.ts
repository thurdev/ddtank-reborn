/**
 * M3 `m3-caddy-loteria` (docs/plan/TASKS.md): família "Pedra da Sorte" do 6600 — 97 LUCKSTONE_RANK_LIMIT,
 * 165 LUCKSTONE_CONFIG, 211 CADDY_EXCHANGE_ALL, 215 CADDY_CONVERTED_ALL. A feature é permanentemente fechada
 * no servidor 6600 decompilado (`AbstractPacketLib.SendLuckStoneEnable` sempre manda `isOpen=false`, e 97/211
 * não têm handler C# nenhum) — este port responde exatamente como o original responderia (165/97 fechados,
 * 211/215 sem resposta), sem inventar uma economia de "LuckStone" que não existe em tabela nenhuma.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import { loggedIn, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server?.stop();
});

describe("97/165/211/215 'Pedra da Sorte' (6600)", () => {
  it("165 LUCKSTONE_CONFIG: sempre fechado (isOpen=false), início agora, fim em +7 dias", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(165);
    const r = await c.code(165, undefined, m);
    const start = r.pkt.readDateTime();
    const end = r.pkt.readDateTime();
    expect(r.pkt.readBoolean()).toBe(false); // isOpen
    expect(end.getTime() - start.getTime()).toBeGreaterThan(6 * 24 * 3600 * 1000);
    c.close();
  });

  it("97 LUCKSTONE_RANK_LIMIT: sempre fechado/vazio (isStart=false, lista vazia)", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(97, (o) => o.writeBoolean(false));
    const r = await c.code(97, undefined, m);
    expect(r.pkt.readBoolean()).toBe(false); // isStart
    expect(r.pkt.readString()).toBe(""); // lastTime
    expect(r.pkt.readBoolean()).toBe(false); // isOpen
    expect(r.pkt.readInt()).toBe(0); // count
    c.close();
  });

  it("211 CADDY_EXCHANGE_ALL: sem resposta, sem crash (dead wire, igual ao C# original)", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(211);
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 211)).toBe(false);
    c.close();
  });

  it("215 CADDY_CONVERTED_ALL: lê os 3 campos e não responde nada (CaddyConvertedHandler.cs verbatim)", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(215, (o) => { o.writeBoolean(true); o.writeInt(42); o.writeInt(7); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 215)).toBe(false);
    c.close();
  });
});
