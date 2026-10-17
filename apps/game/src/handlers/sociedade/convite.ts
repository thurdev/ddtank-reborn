/**
 * Aba no jogo: Sociedade › convidar jogador (e aceitar/recusar convite recebido).
 * Pacotes: 129 CONSORTIA_CMD sub 11 CONSORTIA_INVITE, sub 12 CONSORTIA_INVITE_PASS, sub 13 CONSORTIA_INVITE_DELETE.
 * C#: `ConsortiaInviteAdd.cs`, `ConsortiaInvitePass.cs`, `ConsortiaInviteDelete.cs`. Fix no sub 12: o C# escrevia
 * os campos do resultado no pacote *de entrada* (reaproveitado), então a resposta real era só `{12, id}` e o
 * cliente lia lixo — aqui a resposta sai completa (`{12, id, ok, cid, nome, msg}`).
 * Como testar: `apps/game/test/consortia.test.ts`. Manual: dentro do clã → Convidar; fora do clã → convite recebido
 * → Aceitar/Recusar.
 */
import type { GSPacket } from "@ddt/protocol";
import * as Db from "../../db/consortia.js";
import { ConsortiaMgr, consortiaMgr } from "../../game/consortia-mgr.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { onJoined, pick, reply } from "./comum.js";

const MSG_INVITE = { 2: "ConsortiaBussiness.AddConsortiaInviteUsers.Msg2", 4: "ConsortiaBussiness.AddConsortiaInviteUsers.Msg4", 5: "ConsortiaBussiness.AddConsortiaInviteUsers.Msg5", 6: "ConsortiaBussiness.AddConsortiaInviteUsers.Msg6" };
const MSG_INVITE_PASS = { 3: "ConsortiaBussiness.PassConsortiaInviteUsers.Msg3", 6: "ConsortiaBussiness.PassConsortiaInviteUsers.Msg6" };

/** 11 CONSORTIA_INVITE (ConsortiaInviteAdd.cs) — avisa o convidado em tempo real (128.4) se ele estiver online. */
export async function inviteAdd(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  if (p.info.ConsortiaID === 0) return;
  const nick = pkt.readString();
  if (!nick) return;
  const res = await Db.addInvite(ctx.db.db, { consortiaId: p.info.ConsortiaID, inviterId: p.id, inviterName: p.info.NickName ?? "", nick, now: ctx.now() });
  if (res.code === 0) {
    const target = ctx.world.get(res.userId!);
    if (target) {
      const pk = ConsortiaMgr.response(4);
      pk.writeInt(res.id!); pk.writeInt(res.userId!); pk.writeString(nick); pk.writeInt(p.id); pk.writeString(p.info.NickName ?? "");
      pk.writeInt(p.info.ConsortiaID); pk.writeString(res.consortiaName ?? p.info.ConsortiaName);
      target.send(pk);
    }
  }
  const out = reply(11);
  out.writeString(nick); out.writeBoolean(res.code === 0);
  out.writeString(ctx.lang.t(res.code === 0 ? "ConsortiaInviteAddHandler.Success" : pick(MSG_INVITE, res.code, "ConsortiaInviteAddHandler.Failed")));
  p.send(out);
}

/** 12 CONSORTIA_INVITE_PASS (ConsortiaInvitePass.cs) — aceitar convite; usa o fluxo comum de entrada. */
export async function invitePass(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  if (p.info.ConsortiaID !== 0) return;
  const m = await consortiaMgr(ctx);
  const inviteId = pkt.readInt();
  const res = await Db.passInvite(ctx.db.db, inviteId, p.id, p.info.NickName ?? "");
  const ok = typeof res !== "number";
  if (ok) await onJoined(ctx, m, res, true, res.otherId, res.otherName);
  const out = reply(12);
  out.writeInt(inviteId); out.writeBoolean(ok); out.writeInt(ok ? res.consortiaId : 0); out.writeString(ok ? res.consortiaName : "");
  out.writeString(ctx.lang.t(ok ? "ConsortiaInvitePassHandler.Success" : pick(MSG_INVITE_PASS, res, "ConsortiaInvitePassHandler.Failed")));
  p.send(out);
}

/** 13 CONSORTIA_INVITE_DELETE (ConsortiaInviteDelete.cs) — recusar convite ou o próprio convidador cancelar. */
export async function inviteDelete(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const id = pkt.readInt();
  const code = await Db.deleteInvite(ctx.db.db, id, p.id);
  const out = reply(13);
  out.writeInt(id); out.writeBoolean(code === 0); out.writeString(ctx.lang.t(code === 0 ? "ConsortiaInviteDeleteHandler.Success" : "ConsortiaInviteDeleteHandler.Failed"));
  p.send(out);
}
