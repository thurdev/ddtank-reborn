import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Accounts, createDb, createNextCharacterSlot, deriveGameUserName, listAccountCharacterSlots, migrateDb, type DbHandle } from "../src/index.js";

let h: DbHandle;

beforeAll(async () => {
  h = await createDb("pglite:memory");
  await migrateDb(h);
});
afterAll(async () => h?.close());

describe("app.AccountCharacters (task multi-char)", () => {
  it("deriveGameUserName: slot 1 is the bare lowercase name, slot N>1 gets a '~N' suffix", () => {
    expect(deriveGameUserName("Arthur", 1)).toBe("arthur");
    expect(deriveGameUserName("Arthur", 2)).toBe("arthur~2");
    expect(deriveGameUserName("Arthur", 3)).toBe("arthur~3");
  });

  it("migration 0029 backfills slot 1 for every existing account", async () => {
    const [acc] = await h.db.insert(Accounts).values({ UserName: "PreExisting", PasswordHash: "x" }).returning();
    // The migration only runs once at migrateDb() time, before this row existed — simulate the backfill's
    // own idempotent INSERT to prove it is safe to re-run (same statement the .sql migration uses).
    await h.db.execute(`INSERT INTO "app"."AccountCharacters" ("accountId","slot","gameUserName")
      SELECT "ID", 1, lower("UserName") FROM "member"."Accounts" ON CONFLICT ("accountId","slot") DO NOTHING`);
    const slots = await listAccountCharacterSlots(h, acc!.ID);
    expect(slots).toHaveLength(1);
    expect(slots[0]).toMatchObject({ slot: 1, gameUserName: "preexisting" });
  });

  it("createNextCharacterSlot reserves slot 2, 3, ... up to the limit and refuses past it", async () => {
    const [acc] = await h.db.insert(Accounts).values({ UserName: "MultiChar", PasswordHash: "x" }).returning();
    const maxSlots = 3;
    const r1 = await createNextCharacterSlot(h, acc!.ID, acc!.UserName, maxSlots);
    expect(r1).toMatchObject({ ok: true, row: { slot: 2, gameUserName: "multichar~2" } }); // slot 1 auto-ensured first
    const r2 = await createNextCharacterSlot(h, acc!.ID, acc!.UserName, maxSlots);
    expect(r2).toMatchObject({ ok: true, row: { slot: 3, gameUserName: "multichar~3" } });
    const r3 = await createNextCharacterSlot(h, acc!.ID, acc!.UserName, maxSlots);
    expect(r3).toEqual({ ok: false, reason: "limit" });
    const slots = await listAccountCharacterSlots(h, acc!.ID);
    expect(slots.map((s) => s.slot)).toEqual([1, 2, 3]);
  });

  it("concurrent createNextCharacterSlot calls never hand out the same slot twice", async () => {
    const [acc] = await h.db.insert(Accounts).values({ UserName: "RaceAccount", PasswordHash: "x" }).returning();
    const results = await Promise.all(Array.from({ length: 5 }, () => createNextCharacterSlot(h, acc!.ID, acc!.UserName, 10)));
    const ok = results.filter((r) => r.ok) as { ok: true; row: { slot: number } }[];
    const slots = ok.map((r) => r.row.slot).sort((a, b) => a - b);
    expect(slots).toEqual([...new Set(slots)]); // no duplicates
    expect(slots).toEqual([2, 3, 4, 5, 6]); // slot 1 already existed from ensureFirstSlot
  });

  it("gameUserName has a unique index — a direct insert of a colliding value is rejected", async () => {
    const [acc] = await h.db.insert(Accounts).values({ UserName: "Collider", PasswordHash: "x" }).returning();
    await createNextCharacterSlot(h, acc!.ID, acc!.UserName, 5); // slot 2 -> "collider~2"
    const [other] = await h.db.insert(Accounts).values({ UserName: "Other", PasswordHash: "x" }).returning();
    await expect(
      h.db.execute(`INSERT INTO "app"."AccountCharacters" ("accountId","slot","gameUserName") VALUES (${other!.ID}, 2, 'collider~2')`),
    ).rejects.toThrow();
  });
});
