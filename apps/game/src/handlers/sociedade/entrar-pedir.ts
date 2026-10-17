/**
 * Aba no jogo: Sociedade › lista de sociedades (pedir pra entrar) e Sociedade › pedidos pendentes
 * (aceitar/recusar quem pediu, abrir ou fechar a sociedade pra novos pedidos).
 * Pacotes: 129 CONSORTIA_CMD sub 0 CONSORTIA_TRYIN, sub 4 CONSORTIA_TRYIN_PASS, sub 5 CONSORTIA_TRYIN_DEL,
 * sub 7 CONSORTIA_APPLY_STATE.
 * C#: `ConsortiaTryin.cs`, `ConsortiaTryinPass.cs`, `ConsortiaTryinDel.cs`, `ConsotiaApplyState.cs`.
 * Como testar: `apps/game/test/consortia.test.ts`. Manual: Sociedade (fora de clã) → Lista → Pedir entrada;
 * dentro do clã → Pedidos pendentes.
 */
import type { GSPacket } from "@ddt/protocol";
import * as Db from "../../db/consortia.js";
import { consortiaMgr } from "../../game/consortia-mgr.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { onJoined, pick, reply } from "./comum.js";

const MSG_APPLY = { 2: "ConsortiaBussiness.AddConsortiaApplyUsers.Msg2", 6: "ConsortiaBussiness.AddConsortiaApplyUsers.Msg6", 7: "ConsortiaBussiness.AddConsortiaApplyUsers.Msg7" };
const MSG_APPLY_DEL = { 2: "ConsortiaBussiness.DeleteConsortiaApplyUsers.Msg2" };
const MSG_APPLY_PASS = { 2: "ConsortiaBussiness.PassConsortiaApplyUsers.Msg2", 3: "ConsortiaBussiness.PassConsortiaApplyUsers.Msg3", 6: "ConsortiaBussiness.PassConsortiaApplyUsers.Msg6" };
const MSG_APPLY_STATE = { 2: "ConsortiaBussiness.UpdateConsotiaApplyState.Msg2" };

/** 0 CONSORTIA_TRYIN (ConsortiaTryin.cs) — int cid; cid 0 = cancelar o próprio pedido. */
export async function tryIn(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  if (p.info.ConsortiaID !== 0) return;
  const cid = pkt.readInt();
  const code = await Db.addApply(ctx.db.db, cid, p.id, p.info.NickName ?? "", ctx.now());
  const msg = code === 0 ? (cid !== 0 ? "ConsortiaApplyLoginHandler.ADD_Success" : "ConsortiaApplyLoginHandler.DELETE_Success") : pick(MSG_APPLY, code, "ConsortiaApplyLoginHandler.ADD_Failed");
  const out = reply(0);
  out.writeInt(cid); out.writeBoolean(code === 0); out.writeString(ctx.lang.t(msg));
  p.send(out);
}

/** 4 CONSORTIA_TRYIN_PASS (ConsortiaTryinPass.cs) — presidente/vice aceita um pedido; usa o fluxo comum de entrada. */
export async function tryInPass(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  if (p.info.ConsortiaID === 0) return;
  const m = await consortiaMgr(ctx);
  const applyId = pkt.readInt();
  const res = await Db.passApply(ctx.db.db, applyId, p.id, p.info.NickName ?? "", p.info.ConsortiaID);
  const ok = typeof res !== "number";
  if (ok) await onJoined(ctx, m, res, false, p.id, p.info.NickName ?? "");
  const out = reply(4);
  out.writeInt(applyId); out.writeBoolean(ok);
  out.writeString(ctx.lang.t(ok ? "ConsortiaApplyLoginPassHandler.Success" : pick(MSG_APPLY_PASS, res, "ConsortiaApplyLoginPassHandler.Failed")));
  p.send(out);
}

/** 5 CONSORTIA_TRYIN_DEL (ConsortiaTryinDel.cs) — cancelar (próprio) ou recusar (presidente/vice) um pedido. */
export async function tryInDel(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const applyId = pkt.readInt();
  const code = await Db.deleteApply(ctx.db.db, applyId, p.id, p.info.ConsortiaID);
  const msg = code === 0 ? (p.id === 0 ? "ConsortiaApplyAllyDeleteHandler.Success" : "ConsortiaApplyAllyDeleteHandler.Success2") : pick(MSG_APPLY_DEL, code, "ConsortiaApplyAllyDeleteHandler.Failed");
  const out = reply(5);
  out.writeInt(applyId); out.writeBoolean(code === 0); out.writeString(ctx.lang.t(msg));
  p.send(out);
}

/** 7 CONSORTIA_APPLY_STATE (ConsotiaApplyState.cs) — abre/fecha a sociedade pra novos pedidos de entrada. */
export async function applyState(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  if (p.info.ConsortiaID === 0) return;
  const open = pkt.readBoolean();
  const code = await Db.setApplyState(ctx.db.db, p.info.ConsortiaID, p.id, open);
  const out = reply(7);
  out.writeBoolean(open); out.writeBoolean(code === 0);
  out.writeString(ctx.lang.t(code === 0 ? "CONSORTIA_APPLY_STATE.Success" : pick(MSG_APPLY_STATE, code, "CONSORTIA_APPLY_STATE.Failed")));
  p.send(out);
}
