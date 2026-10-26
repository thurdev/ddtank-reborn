// task api-ashx: small endpoints referenced by the 4.1 client that were plain "Not supported" stubs before this
// task — ported from the (trivial, mostly table-less) vendor/DDTank41/Tank.Request handlers.
import { sql } from "drizzle-orm";
import { q } from "../../lib/db.js";
import { el, result, wallNow, type XEl } from "../../lib/flash-xml.js";
import { item } from "../../lib/spec.js";
import { define, text, xml } from "../types.js";

/**
 * CreatShortCut.ashx (vendor/DDTank41/Tank.Request/CreatShortCut.ashx.cs:17-22): reads `gameurl` but ignores it,
 * always answers the literal text `Not support right now` (no XML at all, no ContentType set).
 */
export const CreatShortCut = define("/CreatShortCut.ashx", async () => text("Not support right now"), "Tank.Request/CreatShortCut.ashx.cs");

/**
 * API/Login.ashx (vendor/DDTank41/Tank.Request/API/Login.ashx.cs:16-37): the whole handler is commented out (the
 * `Member_Info` lookup, the JSON serializer) except the literal `Response.Write(1)` in the `finally` block —
 * always answers the single character `1`, regardless of `username`/`password`.
 */
export const ApiLogin = define("/API/Login.ashx", async () => text("1"), "Tank.Request/API/Login.ashx.cs");

/**
 * IMRecentContactsList.ashx (vendor/DDTank41/Tank.Request/IMRecentContactsList.ashx.cs:25-54): the real query
 * block is entirely commented out; the handler unconditionally sets `value=true, message="Success!"` with no
 * `<Item>` children. Plain text (client reads REQUEST_LOADER; §3.3 "compression mismatch" already covers this).
 */
export const IMRecentContactsList = define("/IMRecentContactsList.ashx", async () => xml(result(true, "Success!")), "Tank.Request/IMRecentContactsList.ashx.cs");

/**
 * gmtipallbyids.ashx (vendor/DDTank41/Tank.Request/gmtipallbyids.ashx.cs:24-70 ->
 * ProduceBussiness.GetAllEdictum -> `game.Edictum_List`): GM notice ticker. Only runs when `ids` (comma list) is
 * present; the original then overwrites **every** edict's `ID` attribute with the first id of that list
 * (`info.ID = int.Parse(ids[0])` inside the `foreach` — a bug kept here for byte-compat) and keeps rows whose
 * `EndDate.Date > DateTime.Now.Date` (date-only compare, `IsExist` is not checked by the original either).
 */
export const gmtipallbyids = define("/gmtipallbyids.ashx", async ({ app, p }) => {
  let value = false;
  let message = "Fail!";
  const kids: XEl[] = [];
  try {
    const raw = p("ids") ?? "";
    if (raw) {
      const ids = raw.split(",");
      const firstId = Number.parseInt(ids[0] ?? "", 10);
      const now = wallNow();
      const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      const rows = await q(app.h, sql`SELECT * FROM game."Edictum_List"`);
      for (const r of rows) {
        const end = r.EndDate as Date;
        const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
        if (endUtc > todayUtc) kids.push(item("Item", "ID Title BeginDate:d BeginTime:d EndDate:d EndTime:d Text IsExist", { ...r, ID: firstId }));
      }
      value = true;
      message = "Success!";
    }
  } catch {
    message = "Fail!";
  }
  return xml(result(value, message, kids));
}, "Tank.Request/gmtipallbyids.ashx.cs");

/**
 * FarmGetUserFieldInfosSingle.ashx (vendor/DDTank41/Tank.Request/FarmGetUserFieldInfosSingle.ashx.cs:14-39): no DB
 * access at all — just echoes `friendID` back with a hardcoded `isFeed="false"`.
 */
export const FarmGetUserFieldInfosSingle = define("/FarmGetUserFieldInfosSingle.ashx", async ({ p }) => {
  const friendID = p("friendID") ?? "";
  return xml(result(true, "Success!", [el("Item", [["UserID", friendID], ["isFeed", false]])]));
}, "Tank.Request/FarmGetUserFieldInfosSingle.ashx.cs");

/**
 * FarmGetUserFieldInfos.ashx (vendor/DDTank41/Tank.Request/FarmGetUserFieldInfos.ashx.cs:41-71 ->
 * PlayerBussiness.GetFriendsAll + GetSingleFields): one `<Item UserID="friendID">` per friend of `selfid`
 * (`key` is read but not validated, same as dailyloglist/gift logs), each wrapping the friend's planted-field
 * rows. `packages/db` has no Farm table yet (minigame never migrated) — the friend list is real (same
 * `app.V_Sys_Users_Friends` view IMListLoad.ashx uses), but every `<Item>` is childless (no fields planted,
 * matching an account that never played Farm, so the client analyzer still gets the right shape).
 */
export const FarmGetUserFieldInfos = define("/FarmGetUserFieldInfos.ashx", async ({ app, int }) => {
  const kids: XEl[] = [];
  try {
    const rows = await q(app.h, sql`SELECT "FriendID" FROM app."V_Sys_Users_Friends" WHERE "UserID" = ${int("selfid")} AND "IsExist" = true`);
    for (const r of rows) kids.push(el("Item", [["UserID", r.FriendID as number]]));
  } catch {
    /* the original has no catch at all around this block; an empty list keeps the client happy */
  }
  return xml(result(true, "Success!", kids));
}, "Tank.Request/FarmGetUserFieldInfos.ashx.cs");

/**
 * luckstaractivityrank.ashx (vendor/DDTank41/Tank.Request/luckstaractivityrank.ashx.cs:24-57 ->
 * PlayerBussiness.GetAllLuckstarActivityRank): root element is `<Ranks>`, not `<Result>`. `key` is read but not
 * validated (same bug-compatible pattern as the gift logs). `packages/db` has no Luckstar table — answered with
 * the correct empty shape (`myRank rank="0" useStarNum="0" nickName=""`, no `<item>` rows) rather than a
 * wrong-rooted "Not supported" `<Result>` that the client's `<Ranks>` analyzer can't read at all.
 */
export const luckstaractivityrank = define("/luckstaractivityrank.ashx", async () => {
  const now = wallNow();
  const pad = (n: number) => String(n).padStart(2, "0");
  const h24 = now.getUTCHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const lastUpdateTime = `${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())} ${pad(h12)}:${pad(now.getUTCMinutes())}`;
  const myRank = el("myRank", [["rank", 0], ["useStarNum", 0], ["nickName", ""]]);
  return xml(el("Ranks", [["lastUpdateTime", lastUpdateTime], ["value", true], ["message", "Success!"]], myRank));
}, "Tank.Request/luckstaractivityrank.ashx.cs");
