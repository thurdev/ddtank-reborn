/**
 * RoomMgr + BaseWaitingRoom + room IActions (Game.Server/Rooms/*.cs). Actions are queued and executed in order on a
 * 40 ms tick (RoomMgr.THREAD_INTERVAL); empty rooms are stopped every 400 ms (CLEAR_ROOM_INTERVAL).
 * Match rooms (type 0) go to the auto-match queue (replaces BattleMgr.AddRoom -> Fighting.Server matchmaking).
 */
import type { PacketOut } from "@ddt/protocol";
import * as Out from "../packets/out.js";
import { PlayerState, type RoomMember } from "../game/player.js";
import type { ClientKind } from "../game/player-info.js";
import type { FightEngine } from "../fight/types.js";
import type { BotProvider, VirtualPlayer } from "../bots/bot.js";
import { BaseRoom, RoomType, GameType } from "./room.js";

export interface RoomMgrOptions {
  maxRooms: number;
  fight: FightEngine;
  lang: (id: string, ...a: unknown[]) => string;
  bots?: BotProvider;
  /** Seconds before an unmatched Match room is paired with bots (if a provider exists). */
  botFallbackSec?: number;
  random?: () => number;
  /** QA dev switch (cfg.ALL_OPEN): any player level may enter any Dungeon room, ignoring room.LevelLimits
   *  (EnterRoomAction.cs level check). Never changes what CreateRoomAction sets LevelLimits to — only the
   *  entry check below is bypassed, so the original rule still runs (and still applies) when this is off. */
  allOpen?: boolean;
  /** PVEGame.Stop → PlayerDetail.OutLabyrinth(isWin) for a RoomType.Labyrinth room (GamePlayer.cs:4315); every
   *  other PVE room type ignores this (only Dungeon resets itself, inline below). */
  onLabyrinthFinished?(room: BaseRoom, isWin: boolean): void;
}

type Action = () => void;

export class RoomMgr {
  readonly rooms: BaseRoom[];
  /** BaseWaitingRoom.m_list (players in the lobby scene). */
  readonly waiting = new Map<number, RoomMember>();
  private queue: Action[] = [];
  private timer: NodeJS.Timeout | null = null;
  private lastClear = 0;
  private matchQueue: { room: BaseRoom; since: number }[] = [];
  private readonly rnd: () => number;

  constructor(private readonly o: RoomMgrOptions) {
    this.rnd = o.random ?? Math.random;
    const env = { onRoomChanged: (r: BaseRoom) => this.sendUpdateCurrentRoom(r), lang: o.lang };
    this.rooms = Array.from({ length: Math.max(1, o.maxRooms) }, (_, i) => new BaseRoom(i + 1, env));
  }

  start(): void {
    if (!this.timer) this.timer = setInterval(() => this.tick(), 40);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** RoomMgr.AddAction. */
  addAction(a: Action): void {
    this.queue.push(a);
  }

  /** One RoomThread iteration (also used by tests). */
  tick(now = Date.now()): number {
    let n = 0;
    while (this.queue.length) {
      const batch = this.queue;
      this.queue = [];
      for (const a of batch) {
        n++;
        try {
          a();
        } catch (err) {
          console.error("RoomMgr action error", err);
        }
      }
    }
    if (now - this.lastClear >= 400) {
      this.lastClear = now;
      for (const r of this.rooms) if (r.IsUsing && r.PlayerCount === 0 && r.viewerCnt === 0) r.stop();
      this.processMatchQueue(now);
    }
    return n;
  }

  // ------------------------------------------------------------------ lists
  getAllRooms(): BaseRoom[] {
    return this.rooms.filter((r) => !r.IsEmpty);
  }
  getAllMatchRooms(): BaseRoom[] {
    return this.rooms.filter((r) => r.IsUsing && (r.RoomType === RoomType.Match || r.RoomType === RoomType.Freedom));
  }
  getAllPveRooms(): BaseRoom[] {
    return this.rooms.filter((r) => r.IsUsing && (r.RoomType === RoomType.Dungeon || r.RoomType === RoomType.Academy || r.RoomType === RoomType.Boss));
  }
  usingRooms(): BaseRoom[] {
    return this.rooms.filter((r) => r.IsUsing);
  }

  // ------------------------------------------------------------------ waiting room (BaseWaitingRoom.cs)
  private sendToWaiting(pkt: Parameters<RoomMember["send"]>[0], except?: RoomMember): void {
    for (const p of this.waiting.values()) if (p !== except) p.send(pkt);
  }

  /**
   * Same broadcast as `sendToWaiting`, but for a packet whose LAYOUT depends on the receiver's clientKind
   * (18 SCENE_ADD_USER — see `Out.sceneAddPlayer`, research/6600/packets-m1.md): builds at most 2 variants
   * (one per kind actually present) instead of sharing a single buffer.
   */
  private sendToWaitingByKind(build: (k: ClientKind) => PacketOut, except?: RoomMember): void {
    let p41: PacketOut | undefined;
    let p6600: PacketOut | undefined;
    for (const p of this.waiting.values()) {
      if (p === except) continue;
      p.send(p.clientKind === "6600" ? (p6600 ??= build("6600")) : (p41 ??= build("41")));
    }
  }

  waitingAdd(p: RoomMember): boolean {
    if (this.waiting.has(p.id)) return false;
    this.waiting.set(p.id, p);
    p.send(Out.sceneAddPlayer(p.info, p.clientKind));
    this.sendToWaitingByKind((k) => Out.sceneAddPlayer(p.info, k), p);
    return true;
  }

  waitingRemove(p: RoomMember): void {
    if (this.waiting.delete(p.id)) {
      const pkt = Out.sceneRemovePlayer(p.id);
      p.send(pkt);
      this.sendToWaiting(pkt, p);
    }
  }

  /** BaseWaitingRoom.SendUpdateRoom(player). */
  sendRoomListTo(p: RoomMember): void {
    p.send(Out.roomList(p.playerState === PlayerState.Away ? this.getAllPveRooms() : this.getAllMatchRooms()));
  }

  /** BaseWaitingRoom.SendUpdateRoom(room): lobby players get the PvP or PvE list by their state. */
  sendUpdateRoom(): void {
    const pvp: BaseRoom[] = [];
    const pve: BaseRoom[] = [];
    for (const r of this.getAllRooms()) {
      if (r.RoomType === RoomType.Freedom || r.RoomType === RoomType.Match) pvp.push(r);
      if (r.RoomType === RoomType.Dungeon || r.RoomType === 18 || r.RoomType === 21 || r.RoomType === 23) pve.push(r);
    }
    const a = Out.roomList(pvp);
    const b = Out.roomList(pve);
    for (const p of this.waiting.values()) {
      if (p.playerState === PlayerState.Online) p.send(a);
      else if (p.playerState === PlayerState.Away) p.send(b);
    }
  }

  /** BaseWaitingRoom.SendUpdateCurrentRoom: room members get [own room + list]. */
  sendUpdateCurrentRoom(room: BaseRoom): void {
    const list = [room, ...(room.host?.playerState === PlayerState.Away ? this.getAllPveRooms() : this.getAllMatchRooms())];
    const pkt = Out.roomList(list);
    for (const p of room.getPlayers()) p.send(pkt);
  }

  // ------------------------------------------------------------------ actions
  /** EnterWaitingRoomAction. */
  enterWaitingRoom(p: RoomMember): void {
    this.addAction(() => {
      p.currentRoom?.removePlayer(p);
      if (this.waitingAdd(p)) {
        p.send(Out.roomList(this.getAllRooms()));
        for (const o of this.waiting.values()) if (o !== p) p.send(Out.sceneAddPlayer(o.info, p.clientKind));
      } else {
        this.sendRoomListTo(p);
        p.send(Out.sceneAddPlayer(p.info, p.clientKind));
        this.sendToWaitingByKind((k) => Out.sceneAddPlayer(p.info, k), p);
        for (const o of this.waiting.values()) if (o !== p) p.send(Out.sceneAddPlayer(o.info, p.clientKind));
      }
    });
  }

  exitWaitingRoom(p: RoomMember): void {
    this.addAction(() => this.waitingRemove(p));
  }

  /** CreateRoomAction (Rooms/CreateRoomAction.cs). */
  createRoom(p: RoomMember, name: string, password: string, roomType: number, timeType: number): void {
    this.addAction(() => {
      p.currentRoom?.removePlayer(p);
      let room: BaseRoom | null = null;
      let idx = Math.floor(this.rnd() * this.rooms.length);
      for (let i = 0; i < this.rooms.length; i++) {
        if (!this.rooms[idx]!.IsUsing) {
          room = this.rooms[idx]!;
          break;
        }
        idx = Math.floor(this.rnd() * this.rooms.length);
      }
      room ??= this.rooms.find((r) => !r.IsUsing) ?? null; // C# gives up after N random probes; we fall back to a scan
      if (!room) {
        p.sendMessage(1, this.o.lang("CreateRoomAction.MaxRoom"));
        return;
      }
      this.waitingRemove(p);
      room.start();
      if (roomType === RoomType.Dungeon) {
        room.HardLevel = 1;
        room.LevelLimits = BaseRoom.levelLimit(p.info.Grade);
        room.maxViewerCnt = 1;
      }
      room.updateRoom(name, password, roomType, timeType, 0);
      p.send(Out.roomCreate(room, p.clientKind));
      room.addPlayer(p);
      this.sendUpdateCurrentRoom(room);
      this.sendUpdateRoom();
    });
  }

  /** GameRoom/Handle/Login.cs (runs inline in the original, here queued to keep room ordering). */
  enterRoom(p: RoomMember, roomId: number, pwd: string, hallType: number): void {
    this.addAction(() => {
      const fail = (key?: string) => {
        if (key) p.sendMessage(1, this.o.lang(key));
        p.send(Out.roomLoginResult(false));
      };
      if (!p.hasMainWeapon) return fail("Game.Server.SceneGames.NoEquip");
      p.currentRoom?.removePlayer(p);
      let room: BaseRoom | null;
      if (roomId === -1) {
        room = this.rooms.find((r) => r.PlayerCount > 0 && r.canAddPlayer() && !r.NeedPassword && !r.IsPlaying && r.RoomType !== RoomType.Freshman && r.RoomType === hallType) ?? null;
        if (!room) return fail("EnterRoomAction.noroom");
      } else {
        room = roomId > 0 && roomId <= this.rooms.length ? this.rooms[roomId - 1]! : null;
        if (!room) return fail("EnterRoomAction.noexist");
      }
      if (!room.IsUsing) return fail("EnterRoomAction.noexist");
      if (room.IsPlaying) return fail("EnterRoomAction.start");
      if (room.PlayerCount === room.PlacesCount) {
        if (!room.canAddViewPlayer()) return fail("EnterRoomAction.full");
        this.waitingRemove(p);
        p.send(Out.roomLoginResult(true));
        p.send(Out.roomCreate(room, p.clientKind));
        room.addPlayer(p);
        this.sendUpdateCurrentRoom(room);
        p.send(Out.roomSetupChange(room));
        room.updatePlayerState(p, 1, false);
        return;
      }
      if (room.NeedPassword && room.Password !== pwd) return fail(pwd ? "EnterRoomAction.passworderror" : "EnterRoomAction.EnterPassword");
      if (!this.o.allOpen && room.RoomType === RoomType.Dungeon && room.LevelLimits > BaseRoom.levelLimit(p.info.Grade)) return fail("EnterRoomAction.level");
      this.waitingRemove(p);
      p.send(Out.roomLoginResult(true));
      p.send(Out.roomCreate(room, p.clientKind));
      room.addPlayer(p);
      this.sendRoomListTo(p);
      p.send(Out.roomSetupChange(room));
    });
  }

  /** ExitRoomAction. */
  exitRoom(room: BaseRoom, p: RoomMember): void {
    this.addAction(() => {
      room.removePlayer(p);
      room.sendPlaceState();
      this.sendUpdateCurrentRoom(room);
      if (room.IsEmpty) room.stop();
      this.sendUpdateRoom();
    });
  }

  kickPlayer(room: BaseRoom, place: number): void {
    this.addAction(() => room.removePlayerAt(place));
  }

  switchTeam(p: RoomMember): void {
    this.addAction(() => p.currentRoom?.switchTeam(p));
  }

  updatePlayerState(p: RoomMember, state: number): void {
    const room = p.currentRoom;
    this.addAction(() => {
      if (room && p.currentRoom === room) room.updatePlayerState(p, state, true);
    });
  }

  updateRoomPos(room: BaseRoom, pos: number, isOpened: boolean, place: number, placeView: number): void {
    this.addAction(() => {
      if (room.PlayerCount > 0 && room.updatePos(pos, isOpened, place, placeView)) this.sendUpdateCurrentRoom(room);
    });
  }

  /** RoomSetupChangeAction (subset: map, type, password, name, time mode, hardness, level limit, Labyrinth floor). */
  setupChange(room: BaseRoom, s: { mapId: number; roomType: number; password: string; name: string; timeMode: number; hardLevel: number; levelLimits: number; isCrosszone: boolean; isOpenBoss: boolean; currentFloor?: number }): void {
    this.addAction(() => {
      room.MapId = s.mapId;
      room.RoomType = s.roomType;
      room.Password = s.password;
      room.Name = s.name;
      room.TimeMode = s.timeMode;
      room.HardLevel = s.hardLevel;
      room.LevelLimits = s.levelLimits;
      room.isCrosszone = s.isCrosszone;
      room.isOpenBoss = s.isOpenBoss;
      if (s.currentFloor !== undefined) room.currentFloor = s.currentFloor;
      room.updateRoomGameType();
      room.sendRoomSetupChange();
      this.sendUpdateCurrentRoom(room);
    });
  }

  /** StartGameAction (Rooms/StartGameAction.cs). */
  startGame(room: BaseRoom): void {
    this.addAction(() => {
      if (!room.canStart()) return;
      const players = room.getPlayersFight();
      if (room.RoomType === RoomType.Freedom) {
        const red = players.filter((p) => p.roomTeam === 1);
        const blue = players.filter((p) => p.roomTeam !== 1);
        this.launch([room], red, blue, room.RoomType, room.GameType, room.TimeMode, room.MapId);
      } else if (room.RoomType === RoomType.Match) {
        room.IsPlaying = true;
        room.matching = true;
        room.sendStartPickUp();
        this.matchQueue.push({ room, since: Date.now() });
        this.processMatchQueue(Date.now());
      } else this.launchPve(room, players);
      this.sendUpdateCurrentRoom(room);
    });
  }

  /**
   * CreateConsortiaBattleRoomAction (Rooms/CreateConsortiaBattleRoomAction.cs): both players join a free room
   * directly (no lobby/ready step — same "jump straight to StartPVPGame once PlayerCount==2" as the original)
   * at `RoomType.ConsortiaBattle`/`GameType.ConsortiaBattle`, timeMode 2, mapId 0 (`UpdateRoom(..., byte_0:
   * 2, 0)`); `launch()`'s `DdtFightEngine.startPvp` falls back to a real map when 0 isn't one, same as every
   * other 1v1 room already does. Deviation: the original's second removal (Execute():42-44) is
   * `gamePlayer_1.CurrentRoom.RemovePlayerUnsafe(gamePlayer_0)` — the WRONG player passed to that call
   * (harmless no-op there: removing a non-member does nothing) — fixed here to remove `b` from its own room.
   * Called from `game/consortia-battle.ts ConsBatRoom.challenge()`.
   */
  createConsortiaBattleRoom(a: RoomMember, b: RoomMember): void {
    this.addAction(() => {
      a.currentRoom?.removePlayer(a);
      b.currentRoom?.removePlayer(b);
      const room = this.rooms.find((r) => !r.IsUsing);
      if (!room) return;
      this.waitingRemove(a);
      room.start();
      room.updateRoom("Consortia Battle", "12dasSda44", RoomType.ConsortiaBattle, 2, 0);
      a.send(Out.roomCreate(room, a.clientKind));
      if (room.addPlayer(a)) {
        this.waitingRemove(b);
        b.send(Out.roomLoginResult(true));
        b.send(Out.roomCreate(room, b.clientKind));
        room.addPlayer(b);
      }
      if (room.PlayerCount === 2) this.launch([room], [a], [b], RoomType.ConsortiaBattle, GameType.ConsortiaBattle, 2, 0);
    });
  }

  /**
   * CreateRingStationRoomAction (Rooms/CreateRingStationRoomAction.cs): the opponent never sits in a room seat
   * (`PickUpNpcId`/`StartWithNpc` fed the bot straight into `BattleMgr.AddRoom` in the original, same as the
   * Match-queue bot fallback above) — `bot` is a snapshot of the real defender's stats, built by
   * `game/ringstation.ts`, passed straight to `launch` as the lone "blue" seat.
   */
  createRingStationBattle(challenger: RoomMember, bot: RoomMember, onNoRoom?: () => void): void {
    this.addAction(() => {
      challenger.currentRoom?.removePlayer(challenger);
      const room = this.rooms.find((r) => !r.IsUsing);
      if (!room) {
        challenger.sendMessage(1, this.o.lang("CreateRoomAction.MaxRoom"));
        onNoRoom?.();
        return;
      }
      this.waitingRemove(challenger);
      room.start();
      room.updateRoom("RingStation Battle", "12dasSda44", RoomType.RingStation, 2, 0);
      challenger.send(Out.roomCreate(room, challenger.clientKind));
      room.addPlayer(challenger);
      this.launch([room], [challenger], [bot], RoomType.RingStation, GameType.RingStation, 2, 0);
    });
  }

  /** GamePickupCancel (GameRoom/Handle/GamePickupCancel.cs). */
  cancelPickup(p: RoomMember): void {
    this.addAction(() => {
      const room = p.currentRoom;
      if (!room) return;
      if (room.matching) {
        this.matchQueue = this.matchQueue.filter((q) => q.room !== room);
        room.matching = false;
        room.IsPlaying = false;
        room.sendCancelPickUp();
        if (p !== room.host) {
          room.host?.sendMessage(3, this.o.lang("Game.Server.SceneGames.PairUp.Failed"));
          room.updatePlayerState(p, 0, true);
        } else room.updatePlayerState(p, 2, true);
      } else room.removePlayer(p);
    });
  }

  /** Auto-match: pairs queued Match rooms with the same player count (Fighting.Server matchmaking). */
  private processMatchQueue(now: number): void {
    this.matchQueue = this.matchQueue.filter((q) => q.room.matching && q.room.IsUsing && q.room.PlayerCount > 0);
    for (let i = 0; i < this.matchQueue.length; i++) {
      const a = this.matchQueue[i]!;
      // guild rooms (GameStyle 1) only meet another guild (Fighting.Server ProxyRoomMgr: same GuildId never matched)
      const j = this.matchQueue.findIndex((b, k) => k > i && b.room.PlayerCount === a.room.PlayerCount && b.room.GameType === a.room.GameType && (a.room.GameStyle !== 1 || a.room.host?.info.ConsortiaID !== b.room.host?.info.ConsortiaID));
      if (j !== -1) {
        const b = this.matchQueue[j]!;
        this.matchQueue.splice(j, 1);
        this.matchQueue.splice(i, 1);
        i--;
        this.launch([a.room, b.room], a.room.getPlayersFight(), b.room.getPlayersFight(), RoomType.Match, a.room.GameType, a.room.TimeMode, 0);
        continue;
      }
      const fallback = this.o.botFallbackSec ?? 30;
      if (this.o.bots && now - a.since >= fallback * 1000) {
        const bots = a.room.getPlayersFight().map((p) => this.o.bots!.acquire(p.info.Grade)).filter((x): x is NonNullable<typeof x> => !!x);
        if (bots.length === a.room.PlayerCount) {
          this.matchQueue.splice(i, 1);
          i--;
          this.launch([a.room], a.room.getPlayersFight(), bots, RoomType.Match, a.room.GameType, a.room.TimeMode, 0);
        } else bots.forEach((b) => this.o.bots!.release(b));
      }
    }
  }

  /** StartGameAction PvE branch → GameMgr.StartPVEGame (Rooms/StartGameAction.cs:55-75). */
  private launchPve(room: BaseRoom, players: RoomMember[]): void {
    const game = this.o.fight.startPve?.({
      roomId: room.RoomId, roomType: room.RoomType, gameType: room.GameType, timeType: room.TimeMode, pveId: room.MapId,
      hardLevel: room.HardLevel, levelLimits: room.LevelLimits, currentFloor: room.currentFloor, players,
      onStopped: () => room.onGameStopped(),
      // PlayerDetail.ResetRoom (GamePlayer.cs): a dungeon room goes back to "choose a dungeon"
      onFinished: (isWin: boolean) => {
        if (room.RoomType === RoomType.Dungeon) {
          room.Pic = "";
          room.MapId = 10000;
          room.currentFloor = 0;
          room.isOpenBoss = false;
          room.sendRoomSetupChange();
        } else if (room.RoomType === RoomType.Labyrinth) {
          this.o.onLabyrinthFinished?.(room, isWin);
        }
      },
    }) ?? null;
    if (!game) {
      room.IsPlaying = false;
      room.sendPlayerState();
      room.sendMessage(3, this.o.lang("StartGameAction.noBattleServe"));
      room.sendCancelPickUp();
      return;
    }
    room.startGame(game);
  }

  private launch(rooms: BaseRoom[], red: RoomMember[], blue: RoomMember[], roomType: number, gameType: number, timeType: number, mapId: number): void {
    for (const r of rooms) r.matching = false;
    const game = this.o.fight.startPvp({
      roomId: rooms[0]!.RoomId,
      roomType,
      gameType,
      timeType,
      mapId,
      red,
      blue,
      onStopped: () => {
        rooms.forEach((r) => r.onGameStopped());
        for (const m of [...red, ...blue]) if (m.isBot) this.o.bots?.release(m as VirtualPlayer);
      },
    });
    if (!game) {
      for (const r of rooms) {
        r.IsPlaying = false;
        r.sendPlayerState();
        r.sendMessage(3, this.o.lang("StartGameAction.noBattleServe"));
        r.sendCancelPickUp();
      }
      return;
    }
    for (const r of rooms) {
      r.startGame(game);
      this.sendUpdateCurrentRoom(r);
    }
  }
}
