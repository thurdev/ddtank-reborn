/**
 * Aba no jogo: sem tela própria — recompensas de nível e graduação (dispara quando o aprendiz sobe de
 * nível; não é um pacote, é chamado direto por `session/login.ts` via `p.onGradeUp`).
 * Pacotes: nenhum direto; manda os pacotes 141/11 GRADUATE e 141/10 (via `appState`) como efeito colateral.
 * C#: `AcademyMgr.UpdateAwardApp` (caixas por nível + graduação em `ACADEMY_LEVEL_MIN`, que chama
 * `FireMaster(isComplete)`).
 * Como testar: `apps/game/test/academy.test.ts` (fluxo completo até graduar).
 */
import { fireMaster } from "./expulsar.js";
import { ACADEMY_LEVEL_MIN, appState, graduate, mailTo, makeItem, parseRel, infoOf, saveAcademy, type Rel } from "./relacao.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

const levelAwards = (s: string | undefined, def: string) =>
  new Map((s ?? def).split(",").map((x) => x.split("|").map(Number) as [number, number]).filter(([l, t]) => l && t));

/** AcademyMgr.UpdateAwardApp: caixa de nível pros dois lados; graduação em ACADEMY_LEVEL_MIN (FireMaster(isComplete)). */
export async function updateAwardApp(ctx: ServerContext, p: GamePlayer, oldLevel: number): Promise<void> {
  const a = p.info as Rel;
  const masterId = a.masterID;
  if (!masterId) return;
  const cfg = ctx.templates.serverConfig;
  const appAward = levelAwards(cfg.get("AcademyApprenticeAward"), "10|112085,15|112086,18|112087,20|112095");
  const masAward = levelAwards(cfg.get("AcademyMasterAward"), "10|112088,15|112089,18|112090,20|112094");
  const masterNick = parseRel(a.masterOrApprentices).get(masterId) ?? "";
  const t = (k: string, ...x: unknown[]) => ctx.lang.t(k, ...x);
  for (let i = oldLevel + 1; i <= a.Grade; i++) {
    const ai = appAward.get(i) && makeItem(ctx, appAward.get(i)!, 0);
    if (ai) await mailTo(ctx, a.ID, a.NickName ?? "", t("Game.Server.AppSystem.GraduateBox.Success", i), t("Game.Server.AppSystem.GraduateBox.Success", i), [ai]);
    const mi = masAward.get(i) && makeItem(ctx, masAward.get(i)!, 0);
    const title = t("Game.Server.AppSystem.ApprenticeLevelUp.mailTitle", a.NickName, i);
    if (mi) await mailTo(ctx, masterId, masterNick, t("Game.Server.AppSystem.TakeAppBox.Success", a.NickName, i), title, [mi]);
    else if (appAward.has(i) || masAward.has(i)) await mailTo(ctx, masterId, masterNick, title, title);
  }
  if (a.Grade < ACADEMY_LEVEL_MIN) return;
  const mo = await infoOf(ctx, masterId);
  mo?.online?.send(graduate(1, p.id, a.NickName ?? ""));
  // AcademyAppAwardComplete / AcademyMasAwardComplete: "male|male,female|female" by Sex (index Sex ? 1 : 0)
  const pick = (s: string | undefined, def: string, sex: boolean) => ((s ?? def).split(",")[sex ? 1 : 0] ?? "").split("|").map(Number).filter(Boolean);
  const appItems = pick(cfg.get("AcademyAppAwardComplete"), "1401|5293,1301|5192", !!a.Sex).map((x) => makeItem(ctx, x, 365)).filter((x): x is NonNullable<typeof x> => !!x);
  await mailTo(ctx, a.ID, a.NickName ?? "", t("Game.Server.AppSystem.GraduateBox.Success"), t("Game.Server.AppSystem.GraduateBox.Success"), appItems);
  if (mo) {
    const masItems = pick(cfg.get("AcademyMasAwardComplete"), "1414|5409,1314|5306", !!mo.info.Sex).map((x) => makeItem(ctx, x, 3)).filter((x): x is NonNullable<typeof x> => !!x);
    await mailTo(ctx, masterId, mo.info.NickName ?? "", t("Game.Server.AppSystem.GraduateBoxForMaster.MailTitle", a.NickName), t("Game.Server.AppSystem.GraduateBoxForMaster.MailContert"), masItems);
  }
  await fireMaster(ctx, p, true);
  await saveAcademy(ctx, a);
  p.send(appState(a, masterId));
  p.send(graduate(0, p.id, a.NickName ?? ""));
  const title = t("Game.Server.Managers.AcademyMgr.TitleGraduated");
  for (const o of ctx.world.all()) o.sendMessage(0, t("Game.Server.AppSystem.MasterGainHonour.content", mo?.info.NickName ?? "", a.NickName, title));
}
