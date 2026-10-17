/**
 * Aba no jogo: Academia › romper relação (mestre expulsa aprendiz, ou aprendiz abandona mestre). Os dois
 * custam ouro e deixam o jogador "congelado" (sem poder pedir de novo) por algumas horas.
 * Pacotes: 141 ACADEMY sub 12 FIRE_MASTER, sub 13 FIRE_APPRENTICE.
 * C#: `AcademyHandler.cs` casos FIRE_MASTER/FIRE_APPRENTICE, `AcademyMgr.FireApprentice`/`FireMaster`.
 * Como testar: `apps/game/test/academy.test.ts`. Manual: Academia → seu mestre/aprendiz → Romper relação.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { appState, infoOf, MASTER_STATE, removeRel, saveAcademy, systemNotice, writeRel, parseRel, type Rel } from "./relacao.js";

/** AcademyMgr.FireApprentice: o mestre `master` desliga o aprendiz `uid`. */
export async function fireApprentice(ctx: ServerContext, master: GamePlayer, uid: number, silent: boolean): Promise<boolean> {
  if (!removeRel(master.info as Rel, uid)) return false;
  const o = await infoOf(ctx, uid);
  if (!o) return true;
  removeRel(o.info, o.info.masterID);
  o.info.masterID = 0;
  writeRel(o.info, parseRel(o.info.masterOrApprentices));
  await saveAcademy(ctx, o.info);
  if (o.online) {
    if (!silent) o.online.send(systemNotice(ctx.lang.t("Game.Server.AppSystem.BreakApprenticeShipMsg.Apprentice", master.info.NickName), true));
    o.online.send(appState(o.info, uid));
  }
  return true;
}

/** AcademyMgr.FireMaster: o aprendiz `app` deixa o mestre dele (ou se graduou, `isComplete`). */
export async function fireMaster(ctx: ServerContext, app: GamePlayer, isComplete: boolean): Promise<boolean> {
  const a = app.info as Rel;
  const masterId = a.masterID;
  if (!removeRel(a, masterId)) return false;
  const o = await infoOf(ctx, masterId);
  if (o) {
    if (isComplete) o.info.graduatesCount++;
    removeRel(o.info, app.id);
    await saveAcademy(ctx, o.info);
    if (o.online) {
      if (!isComplete) o.online.send(systemNotice(ctx.lang.t("Game.Server.AppSystem.BreakApprenticeShipMsg.Master", a.NickName), true));
      o.online.send(appState(o.info, app.id));
    }
  }
  a.masterID = 0;
  writeRel(a, parseRel(a.masterOrApprentices));
  return true;
}

/** 141/12 FIRE_MASTER — o aprendiz abandona o mestre (20000 ouro congelado ao sucesso, fixed: o original
 * cobrava antes de checar a relação e nunca devolvia na falha). */
export async function fireMasterPacket(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const id = pkt.readInt();
  if (p.info.Gold < 10000) return p.sendMessage(0, ctx.lang.t("Game.Server.AppSystem.BreakApprentice.NotEnoughGold"));
  if (p.info.masterID !== id || !(await fireMaster(ctx, p, false))) return p.sendMessage(0, ctx.lang.t("Game.Server.AppSystem.BreakApprentice.FireApprenticeCD"));
  p.removeGold(10000);
  p.info.freezesDate = new Date(Date.now() + ctx.templates.cfgInt("AcademyApprenticeFreezeHours", 24) * 3_600_000);
  await saveAcademy(ctx, p.info as Rel);
  p.send(appState(p.info as Rel, id));
}

/** 141/13 FIRE_APPRENTICE — o mestre expulsa o aprendiz (10000 ouro, mesmo fix do FIRE_MASTER). */
export async function fireApprenticePacket(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const id = pkt.readInt();
  if (p.info.Gold < 20000) return p.sendMessage(0, ctx.lang.t("Game.Server.AppSystem.BreakApprentice.NotEnoughGold"));
  if (p.info.apprenticeshipState < MASTER_STATE || !(await fireApprentice(ctx, p, id, false))) return p.sendMessage(0, ctx.lang.t("Game.Server.AppSystem.BreakApprentice.FireApprenticeCD"));
  p.removeGold(20000);
  p.info.freezesDate = new Date(Date.now() + ctx.templates.cfgInt("AcademyMasterFreezeHours", 48) * 3_600_000);
  await saveAcademy(ctx, p.info as Rel);
  p.send(appState(p.info as Rel, id));
}
