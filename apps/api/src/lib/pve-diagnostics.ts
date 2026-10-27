/**
 * Instâncias visual editor (site-admin-redesign, editor #2): diagnoses a dungeon's mission chain per
 * difficulty, the exact class of bug `docs/guides/pve.md` §1.1 documents (task `pve-cadeia`) — a
 * `*GameScript` calls `Game.SetupMissions("1072,1073")` but `game."Mission_Info"` is missing a row for one
 * of those ids, so the dungeon ends early and silently once the previous session is won, even though the
 * later mission's own script/NPCs are perfectly fine. The admin had no way to see this short of playing the
 * dungeon to the end — this surfaces it as a warning right in the editor.
 *
 * Same technique as `packages/fight/test/pve-sweep.test.ts`: construct the real `PveGame` for each
 * configured difficulty (that alone runs the `*GameScript`'s `OnCreated`, which is where `SetupMissions`
 * gets called) and read back `TotalMissionCount`/`Misssions`. Read-only — building a `PveGame` has no side
 * effects outside itself (same guarantee the sweep test relies on). Unlike the test, this runs against LIVE
 * admin data (current DB rows, including unsaved-to-the-game-server-cache admin edits) for ONE dungeon,
 * not the whole seed fixture.
 */
import { eGameType, eHardLevel, eRoomType, PveGame, scriptInfo, type MissionInfo, type NpcInfo, type PlayerSpec, type PveData, type PveInfo } from "@ddt/fight";
import { loadPackedAssets } from "@ddt/fight/node";
import "@ddt/fight/pve-scripts";
import { sql } from "drizzle-orm";
import type { AppCtx } from "../context.js";
import { all, q1 } from "./db.js";

type Row = Record<string, unknown>;

let assets: ReturnType<typeof loadPackedAssets> | null = null;

const DIFFICULTY_FIELDS = [
  [eHardLevel.Easy, "SimpleGameScript"],
  [eHardLevel.Normal, "NormalGameScript"],
  [eHardLevel.Hard, "HardGameScript"],
  [eHardLevel.Terror, "TerrorGameScript"],
  [eHardLevel.Epic, "EpicGameScript"],
] as const;

const diagPlayer = (userId: number): PlayerSpec => ({
  userId,
  nickname: `diag${userId}`,
  team: 1,
  grade: 20,
  attack: 400,
  defence: 300,
  agility: 300,
  lucky: 200,
  baseAttack: 500,
  baseDefence: 300,
  hp: 5000,
  weapon: { templateId: 7001, property8: 5 },
  isBot: true,
});

export interface MissingMissionScript {
  missionId: number;
  script: string;
}

/** One resolved session in the chain, in order. `cardDropId` is the matching `Drop_Condiction.DropID`
 *  (`CondictionType` 5 "Copy", `Para1` containing `,<id>,` — `docs/guides/pve.md` §3) when this mission has a
 *  card pool, so the UI can fetch its `Drop_Item` rows (`GET /api/admin/drop-items?cf_DropId=<id>`) without
 *  this endpoint needing to embed the whole pool (3000+ `Drop_Item` rows total, most sessions have none). */
export interface ChainMission {
  session: number;
  id: number;
  name: string;
  title: string | null;
  cardDropId: number | null;
}

export interface DungeonDifficultyDiagnostics {
  hardLevel: number;
  /** Which `Pve_Info` column held this difficulty's script (`SimpleGameScript`...). */
  field: string;
  script: string;
  totalMissionCount: number;
  resolvedCount: number;
  /** Session numbers (1-based) `SetupMissions` referenced but have no `Mission_Info` row — the chain breaks
   *  at the first one of these once the dungeon is played that far. Empty = chain is complete. */
  missingSessionKeys: number[];
  /** Resolved missions whose own `Script` has no registered class (a different, already-documented gap:
   *  the mission exists but its phase logic doesn't — it still ends on "no NPC left standing", never stuck). */
  missingMissionScripts: MissingMissionScript[];
  /** Every resolved session, in order — the mission chain the preview draws as a strip of cards. */
  missions: ChainMission[];
  /** Set only if constructing the game itself threw — would be a real bug, not a data gap (see file banner). */
  error?: string;
}

/** Diagnoses every difficulty this dungeon has a script for. `pveId` must exist in `game."Pve_Info"`. */
export async function diagnosePve(ctx: AppCtx, pveId: number): Promise<DungeonDifficultyDiagnostics[]> {
  assets ??= loadPackedAssets();
  const [infoRow, missionRows, npcRows, dropConditionRows] = await Promise.all([
    q1<Row>(ctx.h, sql`SELECT * FROM game."Pve_Info" WHERE "ID" = ${pveId}`),
    all(ctx.h, "game", "Mission_Info"),
    all(ctx.h, "game", "NPC_Info"),
    all(ctx.h, "game", "Drop_Condiction"),
  ]);
  if (!infoRow) return [];

  /** `Drop_Condiction.Para1` is a loose ",1,2,3,"-style CSV string (`DropInventory.CopyDrop`, `Para2 = ",1,"`
   *  gating is a per-NPC-count detail this diagnostic doesn't need) — `,<id>,` is the same substring match the
   *  donor server uses, not a guess. */
  const cardDropFor = (missionId: number): number | null => {
    const hit = (dropConditionRows as Row[]).find((r) => Number(r.CondictionType) === 5 && String(r.Para1 ?? "").includes(`,${missionId},`));
    return hit ? Number(hit.DropID) : null;
  };

  const info: PveInfo = {
    ID: Number(infoRow.ID),
    Name: String(infoRow.Name ?? ""),
    Type: Number(infoRow.Type ?? 0),
    LevelLimits: Number(infoRow.LevelLimits ?? 0),
    SimpleGameScript: (infoRow.SimpleGameScript as string | null) ?? null,
    NormalGameScript: (infoRow.NormalGameScript as string | null) ?? null,
    HardGameScript: (infoRow.HardGameScript as string | null) ?? null,
    TerrorGameScript: (infoRow.TerrorGameScript as string | null) ?? null,
    EpicGameScript: (infoRow.EpicGameScript as string | null) ?? null,
  };
  const missions = new Map((missionRows as unknown as MissionInfo[]).map((m) => [m.Id, m]));
  const npcs = new Map((npcRows as unknown as NpcInfo[]).map((n) => [n.ID, n]));
  const data: PveData = { npc: (id) => npcs.get(id), mission: (id) => missions.get(id) };

  const out: DungeonDifficultyDiagnostics[] = [];
  for (const [hardLevel, field] of DIFFICULTY_FIELDS) {
    const script = (infoRow[field] as string | null) ?? "";
    if (!script) continue;
    try {
      const roomType = Object.values(eRoomType).includes(info.Type as never) ? info.Type : eRoomType.Dungeon;
      const game = new PveGame({
        id: 1,
        roomType,
        gameType: roomType === eRoomType.Dungeon ? eGameType.Dungeon : eGameType.Freshman,
        timeType: 3,
        assets,
        players: [diagPlayer(1)],
        seed: 1,
        pveInfo: info,
        hardLevel,
        data,
      });
      const missingSessionKeys: number[] = [];
      for (let k = 1; k <= game.TotalMissionCount; k++) if (!game.Misssions.has(k)) missingSessionKeys.push(k);
      const missingMissionScripts: MissingMissionScript[] = [...game.Misssions.values()]
        .filter((mi) => !scriptInfo(mi.Script ?? ""))
        .map((mi) => ({ missionId: mi.Id, script: mi.Script ?? "" }));
      const chainMissions: ChainMission[] = [...game.Misssions.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([session, mi]) => ({ session, id: mi.Id, name: mi.Name, title: mi.Title ?? null, cardDropId: cardDropFor(mi.Id) }));
      out.push({ hardLevel, field, script, totalMissionCount: game.TotalMissionCount, resolvedCount: game.Misssions.size, missingSessionKeys, missingMissionScripts, missions: chainMissions });
    } catch (e) {
      out.push({ hardLevel, field, script, totalMissionCount: 0, resolvedCount: 0, missingSessionKeys: [], missingMissionScripts: [], missions: [], error: (e as Error).message });
    }
  }
  return out;
}
