/**
 * Boot-time template caches (ItemMgr / ShopMgr / MapMgr / QuestMgr / LevelMgr).
 * "Shop_Goods" = item templates, "Shop" = listings, "ShopGoodsShowList" = goods on sale (ShopMgr.IsOnShop).
 */
import { eq, sql } from "drizzle-orm";
import { game, player, type Database } from "@ddt/db";
import type { ItemTemplate } from "../game/item.js";

export type ShopRow = typeof game.Shop.$inferSelect;

/** ShopItemInfo with the double-typed columns of game."Shop" truncated to the C# int fields. */
export interface ShopItemInfo {
  ID: number; ShopID: number; TemplateID: number; BuyType: number; IsBind: number; Beat: number; LimitCount: number;
  AUnit: number; APrice1: number; AValue1: number; APrice2: number; AValue2: number; APrice3: number; AValue3: number;
  BUnit: number; BPrice1: number; BValue1: number; BPrice2: number; BValue2: number; BPrice3: number; BValue3: number;
  CUnit: number; CPrice1: number; CValue1: number; CPrice2: number; CValue2: number; CPrice3: number; CValue3: number;
}

const n = (v: number | null | undefined) => (v == null ? 0 : Math.trunc(v));

export function toShopItem(r: ShopRow): ShopItemInfo {
  return {
    ID: n(r.ID), ShopID: n(r.ShopID), TemplateID: n(r.TemplateID), BuyType: n(r.BuyType), IsBind: n(r.IsBind), Beat: r.Beat ?? 1, LimitCount: n(r.LimitCount),
    AUnit: n(r.AUnit), APrice1: n(r.APrice1), AValue1: n(r.AValue1), APrice2: n(r.APrice2), AValue2: n(r.AValue2), APrice3: n(r.APrice3), AValue3: n(r.AValue3),
    BUnit: n(r.BUnit), BPrice1: n(r.BPrice1), BValue1: n(r.BValue1), BPrice2: n(r.BPrice2), BValue2: n(r.BValue2), BPrice3: n(r.BPrice3), BValue3: n(r.BValue3),
    CUnit: n(r.CUnit), CPrice1: n(r.CPrice1), CValue1: n(r.CValue1), CPrice2: n(r.CPrice2), CValue2: n(r.CValue2), CPrice3: n(r.CPrice3), CValue3: n(r.CValue3),
  };
}

export interface ServerRow { ID: number; Name: string; Room: number; Total: number; ZoneId: number; ZoneName: string }

export class Templates {
  items = new Map<number, ItemTemplate>();
  shop = new Map<number, ShopItemInfo>();
  showList = new Set<number>();
  maps = new Set<number>();
  serverMaps = new Map<number, number[]>();
  quests = new Set<number>();
  levels = new Map<number, number>();
  server: ServerRow | null = null;

  findItem = (id: number): ItemTemplate | undefined => this.items.get(id);

  async load(db: Database, serverId: number): Promise<this> {
    const [items, shop, show, maps, mapServer, quests, levels, srv] = await Promise.all([
      db.select().from(game.Shop_Goods),
      db.select().from(game.Shop),
      db.select({ ShopId: game.ShopGoodsShowList.ShopId }).from(game.ShopGoodsShowList),
      db.select({ ID: game.Game_Map.ID }).from(game.Game_Map),
      db.select().from(game.Map_Server),
      db.select({ ID: game.Quest.ID }).from(game.Quest),
      db.select().from(game.LevelInfo),
      db.select().from(player.Server_List).where(eq(player.Server_List.ID, serverId)).limit(1),
    ]);
    this.items = new Map(items.map((t) => [t.TemplateID, t]));
    this.shop = new Map();
    for (const r of shop) {
      const s = toShopItem(r);
      if (!this.shop.has(s.ID)) this.shop.set(s.ID, s); // ShopMgr.LoadFromDatabase keeps the first row per ID
    }
    this.showList = new Set(show.map((s) => s.ShopId));
    this.maps = new Set(maps.map((m) => m.ID));
    this.serverMaps = new Map(mapServer.map((m) => [m.ServerID, m.OpenMap.split(/[|,]/).map(Number).filter((x) => x > 0)]));
    this.quests = new Set(quests.map((q) => q.ID));
    this.levels = new Map(levels.map((l) => [l.Grade, l.Blood]));
    const s = srv[0];
    this.server = s ? { ID: s.ID, Name: s.Name ?? "", Room: s.Room, Total: s.Total, ZoneId: s.ZoneId, ZoneName: s.ZoneName } : null;
    return this;
  }

  /** ShopMgr.IsOnShop (ShopMgr.cs:294) incl. IsSpecialItem ids. */
  isOnShop(id: number): boolean {
    return id === 1100401 || id === 1100801 || id === 1101201 || id === 1101601 || this.showList.has(id);
  }

  /** MapMgr.GetMapIndex (Game.Logic/MapMgr.cs:60): a known id, else random from this server's Map_Server list. */
  pickMap(mapId: number, serverId: number, rnd = Math.random): number {
    if (mapId !== 0 && this.maps.has(mapId)) return mapId;
    const list = this.serverMaps.get(serverId) ?? this.serverMaps.get(1) ?? [...this.maps];
    return list.length ? list[Math.floor(rnd() * list.length)]! : 1001;
  }
}

/**
 * Shared server registry with apps/api: app."Servers" stores the REAL TCP port; ServerList.ashx advertises port - 69
 * (the client adds 69, ServerListAnalyzer.as:44). Raw SQL: @ddt/db does not re-export the app schema.
 */
export async function upsertServer(db: Database, s: { id: number; name: string; host: string; port: number; wsUrl: string | null }): Promise<void> {
  await db.execute(sql`INSERT INTO "app"."Servers" ("id","name","host","port","wsUrl","state","lastSeenAt")
    VALUES (${s.id}, ${s.name}, ${s.host}, ${s.port}, ${s.wsUrl}, 1, now())
    ON CONFLICT ("id") DO UPDATE SET "host" = EXCLUDED."host", "port" = EXCLUDED."port", "wsUrl" = EXCLUDED."wsUrl", "lastSeenAt" = now()`);
}

export async function heartbeat(db: Database, id: number, online: number): Promise<void> {
  await db.execute(sql`UPDATE "app"."Servers" SET "online" = ${online}, "lastSeenAt" = now() WHERE "id" = ${id}`);
}
