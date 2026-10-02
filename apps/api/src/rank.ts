/**
 * Ranking refresh — port of PlayerBussiness.UpdateRank (PlayerBussiness.cs:7439, called by RankMgr every hour) which ran
 * SP_Sys_Update_Consortia_DayList / _FightPower / _Honor / _List / _WeekList, SP_Sys_Update_OfferList,
 * SP_Sys_Update_Users_DayList / _List / _WeekList, SP_Sys_Update_Users_Rank_Date (research/db/Project_Player34/schema/procedures).
 *
 * Deliberate deviations (the originals overwrote the snapshots on every hourly run, so "day"/"week" meant "last hour"):
 *  - LastDayGP/LastDayOffer and Consortia LastDayRiches/LastDayHonor are snapshotted once per UTC day (claim
 *    app."EventClaims" kind rank_day); LastWeek* once per ISO week (kind rank_week) — the game's weekly_reset event also
 *    snapshots them. Add* = current − snapshot on every run.
 *  - Consortia Honor is not overwritten with Σ member Offer (SP_Sys_Update_Consortia_Honor) — GvG honor would be lost.
 *  - Sys_Users_Rank_Date Prev* columns keep the previous run's position (the proc wrote the same value to both).
 */
import { sql } from "drizzle-orm";
import type { DbHandle } from "@ddt/db";
import { q } from "./lib/db.js";

const TOTAL_RICHES = sql.raw(`(c."Riches"
  + COALESCE((SELECT sum(l."Riches") FROM game."Consortia_Level" l WHERE l."Level" <= c."Level"), 0)
  + COALESCE((SELECT sum(l."StoreRiches") FROM game."Consortia_Level" l WHERE l."Level" <= c."StoreLevel"), 0)
  + COALESCE((SELECT sum(l."SmithRiches") FROM game."Consortia_Level" l WHERE l."Level" <= c."SmithLevel"), 0)
  + COALESCE((SELECT sum(l."ShopRiches") FROM game."Consortia_Level" l WHERE l."Level" <= c."ShopLevel"), 0))`);

export const dayKey = (d: Date) => d.toISOString().slice(0, 10);
export function weekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / 86_400_000 + 1) / 7);
  return `${y}-W${String(w).padStart(2, "0")}`;
}

async function claim(h: DbHandle, kind: string, key: string): Promise<boolean> {
  const rows = await q(h, sql`INSERT INTO app."EventClaims" ("UserID","Kind","Key") VALUES (0, ${kind}, ${key}) ON CONFLICT DO NOTHING RETURNING "UserID"`);
  return rows.length > 0;
}

export interface RankRun { daySnapshot: boolean; weekSnapshot: boolean }

export async function updateRank(h: DbHandle, now = new Date()): Promise<RankRun> {
  const db = h.db;
  const daySnapshot = await claim(h, "rank_day", dayKey(now));
  const weekSnapshot = await claim(h, "rank_week", weekKey(now));
  if (daySnapshot) {
    await db.execute(sql`UPDATE player."Sys_Users_Detail" SET "LastDayGP" = "GP", "LastDayOffer" = "Offer" WHERE "IsExist" = true`);
    await db.execute(sql`UPDATE player."Consortia" c SET "LastDayRiches" = ${TOTAL_RICHES}, "LastDayHonor" = c."Honor" WHERE c."IsExist" = true`);
  }
  if (weekSnapshot) {
    await db.execute(sql`UPDATE player."Sys_Users_Detail" SET "LastWeekGP" = "GP", "LastWeekOffer" = "Offer"`);
    await db.execute(sql`UPDATE player."Consortia" c SET "LastWeekRiches" = ${TOTAL_RICHES}, "LastWeekHonor" = c."Honor"`);
  }
  // SP_Sys_Update_Users_DayList (Add* only)
  await db.execute(sql`UPDATE player."Sys_Users_Detail" SET "AddDayGP" = GREATEST("GP" - "LastDayGP", 0), "AddWeekGP" = GREATEST("GP" - "LastWeekGP", 0),
    "AddDayOffer" = GREATEST("Offer" - "LastDayOffer", 0), "AddWeekOffer" = GREATEST("Offer" - "LastWeekOffer", 0) WHERE "IsExist" = true`);
  // SP_Sys_Update_Consortia_DayList (Add* only) + _FightPower
  await db.execute(sql`UPDATE player."Consortia" c SET "AddDayRiches" = GREATEST(${TOTAL_RICHES} - c."LastDayRiches", 0), "AddWeekRiches" = GREATEST(${TOTAL_RICHES} - c."LastWeekRiches", 0),
    "AddDayHonor" = GREATEST(c."Honor" - c."LastDayHonor", 0), "AddWeekHonor" = GREATEST(c."Honor" - c."LastWeekHonor", 0) WHERE c."IsExist" = true`);
  await db.execute(sql`UPDATE player."Consortia" c SET "FightPower" = COALESCE((SELECT sum(d."FightPower") FROM player."Sys_Users_Detail" d WHERE d."ConsortiaID" = c."ConsortiaID" AND d."IsExist" = true), 0) WHERE c."IsExist" = true`);
  // SP_Sys_Update_Consortia_List: Repute = position by LastDayRiches
  await db.execute(sql`UPDATE player."Consortia" c SET "Repute" = r.n FROM (SELECT "ConsortiaID", row_number() OVER (ORDER BY "LastDayRiches" DESC, "ConsortiaID") AS n FROM player."Consortia" WHERE "IsExist" = true) r WHERE r."ConsortiaID" = c."ConsortiaID"`);
  // SP_Sys_Update_Users_List + SP_Sys_Update_OfferList: Sys_Users_Order positions by GP / ReputeOffer
  await db.execute(sql`INSERT INTO player."Sys_Users_Order" ("UserID", "Repute", "ReputeOffer")
    SELECT "UserID", row_number() OVER (ORDER BY "GP" DESC, "UserID"), row_number() OVER (ORDER BY "ReputeOffer" DESC, "UserID") FROM player."Sys_Users_Detail"
    ON CONFLICT ("UserID") DO UPDATE SET "Repute" = EXCLUDED."Repute", "ReputeOffer" = EXCLUDED."ReputeOffer"`);
  // SP_Sys_Update_Users_Rank_Date (heap table: rewrite it)
  const old = new Map((await q(h, sql`SELECT * FROM player."Sys_Users_Rank_Date"`)).map((r) => [Number(r.UserID), r]));
  const users = await q(h, sql`SELECT "UserID", "ConsortiaID",
      row_number() OVER (ORDER BY "FightPower" DESC, "UserID") AS fp, row_number() OVER (ORDER BY "GP" DESC, "UserID") AS gp,
      row_number() OVER (ORDER BY "AchievementPoint" DESC, "UserID") AS ach, row_number() OVER (ORDER BY "charmGP" DESC, "UserID") AS charm
    FROM player."Sys_Users_Detail" WHERE "IsExist" = true`);
  const cons = await q(h, sql`SELECT "ChairmanID",
      row_number() OVER (ORDER BY ${TOTAL_RICHES} DESC, c."ConsortiaID") AS riches, row_number() OVER (ORDER BY c."FightPower" DESC, c."ConsortiaID") AS fp,
      row_number() OVER (ORDER BY c."Level" DESC, c."ConsortiaID") AS lvl
    FROM player."Consortia" c WHERE c."IsExist" = true`);
  const byChair = new Map(cons.map((c) => [Number(c.ChairmanID), c]));
  await db.execute(sql`DELETE FROM player."Sys_Users_Rank_Date"`);
  const rows = users.map((u) => {
    const id = Number(u.UserID);
    const o = old.get(id);
    const c = byChair.get(id);
    const prev = (k: string, d: number) => (o && Number(o[k]) ? Number(o[k]) : d);
    return sql`(${id}, ${Number(u.ConsortiaID) || 0}, ${Number(u.fp)}, ${prev("FightPower", Number(u.fp))}, ${Number(u.gp)}, ${prev("GP", Number(u.gp))},
      ${Number(u.ach)}, ${prev("AchievementPoint", Number(u.ach))}, ${Number(u.charm)}, ${prev("charmGP", Number(u.charm))},
      ${c ? Number(c.fp) : 0}, ${c ? prev("ConsortiaFightPower", Number(c.fp)) : 0}, ${c ? Number(c.lvl) : 0}, ${c ? prev("ConsortiaLevel", Number(c.lvl)) : 0},
      ${c ? Number(c.riches) : 0}, ${c ? prev("ConsortiaRiches", Number(c.riches)) : 0})`;
  });
  for (let i = 0; i < rows.length; i += 500)
    await db.execute(sql`INSERT INTO player."Sys_Users_Rank_Date" ("UserID","ConsortiaID","FightPower","PrevFightPower","GP","PrevGP","AchievementPoint","PrevAchievementPoint","charmGP","PrecharmGP",
      "ConsortiaFightPower","ConsortiaPrevFightPower","ConsortiaLevel","ConsortiaPrevLevel","ConsortiaRiches","ConsortiaPrevRiches") VALUES ${sql.join(rows.slice(i, i + 500), sql`, `)}`);
  return { daySnapshot, weekSnapshot };
}
