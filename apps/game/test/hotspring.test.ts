import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import { hotSpringMgr, sanitizePath } from "../src/handlers/hotspring.js";
import { sql } from "drizzle-orm";
import { loggedIn, sharedDb, startServer } from "./helpers.js";

describe("hot spring path sanitizing", () => {
  it("keeps integer pairs, clamps to the scene, drops junk", () => {
    expect(sanitizePath("10,20,30.7,-5")).toEqual([10, 20, 30, 0]);
    expect(sanitizePath("1,2,3")).toEqual([1, 2]);
    expect(sanitizePath("a,b")).toEqual([]);
    expect(sanitizePath("99999,5")).toEqual([2000, 5]);
  });
});

describe("hot spring rooms", () => {
  let server: GameServer;
  beforeAll(async () => {
    const db = (await sharedDb()).db;
    await db.execute(sql`INSERT INTO game."HotSpringRoom" ("roomNumber","roomID","roomName","roomType","maxCount") VALUES (1, 1, 'Spa 1', 2, 10), (2, 2, 'Spa 2', 2, 10) ON CONFLICT DO NOTHING`);
    server = await startServer();
  });
  afterAll(async () => {
    await server.stop();
  });

  it("list, enter (10000 gold), see each other, server-authoritative moves, exp tick, leave", async () => {
    const a = await loggedIn(server, { grade: 12, gold: 20000 });
    const b = await loggedIn(server, { grade: 10, gold: 20000 });
    a.c.out(187);
    const list = await a.c.code(197);
    const n = list.pkt.readInt();
    expect(n).toBeGreaterThan(0);
    list.pkt.readInt();
    const roomId = list.pkt.readInt();

    a.c.out(202, (o) => { o.writeInt(roomId); o.writeString(""); });
    const enter = await a.c.code(202);
    expect(enter.pkt.readInt()).toBe(roomId);
    expect(a.player().info.Gold).toBe(10000);

    const fromA = a.c.mark();
    b.c.out(202, (o) => { o.writeInt(roomId); o.writeString(""); });
    await b.c.code(202);
    const add = await a.c.code(198, undefined, fromA);
    expect(add.pkt.readInt()).toBe(b.ch.userId);

    // b claims to move a (id spoofing): only b moves
    const fromA2 = a.c.mark();
    b.c.out(191, (o) => { o.writeByte(1); o.writeString("500,600,700,650"); o.writeInt(a.ch.userId); o.writeInt(1); o.writeInt(1); o.writeInt(0); o.writeInt(4); });
    const mv = await a.c.waitFor((r) => r.code === 191, 4000, fromA2);
    mv.pkt.readByte();
    expect(mv.pkt.readString()).toBe("500,600,700,650");
    expect(mv.pkt.readInt()).toBe(b.ch.userId);
    expect([mv.pkt.readInt(), mv.pkt.readInt()]).toEqual([700, 650]);
    const m = await hotSpringMgr(server.ctx);
    expect([m.st(a.player()).x, m.st(a.player()).y]).toEqual([480, 560]);

    // timed exp: one tick
    if (!m.expTable.some(Boolean)) m.expTable = Array.from({ length: 60 }, (_, i) => 200 + i * 50); // test DB has no Server_Config
    const gp0 = a.player().info.GP;
    const min0 = m.st(a.player()).min;
    const gain = m.tick(a.player());
    expect(gain).toBeGreaterThan(0);
    expect(a.player().info.GP).toBe(gp0 + gain);
    expect(m.st(a.player()).min).toBe(min0 - 1);

    const fromB = b.c.mark();
    a.c.out(169);
    await a.c.code(169);
    const rm = await b.c.code(199, undefined, fromB);
    expect(rm.pkt.readInt()).toBe(a.ch.userId);
    expect(m.rooms.get(roomId)!.count).toBe(1);
  });
});
