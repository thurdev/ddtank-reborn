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
import { eventsRuntime, isOpen } from "../eventos/agendador.js";
import { eliteScoreOpenFor } from "../eventos/liga-elite.js";

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
 *
 * 6600 (`GameInSocketOut.as sendCreateRoom`, m2-salas): mesmos 4 campos, +1 bool `isDouble` no final
 * (confirmado contra 4.1 `GameInSocketOut.as sendCreateRoom`, que não tem esse parâmetro — a sala desafio
 * criada por `RoomListController.__onChanllengeClick` usa esse pacote sem o campo extra). É o último campo
 * do pacote — não ler não quebra nada (framing é por pacote, não por campo), mas lemos e descartamos pra
 * documentar: nenhum fluxo de "sala dupla" dedicado foi encontrado server-side (`GameRoomCreate.cs`/
 * `CreateRoomAction.cs` no C# 6600 não leem esse bit), então não é usado hoje.
 */
export function criarSala(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const roomType = pkt.readByte();
  const timeType = pkt.readByte();
  const name = pkt.readString();
  const pwd = pkt.readString();
  if (p.clientKind === "6600") pkt.readBoolean(); // isDouble (sem efeito no servidor 6600 original)
  if (!p.hasMainWeapon) return p.sendMessage(1, NO_WEAPON);
  if (roomType === RoomType.Labyrinth && !isOpen(ctx, "labyrinth")) return p.sendMessage(0, "O Labirinto está fechado.");
  // m3-elite-brackets: joinEliteGame() (EliteGameController.as) manda este MESMO pacote direto, roomType=12,
  // SEM passar pelo 162 — a fase de pontuação da Liga de Elite é uma sala PvP normal, só com o gate de janela
  // aqui (bit 1|4 do bitmask, por faixa de nível do jogador, `handlers/eventos/liga-elite.ts`).
  if (roomType === RoomType.EliteGameScore && !eliteScoreOpenFor(eventsRuntime(ctx), p.info.Grade)) return p.sendMessage(0, "A Liga de Elite não está aberta pra sua faixa de nível agora.");
  ctx.rooms.createRoom(p, name, pwd, roomType, timeType);
}
