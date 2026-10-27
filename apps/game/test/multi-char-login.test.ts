/**
 * task multi-char (apps/api/src/routes/auth.ts playConfig, packages/db/src/characters.ts): a second (or
 * third, ...) character of the same account is just another `player."Sys_Users_Detail"."UserName"` —
 * "<account>~2" — with its own `app."LoginSessions"` ticket. apps/game's login path
 * (findCharacterByUserName, dbTicketValidator) never heard of "accounts" to begin with, so it needs ZERO
 * code changes: this test proves a "~2" username logs in exactly like any other username.
 */
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import { FakeClient, createCharacter, sharedDb, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server.stop();
});

describe("task multi-char: '~N' gameUserName logs in like any other username", () => {
  it("a character renamed to '<account>~2' (slot 2 shape) logs in normally and loads its own state", async () => {
    const db = await sharedDb();
    const ch = await createCharacter(db, { money: 321 });
    // What apps/api's playConfig would have done when issuing a ticket for slot 2 of this account: the
    // Sys_Users_Detail row's UserName (and the matching LoginSessions row) is "<original>~2" — nothing
    // else about the row changes.
    const slot2User = `${ch.user}~2`;
    await db.db.execute(sql`UPDATE player."Sys_Users_Detail" SET "UserName" = ${slot2User} WHERE "UserID" = ${ch.userId}`);
    await db.db.execute(sql`UPDATE "app"."LoginSessions" SET "UserName" = ${slot2User.toLowerCase()} WHERE "UserName" = ${ch.user.toLowerCase()}`);

    const a = FakeClient.memory(server);
    a.login(slot2User, ch.pass);
    await a.code(95);
    const p = server.ctx.world.get(ch.userId)!;
    expect(p.info.UserName).toBe(slot2User);
    expect(p.info.Money).toBe(321);
    a.close();
  });

  it("two characters of the same account ('bob' and 'bob~2') can be logged in at the same time (different UserIDs)", async () => {
    const db = await sharedDb();
    const base = await createCharacter(db, { money: 1 });
    const second = await createCharacter(db, { money: 2 });
    const secondSlotUser = `${base.user}~2`;
    await db.db.execute(sql`UPDATE player."Sys_Users_Detail" SET "UserName" = ${secondSlotUser} WHERE "UserID" = ${second.userId}`);
    await db.db.execute(sql`UPDATE "app"."LoginSessions" SET "UserName" = ${secondSlotUser.toLowerCase()} WHERE "UserName" = ${second.user.toLowerCase()}`);

    const a = FakeClient.memory(server);
    a.login(base.user, base.pass);
    await a.code(95);
    const b = FakeClient.memory(server);
    b.login(secondSlotUser, second.pass);
    await b.code(95);

    expect(server.ctx.world.get(base.userId)).toBeTruthy();
    expect(server.ctx.world.get(second.userId)).toBeTruthy();
    expect(server.ctx.world.get(base.userId)!.id).not.toBe(server.ctx.world.get(second.userId)!.id);
    a.close();
    b.close();
  });
});
