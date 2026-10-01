/** Ports of the PlayerBussiness procedures used by the login/register flow (research/db/Project_Player34/schema/procedures). */
import { sql, type SQL } from "drizzle-orm";
import type { DbHandle } from "@ddt/db";
import { q, q1 } from "../lib/db.js";
import { wallNow } from "../lib/flash-xml.js";
import type { Row } from "../lib/spec.js";

type Exec = Pick<DbHandle, "db">;

export const userById = (h: Exec, id: number) => q1(h as DbHandle, sql`SELECT * FROM app."V_Sys_Users_Detail" WHERE "UserID" = ${id}`);
export const userByNick = (h: Exec, nick: string) => q1(h as DbHandle, sql`SELECT * FROM app."V_Sys_Users_Detail" WHERE "NickName" = ${nick}`);
/** SP_Users_LoginList */
export const usersByName = (h: Exec, name: string) => q(h as DbHandle, sql`SELECT * FROM app."V_Sys_Users_Detail" WHERE "UserName" = ${name} ORDER BY "UserID"`);

/**
 * SP_Users_LoginWeb (+ PlayerBussiness.LoginGame): updates login counters of (UserName, NickName) and returns the
 * V_Sys_Users_Detail row with isFirst (decremented when > 1, like the C# caller).
 */
export async function loginGame(h: DbHandle, userName: string, nickName: string): Promise<{ player: Row; isFirst: number; isExist: boolean; forbidDate: Date | null } | null> {
  const cur = await q1(
    h,
    sql`SELECT "UserID","ForbidDate","IsExist","LastDate","LoginCount","LastDateSecond","LastDateThird","IsFirst","DayLoginCount"
        FROM player."Sys_Users_Detail" WHERE "UserName" = ${userName} AND "NickName" = ${nickName} ORDER BY "UserID" LIMIT 1`,
  );
  if (!cur) return null;
  const now = wallNow();
  let lastDate = cur.LastDate as Date | null;
  let lastDateSecond = cur.LastDateSecond as Date | null;
  const lastDateThird = cur.LastDateThird as Date | null;
  let loginCount = Number(cur.LoginCount ?? 0);
  let dayLoginCount = Number(cur.DayLoginCount ?? 0);
  let isFirst = Number(cur.IsFirst ?? 0);
  if (lastDate && lastDate.getUTCMonth() === now.getUTCMonth()) {
    if (lastDate.getUTCDate() !== now.getUTCDate()) {
      loginCount += 1;
      dayLoginCount = 0;
    } else {
      lastDate = lastDateSecond;
      lastDateSecond = lastDateThird;
    }
  } else {
    loginCount = 1;
    dayLoginCount = 0;
  }
  if (isFirst === 1) dayLoginCount = 1;
  if (isFirst > 0) isFirst += 1;
  const forbid = cur.ForbidDate as Date | null;
  const set = sql`"Password" = '', "LastDate" = ${now}, "LastDateSecond" = ${lastDate}, "LastDateThird" = ${lastDateSecond}, "LoginCount" = ${loginCount}, "IsFirst" = ${isFirst}, "DayLoginCount" = ${dayLoginCount}`;
  if (!cur.IsExist) {
    if (!forbid || forbid < now) await h.db.execute(sql`UPDATE player."Sys_Users_Detail" SET ${set}, "IsExist" = true WHERE "UserID" = ${cur.UserID}`);
  } else {
    await h.db.execute(sql`UPDATE player."Sys_Users_Detail" SET ${set} WHERE "UserID" = ${cur.UserID}`);
  }
  const player = await userById(h, Number(cur.UserID));
  if (!player) return null;
  let f = Number(player.IsFirst ?? 0);
  if (f > 1) f--;
  return { player, isFirst: f, isExist: !!player.IsExist, forbidDate: (player.ForbidDate as Date | null) ?? null };
}

/** SP_Users_Active (PlayerBussiness.ActivePlayer): creates the empty account row (NickName '', IsFirst 0) + fight/vip/texp/daily rows. */
export async function activePlayer(
  h: DbHandle,
  o: { userName: string; password: string; sex: boolean; ip: string; site: string },
): Promise<number | null> {
  const exists = await q1(h, sql`SELECT 1 AS x FROM player."Sys_Users_Detail" WHERE "UserName" = ${o.userName} LIMIT 1`);
  if (exists) return null;
  return h.db.transaction(async (tx) => {
    const now = wallNow();
    const ins = (await tx.execute(sql`INSERT INTO player."Sys_Users_Detail"
        ("UserName","Password","NickName","Date","IsConsortia","ConsortiaID","Sex","Win","Total","Escape","GP","Honor","Gold","Money","Style","Colors","Hide","LastDate","Grade","State","IsFirst","Repute","ActiveIP","IsExist","Skin","Site")
        VALUES (${o.userName}, ${o.password}, '', ${now}, false, 0, ${o.sex}, 0, 0, 0, 1, '', 0, 0, ',,,,,,,,', ',,,,,,,,', 1111111111, ${now}, 1, 0, 0, 0, ${o.ip}, true, '', ${o.site})
        RETURNING "UserID"`)) as unknown;
    const rows = Array.isArray(ins) ? ins : ((ins as { rows: Row[] }).rows ?? []);
    const id = Number((rows[0] as Row | undefined)?.UserID ?? 0);
    if (!id) throw new Error("SP_Users_Active: no identity");
    const exec = (s: SQL) => tx.execute(s);
    await exec(sql`INSERT INTO player."Sys_Users_Fight" ("UserID","Attack","Defence","Luck","Agility","Delay","Honor","Map","Directory","IsExist") VALUES (${id},0,0,0,0,0,'','','',true)`);
    await exec(sql`INSERT INTO player."Sys_VIP_Info" ("UserID") VALUES (${id}) ON CONFLICT DO NOTHING`);
    await exec(sql`INSERT INTO player."Sys_Users_Texp" ("UserID") VALUES (${id})`);
    await exec(sql`INSERT INTO player."DailyLogList" ("UserID") VALUES (${id})`);
    return id;
  });
}

/**
 * SP_Users_RegisterNotValidate (PlayerBussiness.RegisterPlayer): sets nickname/sex/style of the account row created
 * by SP_Users_Active, equips the default arm/hair/face/cloth/hat and the Bag_Init items. Returns 0 ok, 2 nick taken, 3 no row / already registered.
 */
export async function registerPlayer(
  h: DbHandle,
  o: { userName: string; nickName: string; sex: number; boy: number[]; girl: number[]; colors: { arm: string; hair: string; face: string; cloth: string; hat: string }; validDate: number },
): Promise<number> {
  if (await q1(h, sql`SELECT 1 AS x FROM player."Sys_Users_Detail" WHERE "NickName" = ${o.nickName} LIMIT 1`)) return 2;
  const u = await q1(h, sql`SELECT "UserID","IsFirst","Sex" FROM player."Sys_Users_Detail" WHERE "UserName" = ${o.userName} ORDER BY "UserID" LIMIT 1`);
  if (!u || Number(u.IsFirst ?? 1) > 0) return 3;
  let sex = o.sex;
  if (sex === -1) sex = u.Sex ? 1 : 0;
  const [arm, hair, face, cloth, hat] = sex !== 0 ? o.boy : o.girl;
  const tempSex = sex !== 0 ? 1 : 2;
  const userId = Number(u.UserID);
  const pics = new Map(
    (await q(h, sql`SELECT "TemplateID","Pic","Attack","Defence","Agility","Luck","CategoryID","MaxCount" FROM game."Shop_Goods" WHERE "TemplateID" IN (${sql.join([arm, hair, face, cloth, hat].map((x) => sql`${x ?? 0}`), sql`, `)})`)).map((r) => [Number(r.TemplateID), r]),
  );
  const pic = (id?: number) => String(pics.get(id ?? 0)?.Pic ?? "");
  const style = `,,${hair}|${pic(hair)},,${cloth}|${pic(cloth)},${face}|${pic(face)},${arm}|${pic(arm)},,,,`;
  const c = o.colors;
  const color = `,,${c.hair},,${c.cloth},${c.face},${c.arm},,,,`;
  const armRow = pics.get(arm ?? 0);
  if (!armRow || !Number(armRow.CategoryID)) return 1;
  return h.db.transaction(async (tx) => {
    const now = wallNow();
    const equip = async (tid: number | undefined, place: number, col: string) => {
      if (!tid) return;
      await tx.execute(sql`INSERT INTO player."Sys_Users_Goods" ("UserID","BagType","TemplateID","Place","Count","IsJudge","Color","IsExist","StrengthenLevel","AttackCompose","DefendCompose","LuckCompose","AgilityCompose","IsBinds","BeginDate","ValidDate","IsUsed")
        VALUES (${userId},0,${tid},${place},1,true,${col},true,0,0,0,0,0,true,${now},${o.validDate},true)`);
    };
    await equip(arm, 6, c.arm);
    await equip(hair, 2, c.hair);
    await equip(face, 5, c.face);
    await equip(cloth, 4, c.cloth);
    await equip(hat, 0, c.hat);
    // Bag_Init items: bag 0 from place 31, bag 1/2 from 0; split by MaxCount; skip place > 49
    const bag = (await tx.execute(sql`SELECT b.*, g."CategoryID" AS "Cat", g."MaxCount" AS "Max" FROM player."Bag_Init" b LEFT JOIN game."Shop_Goods" g ON g."TemplateID" = b."TemplateID"
        WHERE b."Sex" = 0 OR (b."Sex" = ${tempSex} AND g."CategoryID" IS NOT NULL)`)) as unknown;
    const bagRows = (Array.isArray(bag) ? bag : ((bag as { rows: Row[] }).rows ?? [])) as Row[];
    const next = [31, 0, 0];
    for (const b of bagRows) {
      const cat = Number(b.Cat ?? -999);
      const bagType = cat >= 1 && cat <= 9 ? 0 : cat === 10 || cat === 11 ? 1 : cat === 12 ? 2 : -1;
      let count = Number(b.Count ?? 0);
      const max = Math.max(1, Number(b.Max ?? 1));
      while (count > 0) {
        const n = Math.min(count, max);
        count -= n;
        const slot = bagType === 0 ? 0 : bagType === 1 ? 1 : 2;
        const place = next[slot]!++;
        if (place > 49) continue;
        await tx.execute(sql`INSERT INTO player."Sys_Users_Goods" ("UserID","BagType","TemplateID","Place","Count","IsJudge","Color","IsExist","StrengthenLevel","AttackCompose","DefendCompose","LuckCompose","AgilityCompose","IsBinds","BeginDate","ValidDate")
          VALUES (${userId},${bagType},${b.TemplateID as number},${place},${n},true,'',true,${(b.StrengthenLevel as number) ?? 0},${(b.AttackCompose as number) ?? 0},${(b.DefendCompose as number) ?? 0},${(b.LuckCompose as number) ?? 0},${(b.AgilityCompose as number) ?? 0},${!!b.IsBinds},${now},${(b.ValidDate as number) ?? 0})`);
      }
    }
    await tx.execute(sql`UPDATE player."Sys_Users_Detail" SET "NickName" = ${o.nickName}, "IsFirst" = 17, "Style" = ${style}, "Colors" = ${color}, "Sex" = ${sex !== 0} WHERE "UserID" = ${userId}`);
    await tx.execute(sql`UPDATE player."Sys_Users_Fight" SET "Attack" = ${Number(armRow.Attack ?? 0)}, "Defence" = ${Number(armRow.Defence ?? 0)}, "Agility" = ${Number(armRow.Agility ?? 0)}, "Luck" = ${Number(armRow.Luck ?? 0)} WHERE "UserID" = ${userId}`);
    return 0;
  });
}
