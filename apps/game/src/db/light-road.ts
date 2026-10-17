/**
 * Persistência do "Caminho da Luz" (145 ACTIVITY_SYSTEM sub 64-66, `LightRoadPackageType`) — design novo
 * sem fonte C# (ver `research/qa/feature-designs.md`). `Week` é sempre `weekKey()` (segunda-feira UTC);
 * trocar de semana começa um tabuleiro novo automaticamente (não precisa de cron de reset).
 */
import { and, eq } from "drizzle-orm";
import { app, type Database } from "@ddt/db";

const LR = app.LightRoadProgress;

export interface LightRoadRow { Bits: number; PicksToday: number; DayKey: string }

export async function loadProgress(db: Database, userId: number, week: string): Promise<LightRoadRow> {
  const rows = await db.select({ Bits: LR.Bits, PicksToday: LR.PicksToday, DayKey: LR.DayKey }).from(LR)
    .where(and(eq(LR.UserID, userId), eq(LR.Week, week))).limit(1);
  return rows[0] ?? { Bits: 0, PicksToday: 0, DayKey: "" };
}

/** Upsert do estado após escolher um espaço (ou zerar `PicksToday` quando o dia virou). */
export async function saveProgress(db: Database, userId: number, week: string, row: LightRoadRow): Promise<void> {
  await db.insert(LR).values({ UserID: userId, Week: week, Bits: row.Bits, PicksToday: row.PicksToday, DayKey: row.DayKey })
    .onConflictDoUpdate({ target: [LR.UserID, LR.Week], set: { Bits: row.Bits, PicksToday: row.PicksToday, DayKey: row.DayKey } });
}
