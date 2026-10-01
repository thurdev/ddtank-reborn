import { describe, expect, it } from "vitest";
import { BotRunner, type FightEvent, GameState, PvpGame, type PlayerSpec, solveAim } from "../src/index.js";
import { loadPackedAssets } from "../src/node.js";

const assets = loadPackedAssets();
const spec = (userId: number, team: number, o: Partial<PlayerSpec> = {}): PlayerSpec => ({
  userId, nickname: `p${userId}`, team, grade: 20, attack: 300, defence: 200, agility: 300, lucky: 200, baseAttack: 250, baseDefence: 150, hp: 1500,
  weapon: { templateId: 7001, property8: 5 }, ...o,
});

function run(game: PvpGame, bots: BotRunner, until: (e: FightEvent[]) => boolean, maxMs = 3_600_000) {
  const all: FightEvent[] = [];
  for (let now = 0; now < maxMs; now += 40) {
    const ev = [...game.update(now), ...bots.update(now)];
    all.push(...ev);
    if (until(all)) return { all, now };
  }
  return { all, now: maxMs };
}

describe("PvP game loop", () => {
  it("loads, starts, alternates turns and ends with GAME_OVER (bot vs bot)", () => {
    const game = new PvpGame({ id: 1, roomType: 0, gameType: 0, timeType: 3, mapId: 1001, assets, players: [spec(1, 1, { isBot: true }), spec(2, 2, { isBot: true })], seed: 7 });
    const bots = new BotRunner(game, new Map([[1, { difficulty: 100 }], [2, { difficulty: 80 }]]), 3);
    const { all } = run(game, bots, (e) => e.some((x) => x.cmd === "GAME_OVER"));
    const cmds = all.map((e) => e.cmd);
    expect(cmds.slice(0, 2)).toEqual(["GAME_CREATE", "GAME_LOAD"]);
    expect(cmds).toContain("START_GAME");
    expect(cmds.filter((c) => c === "TURN").length).toBeGreaterThan(1);
    const fires = all.filter((e) => e.cmd === "FIRE");
    expect(fires.length).toBeGreaterThan(0);
    const over = all.find((e) => e.cmd === "GAME_OVER")!;
    expect(over.cmd === "GAME_OVER" && over.players.filter((p) => p.win).length).toBe(1);
    expect(over.cmd === "GAME_OVER" && over.players.every((p) => p.gpGained >= 1)).toBe(true);
    // turns go to the lowest delay; both players got turns
    const turnIds = new Set(all.filter((e) => e.cmd === "TURN").map((e) => e.livingId));
    expect(turnIds.size).toBe(2);
    // deterministic: same seed → same event stream
    const g2 = new PvpGame({ id: 1, roomType: 0, gameType: 0, timeType: 3, mapId: 1001, assets, players: [spec(1, 1, { isBot: true }), spec(2, 2, { isBot: true })], seed: 7 });
    const b2 = new BotRunner(g2, new Map([[1, { difficulty: 100 }], [2, { difficulty: 80 }]]), 3);
    const r2 = run(g2, b2, (e) => e.some((x) => x.cmd === "GAME_OVER"));
    expect(JSON.stringify(r2.all)).toBe(JSON.stringify(all));
  });

  it("human commands: fire with props, damage + death, skip, suicide ends game", () => {
    const game = new PvpGame({ id: 2, roomType: 1, gameType: 0, timeType: 2, mapId: 1001, assets, players: [spec(10, 1), spec(20, 2)], seed: 1 });
    let now = 0;
    const tick = (ms = 40) => {
      const ev: FightEvent[] = [];
      for (let t = 0; t < ms; t += 40) ev.push(...game.update((now += 40)));
      return ev;
    };
    tick(200);
    expect(game.state).toBe(GameState.Loading);
    game.handle(10, { cmd: "LOAD", progress: 100 }, now);
    game.handle(20, { cmd: "LOAD", progress: 100 }, now);
    const ev = tick(4000);
    const turn = ev.find((e) => e.cmd === "TURN")!;
    expect(turn).toBeDefined();
    const cur = game.findPlayer(turn.livingId)!;
    const other = game.players.find((p) => p !== cur)!;
    // +2 attacks and +50 % props, then aim exactly with the solver
    const p1 = game.handle(cur.spec.userId, { cmd: "PROP", bag: 2, place: 0, templateId: 10001 }, now);
    expect(p1.map((e) => e.cmd)).toEqual(["PROP", "ADDATTACK"]);
    expect(cur.shootCount).toBe(3);
    const sol = solveAim({ map: game.map, ball: cur.currentBall, from: cur, target: { x: other.x, y: other.y - 10 }, bodies: [{ id: other.id, x: other.x, y: other.y, team: other.team, bound: other.bound }] })!;
    expect(sol.miss).toBeLessThan(40);
    const before = other.blood;
    let fired: FightEvent[] = [];
    for (let i = 0; i < 3; i++) fired.push(...game.handle(cur.spec.userId, { cmd: "FIRE", x: sol.muzzle.x, y: sol.muzzle.y, force: sol.force, angle: sol.angle }, now));
    expect(fired.filter((e) => e.cmd === "FIRE").length).toBe(3);
    expect(cur.isAttacking).toBe(false);
    expect(other.blood).toBeLessThan(before);
    const kill = fired.flatMap((e) => (e.cmd === "FIRE" ? e.bombs.flatMap((b) => b.actions) : [])).find((a) => a.type === 5);
    expect(kill?.param1).toBe(other.id);
    expect(kill?.param2).toBeGreaterThan(0);
    // next turn → other player suicides → game over, first team wins
    fired = tick(15000);
    expect(fired.some((e) => e.cmd === "TURN")).toBe(true);
    const cur2 = game.currentLiving!;
    game.handle((cur2 as typeof cur).spec.userId, { cmd: "SUICIDE" }, now);
    const end = tick(1000);
    const over = end.find((e) => e.cmd === "GAME_OVER");
    expect(over).toBeDefined();
    expect(game.winTeam).toBe(cur2.team === 1 ? 2 : 1);
    tick(21000);
    expect(game.state).toBe(GameState.Stopped);
  });

  it("turn timeout stops an idle player", () => {
    const game = new PvpGame({ id: 3, roomType: 1, gameType: 0, timeType: 1, mapId: 1001, assets, players: [spec(1, 1), spec(2, 2)], seed: 2 });
    let now = 0;
    const turns: number[] = [];
    game.update(40);
    game.update(80);
    game.handle(1, { cmd: "LOAD", progress: 100 }, 80);
    game.handle(2, { cmd: "LOAD", progress: 100 }, 80);
    for (; now < 120_000; now += 40) for (const e of game.update(now)) if (e.cmd === "TURN") turns.push(now);
    expect(turns.length).toBeGreaterThanOrEqual(3);
    expect(turns[2] - turns[1]).toBeGreaterThanOrEqual(21_000);
  });
});
