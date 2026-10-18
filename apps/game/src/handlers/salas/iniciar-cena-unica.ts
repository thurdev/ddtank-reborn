/**
 * Aba no jogo: Sala › entrar numa "cena única" (não é uma sala normal da lista) — 94 GAME_ROOM sub 18
 * SINGLE_ROOM_BEGIN, 1 int (`num` = qual cena). C#: `Game.Server.GameRoom.Handle.SingleRoomBegin`
 * (`[Attribute7(18)]`, vendor/DDT-6600/Source/Game.Server/Game.Server.GameRoom.Handle/SingleRoomBegin.cs).
 * Cliente: `GameInSocketOut.as sendSingleRoomBegin(type)`.
 *
 * Só `num === 4` (Consortia Battle, `RoomMgr.ConsBatRoom.AddPlayer`) está portado aqui — os outros `case`s do
 * original (1 Encounter, 2 ConsortiaBoss, 3 BattleRoom, 7-10 GroupBattle, 17 CampBattle, 20 FightFootballTime,
 * 60 HorseRace) são sistemas de outras tarefas (nenhum ainda existe em `apps/game`); caem no `default` do
 * original (`Console.WriteLine("SINGLE_ROOM_BEGIN: {0}", num); return true;`), replicado abaixo como um no-op
 * silencioso (mesmo efeito observável: nenhuma resposta ao cliente).
 * Como testar: `apps/game/test/consortia-battle.test.ts`.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

export function iniciarCenaUnica(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const num = pkt.readInt();
  // SingleRoomBegin.cs:18-22: the weapon check runs for every `num`, before the switch.
  if (!p.hasMainWeapon) {
    p.sendMessage(1, ctx.lang.t("Game.Server.SceneGames.NoEquip"));
    return;
  }
  if (num === 4) {
    // SingleRoomBegin.cs:42-53: leave the current room/waiting list, then register in the arena.
    p.currentRoom?.removePlayer(p);
    ctx.rooms.waitingRemove(p);
    ctx.consBat.addPlayer(p);
  }
  // other `num` values: no system ported yet, matches the original's Console.WriteLine default (no reply).
}
