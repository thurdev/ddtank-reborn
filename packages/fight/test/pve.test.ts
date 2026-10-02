import { describe, expect, it } from "vitest";
import { BotRunner, type FightEvent, GameState, PveGame, type PlayerSpec, scriptInfo } from "../src/index.js";
import "../src/pve/scripts/index.js";
import { loadPackedAssets } from "../src/node.js";
import { data, pves } from "./pve-data.js";

const assets = loadPackedAssets();
const spec = (userId: number, o: Partial<PlayerSpec> = {}): PlayerSpec => ({
  userId, nickname: `p${userId}`, team: 1, grade: 5, attack: 200, defence: 150, agility: 200, lucky: 150, baseAttack: 250, baseDefence: 100, hp: 1500,
  weapon: { templateId: 7001, property8: 5 }, isBot: true, ...o,
});

function play(game: PveGame, bots: BotRunner, until: (e: FightEvent[]) => boolean, maxMs = 1_800_000) {
  const all: FightEvent[] = [];
  for (let now = 0; now < maxMs; now += 40) {
    const ev = [...game.update(now), ...bots.update(now)];
    // ready for the next mission (MissionPrepareCommand) when a session is prepared after a win
    if (game.state === GameState.SessionPrepared && game.turnIndex !== 0) for (const p of game.players) ev.push(...game.handle(p.spec.userId, { cmd: "MISSION_PREPARE", ready: true }, now));
    all.push(...ev);
    if (until(all) || game.state === GameState.Stopped) return { all, now };
  }
  return { all, now: maxMs };
}

function newGame(pveId: number, roomType: number, players: PlayerSpec[], seed = 3, hardLevel = 0) {
  const game = new PveGame({ id: 1, roomType, gameType: roomType === 4 ? 7 : 10, timeType: 3, assets, players, seed, pveInfo: pves.get(pveId)!, hardLevel, data, drops: { copyDrop: () => [{ templateId: 11020, count: 1 }] } });
  const bots = new BotRunner(game, new Map(players.map((p) => [p.userId, { difficulty: 100 }])), 5);
  return { game, bots };
}

describe("PvE engine", () => {
  it("scripts are transpiled and registered (game, mission, brain)", () => {
    expect(scriptInfo("GameServerScript.AI.Game.NewTrainingGame2")?.origin).toBe("generated");
    expect(scriptInfo("GameServerScript.AI.Messions.NTM1085")?.kind).toBe("mission");
    expect(scriptInfo("GameServerScript.AI.NPC.NewTrainingBoss21002")?.kind).toBe("brain");
  });

  it("freshman 6-2 (Pve 112, mission 1085 — first main quest): NPC wave, boss spawn, win, card", () => {
    const { game, bots } = newGame(112, 10, [spec(1)]);
    const { all } = play(game, bots, (e) => e.some((x) => x.cmd === "PVE_STOPPED"));
    const cmds = all.map((e) => (e.cmd === "RAW" ? `RAW${e.code}` : e.cmd));
    expect(game.scriptErrors).toEqual([]);
    expect(game.missingScripts).toEqual([]);
    expect(cmds.slice(0, 1)).toEqual(["GAME_CREATE"]);
    expect(cmds).toContain("RAW113"); // mission info
    const load = all.find((e) => e.cmd === "GAME_LOAD");
    expect(load?.cmd === "GAME_LOAD" && load.mapId).toBe(2013);
    expect(load?.cmd === "GAME_LOAD" && load.files?.map((f) => f.className)).toContain("game.living.Living003");
    expect(cmds.filter((c) => c === "RAW64").length).toBe(2); // NPC 21001 + boss 21002
    const over = all.find((e) => e.cmd === "GAME_MISSION_OVER");
    expect(over?.cmd === "GAME_MISSION_OVER" && over.isWin).toBe(true);
    expect(over?.cmd === "GAME_MISSION_OVER" && over.missionId).toBe(1085);
    const allOver = all.find((e) => e.cmd === "GAME_ALL_MISSION_OVER");
    expect(allOver?.cmd === "GAME_ALL_MISSION_OVER" && allOver.players[0]!.canTakeOut).toBe(1);
    expect(all.some((e) => e.cmd === "PVE_AWARD")).toBe(true); // auto card at Stop
    expect(cmds).toContain("RAW98");
    expect(game.state).toBe(GameState.Stopped);
  });

  it("is deterministic (same seed → same event stream)", () => {
    const a = newGame(112, 10, [spec(1)], 9);
    const b = newGame(112, 10, [spec(1)], 9);
    const ra = play(a.game, a.bots, (e) => e.some((x) => x.cmd === "GAME_MISSION_OVER"));
    const rb = play(b.game, b.bots, (e) => e.some((x) => x.cmd === "GAME_MISSION_OVER"));
    expect(JSON.stringify(rb.all)).toBe(JSON.stringify(ra.all));
  });

  it("dungeon Ant Cave easy (Pve 2) with 2 players: missions chain via SetupMissions", () => {
    const { game, bots } = newGame(2, 4, [spec(1, { grade: 10, hp: 3000, attack: 400 }), spec(2, { grade: 10, hp: 3000, attack: 400 })], 11, 0);
    const { all } = play(game, bots, (e) => e.filter((x) => x.cmd === "GAME_MISSION_OVER").length >= 1, 3_600_000);
    expect(game.Misssions.size).toBeGreaterThan(1);
    expect(game.missingScripts).toEqual([]);
    const over = all.find((e) => e.cmd === "GAME_MISSION_OVER");
    expect(over).toBeDefined();
  });

  it("missing scripts fall back to the generic AI and never freeze", () => {
    const pve = { ...pves.get(112)!, SimpleGameScript: "GameServerScript.AI.Game.DoesNotExist" };
    const game = new PveGame({ id: 2, roomType: 10, gameType: 10, timeType: 3, assets, players: [spec(1)], seed: 1, pveInfo: { ...pve, ID: 10 }, hardLevel: 0, data: { npc: data.npc, mission: (id) => (id === 1001 ? { ...data.mission(1085)!, Id: 1001, Script: "Nope" } : undefined) } });
    const bots = new BotRunner(game, new Map([[1, { difficulty: 100 }]]), 5);
    const { all } = play(game, bots, (e) => e.some((x) => x.cmd === "PVE_STOPPED"));
    expect(game.missingScripts.map((m) => m.kind)).toEqual(["game", "mission"]);
    expect(all.some((e) => e.cmd === "GAME_ALL_MISSION_OVER")).toBe(true);
  });
});

describe("transpiled donor missions (smoke)", () => {
  const strong = (userId: number) => spec(userId, { grade: 30, attack: 900, defence: 600, agility: 600, lucky: 400, baseAttack: 900, baseDefence: 400, hp: 9000 });
  for (const missionId of [2001, 2002, 7001, 4101, 1086]) {
    it(`mission ${missionId} plays to a result without script errors`, () => {
      const m = data.mission(missionId)!;
      const game = new PveGame({ id: missionId, roomType: 4, gameType: 7, timeType: 3, assets, players: [strong(1), strong(2)], seed: missionId, pveInfo: pves.get(2)!, hardLevel: 0, data });
      game.Misssions.clear();
      game.Misssions.set(1, m);
      const bots = new BotRunner(game, new Map([[1, { difficulty: 100 }], [2, { difficulty: 100 }]]), 7);
      const { all } = play(game, bots, (e) => e.some((x) => x.cmd === "GAME_MISSION_OVER"), 1_200_000);
      const over = all.find((e) => e.cmd === "GAME_MISSION_OVER");
      expect(over, `${m.Script} never ended`).toBeDefined();
      expect(game.scriptErrors).toEqual([]);
      expect(game.missingScripts).toEqual([]);
      expect(all.filter((e) => e.cmd === "RAW" && e.code === 64).length).toBeGreaterThan(0); // NPCs spawned
    });
  }
});
