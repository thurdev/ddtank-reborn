/**
 * Aba no jogo: Sociedade › loja de habilidades (comprar bônus/buff pro clã todo ou só pra si, pagando com
 * Riqueza, Oferta pessoal ou Medalha).
 * Pacotes: 129 CONSORTIA_CMD sub 26 SKILL_SOCKET.
 * C#: `SkillSocket.cs`.
 * Como testar: `apps/game/test/consortia.test.ts`. Manual: Sociedade → Loja de habilidades → comprar um bônus.
 */
import type { GSPacket } from "@ddt/protocol";
import * as Db from "../../db/consortia.js";
import { buffTypeForGroup, personalRiches, skillCost } from "../../game/consortia.js";
import { consortiaMgr } from "../../game/consortia-mgr.js";
import type { GameClient } from "../../session/client.js";
import type { GamePlayer } from "../../game/player.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";
import { GM_NOTICE } from "./comum.js";

/** Cooldown de 2s por jogador contra clique duplo (igual ao original `lastRequest`). */
function lastRequest(p: GamePlayer): { t: number } {
  const o = p as unknown as { __consortiaLast?: { t: number } };
  return (o.__consortiaLast ??= { t: 0 });
}

/**
 * 26 SKILL_SOCKET (SkillSocket.cs) — compra um buff do clã (`m.buffs`) por `days` dias, pagando com
 * `payType` (Riqueza do clã, Oferta pessoal ou Medalha, decidido em `skillCost`). Se `bt.guildWide`, todo
 * membro online recebe o buff; senão só quem comprou.
 */
export async function skillSocket(ctx: ServerContext, p: GamePlayer, pkt: GSPacket, client: GameClient): Promise<void> {
  if (p.info.ConsortiaID === 0) return client.disconnect("consortia SKILL_SOCKET without guild");
  const m = await consortiaMgr(ctx);
  const last = lastRequest(p);
  const nowMs = Date.now();
  if (last.t + 2000 > nowMs) return p.sendMessage(0, ctx.lang.t("GoSlow"));
  last.t = nowMs;
  pkt.readBoolean();
  const id = pkt.readInt();
  const days = pkt.readInt();
  const payType = pkt.readInt();
  const buff = m.buffs.get(id);
  if (!buff) return p.sendMessage(GM_NOTICE, ctx.lang.t("Consortia.Msg1"));
  const c = await Db.getConsortia(ctx.db.db, p.info.ConsortiaID);
  if (!c) return;
  const cost = skillCost(buff, days, payType, c, { riches: personalRiches(p.info), medals: p.medal });
  if (!cost.ok) return p.sendMessage(GM_NOTICE, ctx.lang.t(cost.msg));
  const bt = buffTypeForGroup(buff.group);
  if (!bt) return p.sendMessage(GM_NOTICE, ctx.lang.t("Consortia.Msg2"));
  if (cost.source === "guild") {
    if (!(await Db.removeRiches(ctx.db.db, c.ConsortiaID, cost.amount))) return p.sendMessage(GM_NOTICE, ctx.lang.t("Consortia.Msg6"));
    await m.refreshRiches(c.ConsortiaID);
  } else if (cost.source === "player") {
    p.info.RichesOffer = Math.max(0, p.info.RichesOffer - cost.amount);
    p.updateProperties();
  } else p.removeMedal(cost.amount);
  const now = ctx.now();
  const add = (o: GamePlayer) => {
    const ex = o.buffs.find((b) => b.Type === bt.type && b.IsExist && b.BeginDate.getTime() + b.ValidDate * 60_000 > now.getTime());
    if (ex) {
      ex.ValidDate += cost.minutes;
      ex.Value = buff.value;
      ex.Data = String(buff.id);
    } else {
      o.buffs = o.buffs.filter((b) => b.Type !== bt.type);
      o.buffs.push({ UserID: o.id, Type: bt.type, Value: buff.value, BeginDate: now, ValidDate: cost.minutes, TemplateID: 0, ValidCount: 1, Data: String(buff.id), IsExist: true });
    }
    o.send(Out.bufferList(o.id, o.buffs));
    o.send(m.buffPacket(o, now));
  };
  if (bt.guildWide) {
    for (const o of m.online(c.ConsortiaID)) {
      add(o);
      if (o !== p) o.sendMessage(GM_NOTICE, ctx.lang.t("Consortia.Msg3"));
    }
    await Db.saveGuildBuffer(ctx.db.db, { ConsortiaID: c.ConsortiaID, BufferID: buff.id, IsOpen: true, BeginDate: now, ValidDate: cost.minutes, Type: bt.type, Value: buff.value });
  } else add(p);
  p.sendMessage(GM_NOTICE, ctx.lang.t("Consortia.Msg4"));
}
