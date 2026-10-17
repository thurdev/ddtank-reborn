/**
 * Aba no jogo: Sociedade › sair do clã (próprio id) ou expulsar membro (presidente/cargo com direito).
 * Pacotes: 129 CONSORTIA_CMD sub 3 CONSORTIA_RENEGADE.
 * C#: `ConsortiaRenegade.cs`.
 * Como testar: `apps/game/test/consortia.test.ts`. Manual: Sociedade → Membros → Sair / Expulsar.
 */
import type { GSPacket } from "@ddt/protocol";
import * as Db from "../../db/consortia.js";
import { ConsortiaMgr, consortiaMgr } from "../../game/consortia-mgr.js";
import type { GamePlayer } from "../../game/player.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";
import { pick, reply } from "./comum.js";

const MSG_REMOVE = { 2: "ConsortiaBussiness.DeleteConsortiaUser.Msg2", 3: "ConsortiaBussiness.DeleteConsortiaUser.Msg3", 4: "ConsortiaBussiness.DeleteConsortiaUser.Msg4", 5: "ConsortiaBussiness.DeleteConsortiaUser.Msg5" };

/**
 * 3 CONSORTIA_RENEGADE (ConsortiaRenegade.cs) — int id: `id === p.id` é o próprio jogador saindo, qualquer
 * outro id é expulsão (checada em `Db.removeMember`, que confere o direito de quem está expulsando).
 */
export async function renegade(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  if (p.info.ConsortiaID === 0) return;
  const m = await consortiaMgr(ctx);
  const id = pkt.readInt();
  const self = id === p.id;
  const cid = p.info.ConsortiaID;
  const res = await Db.removeMember(ctx.db.db, p.id, id, cid, ctx.now());
  let msg = pick(MSG_REMOVE, res.code, self ? "ConsortiaUserDeleteHandler.ExitFailed" : "ConsortiaUserDeleteHandler.KickFailed");
  if (res.code === 0) {
    msg = self ? "ConsortiaUserDeleteHandler.ExitSuccess" : "ConsortiaUserDeleteHandler.KickSuccess";
    const pk = ConsortiaMgr.response(3);
    pk.writeInt(id); pk.writeInt(cid); pk.writeBoolean(!self); pk.writeString(res.nick ?? ""); pk.writeString(p.info.NickName ?? "");
    const target = ctx.world.get(id);
    const recipients = new Set([...m.online(cid), ...(target ? [target] : [])]);
    if (target) await m.clearConsortia(target);
    if (self) p.send(Out.mailResponse(p.id, 1));
    for (const o of recipients) o.send(pk);
  }
  const out = reply(3);
  out.writeInt(id); out.writeBoolean(res.code === 0); out.writeString(ctx.lang.t(msg));
  p.send(out);
}
