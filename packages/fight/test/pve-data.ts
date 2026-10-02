import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import type { MissionInfo, NpcInfo, PveData, PveInfo } from "../src/index.js";

const seed = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../db/seed/game");
function rows<T>(name: string): T[] {
  const j = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(seed, `${name}.json.gz`))).toString("utf8"));
  return (Array.isArray(j) ? j : j.rows) as T[];
}
export const npcs = new Map(rows<NpcInfo>("NPC_Info").map((n) => [n.ID, n]));
export const missions = new Map(rows<MissionInfo>("Mission_Info").map((m) => [m.Id, m]));
export const pves = new Map(rows<PveInfo>("Pve_Info").map((p) => [p.ID, p]));
export const data: PveData = { npc: (id) => npcs.get(id), mission: (id) => missions.get(id) };
