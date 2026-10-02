import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { GameServer } from "../src/server.js";
import { parseRel, writeRel } from "../src/handlers/academy.js";
import { loggedIn, sharedDb, sleep, startServer } from "./helpers.js";

describe("academy relation string (PlayerInfo.ConvertMasterOrApprentices)", () => {
  it("state follows the count and masterID", () => {
    const p = { masterID: 0, masterOrApprentices: "", apprenticeshipState: 0 } as never as Parameters<typeof writeRel>[0];
    writeRel(p, new Map([[5, "a"]]));
    expect([p.apprenticeshipState, p.masterOrApprentices]).toEqual([2, "5|a"]);
    writeRel(p, new Map([[5, "a"], [6, "b"], [7, "c"]]));
    expect(p.apprenticeshipState).toBe(3);
    p.masterID = 9;
    writeRel(p, new Map([[9, "m"]]));
    expect(p.apprenticeshipState).toBe(1);
    expect([...parseRel("5|a,6|b|x")]).toEqual([[5, "a"], [6, "b|x"]]);
  });
});

describe("141 ACADEMY", () => {
  let server: GameServer;
  beforeAll(async () => {
    server = await startServer();
  });
  afterAll(async () => {
    await server.stop();
  });

  it("apprentice asks, master accepts, level 20 graduates, expel costs 20000 gold", async () => {
    const m = await loggedIn(server, { grade: 25, gold: 50000 });
    const a = await loggedIn(server, { grade: 10 });
    // 141/4: the apprentice asks the master
    a.c.out(141, (o) => { o.writeByte(4); o.writeInt(m.ch.userId); o.writeString("teach me"); });
    const ask = await m.c.code(141, 4);
    ask.pkt.readByte();
    expect(ask.pkt.readInt()).toBe(a.ch.userId);
    // 141/6: the master accepts
    const from = m.c.mark();
    m.c.out(141, (o) => { o.writeByte(6); o.writeInt(a.ch.userId); });
    const st = await m.c.code(141, 10, from);
    st.pkt.readByte();
    expect(st.pkt.readInt()).toBe(2);
    await a.c.code(141, 10);
    expect(a.player().info.masterID).toBe(m.ch.userId);
    expect(a.player().info.apprenticeshipState).toBe(1);
    const db = (await sharedDb()).db;
    await sleep(100);
    const row = (await db.execute(sql`SELECT "masterOrApprentices" FROM player."Sys_Users_Detail" WHERE "UserID" = ${m.ch.userId}`)) as never as { rows?: { masterOrApprentices: string }[] } & { masterOrApprentices: string }[];
    const r0 = (row.rows ?? row)[0]!;
    expect(r0.masterOrApprentices).toBe(`${a.ch.userId}|${a.player().info.NickName}`);

    // graduation: the apprentice reaches 20 -> both relations cleared, master graduatesCount + 1
    const ap = a.player();
    const g20 = server.ctx.templates.levelGp.find((l) => l.grade === 20)!.gp;
    const fromG = a.c.mark();
    ap.addGP(Math.max(1, g20 - ap.info.GP), false);
    await a.c.code(141, 11, fromG);
    expect(ap.info.masterID).toBe(0);
    expect(m.player().info.graduatesCount).toBe(1);
    expect(m.player().info.apprenticeshipState).toBe(0);
  });

  it("master expels an apprentice (13) for 20000 gold and gets frozen", async () => {
    const m = await loggedIn(server, { grade: 25, gold: 30000 });
    const a = await loggedIn(server, { grade: 12 });
    m.c.out(141, (o) => { o.writeByte(5); o.writeInt(a.ch.userId); o.writeString("join"); });
    await a.c.code(141, 5);
    a.c.out(141, (o) => { o.writeByte(7); o.writeInt(m.ch.userId); });
    await m.c.code(141, 10);
    const from = m.c.mark();
    m.c.out(141, (o) => { o.writeByte(13); o.writeInt(a.ch.userId); });
    await m.c.code(141, 10, from);
    expect(m.player().info.Gold).toBe(10000);
    expect(m.player().info.freezesDate.getTime()).toBeGreaterThan(Date.now() + 47 * 3_600_000);
    expect(a.player().info.masterID).toBe(0);
  });
});
