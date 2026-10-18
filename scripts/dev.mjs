#!/usr/bin/env node
// One-command local stack: real Postgres (embedded, no install) -> api -> game -> web + admin.
// Usage: pnpm dev:all            (Ctrl+C stops everything, including child process trees on Windows)
// ch-processo (vários canais): CHANNELS=5,6 (env) ou --channels 5,6 (CLI) sobe mais processos `apps/game`
// locais além do canal padrão (SERVER_ID 4), cada um em portas livres próprias — ver `channelsFromArgs()` e
// docs/GAME-SERVER.md "Canais". Não muda o comportamento padrão (sem CHANNELS = idêntico a antes desta tarefa)
// e nunca toca nas portas fixas do dono (3000/5173/5174/5432/8080/9200/9300/9400/7788/843): as portas extras
// são sempre escaneadas livres a partir de 9500+, pulando explicitamente essa lista mesmo que estejam livres
// no momento do scan.
import { spawn, execSync } from "node:child_process";
import net from "node:net";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/ddtank";
const env = { ...process.env, DATABASE_URL, TZ: "UTC" };
const children = [];
const colors = { db: 90, api: 36, game: 33, web: 35, admin: 32 };

function run(name, args, cwd = ".", envOverride = {}) {
  const child = spawn("pnpm", args, { cwd, env: { ...env, ...envOverride }, shell: true });
  const tag = `\x1b[${colors[name] ?? 34}m[${name}]\x1b[0m `;
  const pipe = (s) => s.on("data", (d) => process.stdout.write(d.toString().replace(/^(?=.)/gm, tag)));
  pipe(child.stdout);
  pipe(child.stderr);
  child.on("exit", (code) => console.log(`${tag}exited (${code})`));
  children.push(child);
  return child;
}

function portOpen(port, host = "127.0.0.1") {
  return new Promise((res) => {
    const s = net.connect(port, host, () => (s.destroy(), res(true)));
    s.on("error", () => res(false));
  });
}

/** Local channel (SERVER_ID 4, apps/game/.env.example default) — already started as `game` below; CHANNELS
 * entries equal to it are ignored (it's the one the task example "CHANNELS=4,5" means "4 is already running"). */
const LOCAL_SERVER_ID = 4;
/** Owner's fixed ports (never reused/killed by this script) + a few other well-known ones a dev stack might
 * have running — extra-channel ports are scanned starting above this, never INTO it even if momentarily free. */
const RESERVED_PORTS = new Set([22, 80, 443, 843, 3000, 5173, 5174, 5432, 8080, 9200, 9300, 9400, 7788]);

function channelsFromArgs() {
  const i = process.argv.indexOf("--channels");
  const cli = i !== -1 ? process.argv[i + 1] : undefined;
  const raw = cli ?? process.env.CHANNELS ?? "";
  const ids = raw.split(",").map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0);
  return [...new Set(ids)].filter((id) => id !== LOCAL_SERVER_ID);
}

/** First free port at/after `start`, skipping RESERVED_PORTS and `taken` (ports this same run already picked —
 * portOpen() alone can't tell those apart since nothing is listening on them yet at scan time). */
async function findFreePort(start, taken) {
  for (let p = start; p < start + 1000; p++) {
    if (RESERVED_PORTS.has(p) || taken.has(p)) continue;
    if (!(await portOpen(p))) {
      taken.add(p);
      return p;
    }
  }
  throw new Error(`no free port found starting at ${start}`);
}

async function waitPort(port, label, ms = 120_000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await portOpen(port)) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${label} did not open port ${port}`);
}

function stopAll() {
  for (const c of children) {
    try {
      if (process.platform === "win32") execSync(`taskkill /PID ${c.pid} /T /F`, { stdio: "ignore" });
      else c.kill("SIGTERM");
    } catch {}
  }
  process.exit(0);
}
process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);

for (const [port, what] of [[5432, "Postgres"], [8080, "api"], [9200, "game"]]) {
  if (await portOpen(port)) {
    console.error(`Port ${port} (${what}) is already in use — stop the old process first (bash scripts/free-ports.sh).`);
    process.exit(1);
  }
}

const db = run("db", ["--filter", "@ddt/db", "db:pg"]);
// db:pg migrates (and seeds a fresh cluster) before printing "Postgres ready" � start the apps only after that.
await new Promise((resolve, reject) => {
  const onData = (d) => d.toString().includes("Postgres ready") && resolve();
  db.stdout.on("data", onData);
  db.on("exit", () => reject(new Error("Postgres exited before becoming ready")));
});
run("api", ["--filter", "@ddt/api", "dev"]);
run("game", ["--filter", "@ddt/game", "dev"]);
await waitPort(8080, "api");
run("web", ["--filter", "web", "dev"]);
run("admin", ["--filter", "admin", "dev"]);

// ch-processo: extra local channels (CHANNELS=5,6 / --channels 5,6), each its own `apps/game` dev process on
// its own free ports. Each channel needs a matching player."Server_List" row (Admin -> Canais, same as
// production) to get its real Room/Total/ZoneId/ZoneName -- without one it still boots (templates.server stays
// null, falls back to cfg defaults), just not fully configured.
const extraChannels = channelsFromArgs();
const extraInfo = [];
const takenPorts = new Set();
for (const [i, id] of extraChannels.entries()) {
  const gamePort = await findFreePort(9500 + i * 10, takenPorts);
  const wsPort = await findFreePort(9600 + i * 10, takenPorts);
  const adminPort = await findFreePort(9700 + i * 10, takenPorts);
  const name = `game${id}`;
  colors[name] = 34 + (i % 4);
  run(name, ["--filter", "@ddt/game", "dev"], ".", {
    SERVER_ID: String(id),
    GAME_PORT: String(gamePort),
    WS_PORT: String(wsPort),
    ADMIN_PORT: String(adminPort),
    // Só o canal local (SERVER_ID 4) responde o crossdomain policy em 843 -- o conteúdo é genérico, não
    // depende de canal, e várias instâncias não podem bindar a mesma porta no mesmo host.
    POLICY_ENABLED: "false",
  });
  extraInfo.push(`Canal ${id} tcp ${gamePort} / ws ${wsPort} / admin ${adminPort}`);
}

console.log(
  `\nSite  http://localhost:5173  (test/test)\nAdmin http://localhost:5174  (admin/admin)\nAPI   http://localhost:8080\nGame  tcp 9200 / ws 9300` +
    (extraInfo.length ? `\n${extraInfo.join("\n")}` : "") +
    "\n",
);
