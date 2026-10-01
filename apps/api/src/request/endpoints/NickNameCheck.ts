// Port of Tank.Request/NickNameCheck.ashx.cs (SP_Users_SingleByNickName).
import { result } from "../../lib/flash-xml.js";
import { t } from "../../lib/lang.js";
import { userByNick } from "../players.js";
import { define, xml } from "../types.js";
import { ILLEGAL, nickByteLength } from "./VisualizeRegister.js";

export default define("/NickNameCheck.ashx", async ({ app, p }) => {
  let value = false;
  let message = t("Tank.Request.NickNameCheck.Exist");
  const nick = (p("NickName") ?? "").trim();
  if (nickByteLength(nick) > 14) message = t("Tank.Request.NickNameCheck.Long");
  else if (nick && !ILLEGAL.test(nick) && !(await userByNick(app.h, nick))) {
    value = true;
    message = t("Tank.Request.NickNameCheck.Right");
  }
  return xml(result(value, message));
});
