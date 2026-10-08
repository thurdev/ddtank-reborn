import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { player } from "@ddt/db";
import type { GameServer } from "../src/server.js";
import { loggedIn, sharedDb, startServer, type FakeClient } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server?.stop();
});

/**
 * O burst de login termina com 95 (necklace) + 107/5 (invite state). Como o
 * 107 chega DEPOIS do 95, consome ele antes de marcar o ponto de partida —
 * senão o primeiro 107 lido é o do login, não o da resposta testada.
 */
async function freshMark(c: FakeClient): Promise<number> {
  const login = await c.code(107, undefined);
  expect(login.pkt.readInt()).toBe(5); // sub echo do login
  return c.mark();
}

describe("107 INVITE_FRIEND (Reborn impl — 4.1 base has no server logic)", () => {
  it("login burst carries 107/5 invite state", async () => {
    const { c, player: pl } = await loggedIn(server);
    const login = await c.code(107, undefined);
    expect(login.pkt.readInt()).toBe(5);
    expect(login.pkt.readString()).toBe(String(pl().id));
    expect(login.pkt.readInt()).toBe(0); // no invites yet
    login.pkt.readDateTime(true);
    expect([login.pkt.readInt(), login.pkt.readInt(), login.pkt.readInt(), login.pkt.readInt()]).toEqual([0, 0, 0, 0]);
    expect(login.pkt.readInt()).toBe(1); // serverID
    expect(pl().id).toBeGreaterThan(0);
    const m = c.mark();
    c.out(107, (x) => x.writeInt(2));
    const r = await c.code(107, undefined, m);
    expect(r.pkt.readInt()).toBe(2); // sub echo
    expect(r.pkt.readInt()).toBe(0);
    expect(r.pkt.readInt()).toBe(0);
    expect(r.pkt.readInt()).toBe(0); // no invites yet
    c.close();
  });

  it("FRIENDREWARD records nick once and pushes FLUSHFRIENDNUM", async () => {
    const { c } = await loggedIn(server);
    await freshMark(c);
    let m = c.mark();
    c.out(107, (x) => {
      x.writeInt(1);
      x.writeUTF("AmigoTeste");
    });
    const r = await c.code(107, undefined, m);
    expect(r.pkt.readInt()).toBe(3); // sub echo
    expect(r.pkt.readInt()).toBe(1); // successNum
    m = c.mark();
    c.out(107, (x) => {
      x.writeInt(1);
      x.writeUTF("AmigoTeste"); // duplicate: no new packet
    });
    c.out(107, (x) => x.writeInt(2)); // ping view to prove nothing arrived
    const r2 = await c.code(107, undefined, m);
    r2.pkt.readInt(); // sub echo
    r2.pkt.readInt();
    r2.pkt.readInt();
    expect(r2.pkt.readInt()).toBe(1); // count still 1
    c.close();
  });

  it("GETREWARD grants tier gold once (claimOnce idempotent)", async () => {
    const { c, player: pl } = await loggedIn(server);
    let m = await freshMark(c);
    c.out(107, (x) => {
      x.writeInt(1);
      x.writeUTF("AmigoOuro");
    });
    const pre = await c.code(107, undefined, m);
    const preSub = pre.pkt.readInt();
    if (preSub !== 3) throw new Error(`expected FLUSH(3) before GETREWARD, got sub=${preSub}`);
    const gold = pl().info.Gold;
    m = c.mark();
    c.out(107, (x) => {
      x.writeInt(4);
      x.writeInt(1); // tier 1 (needs >=1 invite)
    });
    const r = await c.code(107, undefined, m);
    expect(r.pkt.readInt()).toBe(4); // sub echo
    expect(r.pkt.readInt()).toBe(1); // tier echo
    expect(r.pkt.readBoolean()).toBe(true);
    expect([r.pkt.readInt(), r.pkt.readInt(), r.pkt.readInt(), r.pkt.readInt()]).toEqual([1, 0, 0, 0]);
    expect(pl().info.Gold).toBe(gold + 1000);
    m = c.mark();
    c.out(107, (x) => {
      x.writeInt(4);
      x.writeInt(1); // repeat: denied, no double gold
    });
    const r2 = await c.code(107, undefined, m);
    r2.pkt.readInt(); // sub echo
    r2.pkt.readInt(); // tier echo
    expect(r2.pkt.readBoolean()).toBe(false);
    expect(pl().info.Gold).toBe(gold + 1000);
    // tier 2 needs 3 invites: denied
    m = c.mark();
    c.out(107, (x) => {
      x.writeInt(4);
      x.writeInt(2);
    });
    const r3 = await c.code(107, undefined, m);
    r3.pkt.readInt(); // sub echo
    r3.pkt.readInt(); // tier echo
    expect(r3.pkt.readBoolean()).toBe(false);
    c.close();
  });

  it("FBCLICK echoes server date", async () => {
    const { c } = await loggedIn(server);
    await freshMark(c);
    const m = c.mark();
    c.out(107, (x) => x.writeInt(6));
    const r = await c.code(107, undefined, m);
    expect(r.pkt.readInt()).toBe(6); // sub echo
    const d = r.pkt.readDateTime(true);
    expect(Math.abs(d.getTime() - Date.now())).toBeLessThan(60_000);
    c.close();
  });
});

describe("40 SNS_MSG_RECEIVE + 223 FRIEND_BRITHDAY", () => {
  it("40: fire-and-forget, no reply, connection stays alive", async () => {
    const { c } = await loggedIn(server);
    await freshMark(c);
    const m = c.mark();
    c.out(40, (x) => x.writeInt(4));
    c.out(107, (x) => x.writeInt(2)); // next packet still answered
    const r = await c.code(107, undefined, m);
    expect(r.pkt.readInt()).toBe(2); // sub echo
    expect(c.received.slice(m).some((x) => x.code === 40)).toBe(false);
    c.close();
  });

  it("223: birthday mail type 60 + 117/1 refresh", async () => {
    const { c, ch } = await loggedIn(server);
    await freshMark(c);
    const m = c.mark();
    c.out(223, (x) => {
      x.writeInt(1);
      x.writeInt(999);
      x.writeUTF("AmigoNiver");
      x.writeDateTime(new Date(), true);
    });
    await c.code(117, undefined, m);
    const db = await sharedDb();
    const mail = await db.db.select().from(player.User_Messages).where(eq(player.User_Messages.ReceiverID, ch.userId));
    expect(mail.find((mm) => mm.Type === 60)).toBeDefined();
    c.close();
  });
});
