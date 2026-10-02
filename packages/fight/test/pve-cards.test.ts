import { describe, expect, it } from "vitest";
import { BotRunner, type FightEvent, GameState, PveGame, type PlayerSpec } from "../src/index.js";
import "../src/pve/scripts/index.js";
import { loadPackedAssets } from "../src/node.js";
import { data, pves } from "./pve-data.js";

const assets = loadPackedAssets();
const strong = (userId: number): PlayerSpec => ({
  userId, nickname: `p${userId}`, team: 1, grade: 30, attack: 2000, defence: 1500, agility: 600, lucky: 600, baseAttack: 3000, baseDefence: 900, hp: 30000,
  weapon: { templateId: 7001, property8: 5 }, isBot: true,
});

describe("PvE dungeon reward cards (PVEGame.GameOver / GameOverAllSession / Stop)", () => {
  it("last mission of a won dungeon: 2 cards, auto picks at Stop, SHOW_CARDS (89), stop", () => {
    const game = new PveGame({ id: 9, roomType: 4, gameType: 7, timeType: 3, assets, players: [strong(1), strong(2)], seed: 11, pveInfo: pves.get(2)!, hardLevel: 0, data, drops: { copyDrop: () => [{ templateId: 11020, count: 1 }] } });
    game.Misssions.clear();
    game.Misssions.set(1, data.mission(2001)!);
    const bots = new BotRunner(game, new Map([[1, { difficulty: 100 }], [2, { difficulty: 100 }]]), 5);
    const all: FightEvent[] = [];
    for (let now = 0; now < 3_600_000 && game.state !== GameState.Stopped; now += 40) {
      const ev = [...game.update(now), ...bots.update(now)];
      if (game.state === GameState.SessionPrepared && game.turnIndex !== 0) for (const p of game.players) ev.push(...game.handle(p.spec.userId, { cmd: "MISSION_PREPARE", ready: true }, now));
      all.push(...ev);
    }
    const over = all.filter((e) => e.cmd === "GAME_MISSION_OVER");
    const last = over[over.length - 1];
    expect(last?.cmd === "GAME_MISSION_OVER" && last.isWin).toBe(true);
    expect(last?.cmd === "GAME_MISSION_OVER" && last.bossCardCount).toBe(2);
    const i = all.findIndex((e) => e.cmd === "GAME_ALL_MISSION_OVER");
    const tail = all.slice(i).map((e) => (e.cmd === "RAW" ? `RAW${e.code}` : e.cmd));
    expect(tail.filter((c) => c === "RAW98").length).toBe(4); // 2 players × 2 cards
    expect(tail.indexOf("RAW89")).toBeGreaterThan(tail.lastIndexOf("RAW98"));
    expect(tail[tail.length - 1]).toBe("PVE_STOPPED");
  });
});
