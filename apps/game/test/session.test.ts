import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import { quitPlayer } from "../src/session/login.js";
import { FakeClient, createCharacter, sharedDb, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server.stop();
});

describe("single session per account", () => {
  it("new login kicks the old one and loads the state the old session saved (no stale-DB dupe)", async () => {
    const db = await sharedDb();
    const ch = await createCharacter(db, { money: 500 });
    const a = FakeClient.memory(server);
    a.login(ch.user, ch.pass);
    await a.code(95);
    const pa = server.ctx.world.get(ch.userId)!;
    pa.info.Money = 777; // in-memory change, not yet in the DB
    const b = FakeClient.memory(server);
    b.login(ch.user, ch.pass);
    await b.code(95);
    await a.code(2);
    await a.waitClosed();
    const pb = server.ctx.world.get(ch.userId)!;
    expect(pb).not.toBe(pa);
    expect(pb.info.Money).toBe(777);
    expect(server.ctx.world.all().filter((p) => p.id === ch.userId).length).toBe(1);
    b.close();
  });

  it("concurrent quitPlayer calls share one quit", async () => {
    const db = await sharedDb();
    const ch = await createCharacter(db);
    const a = FakeClient.memory(server);
    a.login(ch.user, ch.pass);
    await a.code(95);
    const p = server.ctx.world.get(ch.userId)!;
    const q1 = quitPlayer(server.ctx, p);
    const q2 = quitPlayer(server.ctx, p);
    expect(q1).toBe(q2);
    await q1;
    expect(server.ctx.world.get(ch.userId)).toBeUndefined();
    a.close();
  });
});
