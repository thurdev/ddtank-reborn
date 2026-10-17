/**
 * Aba no jogo: Sociedade › emblema (comprar um emblema pro clã, pagando com Riqueza).
 * Pacotes: 129 CONSORTIA_CMD sub 28 BUY_BADGE.
 * C#: `BuyBadge.cs`.
 * Como testar: `apps/game/test/consortia.test.ts`. Manual: Sociedade → Emblema → comprar.
 */
import type { GSPacket } from "@ddt/protocol";
import * as Db from "../../db/consortia.js";
import { checkBadge } from "../../game/consortia.js";
import { consortiaMgr } from "../../game/consortia-mgr.js";
import type { GamePlayer } from "../../game/player.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";
import { reply } from "./comum.js";

/**
 * 28 BUY_BADGE (BuyBadge.cs) — `checkBadge` confere Riqueza do clã e o direito de quem compra; o custo é
 * descontado depois (`SP_ConsortiaRiches_Update`, mesmo direito `Enounce` do emblema), igual ao original.
 */
export async function buyBadge(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  if (p.info.ConsortiaID === 0) return;
  const m = await consortiaMgr(ctx);
  const badgeId = pkt.readInt();
  const badge = m.badges.get(badgeId);
  if (!badge) return p.sendMessage(0, ctx.lang.t("BuyBadge.BadgeNotFound"));
  const cid = p.info.ConsortiaID;
  const c = await Db.getConsortia(ctx.db.db, cid);
  if (!c) return;
  const chk = checkBadge(c.Riches, badge.Cost, p.info.Right);
  if (chk === "riches") return p.sendMessage(0, m.t("ConsortiaBussiness.Riches.Msg3", "Riqueza do Clã insuficiente."));
  const now = ctx.now();
  const buyTime = now.toISOString().slice(0, 19).replace("T", " ");
  const validDate = 30;
  let ok = chk === "ok" && (await Db.setBadge(ctx.db.db, cid, p.id, badgeId, validDate, buyTime)) === 0;
  // o C# descontava o custo depois (SP_ConsortiaRiches_Update, mesmo direito Enounce do emblema)
  if (ok && (await Db.spendRiches(ctx.db.db, cid, p.id, badge.Cost)) !== 0) ok = false;
  if (ok) {
    await m.refreshRiches(cid);
    for (const o of m.online(cid)) {
      o.info.badgeID = badgeId;
      if (o !== p) o.sendMessage(0, ctx.lang.t("Consortia.Msg7"));
      o.updateProperties();
    }
  }
  const out = reply(28, p.id);
  out.writeInt(cid); out.writeInt(badgeId); out.writeInt(validDate); Out.wd(out, now); out.writeBoolean(ok);
  p.send(out);
  p.sendMessage(0, ctx.lang.t(ok ? "BuyBadgeHandler.Success" : chk === "right" ? "ConsortiaBussiness.BuyBadge.Msg2" : "BuyBadgeHandler.Fail"));
}
