/**
 * Aba no jogo: Sociedade › cargos (criar/editar/remover patente, promover/rebaixar membro, banir chat de
 * um membro, transferir presidência).
 * Pacotes: 129 CONSORTIA_CMD sub 9 CONSORTIA_DUTY_DELETE, sub 10 CONSORTIA_DUTY_UPDATE,
 * sub 16 CONSORTIA_BANCHAT_UPDATE, sub 18 CONSORTIA_USER_GRADE_UPDATE, sub 19 CONSORTIA_CHAIRMAN_CHAHGE.
 * C#: `ConsortiaDutyDelete.cs`, `ConsortiaDutyUpdate.cs`, `ConsortiaIsBanChat.cs`, `ConsortiaUserGradeUpdate.cs`,
 * `ConsortiaChangeChairman.cs`.
 * Como testar: `apps/game/test/consortia.test.ts`. Manual: Sociedade → Membros/Cargos.
 */
import type { GSPacket } from "@ddt/protocol";
import * as Db from "../../db/consortia.js";
import { defaultByteCount } from "../../game/consortia.js";
import { ConsortiaMgr, consortiaMgr } from "../../game/consortia-mgr.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { GM_NOTICE, pick, reply } from "./comum.js";

const MSG_DUTY_DEL = { 2: "ConsortiaBussiness.DeleteConsortiaDuty.Msg2", 3: "ConsortiaBussiness.DeleteConsortiaDuty.Msg3" };
const MSG_DUTY = { 2: "ConsortiaBussiness.UpdateConsortiaDuty.Msg2", 3: "ConsortiaBussiness.UpdateConsortiaDuty.Msg3", 4: "ConsortiaBussiness.UpdateConsortiaDuty.Msg3", 5: "ConsortiaBussiness.DeleteConsortiaDuty.Msg5" };
const MSG_BAN = { 2: "ConsortiaBussiness.UpdateConsortiaIsBanChat.Msg2", 3: "ConsortiaBussiness.UpdateConsortiaIsBanChat.Msg3" };
const MSG_GRADE = { 2: "ConsortiaBussiness.UpdateConsortiaUserGrade.Msg2", 4: "ConsortiaBussiness.UpdateConsortiaUserGrade.Msg4", 5: "ConsortiaBussiness.UpdateConsortiaUserGrade.Msg5" };
const MSG_CHAIRMAN = { 1: "ConsortiaBussiness.UpdateConsortiaChairman.Msg3", 2: "ConsortiaBussiness.UpdateConsortiaChairman.Msg2" };

/** 9 CONSORTIA_DUTY_DELETE (ConsortiaDutyDelete.cs) — remove uma patente (membros nela voltam pra "sem cargo"). */
export async function dutyDelete(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  if (p.info.ConsortiaID === 0) return;
  const dutyId = pkt.readInt();
  const code = await Db.deleteDuty(ctx.db.db, dutyId, p.info.ConsortiaID);
  const out = reply(9);
  out.writeInt(dutyId); out.writeBoolean(code === 0);
  out.writeString(ctx.lang.t(code === 0 ? "ConsortiaDutyDeleteHandler.Success" : pick(MSG_DUTY_DEL, code, "ConsortiaDutyDeleteHandler.Failed")));
  p.send(out);
}

/** 10 CONSORTIA_DUTY_UPDATE (ConsortiaDutyUpdate.cs) — criar (type 2, com nome) ou editar patente; sem resposta
 *  direta, só o broadcast 128.8 (`m.broadcastDuty`). type 1 (apagar aqui) é ignorado — já tem o sub 9 próprio. */
export async function dutyUpdate(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  if (p.info.ConsortiaID === 0) return;
  const m = await consortiaMgr(ctx);
  const dutyId = pkt.readInt();
  const type = pkt.readByte();
  let name = "";
  if (type === 1) return;
  if (type === 2) {
    name = pkt.readString();
    if (!name || defaultByteCount(name) > 10) return p.sendMessage(GM_NOTICE, ctx.lang.t("ConsortiaDutyUpdateHandler.Long"));
    pkt.readInt(); // Right: ignorado pelo SP_ConsortiaDuty_Update, igual ao original
  }
  const res = await Db.updateDuty(ctx.db.db, { dutyId, consortiaId: p.info.ConsortiaID, userId: p.id, type, name });
  if (res.code !== 0) return p.sendMessage(GM_NOTICE, ctx.lang.t(pick(MSG_DUTY, res.code, "ConsortiaDutyUpdateHandler.Failed")));
  m.broadcastDuty(type, p.info.ConsortiaID, 0, "", res.duty!.Level, res.duty!.DutyName, res.duty!.Right, 0, "");
}

/** 16 CONSORTIA_BANCHAT_UPDATE (ConsortiaIsBanChat.cs) — liga/desliga o banimento de chat de um membro. */
export async function banChatUpdate(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  if (p.info.ConsortiaID === 0) return;
  const id = pkt.readInt();
  const ban = pkt.readBoolean();
  const res = await Db.setBanChat(ctx.db.db, id, p.info.ConsortiaID, p.id, ban);
  if (res.code === 0) {
    const t = ctx.world.get(res.id!);
    if (t) {
      t.info.IsBanChat = ban;
      const pk = ConsortiaMgr.response(5);
      pk.writeBoolean(ban); pk.writeInt(res.id!); pk.writeString(res.name ?? ""); pk.writeInt(p.id); pk.writeString(p.info.NickName ?? "");
      t.send(pk);
    }
  }
  const out = reply(16);
  out.writeInt(id); out.writeBoolean(ban); out.writeBoolean(res.code === 0);
  out.writeString(ctx.lang.t(res.code === 0 ? "ConsortiaIsBanChatHandler.Success" : pick(MSG_BAN, res.code, "ConsortiaIsBanChatHandler.Failed")));
  p.send(out);
}

/** 18 CONSORTIA_USER_GRADE_UPDATE (ConsortiaUserGradeUpdate.cs) — promove (`up`) ou rebaixa um membro de patente. */
export async function userGradeUpdate(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  if (p.info.ConsortiaID === 0) return;
  const m = await consortiaMgr(ctx);
  const id = pkt.readInt();
  const up = pkt.readBoolean();
  const res = await Db.updateUserGrade(ctx.db.db, id, p.info.ConsortiaID, p.id, up);
  if (res.code === 0) m.broadcastDuty(up ? 6 : 7, p.info.ConsortiaID, id, res.userName ?? "", res.duty!.Level, res.duty!.DutyName, res.duty!.Right, p.id, p.info.NickName ?? "");
  const out = reply(18);
  out.writeInt(id); out.writeBoolean(up); out.writeBoolean(res.code === 0);
  out.writeString(ctx.lang.t(res.code === 0 ? "ConsortiaUserGradeUpdateHandler.Success" : pick(MSG_GRADE, res.code, "ConsortiaUserGradeUpdateHandler.Failed")));
  p.send(out);
}

/** 19 CONSORTIA_CHAIRMAN_CHAHGE (ConsortiaChangeChairman.cs) — transfere a presidência pro `nick` informado. */
export async function chairmanChange(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  if (p.info.ConsortiaID === 0) return;
  const m = await consortiaMgr(ctx);
  const nick = pkt.readString();
  let ok = false;
  let msg = "ConsortiaChangeChairmanHandler.Failed";
  if (!nick) msg = "ConsortiaChangeChairmanHandler.NoName";
  else if (nick === p.info.NickName) msg = "ConsortiaChangeChairmanHandler.Self";
  else {
    const cid = p.info.ConsortiaID;
    const res = await Db.changeChairman(ctx.db.db, nick, cid, p.id);
    if (res.code === 0) {
      ok = true;
      msg = "ConsortiaChangeChairmanHandler.Success1";
      const cd = res.chairDuty!;
      m.broadcastDuty(9, cid, res.target!.id, res.target!.name, cd.Level, cd.DutyName, cd.Right, 0, "");
      m.broadcastDuty(8, cid, p.id, p.info.NickName ?? "", res.oldDuty!.Level, res.oldDuty!.DutyName, res.oldDuty!.Right, 0, "");
      for (const o of m.online(cid)) o.info.ChairmanName = res.target!.name;
    } else msg = pick(MSG_CHAIRMAN, res.code, msg);
  }
  const out = reply(19);
  out.writeString(nick); out.writeBoolean(ok);
  out.writeString(ok ? ctx.lang.t(msg) + nick + ctx.lang.t("ConsortiaChangeChairmanHandler.Success2") : ctx.lang.t(msg));
  p.send(out);
}
