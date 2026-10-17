/**
 * Aba no jogo: Academia › pedir (jogador manda pedido pra ser mestre ou aprendiz de alguém) e recusar
 * pedido recebido.
 * Pacotes: 141 ACADEMY sub 4 ACADEMY_FOR_APPRENTICE, sub 5 ACADEMY_FOR_MASTER, sub 8 MASTER_REFUSE,
 * sub 9 APPRENTICE_REFUSE.
 * C#: `AcademyHandler.cs` casos ACADEMY_FOR_APPRENTICE/ACADEMY_FOR_MASTER/MASTER_REFUSE/APPRENTICE_REFUSE.
 * Como testar: `apps/game/test/academy.test.ts`. Manual: Academia → clicar num jogador na lista →
 * Pedir / Recusar.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { askPacket, checkCanApp, checkCanMaster, FROZEN_MSG, frozen, getRequest, MASTER_FULL_STATE, removeRequest, requests, systemNotice, type Rel } from "./relacao.js";

/** 141/4 ACADEMY_FOR_APPRENTICE — pedir pra `id` ser seu aprendiz (você já pode ser mestre). */
export function academyForApprentice(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const id = pkt.readInt();
  const msg = pkt.readString();
  if (getRequest(ctx, p.id, id)) return;
  if (frozen(p.info as Rel)) return p.sendMessage(0, FROZEN_MSG(p.info as Rel));
  const o = ctx.world.get(id);
  if (!o || o.info.apprenticeshipState >= MASTER_FULL_STATE || !checkCanMaster(o.info.Grade)) return p.sendMessage(0, "Este jogador não está online.");
  requests(ctx).push({ sender: p.id, receiver: id, type: 1, at: Date.now() });
  o.send(askPacket(4, p.id, p.info.NickName ?? "", msg));
}

/** 141/5 ACADEMY_FOR_MASTER — pedir pra `id` ser seu mestre. */
export function academyForMaster(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const id = pkt.readInt();
  const msg = pkt.readString();
  if (getRequest(ctx, p.id, id)) return;
  if (frozen(p.info as Rel)) return p.sendMessage(0, FROZEN_MSG(p.info as Rel));
  const o = ctx.world.get(id);
  if (!o || o.info.masterID !== 0 || !checkCanApp(o.info.Grade)) return p.sendMessage(0, "Este jogador não está online.");
  requests(ctx).push({ sender: p.id, receiver: id, type: 0, at: Date.now() });
  o.send(askPacket(5, p.id, p.info.NickName ?? "", msg));
}

/** 141/8 MASTER_REFUSE — recusar um pedido de aprendizado recebido (você como futuro mestre). */
export function masterRefuse(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const id = pkt.readInt();
  const r = getRequest(ctx, id, p.id);
  if (!r || r.type !== 1) return;
  removeRequest(ctx, r);
  ctx.world.get(id)?.send(systemNotice(ctx.lang.t("Game.Server.AppSystem.MasterRefuse", p.info.NickName), false));
}

/** 141/9 APPRENTICE_REFUSE — recusar um pedido de mestria recebido (você como futuro aprendiz). */
export function apprenticeRefuse(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const id = pkt.readInt();
  const r = getRequest(ctx, id, p.id);
  if (!r || r.type !== 0) return;
  removeRequest(ctx, r);
  ctx.world.get(id)?.send(systemNotice(ctx.lang.t("Game.Server.AppSystem.ApprenticeRefuse", p.info.NickName), false));
}
