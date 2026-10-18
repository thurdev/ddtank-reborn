/**
 * M3 `m3-magic-stone-monster` (docs/plan/TASKS.md): 284 MAGIC_STONE_MONSTER_INFO (`sendCheckMagicStoneNumber`,
 * confirmado chamado em `magicStone/views/MagicStoneInfoView.as:607`) — consulta pura de
 * `NormalFightNum`/`HardFightNum` (`player."Sys_Users_Extra"`, colunas adicionadas na migração 0020).
 * Ver `handlers/progressao/reliquias-monstro-info.ts`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { GameServer } from "../src/server.js";
import { createCharacter, FakeClient, loggedIn, sharedDb, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server?.stop();
});

describe("284 MAGIC_STONE_MONSTER_INFO — Relíquias (6600)", () => {
  it("conta nova (sem linha em Sys_Users_Extra ainda): devolve os defaults 1/1 (PlayerExtra.CreateUsersExtra)", async () => {
    const { c } = await loggedIn(server, { client: "6600" });
    const m = c.mark();
    c.out(284);
    const r = await c.code(284, undefined, m);
    expect(r.pkt.readInt()).toBe(1); // NormalFightNum
    expect(r.pkt.readInt()).toBe(1); // HardFightNum
    c.close();
  });

  it("devolve os valores reais quando já existe linha em Sys_Users_Extra", async () => {
    const db = await sharedDb();
    const ch = await createCharacter(db, { client: "6600" });
    await db.db.execute(sql`INSERT INTO player."Sys_Users_Extra" ("UserID","NormalFightNum","HardFightNum") VALUES (${ch.userId}, 7, 3)`);
    const c = FakeClient.memory(server);
    c.login(ch.user, ch.pass);
    await c.code(95);
    const m = c.mark();
    c.out(284);
    const r = await c.code(284, undefined, m);
    expect(r.pkt.readInt()).toBe(7);
    expect(r.pkt.readInt()).toBe(3);
    c.close();
  });

  it("4.1 nunca manda 284 (feature nova do 6600)", async () => {
    const { c } = await loggedIn(server, { client: "41" });
    expect(c.received.some((r) => r.code === 284)).toBe(false);
    c.close();
  });
});
