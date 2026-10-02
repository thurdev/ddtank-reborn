import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import { loggedIn, sharedDb, startServer } from "./helpers.js";
import { player } from "@ddt/db";
import { and, eq } from "drizzle-orm";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server.stop();
});

/** Reads a 178 QUEST_UPDATE body: quest ids + IsComplete + Condition1. */
function readQuests(pkt: import("@ddt/protocol").GSPacket) {
  pkt.offset = 20;
  const n = pkt.readInt();
  const out: { id: number; done: boolean; c1: number }[] = [];
  for (let i = 0; i < n; i++) {
    const id = pkt.readInt();
    const done = pkt.readBoolean();
    const c1 = pkt.readInt();
    pkt.readInt(); pkt.readInt(); pkt.readInt();
    pkt.readDateTime(); pkt.readInt(); pkt.readInt(); pkt.readBoolean();
    out.push({ id, done, c1 });
  }
  return out;
}

describe("quests (176/177/179/181)", () => {
  it("sends an (empty) 178 at login, adds client-requested quests, tracks wins and pays rewards", async () => {
    const { c, ch, player: p } = await loggedIn(server, { grade: 10 });
    const first = await c.code(178);
    expect(readQuests(first.pkt)).toEqual([]);

    // quest 6: DirectFinish (16) + 1 item reward; quest 341: win 4 Match games (6:0:4), 2000 gold, 1500 GP
    let mark = c.mark();
    c.out(176, (o) => { o.writeInt(3); o.writeInt(6); o.writeInt(341); o.writeInt(999999); });
    const upd = await c.waitFor((r) => r.code === 178 && readQuests(r.pkt).some((q) => q.id === 341), 4000, mark);
    expect(readQuests(upd.pkt).find((q) => q.id === 341)!.c1).toBe(4);
    expect([...p().questInv!.list.keys()].sort((a, b) => a - b)).toEqual([6, 341]);
    expect(p().questInv!.list.get(341)!.data.Condition1).toBe(4);

    mark = c.mark();
    c.out(179, (o) => { o.writeInt(6); o.writeInt(0); });
    const fin = await c.code(179, undefined, mark);
    expect(fin.pkt.readInt()).toBe(6);
    expect(p().questInv!.isQuestFinish(6)).toBe(true);
    expect(p().questInv!.list.has(6)).toBe(false);

    // not done yet -> no 179
    await new Promise((r) => setTimeout(r, 1100));
    mark = c.mark();
    c.out(179, (o) => { o.writeInt(341); o.writeInt(0); });
    await new Promise((r) => setTimeout(r, 300));
    expect(c.received.slice(mark).some((r) => r.code === 179)).toBe(false);

    for (let i = 0; i < 4; i++) p().questInv!.onGameOver({ roomType: 0, gameType: 0, isWin: true, kills: 1, playerCount: 2 });
    expect(p().questInv!.list.get(341)!.data.Condition1).toBe(0);
    const gold0 = p().info.Gold;
    await new Promise((r) => setTimeout(r, 1100));
    mark = c.mark();
    c.out(179, (o) => { o.writeInt(341); o.writeInt(0); });
    await c.code(179, undefined, mark);
    expect(p().info.Gold).toBe(gold0 + 2000);

    // persisted on save
    await p().saveIntoDatabase((await sharedDb()).db);
    const rows = await (await sharedDb()).db.select().from(player.QuestData).where(and(eq(player.QuestData.UserID, ch.userId)));
    expect(rows.map((r) => [r.QuestID, r.IsComplete]).sort()).toEqual([[341, true], [6, true]]);
    c.close();
  });
});
