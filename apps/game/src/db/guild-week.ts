/**
 * Persistência dos 2 sistemas semanais novos sem fonte C# (ver `research/qa/feature-designs.md`):
 * "Semana da Sociedade" (145 ACTIVITY_SYSTEM sub 7-13, `GuildMemberWeekPackageType`) e Sociedade › votar
 * candidato (129 CONSORTIA_CMD sub 25 POLL_CANDIDATE). `Week` é sempre `weekKey()` (segunda-feira UTC).
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { app, type Database } from "@ddt/db";

const GMWC = app.GuildMemberWeekContribution;
const VOTES = app.ConsortiaPollVotes;

export interface TopContributor { UserID: number; Total: number }

/** Soma `amount` à contribuição do jogador na semana atual (upsert). */
export async function addContribution(db: Database, consortiaId: number, userId: number, week: string, amount: number): Promise<number> {
  const rows = await db.insert(GMWC).values({ ConsortiaID: consortiaId, UserID: userId, Week: week, Total: amount })
    .onConflictDoUpdate({ target: [GMWC.UserID, GMWC.Week], set: { Total: sql`${GMWC.Total} + ${amount}` } })
    .returning({ Total: GMWC.Total });
  return rows[0]?.Total ?? amount;
}

/** Top N contribuidores do clã na semana (ranking do "livro de pontos"). */
export async function topContributors(db: Database, consortiaId: number, week: string, limit = 10): Promise<TopContributor[]> {
  return db.select({ UserID: GMWC.UserID, Total: GMWC.Total }).from(GMWC)
    .where(and(eq(GMWC.ConsortiaID, consortiaId), eq(GMWC.Week, week))).orderBy(desc(GMWC.Total)).limit(limit);
}

export async function myContribution(db: Database, consortiaId: number, userId: number, week: string): Promise<number> {
  const rows = await db.select({ Total: GMWC.Total }).from(GMWC).where(and(eq(GMWC.ConsortiaID, consortiaId), eq(GMWC.UserID, userId), eq(GMWC.Week, week))).limit(1);
  return rows[0]?.Total ?? 0;
}

/** Clãs com contribuição na semana (pra distribuir prêmio no reset semanal). */
export async function consortiaWithContributions(db: Database, week: string): Promise<number[]> {
  const rows = await db.selectDistinct({ ConsortiaID: GMWC.ConsortiaID }).from(GMWC).where(eq(GMWC.Week, week));
  return rows.map((r) => r.ConsortiaID);
}

/** Marca que o prêmio de fim de semana já foi dado pra esse membro (evita prêmio em dobro no reset). */
export async function markRewarded(db: Database, userId: number, week: string): Promise<void> {
  await db.update(GMWC).set({ RewardedWeek: week }).where(and(eq(GMWC.UserID, userId), eq(GMWC.Week, week)));
}

// ------------------------------------------------------------------ votar candidato (129/25 POLL_CANDIDATE)

/** 1 voto por membro por semana — upsert troca o voto. */
export async function castVote(db: Database, consortiaId: number, week: string, voterId: number, targetId: number): Promise<void> {
  await db.insert(VOTES).values({ ConsortiaID: consortiaId, Week: week, VoterID: voterId, TargetID: targetId, UpdatedAt: new Date() })
    .onConflictDoUpdate({ target: [VOTES.ConsortiaID, VOTES.Week, VOTES.VoterID], set: { TargetID: targetId, UpdatedAt: new Date() } });
}

export interface VoteTally { TargetID: number; Votes: number }

/** Apuração da semana, do mais votado pro menos. */
export async function voteTally(db: Database, consortiaId: number, week: string): Promise<VoteTally[]> {
  const rows = await db.select({ TargetID: VOTES.TargetID, Votes: sql<number>`count(*)::int` }).from(VOTES)
    .where(and(eq(VOTES.ConsortiaID, consortiaId), eq(VOTES.Week, week))).groupBy(VOTES.TargetID).orderBy(desc(sql`count(*)`));
  return rows;
}

export async function consortiaWithVotes(db: Database, week: string): Promise<number[]> {
  const rows = await db.selectDistinct({ ConsortiaID: VOTES.ConsortiaID }).from(VOTES).where(eq(VOTES.Week, week));
  return rows.map((r) => r.ConsortiaID);
}
