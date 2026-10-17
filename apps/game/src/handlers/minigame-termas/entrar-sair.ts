/**
 * Aba no jogo: Especial › "Đại chiến Hút Gà" (minigame de capturar bichinhos dentro das Termas) — entrar
 * na cena, pedir o dump completo depois de carregar os recursos, e sair.
 * Pacotes: 166 LITTLEGAME_COMMAND sub 2 ENTER_WORLD (`START_LOAD`), sub 3 LOAD_COMPLETED (`GAME_START`),
 * sub 4 LEAVE_WORLD.
 * C#: `LittleGame/Handle/EnterWorld.cs`, `LoadCompleted.cs`, `LeaveWorld.cs`,
 * `LittleGame/LittleGameWorldMgr.cs` (`AddPlayer`/`RemovePlayer`), `GamePlayer.cs:3817` (saída ao
 * desconectar — ver `littleGameOnQuit` em `mgr.ts`).
 * Como testar: `apps/game/test/littlegame.test.ts`. Manual: hall → Especial → Đại chiến Hút Gà → entrar/sair.
 */
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { littleGameMgr, MIN_GRADE } from "./mgr.js";

/** sub 2 ENTER_WORLD (`START_LOAD` do cliente): nível mínimo 20 + evento aberto (`EnterWorld.cs`). */
export function enterWorld(ctx: ServerContext, p: GamePlayer): void {
  const m = littleGameMgr(ctx);
  if (p.info.Grade < MIN_GRADE) return p.sendMessage(0, "Bạn cần đạt level 20 mới có thể vào.");
  if (!m.isOpen) return p.sendMessage(0, "Sự kiện chưa mở.");
  if (m.inGame(p)) return; // já está dentro — o original também não protege, mas entrar 2x duplicaria o id no mapa
  m.addPlayer(p);
}

/** sub 3 LOAD_COMPLETED (`GAME_START` do cliente): terminou de carregar os recursos (scene.swf, tilemap,
 *  bichinhos), pede o estado atual completo (`LoadCompleted.cs` → `SendLoadComplete`). */
export function loadCompleted(ctx: ServerContext, p: GamePlayer): void {
  const m = littleGameMgr(ctx);
  p.send(m.loadCompletePacket(p));
}

/** sub 4 LEAVE_WORLD (`LeaveWorld.cs`): sai da cena a pedido do próprio jogador (botão "Sair"). */
export function leaveWorld(ctx: ServerContext, p: GamePlayer): void {
  const m = littleGameMgr(ctx);
  if (!m.inGame(p)) return;
  m.removePlayer(p);
}
