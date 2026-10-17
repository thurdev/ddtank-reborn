/**
 * Aba no jogo: índice do minigame "Đại chiến Hút Gà" (captura de bichinhos "bogu") — ícone Especial do
 * hall, roda dentro das Termas mas é um mundo totalmente separado da sala de relaxar
 * (`handlers/termas/`). Cada ação tem o seu próprio arquivo, nomeado como o jogador vê na tela:
 *
 *   mgr.ts           (sem tela própria, infra compartilhada) — `Bogu`, `LittleGameMgr`, mapa, config,
 *                                                                timers de nascimento/passeio/escape
 *   entrar-sair.ts   (entrar no minigame / sair)             — sub 2 ENTER_WORLD, sub 3 LOAD_COMPLETED,
 *                                                                sub 4 LEAVE_WORLD
 *   mover.ts         (andar pelo mapa)                        — sub 32 MOVE, sub 33 POS_SYNC
 *   capturar.ts      (clicar/desistir/reportar pontuação)      — sub 65 CLICK, sub 66 CANCEL_CLICK,
 *                                                                sub 64 REPORT_SCORE
 *
 * Pacotes: tudo dentro de 166 LITTLEGAME_COMMAND (1 byte de subcódigo na frente, igual ao roteador de
 * 191 HOTSPRING_CMD em `termas/index.ts`).
 * C#: `Game.Server/Packets/Client/LittleGameHandler.cs` (`client.Player.LittleGame.ProcessData`) →
 * `LittleGame/LittleGameLogicProcessor.cs` → `LittleGame/Handle/*.cs` (ver cabeçalho de cada arquivo
 * acima pro mapeamento exato).
 * Como testar: `apps/game/test/littlegame.test.ts`. Manual: `docs/features/termas.md` §6.
 */
import { SubRouter } from "../registry.js";
import { enterWorld, loadCompleted, leaveWorld } from "./entrar-sair.js";
import { move, posSync } from "./mover.js";
import { click, cancelClick, reportScore } from "./capturar.js";

export { littleGameMgr, littleGameOnQuit, Bogu, LittleGameMgr } from "./mgr.js";

/** Roteador do pacote 166 LITTLEGAME_COMMAND: 1 `.on(subcódigo, nome, fn)` por ação. Registrado em
 *  `handlers/eventos/index.ts` (é lá que mora a tabela código→ícone do hall). */
export function littleGameRouter(): SubRouter {
  return new SubRouter("byte", "LITTLEGAME_COMMAND")
    .on(2, "ENTER_WORLD", enterWorld)
    .on(3, "LOAD_COMPLETED", loadCompleted)
    .on(4, "LEAVE_WORLD", leaveWorld)
    .on(32, "MOVE", move)
    .on(33, "POS_SYNC", posSync)
    .on(64, "REPORT_SCORE", reportScore)
    .on(65, "CLICK", click)
    .on(66, "CANCEL_CLICK", cancelClick);
}
