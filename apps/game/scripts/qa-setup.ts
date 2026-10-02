/**
 * QA helper (dev DB only): `tsx scripts/qa-setup.ts <nick> save|restore|give <tpl:count,...>|grade <n>|sql "<query>"`.
 * `save` snapshots Grade/GP/Money/VIP of the character to scripts/.qa-<nick>.json; `restore` writes them back and removes
 * items given by `give` (ItemIDs recorded in the snapshot).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { sql } from "drizzle-orm";
import { createDb } from "@ddt/db";

const [nick, cmd, arg] = process.argv.slice(2);
const db = (await createDb(process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/ddtank")).db;
const file = new URL(`./.qa-${nick}.json`, import.meta.url);
type Rows = Record<string, unknown>[];
const q = async (s: string): Promise<unknown> => db.execute(sql.raw(s));
const rows = (r: unknown): Rows => (Array.isArray(r) ? (r as Rows) : ((r as { rows?: Rows }).rows ?? []));
const [u] = rows(await q(`select "UserID","Grade","GP","Money" from player."Sys_Users_Detail" where "NickName"='${nick}'`));
if (!u) throw new Error("no such nick");
const id = u.UserID as number;
const snap = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
if (cmd === "save") {
  const [v] = rows(await q(`select * from player."Sys_VIP_Info" where "UserID"=${id}`));
  writeFileSync(file, JSON.stringify({ ...u, vip: v ?? null, items: [], pets: [], cards: [] }, null, 1));
  console.log("saved", u);
} else if (cmd === "grade") {
  const [lv] = rows(await q(`select "GP" from game."LevelInfo" where "Grade"=${Number(arg)}`));
  await q(`update player."Sys_Users_Detail" set "Grade"=${Number(arg)}, "GP"=${lv?.GP ?? 0}, "Money"=greatest("Money",100000) where "UserID"=${id}`);
  console.log("grade", arg);
} else if (cmd === "give") {
  for (const part of (arg ?? "").split(",")) {
    const [tpl, cnt, bag] = part.split(":").map(Number);
    const [t] = rows(await q(`select "CategoryID" from game."Shop_Goods" where "TemplateID"=${tpl}`));
    const bagType = bag ?? ([10, 11, 12, 20, 26, 34, 35, 53].includes(t?.CategoryID as number) ? 1 : 0);
    const used = rows(await q(`select "Place" from player."Sys_Users_Goods" where "UserID"=${id} and "BagType"=${bagType} and "IsExist"`)).map((r) => r.Place as number);
    let place = bagType === 0 ? 31 : 0;
    while (used.includes(place)) place++;
    const [r] = rows(await q(`insert into player."Sys_Users_Goods" ("UserID","BagType","TemplateID","Place","Count","IsBinds","BeginDate","ValidDate","IsExist") values (${id},${bagType},${tpl},${place},${cnt || 1},true,now(),0,true) returning "ItemID"`));
    snap?.items.push(r!.ItemID);
    console.log("gave", tpl, "x", cnt, "bag", bagType, "place", place);
  }
  if (snap) writeFileSync(file, JSON.stringify(snap, null, 1));
} else if (cmd === "restore") {
  if (!snap) throw new Error("no snapshot");
  await q(`update player."Sys_Users_Detail" set "Grade"=${snap.Grade}, "GP"=${snap.GP}, "Money"=${snap.Money} where "UserID"=${id}`);
  if (snap.items.length) await q(`delete from player."Sys_Users_Goods" where "ItemID" in (${snap.items.join(",")})`);
  await q(`delete from player."Sys_Users_Pet" where "UserID"=${id}`);
  await q(`delete from player."Sys_Users_Card" where "UserID"=${id}`);
  await q(`delete from player."Sys_VIP_Info" where "UserID"=${id}`);
  if (snap.vip) {
    const v = snap.vip;
    await q(`insert into player."Sys_VIP_Info" ("UserID","typeVIP","VIPLevel","VIPExp","VIPExpireDay") values (${id},${v.typeVIP},${v.VIPLevel},${v.VIPExp},'${new Date(v.VIPExpireDay).toISOString()}')`);
  }
  console.log("restored", snap.Grade, snap.GP, snap.Money);
} else if (cmd === "sql") {
  console.log(rows(await q(arg!)));
}
process.exit(0);
