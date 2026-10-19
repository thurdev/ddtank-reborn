/**
 * "Capturar Nian" (`catchbeast.swf`, `src/catchbeast/date/CatchBeastPackageType.as`, m4-catchbeast) — game
 * logic + persistence shared by the packet handler (`handlers/eventos/captura-nian.ts`) and the admin-window
 * wiring (`handlers/eventos/agendador.ts`, `app."ScheduledEvents"` kind "catchbeast").
 *
 * REAL C# logic exists (unlike `game/rescue.ts`'s `277 RESCUE`): `Game.Server.ActiveSystem.Handle.
 * Catchbeast{ViewInfo,Challenge,Buybuff,GetAward}.cs` (sub-codes 33/34/35/36 of `145 ACTIVITY_SYSTEM`, dispatch
 * confirmed via the shared `ActiveSystemPackageType` enum — `CATCHBEAST_BEGIN=32` has no server-side
 * `[Attribute0]` handler at all, matching the AS3 client: nothing ever calls `sendCatchBeastBegin()`, the
 * client only ever RECEIVES sub 32). `Game.Server.GameObjects.GamePlayer.cs:3714-3716` sends it on login
 * whenever `PlayerActives.IsYearMonsterOpen()` (a hardcoded 2014 event-window date) — replaced here by
 * `isOpen(ctx,"catchbeast")` (task requirement: every M4 window must be admin-configurable via
 * `app."ScheduledEvents"`), same substitution `resgate.ts`/`coleta.ts` made for their own windows.
 *
 * `ActiveSystemInfo.ChallengeNum`/`BuyBuffNum`/`DamageNum`/`BoxState` (`PlayerActives.cs:2521-2574`) are split
 * into their own table (`db/catchbeast.ts`, `player."Sys_Users_CatchBeast"`) instead of reviving the other
 * ~20 unrelated `ActiveSystemInfo` columns. `YearMonterValidate` daily reset: `ChallengeNum`/`BuyBuffNum` ->
 * `YearMonsterFightNum` (admin `Server_Config`, C# default 1 via `GameProperties.YearMonsterFightNum`),
 * `DamageNum` -> 0, box state recomputed — done here in `getOrCreate` keyed by `dayKey()` instead of "first
 * VIEWINFO of the day" (same reset shape as every other daily counter in this codebase).
 *
 * Fight: `CatchbeastChallenge.cs` requires an equipped weapon (`Player.MainWeapon`) then
 * `RoomMgr.CreateCatchBeastRoom` -> `CreateCatchBeastAction.cs` (map `eMap.CatchBeast=1347`, `eRoomType.
 * CatchBeast=26`, `HardLevel.Normal`, `TimeMode=2`, no `Pve_Info` lookup — `GameMgr.StartPVEGame` takes the
 * MapId directly). Ported fight content: `GameServerScript.AI.{Game.YearMonster,Messions.YearMonster1347,
 * NPC.YearMonster}` (NPC 73000, already present in BOTH vendor seed snapshots — `packages/db/drizzle/
 * 0022_bright_rogue.sql` only adds the missing `Pve_Info`/`Mission_Info` LINK rows, same gap shape as 0011's
 * Labirinto), hand-transpiled in `packages/fight/src/pve/scripts/manual/catchbeast.ts` (no `generated/`
 * equivalent existed for this donor path, same category as `manual/worldboss.ts`).
 *
 * Damage tracking: `YearMonster1347.OnGameOver` calls `PlayerDetail.UpdatePveResult("yearmonter",
 * TotalDameLiving, IsWin)` for EVERY fight player regardless of win/loss (`GamePlayer.cs:2156-2158`:
 * `Actives.Info.DamageNum = value` — OVERWRITE, not accumulate — `Actives.CreateYearMonterBoxState()`). This
 * is the exact same "total damage dealt in one PVE session" hook already wired for World Boss
 * (`apps/game/src/fight/ddt.ts applyAllMissionOver`, `e.roomType === 14 -> onWorldBossHurt`) — this task adds
 * the `onCatchBeastHurt` sibling for `roomType === RoomType.CatchBeast` (ddt.ts, 2-line additive change).
 *
 * **Exploit avoided (real bug in the original)**: `CatchbeastGetAward.cs` checks ONLY the damage threshold
 * (`method_0`) before granting — it never checks whether `BoxState[id]` is already `"3"` (claimed). A client
 * that keeps sending `CATCHBEAST_GETAWARD` with the same box index past the first claim would get the reward
 * AGAIN every time (`SetYearMonterBoxState` just re-writes the same "3", `AddTemplate` runs unconditionally).
 * `tierStatus(...) !== 3` is added as a claim-once guard here (`getAward` below) that the original never had.
 *
 * **Gap documented, not fixed (out of scope)**: `CatchbeastBuybuff.cs` applies `BufferList.CreatePayBuffer(400,
 * 30000, 1)?.Start(Player)` + `(406, 30000, 1)` (`WorldBossHPBuffer`/`WorldBossAddDamageBuffer` — generic
 * `Player.FightBuffs` entries, NOT world-boss-room-gated despite the class names) on top of the gold charge.
 * No `FightBuffs`/temporary-stat-buff mechanism exists anywhere in `packages/fight` or `apps/game` yet — not
 * even for World Boss's OWN identical buff application on room entry (`GameRoomCreate.cs:46-47`, also
 * unported). Buying the buff here charges gold and decrements the display counter exactly like the original,
 * but grants no in-fight bonus (same gap as World Boss, out of scope for this task — would need a shared
 * `packages/fight` FightBuffs feature touched by both). `packet.ReadBoolean()` (the `isBind` flag the client
 * sends) is read off the wire and discarded here too, matching `CatchbeastBuybuff.cs:14` exactly — the
 * original ALWAYS charges unbound `Money` (`Player.MoneyDirect` -> `MoneyType.Money`) regardless of what the
 * client sent, a dead parameter, not a bug worth "fixing" (no exploit surface, charging real currency is
 * always correct here).
 *
 * `YearMonsterBoxInfo` reward TIERS (threshold * damage needed) are real data (`GameProperties.cs:164`:
 * `"112370,5|112371,30|112372,90|112373,150|112374,300"`, x10000 each) — kept verbatim as `DEFAULT_TIERS`
 * below. The templateIds themselves (112370-112374) are "loot BOX" ids opened server-side via
 * `ItemBoxMgr.CreateItemBox` in the original — no `Item_Box`/drop-table data for them exists in either vendor
 * seed snapshot, so what's actually INSIDE each box could not be ported faithfully. `rewardsFor` below
 * returns OUR OWN default (gold, scaling by tier), documented and admin-configurable via
 * `app."ScheduledEvents"` kind "catchbeast" `params.rewards[tier]` (array of `Reward[]`), same "own default"
 * category as `game/rescue.ts`/`game/light-road`'s reward tables. The tooltip templateId sent in VIEWINFO
 * (`CatchBeastView.as` reads it just to show an item icon) stays the REAL `DEFAULT_TIERS` id even though it
 * won't resolve in `ctx.templates.findItem` — a cosmetic gap (missing icon), not a gameplay one.
 */
import type { GamePlayer } from "./player.js";
import type { ServerContext } from "../session/context.js";
import { dayKey } from "./events.js";
import { loadCatchBeastRow, newCatchBeastRow, saveCatchBeastRow, type CatchBeastRow } from "../db/catchbeast.js";
import { paramsOf } from "../handlers/eventos/agendador.js";

export const TIER_COUNT = 5;
/** `GameProperties.YearMonsterBoxInfo` default (real data, verbatim): [templateId, damage x10000 threshold]. */
const DEFAULT_TIERS: { templateId: number; threshold: number }[] = [
  { templateId: 112370, threshold: 5 },
  { templateId: 112371, threshold: 30 },
  { templateId: 112372, threshold: 90 },
  { templateId: 112373, threshold: 150 },
  { templateId: 112374, threshold: 300 },
];

export interface CatchBeastTier { templateId: number; damageNeeded: number }
export function tiersFor(ctx: ServerContext): CatchBeastTier[] {
  const defaults = DEFAULT_TIERS;
  return defaults.map((t, i) => ({ templateId: t.templateId, damageNeeded: num(ctx, i, t.threshold) * 10000 }));
}
function num(ctx: ServerContext, i: number, fb: number): number {
  const v = (paramsOf(ctx, "catchbeast").tiers as number[] | undefined)?.[i];
  return typeof v === "number" && Number.isFinite(v) ? v : fb;
}

export interface CatchBeastReward { templateId: number; count: number; validDate: number; isBind: boolean }
/** No original drop-table data exists for `YearMonsterBoxInfo`'s box ids (see header) — own default, admin
 *  configurable via `params.rewards[tier]` (array of `Reward[]`), scaling a bit with tier so later boxes
 *  feel worthwhile, same category as `game/rescue.ts rewardTiersFor`. */
export function rewardsFor(ctx: ServerContext, tier: number): CatchBeastReward[] {
  const configured = (paramsOf(ctx, "catchbeast").rewards as Record<string, CatchBeastReward[]> | undefined)?.[String(tier)];
  if (Array.isArray(configured) && configured.length) return configured;
  return [{ templateId: -100, count: 100 * (tier + 1), validDate: 0, isBind: true }];
}

export function fightNumPerDay(ctx: ServerContext): number {
  return ctx.templates.cfgInt("YearMonsterFightNum", 1);
}
export function buffMoney(ctx: ServerContext): number {
  return ctx.templates.cfgInt("YearMonsterBuffMoney", 300);
}

function parseBoxState(s: string): number[] {
  const parts = s.split("-").map(Number);
  if (parts.length !== TIER_COUNT || parts.some((n) => !Number.isFinite(n))) return new Array(TIER_COUNT).fill(1);
  return parts;
}
function encodeBoxState(states: number[]): string {
  return states.join("-");
}
/** `PlayerActives.CreateYearMonterBoxState`: recompute every tier's state from `damageNum` — but NEVER
 *  downgrade a tier already "3" claimed (the original recomputes from scratch too, but `SetYearMonterBoxState`
 *  only ever runs right after a claim and this function only runs on daily reset — order matters, not a
 *  behavior change here, just defensive). */
function recomputeBoxState(tiers: CatchBeastTier[], damageNum: number, prev: number[]): number[] {
  return tiers.map((t, i) => (prev[i] === 3 ? 3 : t.damageNeeded <= damageNum ? 2 : 1));
}

const rowCache = new WeakMap<GamePlayer, CatchBeastRow>();

/** `PlayerActives.YearMonterValidate`: `ChallengeNum`/`BuyBuffNum` -> `YearMonsterFightNum`, `DamageNum` -> 0,
 *  box state recomputed, once per day (`lastEnterYearMonter.Date < Now.Date`) — keyed by `dayKey()` here
 *  instead of "stale DateTime column", same reset shape as every other daily counter in this codebase. */
export async function getOrCreate(ctx: ServerContext, p: GamePlayer): Promise<CatchBeastRow> {
  let row = rowCache.get(p) ?? (await loadCatchBeastRow(ctx.db.db, p.id)) ?? newCatchBeastRow(p.id);
  const today = dayKey(ctx.now());
  if (row.LastEnterDay !== today) {
    const fightNum = fightNumPerDay(ctx);
    row = {
      ...row,
      ChallengeNum: fightNum,
      BuyBuffNum: fightNum,
      DamageNum: 0,
      BoxState: encodeBoxState(recomputeBoxState(tiersFor(ctx), 0, parseBoxState(row.BoxState))),
      LastEnterDay: today,
    };
    row = await saveCatchBeastRow(ctx.db.db, row);
  }
  rowCache.set(p, row);
  return row;
}

export async function persist(ctx: ServerContext, p: GamePlayer, row: CatchBeastRow): Promise<CatchBeastRow> {
  const saved = await saveCatchBeastRow(ctx.db.db, row);
  rowCache.set(p, saved);
  return saved;
}

export function boxStates(row: CatchBeastRow, tiers: CatchBeastTier[]): number[] {
  return recomputeBoxState(tiers, row.DamageNum, parseBoxState(row.BoxState));
}

/**
 * `onCatchBeastHurt` hook (`fight/ddt.ts applyAllMissionOver`, `roomType === RoomType.CatchBeast`): the fight
 * is over (win or lose, unconditional — `YearMonster1347.OnGameOver` has no win-gate) — OVERWRITE `DamageNum`
 * with this run's total damage (`GamePlayer.cs:2157`, never accumulated across runs) and recompute box state
 * (`PlayerActives.CreateYearMonterBoxState`, never downgrades an already-claimed "3").
 */
export async function onCatchBeastHurt(ctx: ServerContext, p: GamePlayer, totalHurt: number): Promise<void> {
  const row = await getOrCreate(ctx, p);
  const states = recomputeBoxState(tiersFor(ctx), totalHurt, parseBoxState(row.BoxState));
  await persist(ctx, p, { ...row, DamageNum: totalHurt, BoxState: encodeBoxState(states) });
}
