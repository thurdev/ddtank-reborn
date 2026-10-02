// Guild list endpoints (Tank.Request/Consortia*List.ashx.cs -> ConsortiaBussiness.Get*Page = SP_CustomPage on the
// views; FlashUtils.CreateConsortia*Info attribute order). Plain XML (client REQUEST_LOADER).
import { sql, type SQL } from "drizzle-orm";
import { q, q1 } from "../../lib/db.js";
import { fmtDateDefault, result, wallNow, type XEl } from "../../lib/flash-xml.js";
import { item } from "../../lib/spec.js";
import { define, xml } from "../types.js";

const and = (parts: (SQL | undefined | false)[]) => sql.join(parts.filter(Boolean) as SQL[], sql` AND `);

function totalFirst(r: XEl, total: number): XEl {
  r.attrs.unshift(["total", String(total)]);
  return r;
}

function paging(int: (k: string, d?: number) => number): { size: number; offset: number } {
  const page = Math.max(1, int("page", 1));
  const size = Math.min(1000, Math.max(1, int("size", 10)));
  return { size, offset: (page - 1) * size };
}

/** One "SELECT count + page" over a FROM/WHERE pair, mapped with a FlashUtils spec. */
async function listPage(app: { h: Parameters<typeof q>[0] }, from: SQL, where: SQL, order: SQL, spec: string, int: (k: string, d?: number) => number, map?: (r: Record<string, unknown>) => Record<string, unknown>) {
  const { size, offset } = paging(int);
  const c = await q1<{ n: number }>(app.h, sql`SELECT count(*)::int AS n FROM ${from} WHERE ${where}`);
  const rows = await q(app.h, sql`SELECT * FROM ${from} WHERE ${where} ORDER BY ${order} LIMIT ${size} OFFSET ${offset}`);
  return xml(totalFirst(result(true, "Success!", rows.map((r) => item("Item", spec, map ? map(r) : r))), Number(c?.n ?? 0)));
}

const fail = () => xml(totalFirst(result(false, "Fail!"), 0));

/** ConsortiaApplyUsersList.ashx (V_Consortia_Apply_Users, CreateConsortiaApplyUserInfo). */
export const ConsortiaApplyUsersList = define("/ConsortiaApplyUsersList.ashx", async ({ app, int }) => {
  try {
    const cid = int("consortiaID", -1);
    const aid = int("applyID", -1);
    const uid = int("userID", -1);
    const where = and([sql`"IsExist" = true`, cid !== -1 && sql`"ConsortiaID" = ${cid}`, aid !== -1 && sql`"ID" = ${aid}`, uid !== -1 && sql`"UserID" = ${uid}`]);
    return await listPage(app, sql`app."V_Consortia_Apply_Users"`, where, sql`"ApplyDate" DESC, "ID"`, "ID ApplyDate:d ConsortiaID ConsortiaName Remark UserID UserName UserLevel=Grade Win Total Repute", int);
  } catch {
    return fail();
  }
});

/** ConsortiaInviteUsersList.ashx (V_Consortia_Invite = Consortia_Invite_Users ⋈ Consortia, CreateConsortiaInviteUserInfo). */
export const ConsortiaInviteUsersList = define("/ConsortiaInviteUsersList.ashx", async ({ app, int }) => {
  try {
    const uid = int("userID", -1);
    const iid = int("inviteID", -1);
    const where = and([sql`i."IsExist" = true`, sql`c."IsExist" = true`, uid !== -1 && sql`i."UserID" = ${uid}`, iid !== -1 && sql`i."InviteID" = ${iid}`]);
    const from = sql`player."Consortia_Invite_Users" i JOIN player."Consortia" c ON c."ConsortiaID" = i."ConsortiaID"`;
    const { size, offset } = paging(int);
    const n = await q1<{ n: number }>(app.h, sql`SELECT count(*)::int AS n FROM ${from} WHERE ${where}`);
    const rows = await q(app.h, sql`SELECT i.*, c."CelebCount", c."ChairmanName", c."Count", c."Honor", c."Repute" FROM ${from} WHERE ${where} ORDER BY i."InviteDate" DESC, i."ID" LIMIT ${size} OFFSET ${offset}`);
    const spec = "ID CelebCount ChairmanName ConsortiaID ConsortiaName Count Honor InviteDate:D InviteID InviteName Remark Repute UserID UserName";
    return xml(totalFirst(result(true, "Success!", rows.map((r) => item("Item", spec, r))), Number(n?.n ?? 0)));
  } catch {
    return fail();
  }
});

/** ConsortiaDutyList.ashx (Consortia_Duty, CreateConsortiaDutyInfo). */
export const ConsortiaDutyList = define("/ConsortiaDutyList.ashx", async ({ app, int }) => {
  try {
    const cid = int("consortiaID", -1);
    const did = int("dutyID", -1);
    const where = and([sql`"IsExist" = true`, cid !== -1 && sql`"ConsortiaID" = ${cid}`, did !== -1 && sql`"DutyID" = ${did}`]);
    return await listPage(app, sql`player."Consortia_Duty"`, where, sql`"Level", "DutyID"`, "DutyID ConsortiaID DutyName Right Level", int);
  } catch {
    return fail();
  }
});

/** ConsortiaEventList.ashx (Consortia_Event, CreateConsortiaEventInfo — Remark is DateTime.Now.ToString() there). */
export const ConsortiaEventList = define("/ConsortiaEventList.ashx", async ({ app, int }) => {
  try {
    const cid = int("consortiaID", -1);
    const where = and([sql`"IsExist" = true`, cid !== -1 && sql`"ConsortiaID" = ${cid}`]);
    const now = fmtDateDefault(wallNow());
    return await listPage(app, sql`player."Consortia_Event"`, where, sql`"Date" DESC, "ID" DESC`, "ID ConsortiaID Date:d Type Remark NickName EventValue ManagerName", int, (r) => ({ ...r, Remark: now }));
  } catch {
    return fail();
  }
});

/** ConsortiaEquipControlList.ashx (Consortia_Equip_Control, CreateConsortiaEquipControlInfo). */
export const ConsortiaEquipControlList = define("/ConsortiaEquipControlList.ashx", async ({ app, int }) => {
  try {
    const cid = int("consortiaID", -1);
    const level = int("level", -1);
    const type = int("type", -1);
    const where = and([sql`"IsExist" = true`, cid !== -1 && sql`"ConsortiaID" = ${cid}`, level !== -1 && sql`"Level" = ${level}`, type !== -1 && sql`"Type" = ${type}`]);
    return await listPage(app, sql`player."Consortia_Equip_Control"`, where, sql`"Type", "Level"`, "ConsortiaID Level Riches Type", int);
  } catch {
    return fail();
  }
});

/** ConsortiaEquipControl.ashx (SP_Consortia_Equip_Control_Single per level/type, 100 when missing). */
export const ConsortiaEquipControl = define("/ConsortiaEquipControl.ashx", async ({ app, int }) => {
  try {
    const cid = int("consortiaID", 0);
    const rows = await q(app.h, sql`SELECT "Type", "Level", "Riches" FROM player."Consortia_Equip_Control" WHERE "ConsortiaID" = ${cid} AND "IsExist" = true ORDER BY "Type", "Level"`);
    return xml(totalFirst(result(true, "Success!", rows.map((r) => item("Item", "type=Type level=Level riches=Riches", r))), rows.length));
  } catch {
    return fail();
  }
});

/** ConsortiaAllyList.ashx (CreateConsortiaAllyInfo; alliances are unused by the 4.1 client — rows of Consortia_Ally). */
export const ConsortiaAllyList = define("/ConsortiaAllyList.ashx", async ({ app, int }) => {
  try {
    const cid = int("consortiaID", -1);
    const where = and([sql`a."IsExist" = true`, cid !== -1 && sql`a."Consortia1ID" = ${cid}`]);
    const from = sql`player."Consortia_Ally" a JOIN player."Consortia" c ON c."ConsortiaID" = a."Consortia2ID"`;
    const rows = await q(app.h, sql`SELECT a."ID", a."State", a."Date", c.* FROM ${from} WHERE ${where} ORDER BY a."ID"`);
    const spec = "ID ChairmanName ConsortiaID ConsortiaName Count Honor State Date:d Level IsApply='false' Description Riches Repute";
    return xml(totalFirst(result(true, "Success!", rows.map((r) => item("Item", spec, r))), rows.length));
  } catch {
    return fail();
  }
});

/** ConsortiaApplyAllyList.ashx (CreateConsortiaApplyAllyInfo). */
export const ConsortiaApplyAllyList = define("/ConsortiaApplyAllyList.ashx", async ({ app, int }) => {
  try {
    const cid = int("consortiaID", -1);
    const where = and([sql`a."IsExist" = true`, cid !== -1 && sql`a."Consortia2ID" = ${cid}`]);
    const from = sql`player."Consortia_Apply_Ally" a JOIN player."Consortia" c ON c."ConsortiaID" = a."Consortia1ID"`;
    const rows = await q(app.h, sql`SELECT a."ID", a."Date", a."Remark" AS "ApplyRemark", c.* FROM ${from} WHERE ${where} ORDER BY a."ID"`);
    const spec = "ID CelebCount ChairmanName ConsortiaID ConsortiaName Count Date:d Honor Remark=ApplyRemark Level Description Repute";
    return xml(totalFirst(result(true, "Success!", rows.map((r) => item("Item", spec, r))), rows.length));
  } catch {
    return fail();
  }
});

/** ConsortiaIMList.ashx?id= (CreateConsortiaIMInfo: guild members for the IM panel). */
export const ConsortiaIMList = define("/ConsortiaIMList.ashx", async ({ app, int }) => {
  try {
    const uid = int("id", 0);
    const me = await q1<{ ConsortiaID: number }>(app.h, sql`SELECT "ConsortiaID" FROM player."Sys_Users_Detail" WHERE "UserID" = ${uid}`);
    const cid = me?.ConsortiaID ?? 0;
    const c = cid ? await q1<{ Level: number; Repute: number }>(app.h, sql`SELECT "Level", "Repute" FROM player."Consortia" WHERE "ConsortiaID" = ${cid} AND "IsExist" = true`) : null;
    if (!c) return xml(result(true, "Success!"));
    const rows = await q(app.h, sql`SELECT u."ID", u."ConsortiaID", u."DutyID", d."DutyName", s."GP", s."Grade", s."Offer", u."Remark", s."State", u."UserID", s."Hide", s."Colors", s."Skin", s."Style", s."LastDate", s."Sex", s."UserName" AS "LoginName", s."NickName"
      FROM player."Consortia_Users" u JOIN player."Sys_Users_Detail" s ON s."UserID" = u."UserID" LEFT JOIN player."Consortia_Duty" d ON d."DutyID" = u."DutyID"
      WHERE u."ConsortiaID" = ${cid} AND u."IsExist" = true ORDER BY u."ID"`);
    const r = result(true, "Success!", rows.map((x) => item("Item", "ID ConsortiaID DutyID DutyName GP Grade Offer Remark State UserID Hide Colors Skin Style LastDate:d Sex LoginName NickName", x)));
    r.attrs.unshift(["Level", String(c.Level)], ["Repute", String(c.Repute)]);
    return xml(r);
  } catch {
    return xml(result(false, "Fail!"));
  }
});
