/**
 * 41-titulo-por-cartao (265 NEWTITLE_CARD + 189 USER_CHANGE_RANK): `game."New_Title"` já tinha schema +
 * seed (325 linhas reais) no Postgres, mas `Templates` nunca carregava pra memória — `findNewTitle` sempre
 * voltava vazio. Usa um item sintético (card) com `Property1` apontando pra um `New_Title.ID` real do seed
 * (100 "Cavalheiro"), inserido direto em `tpl.items` (mesmo padrão `toShopItem({...} as never)` usado em
 * `handlers.test.ts`), já que nenhum card real do seed tem `Property1` garantido apontando pra um título.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { player } from "@ddt/db";
import type { GameServer } from "../src/server.js";
import { BagType, ItemInfo, type ItemTemplate } from "../src/game/item.js";
import { loggedIn, sharedDb, sleep, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server?.stop();
});

function titleCardTemplate(templateId: number, titleId: number, days: number): ItemTemplate {
  return { TemplateID: templateId, BindType: 0, Property1: titleId, Property2: days, MaxCount: 1, Name: "Cartão de título" } as never;
}

describe("game.New_Title loaded into Templates (41-titulo-por-cartao)", () => {
  it("findNewTitle resolves real seeded rows (325 rows, e.g. ID 100 'Cavalheiro')", () => {
    expect(server.ctx.templates.newTitles.size).toBe(325);
    expect(server.ctx.templates.findNewTitle(100)?.Name).toBe("Cavalheiro");
    expect(server.ctx.templates.findNewTitleByName("cavalheiro")?.ID).toBe(100); // case-insensitive
  });
});

describe("265 NEWTITLE_CARD", () => {
  it("unknown Property1: 'TitleNotFound', item NOT consumed", async () => {
    const { c, player: p } = await loggedIn(server, { grade: 10 });
    const templateId = 900_100;
    server.ctx.templates.items.set(templateId, titleCardTemplate(templateId, -999_999, 0));
    const t = server.ctx.templates.findItem(templateId)!;
    const it = ItemInfo.createFromTemplate(t, 1, 102);
    expect(p().propBag.addItem(it)).toBe(true);
    const mark = c.mark();
    c.out(265, (x) => { x.writeByte(BagType.PropBag); x.writeInt(it.Place); });
    const msg = await c.code(3, undefined, mark);
    msg.pkt.readInt();
    expect(msg.pkt.readString()).toContain("não foi desbloqueado");
    expect(p().propBag.getItemAt(it.Place)).not.toBeNull(); // card untouched
    c.close();
  });

  it("consumes the card, grants the title (Sys_User_Rank), and 189 can equip + display it (honorId real, not 0)", async () => {
    const db = (await sharedDb()).db;
    const { c, player: p } = await loggedIn(server, { grade: 10 });
    const templateId = 900_101;
    server.ctx.templates.items.set(templateId, titleCardTemplate(templateId, 100, 30)); // 100 = "Cavalheiro", 30 days
    const t = server.ctx.templates.findItem(templateId)!;
    const it = ItemInfo.createFromTemplate(t, 1, 102);
    expect(p().propBag.addItem(it)).toBe(true);
    const place = it.Place;

    const markWorld = c.mark();
    c.out(265, (x) => { x.writeByte(BagType.PropBag); x.writeInt(place); });
    const ranks34 = await c.code(34, undefined, markWorld); // Out.userRanks pushed on grant
    expect(p().propBag.getItemAt(place)).toBeNull(); // card consumed (stack was 1)

    const n = ranks34.pkt.readInt();
    const got: { NewTitleID: number; Name: string }[] = [];
    for (let i = 0; i < n; i++) { got.push({ NewTitleID: ranks34.pkt.readInt(), Name: ranks34.pkt.readString() }); ranks34.pkt.readDateTime(true); ranks34.pkt.readDateTime(true); }
    expect(got.find((r) => r.NewTitleID === 100 && r.Name === "Cavalheiro")).toBeDefined();

    const rows = await db.select().from(player.Sys_User_Rank).where(eq(player.Sys_User_Rank.UserID, p().id));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.NewTitleID).toBe(100);
    expect(rows[0]!.IsExit).toBe(true);
    expect(rows[0]!.Validate).toBe(30);

    // global broadcast (packet 10, type 3) congratulating — sent to the granter's own client too (SendToAll).
    const notice = await c.code(10, undefined, markWorld);
    expect(notice.pkt.readInt()).toBe(3);
    expect(notice.pkt.readString()).toContain("Cavalheiro");

    // 189 USER_CHANGE_RANK: equip the freshly-granted title — honorId is now the REAL NewTitleID (was always 0 before this task).
    c.out(189, (x) => x.writeUTF("Cavalheiro"));
    await sleep(80);
    expect(p().info.Honor).toBe("Cavalheiro");
    expect(p().info.honorId).toBe(100);
    c.close();
  });

  it("re-using a 2nd card for the SAME title refreshes it (claim-once: no duplicate Sys_User_Rank row, never pays out twice)", async () => {
    const db = (await sharedDb()).db;
    const { c, player: p } = await loggedIn(server, { grade: 10 });
    const templateId = 900_102;
    server.ctx.templates.items.set(templateId, titleCardTemplate(templateId, 101, 10)); // 101 = "Mestre"
    const t = server.ctx.templates.findItem(templateId)!;

    const useCard = async () => {
      const it = ItemInfo.createFromTemplate(t, 1, 102);
      expect(p().propBag.addItem(it)).toBe(true);
      const mark = c.mark();
      c.out(265, (x) => { x.writeByte(BagType.PropBag); x.writeInt(it.Place); });
      await c.code(34, undefined, mark);
    };
    await useCard();
    await useCard(); // 2nd card for the exact same title

    const rows = await db.select().from(player.Sys_User_Rank).where(eq(player.Sys_User_Rank.UserID, p().id));
    expect(rows.filter((r) => r.NewTitleID === 101)).toHaveLength(1); // still one row, refreshed in place
    c.close();
  });
});
