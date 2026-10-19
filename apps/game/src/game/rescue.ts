/**
 * "Resgate" (`rescue.swf`, `src/rescue/`, 277 RESCUE, m4-resgate) — game logic + persistence shared by the
 * handler (`handlers/eventos/resgate.ts`) and the admin-window wiring (`handlers/eventos/agendador.ts`).
 *
 * No C# implementation exists anywhere in `vendor/DDT-6600/Source` for this feature (confirmed: no
 * `PacketHandler(277`, no `RESCUE`/`Rescue` hit outside the bare `ePackageType.RESCUE = 277` enum entry) —
 * every number below (free count, cooldown, prices) is OUR OWN default, documented as such, never a "C#
 * value replicated". Admin can retune all of them via `Server_Config` / `app."ScheduledEvents"` kind "rescue".
 *
 * 6 fixed scenes (sceneId 1-6, `RescueMainFrame.as:134-140` loops `i=1..6`), each a real PvE mission — "go
 * through the real PvE engine" (task requirement): `handlers/eventos/resgate.ts`'s CHALLENGE hands the
 * player to `RoomMgr.createRescueRoom` → `FightEngine.startPve`, the same engine every dungeon uses, never a
 * fabricated win. Mission content: reused REAL `Pve_Info` rows (the classic dungeon set, ids 1-14 —
 * `Pve_Info.Name` id 7 is literally "Resgate do Pintinho", a nice thematic match), scaling difficulty by
 * scene number; admin-overridable per scene via `Server_Config` ("RescueScene1Mission".."RescueScene6Mission").
 *
 * Score/star come from the fight's own kill count (`GamePlayer.OnGameOver`'s `GameOverInfo.kills`), computed
 * server-side in `onPlayerGameOver` (`server.ts`) — never trusted from the client (`CHALLENGE` just starts a
 * normal room/fight; `FIGHT_RESULT` is sent FROM the server after the engine itself ends the match, there is
 * no client-sent result the server could even be tricked into trusting).
 */
import type { GamePlayer } from "./player.js";
import type { ServerContext } from "../session/context.js";
import { dayKey } from "./events.js";
import { loadRescueRow, newRescueRow, saveRescueRow, type RescueRow } from "../db/rescue.js";
import { paramsOf } from "../handlers/eventos/agendador.js";

export const SCENE_COUNT = 6;
/** Pve_Info.ID per scene (the classic dungeon set — "Castelo das Galinhas".."Arena dos Bravos"), ascending
 *  difficulty. `Server_Config` key `RescueScene{n}Mission` overrides per scene. */
const DEFAULT_SCENE_MISSION = [1, 2, 4, 7, 10, 13];
/** No original data: our own default (matches the static UI placeholder `_countTxt.text="(3)"` shown before
 *  the server reply arrives, `RescueMainFrame.as:168` — the one concrete hint the client gives). */
const DEFAULT_FREE_COUNT = 3;
/** No original data: our own default cooldown once a scene's daily free count is spent. */
const DEFAULT_COOLDOWN_SEC = 3600;
const DEFAULT_CLEAN_CD_BASE = 5000;
const DEFAULT_CLEAN_CD_INCREASE = 2000;
const DEFAULT_PRICES = [500, 1000, 3000]; // arrow / bloodPack / kingBless (type 0/1/2)

export interface RescueSceneState {
  sceneId: number;
  starCount: number;
  freeCount: number;
  cleanCDcount: number;
  /** 2 bits per tier (tier 0 in the low bits): 0 locked, 1 unlocked/unclaimed, 2 claimed. */
  rewardStatus: number;
  nextChallengeAt: number;
}

function freshScene(sceneId: number, freeCount: number): RescueSceneState {
  return { sceneId, starCount: 0, freeCount, cleanCDcount: 0, rewardStatus: 0, nextChallengeAt: 0 };
}

export function encodeScenes(scenes: Map<number, RescueSceneState>): string {
  return [...scenes.values()].map((s) => `${s.sceneId}:${s.starCount}:${s.freeCount}:${s.cleanCDcount}:${s.rewardStatus}:${s.nextChallengeAt}`).join("|");
}

export function decodeScenes(s: string): Map<number, RescueSceneState> {
  const m = new Map<number, RescueSceneState>();
  if (!s) return m;
  for (const part of s.split("|")) {
    const [id, star, free, cd, status, next] = part.split(":");
    const sceneId = Number(id);
    if (!sceneId) continue;
    m.set(sceneId, { sceneId, starCount: Number(star), freeCount: Number(free), cleanCDcount: Number(cd), rewardStatus: Number(status), nextChallengeAt: Number(next) });
  }
  return m;
}

export function missionIdFor(ctx: ServerContext, sceneId: number): number {
  return ctx.templates.cfgInt(`RescueScene${sceneId}Mission`, DEFAULT_SCENE_MISSION[sceneId - 1] ?? 1);
}

export function cooldownSec(ctx: ServerContext): number {
  return ctx.templates.cfgInt("RescueCooldownSec", DEFAULT_COOLDOWN_SEC);
}

export interface RescueReward { templateId: number; count: number; validDate: number; isBind: boolean }

/** 3 tiers per scene (Star 11/12/13 in the AS3 `RescueRewardInfo` contract — `RescuePrizeItem` index 0/1/2),
 *  admin-configurable via `app."ScheduledEvents"` kind "rescue" `params.rewards[sceneId]` (array of 3). No
 *  original data exists (no C# source at all) — defaults scale a bit with scene number so later scenes feel
 *  more worthwhile, same "own default, documented" category as everything else in this file. */
export function rewardTiersFor(ctx: ServerContext, sceneId: number): RescueReward[] {
  const configured = (paramsOf(ctx, "rescue").rewards as Record<string, RescueReward[]> | undefined)?.[String(sceneId)];
  if (Array.isArray(configured) && configured.length === 3) return configured;
  return [
    { templateId: 11107, count: 200 * sceneId, validDate: 0, isBind: true },
    { templateId: 11456, count: sceneId, validDate: 0, isBind: true },
    { templateId: 11408, count: sceneId + 2, validDate: 0, isBind: true },
  ];
}

/** Tier unlocked by a given best-star count: tier 0 needs >=1 star, tier 1 >=2, tier 2 >=3. */
export function tierUnlocked(starCount: number, tier: number): boolean {
  return starCount >= tier + 1;
}
export function tierStatus(rewardStatus: number, tier: number): number {
  return (rewardStatus >> (tier * 2)) & 3;
}
export function withTierStatus(rewardStatus: number, tier: number, status: number): number {
  const mask = 3 << (tier * 2);
  return (rewardStatus & ~mask) | ((status & 3) << (tier * 2));
}

const rowCache = new WeakMap<GamePlayer, RescueRow>();

/** Loads (or creates) the player's row, resetting every scene's `freeCount` back to the daily default the
 *  first time they touch Resgate on a new day (`LastFreeDay` != today's `dayKey`) — same reset shape as
 *  every other daily counter in this codebase (shop buy-limited, everyday-active...). Also unlocks any
 *  reward tier whose `starCount` threshold the player already meets but whose status is still "locked" (0
 *  -> 1), so `GET_PRIZE` has something claimable right after a run even without re-requesting FRAME_INFO. */
export async function getOrCreate(ctx: ServerContext, p: GamePlayer): Promise<{ row: RescueRow; scenes: Map<number, RescueSceneState> }> {
  let row = rowCache.get(p) ?? (await loadRescueRow(ctx.db.db, p.id)) ?? newRescueRow(p.id);
  const scenes = decodeScenes(row.SceneData);
  const freeCount = ctx.templates.cfgInt("RescueFreeCountPerDay", DEFAULT_FREE_COUNT);
  for (let id = 1; id <= SCENE_COUNT; id++) if (!scenes.has(id)) scenes.set(id, freshScene(id, freeCount));
  let dirty = false;
  const today = dayKey(ctx.now());
  if (row.LastFreeDay !== today) {
    for (const s of scenes.values()) { s.freeCount = freeCount; s.cleanCDcount = 0; }
    row = { ...row, LastFreeDay: today };
    dirty = true;
  }
  for (const s of scenes.values()) {
    for (let tier = 0; tier < 3; tier++) {
      if (tierUnlocked(s.starCount, tier) && tierStatus(s.rewardStatus, tier) === 0) { s.rewardStatus = withTierStatus(s.rewardStatus, tier, 1); dirty = true; }
    }
  }
  if (dirty) row = await saveRescueRow(ctx.db.db, { ...row, SceneData: encodeScenes(scenes) });
  rowCache.set(p, row);
  return { row, scenes };
}

export async function persist(ctx: ServerContext, p: GamePlayer, row: RescueRow, scenes: Map<number, RescueSceneState>): Promise<RescueRow> {
  const saved = await saveRescueRow(ctx.db.db, { ...row, SceneData: encodeScenes(scenes) });
  rowCache.set(p, saved);
  return saved;
}

export function cleanCdPrice(ctx: ServerContext, scene: RescueSceneState): number {
  const base = ctx.templates.cfgInt("RescueCleanCDPrice", DEFAULT_CLEAN_CD_BASE);
  const inc = ctx.templates.cfgInt("RescueCleanCDPriceIncrease", DEFAULT_CLEAN_CD_INCREASE);
  return base + scene.cleanCDcount * inc;
}

export function buyPrice(ctx: ServerContext, type: number): number {
  const keys = ["RescueArrowPrice", "RescueBloodPackPrice", "RescueKingBlessPrice"];
  return ctx.templates.cfgInt(keys[type] ?? keys[0]!, DEFAULT_PRICES[type] ?? DEFAULT_PRICES[0]!);
}

/**
 * Pays `price` from exactly ONE pool, never mixing (`RescueMainFrame.as` checks `isBand ? BandMoney : Money`
 * strictly, never falling back to the other pool — same contract replicated here for every 277 price). Returns
 * false (nothing charged) when that one pool doesn't cover it.
 */
export function payPrice(p: GamePlayer, price: number, isBind: boolean): boolean {
  if (isBind) {
    if (p.info.MoneyLock < price) return false;
    p.info.MoneyLock -= price;
  } else {
    if (p.info.Money < price) return false;
    p.info.Money -= price;
  }
  p.updateProperties();
  return true;
}

/**
 * Score/star from the fight's own kill count — no original formula exists (no C# at all), our own
 * calibration: every kill is worth 100 score; 3 stars at >=6 kills, 2 at >=3, 1 at >=1 kill on a win, 0 on a
 * loss (even with kills — "Resgate" is framed as a rescue mission, dying mid-rescue earns nothing).
 */
export function scoreAndStar(isWin: boolean, kills: number): { score: number; star: number } {
  const score = Math.max(0, kills) * 100;
  if (!isWin) return { score, star: 0 };
  const star = kills >= 6 ? 3 : kills >= 3 ? 2 : kills >= 1 ? 1 : 1;
  return { score, star };
}
