/**
 * Smoke-runs every Mission_Info script (and therefore the NPC brains it spawns) with two strong bot players and
 * writes src/pve/scripts/generated/smoke.json: per mission → finished / win / turns / script errors / missing
 * scripts / fallbacks. `pnpm --filter @ddt/fight pve-smoke [--only=1085,2001] [--minutes=20]`
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BotRunner, GameState, PveGame, type PlayerSpec, listScripts } from "../src/index.js";
import "../src/pve/scripts/index.js";
import { loadPackedAssets } from "../src/node.js";
import { data, missions, pves } from "../test/pve-data.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const only = arg("only")?.split(",").map(Number);
const minutes = Number(arg("minutes") ?? 20);
const assets = loadPackedAssets();
const spec = (userId: number): PlayerSpec => ({
  userId, nickname: `bot${userId}`, team: 1, grade: 30, attack: 900, defence: 600, agility: 600, lucky: 400, baseAttack: 900, baseDefence: 400, hp: 9000,
  weapon: { templateId: 7001, property8: 5 }, isBot: true,
});

interface Row { mission: number; script: string; origin: string; finished: boolean; win: boolean; turns: number; errors: number; firstError?: string; missing: string[]; mapPacked: boolean }
const rows: Row[] = [];
const origin = new Map(listScripts().map((s) => [s.name, s.origin]));
for (const m of missions.values()) {
  if (only && !only.includes(m.Id)) continue;
  const pveInfo = { ...pves.get(1)!, ID: 99999, SimpleGameScript: "GameServerScript.AI.Game.NewTrainingGame2", Name: "smoke" };
  const game = new PveGame({
    id: m.Id, roomType: 4, gameType: 7, timeType: 3, assets, players: [spec(1), spec(2)], seed: m.Id, pveInfo, hardLevel: 0,
    data: { npc: data.npc, mission: (id) => (id === 9999901 ? m : data.mission(id)) },
  });
  // run exactly this mission (the generic game control could not guess it)
  game.Misssions.clear();
  game.Misssions.set(1, m);
  game.TotalMissionCount = 1;
  const bots = new BotRunner(game, new Map([[1, { difficulty: 100 }], [2, { difficulty: 100 }]]), 7);
  let win = false, finished = false;
  for (let now = 0; now < minutes * 60_000; now += 40) {
    let ev;
    try {
      ev = [...game.update(now), ...bots.update(now)];
    } catch (e) {
      game.scriptErrors.push(`engine: ${(e as Error).message}`);
      break;
    }
    const o = ev.find((e) => e.cmd === "GAME_MISSION_OVER");
    if (o && o.cmd === "GAME_MISSION_OVER") {
      finished = true;
      win = o.isWin;
      break;
    }
    if (game.state === GameState.Stopped) break;
  }
  rows.push({
    mission: m.Id, script: m.Script, origin: origin.get(m.Script) ?? "missing", finished, win, turns: game.turnIndex, errors: game.scriptErrors.length,
    firstError: game.scriptErrors[0], missing: game.missingScripts.map((x) => `${x.kind}:${x.name}`), mapPacked: game.MapHistoryIds.length > 0,
  });
  process.stdout.write(`${m.Id} ${finished ? (win ? "WIN " : "lose") : "----"} t${game.turnIndex} err${game.scriptErrors.length} ${game.missingScripts.length ? "missing:" + game.missingScripts.map((x) => x.name.split(".").pop()).join(",") : ""}\n`);
}
const sum = {
  missions: rows.length, finished: rows.filter((r) => r.finished).length, wins: rows.filter((r) => r.win).length,
  clean: rows.filter((r) => r.finished && r.errors === 0 && r.missing.length === 0).length,
  withErrors: rows.filter((r) => r.errors > 0).length, withMissing: rows.filter((r) => r.missing.length > 0).length,
};
const out = path.join(here, "../src/pve/scripts/generated/smoke.json");
fs.writeFileSync(out, JSON.stringify({ minutes, ...sum, rows }, null, 1));
console.log(JSON.stringify(sum));
