// Lobby requests made right after the socket login (StartupResourceLoader.startLoadRelatedInfo).
// Ports of IMListLoad, UserApprenticeshipInfoList, ConsortiaList, ConsortiaUsersList, ConsortiaNameCheck,
// AdvanceQuestionRead, shopcheapitemlist, LoadUserMail, MailSenderList (Tank.Request/<Name>.ashx.cs).
// Parameterized SQL replaces the string-built SP_CustomPage calls.
import { sql, type SQL } from "drizzle-orm";
import { all, q, q1 } from "../../lib/db.js";
import { el, fmtDate, result, wallNow, type XEl } from "../../lib/flash-xml.js";
import { t } from "../../lib/lang.js";
import { item } from "../../lib/spec.js";
import { CONSORTIA_ORDER, SPECS } from "../../templates/defs.js";
import { userById } from "../players.js";
import { define, xml } from "../types.js";
import { nickByteLength } from "./VisualizeRegister.js";

const and = (parts: (SQL | undefined | false)[]) => sql.join(parts.filter(Boolean) as SQL[], sql` AND `);

function totalFirst(r: XEl, total: number): XEl {
  r.attrs.unshift(["total", String(total)]);
  return r;
}

/** IMListLoad.ashx: friends of `id` (SP_Users_Friends -> V_Sys_Users_Friends). Plain XML (client REQUEST_LOADER). */
export const IMListLoad = define("/IMListLoad.ashx", async ({ app, int }) => {
  const kids: XEl[] = [el("customList", [["ID", 0], ["Name", "Bạn bè"]])];
  try {
    const rows = await q(app.h, sql`SELECT * FROM app."V_Sys_Users_Friends" WHERE "UserID" = ${int("id")} AND "IsExist" = true`);
    for (const g of rows)
      kids.push(
        el("Item", [
          ["ID", g.FriendID as number],
          ["NickName", g.NickName as string],
          ["Birthday", wallNow()],
          ["ApprenticeshipState", 0],
          ["LoginName", g.UserName as string],
          ["Style", g.Style as string],
          ["Sex", !!g.Sex],
          ["Colors", g.Colors as string],
          ["Grade", g.Grade as number],
          ["Hide", g.Hide as number],
          ["ConsortiaName", g.ConsortiaName as string],
          ["TotalCount", g.Total as number],
          ["EscapeCount", g.Escape as number],
          ["WinCount", g.Win as number],
          ["Offer", g.Offer as number],
          ["Relation", g.Relation as number],
          ["Repute", g.Repute as number],
          ["State", Number(g.State) === 1 ? 1 : 0],
          ["Nimbus", g.Nimbus as number],
          ["DutyName", g.DutyName as string],
        ]),
      );
    return xml(result(true, "Success!", kids));
  } catch {
    return xml(result(false, "Fail!", kids));
  }
});

const APPRENTICE =
  "UserID NickName typeVIP:0 VIPLevel:0 Skin Sex Grade Hide ConsortiaName WinCount=Win TotalCount=Total EscapeCount=Escape Offer State Repute DutyName AchievementPoint Rank=Honor FightPower ApprenticeshipState=apprenticeshipState GraduatesCount=graduatesCount IsMarried HonourOfMaster=honourOfMaster Style Colors LastDate:D";

/** UserApprenticeshipInfoList.ashx: master + fellow apprentices of selfid. */
export const UserApprenticeshipInfoList = define("/UserApprenticeshipInfoList.ashx", async ({ app, int }) => {
  const kids: XEl[] = [];
  try {
    const self = int("selfid");
    const rel = int("RelationshipID") || self;
    const master = await userById(app.h, rel);
    const me = await userById(app.h, self);
    if (master && me && Number(me.masterID) === Number(master.UserID)) {
      kids.push(item("Item", APPRENTICE, master));
      for (const part of String(master.masterOrApprentices ?? "").split(",")) {
        const id = Number(part.split("|")[0]);
        if (!id || id === self) continue;
        const u = await userById(app.h, id);
        if (u) kids.push(item("Item", APPRENTICE, u));
      }
    }
  } catch {
    /* the original answers value=true anyway */
  }
  return xml(totalFirst(result(true, "Success!", kids), 0));
});

/** ConsortiaList.ashx (GetConsortiaPage on V_Consortia). zlib body (client COMPRESS_REQUEST_LOADER). */
export const ConsortiaList = define("/ConsortiaList.ashx", async ({ app, p, int }) => {
  try {
    const page = Math.max(1, int("page", 1));
    const size = Math.min(100, Math.max(1, int("size", 10)));
    const cid = int("consortiaID", -1);
    const level = int("level", -1);
    const open = int("openApply", -1);
    const name = (p("name") ?? "").trim();
    const where = and([
      sql`"IsExist" = true`,
      !!name && sql`"ConsortiaName" ILIKE ${"%" + name.replace(/[%_\\]/g, (c) => "\\" + c) + "%"}`,
      cid !== -1 && sql`"ConsortiaID" = ${cid}`,
      level !== -1 && sql`"Level" = ${level}`,
      open !== -1 && sql`"OpenApply" = ${open === 1}`,
    ]);
    const ord = sql.raw(CONSORTIA_ORDER[int("order", 0)] ?? CONSORTIA_ORDER[0]!);
    const c = await q1<{ n: number }>(app.h, sql`SELECT count(*)::int AS n FROM app."V_Consortia" WHERE ${where}`);
    const rows = await q(app.h, sql`SELECT * FROM app."V_Consortia" WHERE ${where} ORDER BY ${ord}, "ConsortiaID" LIMIT ${size} OFFSET ${(page - 1) * size}`);
    return xml(totalFirst(result(true, "Success!", rows.map((r) => item("Item", SPECS.consortia, r))), Number(c?.n ?? 0)), true);
  } catch {
    return xml(totalFirst(result(false, "Fail!"), 0), true);
  }
});

const CUSER =
  "ID ConsortiaID DutyID DutyName GP Level Grade Right DutyLevel=Level Offer RatifierID RatifierName Remark Repute State UserID Hide Colors Skin Style LastDate:d Sex IsBanChat WinCount=Win TotalCount=Total EscapeCount=Escape RichesOffer RichesRob Nimbus LoginName UserName FightPower Rank=Honor AchievementPoint IsDiplomatism='true' IsDownGrade='true' IsEditorPlacard='true' IsEditorDescription='true' IsExpel='true' IsEditorUser='true' IsInvite='false' IsManageDuty='true' IsUpGrade='false' typeVIP:0 VIPLevel:0 IsRatify='true' IsChat='true' TotalRichesOffer=UseOffer";
const CUSER_ORDER: Record<number, string> = { 0: `"UserName"`, 1: `"DutyID"`, 2: `"Grade"`, 3: `"Repute"`, 4: `"GP"`, 5: `"State"`, 6: `"Offer"` };

/** ConsortiaUsersList.ashx (GetConsortiaUsersPage on V_Consortia_Users). Plain. */
export const ConsortiaUsersList = define("/ConsortiaUsersList.ashx", async ({ app, int }) => {
  const extra = (): [string, string][] => [["currentDate", fmtDate(wallNow())]];
  try {
    const page = Math.max(1, int("page", 1));
    const size = Math.min(500, Math.max(1, int("size", 10)));
    const cid = int("consortiaID", -1);
    const uid = int("userID", -1);
    const state = int("state", -1);
    const where = and([sql`"IsExist" = true`, cid !== -1 && sql`"ConsortiaID" = ${cid}`, uid !== -1 && sql`"UserID" = ${uid}`, state !== -1 && sql`"State" = ${state}`]);
    const c = await q1<{ n: number }>(app.h, sql`SELECT count(*)::int AS n FROM app."V_Consortia_Users" WHERE ${where}`);
    const ord = sql.raw(CUSER_ORDER[int("order", 0)] ?? CUSER_ORDER[0]!);
    const rows = await q(app.h, sql`SELECT * FROM app."V_Consortia_Users" WHERE ${where} ORDER BY ${ord}, "ID" LIMIT ${size} OFFSET ${(page - 1) * size}`);
    const kids = rows.map((r) => item("Item", CUSER, { ...r, State: Number(r.State) === 1 ? 1 : 0 }));
    return xml(totalFirst(result(true, "Success!", kids, extra()), Number(c?.n ?? 0)));
  } catch {
    return xml(totalFirst(result(false, "Fail!", [], extra()), 0));
  }
});

/** ConsortiaNameCheck.ashx (SP_Consortia_CheckByName). */
export const ConsortiaNameCheck = define("/ConsortiaNameCheck.ashx", async ({ app, p }) => {
  const name = (p("NickName") ?? "").trim();
  if (nickByteLength(name) > 14) return xml(result(false, t("Tank.Request.ConsortiaNameCheck.Long")));
  if (!name) return xml(result(false, t("Tank.Request.ConsortiaNameCheck.Exist")));
  const hit = await q1(app.h, sql`SELECT 1 AS x FROM player."Consortia" WHERE "ConsortiaName" = ${name} AND "IsExist" = true LIMIT 1`);
  return xml(result(!hit, t(hit ? "Tank.Request.ConsortiaNameCheck.Exist" : "Tank.Request.ConsortiaNameCheck.Right")));
});

/** AdvanceQuestionRead.ashx: the original only parses useid and answers Success. Plain (client REQUEST_LOADER, spec §3.3). */
export const AdvanceQuestionRead = define("/AdvanceQuestionRead.ashx", async () => xml(result(true, "Success!")));

/** shopcheapitemlist.ashx: Shop rows with IsCheap && EndDate > now && Label == 4 (FlashUtils.CreateShopCheapItems). */
export const shopcheapitemlist = define("/shopcheapitemlist.ashx", async ({ app }) => {
  try {
    const now = wallNow();
    const rows = (await all(app.h, "game", "Shop", `"Sort" DESC, "ID"`)).filter((s) => s.IsCheap && (s.EndDate as Date) > now && Number(s.Label) === 4);
    const spec = "ID TemplateID AUnit APrice=APrice1 AValue=AValue1 BUnit BPrice=BPrice1 BValue=BValue1 CUnit CPrice=CPrice1 CValue=CValue1 StartDate EndDate BuyType";
    return xml(result(true, "Success!", rows.map((r) => item("Item", spec, r))));
  } catch {
    return xml(result(false, "Fail!"));
  }
});

const MAIL = "ID Title Content Sender SendTime:d Gold Money Annex1ID=Annex1 Annex2ID=Annex2 Annex3ID=Annex3 Annex4ID=Annex4 Annex5ID=Annex5 Type ValidDate IsRead";
export const GOODS =
  "AgilityCompose AttackCompose BeginDate:d Color Skin Count DefendCompose IsBinds IsUsed IsJudge ItemID LuckCompose Place StrengthenLevel TemplateID UserID BagType ValidDate Hole1 Hole2 Hole3 Hole4 Hole5 Hole6";

/** LoadUserMail.ashx (SP_Mail_ByUserID + annex goods). zlib (COMPRESS_REQUEST_LOADER). */
export const LoadUserMail = define("/LoadUserMail.ashx", async ({ app, int }) => {
  try {
    const rows = await q(
      app.h,
      sql`SELECT * FROM player."User_Messages" WHERE "IsExist" = true AND "ReceiverID" = ${int("selfid")}
          AND EXTRACT(EPOCH FROM (${wallNow()}::timestamp - "SendTime")) / 3600 < "ValidDate" ORDER BY "SendDate" ASC`,
    );
    const kids: XEl[] = [];
    for (const m of rows) {
      const node = item("Item", MAIL, m);
      for (const a of [m.Annex1, m.Annex2, m.Annex3, m.Annex4, m.Annex5]) {
        const id = Number.parseInt(String(a ?? ""), 10);
        if (!id) continue;
        const g = await q1(app.h, sql`SELECT * FROM player."Sys_Users_Goods" WHERE "ItemID" = ${id}`);
        if (g) node.add(item("Item", GOODS, g));
      }
      kids.push(node);
    }
    return xml(result(true, "Success!", kids), true);
  } catch {
    return xml(result(false, "Fail!"), true);
  }
});

/** MailSenderList.ashx (SP_Mail_BySenderID, FlashUtils.CreateMailInfo). zlib. */
export const MailSenderList = define("/MailSenderList.ashx", async ({ app, int }) => {
  try {
    const rows = await q(
      app.h,
      sql`SELECT * FROM player."User_Messages" WHERE "SenderID" = ${int("selfID")} AND "Type" IN (1,6,10,101)
          AND EXTRACT(EPOCH FROM (${wallNow()}::timestamp - "SendTime")) / 3600 < 240 ORDER BY "SendDate" ASC LIMIT 21`,
    );
    const spec =
      "ID Title Content Sender Receiver SendTime:d ValidDate Gold Money Annex1ID=Annex1 Annex2ID=Annex2 Annex3ID=Annex3 Annex4ID=Annex4 Annex5ID=Annex5 Annex1Name Annex2Name Annex3Name Annex4Name Annex5Name AnnexRemark Type IsRead";
    return xml(result(true, "Success!", rows.map((r) => item("Item", spec, r))), true);
  } catch {
    return xml(result(false, "Fail!"), true);
  }
});
