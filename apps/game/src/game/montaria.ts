/**
 * Aba no jogo: Montaria (`horse.swf`, 6600 only) — pure business logic (no I/O), unit-tested in
 * `test/montaria.test.ts`. Persistence: `db/montaria.ts`. Packet handler: `handlers/montaria/montaria.ts`.
 * Stat bonus wiring (level/skin -> combat stats): `game/stats.ts`.
 *
 * C#: `Game.Server.GameUtils/PlayerHorse.cs` (in-memory model) + `Game.Server.Horse.Handle/*.cs` (the 5
 * client-triggerable actions: ChangeHorse=2, UpHorse=3, UpSkill=5, TakeUpDownSkill=6,
 * ActiveHorsePicCherish=7). `Game.Logic/MountMgr.cs` = the template lookups (`db/templates.ts` loadMontaria).
 *
 * `curHasSkill`/`horsePicCherish` persist as JSON (`player."Mount_Data"`, migration 0013, m1-schema) — the
 * C# `PlayerHorse.SerializeMount`/`DeserializeMount` ALSO accepts a legacy `"id,exp,isUse|..."` pipe format
 * (`method_0` in `PlayerHorse.cs`) for rows written by an even older build; since this table has never had a
 * writer in this port until now, every row we ever create is JSON-shaped, so only that format is parsed here
 * (a non-JSON value is treated as empty, same net effect as the legacy branch on a table with no legacy rows).
 */

export interface MountSkillState { SKillID: number; Exp: number; IsUse: number }
/** One row of `player."Mount_Data"` (migration 0013) — table/column names kept 1:1 with `MountDataInfo.cs`. */
export interface MountDataRow {
  ID: number;
  UserID: number;
  curUseHorse: number;
  curLevel: number;
  curExp: number;
  curHasSkill: string | null;
  horsePicCherish: string | null;
}

/** PlayerHorse.DeserializeMount (curHasSkill branch, modern JSON path): `Dictionary<int, MountSkillDataInfo>`
 *  keyed by SKillID. Tolerates null/empty/garbage (-> empty map), same as the original's try/catch. */
export function parseMountSkills(raw: string | null | undefined): Map<number, MountSkillState> {
  const out = new Map<number, MountSkillState>();
  if (!raw) return out;
  try {
    const obj = JSON.parse(raw) as Record<string, { SKillID: number; Exp: number; IsUse: number }>;
    for (const v of Object.values(obj)) {
      if (v && Number.isFinite(v.SKillID)) out.set(v.SKillID, { SKillID: v.SKillID, Exp: v.Exp || 0, IsUse: v.IsUse || 0 });
    }
  } catch { /* legacy/garbage -> empty, see header note */ }
  return out;
}

/** PlayerHorse.SerializeMount (curHasSkill): `JsonConvert.SerializeObject(curHasSkill)` — a JSON OBJECT keyed
 *  by SKillID (string keys), matching .NET's `Dictionary<int, T>` serialization shape exactly. */
export function stringifyMountSkills(skills: Map<number, MountSkillState>): string {
  const obj: Record<string, MountSkillState> = {};
  for (const [id, s] of skills) obj[String(id)] = s;
  return JSON.stringify(obj);
}

/** PlayerHorse.DeserializeMount (horsePicCherish): `Dictionary<int, MountDrawDataInfo>` keyed by mount id. */
export function parseMountPicCherish(raw: string | null | undefined): Map<number, number> {
  const out = new Map<number, number>();
  if (!raw) return out;
  try {
    const obj = JSON.parse(raw) as Record<string, { ID: number; Active: number }>;
    for (const v of Object.values(obj)) if (v && Number.isFinite(v.ID)) out.set(v.ID, v.Active || 0);
  } catch { /* legacy/garbage -> empty */ }
  return out;
}

export function stringifyMountPicCherish(draws: Map<number, number>): string {
  const obj: Record<string, { ID: number; Active: number }> = {};
  for (const [id, active] of draws) obj[String(id)] = { ID: id, Active: active };
  return JSON.stringify(obj);
}

/** PlayerHorse.UpdateUsedSkill: slot (1..3) -> equipped skill id, derived from `IsUse` on each skill (never
 *  persisted on its own — it's always recomputed from `skills`, same as the C# dictionary_1 cache). */
export function usedSkillSlots(skills: Map<number, MountSkillState>): Map<number, number> {
  const out = new Map<number, number>();
  for (const s of skills.values()) if (s.IsUse > 0 && !out.has(s.IsUse)) out.set(s.IsUse, s.SKillID);
  return out;
}

export interface MountTemplateRow { Grade: number; Experience: number; SkillID: number; AddDamage: number; AddGuard: number; MagicAttack: number; MagicDefence: number; AddBlood: number }
export interface MountSkillTemplateRow { ID: number; CostEnergy: number; UseCount: number }
export interface MountSkillGetRow { ID: number; Level: number; SkillID: number; NextID: number; Type: number | null; Exp: number | null }

export interface MountDataTables {
  mountTemplate(grade: number): MountTemplateRow | undefined;
  /** MountMgr.GetSkillGetTemplates(skillId): every Mount_SKill_Get_Template row sharing that skill's `Type`
   *  (the skill's own evolution ladder), in whatever order the table stores them. */
  mountSkillGetTemplates(skillId: number): MountSkillGetRow[];
}

/**
 * UpHorse.cs:14-57 (sub 3 UP_HORSE, feed items -> mount level/exp). `requestedCount` = the int the client
 * sent (how many "Star Upgrade Pills", templateId 11164, it wants to spend); `ownedCount` = how many the
 * player actually has in PropBag (clamped server-side, `ıtemByTemplateID.Count < num` branch) — `expPerItem`
 * comes from the real item template's `Property2` (= 100 in the seed; `handlers/montaria/montaria.ts` reads
 * it off `ctx.templates.findItem`, never hard-coded here).
 *
 * Returns `null` only when NOTHING would be spent (no items owned, or `requestedCount<=0`) — the caller must
 * not call `PropBag.RemoveTemplate` at all in that case. When `count>0` the original removes the items
 * UNCONDITIONALLY (`UpHorse.cs:25-33`, before ever checking whether the resulting exp is positive) — mirrored
 * via `spendCount` always being set whenever this returns non-null; `leveledUp`/`newSkill` naturally stay at
 * their no-op defaults when `expPerItem<=0` (never happens with real data, kept literal anyway).
 */
export function computeFeedResult(
  t: MountDataTables,
  curLevel: number,
  curExp: number,
  requestedCount: number,
  ownedCount: number,
  expPerItem: number,
): { spendCount: number; gainedExp: number; newLevel: number; newExp: number; leveledUp: boolean; newSkill: MountSkillState | null } | null {
  const count = Math.min(requestedCount, ownedCount);
  if (count <= 0) return null;
  const gainedExp = Math.max(0, expPerItem) * count;
  const newExp = curExp + gainedExp;
  const next = t.mountTemplate(curLevel + 1);
  let newLevel = curLevel;
  let leveledUp = false;
  let newSkill: MountSkillState | null = null;
  // UpHorse.cs:40 — only ONE grade up per feed, even if `newExp` would clear several thresholds at once
  // (matches the original: `mountTemplate` is looked up once for `curLevel + 1`, never re-checked in a loop).
  if (gainedExp > 0 && next && newExp >= next.Experience) {
    leveledUp = true;
    newLevel = next.Grade;
    if (next.SkillID > 0) newSkill = { SKillID: next.SkillID, Exp: 0, IsUse: 0 };
  }
  return { spendCount: count, gainedExp, newLevel, newExp, leveledUp, newSkill };
}

/**
 * UpSkill.cs:12-71 (sub 5 UP_SKILL, feed items -> mount SKILL exp, possibly evolving into a new skill id).
 * `expPerItem` = the real item template's `Property2` for templateId 11165 ("Skill Upgrade Bead", = 10 in
 * the seed). Same "spend unconditionally whenever `count>0`" shape as `computeFeedResult` above
 * (`UpSkill.cs:27-34`).
 *
 * `MountMgr.GetSkillGetTemplates(SkillID)`'s rows are the skill's own evolution ladder (same `Type`); the
 * original walks EVERY row in table order and keeps overwriting a scratch var with `row.SkillID` whenever
 * `newExp >= row.Exp` (no `break`, so the LAST qualifying row in iteration order wins, not the highest
 * `Exp`) — mirrored literally via `lastQualifying` below rather than a "max Exp" reduction, in case a `Type`
 * is ever authored out of Level order. Only AFTER that full pass does it compare the result against the
 * CURRENT skill id (`num5 > mountSkillDataInfo.SKillID`) — never downgrades.
 */
export function computeSkillUpResult(
  t: MountDataTables,
  skill: MountSkillState,
  requestedCount: number,
  ownedCount: number,
  expPerItem: number,
): { spendCount: number; gainedExp: number; newExp: number; newSkillId: number } | null {
  const count = Math.min(requestedCount, ownedCount);
  if (count <= 0) return null;
  const gainedExp = Math.max(0, expPerItem) * count;
  const newExp = skill.Exp + gainedExp;
  let lastQualifying = -1;
  if (gainedExp > 0) for (const row of t.mountSkillGetTemplates(skill.SKillID)) if (newExp >= (row.Exp ?? 0)) lastQualifying = row.SkillID;
  const newSkillId = lastQualifying !== -1 && lastQualifying > skill.SKillID ? lastQualifying : skill.SKillID;
  return { spendCount: count, gainedExp, newExp, newSkillId };
}

/**
 * PlayerHorse.ActiveHorsePicCherish(mountId) (PlayerHorse.cs:194-212) — the SAME mutation is reused by both
 * sub 2 CHANGE_HORSE (`ChangeHorse.cs:27`) and sub 7 ACTIVE_HORSEPICCHERISH (`ActiveHorsePicCherish.cs:27`).
 * `GetPicCherishs` (the stats source, `game/stats.ts`) returns every entry regardless of `Active` — so
 * mutating `Active` here only matters for the 260/8 push the client uses to grey out already-owned skins;
 * it can never change combat stats. Returns whether a BRAND NEW entry was added (id wasn't owned before,
 * `mountId > 100` — ids <=100 are the non-"cherished" mount tags and never get an entry at all).
 */
export function activateMountPicCherish(picCherish: Map<number, number>, mountId: number): boolean {
  let added = false;
  if (!picCherish.has(mountId) && mountId > 100) { picCherish.set(mountId, 0); added = true; }
  for (const key of picCherish.keys()) picCherish.set(key, 0);
  if (picCherish.has(mountId)) picCherish.set(mountId, 1);
  return added;
}
