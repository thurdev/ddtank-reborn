/**
 * Aba no jogo: Sala › criar — tela de criação de sala (nome, senha, tipo de luta, modo de tempo).
 * Pacote: 94 GAME_ROOM sub 0 GAME_ROOM_CREATE.
 * C#: `CreateRoomAction.cs` (via `GameRoomHandler.cs`) em `vendor/DDTank41/Game.Server/Rooms`.
 * Como testar: `apps/game/test/farm-compose-hotspring-rooms.test.ts`. Manual: `docs/features/salas-batalha.md`.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { RoomType } from "../../rooms/room.js";
import { isOpen } from "../eventos/agendador.js";

const NO_WEAPON = "Sem arma equipada, não é possível participar.";

/**
 * Create.cs: byte roomType, byte timeType, str name, str password (salas de boss mundial não foram portadas).
 * Como lê esse código (cada variável):
 * - `roomType`: tipo de sala (PvP normal, treino, FightLab, Labirinto...). Vem do pacote; vira `RoomType` em
 *   `RoomMgr`.
 * - `timeType`: modo de tempo da partida. Vem do pacote; repassado direto pro `RoomMgr`.
 * - `name`/`pwd`: nome e senha da sala (senha vazia = sala aberta). Vem do pacote.
 *
 * Labirinto (`LabyrinthFrame.startGame`/`continueGame` → `createUserGuide(LANBYRINTH_ROOM)`): mesmo pacote de
 * criar sala PvP/masmorra normal — o `Pve_Info`/andar reais só são resolvidos depois, em
 * `configurar-sala.ts` (ver nota ali). Aqui só confere o evento (`cfg.ALL_OPEN` bypassa, igual
 * `131 LABYRINTH` em `eventos/labirinto.ts`).
 */
export function criarSala(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const roomType = pkt.readByte();
  const timeType = pkt.readByte();
  const name = pkt.readString();
  const pwd = pkt.readString();
  if (!p.hasMainWeapon) return p.sendMessage(1, NO_WEAPON);
  if (roomType === RoomType.Labyrinth && !isOpen(ctx, "labyrinth")) return p.sendMessage(0, "O Labirinto está fechado.");
  ctx.rooms.createRoom(p, name, pwd, roomType, timeType);
}
