// Port of Tank.Request/Login.ashx.cs (+ BaseInterface.CreateLogin). SECURITY FIX: the PlayerManager.Login(name, pwd)
// check that 4.1 commented out is enforced against app."LoginSessions" (@ddt/auth consumeWebKey).
import { consumeWebKey, getNameBySite, removeSession, setSessionUserId } from "@ddt/auth";
import { base64ToBytes, rsaDecryptPkcs1 } from "@ddt/protocol";
import { el, result } from "../../lib/flash-xml.js";
import { t } from "../../lib/lang.js";
import { activePlayer, loginGame, userById } from "../players.js";
import { define, xml } from "../types.js";
import type { Row } from "../../lib/spec.js";

export const LOGIN_ITEM_SPEC = (p: Row, isFirst: number) =>
  el("Item", [
    ["ID", p.UserID as number],
    ["IsFirst", isFirst],
    ["NickName", (p.NickName as string) ?? ""],
    ["Date", ""],
    ["IsConsortia", 0],
    ["ConsortiaID", p.ConsortiaID as number],
    ["Sex", !!p.Sex],
    ["WinCount", p.Win as number],
    ["TotalCount", p.Total as number],
    ["EscapeCount", p.Escape as number],
    ["DutyName", (p.DutyName as string) ?? ""],
    ["GP", p.GP as number],
    ["Honor", ""],
    ["Style", (p.Style as string) || ",,,,,,,,"],
    ["Gold", p.Gold as number],
    ["Colors", (p.Colors as string) || ",,,,,,,,"],
    ["Attack", (p.Attack as number) ?? 0],
    ["Defence", (p.Defence as number) ?? 0],
    ["Agility", (p.Agility as number) ?? 0],
    ["Luck", (p.Luck as number) ?? 0],
    ["Grade", p.Grade as number],
    ["Hide", p.Hide as number],
    ["Repute", p.Repute as number],
    ["ConsortiaName", (p.ConsortiaName as string) ?? ""],
    ["Offer", p.Offer as number],
    ["Skin", (p.Skin as string) ?? ""],
    ["ReputeOffer", p.ReputeOffer as number],
    ["ConsortiaHonor", p.ConsortiaHonor as number],
    ["ConsortiaLevel", p.ConsortiaLevel as number],
    ["ConsortiaRepute", p.ConsortiaRepute as number],
    ["Money", Number(p.Money ?? 0) + Number(p.MoneyLock ?? 0)],
    ["AntiAddiction", p.AntiAddiction as number],
    ["IsMarried", !!p.IsMarried],
    ["SpouseID", (p.SpouseID as number) ?? 0],
    ["SpouseName", (p.SpouseName as string) ?? ""],
    ["MarryInfoID", p.MarryInfoID as number],
    ["IsCreatedMarryRoom", !!p.IsCreatedMarryRoom],
    ["IsGotRing", !!p.IsGotRing],
    ["LoginName", (p.UserName as string) ?? ""],
    ["Nimbus", p.Nimbus as number],
    ["FightPower", p.FightPower as number],
    ["AnswerSite", p.AnswerSite as number],
    ["WeaklessGuildProgressStr", (p.WeaklessGuildProgressStr as string) ?? ""],
    ["IsOldPlayer", false],
  ]);

export default define(
  "/Login.ashx",
  async ({ app, p, ip }) => {
    let value = false;
    let message = t("Tank.Request.Login.Fail1");
    const children = [];
    try {
      const raw = (p("p") ?? "").replace(/ /g, "+");
      if (!raw || !app.rsa) return xml(result(false, message));
      const src = rsaDecryptPkcs1(app.rsa, base64ToBytes(raw));
      const parts = Buffer.from(src.subarray(7)).toString("utf8").split(",");
      if (parts.length !== 4) return xml(result(false, message));
      const [rawName, pwd, newPwd, nickname] = parts as [string, string, string, string];
      const site = p("site") ?? "";
      const name = getNameBySite(rawName, site);
      const session = await consumeWebKey(app.h, name, pwd, newPwd, { gameKeyTtlMinutes: app.cfg.GAME_KEY_TTL_MIN });
      if (!session) {
        message = t("BaseInterface.LoginAndUpdate.Try");
        return xml(result(false, message));
      }
      // BaseInterface.CreateLogin
      let res = await loginGame(app.h, name, nickname);
      let isFirst = 0;
      let player: Row | undefined;
      if (!res) {
        const id = await activePlayer(app.h, { userName: name, password: newPwd, sex: true, ip, site });
        player = id ? await userById(app.h, id) : undefined;
        if (!player) message = t("BaseInterface.LoginAndUpdate.Fail");
      } else {
        const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
        if (!res.isExist || (res.forbidDate && res.forbidDate > now)) {
          const d = res.forbidDate ?? now;
          message = t("ManageBussiness.Forbid1", d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes());
        } else {
          player = res.player;
          isFirst = res.isFirst;
        }
      }
      if (player) {
        await setSessionUserId(app.h, name, Number(player.UserID));
        children.push(LOGIN_ITEM_SPEC(player, isFirst));
        value = true;
        message = t("Tank.Request.Login.Success");
      } else {
        await removeSession(app.h, name);
      }
      res = null;
    } catch (e) {
      app.log.warn(`Login.ashx: ${(e as Error).message}`);
      value = false;
      message = t("Tank.Request.Login.Fail2");
    }
    return xml(result(value, message, children));
  },
  "Tank.Request/Login.ashx.cs",
);
