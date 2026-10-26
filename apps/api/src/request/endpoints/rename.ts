// task api-ashx: RenameNick.ashx + RenameConsortiaName.ashx (both referenced by the 4.1 client, previously
// "Not supported" stubs). Same RSA envelope as Login.ashx (`p` = base64 RSA, plaintext from byte 7 = CSV).
import { consumeWebKey } from "@ddt/auth";
import { base64ToBytes, rsaDecryptPkcs1 } from "@ddt/protocol";
import { sql } from "drizzle-orm";
import { q, q1 } from "../../lib/db.js";
import { result } from "../../lib/flash-xml.js";
import { t } from "../../lib/lang.js";
import { define, xml } from "../types.js";
import { nickByteLength } from "./VisualizeRegister.js";

/**
 * RenameNick.ashx (vendor/DDTank41/Tank.Request/RenameNick.ashx.cs:30-90 -> PlayerBussiness.RenameNick:4388-4417,
 * `SP_Users_RenameNick`): `p` decrypts to `name,pwd,newPwd,nickname,newNickname` (same 4-field shape as Login.ashx
 * plus the two nickname fields). SECURITY FIX (same pattern as Login.ts): the original comments out
 * `if (PlayerManager.Login(name, pwd))` entirely, so ANY decryptable blob renames the account — here `pwd` must
 * match the account's current web/game key (consumeWebKey) first, and success rotates the key to `newPwd` exactly
 * like the original's `PlayerManager.Update(name, newPwd)`. `nickname` must match the account's current NickName
 * (the server-side equivalent of the SP's optimistic match on @UserName+@NickName); SP_Users_RenameNick's only
 * documented failure codes (4/5) both mean "nickname already exists" (`msg = "tên nhân vật đã tồn tại."` literal,
 * kept verbatim since it was never a real LanguageMgr key in the original — ours reuses the NickNameCheck.Exist
 * pt-BR string instead, same convention already used by ConsortiaNameCheck/NickNameCheck in this file set).
 */
export const RenameNick = define("/RenameNick.ashx", async ({ app, p, client }) => {
  let message = t("Tank.Request.RenameNick.Fail1");
  try {
    const raw = (p("p") ?? "").replace(/ /g, "+");
    if (!raw || !app.rsa) return xml(result(false, message));
    const src = rsaDecryptPkcs1(app.rsa, base64ToBytes(raw));
    const parts = Buffer.from(src.subarray(7)).toString("utf8").split(",");
    if (parts.length !== 5) return xml(result(false, message));
    const [name, pwd, newPwd, nickname, newNickname] = parts as [string, string, string, string, string];
    const session = await consumeWebKey(app.h, name, pwd, newPwd, { client });
    if (!session) return xml(result(false, message));
    const user = await q1<{ UserID: number; NickName: string | null }>(
      app.h,
      sql`SELECT "UserID","NickName" FROM player."Sys_Users_Detail" WHERE "UserName" = ${name} LIMIT 1`,
    );
    if (!user || (user.NickName ?? "") !== nickname) return xml(result(false, message));
    if (nickByteLength(newNickname) > 14) return xml(result(false, t("Tank.Request.NickNameCheck.Long")));
    const dup = await q1(app.h, sql`SELECT 1 AS x FROM player."Sys_Users_Detail" WHERE "NickName" = ${newNickname} LIMIT 1`);
    if (dup) return xml(result(false, t("Tank.Request.NickNameCheck.Exist")));
    await q(app.h, sql`UPDATE player."Sys_Users_Detail" SET "NickName" = ${newNickname} WHERE "UserID" = ${user.UserID}`);
    return xml(result(true, t("Tank.Request.RenameNick.Success")));
  } catch {
    message = t("Tank.Request.RenameNick.Fail2");
  }
  return xml(result(false, message));
}, "Tank.Request/RenameNick.ashx.cs");

/**
 * RenameConsortiaName.ashx (vendor/DDTank41/Tank.Request/RenameConsortiaName.ashx.cs:22-69): `p` decrypts to
 * `name,pass1,pass2,_,_` (the 3rd+4th fields are read but never used — `_ = strArray[3]; _ = strArray[4];`). Unlike
 * RenameNick, the login check IS active (`if (PlayerManager.Login(name, pass1))`), but inside the guild rename
 * never actually happens: `using (new ConsortiaBussiness()) { PlayerManager.Update(name, pass2); flag = true; }` —
 * the ConsortiaBussiness instance is constructed and discarded, nothing renames any `Consortia` row. This is a
 * no-op/unfinished feature in DDTank41 itself (same class of bug as LogTime.ashx); ported bug-for-bug: validate
 * the session (consumeWebKey replaces the live PlayerManager.Login check, same fix pattern as Login.ts/RenameNick),
 * rotate the key to `pass2`, and answer success — without touching any guild.
 */
export const RenameConsortiaName = define("/RenameConsortiaName.ashx", async ({ app, p, client }) => {
  let message = t("Tank.Request.RenameConsortiaName.Fail1");
  try {
    const raw = (p("p") ?? "").replace(/ /g, "+");
    if (!raw || !app.rsa) return xml(result(false, message));
    const src = rsaDecryptPkcs1(app.rsa, base64ToBytes(raw));
    const parts = Buffer.from(src.subarray(7)).toString("utf8").split(",");
    if (parts.length !== 5) return xml(result(false, message));
    const [name, pass1, pass2] = parts as [string, string, string, string, string];
    const session = await consumeWebKey(app.h, name, pass1, pass2, { client });
    if (!session) return xml(result(false, message));
    return xml(result(true, t("Tank.Request.RenameConsortiaName.Success")));
  } catch {
    message = t("Tank.Request.RenameConsortiaName.Fail2");
  }
  return xml(result(false, message));
}, "Tank.Request/RenameConsortiaName.ashx.cs");
