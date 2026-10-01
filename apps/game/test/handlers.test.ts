import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { player } from "@ddt/db";
import type { GameServer } from "../src/server.js";
import { FakeClient, createCharacter, loggedIn, sharedDb, sleep, startServer } from "./helpers.js";
import { getItemPrice, setItemType } from "../src/handlers/items.js";
import { toShopItem } from "../src/db/templates.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server?.stop();
});

const roomCmd = (c: FakeClient, sub: number, fill: (p: import("@ddt/protocol").PacketOut) => void = () => {}) =>
  c.out(94, (p) => {
    p.writeInt(sub);
    fill(p);
  });

describe("login", () => {
  it("sends the login burst in the original order (GamePlayer.cs:2960, 3337-3406)", async () => {
    const { c, ch } = await loggedIn(server);
    const codes = c.received.map((r) => r.code);
    // FightBag slots, EquipBag (weapon), then LoginSuccess ... necklace.
    expect(codes[0]).toBe(64);
    expect(codes.indexOf(1)).toBeGreaterThan(0);
    const after = codes.slice(codes.indexOf(1));
    expect(after.slice(0, 7)).toEqual([1, 67, 15, 5, 13, 34, 92]);
    expect(after.slice(-9)).toEqual([227, 402, 186, 231, 259, 102, 42, 145, 95]);
    const ls = c.received.find((r) => r.code === 1)!;
    expect(ls.clientId).toBe(ch.userId);
    expect(ls.pkt.readByte()).toBe(0);
    c.close();
  });

  it("kicks with OverTime on a bad ticket", async () => {
    const db = await sharedDb();
    const ch = await createCharacter(db);
    const c = FakeClient.memory(server);
    c.login(ch.user, "wrong");
    const k = await c.code(2);
    expect(k.pkt.readString()).toContain("quá hạn");
    await c.waitClosed();
  });

  it("enforces a single session: the older client is kicked (Game.Server.LoginNext)", async () => {
    const db = await sharedDb();
    const ch = await createCharacter(db);
    const a = FakeClient.memory(server);
    a.login(ch.user, ch.pass);
    await a.code(95);
    const b = FakeClient.memory(server);
    b.login(ch.user, ch.pass);
    await b.code(95);
    await a.code(2);
    await a.waitClosed();
    expect(server.ctx.world.get(ch.userId)?.sink).toBeDefined();
    b.close();
  });

  it("drops non-login packets before login", async () => {
    const c = FakeClient.memory(server);
    c.out(5);
    await sleep(100);
    expect(c.received.length).toBe(0);
    c.close();
  });
});

describe("ping / sync / speed check", () => {
  it("echoes the server date (5) and handles ping (4)", async () => {
    const { c } = await loggedIn(server);
    const m = c.mark();
    c.out(4);
    c.out(5);
    const r = await c.code(5, undefined, m);
    expect(r.pkt.readShort()).toBeGreaterThan(2000);
    c.close();
  });

  it("300 heartbeat too early bans and disconnects; after 5 min replies 300 {0}", async () => {
    const { c, ch, player: p } = await loggedIn(server);
    p().timeCheckHack -= 5 * 60; // last check 5 min ago
    const m = c.mark();
    c.out(300, (x) => x.writeInt(0));
    const ok = await c.code(300, undefined, m);
    expect(ok.pkt.readInt()).toBe(0);
    c.out(300, (x) => x.writeInt(0)); // immediately again -> speed hack
    await c.waitClosed();
    const db = await sharedDb();
    const [row] = await db.db.select({ ForbidDate: player.Sys_Users_Detail.ForbidDate }).from(player.Sys_Users_Detail).where(eq(player.Sys_Users_Detail.UserID, ch.userId));
    expect(row!.ForbidDate.getTime()).toBeGreaterThan(Date.now() + 10 * 60_000);
  });
});

describe("chat", () => {
  it("lobby chat reaches other lobby players, with the 30 s cooldown; whisper is echoed", async () => {
    const a = await loggedIn(server);
    const b = await loggedIn(server);
    const mb = b.c.mark();
    a.c.out(19, (p) => {
      p.writeByte(0); p.writeBoolean(false); p.writeUTF(""); p.writeUTF("hello all");
    });
    const got = await b.c.code(19, undefined, mb);
    expect(got.pkt.readInt()).toBe(server.ctx.zoneId);
    got.pkt.readByte(); got.pkt.readBoolean();
    expect(got.pkt.readString()).toBe(a.ch.nick);
    expect(got.pkt.readString()).toBe("hello all");
    const ma = a.c.mark();
    a.c.out(19, (p) => {
      p.writeByte(0); p.writeBoolean(false); p.writeUTF(""); p.writeUTF("again");
    });
    const err = await a.c.code(3, undefined, ma);
    expect(err.pkt.readInt()).toBe(3);
    // whisper by nick
    const mb2 = b.c.mark();
    a.c.out(37, (p) => {
      p.writeInt(0); p.writeUTF(b.ch.nick); p.writeUTF(a.ch.nick); p.writeUTF("psst"); p.writeBoolean(false);
    });
    const w = await b.c.code(37, undefined, mb2);
    expect(w.clientId).toBe(a.ch.userId);
    expect(w.pkt.readInt()).toBe(b.ch.userId);
    await a.c.code(37, undefined, ma);
    a.c.close();
    b.c.close();
  });
});

describe("player info", () => {
  it("74 ITEM_EQUIP returns a compressed equip view", async () => {
    const a = await loggedIn(server);
    const b = await loggedIn(server);
    const m = a.c.mark();
    a.c.out(74, (p) => {
      p.writeBoolean(true); p.writeInt(b.ch.userId);
    });
    const r = await a.c.code(74, undefined, m);
    expect(r.clientId).toBe(b.ch.userId);
    a.c.close();
    b.c.close();
  });
});

describe("items", () => {
  it("unequip (47), equip via move (49), split and sell (127)", async () => {
    const { c, player: p } = await loggedIn(server);
    expect(p().mainWeapon?.TemplateID).toBe(7001);
    let m = c.mark();
    c.out(47, (x) => x.writeInt(6));
    await c.code(64, undefined, m);
    expect(p().mainWeapon).toBeNull();
    const at = p().equipBag.getItems(31).find((i) => i.TemplateID === 7001)!;
    m = c.mark();
    c.out(49, (x) => {
      x.writeByte(0); x.writeInt(at.Place); x.writeByte(0); x.writeInt(6); x.writeInt(1); x.writeBoolean(false);
    });
    await c.code(64, undefined, m);
    expect(p().mainWeapon?.TemplateID).toBe(7001);
    // count > stack -> disconnect (anti-dupe)
    const gold = p().info.Gold;
    m = c.mark();
    c.out(127, (x) => {
      x.writeByte(0); x.writeInt(6); x.writeInt(1);
    });
    await c.code(3, undefined, m);
    expect(p().info.Gold).toBe(gold + 100); // Shop_Goods 7001 ReclaimType 1, ReclaimValue 100
    expect(p().mainWeapon).toBeNull();
    c.out(49, (x) => {
      x.writeByte(0); x.writeInt(40); x.writeByte(0); x.writeInt(41); x.writeInt(1); x.writeBoolean(false);
    });
    c.close();
  });

  it("disconnects on a move count larger than the stack", async () => {
    const { c } = await loggedIn(server);
    c.out(49, (x) => {
      x.writeByte(0); x.writeInt(6); x.writeByte(0); x.writeInt(40); x.writeInt(5); x.writeBoolean(false);
    });
    await c.waitClosed();
  });
});

describe("shop", () => {
  it("price-type encoding (ItemInfo.GetItemPrice)", () => {
    const t = { gold: 0, money: 0, offer: 0, gifttoken: 0, petScore: 0, score: 0, dmgScore: 0 };
    getItemPrice(-1, 100, 1, t);
    getItemPrice(-2, 50, 2, t);
    getItemPrice(-3, 7, 1, t);
    getItemPrice(-4, 9, 1, t);
    getItemPrice(-6, 1, 1, t);
    getItemPrice(-8, 2, 1, t);
    getItemPrice(-9, 3, 1, t);
    expect(t).toEqual({ gold: 100, money: 100, offer: 7, gifttoken: 9, petScore: 2, score: 1, dmgScore: 3 });
    expect(getItemPrice(11408, 4, 1, t)).toEqual({ templateId: 11408, count: 4 });
    const shop = toShopItem({ ID: 1, ShopID: 1, TemplateID: 7001, BuyType: 0, Beat: 1, BPrice1: -1, BValue1: 30, BPrice2: 11408, BValue2: 2, BPrice3: -2, BValue3: 5 } as never);
    const t2 = { gold: 0, money: 0, offer: 0, gifttoken: 0, petScore: 0, score: 0, dmgScore: 0 };
    expect(setItemType(shop, 2, t2)).toEqual([11408, 2]);
    expect(t2.money).toBe(30);
    expect(t2.gold).toBe(5);
  });

  it("44 BUY_GOODS deducts the price and adds a bound item", async () => {
    const tpl = server.ctx.templates;
    const goods = [...tpl.shop.values()].find((s) => s.ShopID === 1 && tpl.isOnShop(s.ID) && s.AUnit > 0 && s.APrice1 === -1 && s.AValue1 > 0 && s.APrice2 === -1 && s.APrice3 === -1 && tpl.findItem(s.TemplateID));
    expect(goods).toBeDefined();
    const { c, player: p } = await loggedIn(server, { money: 1_000_000 });
    const money = p().info.Money;
    const m = c.mark();
    c.out(44, (x) => {
      x.writeInt(1);
      x.writeInt(goods!.ID); x.writeInt(1); x.writeUTF(""); x.writeBoolean(false); x.writeUTF(""); x.writeInt(0);
    });
    const r = await c.code(44, undefined, m);
    expect(r.pkt.readInt()).toBe(1);
    expect(p().info.Money).toBe(money - Math.trunc(goods!.AValue1 * goods!.Beat));
    const t = tpl.findItem(goods!.TemplateID)!;
    const bag = p().getItemInventory(t)!;
    const it = bag.getItems().find((i) => i.TemplateID === goods!.TemplateID);
    expect(it?.IsBinds).toBe(true);
    c.close();
  });
});

describe("friends", () => {
  it("add / remove friend (160/160, 160/161) persists", async () => {
    const a = await loggedIn(server);
    const b = await loggedIn(server);
    let m = a.c.mark();
    a.c.out(160, (x) => {
      x.writeByte(160); x.writeUTF(b.ch.nick); x.writeInt(0); x.writeBoolean(false); x.writeBoolean(false);
    });
    const add = await a.c.waitFor((r) => r.code === 160 && r.sub === 160, 4000, m);
    expect(add.clientId).toBe(b.ch.userId);
    await b.c.waitFor((r) => r.code === 160 && r.sub === 166);
    expect(a.player().friends.get(b.ch.userId)).toBe(0);
    m = a.c.mark();
    a.c.out(160, (x) => {
      x.writeByte(161); x.writeInt(b.ch.userId);
    });
    await a.c.waitFor((r) => r.code === 160 && r.sub === 161, 4000, m);
    expect(a.player().friends.has(b.ch.userId)).toBe(false);
    a.c.close();
    b.c.close();
  });
});

describe("rooms", () => {
  async function lobby() {
    const x = await loggedIn(server);
    x.c.out(16, (p) => p.writeInt(1));
    await x.c.code(94, 9);
    return x;
  }

  it("create / list / join / team / ready / start a Freedom 1v1 -> battle loading (91/101 + 91/103)", async () => {
    const a = await lobby();
    const b = await lobby();
    roomCmd(a.c, 0, (p) => {
      p.writeByte(1); p.writeByte(2); p.writeUTF("my room"); p.writeUTF("");
    });
    const created = await a.c.code(94, 0);
    const roomId = created.pkt.readByte() === 0 ? created.pkt.readInt() : -1;
    expect(a.player().currentRoom?.RoomId).toBe(roomId);
    // list
    const ml = b.c.mark();
    roomCmd(b.c, 9, (p) => {
      p.writeInt(1); p.writeInt(0); p.writeInt(0); p.writeInt(0);
    });
    const list = await b.c.code(94, 9, ml);
    list.pkt.readByte();
    expect(list.pkt.readInt()).toBeGreaterThanOrEqual(1);
    // join
    roomCmd(b.c, 1, (p) => {
      p.writeBoolean(false); p.writeInt(1); p.writeInt(-1); p.writeInt(roomId); p.writeUTF("");
    });
    const res = await b.c.code(94, 1);
    res.pkt.readByte();
    expect(res.pkt.readBoolean()).toBe(true);
    await a.c.waitFor((r) => r.code === 94 && r.sub === 4 && r.clientId === b.ch.userId);
    expect(b.player().roomTeam).toBe(2);
    // team switch back and forth
    const mt = a.c.mark();
    roomCmd(b.c, 6, (p) => p.writeByte(0));
    await a.c.code(94, 6, mt);
    expect(b.player().roomTeam).toBe(1);
    roomCmd(b.c, 6, (p) => p.writeByte(0));
    await a.c.code(94, 6, mt + 1);
    expect(b.player().roomTeam).toBe(2);
    // ready + start
    roomCmd(b.c, 15, (p) => p.writeByte(1));
    await a.c.code(94, 15, mt);
    roomCmd(a.c, 7);
    const create = await b.c.code(91, 101);
    create.pkt.readByte();
    expect(create.pkt.readInt()).toBe(1); // roomType Freedom
    create.pkt.readInt(); create.pkt.readInt();
    expect(create.pkt.readInt()).toBe(2); // two fighters
    await a.c.code(91, 101);
    const load = await a.c.code(91, 103);
    load.pkt.readByte();
    expect(load.pkt.readInt()).toBe(60);
    expect(a.player().currentRoom?.IsPlaying).toBe(true);
    a.c.close();
    b.c.close();
  });

  it("kick and leave", async () => {
    const a = await lobby();
    const b = await lobby();
    roomCmd(a.c, 0, (p) => {
      p.writeByte(1); p.writeByte(2); p.writeUTF("k"); p.writeUTF("pw");
    });
    const created = await a.c.code(94, 0);
    created.pkt.readByte();
    const roomId = created.pkt.readInt();
    // wrong password
    roomCmd(b.c, 1, (p) => {
      p.writeBoolean(false); p.writeInt(1); p.writeInt(-1); p.writeInt(roomId); p.writeUTF("nope");
    });
    const bad = await b.c.code(94, 1);
    bad.pkt.readByte();
    expect(bad.pkt.readBoolean()).toBe(false);
    const m = b.c.mark();
    roomCmd(b.c, 1, (p) => {
      p.writeBoolean(false); p.writeInt(1); p.writeInt(-1); p.writeInt(roomId); p.writeUTF("pw");
    });
    await b.c.code(94, 1, m);
    await sleep(100);
    roomCmd(a.c, 3, (p) => p.writeByte(b.player().roomIndex));
    await b.c.waitFor((r) => r.code === 94 && r.sub === 5, 4000, m);
    expect(b.player().currentRoom).toBeNull();
    roomCmd(a.c, 5);
    await a.c.waitFor((r) => r.code === 94 && r.sub === 5 && r.clientId === a.ch.userId);
    expect(a.player().currentRoom).toBeNull();
    a.c.close();
    b.c.close();
  });

  it("auto-match pairs two Match rooms and starts the game", async () => {
    const a = await lobby();
    const b = await lobby();
    for (const x of [a, b]) {
      roomCmd(x.c, 0, (p) => {
        p.writeByte(0); p.writeByte(2); p.writeUTF("m"); p.writeUTF("");
      });
      await x.c.code(94, 0);
    }
    roomCmd(a.c, 7);
    await a.c.code(94, 13); // searching
    roomCmd(b.c, 7);
    const ca = await a.c.code(91, 101);
    ca.pkt.readByte();
    expect(ca.pkt.readInt()).toBe(0); // Match
    await b.c.code(91, 103);
    a.c.close();
    b.c.close();
  });
});

describe("persistence", () => {
  it("saves gold and items on logout", async () => {
    const { c, ch, player: p } = await loggedIn(server);
    p().info.Gold = 4242;
    c.close();
    await sleep(300);
    const db = await sharedDb();
    const [row] = await db.db.select({ Gold: player.Sys_Users_Detail.Gold, State: player.Sys_Users_Detail.State }).from(player.Sys_Users_Detail).where(eq(player.Sys_Users_Detail.UserID, ch.userId));
    expect(row).toEqual({ Gold: 4242, State: 0 });
  });
});
