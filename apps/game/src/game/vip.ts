/**
 * VIP state (GamePlayer.OpenVIP / ContinuousVIP / SetTypeVIP / AddExpVip / canUpLv / GetVIPNextLevelDaysNeeded,
 * GamePlayer.cs:1270-1990, 3709-3770) + SP_VIPRenewal_Single (expire day arithmetic). Pure: callers persist.
 */
import type { PlayerInfo } from "./player-info.js";

type VipFields = Pick<PlayerInfo, "typeVIP" | "VIPLevel" | "VIPExp" | "VIPExpireDay" | "VIPLastDate" | "VIPNextLevelDaysNeeded" | "CanTakeVipReward" | "LastVIPPackTime">;

/** Server_Config VIPExpForEachLv (default "1|300|700|1400|2500|4100|6100|8500|11300"). */
export function vipExpTable(raw: string | undefined): number[] {
  const v = (raw || "1|300|700|1400|2500|4100|6100|8500|11300").split("|").map((s) => Number(s) || 0);
  while (v.length < 9) v.push(v[v.length - 1] ?? 0);
  return v;
}

/** GamePlayer.SetTypeVIP: 2 when already 2 or days / 31 >= 3 (integer division), else 1. */
export function setTypeVIP(current: number, days: number): number {
  return current === 2 || Math.trunc(days / 31) >= 3 ? 2 : 1;
}

/** SP_VIPRenewal_Single: expire = (expired ? now : expire) + days. */
export function renewalExpire(expire: Date, days: number, now: Date): Date {
  const base = expire.getTime() <= now.getTime() ? now.getTime() : expire.getTime();
  return new Date(base + days * 86_400_000);
}

/** True while the VIP is active (typeVIP > 0 and not expired). */
export function isVipActive(c: Pick<PlayerInfo, "typeVIP" | "VIPExpireDay">, now = new Date()): boolean {
  return c.typeVIP > 0 && c.VIPExpireDay.getTime() > now.getTime();
}

/** GamePlayer.canUpLv / AddExpVip: VIP level 0..9 from VIPExp. Returns the levels gained. */
export function addExpVip(c: VipFields, value: number, table: number[]): number {
  const before = c.VIPLevel;
  c.VIPExp += value;
  for (let i = 0; i < table.length; i++) {
    if (c.VIPLevel >= 9) {
      c.VIPExp = table[8]!;
      break;
    }
    if (c.VIPExp >= table[c.VIPLevel]!) c.VIPLevel++;
  }
  return c.VIPLevel - before;
}

/** GamePlayer.GetVIPNextLevelDaysNeeded: (next threshold − exp) / (2 × VIP card AValue1 / AUnit). */
export function vipNextLevelDays(c: VipFields, table: number[], card: { AValue1: number; AUnit: number } | undefined): number {
  if (c.VIPLevel === 0 || c.VIPExp <= 0 || c.VIPLevel > 8 || !card || card.AUnit <= 0) return 0;
  const perDay = Math.trunc(card.AValue1 / card.AUnit) * 2;
  if (perDay <= 0) return 0;
  const r = (table[c.VIPLevel]! - c.VIPExp) / perDay;
  return Math.ceil(r > 0 ? r : 0);
}

/**
 * CardUseHandler case 23 / OpenVipHandler: VIPRenewal + OpenVIP(days, expire) or ContinuousVIP. Deviation: the card path
 * of the original keeps VIPLevel 0 on a first activation (only 92 levels up through AddExpVip); the client shows "VIP 0",
 * so a first activation starts at level 1 like GamePlayer.OpenVIP(days).
 */
export function applyVipDays(c: VipFields, days: number, now: Date): { opened: boolean } {
  const type = setTypeVIP(c.typeVIP, days);
  const active = c.typeVIP > 0 && c.VIPExpireDay.getTime() > now.getTime();
  c.VIPExpireDay = renewalExpire(active ? c.VIPExpireDay : now, days, now);
  c.LastVIPPackTime = now;
  c.CanTakeVipReward = true;
  const opened = c.typeVIP === 0;
  c.typeVIP = type;
  if (opened) {
    c.VIPLastDate = now;
    c.VIPNextLevelDaysNeeded = 10;
    if (c.VIPLevel < 1) c.VIPLevel = 1;
  }
  return { opened };
}

/** OpenVipHandler.TotalPrice: price of `days` from the VIP card shop entry (11992) units A/B/C, else prorated on A. */
export function vipPrice(s: { AUnit: number; AValue1: number; BUnit: number; BValue1: number; CUnit: number; CValue1: number } | undefined, days: number): number {
  if (!s) return -1;
  if (days === s.AUnit) return s.AValue1;
  if (days === s.BUnit) return s.BValue1;
  if (days === s.CUnit) return s.CValue1;
  return s.AUnit > 0 ? Math.ceil((s.AValue1 * days) / s.AUnit) : -1;
}

/** GamePlayer.ChecVipkExpireDay (login): an expired VIP drops to typeVIP 0 (level/exp kept). */
export function checkVipExpire(c: VipFields, now: Date): void {
  if (c.typeVIP > 0 && c.VIPExpireDay.getTime() <= now.getTime()) {
    c.CanTakeVipReward = false;
    c.typeVIP = 0;
  } else if (c.typeVIP > 0 && c.LastVIPPackTime.toISOString().slice(0, 10) < now.toISOString().slice(0, 10)) {
    c.CanTakeVipReward = true; // IsLastVIPPackTime: a new day → the daily VIP box can be taken again
  }
}
