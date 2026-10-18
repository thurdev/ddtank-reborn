/**
 * BaseConsBatRoom (vendor/DDT-6600/Source/Game.Server/Game.Server.Rooms/BaseConsBatRoom.cs) — in-memory
 * registry for the 153 CONSORTIA_BATTLE scene (guild-war walkable arena, "factionwarmap.swf",
 * `consortionBattle/*`): who is in the scene, their tombstone/status/score, and the challenge -> real 1v1
 * fight transition. One global room per channel (`ctx.consBat`), same as the C# original's single static
 * `RoomMgr.ConsBatRoom` (`RoomMgr.cs:94`) — King Division/GvG cross-channel play is out of scope per
 * `docs/GAME-SERVER.md` "O que ainda não funciona com 2+ canais" (M3/M4 decision), so this stays per-channel.
 *
 * Entry: 94 GAME_ROOM sub 18 SINGLE_ROOM_BEGIN num=4 (`Game.Server.GameRoom.Handle/SingleRoomBegin.cs:42-53`)
 * -> `AddPlayer`, wired in `handlers/salas/iniciar-cena-unica.ts`.
 *
 * Score/reward wiring (16 UPDATE_SCORE, 17 CONSUME, `BattleWin`/`BattleLost`) is `m3-consortia-battle-2`
 * (docs/plan/TASKS.md): the leaked C# itself never calls `BattleWin`/`BattleLost` from anywhere (grepped),
 * and 16/17's handlers are `Console.WriteLine` stubs (`ConsortiaBattleHander.cs` cases 16/17) — this batch
 * ports the reachable part (enter/roster/move/challenge-into-a-real-fight/confirm), tracked fields below
 * (`score`/`victoryCount`/`winningStreak`/`isPowerFullUsed`/`isDoubleScoreUsed`) stay at their initial values
 * until that follow-up wires a real PvP-game-over hook for `RoomType.ConsortiaBattle`.
 */
import type { PacketOut } from "@ddt/protocol";
import * as Out from "../packets/out.js";
import type { RoomMember } from "./player.js";

/** ConsBatPackageType status byte (ConsortiaBattlePlayerInfo.cs `status`: 1 free-to-challenge, 2 fighting). */
export const ConsBatStatus = { Free: 1, Fighting: 2 } as const;

/** ConsortiaBattlePlayerInfo (SqlDataProvider/Data/ConsortiaBattlePlayerInfo.cs) — per-player scene state. */
export interface ConsBatPlayerInfo {
  playerId: number;
  sex: boolean;
  curHp: number;
  posX: number;
  posY: number;
  consortiaId: number;
  consortiaName: string;
  tombstoneEndTime: Date;
  status: number;
  victoryCount: number;
  winningStreak: number;
  failBuffCount: number;
  score: number;
  isPowerFullUsed: boolean;
  isDoubleScoreUsed: boolean;
}

/** Session "pet shown" field — same one the 262 NEW_HALL writers use (`GamePlayer.hallPetsId`, not part of
 *  the generic `RoomMember` interface since bots never carry one; consortia battle is player-only, so a
 *  missing field just falls back to "no pet shown", same as a bot would render). */
function petsIdOf(p: RoomMember): number {
  return (p as unknown as { hallPetsId?: number }).hallPetsId ?? 0;
}

function rosterView(info: ConsBatPlayerInfo, p: RoomMember): Out.ConsBatPlayerView {
  return {
    id: info.playerId, tombstoneEndTime: info.tombstoneEndTime, status: info.status, posX: info.posX, posY: info.posY,
    sex: info.sex, consortiaId: info.consortiaId, consortiaName: info.consortiaName,
    winningStreak: info.winningStreak, failBuffCount: info.failBuffCount,
    petsId: petsIdOf(p), style: p.info.Style, colors: p.info.Colors,
  };
}

function statusView(info: ConsBatPlayerInfo, p: RoomMember): Parameters<typeof Out.consBatPlayerStatus>[0] {
  return {
    id: info.playerId, tombstoneEndTime: info.tombstoneEndTime, status: info.status, posX: info.posX, posY: info.posY,
    winningStreak: info.winningStreak, failBuffCount: info.failBuffCount,
    petsId: petsIdOf(p), sex: info.sex, style: p.info.Style, colors: p.info.Colors,
  };
}

export class ConsBatRoom {
  /** BaseConsBatRoom.dictionary_0 (PlayerID -> GamePlayer). */
  private readonly players = new Map<number, RoomMember>();
  /** BaseConsBatRoom.dictionary_1 (PlayerID -> ConsortiaBattlePlayerInfo). */
  private readonly info = new Map<number, ConsBatPlayerInfo>();

  /** BaseConsBatRoom.CreateConsortiaBattlePlayerInfo (:35-54): spawn point + fresh tombstone (already expired,
   *  "now - 10min", so `isHide`/tombstone checks treat a freshly-entered player as not dead). */
  private createInfo(p: RoomMember): ConsBatPlayerInfo {
    return {
      playerId: p.id, sex: !!p.info.Sex, curHp: Math.max(1, p.info.hp), posX: 631, posY: 959,
      consortiaId: p.info.ConsortiaID, consortiaName: p.info.ConsortiaName,
      tombstoneEndTime: new Date(Date.now() - 10 * 60_000),
      status: ConsBatStatus.Free, victoryCount: 0, winningStreak: 0, failBuffCount: 0, score: 0,
      isPowerFullUsed: false, isDoubleScoreUsed: false,
    };
  }

  /** Read-only lookup for tests / other systems that need to check scene membership without mutating it. */
  infoOf(id: number): ConsBatPlayerInfo | undefined {
    return this.info.get(id);
  }

  private broadcast(pkt: PacketOut): void {
    for (const p of this.players.values()) p.send(pkt);
  }

  /**
   * BaseConsBatRoom.AddPlayer (:56-88): registers the player (re-entry keeps whatever scene state they already
   * had — score/streak/tombstone survive a re-enter, same as the original's `if (!dictionary_1.ContainsKey(...))`
   * guard) and replies 153/2 ENTER_SELF_INFO with `isJump=true`, which is what moves the AS3 client into
   * `StateType.CONSORTIA_BATTLE_SCENE`.
   */
  addPlayer(p: RoomMember): void {
    this.players.set(p.id, p);
    const info = this.info.get(p.id) ?? this.createInfo(p);
    this.info.set(p.id, info);
    p.send(Out.consBatSelfInfo(true, info));
  }

  /**
   * BaseConsBatRoom.RemovePlayer (:90-106): `player.SendTCP(pkg); method_1(pkg, player)` — sent to the leaver
   * directly PLUS broadcast to everyone else still registered (the leaver is already out of the roster by the
   * time the broadcast loop runs, so passing `p` here and sending to it explicitly first reproduces that exact
   * "once to them, once to everybody who's left" shape without double-sending to anyone).
   */
  removePlayer(p: RoomMember): boolean {
    const hadPlayer = this.players.delete(p.id);
    const hadInfo = this.info.delete(p.id);
    if (!hadPlayer && !hadInfo) return false;
    const pkt = Out.consBatDeletePlayer(p.id);
    p.send(pkt);
    this.broadcast(pkt);
    return true;
  }

  /** BaseConsBatRoom.SendUpdateRoom (:108-128) / SendConfirmEnterRoom (:260-280): identical body, reply-only
   *  to the requester — 153/3 ADD_PLAYER ("give me the roster", `sendConsBatRequestPlayerInfo`) and 153/21
   *  CONFIRM_ENTER (`sendConsBatConfirmEnter`, sent right after the state actually jumped). */
  sendRoster(p: RoomMember): void {
    const rows: Out.ConsBatPlayerView[] = [];
    for (const [id, info] of this.info) {
      const member = this.players.get(id);
      if (member) rows.push(rosterView(info, member));
    }
    p.send(Out.consBatPlayerList(rows));
  }

  /** BaseConsBatRoom.PlayerMove (:177-187): stores the new position; the broadcast itself is built by the
   *  handler with the packet's own path string (`ConsortiaBattleHander.cs` case 4 builds+sends inline, not
   *  through this class) — see handlers/consortia-battle/mover.ts. */
  playerMove(id: number, x: number, y: number): void {
    const info = this.info.get(id);
    if (info) { info.posX = x; info.posY = y; }
  }

  broadcastMove(pkt: PacketOut): void {
    this.broadcast(pkt);
  }

  /**
   * BaseConsBatRoom.Challenge (:130-161): both players must be registered AND currently `Free` — fixed vs the
   * original, which flips the FIRST-checked side (the challenge target) to `Fighting` and broadcasts that
   * before checking the second side (the sender); if the sender's own check then fails, the target is left
   * soft-locked in `Fighting` with no fight ever created (`gamePlayer2` set, `gamePlayer` null ->
   * `CreateConsortiaBattleRoom` never called). Validating both up front has the identical effect on the real
   * (both-valid) path and simply never produces that stuck state. Carries `curHp` onto the live player
   * (`gamePlayer.PlayerCharacter.hp = dictionary_1[PlayerId].curHp`, :143/153) so the duel starts at whatever
   * HP the scene last recorded for them — always equal to their login HP in this batch, since nothing updates
   * `curHp` yet (that's `BattleWin`/`BattleLost`, m3-consortia-battle-2).
   */
  challenge(selfId: number, targetId: number, createFight: (a: RoomMember, b: RoomMember) => void): void {
    const a = this.players.get(selfId);
    const ai = this.info.get(selfId);
    const b = this.players.get(targetId);
    const bi = this.info.get(targetId);
    if (!a || !ai || ai.status !== ConsBatStatus.Free) return;
    if (!b || !bi || bi.status !== ConsBatStatus.Free) return;
    ai.status = ConsBatStatus.Fighting;
    bi.status = ConsBatStatus.Fighting;
    this.broadcast(Out.consBatPlayerStatus(statusView(ai, a)));
    this.broadcast(Out.consBatPlayerStatus(statusView(bi, b)));
    a.info.hp = ai.curHp;
    b.info.hp = bi.curHp;
    createFight(a, b);
  }
}
