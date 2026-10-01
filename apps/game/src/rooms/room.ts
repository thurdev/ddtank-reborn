/**
 * BaseRoom (Game.Server/Rooms/BaseRoom.cs): 10 seats — 0..7 players (Freedom: even = team 1, odd = team 2),
 * 8..9 viewers (team 99). placesState -1 open / 0 closed / playerId; playerState 0 not ready, 1 ready, 2 host.
 */
import type { GSPacket } from "@ddt/protocol";
import * as Out from "../packets/out.js";
import type { RoomMember } from "../game/player.js";
import type { FightGame } from "../fight/types.js";

export const RoomType = { Match: 0, Freedom: 1, Boss: 3, Dungeon: 4, FightLab: 5, Freshman: 10, Academy: 11, WordBossFight: 14 } as const;
export const GameType = { Free: 0, Guild: 1, ALL: 4, Dungeon: 7, FightLab: 8, Freshman: 10 } as const;
export const HardLevel = { Easy: 0, Normal: 1, Hard: 2, Terror: 3, Epic: 4, Simple: 5 } as const;

export interface RoomHost {
  /** RoomMgr.WaitingRoom.SendUpdateCurrentRoom. */
  onRoomChanged(room: BaseRoom): void;
  lang(id: string, ...a: unknown[]): string;
}

export class BaseRoom implements Out.RoomView {
  private places: (RoomMember | null)[] = new Array(10).fill(null);
  placesState: number[] = new Array(10).fill(-1);
  playerState: number[] = new Array(10).fill(0);
  private playerCount = 0;
  private placesCount = 10;
  private using = false;
  host: RoomMember | null = null;
  IsPlaying = false;
  maxViewerCnt = 0;
  private viewers = 0;
  Name = "";
  Pic = "";
  Password = "";
  isCrosszone = false;
  isWithinLeageTime = false;
  isOpenBoss = false;
  RoomType = 1;
  GameType = 0;
  HardLevel = HardLevel.Simple as number;
  LevelLimits = 0;
  currentFloor = 0;
  TimeMode = 0;
  MapId = 10000;
  GameStyle = 0;
  game: FightGame | null = null;
  /** Auto-match: room is queued for pairing. */
  matching = false;

  constructor(readonly RoomId: number, private readonly env: RoomHost) {}

  get PlayerCount(): number { return this.playerCount; }
  get PlacesCount(): number { return this.placesCount; }
  get viewerCnt(): number { return this.viewers; }
  get IsUsing(): boolean { return this.using; }
  get IsEmpty(): boolean { return this.playerCount === 0; }
  get NeedPassword(): boolean { return !!this.Password; }

  start(): void {
    if (!this.using) {
      this.using = true;
      this.reset();
    }
  }

  stop(): void {
    if (this.using) {
      this.using = false;
      this.game = null;
      this.IsPlaying = false;
      this.matching = false;
      this.env.onRoomChanged(this);
    }
  }

  private reset(): void {
    this.places.fill(null);
    this.placesState.fill(-1);
    this.playerState.fill(0);
    this.host = null;
    this.IsPlaying = false;
    this.placesCount = 10;
    this.playerCount = 0;
    this.viewers = 0;
    this.isCrosszone = false;
    this.HardLevel = HardLevel.Simple;
    this.Pic = "";
    this.MapId = 10000;
    this.currentFloor = 0;
    this.isOpenBoss = false;
    this.matching = false;
  }

  /** BaseRoom.UpdateRoom: Freedom 8 seats, other types 2 (host opens more). */
  updateRoom(name: string, pwd: string, roomType: number, timeMode: number, mapId: number): void {
    this.Name = name;
    this.Password = pwd;
    this.RoomType = roomType;
    this.TimeMode = timeMode;
    this.MapId = mapId;
    this.updateRoomGameType();
    this.placesCount = roomType === RoomType.Freedom ? 8 : 2;
    for (let i = this.placesCount; i < 10; i++) this.placesState[i] = 0;
  }

  updateRoomGameType(): void {
    switch (this.RoomType) {
      case RoomType.FightLab: this.GameType = GameType.FightLab; break;
      case RoomType.Boss: case RoomType.Dungeon: case RoomType.Academy: this.GameType = GameType.Dungeon; break;
      case RoomType.Freshman: this.GameType = GameType.Freshman; break;
      case RoomType.Match: case RoomType.Freedom: this.GameType = GameType.Free; break;
      default: this.GameType = GameType.ALL;
    }
  }

  getPlayers(): RoomMember[] {
    return this.places.filter((p): p is RoomMember => p != null);
  }

  getPlayersFight(): RoomMember[] {
    return this.places.slice(0, 8).filter((p): p is RoomMember => p != null);
  }

  canAddPlayer(): boolean { return this.playerCount < this.placesCount; }
  canAddViewPlayer(): boolean { return this.viewers < this.maxViewerCnt; }

  /** BaseRoom.CanStart. */
  canStart(): boolean {
    if (this.RoomType === RoomType.Freedom) {
      let red = 0, blue = 0;
      for (let i = 0; i < 10; i++) if (this.playerState[i]! > 0) (i % 2 === 0 ? red++ : blue++);
      return red > 0 && blue > 0;
    }
    let n = 0, v = 0;
    for (let i = 0; i < 10; i++) if (this.playerState[i]! > 0) (i < 8 ? n++ : v++);
    return n === this.playerCount && v === this.viewers;
  }

  sendToAll(pkt: GSPacket, except?: RoomMember | null): void {
    for (const p of this.places) if (p && p !== except) p.send(pkt);
  }

  sendToTeam(pkt: GSPacket, team: number, except?: RoomMember | null): void {
    for (const p of this.places) if (p && p.roomTeam === team && p !== except) p.send(pkt);
  }

  /** "host.Out.SendX(); SendToAll(pkg, host)" pattern = send to everyone. */
  private broadcast(pkt: GSPacket): void {
    if (this.host) this.sendToAll(pkt);
  }

  sendPlayerState(): void { this.broadcast(Out.roomPlayerStates(this.playerState)); }
  sendPlaceState(): void { this.broadcast(Out.roomPlacesStates(this.placesState)); }
  sendCancelPickUp(): void { this.broadcast(Out.roomByte(11)); }
  sendStartPickUp(): void { this.broadcast(Out.roomByte(13)); }
  sendMessage(type: number, msg: string): void { this.broadcast(Out.message(type, msg)); }
  sendRoomSetupChange(): void { this.broadcast(Out.roomSetupChange(this)); }

  updatePlayerState(p: RoomMember, state: number, sendToClient: boolean): void {
    if (p.roomIndex < 0) return;
    this.playerState[p.roomIndex] = state;
    if (sendToClient) this.sendPlayerState();
  }

  setHost(p: RoomMember): void {
    if (this.host === p) return;
    if (this.host) this.updatePlayerState(p, 0, false);
    this.host = p;
    this.updatePlayerState(p, 2, true);
  }

  /** BaseRoom.UpdateGameStyle: Match rooms whose members are all in the host's guild become Guild games. */
  updateGameStyle(): void {
    if (!this.host || this.RoomType !== RoomType.Match) return;
    const gid = this.host.info.ConsortiaID;
    const players = this.getPlayers();
    const sameGuild = gid !== 0 && players.length >= 2 && players.every((p) => p.info.ConsortiaID === gid);
    this.GameStyle = sameGuild ? 1 : 0;
    this.GameType = sameGuild ? GameType.Guild : GameType.Free;
    this.sendToAll(Out.roomByte(12, this.GameType));
  }

  /** BaseRoom.AddPlayerUnsafe (BaseRoom.cs). Buff lists are not resent (buffs not ported). */
  addPlayer(p: RoomMember): boolean {
    let num = -1;
    for (let i = 0; i < 10; i++) {
      if (this.places[i] == null && this.placesState[i] === -1) {
        this.places[i] = p;
        this.placesState[i] = p.id;
        if (i < 8) this.playerCount++;
        else this.viewers++;
        num = i;
        break;
      }
    }
    p.isViewer = false;
    if (num === -1) return false;
    p.currentRoom = this;
    p.roomIndex = num;
    p.roomTeam = this.RoomType === RoomType.Freedom ? (num % 2) + 1 : 1;
    if (num >= 8) {
      p.isViewer = true;
      p.roomTeam = 99;
    }
    const add = Out.roomPlayerAdd(p.view());
    p.send(add);
    this.sendToAll(add, p);
    for (const o of this.getPlayers()) if (o !== p) p.send(Out.roomPlayerAdd(o.view()));
    if (this.host == null) {
      this.host = p;
      this.updatePlayerState(p, 2, true);
    } else this.updatePlayerState(p, 0, true);
    this.sendPlaceState();
    this.updateGameStyle();
    return true;
  }

  /** BaseRoom.UpdatePosUnsafe. */
  updatePos(pos: number, _isOpened: boolean, place: number, _placeView: number): boolean {
    if (pos < 0 || pos > 9) return false;
    if (this.placesState[pos] === place) return false;
    const occ = this.places[pos];
    if (occ) this.removePlayer(occ);
    this.placesState[pos] = place;
    this.sendPlaceState();
    if (place === -1) pos < 8 ? this.placesCount++ : this.maxViewerCnt++;
    else if (place === 0) pos < 8 ? this.placesCount-- : this.maxViewerCnt--;
    return true;
  }

  /** BaseRoom.RemovePlayerUnsafe(player, isKick). */
  removePlayer(p: RoomMember, isKick = false): boolean {
    const num = this.places.indexOf(p);
    if (num === -1) return false;
    this.places[num] = null;
    this.playerState[num] = 0;
    this.placesState[num] = -1;
    if (num < 8) this.playerCount--;
    else this.viewers--;
    this.updatePos(num, false, -1, -100);
    p.currentRoom = null;
    p.roomIndex = -1;
    const rm = Out.roomPlayerRemove(p.id, p.view().zoneId);
    p.send(rm);
    this.sendToAll(rm);
    if (isKick) p.sendMessage(3, this.env.lang("Game.Server.SceneGames.KickRoom"));
    let newHost = false;
    if (this.host === p) {
      const next = this.places.find((x) => x != null) ?? null;
      if (next) {
        this.setHost(next);
        newHost = true;
      } else this.host = null;
    }
    p.onRoomLeft?.();
    if (this.IsPlaying) {
      this.game?.removePlayer(p);
      if (this.matching) {
        this.sendMessage(3, this.env.lang("Game.Server.SceneGames.PairUp.Failed"));
        this.matching = false;
        this.IsPlaying = false;
        this.sendCancelPickUp();
      }
    } else {
      this.updateGameStyle();
      if (newHost) {
        this.HardLevel = this.RoomType === RoomType.Dungeon ? HardLevel.Normal : HardLevel.Simple;
        for (const o of this.getPlayers()) o.send(Out.roomSetupChange(this));
      }
    }
    return true;
  }

  removePlayerAt(pos: number): void {
    const p = pos >= 0 && pos <= 9 ? this.places[pos] : null;
    if (p) this.removePlayer(p, true);
  }

  /** BaseRoom.SwitchTeamUnsafe. */
  switchTeam(p: RoomMember): boolean {
    if (this.RoomType === RoomType.Match) return false;
    for (let i = (p.roomIndex + 1) % 2; i < 8; i += 2) {
      if (this.places[i] == null && this.placesState[i] === -1) {
        const from = p.roomIndex;
        this.places[from] = null;
        this.places[i] = p;
        this.placesState[from] = -1;
        this.placesState[i] = p.id;
        this.playerState[i] = this.playerState[from]!;
        this.playerState[from] = 0;
        p.roomIndex = i;
        p.roomTeam = (i % 2) + 1;
        const pkt = Out.roomChangedTeam(p.id, p.roomTeam, p.roomIndex);
        p.send(pkt);
        this.sendToAll(pkt, p);
        this.sendPlaceState();
        return true;
      }
    }
    return false;
  }

  /** BaseRoom.GetLevelLimit (eLevelLimits). */
  static levelLimit(grade: number): number {
    return grade <= 10 ? 1 : grade <= 20 ? 2 : 3;
  }

  startGame(game: FightGame): void {
    this.game = game;
    this.IsPlaying = true;
  }

  /** BaseRoom.m_game_GameStopped. */
  onGameStopped(): void {
    this.game = null;
    this.IsPlaying = false;
    this.matching = false;
    for (let i = 0; i < 10; i++) if (this.playerState[i] !== 2) this.playerState[i] = 0;
    this.env.onRoomChanged(this);
  }
}
