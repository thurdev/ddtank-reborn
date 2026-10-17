/**
 * Aba no jogo: Sala › configurar (só o anfitrião) — trocar mapa, nome, senha, modo de tempo, dificuldade e
 * nível; é aqui também que o anfitrião escolhe a missão/dificuldade de uma masmorra PvE (`docs/features/
 * pve-masmorras.md`) ou o modo do Campo de treino (`roomType === Freshman`, FightLab).
 * Pacote: 94 GAME_ROOM sub 2 GAME_ROOM_SETUP_CHANGE.
 * C#: `SetupChange.cs` (via `GameRoomHandler.cs`) em `vendor/DDTank41/Game.Server/Rooms`.
 * Como testar: `apps/game/test/farm-compose-hotspring-rooms.test.ts`. Manual: `docs/features/salas-batalha.md`,
 * `docs/features/pve-masmorras.md`.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { RoomType } from "../../rooms/room.js";
import { currentLabyrinthFloor } from "../eventos/labirinto.js";

/**
 * SetupChange.cs: int mapId, byte roomType, bool isOpenBoss, str password, str name, byte timeMode,
 * byte hardLevel, int levelLimits, bool isCrosszone. Só o anfitrião pode mudar, e só antes da partida começar.
 * Como lê esse código (cada variável):
 * - `mapId`: mapa/missão escolhida (PvE usa aqui o id da `Pve_Info`). Vem do pacote.
 * - `isOpenBoss`: ausente no pacote quando `roomType` é Campo de treino — o cliente AS3
 *   (`GameSocketOut.enterUserGuide`) não escreve esse bool pra esse caso (`GameSocketOut.as:1400`).
 * - `hardLevel`: dificuldade da masmorra (Simples/Normal/Difícil/Terror).
 *
 * Labirinto (SetupChange.cs:26-29): o cliente manda `mapId=0, roomType=15` depois de criar a sala
 * (`LabyrinthManager.enterGame` → `enterUserGuide(0, LANBYRINTH_ROOM)`, disparado automaticamente pelo
 * `RoomManager` ao notar que entrou numa sala tipo Labirinto) — aí o servidor resolve o `Pve_Info.ID` fixo
 * (401) e o andar atual do jogador (`player."Sys_Users_Labyrinth".currentFloor`), nunca o que vem do pacote.
 */
export async function configurarSala(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const room = p.currentRoom;
  if (!room || room.host !== p || room.IsPlaying) return;
  let mapId = pkt.readInt();
  const roomType = pkt.readByte();
  const isOpenBoss = roomType === RoomType.Freshman ? false : pkt.readBoolean();
  const password = pkt.readString();
  const name = pkt.readString();
  const timeMode = pkt.readByte();
  const hardLevel = pkt.readByte();
  const levelLimits = pkt.readInt();
  const isCrosszone = pkt.readBoolean();
  let currentFloor: number | undefined;
  if (mapId === 0 && roomType === RoomType.Labyrinth) {
    mapId = 401;
    currentFloor = await currentLabyrinthFloor(ctx, p);
  }
  ctx.rooms.setupChange(room, { mapId, roomType, password, name, timeMode, hardLevel, levelLimits, isCrosszone, isOpenBoss, currentFloor });
}
