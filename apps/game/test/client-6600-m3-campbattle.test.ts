/**
 * `m3-campbattle` (docs/plan/TASKS.md): no-op puro — ver `apps/game/src/handlers/eventos/campbattle.ts`
 * pro achado (tela nunca abre no original: `ACTION_ISOPEN` nunca enviado + clique do ícone manda
 * `SINGLE_ROOM_BEGIN(5)`, que não tem `case` no switch do servidor original). Cada teste manda o pacote
 * exato que o cliente 6600 manda (`GameSocketOut.as`) pra cada uma das 10 sub-ações e confirma: não
 * derruba a conexão, sem resposta no mesmo código — igual ao original (mesmo dentro da cena, hipotética).
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

describe("146 CAMPBATTLE (m3-campbattle): tela nunca abre no original, no-op", () => {
  it("sub 2 ROLE_MOVE (x,y,zoneId,userId): sem resposta", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(146, (o) => { o.writeByte(2); o.writeInt(100); o.writeInt(200); o.writeInt(4); o.writeInt(7); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 146)).toBe(false);
    c.close();
  });

  it("sub 3 REMOVE_ROLE / outCampBatttle (sem campos): sem resposta", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(146, (o) => { o.writeByte(3); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 146)).toBe(false);
    c.close();
  });

  it("sub 5 ENTER_MONSTER_FIGHT (id) / CampbattleEnterFight: sem resposta", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(146, (o) => { o.writeByte(5); o.writeInt(60018); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 146)).toBe(false);
    c.close();
  });

  it("sub 6 INIT_SECEN / returnToPve, 9 MAP_CHANGE / changeMap (sem campos): sem resposta", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(146, (o) => { o.writeByte(6); });
    c.out(146, (o) => { o.writeByte(9); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 146)).toBe(false);
    c.close();
  });

  it("sub 16 PVP_TO_FIGHT (zoneId,userId) / enterPTPFight: sem resposta", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(146, (o) => { o.writeByte(16); o.writeInt(4); o.writeInt(9); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 146)).toBe(false);
    c.close();
  });

  it("sub 17 CAPTURE_MAP (bool) / captureMap: sem resposta", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(146, (o) => { o.writeByte(17); o.writeBoolean(true); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 146)).toBe(false);
    c.close();
  });

  it("sub 18 RESURRECT (isCost,isBind) / resurrect: sem resposta", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(146, (o) => { o.writeByte(18); o.writeBoolean(true); o.writeBoolean(false); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 146)).toBe(false);
    c.close();
  });

  it("sub 20 CAMP_SOCER_RANK / requestCRankList, 21 PER_SCORE_RANK / requestPRankList (sem campos): sem resposta", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(146, (o) => { o.writeByte(20); });
    c.out(146, (o) => { o.writeByte(21); });
    await new Promise((res) => setTimeout(res, 150));
    expect(c.received.slice(m).some((r) => r.code === 146)).toBe(false);
    c.close();
  });
});
