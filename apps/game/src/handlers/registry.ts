/**
 * Handler framework: PacketProcessor (IPacketHandler[512] keyed by ePackageType) + sub-command routers
 * (ConsortiaLogicProcessor, GameRoomLogicProcessor, ... read an int/byte sub-code then dispatch).
 * Errors are isolated per packet (the C# logs and keeps the connection).
 */
import type { GSPacket } from "@ddt/protocol";
import type { GameClient } from "../session/client.js";
import type { ServerContext } from "../session/context.js";
import type { GamePlayer } from "../game/player.js";

export type HandlerFn = (ctx: ServerContext, client: GameClient, pkt: GSPacket) => void | Promise<void>;
export type PlayerHandlerFn = (ctx: ServerContext, player: GamePlayer, pkt: GSPacket, client: GameClient) => void | Promise<void>;

export interface HandlerDef {
  code: number;
  name: string;
  /** Allowed before login completes (LOGIN, PING). Everything else is dropped pre-login (01 §0). */
  preLogin?: boolean;
  /** "implemented" | "partial" | "stub" (listed in HANDLERS.md). */
  status: "implemented" | "partial" | "stub";
  handle: HandlerFn;
}

export class HandlerRegistry {
  private readonly map = new Map<number, HandlerDef>();

  register(def: HandlerDef): this {
    // C#: the last class enumerated for a code wins; here a duplicate registration is a programming error.
    if (this.map.has(def.code)) throw new Error(`handler ${def.code} registered twice`);
    this.map.set(def.code, def);
    return this;
  }

  /** Convenience for handlers that need a logged-in player. */
  player(code: number, name: string, fn: PlayerHandlerFn, status: HandlerDef["status"] = "implemented"): this {
    return this.register({ code, name, status, handle: (ctx, c, p) => (c.player ? fn(ctx, c.player, p, c) : undefined) });
  }

  get(code: number): HandlerDef | undefined {
    return this.map.get(code);
  }

  list(): HandlerDef[] {
    return [...this.map.values()].sort((a, b) => a.code - b.code);
  }
}

/** Sub-command router (e.g. 94 GAME_ROOM reads an int sub, 160 IM_CMD reads a byte). */
export class SubRouter {
  private readonly subs = new Map<number, { name: string; fn: PlayerHandlerFn; status: HandlerDef["status"] }>();
  constructor(readonly read: "byte" | "int", readonly name: string) {}

  on(sub: number, name: string, fn: PlayerHandlerFn, status: HandlerDef["status"] = "implemented"): this {
    this.subs.set(sub, { name, fn, status });
    return this;
  }

  entries() {
    return [...this.subs.entries()].sort((a, b) => a[0] - b[0]);
  }

  handler: PlayerHandlerFn = (ctx, player, pkt, client) => {
    const sub = this.read === "int" ? pkt.readInt() : pkt.readByte();
    const h = this.subs.get(sub);
    if (!h) {
      ctx.log.debug(`${this.name}: sub ${sub} not handled`);
      return;
    }
    return h.fn(ctx, player, pkt, client);
  };
}
