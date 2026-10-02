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

export type QuestRow = typeof game.Quest.$inferSelect;
export type QuestCondRow = typeof game.Quest_Condiction.$inferSelect;
export type QuestGoodsRow = typeof game.Quest_Goods.$inferSelect;
/** QuestMgr: QuestInfo + its conditions (ordered by CondictionID, like GetQuestCondiction) + rewards. */
export interface QuestTemplate { info: QuestRow; conds: QuestCondRow[]; goods: QuestGoodsRow[] }

export interface ServerRow { ID: number; Name: string; Room: number; Total: number; ZoneId: number; ZoneName: string }

export class Templates {
  items = new Map<number, ItemTemplate>();
  shop = new Map<number, ShopItemInfo>();
  showList = new Set<number>();
  maps = new Set<number>();
  serverMaps = new Map<number, number[]>();
  quests = new Map<number, QuestTemplate>();
  levels = new Map<number, number>();
  /** LevelInfo GP thresholds, ascending by grade (LevelMgr.GetLevel). */
  levelGp: { grade: number; gp: number }[] = [];
  dropConditions: (typeof game.Drop_Condiction.$inferSelect)[] = [];
  dropItems = new Map<number, (typeof game.Drop_Item.$inferSelect)[]>();
  server: ServerRow | null = null;

  findItem = (id: number): ItemTemplate | undefined => this.items.get(id);

  async load(db: Database, serverId: number): Promise<this> {
    const [items, shop, show, maps, mapServer, quests, levels, srv, dropC, dropI, qConds, qGoods] = await Promise.all([
      db.select().from(game.Shop_Goods),
      db.select().from(game.Shop),
      db.select({ ShopId: game.ShopGoodsShowList.ShopId }).from(game.ShopGoodsShowList),
      db.select({ ID: game.Game_Map.ID }).from(game.Game_Map),
      db.select().from(game.Map_Server),
      db.select().from(game.Quest),
      db.select().from(game.LevelInfo),
      db.select().from(player.Server_List).where(eq(player.Server_List.ID, serverId)).limit(1),
      db.select().from(game.Drop_Condiction),
      db.select().from(game.Drop_Item),
      db.select().from(game.Quest_Condiction),
      db.select().from(game.Quest_Goods),
    ]);
    this.dropConditions = dropC;
    this.dropItems = new Map();
    for (const d of dropI) {
      const l = this.dropItems.get(d.DropId) ?? [];
      l.push(d);
      this.dropItems.set(d.DropId, l);
    }
    this.levelGp = levels.map((l) => ({ grade: l.Grade, gp: l.GP })).sort((a, b) => a.grade - b.grade);
    this.items = new Map(items.map((t) => [t.TemplateID, t]));
    this.shop = new Map();
    for (const r of shop) {
      const s = toShopItem(r);
      if (!this.shop.has(s.ID)) this.shop.set(s.ID, s); // ShopMgr.LoadFromDatabase keeps the first row per ID
    }
    this.showList = new Set(show.map((s) => s.ShopId));
    this.maps = new Set(maps.map((m) => m.ID));
    this.serverMaps = new Map(mapServer.map((m) => [m.ServerID, m.OpenMap.split(/[|,]/).map(Number).filter((x) => x > 0)]));
    this.quests = new Map(quests.map((q) => [q.ID, { info: q, conds: [], goods: [] } as QuestTemplate]));
    for (const c of qConds) this.quests.get(c.QuestID)?.conds.push(c);
    for (const g of qGoods) this.quests.get(g.QuestID)?.goods.push(g);
    for (const q of this.quests.values()) q.conds.sort((a, b) => a.CondictionID - b.CondictionID);
    this.levels = new Map(levels.map((l) => [l.Grade, l.Blood]));
    const s = srv[0];
    this.server = s ? { ID: s.ID, Name: s.Name ?? "", Room: s.Room, Total: s.Total, ZoneId: s.ZoneId, ZoneName: s.ZoneName } : null;
    return this;
  }

  /** LevelMgr.GetLevel(GP): highest grade whose GP threshold is reached. */
  gradeForGp(gp: number): number | undefined {
    let g: number | undefined;
    for (const l of this.levelGp) if (gp >= l.gp) g = l.grade;
    return g;
  }

  /** DropMgr.FindCondiction (Bussiness/Managers/DropMgr.cs:22). */
  findDropCondition(type: number, para1: string, para2: string): number {
    const a = `,${para1},`;
    const b = `,${para2},`;
    return this.dropConditions.find((c) => c.CondictionType === type && c.Para1.includes(a) && c.Para2.includes(b))?.DropID ?? 0;
  }

  /** DropInventory.GetDropItems (Game.Logic/DropInventory.cs:271): one item among those with Random >= rnd(max Random). */
  dropOne(dropId: number, rnd = Math.random): { templateId: number; count: number; isBind: boolean; validDate: number } | null {
    const list = this.dropItems.get(dropId);
    if (!list?.length) return null;
    const max = Math.max(...list.map((d) => d.Random));
    const round = Math.floor(rnd() * max);
    const src = list.filter((d) => d.Random >= round);
    if (!src.length) return null;
    const d = src[Math.floor(rnd() * src.length)]!;
    if (!this.items.has(d.ItemId)) return null;
    const lo = Math.min(d.BeginData, d.EndData);
    const hi = Math.max(d.BeginData, d.EndData);
    return { templateId: d.ItemId, count: Math.max(1, lo + Math.floor(rnd() * (hi - lo))), isBind: d.IsBind, validDate: d.ValueDate };
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
