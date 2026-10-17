/**
 * Aba no jogo: Sala › saída (qualquer jogador) — abandonar a sala de lobby antes da partida terminar.
 * Pacote: 94 GAME_ROOM sub 5 GAME_ROOM_REMOVEPLAYER.
 * C#: `ExitRoomAction.cs` em `vendor/DDTank41/Game.Server/Rooms`.
 * Como testar: `apps/game/test/farm-compose-hotspring-rooms.test.ts`. Manual: `docs/features/salas-batalha.md`.
 */
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

export function sairDaSala(ctx: ServerContext, p: GamePlayer): void {
  if (p.currentRoom) ctx.rooms.exitRoom(p.currentRoom, p);
}
