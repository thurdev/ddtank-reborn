/**
 * Sem tela própria — resultado de guerra/GvG entre clãs, chamado pelo fim de uma partida PvP (não é um
 * pacote 129 CONSORTIA_CMD; é um hook chamado por `server.ts` quando uma sala de PVP termina).
 * C#: `PVPGame.CalculateGuildMatchResult` + `ConsortiaMgr.ConsortiaFight` (só salas Match): Riqueza e Oferta
 * do clã vencedor/perdedor, a linha de chat "<clã> venceu" (center 158 -> `HandleConsortiaFight`,
 * ChatNormal) e, em jogos de clã, o `PVPGame.GameOver` por jogador (`ConsortiaRichAdd(count + TotalHurt / 2000)`).
 * Também alimenta a condição de missão do clã. Desvio: jogador sem clã não ganha ±3 de oferta em partida
 * livre (o C# tratava "ConsortiaID 0" como se fosse um clã de verdade).
 * Como testar: `apps/game/test/consortia.test.ts`.
 */
import * as Db from "../../db/consortia.js";
import { fightRewards } from "../../game/consortia.js";
import { consortiaMgr } from "../../game/consortia-mgr.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

export async function consortiaGameOver(ctx: ServerContext, g: { roomType: number; gameType: number; players: { member: unknown; team: number; win: boolean; totalHurt: number }[] }): Promise<void> {
  const m = await consortiaMgr(ctx);
  const ps = g.players.map((x) => ({ ...x, p: x.member as GamePlayer })).filter((x) => x.p?.info);
  for (const x of ps) m.onGameOver(x.p, { roomType: g.roomType, gameType: g.gameType, isWin: x.win });
  if (g.roomType !== 0) return;
  const winners = ps.filter((x) => x.win);
  const losers = ps.filter((x) => !x.win);
  const winP = winners.at(-1);
  const loseP = losers.at(-1);
  if (!winP || !loseP) return;
  const db = ctx.db.db;
  const totalHurt = ps.reduce((a, x) => a + x.totalHurt, 0);
  const winCid = winP.p.info.ConsortiaID;
  const loseCid = loseP.p.info.ConsortiaID;
  const lv = await Db.guildLevels(db, [winCid, loseCid].filter(Boolean));
  // 41-stubs-rates: offerRate = RateMgr.GetRate(eRateType.Offer_Rate) (ConsortiaMgr.cs:81) = admin server-config's
  // offerRate (templates.rates.offer; see db/templates.ts header); richesRate has no admin field (always 1, same
  // as before).
  const r = fightRewards({ gameType: g.gameType, roomType: g.roomType, playerCount: ps.length, totalHurt, offerRate: ctx.templates.rates.offer, richesRate: 1, winLevel: lv.get(winCid) ?? 0, loseLevel: lv.get(loseCid) ?? 0 });
  if (!r) return;
  if (winCid) await Db.addRiches(db, winCid, r.riches, 0, "", () => "");
  for (const x of ps) {
    const cid = x.p.info.ConsortiaID;
    if (!cid) continue;
    if (cid === winCid) {
      x.p.info.RichesRob += r.riches;
      x.p.addOffer(r.winOffer);
    } else if (cid === loseCid) {
      x.p.addOffer(r.loseOfferAdd);
      x.p.removeOffer(r.loseOfferRemove);
    }
  }
  if (g.gameType === 1) {
    const perPlayer = losers.length + Math.trunc(totalHurt / 2000);
    for (const x of ps) if (x.p.info.ConsortiaID) await Db.addRiches(db, x.p.info.ConsortiaID, perPlayer, 0, "", () => "");
    const winStr = ctx.lang.t("Game.Server.SceneGames.OnStopping.Msg5").replace("Game.Server.SceneGames.OnStopping.Msg5", "") + winners.map((x) => `[${x.p.info.NickName}]`).join("") +
      ctx.lang.t("Game.Server.SceneGames.OnStopping.Msg1") + loseP.p.info.ConsortiaName + ctx.lang.t("Game.Server.SceneGames.OnStopping.Msg2");
    for (const o of m.online(winCid)) o.sendMessage(2, winStr);
  }
  for (const cid of new Set([winCid, loseCid])) if (cid) await m.refreshRiches(cid);
  for (const x of ps) x.p.updateProperties();
}
