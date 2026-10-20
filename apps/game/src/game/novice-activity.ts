/**
 * Real per-`ActivityType` progress counters behind 258 NOVICEACTIVITY (`vendor/DDTank41/Game.Server/Packets/
 * Client/NoviceActivityGetAward.cs`), replacing the simplified "Grade >= Condition" eligibility check that
 * `handlers/eventos/novato.ts` used before this task. Mirrors `GameUtils/PlayerExtra.cs`:
 *  - `GetEventProcess`/`UpdateEventCondition` (lines 238-279): `isPlus` adds (spend/recharge running totals),
 *    otherwise takes the max (grade/strengthen/VIP "reached at least N" high-water marks).
 *  - `ResetNoviceEvent` + the "new day"/"new week" branches of `CheckNewDay` (GamePlayer.cs:2975-2996): daily
 *    types (3 USE_MONEY, 4 RECHANGE_MONEY) and weekly types (5 USE_MONEY_OFWEEK, 6 RECHANGE_MONEY_OFWEEK)
 *    reset to 0 on a new day/week. Ported as a LAZY reset (stored `PeriodKey` compared to `dayKey()`/
 *    `weekKey()` on next touch) instead of an explicit daily sweep — `CheckNewDay` itself was never ported
 *    as a unified hook, same idiom already used by `app."LightRoadProgress"`.
 *
 * `NoviceActiveType` (`Game.Server/Packets/NoviceActiveType.cs`) values ported: 1 GRADE_UP, 2
 * STRENGTHEN_WEAPON, 3 USE_MONEY, 4 RECHANGE_MONEY, 5 USE_MONEY_OFWEEK, 6 RECHANGE_MONEY_OFWEEK, 8 UPGRADE_VIP.
 * 9 UPDATE_FIGHTPOWER is intentionally left with NO trigger: the original's own sender is commented out
 * (`GamePlayer.cs:5234` `//Extra.UpdateEventCondition((int)NoviceActiveType.UPDATE_FIGHTPOWER, ...)`) — dead
 * in the base game too, Conditions stays 0 forever there and here. 4/RECHANGE_MONEY and 6/_OFWEEK are wired
 * (the reset + accumulate logic exists, admin can configure `Event_Reward_Info` rows for them) but have no
 * real trigger call yet: the original ties them to `GamePlayer.ChargeToUser` (a poll against a payment-gateway
 * table, `GamePlayer.cs:2292-2328`), and this stack has no payment-gateway integration in apps/game yet (see
 * `handlers/eventos/primeira-recarga.ts` header — `IsRecharged` itself "exigiria uma recarga real ainda não
 * portada"). Faking a trigger here would be worse than leaving it honestly untriggered; revisit once a real
 * recharge/Pix webhook lands in apps/game.
 *
 * Real triggers wired (server-side events, not client-trusted):
 *  - GRADE_UP (1): `GamePlayer.addGP` on every level-up (`game/player.ts`), mirrors the `Grade` setter
 *    (`GamePlayer.cs:775`). The original ALSO feeds this counter from a separate `Level` stat
 *    (`UpdateLevel`, `GamePlayer.cs:5331-5338`) that this port doesn't have a 1:1 equivalent for — documented
 *    deviation, `Grade` alone is the primary real-world trigger (every other call site uses it).
 *  - STRENGTHEN_WEAPON (2): `handlers/forja/fortalecer.ts`, successful strengthen of a CategoryID 7 (weapon)
 *    item, mirrors `ItemStrengthenHandler.cs:145-147`.
 *  - USE_MONEY/_OFWEEK (3/5): `GamePlayer.removeMoney` (`game/player.ts`), every Money spend, mirrors
 *    `GamePlayer.RemoveMoney` (`GamePlayer.cs:4017-4050`) which increments both counters unconditionally.
 *    Deviation: the original lets two call sites opt out via an `isNoviceActive` flag (`AuctionUpdateHandler.cs:46`
 *    DDTMoney auction payment, `MailGetAttachHandler.cs:63` mail-attachment retrieval cost) — this port always
 *    counts every spend, since none of our ~45 `removeMoney()` call sites carry that flag today. Low-impact
 *    (makes those two paths count toward progress when the original wouldn't; never makes a reward harder to
 *    reach, only easier by a small, player-friendly margin).
 *  - UPGRADE_VIP (8): `handlers/loja/vip.ts` (shop VIP purchase) and `handlers/bolsa/usar-carta.ts` (VIP card
 *    item), mirrors `GamePlayer.OpenVIP`/`ContinuousVIP` (`GamePlayer.cs:3728-3730`, `3752-3754`).
 */
import { eq } from "drizzle-orm";
import { app, type Database } from "@ddt/db";
import type { GamePlayer } from "./player.js";
import { dayKey, weekKey } from "./events.js";

export type NoviceProgressRow = typeof app.NoviceActivityProgress.$inferSelect;

/** Game.Server/Packets/NoviceActiveType.cs. */
export const NoviceActiveType = {
  GRADE_UP: 1,
  STRENGTHEN_WEAPON: 2,
  USE_MONEY: 3,
  RECHANGE_MONEY: 4,
  USE_MONEY_OFWEEK: 5,
  RECHANGE_MONEY_OFWEEK: 6,
  UPGRADE_VIP: 8,
  // 9 UPDATE_FIGHTPOWER: no trigger — see module header.
} as const;

const DAILY = new Set<number>([NoviceActiveType.USE_MONEY, NoviceActiveType.RECHANGE_MONEY]);
const WEEKLY = new Set<number>([NoviceActiveType.USE_MONEY_OFWEEK, NoviceActiveType.RECHANGE_MONEY_OFWEEK]);

function periodKeyFor(activityType: number, now: Date): string {
  if (DAILY.has(activityType)) return dayKey(now);
  if (WEEKLY.has(activityType)) return weekKey(now);
  return ""; // never resets (1 GRADE_UP, 2 STRENGTHEN_WEAPON, 8 UPGRADE_VIP)
}

const dirtyNovice = new WeakSet<GamePlayer>();

/** PlayerExtra.GetEventProcess(activityType).Conditions, 0 if never touched or the stored period went stale. */
export function getNoviceCondition(p: GamePlayer, activityType: number, now: Date): number {
  const row = p.noviceProgress.get(activityType);
  if (!row) return 0;
  const key = periodKeyFor(activityType, now);
  if (key !== "" && row.PeriodKey !== key) return 0;
  return row.Conditions;
}

/**
 * PlayerExtra.UpdateEventCondition(activityType, value, isPlus, awardGot=0) minus the awardGot param (see
 * `markNoviceAward` below) — isPlus adds, otherwise takes the max. In-memory + dirty-marked only (same "pure,
 * callers persist" shape as every other GamePlayer currency/stat mutator); `saveNoviceActivity` flushes it.
 */
export function bumpNoviceActivity(p: GamePlayer, activityType: number, value: number, isPlus: boolean, now: Date): void {
  const key = periodKeyFor(activityType, now);
  let row = p.noviceProgress.get(activityType);
  if (!row) {
    row = { UserID: p.id, ActivityType: activityType, Conditions: 0, AwardGot: 0, PeriodKey: key };
    p.noviceProgress.set(activityType, row);
  } else if (key !== "" && row.PeriodKey !== key) {
    row.Conditions = 0; // new day/week: the stale running total doesn't carry over
  }
  row.Conditions = isPlus ? row.Conditions + value : Math.max(row.Conditions, value);
  row.PeriodKey = key;
  dirtyNovice.add(p);
}

/** PlayerExtra.UpdateEventCondition's `awardGot` side effect — marks the claim tier reached (novato.ts). */
export function markNoviceAward(p: GamePlayer, activityType: number, awardGot: number): void {
  const row = p.noviceProgress.get(activityType);
  if (!row) return;
  row.AwardGot = awardGot;
  dirtyNovice.add(p);
}

/** SP_UpdateUsersEventProcess equivalent: rewrite the player's novice-activity rows (small set, no PK reuse needed). */
export async function saveNoviceActivity(db: Database, p: GamePlayer): Promise<void> {
  if (!dirtyNovice.has(p)) return;
  dirtyNovice.delete(p);
  await db.transaction(async (tx) => {
    await tx.delete(app.NoviceActivityProgress).where(eq(app.NoviceActivityProgress.UserID, p.id));
    const rows = [...p.noviceProgress.values()];
    if (rows.length) await tx.insert(app.NoviceActivityProgress).values(rows.map((r) => ({ UserID: p.id, ActivityType: r.ActivityType, Conditions: r.Conditions, AwardGot: r.AwardGot, PeriodKey: r.PeriodKey })));
  });
}
