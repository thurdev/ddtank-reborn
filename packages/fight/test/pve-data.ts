import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import type { DropItem, MissionInfo, NpcInfo, PveData, PveDrops, PveInfo } from "../src/index.js";

const seed = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../db/seed/game");
function rows<T>(name: string): T[] {
  const j = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(seed, `${name}.json.gz`))).toString("utf8"));
  return (Array.isArray(j) ? j : j.rows) as T[];
}
export const npcs = new Map(rows<NpcInfo>("NPC_Info").map((n) => [n.ID, n]));
export const missions = new Map(rows<MissionInfo>("Mission_Info").map((m) => [m.Id, m]));
export const pves = new Map(rows<PveInfo>("Pve_Info").map((p) => [p.ID, p]));
export const data: PveData = { npc: (id) => npcs.get(id), mission: (id) => missions.get(id) };

/**
 * Real `game."Drop_Condiction"` / `game."Drop_Item"` seed rows (task `pve-cartas`), same tables
 * `apps/game/src/db/templates.ts` `findDropCondition`/`dropOne`/`pveDrop` reads from Postgres at runtime —
 * ported here read-only so PvE tests can exercise the REAL card-reward data instead of the constant stub
 * (`drops: { copyDrop: () => [{ templateId: 11020, count: 1 }] }`) used by `pve.test.ts`/`pve-cards.test.ts`
 * for unrelated assertions. A stub never reproduces a missing-drop-row bug, which is exactly why the
 * `pve-cadeia` fix (Mission_Info row 1073) shipped without anyone noticing 1073's card was still empty.
 */
interface DropCondictionRow { DropID: number; CondictionType: number; Para1: string; Para2: string }
interface DropItemRow { Id: number; DropId: number; ItemId: number; ValueDate: number; IsBind: boolean; Random: number; BeginData: number; EndData: number; IsTips: boolean; IsLogs: boolean }
export const dropConditions = rows<DropCondictionRow>("Drop_Condiction");
const dropItemsByDrop = new Map<number, DropItemRow[]>();
for (const it of rows<DropItemRow>("Drop_Item")) {
  const list = dropItemsByDrop.get(it.DropId);
  if (list) list.push(it);
  else dropItemsByDrop.set(it.DropId, [it]);
}
export const dropItems = dropItemsByDrop;

/** DropMgr.FindCondiction (Bussiness/Managers/DropMgr.cs:22): first condition whose comma-wrapped Para1/Para2 contain the given values. */
export function findDropCondition(type: number, para1: string | number, para2: string | number): number {
  const a = `,${para1},`;
  const b = `,${para2},`;
  return dropConditions.find((c) => c.CondictionType === type && c.Para1.includes(a) && c.Para2.includes(b))?.DropID ?? 0;
}

/** DropInventory.GetDropItems (Game.Logic/DropInventory.cs:271): one row among those with Random >= rnd(max Random), deterministic rnd for tests. */
export function dropOne(dropId: number, rnd: () => number = Math.random): DropItem | null {
  const list = dropItemsByDrop.get(dropId);
  if (!list?.length) return null;
  const max = Math.max(...list.map((d) => d.Random));
  const round = Math.floor(rnd() * max);
  const src = list.filter((d) => d.Random >= round);
  if (!src.length) return null;
  const d = src[Math.floor(rnd() * src.length)]!;
  const lo = Math.min(d.BeginData, d.EndData);
  const hi = Math.max(d.BeginData, d.EndData);
  return { templateId: d.ItemId, count: Math.max(1, lo + Math.floor(rnd() * (hi - lo))), isBind: d.IsBind, validDate: d.ValueDate };
}

/** PveDrops backed by the real seed tables (eDropType.Copy = 5, NPC = 3) — see module doc above. */
export const realDrops: PveDrops = {
  copyDrop: (missionId, user) => {
    const dropId = findDropCondition(5, missionId, user);
    if (!dropId) return null;
    const d = dropOne(dropId);
    return d ? [d] : null;
  },
  npcDrop: (dropId) => {
    const d = dropOne(dropId);
    return d ? [d] : null;
  },
};
