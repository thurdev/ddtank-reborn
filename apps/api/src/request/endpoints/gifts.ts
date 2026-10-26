// task api-ashx: GiftRecieveLog.ashx + giftsendlog.ashx (both referenced by the 4.1 client, previously stubs).
// Both compress with zlib via BinaryWrite(StaticFunction.Compress(...)) in the original (not in the §3.3
// compression-mismatch list), so the response must be zlib here too.
import { sql } from "drizzle-orm";
import { q } from "../../lib/db.js";
import { result, type XEl } from "../../lib/flash-xml.js";
import { item } from "../../lib/spec.js";
import { define, xml } from "../types.js";

const GIFT_SPEC = "playerID=ReceiverID TemplateID count=Count";

/**
 * GiftRecieveLog.ashx (vendor/DDTank41/Tank.Request/GiftRecieveLog.ashx.cs:20-54 ->
 * PlayerBussiness.GetAllUserGifts(userID, isReceive=true) -> `SP_Users_Gift_Single`): `key` is read but never
 * validated in the original (`_ = context.Request["key"];` — discarded), and `selfid` is parsed only to trigger
 * the catch/Fail path when missing (same bug-compatible pattern as dailyloglist.ashx already ported). Gifts the
 * account received, filtered server-side by the real `userID` param (not `selfid`).
 */
export const GiftRecieveLog = define("/GiftRecieveLog.ashx", async ({ app, p }) => {
  try {
    if (!p("selfid")) throw new Error("missing selfid");
    const userId = Number.parseInt(p("userID") ?? "", 10);
    if (!Number.isFinite(userId)) throw new Error("missing userID");
    const rows = await q(app.h, sql`SELECT * FROM player."Sys_Users_Gift" WHERE "ReceiverID" = ${userId} ORDER BY "ID"`);
    const kids: XEl[] = rows.map((r) => item("Item", GIFT_SPEC, r));
    return xml(result(true, "Success!", kids), true);
  } catch {
    return xml(result(false, "Fail!"), true);
  }
}, "Tank.Request/GiftRecieveLog.ashx.cs");

/**
 * giftsendlog.ashx (vendor/DDTank41/Tank.Request/giftsendlog.ashx.cs:20-54 ->
 * PlayerBussiness.GetAllUserGifts(userID, isReceive=false)): gifts the account sent, filtered by `SenderID`. The
 * `Item` still shows `playerID=ReceiverID` (the recipient), same as GiftRecieveLog — that attribute is literally
 * `userGiftInfo.ReceiverID` in both handlers.
 */
export const giftsendlog = define("/giftsendlog.ashx", async ({ app, p }) => {
  try {
    if (!p("selfid")) throw new Error("missing selfid");
    const userId = Number.parseInt(p("userID") ?? "", 10);
    if (!Number.isFinite(userId)) throw new Error("missing userID");
    const rows = await q(app.h, sql`SELECT * FROM player."Sys_Users_Gift" WHERE "SenderID" = ${userId} ORDER BY "ID"`);
    const kids: XEl[] = rows.map((r) => item("Item", GIFT_SPEC, r));
    return xml(result(true, "Success!", kids), true);
  } catch {
    return xml(result(false, "Fail!"), true);
  }
}, "Tank.Request/giftsendlog.ashx.cs");
