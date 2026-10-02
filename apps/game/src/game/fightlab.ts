/**
 * Fight lab ("Phòng tập", room type 5 / game type 8, Pve_Info 1000-1004, missions 101-125).
 * Permission string = GamePlayer.m_fightlabpermissions (50 chars, 2 per copy: [max unlocked level char, rewarded level char]),
 * level chars '0'..'3' = locked / Simple / Normal / Hard unlocked (fightlabpermissionChars, GamePlayer.cs:399).
 */
import type { DropItem } from "@ddt/fight";

const CH = ["0", "1", "2", "3"] as const;

/** GamePlayer.InitFightLabPermission (GamePlayer.cs:3093): "1" + 49 × "0". */
export const initFightLabPermission = (): string => "1" + "0".repeat(49);

/** Pve_Info id 1000..1004 → copy slot 5..9 (GamePlayer.SetFightLabPermission switch). */
export function fightLabCopy(pveId: number): number {
  return pveId >= 1000 && pveId <= 1004 ? pveId - 995 : pveId;
}

/**
 * GamePlayer.IsFightLabPermission (GamePlayer.cs:3216). Fixed: the original compared the raw Pve_Info id (1000+) with the
 * string length, so it always answered true; we map it like SetFightLabPermission does.
 */
export function isFightLabPermission(perm: string, pveId: number, hardLevel: number): boolean {
  const p = perm || initFightLabPermission();
  const copy = fightLabCopy(pveId);
  if (copy > p.length || copy <= 0) return true;
  const idx = (copy - 5) * 2;
  if (idx < 0) return true;
  return (p[idx] ?? "0") >= (CH[hardLevel + 1] ?? "4");
}

/**
 * GamePlayer.SetFightLabPermission (GamePlayer.cs:3110-3213) without the side effects: returns the new string and whether
 * the first-clear reward (DropInventory.FightLabUserDrop) is due.
 */
export function setFightLabPermission(perm: string, pveId: number, hardLevel: number): { perm: string; reward: boolean } {
  const a = (perm || initFightLabPermission()).padEnd(10, "0").split("");
  const copy = fightLabCopy(pveId);
  if (copy > a.length || copy <= 0) return { perm: a.join(""), reward: false };
  const num = (copy - 5) * 2;
  if (num < 0 || a[num] !== CH[hardLevel + 1]) return { perm: a.join(""), reward: false };
  let reward = false;
  if (a[num + 1]! <= "2" && a[num]!.charCodeAt(0) - a[num + 1]!.charCodeAt(0) === 1) {
    a[num + 1] = a[num]!;
    reward = true;
  }
  if (copy === 5 && hardLevel === 1) for (const i of [2, 4, 6]) if (a[i] === "0") a[i] = "1";
  if ((copy === 7 || copy === 8) && hardLevel === 2 && a[8] === "0") a[8] = "1";
  if (hardLevel < 2 && a[num]! < CH[hardLevel + 2]!) a[num] = CH[hardLevel + 2]!;
  return { perm: a.join(""), reward };
}

export interface DropTables {
  findDropCondition(type: number, para1: string, para2: string): number;
  dropItems: Map<number, { ItemId: number; BeginData: number; EndData: number; IsBind: boolean; ValueDate: number }[]>;
}

/** DropInventory.FightLabUserDrop (DropInventory.cs:477): EVERY row of the eDropType.FightLab (14) drop, count Next(begin, end). */
export function fightLabDrop(t: DropTables, missionId: number, rnd = Math.random): DropItem[] {
  const id = t.findDropCondition(14, String(missionId), "1");
  if (!id) return [];
  return (t.dropItems.get(id) ?? []).map((d) => {
    const lo = Math.min(d.BeginData, d.EndData);
    const hi = Math.max(d.BeginData, d.EndData);
    return { templateId: d.ItemId, count: Math.max(1, hi > lo ? lo + Math.floor(rnd() * (hi - lo)) : lo), isBind: d.IsBind, validDate: d.ValueDate } as DropItem;
  });
}
