// Port of Tank.Request/VisualizeRegister.ashx.cs (+ SP_Users_RegisterNotValidate). Deviation: if the account row
// does not exist yet (SP_Users_Active not run), it is created first.
import { getNameBySite } from "@ddt/auth";
import { result } from "../../lib/flash-xml.js";
import { t } from "../../lib/lang.js";
import { activePlayer, registerPlayer } from "../players.js";
import { define, xml } from "../types.js";

/** Characters rejected in nicknames (the original used an Illegalcharacters word list + ConvertSql). */
export const ILLEGAL = /[<>'"&;=%\,]/;

export const nickByteLength = (s: string) => Buffer.byteLength(s, "latin1") + [...s].filter((c) => c.charCodeAt(0) > 0xff).length;

export default define(
  "/VisualizeRegister.ashx",
  async ({ app, p, ip }) => {
    let value = false;
    let message = t("Tank.Request.VisualizeRegister.Fail1");
    try {
      const name = getNameBySite(p("Name") ?? "", p("site") ?? "");
      const pass = p("Pass") ?? "";
      const nick = (p("NickName") ?? "").trim().replace(/,/g, "");
      const sex = (p("Sex") ?? "true").toLowerCase() === "true" ? 1 : 0;
      if (nickByteLength(nick) > 14) message = t("Tank.Request.VisualizeRegister.Long");
      else if (ILLEGAL.test(nick)) message = t("Tank.Request.VisualizeRegister.Illegalcharacters");
      else if (name && pass && nick) {
        await activePlayer(app.h, { userName: name, password: pass, sex: sex === 1, ip, site: p("site") ?? "" });
        const first = (s: string) => s.split(";")[0]!.split(",").map(Number);
        const code = await registerPlayer(app.h, {
          userName: name,
          nickName: nick,
          sex,
          boy: first(app.cfg.BOY_VISUALIZE_ITEM),
          girl: first(app.cfg.GIRL_VISUALIZE_ITEM),
          colors: { arm: "", hair: "", face: "", cloth: "", hat: "" },
          validDate: 0,
        });
        if (code === 0) {
          value = true;
          message = t("Tank.Request.VisualizeRegister.Success");
        } else if (code === 2 || code === 3) message = t(`PlayerBussiness.RegisterPlayer.Msg${code}`);
      }
    } catch (e) {
      app.log.warn(`VisualizeRegister: ${(e as Error).message}`);
    }
    return xml(result(value, message));
  },
  "Tank.Request/VisualizeRegister.ashx.cs",
);
