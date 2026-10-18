/**
 * Aba no jogo: Consortia Battle (arena de guerra de guildas, GvG) — pacote `153 CONSORTIA_BATTLE`, sub-router
 * por byte igual a `ConsortiaBattleHander.cs` (`byte b = packet.ReadByte()`). Entrada na cena é OUTRO pacote
 * (94 GAME_ROOM sub 18 SINGLE_ROOM_BEGIN num=4 — `handlers/salas/iniciar-cena-unica.ts`), não um sub daqui.
 *
 *   mover.ts      (pedir elenco / andar)         — sub 3 ADD_PLAYER (request), sub 4 PLAYER_MOVE
 *   sair.ts       (saída manual da cena)         — sub 5 DELETE_PLAYER
 *   desafiar.ts   (desafiar outro jogador)       — sub 6 CHALLENGE → luta real (room-mgr.ts)
 *   confirmar.ts  (confirmar entrada)            — sub 21 CONFIRM_ENTER
 *
 * Não portado nesta tarefa (`m3-consortia-battle-2`, docs/plan/TASKS.md): sub 1 START_OR_CLOSE (saída —
 * agendado por `handlers/eventos/agendador.ts`, kind `consortia_battle`, não um sub de entrada daqui), sub 7
 * PLAYER_STATUS / sub 9 UPDATE_SCENE_INFO (saída, emitidas pelo fim de luta ainda não ligado), sub 16
 * UPDATE_SCORE / sub 17 CONSUME (entrada — `Console.WriteLine` no C# original também, nunca implementados lá).
 * Como testar: `apps/game/test/consortia-battle.test.ts`.
 */
import { SubRouter, type HandlerRegistry } from "../registry.js";
import { consBatRequestRoster, consBatMove } from "./mover.js";
import { consBatExit } from "./sair.js";
import { consBatChallenge } from "./desafiar.js";
import { consBatConfirmEnter } from "./confirmar.js";

export function registerConsortiaBattle(r: HandlerRegistry): void {
  const sub = new SubRouter("byte", "CONSORTIA_BATTLE")
    .on(3, "ADD_PLAYER", (ctx, p) => consBatRequestRoster(ctx, p))
    .on(4, "PLAYER_MOVE", (ctx, p, pkt) => consBatMove(ctx, p, pkt))
    .on(5, "DELETE_PLAYER", (ctx, p) => consBatExit(ctx, p))
    .on(6, "CHALLENGE", (ctx, p, pkt) => consBatChallenge(ctx, p, pkt))
    .on(21, "CONFIRM_ENTER", (ctx, p) => consBatConfirmEnter(ctx, p));
  r.player(153, "CONSORTIA_BATTLE", sub.handler, "partial");
}
