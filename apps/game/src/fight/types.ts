/**
 * Boundary to the combat engine (@ddt/fight, built separately). The lobby only needs: start a game for two teams,
 * forward in-game packets (91 GAME_CMD) and be told when the game stops. Keeping this interface narrow lets the
 * fight module run in-process today and behind a socket (old Fighting.Server, 00-architecture §5) later.
 */
import type { GSPacket } from "@ddt/protocol";
import type { RoomMember } from "../game/player.js";

export interface StartGameOptions {
  roomId: number;
  roomType: number;
  gameType: number;
  timeType: number;
  mapId: number;
  red: RoomMember[];
  blue: RoomMember[];
  /** Called once when the game ends (BaseRoom.m_game_GameStopped). */
  onStopped(): void;
}

export interface FightGame {
  readonly id: number;
  readonly mapId: number;
  /** Packet 91 from a member (GameDataHandler: Parameter1 = player's living id). */
  processData(from: RoomMember, pkt: GSPacket): void;
  /** Member left the room/disconnected (BaseGame.RemovePlayer). */
  removePlayer(p: RoomMember): void;
  stop(): void;
}

export interface FightEngine {
  readonly name: string;
  /** GameMgr.StartPVPGame (Games/GameMgr.cs:167). Returns null when the game can't be created (no map). */
  startPvp(o: StartGameOptions): FightGame | null;
}
