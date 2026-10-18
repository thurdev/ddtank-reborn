import { readFileSync } from "node:fs";
import { count, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkLogin, createDb, createDevAccounts, game, migrateDb, player, readManifest, seedDatabase, type DbHandle } from "../src/index.js";
import { rowCountsPath, rowCountsPath6600 } from "../src/paths.js";
import { GAMEPLAY_6600_TABLES } from "../scripts/schema-6600-tables.js";

const rowCounts = (db: string) =>
  Object.fromEntries((JSON.parse(readFileSync(rowCountsPath(db), "utf8")) as { table: string; rows: number }[]).map((r) => [r.table, r.rows]));
const rowCounts6600 = (db: string) =>
  Object.fromEntries((JSON.parse(readFileSync(rowCountsPath6600(db), "utf8")) as { table: string; rows: number }[]).map((r) => [r.table, r.rows]));

let h: DbHandle;
let seeded: Record<string, number>;

beforeAll(async () => {
  h = await createDb("pglite:memory");
  await migrateDb(h);
  seeded = await seedDatabase(h);
});
afterAll(async () => h?.close());

describe("@ddt/db on PGlite", () => {
  it("Shop_Goods has 7640 item templates", async () => {
    const [r] = await h.db.select({ n: count() }).from(game.Shop_Goods);
    expect(r!.n).toBe(7640);
  });

  it("every seeded table matches the SQL Server row-counts.json", async () => {
    // m1-schema: 23 new DDT-6600 template/config tables are seeded too (game.ts/export-seed.ts), see
    // research/6600/db-diff.md. Their row-counts.json lives under research/6600/db, not research/db.
    // Only the NEW table names are merged in: Project_Game6600 also re-exports some tables that
    // already exist under the same name (e.g. "Achievement") with different row counts — those are
    // NOT seeded from 6600 (export-seed.ts only includes GAMEPLAY_6600_TABLES entries) so must not
    // override the 4.1 counts here.
    const sixGameCounts = Object.fromEntries(
      Object.entries(rowCounts6600("Project_Game6600")).filter(([table]) => GAMEPLAY_6600_TABLES[table] === "game"),
    );
    const src = { game: { ...rowCounts("Project_Game34"), ...sixGameCounts }, player: rowCounts("Project_Player34") };
    const m = readManifest();
    expect(m.tables.length).toBe(129);
    for (const t of m.tables) {
      const res = await h.db.execute(sql.raw(`SELECT count(*)::int AS n FROM "${t.schema}"."${t.table}"`));
      const n = ((res as unknown as { rows: { n: number }[] }).rows ?? (res as unknown as { n: number }[]))[0]!.n;
      expect({ t: `${t.schema}.${t.table}`, n }).toEqual({ t: `${t.schema}.${t.table}`, n: src[t.schema][t.table] });
    }
    expect(seeded["game.Shop"]).toBe(5025);
    expect(seeded["game.NPC_Info"]).toBe(1005);
    expect(seeded["player.Server_Config"]).toBe(514);
  });

  it("maps types: datetime, bit, quoted names", async () => {
    const [it] = await h.db.select().from(game.Shop_Goods).where(eq(game.Shop_Goods.TemplateID, -900));
    expect(it!.Name).toBe("Vàng mê cung");
    expect(it!.CanDrop).toBe(true);
    expect(it!.AddTime).toBeInstanceOf(Date);
    expect(it!.AddTime!.toISOString()).toBe("2013-01-24T23:39:32.000Z"); // wall clock preserved
  });

  it("identity sequences continue after MAX(id) and seeding is idempotent", async () => {
    const before = await h.db.select({ n: count() }).from(game.Drop_Item);
    await seedDatabase(h, { only: ["game.Drop_Item"] });
    const after = await h.db.select({ n: count() }).from(game.Drop_Item);
    expect(after[0]!.n).toBe(before[0]!.n);
    const [mx] = await h.db.select({ m: sql<number>`max("Id")::int` }).from(game.Drop_Item);
    const [ins] = await h.db
      .insert(game.Drop_Item)
      .values({ DropId: 1, ItemId: 1, ValueDate: 0, IsBind: false, Random: 1, BeginData: 1, EndData: 1, IsTips: false, IsLogs: false })
      .returning();
    expect(ins!.Id).toBe(mx!.m + 1);
  });

  it("player config tables are seeded, player data tables empty", async () => {
    const [r] = await h.db.select({ n: count() }).from(player.Sys_Users_Detail);
    expect(r!.n).toBe(0);
    const [s] = await h.db.select().from(player.Server_List);
    // ch-tabela: IP/Port vêm nulos no seed (ServerList.ashx cai pro fallback GAME_HOST/GAME_PORT); colunas novas
    // do canal (Enabled/SortOrder/PvpOnly) mantêm o default que preserva o comportamento do canal único "Reborn".
    expect(s!.IP).toBeNull();
    expect(s!.Port).toBeNull();
    expect(s!.Enabled).toBe(true);
    expect(s!.SortOrder).toBe(0);
    expect(s!.PvpOnly).toBe(false);
    expect(s!.InternalUrl).toBeNull();
  });

  it("m1-schema: DDT-6600 template tables are seeded, per-player tables stay empty", async () => {
    const [mount] = await h.db.select({ n: count() }).from(game.Mount_Template);
    expect(mount!.n).toBe(81);
    const [npc2] = await h.db.select({ n: count() }).from(game.NPC_Info2);
    expect(npc2!.n).toBe(1348);
    // per-player state tables (Mount_Data, Sys_User_Drills, ...) hold real 6600-server user rows in the
    // source export — never seeded, same rule as player.Sys_Users_Detail above.
    const [mountData] = await h.db.select({ n: count() }).from(player.Mount_Data);
    expect(mountData!.n).toBe(0);
    const [drills] = await h.db.select({ n: count() }).from(player.Sys_User_Drills);
    expect(drills!.n).toBe(0);
  });

  it("m1-schema: new columns on existing tables have safe defaults", async () => {
    const [q] = await h.db.insert(game.Quest).values({
      ID: 999001,
      QuestID: 999001,
      NeedMinLevel: 0,
      NeedMaxLevel: 0,
      PreQuestID: "",
      NextQuestID: "",
      IsOther: 0,
      CanRepeat: false,
      RepeatInterval: 0,
      RepeatMax: 0,
      RewardGP: 0,
      RewardGold: 0,
      RewardGiftToken: 0,
      RewardOffer: 0,
      RewardRiches: 0,
      RewardBuffID: 0,
      RewardBuffDate: 0,
      RewardMoney: 0,
      Rands: "1",
      StartDate: new Date(),
      EndDate: new Date(),
      RandDouble: 1,
      TimeMode: true,
    }).returning();
    expect(q!.Level2NeedMoney).toBe(-1); // DDT-6600 default: feature disabled unless set
    expect(q!.OneKeyFinishNeedMoney).toBe(0);
    const [detail] = await h.db.select({ GiftGp: player.Sys_Users_Detail.GiftGp, PveEpicPermission: player.Sys_Users_Detail.PveEpicPermission })
      .from(player.Sys_Users_Detail)
      .limit(1);
    expect(detail).toBeUndefined(); // table is empty (per-player), just checking the columns exist/compile
  });

  it("dev accounts: admin/admin and test/test", async () => {
    await createDevAccounts(h);
    await createDevAccounts(h); // idempotent
    expect((await checkLogin(h, "ADMIN", "admin"))?.IsAdmin).toBe(true);
    expect((await checkLogin(h, "test", "test"))?.IsAdmin).toBe(false);
    expect(await checkLogin(h, "admin", "wrong")).toBeNull();
  });
});
