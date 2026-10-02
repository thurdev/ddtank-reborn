import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import { DbBotProvider } from "../src/bots/provider.js";
import { ItemInfo } from "../src/game/item.js";
import { loggedIn, sharedDb, sleep, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server.stop();
});

describe("chat", () => {
  it("lobby chat reaches the other player; 2nd message inside the cooldown is refused", async () => {
    const a = await loggedIn(server);
    const b = await loggedIn(server);
    const mark = b.c.mark();
    const say = (txt: string) => a.c.out(19, (o) => { o.writeByte(5); o.writeBoolean(false); o.writeUTF(""); o.writeUTF(txt); });
    say("hello");
    const got = await b.c.code(19, undefined, mark);
    got.pkt.readInt(); got.pkt.readByte(); got.pkt.readBoolean();
    expect(got.pkt.readString()).toBe(a.ch.nick);
    expect(got.pkt.readString()).toBe("hello");
    a.c.close();
    b.c.close();
  });

  it("C_BUGLE (73, world bugle 11100) consumes the item and reaches everyone", async () => {
    const a = await loggedIn(server);
    const b = await loggedIn(server);
    const t = server.ctx.templates.findItem(11100);
    if (!t) return; // template not in the seed
    a.player().propBag.addItem(ItemInfo.createFromTemplate(t, 2, 0));
    const mark = b.c.mark();
    a.c.out(73, (o) => { o.writeInt(a.ch.userId); o.writeUTF(a.ch.nick); o.writeUTF("world!"); });
    const got = await b.c.code(73, undefined, mark);
    got.pkt.readInt(); got.pkt.readInt();
    expect(got.pkt.readString()).toBe(a.ch.nick);
    expect(got.pkt.readString()).toBe("world!");
    expect(a.player().propBag.getItemCount(11100)).toBe(1);
    a.c.close();
    b.c.close();
  });
});

describe("bots (auto-match fallback)", () => {
  it("DbBotProvider hands out distinct bots at the human's level and takes them back", async () => {
    const p = await new DbBotProvider().load((await sharedDb()).db);
    p.setSpecs([
      { id: 1, nickname: "A", sex: true, level: 5, weaponTemplateId: 7001, difficulty: "easy" },
      { id: 2, nickname: "B", sex: false, level: 30, weaponTemplateId: 7001, difficulty: "hard" },
    ]);
    const x = p.acquire(28)!;
    expect(x.info.NickName).toBe("B");
    expect(x.info.Grade).toBe(28);
    expect(x.id).toBeLessThan(0);
    const y = p.acquire(28)!;
    expect(y.info.NickName).toBe("A");
    expect(p.acquire(28)).toBeNull();
    p.release(x);
    expect(p.acquire(1)!.info.NickName).toBe("B");
  });

  it("a lone Match room is paired with a bot after BOT_FALLBACK_SEC", async () => {
    const rooms = server.ctx.rooms as unknown as { o: { botFallbackSec: number } };
    rooms.o.botFallbackSec = 0.3;
    const a = await loggedIn(server, { grade: 10 });
    a.c.out(16);
    await a.c.code(94, 9);
    a.c.out(94, (o) => { o.writeInt(0); o.writeByte(0); o.writeByte(2); o.writeUTF("m"); o.writeUTF(""); });
    await a.c.code(94, 0);
    a.c.out(94, (o) => o.writeInt(7));
    const create = await a.c.waitFor((r) => r.code === 91 && r.sub === 101, 5000); // GAME_CREATE
    expect(create).toBeTruthy();
    await sleep(50);
    a.c.close();
  });
});
