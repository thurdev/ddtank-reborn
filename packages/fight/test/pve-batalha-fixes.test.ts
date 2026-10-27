/**
 * Task `pve-batalha` (owner report, via `pve-qa`'s open items): three engine bugs that stalled whole
 * dungeons forever in the headless playthrough sweep (`pve-playthrough-sweep.test.ts`,
 * `docs/qa/PVE-QA.md`), found by instrumenting a single dungeon run turn-by-turn instead of just
 * black-box asserting win/lose:
 *
 * 1. `checkStateNow`'s `GameState.Playing`/`PrepareGameOver` cases (`game.ts`) invented a `CanEndGame`
 *    latch + a hardcoded map-id allowlist (1166/1207/1209/1216) to decide when to enter `PrepareGameOver`.
 *    Neither exists in `vendor/DDTank4.1/Source Server/Game.Logic/Actions/CheckPVEGameStateAction.cs:60-73`
 *    (the actual donor state machine: `PrepareGameOver` only exists for the Labyrinth gate cutscene,
 *    `IsLabyrinth() && CanEnterGate -> GameOverMovie()`; every other room type calls `GameOver()` directly
 *    once `CurrentActionCount` settles) — so any mission set on exactly those 4 maps that never flips
 *    `CanEndGame` (nothing in scope does) got stuck in `PrepareGameOver` forever. Warriors Arena's king
 *    chamber (map 1216, Pve 13 "Đấu Trường Dũng Sĩ") sits on every single difficulty's phase 3/4 boundary.
 * 2. `canGameOver()` (`game.ts`) was missing the `TurnIndex > TotalTurn - 1` branch from
 *    `PVEGame.CanGameOver` (`PVEGame.cs:264-288`), so a mission whose own `CanGameOver()` can never return
 *    true (Warriors Arena phase 4, `WAS13004`/`WAN13104`/`WAH13204`/`WAT13304`: `kill ==
 *    Game.MissionInfo.TotalCount` with `TotalCount = -1`, confirmed in the donor DB dump itself —
 *    `vendor/_dbexport/Project_Game34/data/Mission_Info.json` — not an import bug) ran forever instead of
 *    ending at the turn limit like the real server.
 * 3. `enemiesOf()` (PVE override, `game.ts`) blanket-excluded `config.IsHelper` NPCs from the bot's target
 *    list. `IsHelper` is a reborn-only concept with no donor citation (bots don't exist in
 *    `vendor/DDTank4.1`); several missions deliberately summon the actual kill objective with
 *    `IsHelper = true` (Pve 3's "Đậu thần" bean-god boss, `BLTTT1123`/sisters; the analogous pattern in Pve
 *    4/5/6), so bots had zero valid targets and stalled — indistinguishable from a real bug until traced.
 *
 * These are regression guards for the 3 engine fixes, not a full re-run of the sweep (that stays a
 * console.log tool, `PVE_SWEEP=1 ...`, since bot outcomes are still probabilistic for balance reasons).
 */
import { describe, expect, it } from "vitest";
import { BotRunner, type FightEvent, GameState, PveGame, type PlayerSpec, eRoomType, eGameType } from "../src/index.js";
import "../src/pve/scripts/index.js";
import { loadPackedAssets } from "../src/node.js";
import { data, pves, realDrops } from "./pve-data.js";

const assets = loadPackedAssets();
const strong = (userId: number): PlayerSpec => ({
  userId, nickname: `p${userId}`, team: 1, grade: 60, attack: 30_000, defence: 20_000, agility: 5_000, lucky: 5_000,
  baseAttack: 40_000, baseDefence: 20_000, hp: 2_000_000, weapon: { templateId: 7001, property8: 5 }, isBot: true,
});

function play(game: PveGame, bots: BotRunner, until: (e: FightEvent[]) => boolean, maxMs = 2_400_000) {
  const all: FightEvent[] = [];
  for (let now = 0; now < maxMs; now += 40) {
    const ev = [...game.update(now), ...bots.update(now)];
    if (game.state === GameState.SessionPrepared && game.turnIndex !== 0) for (const p of game.players) ev.push(...game.handle(p.spec.userId, { cmd: "MISSION_PREPARE", ready: true }, now));
    all.push(...ev);
    if (until(all) || game.state === GameState.Stopped) return { all, now };
  }
  return { all, now: maxMs };
}

describe("pve-batalha: PrepareGameOver/CanEndGame + TotalTurn engine fixes", () => {
  it("Pve 13 (Đấu Trường Dũng Sĩ) Fácil: clears all 4 phases incl. the map-1216 king chamber (phase 3) and the TotalCount=-1 final wave (phase 4), wins, takes a card", () => {
    const info = pves.get(13)!;
    const players = [strong(1), strong(2)];
    const game = new PveGame({
      id: 1, roomType: eRoomType.Dungeon, gameType: eGameType.Dungeon, timeType: 3,
      assets, players, seed: 7, pveInfo: info, hardLevel: 0, data, drops: realDrops,
    });
    const bots = new BotRunner(game, new Map(players.map((p) => [p.userId, { difficulty: 100 }])), 5);
    const expectedMissions = game.Misssions.size;
    expect(expectedMissions).toBe(4);
    const { all } = play(game, bots, (e) => e.some((x) => x.cmd === "PVE_STOPPED"));
    expect(game.scriptErrors).toEqual([]);
    const overs = all.filter((e) => e.cmd === "GAME_MISSION_OVER");
    expect(overs.length).toBe(4); // used to stall forever at 2/4 (phase 3, the map-1216 king chamber)
    const stopped = all.find((e) => e.cmd === "PVE_STOPPED");
    expect(stopped && (stopped as { isWin: boolean }).isWin).toBe(true);
    expect(all.some((e) => e.cmd === "GAME_ALL_MISSION_OVER")).toBe(true);
    expect(all.some((e) => e.cmd === "PVE_AWARD")).toBe(true);
  }, 30_000);

  it("canGameOver() ends a dungeon at the turn limit even when the mission's own CanGameOver() never returns true (PVEGame.cs:264-288's TurnIndex > TotalTurn - 1 branch)", () => {
    // Pve 13 phase 4 (WAS13004 et al.) is exactly this case in real content: `kill ==
    // Game.MissionInfo.TotalCount` can never be true because TotalCount is -1 in the donor data itself, so
    // the ONLY way this phase ever ends is the turn-limit fallback this test guards directly.
    const info = pves.get(13)!;
    const players = [strong(1), strong(2)];
    const game = new PveGame({
      id: 1, roomType: eRoomType.Dungeon, gameType: eGameType.Dungeon, timeType: 3,
      assets, players, seed: 7, pveInfo: info, hardLevel: 0, data, drops: realDrops,
    });
    const bots = new BotRunner(game, new Map(players.map((p) => [p.userId, { difficulty: 100 }])), 5);
    const { all } = play(game, bots, (e) => e.some((x) => x.cmd === "PVE_STOPPED"));
    expect(all.some((e) => e.cmd === "PVE_STOPPED")).toBe(true); // never hangs to maxMs
    expect(game.turnIndex).toBeLessThanOrEqual(205); // settles near TotalTurn (200), not an unrelated early/late exit
  }, 30_000);
});

describe("pve-batalha: academy mentor dungeons (GZS801/XDS901/DTS701) -- Game.FindSingleSimpleBossID + masterId", () => {
  const master = (userId: number): PlayerSpec => ({
    userId, nickname: `master${userId}`, team: 1, grade: 60, attack: 30_000, defence: 20_000, agility: 5_000, lucky: 5_000,
    baseAttack: 40_000, baseDefence: 20_000, hp: 2_000_000, weapon: { templateId: 7001, property8: 5 }, isBot: true,
  });
  const apprentice = (userId: number, masterUserId: number): PlayerSpec => ({
    userId, nickname: `apprentice${userId}`, team: 1, grade: 15, attack: 30_000, defence: 20_000, agility: 5_000, lucky: 5_000,
    baseAttack: 40_000, baseDefence: 20_000, hp: 2_000_000, weapon: { templateId: 7001, property8: 5 }, isBot: true, masterId: masterUserId,
  });

  // Pve 8 (Rừng rậm Gamazon, GZS801), 9 (Hoang mạc Xatara, XDS901), 10 (Lâu đài Daucula, DTS701): opening
  // mission pairs one real apprentice with one real master (`PlayerDetail.PlayerCharacter.masterID`,
  // `loadPlayers()`). `Game.FindSingleSimpleBossID` (CanGameOver) didn't exist at all -- not in
  // `vendor/DDTank4.1`'s `BaseGame.cs` either, ported from a later donor source,
  // `vendor/_qa-feature-sources/ddt3.8/Game.Logic/BaseGame.cs:3263-3273` -- so GZS801/XDS901 crashed on
  // every `CanGameOver()` call regardless of player setup.
  it.each([8, 9, 10])("Pve %i's opening mission runs with no script errors when a real apprentice/master pair is seated", (pveId) => {
    const info = pves.get(pveId)!;
    const players = [master(1), apprentice(2, 1)];
    const game = new PveGame({
      id: 1, roomType: eRoomType.Dungeon, gameType: eGameType.Dungeon, timeType: 3,
      assets, players, seed: 7, pveInfo: info, hardLevel: 0, data, drops: realDrops,
    });
    const bots = new BotRunner(game, new Map(players.map((p) => [p.userId, { difficulty: 100 }])), 5);
    play(game, bots, (e) => e.some((x) => x.cmd === "GAME_MISSION_OVER"), 900_000);
    expect(game.scriptErrors).toEqual([]); // used to throw "FindSingleSimpleBossID is not a function" / "reading 'BoltMove' of null"
  }, 30_000);
});

describe("pve-batalha: enemiesOf() no longer excludes IsHelper kill objectives", () => {
  it("includes a damageable IsHelper NPC (the real objective in e.g. BLTTT1123's bean-god boss) but still excludes a CanTakeDamage=false cosmetic prop (e.g. TVH12001's ChickenHelp decoy)", () => {
    const info = pves.get(2)!; // Ant Cave: short, cheap to construct, any Type-4 dungeon does
    const players = [strong(1)];
    const game = new PveGame({
      id: 1, roomType: eRoomType.Dungeon, gameType: eGameType.Dungeon, timeType: 3,
      assets, players, seed: 1, pveInfo: info, hardLevel: 0, data, drops: realDrops,
    });
    const npcId = 11002; // a common filler NPC id present across the seed's NPC_Info
    const helperConfig = game.BaseLivingConfig();
    helperConfig.IsHelper = true;
    const helperBoss = game.CreateNpc(npcId, 500, 500, 1, -1, "", helperConfig);

    const decoyConfig = game.BaseLivingConfig();
    decoyConfig.IsHelper = true;
    decoyConfig.CanTakeDamage = false;
    const decoy = game.CreateNpc(npcId, 600, 500, 1, -1, "", decoyConfig);

    const enemies = game.enemiesOf(players[0] as never);
    expect(enemies).toContain(helperBoss); // was wrongly excluded by the old `!l.config.IsHelper` filter
    expect(enemies).not.toContain(decoy); // CanTakeDamage=false still correctly excludes cosmetic props
  });
});
