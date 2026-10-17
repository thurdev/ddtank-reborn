/**
 * Aba no jogo: Sala › expulsar (só o anfitrião) — chutar um jogador da sala antes da partida começar.
 * Pacote: 94 GAME_ROOM sub 3 GAME_ROOM_KICK.
 * C#: `KickPlayerAction.cs` em `vendor/DDTank41/Game.Server/Rooms`.
 * Como testar: `apps/game/test/farm-compose-hotspring-rooms.test.ts`. Manual: `docs/features/salas-batalha.md`.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

/** KickPlayerAction.cs: byte pos (posição da vaga a expulsar). */
export function expulsarJogador(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  if (p.currentRoom && p.currentRoom.host === p) ctx.rooms.kickPlayer(p.currentRoom, pkt.readByte());
}
