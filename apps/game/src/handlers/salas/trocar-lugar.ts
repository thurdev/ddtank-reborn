/**
 * Aba no jogo: Sala › trocar de lugar — anfitrião arrasta um jogador/bot pra outra vaga, abre/fecha vaga pra
 * bot, ou escolhe/cancela o estilo de "pickup" (coleta de item em partida) antes de iniciar.
 * Pacotes: 94 GAME_ROOM sub 10 GAME_ROOM_UPDATE_PLACE, sub 11 GAME_PICKUP_CANCEL, sub 12 GAME_PICKUP_STYLE.
 * C#: `UpdatePlacesAction.cs` em `vendor/DDTank41/Game.Server/Rooms` (sub 11/12 sem C# de referência).
 * Como testar: `apps/game/test/farm-compose-hotspring-rooms.test.ts`. Manual: `docs/features/salas-batalha.md`.
 */
import { GSPacket } from "@ddt/protocol";
import { RoomType } from "../../rooms/room.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

/**
 * UpdatePlacesAction.cs: byte pos, int place, bool isOpened, int placeView. Só o anfitrião move vaga; em salas
 * que não são `Freedom` (livre) a posição tem que ser < 8 (sem espectador).
 */
export function trocarLugar(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const room = p.currentRoom;
  if (!room) return;
  const pos = pkt.readByte();
  const place = pkt.readInt();
  const opened = pkt.readBoolean();
  const view = pkt.readInt();
  if (room.host === p) {
    if (room.RoomType !== RoomType.Freedom && pos >= 8) return;
    ctx.rooms.updateRoomPos(room, pos, opened, place, view);
  }
  // Troca de vaga de quem só assiste (SwitchToView) não foi portada.
}

export function cancelarPickup(ctx: ServerContext, p: GamePlayer): void {
  ctx.rooms.cancelPickup(p);
}

/** Só o anfitrião escolhe o estilo de pickup, e só em sala de partida (`Match`). */
export function escolherEstiloDePickup(_ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const style = pkt.readInt();
  const room = p.currentRoom;
  if (!room || room.RoomType !== RoomType.Match || room.host !== p) return;
  room.GameType = style === 1 ? 1 : 0;
  const out = new GSPacket(94);
  out.writeByte(12);
  out.writeByte(room.GameType);
  room.sendToAll(out);
}
