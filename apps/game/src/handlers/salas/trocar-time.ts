/**
 * Aba no jogo: Sala › trocar de time — clicar pra mudar de lado (vermelho/azul) numa sala de partida (`Match`).
 * Pacote: 94 GAME_ROOM sub 6 GAME_TEAM.
 * C#: `SwitchTeamAction.cs` em `vendor/DDTank41/Game.Server/Rooms`.
 * Como testar: `apps/game/test/farm-compose-hotspring-rooms.test.ts`. Manual: `docs/features/salas-batalha.md`.
 */
import { RoomType } from "../../rooms/room.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

/** Salas tipo `Match` (combinada pelo sistema) não deixam trocar de time manualmente. */
export function trocarTime(ctx: ServerContext, p: GamePlayer): void {
  if (p.currentRoom && p.currentRoom.RoomType !== RoomType.Match) ctx.rooms.switchTeam(p);
}
