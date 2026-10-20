/**
 * Task `41-instancias` (owner request 2026-10-20, docs/plan/TASKS.md): dungeon ("masmorra") unlock rules.
 *
 * Server-authoritative gate for `RoomType.Dungeon` (`rooms/room.ts`): a difficulty may be picked only when
 * (1) the player's level meets the dungeon's `Pve_Info.LevelLimits` (the original's own rule — see
 * `EnterRoomAction.cs`/`room-mgr.ts` `BaseRoom.levelLimit`, already enforced at room-entry time) AND
 * (2) — Reborn addition, no vendor equivalent — the player has already cleared the PREVIOUS difficulty of
 * the SAME dungeon at least once (`app."PveInstanceClear"`, `db/pve-progress.ts`). The first (lowest)
 * difficulty a dungeon actually has data for never needs a previous clear.
 *
 * "Which difficulties a dungeon actually has" is derived from `Pve_Info` itself (which *TemplateIds columns
 * are non-empty), not hardcoded — most dungeons only ship Simple+Normal, some add Hard/Terror, a few 6600
 * rows add Epic/Nightmare (`eHardLevel`, `packages/fight/src/pve/game.ts`). Difficulty numbering matches
 * `eHardLevel`/`rooms/room.ts` `HardLevel`: 0 Simple, 1 Normal, 2 Hard, 3 Terror, 4 Epic, 5 Nightmare (the
 * Dungeon-only meaning of slot 5 — Fight Lab's own "Simple" reuse of slot 5 never reaches this module,
 * since Fight Lab already has its own unlock system, `game/fightlab.ts`, and is never `RoomType.Dungeon`).
 *
 * Configurable (owner request: "configurable by having cleared the previous one"): `game."Server_Config"`
 * key `pveRequireClear` (read via `Templates.cfgInt`, same mechanism as every other int config in this
 * codebase) — `0` disables rule (2) globally, keeping only the level gate. Defaults to enabled (`1`).
 * `cfg.ALL_OPEN` (QA dev switch, already bypasses the Dungeon room LevelLimits check in `room-mgr.ts`) also
 * bypasses both rules here, for the same reason every other `ALL_OPEN` gate exists.
 */

/** A `game."Pve_Info"` row, trimmed to the fields this module reads. */
export interface PveInfoLike {
  ID: number;
  LevelLimits: number | null;
  SimpleTemplateIds?: string | null;
  NormalTemplateIds?: string | null;
  HardTemplateIds?: string | null;
  TerrorTemplateIds?: string | null;
  EpicTemplateIds?: string | null;
  NightmareTemplateIds?: string | null;
}

type TemplateIdsField = "SimpleTemplateIds" | "NormalTemplateIds" | "HardTemplateIds" | "TerrorTemplateIds" | "EpicTemplateIds" | "NightmareTemplateIds";

/** eHardLevel order (packages/fight/src/pve/game.ts) restricted to the Dungeon-only ladder (never slot 5 = Simple). */
export const DUNGEON_DIFFICULTY_FIELDS: readonly [hardLevel: number, field: TemplateIdsField][] = [
  [0, "SimpleTemplateIds"],
  [1, "NormalTemplateIds"],
  [2, "HardTemplateIds"],
  [3, "TerrorTemplateIds"],
  [4, "EpicTemplateIds"],
  [5, "NightmareTemplateIds"],
];

/** A `*TemplateIds` value counts as "this difficulty has data" when it has at least one real NPC id (not
 *  blank, not the `-100` "closed" sentinel some rows use — e.g. `game."Pve_Info"` ID 12). */
function hasTemplates(v: string | null | undefined): boolean {
  if (!v) return false;
  return v.split(/[,\n]/).some((s) => {
    const n = Number(s.trim());
    return Number.isFinite(n) && n > 0;
  });
}

/** Ascending list of difficulties this dungeon actually ships, e.g. `[0, 1]` for a Simple+Normal-only row. */
export function dungeonDifficultyLadder(info: PveInfoLike): number[] {
  return DUNGEON_DIFFICULTY_FIELDS.filter(([, field]) => hasTemplates(info[field])).map(([hardLevel]) => hardLevel);
}

export interface PveUnlockOptions {
  /** cfg.ALL_OPEN (QA) — bypasses both the level gate and the previous-clear gate. */
  allOpen?: boolean;
  /** game."Server_Config" "pveRequireClear" (default enabled) — bypasses only the previous-clear gate. */
  requireClear?: boolean;
}

export interface PveUnlockResult {
  unlocked: boolean;
  /** Set when `unlocked` is false: "level" (grade too low) or "clear" (previous difficulty not cleared). */
  reason?: "level" | "clear";
  /** The previous difficulty in the ladder that must be cleared first (only set when reason === "clear"). */
  requiresClearOf?: number;
}

/**
 * `hardLevel` must be a difficulty this dungeon's `Pve_Info` row actually has data for (checked by the
 * caller via `dungeonDifficultyLadder`/`pveByType` — a `hardLevel` the ladder doesn't contain is never
 * reachable through the normal client UI, so it is treated as locked here too, defensively).
 */
export function isDungeonUnlocked(info: PveInfoLike, hardLevel: number, playerGrade: number, cleared: ReadonlySet<number>, o: PveUnlockOptions = {}): PveUnlockResult {
  if (o.allOpen) return { unlocked: true };
  const ladder = dungeonDifficultyLadder(info);
  const idx = ladder.indexOf(hardLevel);
  if (idx === -1) return { unlocked: false, reason: "level" };
  if (playerGrade < (info.LevelLimits ?? 0)) return { unlocked: false, reason: "level" };
  if (idx === 0 || o.requireClear === false) return { unlocked: true };
  const prev = ladder[idx - 1]!;
  if (!cleared.has(prev)) return { unlocked: false, reason: "clear", requiresClearOf: prev };
  return { unlocked: true };
}
