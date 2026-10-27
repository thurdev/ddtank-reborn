/**
 * Task `pve-cartas` (owner report, 2026-10-27): on Bugo Castle / Gulu Kingdom (Pve 1, Easy), the final stage
 * (the Baron, mission 1073 — its `Mission_Info` row was just restored by `pve-cadeia`'s
 * `0027_pve_cadeia_gulu_baron.sql`) animates its reward cards correctly but every flipped card has NO ITEM.
 *
 * Root cause, traced 1:1 against the donor: `PVEGame.TakeCard` (`vendor/DDTank41/Game.Logic/PVEGame.cs:2180`)
 * resolves a card's item via `DropInventory.CopyDrop(missionId, 1)`
 * (`vendor/DDTank41/Game.Logic/DropInventory.cs:113`) → `DropMgr.FindCondiction(eDropType.Copy, missionId,
 * "1")` (`vendor/DDTank41/Bussiness/Managers/DropMgr.cs:22`, `eDropType.Copy = 5`,
 * `vendor/DDTank41/Bussiness/Protocol/eDropType.cs:9`) — a `game."Drop_Condiction"` row with
 * `CondictionType = 5` whose comma-wrapped `Para1` contains the mission id. `packages/fight/src/pve/game.ts`
 * `takeCard()` ports this exactly (`this.drops.copyDrop?.(id, 1)`), and `apps/game/src/db/templates.ts`
 * `pveDrop()`/`findDropCondition()` port `DropMgr`/`DropInventory` exactly too — this is NOT a code bug.
 *
 * It IS a data gap, same class as `pve-cadeia`: `game."Drop_Condiction"` DropID 50006 ("Cung Điện Gà Dễ" —
 * Gulu Kingdom Easy's card pool) has `Para1 = ",1071,1072,"` — it lists mission 1071 (Gà Dễ S1, not even
 * part of this dungeon's `SetupMissions("1072,1073")` chain) and 1072 (Gà Dễ S2), but never 1073 (Gà Dễ S3,
 * the Baron) — confirmed missing even in the raw donor DB export
 * (`vendor/_dbexport/Project_Game34/data/Drop_Condiction.json`, same 112 rows), not an import bug. Every
 * sibling difficulty's single Drop_Condiction row lists ALL of that difficulty's missions together: Normal's
 * 50007 = ",1171,1172,1173,", Hard's 50008 = ",1271,1272,1273,1274,", Terror's 50009 =
 * ",1371,1372,1373,1374,1375," — only Easy's 50006 is short one id. Fixed by extending Para1 to
 * ",1071,1072,1073," (`packages/db/drizzle/0028_pve_cartas_gulu_baron_card.sql`, idempotent, same pattern as
 * `0027_pve_cadeia_gulu_baron.sql`) + the seed gz (`packages/db/seed/game/Drop_Condiction.json.gz`).
 *
 * This file (a) reproduces the exact bug end-to-end with REAL seed data (not the constant stub
 * `drops: { copyDrop: () => [{ templateId: 11020, count: 1 }] }` other PvE tests use, which can't reproduce a
 * missing-drop-row bug because it never consults Drop_Condiction/Drop_Item at all), and (b) sweeps every
 * `Mission_Info.TakeCard > 0` row and reports (non-fatally, except for the regression guard below) any whose
 * card pool resolves to nothing — the same reporting shape as `pve-sweep.test.ts` uses for broken mission
 * chains.
 */
import { describe, expect, it } from "vitest";
import { BotRunner, type FightEvent, GameState, PveGame, type PlayerSpec } from "../src/index.js";
import "../src/pve/scripts/index.js";
import { loadPackedAssets } from "../src/node.js";
import { data, dropItems, findDropCondition, missions, pves, realDrops } from "./pve-data.js";

const assets = loadPackedAssets();
const spec = (userId: number, o: Partial<PlayerSpec> = {}): PlayerSpec => ({
  userId, nickname: `p${userId}`, team: 1, grade: 20, attack: 400, defence: 300, agility: 300, lucky: 200, baseAttack: 500, baseDefence: 300, hp: 5000,
  weapon: { templateId: 7001, property8: 5 }, isBot: true, ...o,
});

function play(game: PveGame, bots: BotRunner, until: (e: FightEvent[]) => boolean, maxMs = 3_600_000) {
  const all: FightEvent[] = [];
  for (let now = 0; now < maxMs; now += 40) {
    const ev = [...game.update(now), ...bots.update(now)];
    if (game.state === GameState.SessionPrepared && game.turnIndex !== 0) for (const p of game.players) ev.push(...game.handle(p.spec.userId, { cmd: "MISSION_PREPARE", ready: true }, now));
    all.push(...ev);
    if (until(all) || game.state === GameState.Stopped) return { all, now };
  }
  return { all, now: maxMs };
}

describe("PvE card rewards use the real Drop_Condiction/Drop_Item data (task pve-cartas)", () => {
  it("Gulu Kingdom easy (Pve 1): both the Gà Dễ S2 (1072) and Baron (1073) cards carry an item, not just animate", () => {
    const strong = (userId: number) => spec(userId, { grade: 20, hp: 5000, attack: 400, defence: 300, agility: 300, lucky: 200, baseAttack: 500, baseDefence: 300 });
    const game = new PveGame({ id: 1, roomType: 4, gameType: 7, timeType: 3, assets, players: [strong(1), strong(2)], seed: 3, pveInfo: pves.get(1)!, hardLevel: 0, data, drops: realDrops });
    const bots = new BotRunner(game, new Map([[1, { difficulty: 100 }], [2, { difficulty: 100 }]]), 5);
    const { all } = play(game, bots, (e) => e.some((x) => x.cmd === "PVE_STOPPED"));
    expect(game.Misssions.size).toBe(2); // 1072 + 1073 (pve-cadeia regression guard, not this task's concern)
    const overs = all.filter((e) => e.cmd === "GAME_MISSION_OVER").map((e) => (e as { missionId: number; isWin: boolean }));
    expect(overs.map((e) => e.missionId)).toEqual([1072, 1073]);
    expect(overs.every((e) => e.isWin)).toBe(true);
    // RAW98 = PVEGame.SendGamePlayerTakeCard(player, isAuto, index, templateID, count) — body layout in game.ts takeCard():
    // [["bool", isAuto], ["u8", index], ["i32", templateId], ["i32", count], ["bool", false]].
    const cardRaws = all.filter((e) => e.cmd === "RAW" && e.code === 98) as Extract<FightEvent, { cmd: "RAW" }>[];
    expect(cardRaws.length).toBeGreaterThan(0);
    for (const c of cardRaws) {
      const templateId = c.body[2]![1] as number;
      expect(templateId, `card flip ${JSON.stringify(c.body)} had no item — Drop_Condiction gap for this mission's card pool`).not.toBe(0);
    }
  }, 20000);
});

describe("PvE card-pool sweep: every Mission_Info.TakeCard > 0 row resolves at least one Drop_Condiction/Drop_Item source", () => {
  it("reports missions whose card pool is empty (data gaps), and guards the Baron (1073) fix", () => {
    const empty: { missionId: number; name: string }[] = [];
    let checked = 0;
    for (const m of missions.values()) {
      if (!m.TakeCard || m.TakeCard <= 0) continue;
      checked++;
      const dropId = findDropCondition(5, m.Id, 1);
      const hasItems = dropId > 0 && (dropItems.get(dropId)?.length ?? 0) > 0;
      if (!hasItems) empty.push({ missionId: m.Id, name: m.Name });
    }
    expect(checked).toBeGreaterThan(50); // sanity: the sweep actually ran over real data
    // eslint-disable-next-line no-console
    console.log(`pve-cartas card sweep: ${checked} missions with TakeCard > 0, ${empty.length} with an empty card pool.`);
    if (empty.length) console.log("missions with no card drop source (data gaps — see docs/guides/pve.md §1.2):", JSON.stringify(empty));
    // regression guard: the exact bug this task fixed must not reappear.
    expect(empty.find((e) => e.missionId === 1073)).toBeUndefined();
  });
});
