#!/usr/bin/env node
// One-command local stack: real Postgres (embedded, no install) -> api -> game -> web + admin.
// Usage: pnpm dev:all            (Ctrl+C stops everything, including child process trees on Windows)
import { spawn, execSync } from "node:child_process";
import net from "node:net";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/ddtank";
const env = { ...process.env, DATABASE_URL };
const children = [];
const colors = { db: 90, api: 36, game: 33, web: 35, admin: 32 };

function run(name, args, cwd = ".") {
  const child = spawn("pnpm", args, { cwd, env, shell: true });
  const tag = `\x1b[${colors[name] ?? 37}m[${name}]\x1b[0m `;
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
    console.error(`Port ${port} (${what}) is already in use â€” stop the old process first (bash scripts/free-ports.sh).`);
    process.exit(1);
  }
}

const db = run("db", ["--filter", "@ddt/db", "db:pg"]);
// db:pg migrates (and seeds a fresh cluster) before printing "Postgres ready" — start the apps only after that.
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
console.log("\nSite  http://localhost:5173  (test/test)\nAdmin http://localhost:5174  (admin/admin)\nAPI   http://localhost:8080\nGame  tcp 9200 / ws 9300\n");
