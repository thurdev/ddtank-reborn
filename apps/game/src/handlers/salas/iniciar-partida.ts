/**
 * Aba no jogo: Sala › iniciar partida — botão "Iniciar" do anfitrião (PvP/PvE normal) e o atalho equivalente
 * das masmorras/Campo de treino (`FightLab`, avançar de andar sem fechar a sala).
 * Pacotes: 94 GAME_ROOM sub 7 GAME_START, 82 GAME_MISSION_START, 86 (atalho "iniciar" sem nome oficial,
 * reaproveita o código de QUEST_ONE_KEY_FINISH).
 * C#: `StartGameAction.cs`, `GameUserStartHandler.cs` em `vendor/DDTank41/Game.Server`.
 * Como testar: `apps/game/test/farm-compose-hotspring-rooms.test.ts`. Manual: `docs/features/salas-batalha.md`,
 * `docs/features/pve-masmorras.md`.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

/**
 * GameStart.cs: só o anfitrião, exige arma em todo mundo (captcha / permissão de PvE / tickets não portados).
 * Como lê esse código (cada variável): `room` = sala do anfitrião; `m` = cada membro da sala, checado um a um
 * antes de deixar começar (se faltar arma em alguém, cancela o "pickup" e avisa em vez de iniciar).
 */
export function iniciarPartida(ctx: ServerContext, p: GamePlayer): void {
  const room = p.currentRoom;
  if (!room || room.host !== p) return;
  for (const m of room.getPlayers()) {
    if (!m.hasMainWeapon) {
      p.sendMessage(3, "Há membros ou espectadores sem arma, não é possível começar!");
      room.IsPlaying = false;
      room.sendCancelPickUp();
      return;
    }
  }
  ctx.rooms.startGame(room);
}

/**
 * GameUserStartHandler.cs: bool flag; if (flag && currentRoom != null) RoomMgr.StartGameMission(currentRoom) ->
 * game.MissionStart(host) -> todo jogador vira Ready + CheckState(0). O C# original não checa se é o anfitrião.
 * É isto que o cliente AS3 manda em `MissionRoomView.startGame()` NO LUGAR de `94 GAME_START` nas salas
 * `FightLab` (roomType 5) — `BaseRoomView.startGame()` manda `94 sub 7`, mas `MissionRoomView` sobrescreve pra
 * mandar `82` — sem este handler uma missão `FightLab` (`PVEGame`) trava em SessionPrepared/GameOver pra sempre
 * depois do 1º andar.
 */
export function destravarAndarFightLab(_ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const flag = pkt.readBoolean();
  if (flag && p.currentRoom) p.currentRoom.game?.missionStart?.();
}

/** 86: atalho de "iniciar" do anfitrião (sem nome oficial no cliente, reaproveita o código de QUEST_ONE_KEY_FINISH). */
export function atalhoIniciarAnfitriao(ctx: ServerContext, p: GamePlayer): void {
  if (p.currentRoom && p.currentRoom.host === p) ctx.rooms.startGame(p.currentRoom);
}
