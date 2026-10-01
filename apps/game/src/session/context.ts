/** Shared services handed to every handler (replaces the C# static managers WorldMgr/RoomMgr/ItemMgr/...). */
import type { DbHandle } from "@ddt/db";
import type { RsaPrivateKey } from "@ddt/protocol";
import type { Config } from "../config.js";
import type { Templates } from "../db/templates.js";
import type { GamePlayer } from "../game/player.js";
import type { RoomMgr } from "../rooms/room-mgr.js";
import type { FightEngine } from "../fight/types.js";
import type { LanguageMgr } from "../util/lang.js";
import type { Logger } from "../util/log.js";

/** Validates the socket LOGIN "user,password" (password = tempPwd issued by Login.ashx, see apps/api README). */
export interface TicketValidator {
  validate(userName: string, password: string): Promise<boolean>;
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
  fight: FightEngine;
  tickets: TicketValidator;
  rsaKey: RsaPrivateKey;
  /** ZoneId / ZoneName from Server_List (GameServer.Start). */
  zoneId: number;
  zoneName: string;
  /** Optional hook (admin channel) to disconnect a client: returns true if kicked. */
  now(): Date;
}
