/**
 * Aba no jogo: Sala › entrar — clicar numa sala da lista (ou digitar id+senha) pra entrar como jogador/espectador.
 * Pacote: 94 GAME_ROOM sub 1 GAME_ROOM_LOGIN.
 * C#: `Login.cs` (via `GameRoomHandler.cs`) em `vendor/DDTank41/Game.Server/Rooms`.
 * Como testar: `apps/game/test/farm-compose-hotspring-rooms.test.ts`. Manual: `docs/features/salas-batalha.md`,
 * `docs/features/pve-masmorras.md` (entrar numa masmorra usa o mesmo pacote, só muda o `hall`).
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

/**
 * Login.cs: bool isInvite, int hallType, int roomSel; if roomSel == -1: int roomId, str password.
 * Como lê esse código (cada variável):
 * - `hall`: aba de onde veio o clique (1 = PvP, 2 = PvE/masmorra). Vem do pacote; decide `getAllMatchRooms`
 *   vs `getAllPveRooms` em `lista-de-salas.ts`.
 * - `sel`: id da sala já escolhida na lista, ou `-1` quando o jogador digitou id+senha manualmente.
 * - `roomId`/`pwd`: só lidos quando `sel === -1` (entrada manual por id/senha).
 */
export function entrarSala(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  pkt.readBoolean();
  const hall = pkt.readInt();
  const sel = pkt.readInt();
  let roomId = -1;
  let pwd = "";
  if (sel === -1) {
    roomId = pkt.readInt();
    pwd = pkt.readString();
  }
  ctx.rooms.enterRoom(p, roomId, pwd, hall);
}
