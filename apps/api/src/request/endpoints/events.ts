/**
 * ActivePullDown.ashx (Tank.Request/ActivePullDown.ashx.cs + Project_Player34 SP_Active_PullDown): claim the rewards of
 * a game."Active" row from the activity list (calendar window). `activeKey` = RSA(code) with the login key.
 * HasKey: 1 activation code (player."Active_Number", one per account when IsOnly=1), 2 per-user grant
 * (AwardID "<id>-2-<uid>" created by the admin), 3 every account once, 4 shared code. Rewards (game."Active_Award",
 * Sex 0/1/2 and Mark) are mailed; apps/game gets POST /mail-notice so the client reloads the mailbox.
 * Idempotent: codes are taken with a conditional UPDATE, HasKey 3 with app."EventClaims" (same table as apps/game).
 */
import { base64ToBytes, rsaDecryptPkcs1 } from "@ddt/protocol";
import { sql } from "drizzle-orm";
import { q, q1 } from "../../lib/db.js";
import { result } from "../../lib/flash-xml.js";
import { sendMail } from "../../routes/admin.js";
import { gameInternalPost } from "../../routes/public.js";
import { define, xml } from "../types.js";
import type { AppCtx } from "../../context.js";

// PlayerBussiness.PullDown messages (ActiveBussiness.Msg0..Msg10)
const MSG: Record<number, string> = {
  0: "Nhận lãnh thành công, vật phẩm đã gửi đến thư người dùng.",
  1: "Lỗi không xác định.",
  2: "Tên người dùng không tồn tại.",
  3: "Nhận vật phẩm thất bại.",
  4: "Số này không tồn tại, hãy kiểm tra lại.",
  5: "Số này đã nhận thưởng, không thể nhận nữa.",
  6: "Bạn đã nhận phần thưởng này rồi",
  7: "Hoạt động chưa bắt đầu.",
  8: "Hoạt động đã kết thúc.",
  10: "Bạn không có quyền nhận phần thưởng này.",
};

interface ActiveRow { ActiveID: number; Title: string; HasKey: number; IsOnly: number; StartDate: Date; EndDate: Date }

export async function pullDown(app: AppCtx, activeId: number, code: string, userId: number, now = new Date()): Promise<number> {
  const a = await q1<ActiveRow>(app.h, sql`SELECT "ActiveID","Title","HasKey","IsOnly","StartDate","EndDate" FROM game."Active" WHERE "ActiveID" = ${activeId}`);
  if (!a) return 1;
  if (now < new Date(a.StartDate)) return 7;
  if (now > new Date(a.EndDate)) return 8;
  const u = await q1<{ NickName: string; Sex: boolean }>(app.h, sql`SELECT "NickName","Sex" FROM player."Sys_Users_Detail" WHERE "UserID" = ${userId}`);
  if (!u?.NickName) return 2;
  let mark = 0;
  const take = async (awardId: string) => {
    const r = await q1<{ Mark: number }>(app.h, sql`UPDATE player."Active_Number" SET "PullDown" = true, "UserID" = ${userId}, "GetDate" = ${now}
      WHERE "ActiveID" = ${activeId} AND "AwardID" = ${awardId} AND "PullDown" = false RETURNING "Mark"`);
    return r;
  };
  switch (Number(a.HasKey)) {
    case 1:
    case 4: {
      if (!code) return 4;
      const n = await q1<{ PullDown: boolean }>(app.h, sql`SELECT "PullDown" FROM player."Active_Number" WHERE "ActiveID" = ${activeId} AND "AwardID" = ${code}`);
      if (!n) return 4;
      if (n.PullDown) return 5;
      if (Number(a.HasKey) === 1 && Number(a.IsOnly) === 1) {
        const dup = await q1(app.h, sql`SELECT 1 FROM player."Active_Number" WHERE "ActiveID" = ${activeId} AND "UserID" = ${userId} AND "PullDown" = true`);
        if (dup) return 6;
      }
      const r = await take(code);
      if (!r) return 5;
      mark = Number(r.Mark ?? 0);
      break;
    }
    case 2: {
      const r = await take(`${activeId}-2-${userId}`);
      if (!r) {
        const n = await q1(app.h, sql`SELECT 1 FROM player."Active_Number" WHERE "ActiveID" = ${activeId} AND "AwardID" = ${`${activeId}-2-${userId}`}`);
        return n ? 6 : 10;
      }
      mark = Number(r.Mark ?? 0);
      break;
    }
    case 3: {
      const r = await q(app.h, sql`INSERT INTO app."EventClaims" ("UserID","Kind","Key") VALUES (${userId}, 'active', ${String(activeId)}) ON CONFLICT DO NOTHING RETURNING "UserID"`);
      if (!r.length) return 6;
      break;
    }
    default:
      return 1;
  }
  const sex = u.Sex ? 1 : 2;
  const awards = await q<{ ItemID: number; Count: number; ValidDate: number; Gold: number; Money: number }>(app.h,
    sql`SELECT "ItemID","Count","ValidDate","Gold","Money" FROM game."Active_Award" WHERE "ActiveID" = ${activeId} AND ("Sex" = ${sex} OR "Sex" = 0) AND "Mark" = ${mark} ORDER BY "ID"`);
  const items = awards.filter((x) => Number(x.ItemID) > 0).map((x) => ({ templateId: Number(x.ItemID), count: Number(x.Count) || 1, validDays: Number(x.ValidDate) || 0 }));
  const gold = awards.reduce((s, x) => s + Number(x.Gold || 0), 0);
  const money = awards.reduce((s, x) => s + Number(x.Money || 0), 0);
  for (let i = 0; i < Math.max(1, items.length); i += 5) {
    await sendMail(app, userId, u.NickName, a.Title || "Evento", `Prêmio do evento ${a.Title}`, { items: items.slice(i, i + 5), gold: i === 0 ? gold : 0, money: i === 0 ? money : 0 });
  }
  await gameInternalPost(app, "/mail-notice", { userId });
  return 0;
}

export const ActivePullDown = define("/ActivePullDown.ashx", async ({ app, int, p }) => {
  let value = false;
  let message = "ActivePullDownHandler.Fail";
  try {
    const raw = p("activeKey") ?? "";
    let code = "";
    if (raw && app.rsa) {
      try {
        code = new TextDecoder().decode(rsaDecryptPkcs1(app.rsa, base64ToBytes(raw))).trim();
      } catch {
        code = "";
      }
    }
    const r = await pullDown(app, int("activeID"), code, int("selfid"));
    message = MSG[r] ?? MSG[1]!;
    // the original answered value=true whenever the proc ran, so the client marked the activity "attended" even
    // after "code does not exist": here only a successful claim sets it
    value = r === 0;
  } catch {
    /* Fail like the original catch */
  }
  return xml(result(value, message));
}, "Tank.Request/ActivePullDown.ashx.cs");
