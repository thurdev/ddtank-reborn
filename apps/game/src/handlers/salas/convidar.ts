/**
 * Aba no jogo: Sala › convidar amigo — manda um convite pop-up pra um jogador online que ainda não está em sala.
 * Pacote: 70 GAME_INVITE.
 * C#: `GameInviteHandler.cs` em `vendor/DDTank41/Game.Server`.
 * Como testar: `apps/game/test/farm-compose-hotspring-rooms.test.ts`. Manual: `docs/features/salas-batalha.md`.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

/** GameInviteHandler.cs: alvo precisa estar online e fora de qualquer sala. */
export function convidarJogador(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const room = p.currentRoom;
  const target = ctx.world.get(pkt.readInt());
  if (!room || !target || target.currentRoom) return;
  const o = new GSPacket(70, p.id);
  o.writeInt(p.id); o.writeInt(room.RoomId); o.writeInt(room.MapId); o.writeByte(room.TimeMode); o.writeByte(room.RoomType);
  o.writeByte(room.HardLevel); o.writeByte(room.LevelLimits); o.writeString(p.info.NickName ?? ""); o.writeBoolean(p.info.typeVIP > 0);
  o.writeInt(p.info.VIPLevel); o.writeString(room.Name); o.writeString(room.Password); o.writeInt(-1); o.writeBoolean(room.isOpenBoss);
  target.send(o);
}
