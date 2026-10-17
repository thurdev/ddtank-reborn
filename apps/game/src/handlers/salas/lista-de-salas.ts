/**
 * Aba no jogo: Lista de salas (lobby do PvP) e Lista de masmorras (lobby do PvE) — a mesma tabela, filtrada
 * pelo `hall` que o cliente pede.
 * Pacote: 94 GAME_ROOM sub 9 ROOMLIST_UPDATE.
 * C#: `RoomMgr.cs` (`GetAllMatchRooms`/`GetAllPveRooms`) em `vendor/DDTank41/Game.Server/Rooms`.
 * Como testar: `apps/game/test/farm-compose-hotspring-rooms.test.ts`. Manual: `docs/features/salas-batalha.md`,
 * `docs/features/pve-masmorras.md`.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { roomList } from "../../packets/out.js";

/**
 * Como lê esse código (cada variável):
 * - `hall`: 1 = lista de PvP (`getAllMatchRooms`), 2 = lista de PvE/masmorra (`getAllPveRooms`), outro = vazio.
 * - `b`: segundo int sempre lido (filtro extra do cliente); quando `hall === 2 && b === -2` o cliente manda
 *   mais dois ints de filtro de masmorra que o servidor não usa, só precisa consumir do pacote.
 */
export function listarSalas(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const hall = pkt.readInt();
  const b = pkt.readInt();
  if (hall === 2 && b === -2) {
    pkt.readInt();
    pkt.readInt();
  }
  p.send(roomList(hall === 1 ? ctx.rooms.getAllMatchRooms() : hall === 2 ? ctx.rooms.getAllPveRooms() : []));
}
