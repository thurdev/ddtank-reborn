// Port of Tank.Request/LoginSelectList.ashx.cs (SP_Users_LoginList + FlashUtils.CreateUserLoginList).
import { getNameBySite } from "@ddt/auth";
import { el, isoDate, result, wallNow, type XEl } from "../../lib/flash-xml.js";
import { usersByName } from "../players.js";
import { define, xml } from "../types.js";

export default define(
  "/LoginSelectList.ashx",
  async ({ app, p }) => {
    const items: XEl[] = [];
    let ok = false;
    try {
      const name = getNameBySite(p("username") ?? "", p("site") ?? "");
      const list = await usersByName(app.h, name);
      if (list.length) {
        for (const u of list) {
          if (!u.NickName) continue;
          items.push(
            el("Item", [
              ["ID", u.UserID as number],
              ["UserName", (u.UserName as string) ?? ""],
              ["NickName", (u.NickName as string) ?? ""],
              ["Grade", u.Grade as number],
              ["Repute", u.Repute as number],
              ["Sex", !!u.Sex],
              ["WinCount", u.Win as number],
              ["TotalCount", u.Total as number],
              ["ConsortiaName", (u.ConsortiaName as string) ?? ""],
              ["Rename", !!u.Rename],
              ["IsVIP", Number(u.typeVIP ?? 0) > 0],
              ["VIPLevel", (u.VIPLevel as number) ?? 0],
              ["ConsortiaRename", u.ConsortiaRename ? u.NickName === u.ChairmanName : false],
              ["EscapeCount", u.Escape as number],
              ["IsFirst", u.IsFirst as number],
              ["LastDate", isoDate(new Date(wallNow().getTime() - 86_400_000))],
            ]),
          );
        }
        ok = true;
      }
    } catch (e) {
      app.log.warn(`LoginSelectList: ${(e as Error).message}`);
    }
    return xml(result(ok, ok ? "Success!" : "Fail!", items));
  },
  "Tank.Request/LoginSelectList.ashx.cs",
);
