/**
 * Aba no jogo: Sala › iniciar partida — botão "Iniciar" do anfitrião (PvP/PvE normal) e o atalho equivalente
 * das masmorras/Campo de treino (`FightLab`, avançar de andar sem fechar a sala).
 * Pacotes: 94 GAME_ROOM sub 7 GAME_START, 82 GAME_MISSION_START, 86 (atalho "iniciar" sem nome oficial,
 * reaproveita o código de QUEST_ONE_KEY_FINISH).
 * C#: `StartGameAction.cs`, `GameUserStartHandler.cs` em `vendor/DDTank41/Game.Server`.
 * Como testar: `apps/game/test/farm-compose-hotspring-rooms.test.ts`; o gate de desbloqueio de masmorra
 * (task 41-instancias, `dungeonLockedMessage` abaixo) em `apps/game/test/pve-instancias.test.ts`. Manual:
 * `docs/features/salas-batalha.md`, `docs/features/pve-masmorras.md`, `docs/features/instancias.md`.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { RoomType } from "../../rooms/room.js";
import { isDungeonUnlocked } from "../../game/pve-unlock.js";
import { loadClearedDifficulties } from "../../db/pve-progress.js";
import { isPassCheckCode, showCheckCode } from "../../game/anti-bot.js";

/** GameStart.cs: `currentRoom.AvgLevel` (updated lazily by `UpdateAvgLevel()`) — ported as a direct average
 *  over the room's current members, same number the original caches. */
function avgLevel(room: { getPlayers(): { info: { Grade: number } }[] }): number {
  const players = room.getPlayers();
  if (!players.length) return 0;
  return players.reduce((s, m) => s + m.info.Grade, 0) / players.length;
}

/**
 * Task `41-instancias` (owner request 2026-10-20): server-authoritative re-check of the dungeon the room is
 * currently set up to play (`room.MapId`/`room.HardLevel`, both fully client-chosen in `94/2
 * GAME_ROOM_SETUP_CHANGE` — `configurar-sala.ts`). The lobby/setup screen never refuses a selection (same as
 * the original, which the Flash UI greys out client-side), but a locked dungeon can never actually START a
 * fight, no matter what the client sent — this is the one real enforcement point (`docs/features/
 * instancias.md` section 1). Only `RoomType.Dungeon` is gated; Fight Lab has its own unlock system
 * (`game/fightlab.ts`) and every other PvE room type (Labyrinth, Rescue, CatchBeast, …) has a fixed
 * `MapId`/no difficulty picker, so neither needs this check.
 */
async function dungeonLockedMessage(ctx: ServerContext, p: GamePlayer, room: { RoomType: number; MapId: number; HardLevel: number }): Promise<string | null> {
  if (room.RoomType !== RoomType.Dungeon) return null;
  const info = ctx.templates.pveInfos.get(room.MapId);
  if (!info) return null; // not a real Pve_Info row (e.g. the 10000 "choose a dungeon" placeholder) — nothing to fight yet
  const cleared = await loadClearedDifficulties(ctx, p.id, room.MapId);
  const r = isDungeonUnlocked(info, room.HardLevel, p.info.Grade, cleared, { allOpen: ctx.cfg.ALL_OPEN, requireClear: ctx.templates.cfgInt("pveRequireClear", 1) !== 0 });
  if (r.unlocked) return null;
  return r.reason === "clear"
    ? "Você precisa vencer a dificuldade anterior desta masmorra antes de jogar esta."
    : "Seu nível ainda não é suficiente para esta masmorra.";
}

/**
 * GameStart.cs: só o anfitrião, exige arma em todo mundo (captcha portado em 41-captcha-anti-bot,
 * desligado por padrão; permissão de PvE/tickets ainda não portados).
 * Como lê esse código (cada variável): `room` = sala do anfitrião; `m` = cada membro da sala, checado um a um
 * antes de deixar começar (se faltar arma em alguém, cancela o "pickup" e avisa em vez de iniciar).
 */
export async function iniciarPartida(ctx: ServerContext, p: GamePlayer): Promise<void> {
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
  // GameStart.cs:44-50: captcha gate, only for ranked matches with AvgLevel>14 (off by default,
  // Server_Config AntiBotCheckCodeEnabled) — game/anti-bot.ts.
  if (room.RoomType === RoomType.Match && avgLevel(room) > 14 && !isPassCheckCode(ctx, p)) {
    room.IsPlaying = false;
    room.sendCancelPickUp();
    showCheckCode(p);
    return;
  }
  const locked = await dungeonLockedMessage(ctx, p, room);
  if (locked) {
    room.IsPlaying = false;
    room.sendCancelPickUp();
    p.sendMessage(3, locked);
    return;
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
export async function atalhoIniciarAnfitriao(ctx: ServerContext, p: GamePlayer): Promise<void> {
  const room = p.currentRoom;
  if (!room || room.host !== p) return;
  const locked = await dungeonLockedMessage(ctx, p, room);
  if (locked) {
    room.IsPlaying = false;
    room.sendCancelPickUp();
    p.sendMessage(3, locked);
    return;
  }
  ctx.rooms.startGame(room);
}
