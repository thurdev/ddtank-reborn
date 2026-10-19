/** Shared services handed to every handler (replaces the C# static managers WorldMgr/RoomMgr/ItemMgr/...). */
import type { DbHandle } from "@ddt/db";
import type { RsaPrivateKey } from "@ddt/protocol";
import type { Config } from "../config.js";
import type { Templates } from "../db/templates.js";
import type { GamePlayer } from "../game/player.js";
import type { ClientKind } from "../game/player-info.js";
import type { NewHallRoom } from "../game/new-hall.js";
import type { ConsBatRoom } from "../game/consortia-battle.js";
import type { RingStationRoom } from "../game/ringstation.js";
import type { RoomMgr } from "../rooms/room-mgr.js";
import type { FightEngine } from "../fight/types.js";
import type { LanguageMgr } from "../util/lang.js";
import type { Logger } from "../util/log.js";
import type { Bus } from "../bus/index.js";
import type { CrossChannel } from "../bus/cross-channel.js";
import type { LeaderElection } from "../bus/leader.js";

/** Validates the socket LOGIN "user,password" (password = tempPwd issued by Login.ashx, see apps/api README). */
export interface TicketValidator {
  validate(userName: string, password: string): Promise<boolean>;
  /** Which swf issued the ticket (app.LoginSessions.Client, M1 client detection) — "41" when unknown. */
  clientKindFor?(userName: string): Promise<ClientKind>;
}

/** WorldMgr: online players by id / nickname. */
export class World {
  private readonly byId = new Map<number, GamePlayer>();
  /** LoginMgr: account names currently logging in (UserLoginHandler rejects duplicates). */
  readonly loggingIn = new Set<string>();

  add(p: GamePlayer): boolean {
    if (this.byId.has(p.id)) return false;
    this.byId.set(p.id, p);
    return true;
  }
  remove(p: GamePlayer): void {
    if (this.byId.get(p.id) === p) this.byId.delete(p.id);
  }
  get(id: number): GamePlayer | undefined {
    return this.byId.get(id);
  }
  getByNick(nick: string): GamePlayer | undefined {
    for (const p of this.byId.values()) if (p.info.NickName === nick) return p;
    return undefined;
  }
  all(): GamePlayer[] {
    return [...this.byId.values()];
  }
  /** WorldMgr.GetAllPlayersNoGame: not in a playing room. */
  allNoGame(): GamePlayer[] {
    return this.all().filter((p) => !p.currentRoom?.IsPlaying);
  }
  get size(): number {
    return this.byId.size;
  }
}

export interface ServerContext {
  cfg: Config;
  db: DbHandle;
  templates: Templates;
  lang: LanguageMgr;
  log: Logger;
  world: World;
  rooms: RoomMgr;
  /** WorldMgr.NewHallRooms (6600-only walkable hall, m2-newhall): game/new-hall.ts. */
  newHall: NewHallRoom;
  /** RoomMgr.ConsBatRoom (153 CONSORTIA_BATTLE guild-war arena, m3-consortia-battle): game/consortia-battle.ts. */
  consBat: ConsBatRoom;
  /** RingStationMgr-equivalent runtime (404 RING_STATION, m3-ringstation): game/ringstation.ts. */
  ringStation: RingStationRoom;
  fight: FightEngine;
  tickets: TicketValidator;
  rsaKey: RsaPrivateKey;
  /** ZoneId / ZoneName from Server_List (GameServer.Start). */
  zoneId: number;
  zoneName: string;
  /** ch-bus: pub/sub entre canais (bus/index.ts). NoopBus (padrão) = nada atravessa processo. */
  bus: Bus;
  /** ch-bus: login único / chat mundial / sussurro / presença entre canais, construído sobre `bus`
   *  (bus/cross-channel.ts wireCrossChannel, chamado 1x em GameServer.start()). */
  crossChannel: CrossChannel;
  /** ch-eventos: qual canal é a autoridade do boss mundial agora (bus/leader.ts wireLeaderElection, chamado
   *  1x em GameServer.start() antes de wireCrossChannel). Sem barramento ativo é sempre true (canal único). */
  leader: LeaderElection;
  /** Optional hook (admin channel) to disconnect a client: returns true if kicked. */
  now(): Date;
}
