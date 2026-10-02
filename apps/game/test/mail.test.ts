import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { player } from "@ddt/db";
import type { GameServer } from "../src/server.js";
import { ItemInfo } from "../src/game/item.js";
import { loggedIn, sharedDb, sleep, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server.stop();
});

describe("mail (116/113/114/112)", () => {
  it("sends an item + money, the receiver takes it once (repeated packet = no dupe), then deletes the mail", async () => {
    const db = (await sharedDb()).db;
    const a = await loggedIn(server, { gold: 1000, money: 500 });
    const b = await loggedIn(server);
    const t = server.ctx.templates.findItem(11101)!;
    const it = ItemInfo.createFromTemplate(t, 3, 0);
    it.IsBinds = false;
    expect(a.player().propBag.addItem(it)).toBe(true);
    const place = it.Place;

    let mark = b.c.mark();
    a.c.out(116, (o) => {
      o.writeUTF(b.ch.nick); o.writeUTF("hi"); o.writeUTF("body"); o.writeBoolean(false); o.writeInt(0); o.writeInt(50);
      o.writeByte(1); o.writeInt(place);
      for (let i = 0; i < 3; i++) { o.writeByte(0); o.writeInt(-1); }
    });
    const ok = await a.c.code(116);
    expect(ok.pkt.readBoolean()).toBe(true);
    await b.c.code(117, undefined, mark); // MAIL_RESPONSE -> client reloads LoadUserMail.ashx
    expect(a.player().propBag.getItemAt(place)).toBeNull();
    expect(a.player().info.Gold).toBe(900);
    expect(a.player().info.Money).toBe(450);

    const [mail] = await db.select().from(player.User_Messages).where(eq(player.User_Messages.ReceiverID, b.ch.userId));
    expect(mail!.Annex1).toBe(String(it.ItemID));
    const goods = (await db.select().from(player.Sys_Users_Goods).where(eq(player.Sys_Users_Goods.ItemID, it.ItemID)))[0]!;
    expect(goods.UserID).toBe(0);

    const money0 = b.player().info.Money;
    mark = b.c.mark();
    b.c.out(113, (o) => { o.writeInt(mail!.ID); o.writeByte(0); });
    b.c.out(113, (o) => { o.writeInt(mail!.ID); o.writeByte(0); }); // duplicate
    await sleep(500);
    const replies = b.c.received.slice(mark).filter((r) => r.code === 113);
    expect(replies.length).toBe(2);
    const n1 = replies[0]!.pkt; n1.readInt();
    expect(n1.readInt()).toBe(2); // annex 1 + money
    const n2 = replies[1]!.pkt; n2.readInt();
    expect(n2.readInt()).toBe(0);
    expect(b.player().propBag.getItemCount(11101)).toBe(3);
    expect(b.player().info.Money).toBe(money0 + 50);

    b.c.out(112, (o) => o.writeInt(mail!.ID));
    const del = await b.c.code(112);
    del.pkt.readInt();
    expect(del.pkt.readBoolean()).toBe(true);
    a.c.close();
    b.c.close();
  });
});
