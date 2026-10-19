/**
 * 404 RING_STATION (Arena Ranqueada, `ringstation.swf`) — sub-router by byte, same as `RingStationHandleMgr`
 * (`Attribute15` dispatch in the leaked C#). Part 1 of `m3-ringstation` (docs/plan/TASKS.md): get info, buy
 * battle count/time, challenge -> real fight against a stats snapshot, rank swap on win, battle-field log,
 * armory, fight flag, sign message. Left for `m3-ringstation-2`: Landers Award (sub-codes 48/49/64 — a
 * separate, unrelated feature with no C# handler at all, see `packets/out.ts` banner) and the periodic
 * (every `AwardTime` cycle) rank-reward mailing / initial rank bootstrap (`RingStationMgr.StatusScan`).
 *
 * C#: `Game.Server.RingStation.Handle/*` (`vendor/DDT-6600/Source/Game.Server/Game.Server.RingStation.Handle`).
 * Como testar: `apps/game/test/ringstation.test.ts`.
 */
import { SubRouter, type HandlerRegistry } from "../registry.js";
import { ringStationViewInfo } from "./ver-info.js";
import { ringStationBuy } from "./comprar.js";
import { ringStationArmory } from "./ranking.js";
import { ringStationBattleFieldLog } from "./historico.js";
import { ringStationChallenge } from "./desafiar.js";
import { ringStationFightFlag, ringStationSignMsg } from "./misc.js";

export function registerRingStation(r: HandlerRegistry): void {
  const sub = new SubRouter("byte", "RING_STATION")
    .on(1, "VIEWINFO", (ctx, p) => ringStationViewInfo(ctx, p))
    .on(2, "BUYCOUNTORTIME", (ctx, p, pkt) => ringStationBuy(ctx, p, pkt))
    .on(3, "ARMORY", (ctx, p) => ringStationArmory(ctx, p))
    .on(4, "NEWBATTLEFIELD", (ctx, p) => ringStationBattleFieldLog(ctx, p))
    .on(5, "CHALLENGE", (ctx, p, pkt) => ringStationChallenge(ctx, p, pkt))
    .on(6, "FIGHTFLAG", (ctx, p) => ringStationFightFlag(ctx, p))
    .on(7, "SENDSIGNMSG", (ctx, p, pkt) => ringStationSignMsg(ctx, p, pkt));
  r.player(404, "RING_STATION", sub.handler, "partial");
}
