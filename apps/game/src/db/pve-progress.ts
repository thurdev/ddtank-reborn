/**
 * Task `41-instancias`: `app."PveInstanceClear"` reads/writes (dungeon unlock-by-previous-clear progress).
 * See `game/pve-unlock.ts` for the gate logic this backs, and `room-mgr.ts` `onDungeonCleared` for when a
 * clear is recorded (room's `onFinished(isWin=true)` for a `RoomType.Dungeon` — once per full dungeon run,
 * not once per floor/mission).
 */
import { and, eq, sql } from "drizzle-orm";
import { app } from "@ddt/db";
import type { ServerContext } from "../session/context.js";

/** `dungeonDifficultyLadder` needs the FULL set of difficulties this player already cleared for one dungeon. */
export async function loadClearedDifficulties(ctx: ServerContext, userId: number, pveId: number): Promise<Set<number>> {
  const rows = await ctx.db.db.select({ HardLevel: app.PveInstanceClear.HardLevel }).from(app.PveInstanceClear)
    .where(and(eq(app.PveInstanceClear.UserID, userId), eq(app.PveInstanceClear.PveId, pveId)));
  return new Set(rows.map((r) => r.HardLevel));
}

/** GamePlayer-side effect of finishing a Dungeon run with a win: upsert the clear row (ClearCount++). */
export async function recordPveClear(ctx: ServerContext, userId: number, pveId: number, hardLevel: number): Promise<void> {
  const now = ctx.now();
  await ctx.db.db.insert(app.PveInstanceClear)
    .values({ UserID: userId, PveId: pveId, HardLevel: hardLevel, ClearCount: 1, FirstClearedAt: now, LastClearedAt: now })
    .onConflictDoUpdate({
      target: [app.PveInstanceClear.UserID, app.PveInstanceClear.PveId, app.PveInstanceClear.HardLevel],
      set: { ClearCount: sql`${app.PveInstanceClear.ClearCount} + 1`, LastClearedAt: now },
    });
}
