/**
 * Task `pve-cadeia`: sweep every `game."Pve_Info"` row × difficulty and check the mission chain `SetupMissions`
 * resolves (`game.ts` `SetupMissions`/`Misssions`, mirrors `PVEGame.cs:1964-1978`) — the same class of bug as
 * the Gulu Kingdom ("Castelo do Bugou") report in `pve.test.ts` ("chains into the Baron round"): a
 * `*GameScript` calls `Game.SetupMissions("a,b,c")` but `game."Mission_Info"` is missing a row for one of
 * the ids, so the dungeon ends early without reaching the later mission(s).
 *
 * This DOES NOT assert the whole catalog is clean — `docs/spec/combat/01-pve.md` §0 already documents ~346
 * donor-referenced script names with no donor implementation (a separate, known, pre-existing gap class);
 * requiring zero gaps here would make this test permanently red for reasons outside this task. Instead it
 * (a) asserts the exact dungeon this task fixed (Pve 1, Easy) is no longer broken — a regression guard —
 * and (b) reports every other broken chain it finds via console output, so they're visible without being a
 * hard failure. A maintainer closing one of those is a one-line migration, same as `0027_pve_cadeia_gulu_baron.sql`.
 */
import { describe, expect, it } from "vitest";
import { PveGame, eRoomType, eGameType, scriptInfo, type PlayerSpec } from "../src/index.js";
import "../src/pve/scripts/index.js";
import { loadPackedAssets } from "../src/node.js";
import { data, pves } from "./pve-data.js";

const assets = loadPackedAssets();
const spec = (userId: number): PlayerSpec => ({
  userId, nickname: `p${userId}`, team: 1, grade: 20, attack: 400, defence: 300, agility: 300, lucky: 200, baseAttack: 500, baseDefence: 300, hp: 5000,
  weapon: { templateId: 7001, property8: 5 }, isBot: true,
});

type GameScriptField = "SimpleGameScript" | "NormalGameScript" | "HardGameScript" | "TerrorGameScript" | "EpicGameScript";
const DIFFICULTIES: readonly [hardLevel: number, field: GameScriptField][] = [
  [0, "SimpleGameScript"], [1, "NormalGameScript"], [2, "HardGameScript"], [3, "TerrorGameScript"], [4, "EpicGameScript"],
];

interface BrokenChain {
  pveId: number; pveName: string; hardLevel: number; script: string; totalMissionCount: number; resolvedCount: number; missingSessionKeys: number[];
}
interface MissingMissionScript {
  pveId: number; hardLevel: number; missionId: number; script: string;
}

function sweep(): { broken: BrokenChain[]; missingMissionScripts: MissingMissionScript[]; constructed: number } {
  const broken: BrokenChain[] = [];
  const missingMissionScripts: MissingMissionScript[] = [];
  let constructed = 0;
  for (const info of pves.values()) {
    for (const [hardLevel, field] of DIFFICULTIES) {
      const script = info[field];
      if (!script) continue; // this dungeon doesn't ship this difficulty — not this sweep's concern
      const roomType = Object.values(eRoomType).includes(info.Type as never) ? info.Type : eRoomType.Dungeon;
      let game: PveGame;
      try {
        game = new PveGame({
          id: 1, roomType, gameType: roomType === eRoomType.Dungeon ? eGameType.Dungeon : eGameType.Freshman, timeType: 3,
          assets, players: [spec(1)], seed: 1, pveInfo: info, hardLevel, data,
        });
      } catch (e) {
        // construction itself must never throw (every C# call site is try/catch'd) — a real bug, not a data gap.
        throw new Error(`Pve ${info.ID} (${info.Name}) hardLevel ${hardLevel}: PveGame constructor threw: ${(e as Error).message}`);
      }
      constructed++;
      if (game.missingScripts.some((m) => m.kind === "game")) continue; // missing GAME script: different, already-documented gap class
      if (game.TotalMissionCount <= 1) continue; // single-mission dungeons can't exhibit this bug
      const missingSessionKeys: number[] = [];
      for (let k = 1; k <= game.TotalMissionCount; k++) if (!game.Misssions.has(k)) missingSessionKeys.push(k);
      if (missingSessionKeys.length > 0) {
        broken.push({ pveId: info.ID, pveName: info.Name, hardLevel, script, totalMissionCount: game.TotalMissionCount, resolvedCount: game.Misssions.size, missingSessionKeys });
      }
      for (const mi of game.Misssions.values()) {
        if (!scriptInfo(mi.Script)) missingMissionScripts.push({ pveId: info.ID, hardLevel, missionId: mi.Id, script: mi.Script });
      }
    }
  }
  return { broken, missingMissionScripts, constructed };
}

describe("PvE sweep: every Pve_Info × difficulty's SetupMissions chain", () => {
  it("constructs every (dungeon, difficulty) with a GameScript without throwing, and the Gulu Kingdom (Pve 1) Easy fix holds", () => {
    const { broken, missingMissionScripts, constructed } = sweep();
    expect(constructed).toBeGreaterThan(10); // sanity: the sweep actually ran over real data, not an empty catalog
    // eslint-disable-next-line no-console
    console.log(`pve sweep: ${constructed} (dungeon,difficulty) combos constructed, ${broken.length} with a broken mission chain, ${missingMissionScripts.length} resolved missions with no registered script.`);
    if (broken.length) console.log("broken chains (pre-existing, outside pve-cadeia's scope — see task description):", JSON.stringify(broken, null, 1));
    if (missingMissionScripts.length) console.log("resolved Mission_Info rows whose Script isn't registered:", JSON.stringify(missingMissionScripts.slice(0, 20), null, 1), missingMissionScripts.length > 20 ? `… +${missingMissionScripts.length - 20} more` : "");
    // regression guard: the exact bug this task fixed must not reappear.
    expect(broken.find((b) => b.pveId === 1 && b.hardLevel === 0)).toBeUndefined();
  });
});
