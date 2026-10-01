import { readFileSync } from "node:fs";
import { count, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkLogin, createDb, createDevAccounts, game, migrateDb, player, readManifest, seedDatabase, type DbHandle } from "../src/index.js";
import { rowCountsPath } from "../src/paths.js";

const rowCounts = (db: string) =>
  Object.fromEntries((JSON.parse(readFileSync(rowCountsPath(db), "utf8")) as { table: string; rows: number }[]).map((r) => [r.table, r.rows]));

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
    const src = { game: rowCounts("Project_Game34"), player: rowCounts("Project_Player34") };
    const m = readManifest();
    expect(m.tables.length).toBe(106);
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
    expect(s!.IP).toBe("127.0.0.1");
  });

  it("dev accounts: admin/admin and test/test", async () => {
    await createDevAccounts(h);
    await createDevAccounts(h); // idempotent
    expect((await checkLogin(h, "ADMIN", "admin"))?.IsAdmin).toBe(true);
    expect((await checkLogin(h, "test", "test"))?.IsAdmin).toBe(false);
    expect(await checkLogin(h, "admin", "wrong")).toBeNull();
  });
});
