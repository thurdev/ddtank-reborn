import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadConfig } from "./config.js";
import { GameServer } from "./server.js";

process.env.TZ ??= "UTC"; // DB timestamps are wall-clock values read as UTC (packages/db README)

const envFile = resolve(process.cwd(), ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);
const cfg = loadConfig();
const server = await new GameServer(cfg).start();

let stopping = false;
const shutdown = async (sig: string) => {
  if (stopping) return;
  stopping = true;
  console.log(`${sig}: saving players and stopping...`);
  await server.stop().catch((e) => console.error(e));
  process.exit(0);
};
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
