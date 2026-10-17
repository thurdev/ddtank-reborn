/**
 * Aba no jogo: Academia › aceitar pedido (mestre aceita aprendiz, ou aprendiz aceita mestre).
 * Pacotes: 141 ACADEMY sub 6 MASTER_CONFIRM, sub 7 APPRENTICE_CONFIRM.
 * C#: `AcademyHandler.cs` casos MASTER_CONFIRM/APPRENTICE_CONFIRM, `AcademyMgr.AddApprentice`.
 * Como testar: `apps/game/test/academy.test.ts`. Manual: Academia → aba de pedidos recebidos → Aceitar.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { addRel, appState, checkCanApp, checkCanMaster, FROZEN_MSG, frozen, getRequest, hoursLeft, LEVEL_GAP, mailTo, removeRequest, saveAcademy, systemNotice, type Rel } from "./relacao.js";

/** AcademyMgr.AddApprentice: liga master<->app nos dois lados e persiste. */
export async function addApprentice(ctx: ServerContext, master: GamePlayer, app: GamePlayer): Promise<boolean> {
  const m = master.info as Rel;
  const a = app.info as Rel;
  if (a.masterID !== 0 || !addRel(m, a.ID, a.NickName ?? "")) return false;
  a.masterID = m.ID;
  addRel(a, m.ID, m.NickName ?? "");
  app.send(appState(a, -1));
  master.send(appState(m, -1));
  await saveAcademy(ctx, a);
  await saveAcademy(ctx, m);
  return true;
}

/** 141/6 MASTER_CONFIRM — o mestre aceita o pedido de um aprendiz. */
export async function masterConfirm(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const id = pkt.readInt();
  const r = getRequest(ctx, id, p.id);
  if (!r || r.type !== 1) return p.sendMessage(0, "Inscrição inexistente ou já removida.");
  removeRequest(ctx, r);
  if (frozen(p.info as Rel)) return p.sendMessage(0, FROZEN_MSG(p.info as Rel));
  if (p.info.apprenticeshipState >= 3 || !checkCanMaster(p.info.Grade)) return p.sendMessage(0, "Que pena, o jogador já é mestre. Tente outra vez!");
  const app = ctx.world.get(id);
  if (!app || !checkCanApp(app.info.Grade)) return p.sendMessage(0, "O jogador não está online, aguarde ou tente mais tarde!");
  if (!(await addApprentice(ctx, p, app))) return p.sendMessage(0, "Que pena, o jogador já tem um mestre. Seja mais rápido da próxima vez");
  app.send(systemNotice(`[${p.info.NickName}] aceitou você como mestre`, true));
  await mailTo(ctx, p.id, p.info.NickName ?? "", ctx.lang.t("Game.Server.AppSystem.TakeApprenticeMail.Title"), ctx.lang.t("Game.Server.AppSystem.TakeApprenticeMail.Content"));
  p.sendMessage(0, `[${app.info.NickName}] aceitou ser seu aluno`);
}

/** 141/7 APPRENTICE_CONFIRM — o aprendiz aceita o pedido de um mestre. */
export async function apprenticeConfirm(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const id = pkt.readInt();
  const r = getRequest(ctx, id, p.id);
  if (!r || r.type !== 0) return p.sendMessage(0, ctx.lang.t("Game.Server.AppSystem.AppClub.RemoveInfo.RecordNotFound"));
  removeRequest(ctx, r);
  if (frozen(p.info as Rel)) return p.sendMessage(0, ctx.lang.t("Game.Server.AppSystem.BeApprentice.Frozen", hoursLeft(p.info.freezesDate)));
  if (p.info.masterID !== 0 || !checkCanApp(p.info.Grade)) return p.sendMessage(0, ctx.lang.t("Game.Server.AppSystem.BeApprentice.Failed"));
  const master = ctx.world.get(id);
  if (!master || master.info.Grade < p.info.Grade + LEVEL_GAP || !checkCanMaster(master.info.Grade)) return p.sendMessage(0, ctx.lang.t("LoginServerConnector.HandleSysMess.Msg2"));
  if (!(await addApprentice(ctx, master, p))) return p.sendMessage(0, ctx.lang.t("Game.Server.AppSystem.AlreadlyHasRelationship.Apprentice"));
  master.send(systemNotice(ctx.lang.t("Game.Server.AppSystem.ApprenticeConfirm", p.info.NickName), true));
  await mailTo(ctx, master.id, master.info.NickName ?? "", ctx.lang.t("Game.Server.AppSystem.TakeApprenticeMail.Title"), ctx.lang.t("Game.Server.AppSystem.TakeApprenticeMail.Content"));
  p.sendMessage(0, ctx.lang.t("Game.Server.AppSystem.MasterConfirm", master.info.NickName));
}
