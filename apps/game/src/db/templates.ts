/**
 * Boot-time template caches (ItemMgr / ShopMgr / MapMgr / QuestMgr / LevelMgr).
 * "Shop_Goods" = item templates, "Shop" = listings, "ShopGoodsShowList" = goods on sale (ShopMgr.IsOnShop).
 */
import { eq, sql } from "drizzle-orm";
import { app, applyTranslations, game, loadTranslations, player, type Database } from "@ddt/db";
import type { ItemTemplate } from "../game/item.js";
import { emptyPetTables, type PetTables, type PetTemplate } from "../game/pets.js";
import type { CardUpdateCond, CardUpdateRowFull } from "../game/cards.js";
import type { StatTables, ExerciseRow, TotemRow, GoldEquipRow, CardUpdateRow, PetFightRow, SuitInfoRow } from "../game/stats.js";

export type StrengthenRow = typeof game.Item_Strengthen.$inferSelect;
export type StrengthenGoodsRow = typeof game.Item_Strengthen_Goods.$inferSelect;
export type StrengthenExpRow = typeof game.StrengThenExp.$inferSelect;
export type FusionRow = typeof game.Item_Fusion.$inferSelect;
/** game."Item_Fusion_New" — fusão por receita do 6600 (m3-fusao), ver research/6600/packets-m1.md "M2 forja" 78
 * ITEM_FUSION. Shape diferente da `Item_Fusion` da 4.1 acima (mesmo nome na origem, ver RENAME_6600 em
 * packages/db/scripts/schema-6600-tables.ts): FusionID -> {Item1,Count1,FusionRate,FusionType,Reward}, só o
 * ingrediente 1 é usado de fato pelo C# decompilado (ItemFusionHandler.cs: Item2-4/Count2-4/Formula nunca lidos,
 * confirmado nas 206 linhas de dados — Item2-4 sempre -1). */
export type FusionRow6600 = typeof game.Item_Fusion_New.$inferSelect;
export type ItemBoxRow = typeof game.Shop_Goods_Box.$inferSelect;

export type ShopRow = typeof game.Shop.$inferSelect;
export type MysteryShopRow = typeof app.MysteryShopTemplate.$inferSelect;

/** app."SpiritInfo" — "Espírito do equipamento" (391 EQUIP_GHOST), ver schema/app.ts. */
export type SpiritInfoRow = typeof app.SpiritInfo.$inferSelect;
/** game."Sets_Build_Temp" — "Refinar conjunto" (295 STORE_FINE_SUIT). JÁ existia no catálogo original
 * (70 linhas reais no `.bak`, seed em `packages/db/seed/game/Sets_Build_Temp.json.gz`) — nunca tinha sido
 * carregada por `apps/game` nem ligada a um handler até esta sessão. */
export type SetsBuildTempRow = typeof game.Sets_Build_Temp.$inferSelect;

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

export type ShopCheapRow = typeof game.Shop_Cheap_Items.$inferSelect;

/**
 * ShopMgr.GetShopItemDisCountById (6600, Bussiness/Managers/ShopMgr.cs:169): a Shop_Cheap_Items row reshaped
 * como um ShopItemInfo normal — ShopID forçado a 3. O C# original literalmente copia `APrice`/`AValue` pros
 * "slots" 1, 2 E 3 do struct (idem B/C) — mas isso é um preenchimento DEFENSIVO do struct (não sabemos qual
 * slot o `ShopMgr.SetItemType` real lê pra loja barata, código não decompilado no vendor), NÃO uma soma de 3
 * custos iguais. Nosso `setItemType`/`getItemPrice` (preco.ts, mirror de `ItemInfo.SetItemType`) SOMA os 3
 * slots de uma tier como custos combináveis (ex.: Money+Item+Gold de uma linha normal de `Shop_Goods`) — se a
 * gente copiasse o preço pros 3 slots aqui, a compra cobraria o mesmo valor 3x (bug real, pego pelo teste
 * "loja barata/desconto" em `client-6600-m2-loja.test.ts`). `Shop_Cheap_Items` só tem UM preço por tier
 * (`APrice`/`BPrice`/`CPrice`, sem sufixo numérico) — então aqui só preenchemos o slot 1, deixando 2/3 em 0
 * (sem custo adicional), que é a leitura correta sob o NOSSO modelo de preço.
 */
export function toShopItemFromCheap(r: ShopCheapRow): ShopItemInfo {
  return {
    ID: n(r.ID), ShopID: 3, TemplateID: n(r.TemplateID), BuyType: n(r.BuyType), IsBind: 1, Beat: 1, LimitCount: 0,
    AUnit: n(r.AUnit), APrice1: n(r.APrice), AValue1: n(r.AValue), APrice2: 0, AValue2: 0, APrice3: 0, AValue3: 0,
    BUnit: n(r.BUnit), BPrice1: n(r.BPrice), BValue1: n(r.BValue), BPrice2: 0, BValue2: 0, BPrice3: 0, BValue3: 0,
    CUnit: n(r.CUnit), CPrice1: n(r.CPrice), CValue1: n(r.CValue), CPrice2: 0, CValue2: 0, CPrice3: 0, CValue3: 0,
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
  /** game."Shop_Cheap_Items" (6600, m1-schema) — loja "barata"/desconto do 6600 (ShopMgr.GetShopItemDisCountById,
   * `goodsType===2` em 44 BUY_GOODS; ver `handlers/loja/comprar.ts`). Sem equivalente na 4.1. */
  shopCheap = new Map<number, ShopCheapRow>();
  /** app."MysteryShopTemplate" (6600, m3-mystery-shop) — Loja Cigana, agrupado por LableType (1 pool normal, 2
   *  rara), igual `GypsyShopMgr.LoadMysteryShops`. Sem equivalente na 4.1 (sistema novo do 6600). */
  mysteryShop = new Map<number, MysteryShopRow[]>();
  showList = new Set<number>();
  maps = new Set<number>();
  serverMaps = new Map<number, number[]>();
  quests = new Map<number, QuestTemplate>();
  levels = new Map<number, number>();
  /** LevelInfo GP thresholds, ascending by grade (LevelMgr.GetLevel). */
  levelGp: { grade: number; gp: number }[] = [];
  dropConditions: (typeof game.Drop_Condiction.$inferSelect)[] = [];
  dropItems = new Map<number, (typeof game.Drop_Item.$inferSelect)[]>();
  /** ActiveMgr (Bussiness/Managers/ActiveMgr.cs): calendar "Active" events + their Active_Convert_Item cost/award
   *  rows (GoodsExchangeHandler, 31 GOODS_EXCHANGE). 0 rows in the source .bak (admin fills it later). */
  actives = new Map<number, typeof game.Active.$inferSelect>();
  activeConvertItems = new Map<number, (typeof game.Active_Convert_Item.$inferSelect)[]>();
  server: ServerRow | null = null;
  /** PvE (PveInfoMgr / MissionInfoMgr / NPCInfoMgr) */
  pveInfos = new Map<number, typeof game.Pve_Info.$inferSelect>();
  missions = new Map<number, typeof game.Mission_Info.$inferSelect>();
  npcs = new Map<number, typeof game.NPC_Info.$inferSelect>();

  /** StrengthenMgr (Item_Strengthen by level, Item_Strengthen_Goods), FusionMgr (Item_Fusion by sorted item key), ItemBoxMgr. */
  strengthen = new Map<number, StrengthenRow>();
  strengthenGoods: StrengthenGoodsRow[] = [];
  fusions = new Map<string, FusionRow>();
  /** FusionMgr.FindItemFusion do 6600 (`FusionMgr.cs`): dictionary direto por FusionID, sem key composta. */
  fusions6600 = new Map<number, FusionRow6600>();
  itemBoxes = new Map<number, ItemBoxRow[]>();
  /** Attribute tables used by UpdatePlayerProperties / FightPower (game/stats.ts). */
  stats: StatTables = {
    findItem: (id) => this.items.get(id),
    exercise: [], totems: new Map(), goldEquip: () => undefined, cardUpdate: () => undefined, petFight: () => undefined, petMoe: () => undefined,
    suitParts: new Map(), suits: new Map(),
    clothProperty: (id) => this.clothProperties.get(id),
    countClothGroupWithID: (id) => this.countClothGroupWithID(id),
  };

  /** game."Server_Config" (GameProperties overrides). */
  serverConfig = new Map<string, string>();
  /**
   * Base EXP/gold multipliers from the admin "Configuração do servidor" page (`app."Settings"` key
   * "server-config", `expRate`/`goldRate` — apps/admin/src/pages/ServerConfig.tsx). Multiply with (not
   * replace) the scheduled "double_exp"/"double_gold" event rate (`EventScheduler.rate`, game/scheduler.ts) at
   * the call sites in server.ts. Reloaded by `/reload-templates` like every other template, so a PUT on
   * server-config takes effect without restarting apps/game.
   */
  rates: { exp: number; gold: number } = { exp: 1, gold: 1 };
  /** GameProperties int value with the C# default when the row is missing. */
  cfgInt(name: string, def: number): number {
    const v = Number(this.serverConfig.get(name));
    return Number.isFinite(v) && this.serverConfig.has(name) ? v : def;
  }

  findItem = (id: number): ItemTemplate | undefined => this.items.get(id);

  /**
   * `lang`: pt-BR overlay for `game` schema text (see packages/db/src/translations.ts +
   * data/i18n/pt-BR/db/*.jsonl, built by scripts/export-texts.ts + import-translations.ts). Only tables that
   * have been translated so far (Game_Map, Pve_Info — see docs/BACKLOG.md for the rest) get an overlay; every
   * other table just keeps its original `game` schema text (Vietnamese/Chinese) when no row matches.
   */
  async load(db: Database, serverId: number, lang = "pt-BR"): Promise<this> {
    const [items, shop, shopCheap, show, maps, mapServer, quests, levels, srv, dropC, dropI, qConds, qGoods] = await Promise.all([
      db.select().from(game.Shop_Goods),
      db.select().from(game.Shop),
      db.select().from(game.Shop_Cheap_Items),
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
    const [pveI, missI, npcI] = await Promise.all([db.select().from(game.Pve_Info), db.select().from(game.Mission_Info), db.select().from(game.NPC_Info)]);
    const [cfgSetting] = await db.select({ value: app.Settings.value }).from(app.Settings).where(eq(app.Settings.key, "server-config")).limit(1);
    const rateOr1 = (v: unknown): number => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 1);
    const cfgVal = (cfgSetting?.value ?? {}) as Record<string, unknown>;
    this.rates = { exp: rateOr1(cfgVal.expRate), gold: rateOr1(cfgVal.goldRate) };
    await this.loadForge(db);
    await this.loadActiveExchange(db);
    await this.loadPetsCards(db, lang);
    await this.loadProgression(db);
    await this.loadMysteryShop(db);
    const [pveOverlay, missionOverlay, npcOverlay, shopGoodsOverlay, questOverlay] = await Promise.all([
      loadTranslations(db, "Pve_Info", lang),
      loadTranslations(db, "Mission_Info", lang),
      loadTranslations(db, "NPC_Info", lang),
      loadTranslations(db, "Shop_Goods", lang),
      loadTranslations(db, "Quest", lang),
    ]);
    this.pveInfos = new Map(pveI.map((r) => [r.ID, applyTranslations(r, "ID", pveOverlay)]));
    this.missions = new Map(missI.map((r) => [r.Id, applyTranslations(r, "Id", missionOverlay)]));
    this.npcs = new Map(npcI.map((r) => [r.ID, applyTranslations(r, "ID", npcOverlay)]));
    this.dropConditions = dropC;
    this.dropItems = new Map();
    for (const d of dropI) {
      const l = this.dropItems.get(d.DropId) ?? [];
      l.push(d);
      this.dropItems.set(d.DropId, l);
    }
    this.levelGp = levels.map((l) => ({ grade: l.Grade, gp: l.GP })).sort((a, b) => a.grade - b.grade);
    this.items = new Map(items.map((t) => [t.TemplateID, applyTranslations(t, "TemplateID", shopGoodsOverlay)]));
    this.shop = new Map();
    for (const r of shop) {
      const s = toShopItem(r);
      if (!this.shop.has(s.ID)) this.shop.set(s.ID, s); // ShopMgr.LoadFromDatabase keeps the first row per ID
    }
    this.shopCheap = new Map(shopCheap.map((r) => [r.ID, r]));
    this.showList = new Set(show.map((s) => s.ShopId));
    this.maps = new Set(maps.map((m) => m.ID));
    this.serverMaps = new Map(mapServer.map((m) => [m.ServerID, m.OpenMap.split(/[|,]/).map(Number).filter((x) => x > 0)]));
    this.quests = new Map(quests.map((q) => [q.ID, { info: applyTranslations(q, "ID", questOverlay), conds: [], goods: [] } as QuestTemplate]));
    for (const c of qConds) this.quests.get(c.QuestID)?.conds.push(c);
    for (const g of qGoods) this.quests.get(g.QuestID)?.goods.push(g);
    for (const q of this.quests.values()) q.conds.sort((a, b) => a.CondictionID - b.CondictionID);
    this.levels = new Map(levels.map((l) => [l.Grade, l.Blood]));
    const s = srv[0];
    this.server = s ? { ID: s.ID, Name: s.Name ?? "", Room: s.Room, Total: s.Total, ZoneId: s.ZoneId, ZoneName: s.ZoneName } : null;
    return this;
  }

  /** StrengthenMgr / FusionMgr / ItemBoxMgr / ExerciseMgr / TotemMgr / GoldEquipMgr / CardMgr / PetMgr / suit caches. */
  /** RefineryMgr.m_Item_Refinery (Game.Server/Managers/RefineryMgr.cs): 0 rows in the source .bak (never configured
   * on this server, in the original too) — the handler is live code, just permanently inert without data. */
  refinery: (typeof game.Item_Refinery.$inferSelect)[] = [];
  /** PetMgr.GetEvolutionMax: Pet_Fight_Property row count. */
  petFightMax = 0;

  /** SpiritMgr (391 EQUIP_GHOST, `espirito-do-equipamento.ts`): 10 níveis × 3 categorias (1/5/7). */
  spirits: SpiritInfoRow[] = [];
  /** SpiritMgr.GetSpiritInfo (Game.Server/Managers/SpiritMgr.cs:87): match por Level+CategoryId. */
  findSpiritInfo(categoryId: number, level: number): SpiritInfoRow | undefined {
    return this.spirits.find((s) => s.CategoryId === categoryId && s.Level === level);
  }

  /** SetsBuildTempMgr (295 STORE_FINE_SUIT, `refinar-conjunto.ts`): Level 1..70 ordenado crescente. */
  setsBuildTemp: SetsBuildTempRow[] = [];
  /** SetsBuildTempMgr.FindNextSetsBuildExp (Bussiness/Managers/SetsBuildTempMgr.cs:72): 1ª linha com Exp > exp. */
  findNextSetsBuild(exp: number): SetsBuildTempRow | undefined {
    return this.setsBuildTemp.find((row) => exp < row.Exp) ?? this.setsBuildTemp.at(-1);
  }
  /** SetsBuildTempMgr.SetsBuildMax: Exp da última linha (nível máximo = tabela cheia). */
  setsBuildMaxExp(): number {
    return this.setsBuildTemp.at(-1)?.Exp ?? 0;
  }

  /**
   * ActiveMgr.LoadActiveCondictionDb (ActiveMgr.cs:155-169): one calendar "Active" event = cost rows (what the
   * player hands in, `ItemType = 0`) + award rows (what it gets back, `ItemType = 1`) in the same table, keyed by
   * ActiveID. DDTank41's client (GoodsExchangeView.sendGoods) never sends the later-version's `index` tier field —
   * this server only supports ONE cost/award pair per Active event, hence the fixed 0/1 split instead of
   * ActiveMgr.GetGoodsAward's 1→3/2→5/3→7 bucket switch (31 GOODS_EXCHANGE, handlers/pve-misc.ts).
   */
  async loadActiveExchange(db: Database): Promise<void> {
    const [actives, convert] = await Promise.all([db.select().from(game.Active), db.select().from(game.Active_Convert_Item)]);
    this.actives = new Map(actives.map((a) => [a.ActiveID, a]));
    this.activeConvertItems = new Map();
    for (const c of convert) this.activeConvertItems.set(c.ActiveID, [...(this.activeConvertItems.get(c.ActiveID) ?? []), c]);
  }

  /** ActiveMgr.GetActiveConvertItem(id, templateID, index) (ActiveMgr.cs:54): the cost row for one submitted item. */
  activeConvertItem(activeId: number, templateId: number): (typeof game.Active_Convert_Item.$inferSelect) | undefined {
    return this.activeConvertItems.get(activeId)?.find((c) => c.TemplateID === templateId && c.ItemType === 0);
  }

  /** ActiveMgr.GetActiveConvertItemAward(id, index) (ActiveMgr.cs:67): the award rows handed back for this event. */
  activeConvertAward(activeId: number): (typeof game.Active_Convert_Item.$inferSelect)[] {
    return (this.activeConvertItems.get(activeId) ?? []).filter((c) => c.ItemType === 1);
  }

  /** RefineryMgr.RefineryTrend: find a row whose reward list contains `templateId`, then the entry two slots
   * after `operation` in that same (Material,Operate,Reward) triple list. */
  refineryTrend(operation: number, templateId: number): number | null {
    for (const r of this.refinery) {
      const list = [r.Material1, r.Operate1, r.Reward1, r.Material2, r.Operate2, r.Reward2, r.Material3, r.Operate3, r.Reward3, r.Material4, r.Operate4, r.Reward4];
      if (!list.includes(templateId)) continue;
      for (let i = 0; i < list.length; i++) if (list[i] === operation) return list[i + 2] ?? null;
    }
    return null;
  }

  /** GypsyShopMgr.LoadMysteryShops (vendor/DDT-6600 Game.Server.GypsyShop/GypsyShopMgr.cs:149-161): group by LableType. */
  async loadMysteryShop(db: Database): Promise<void> {
    const rows = await db.select().from(app.MysteryShopTemplate);
    this.mysteryShop = new Map();
    for (const r of rows) this.mysteryShop.set(r.LableType, [...(this.mysteryShop.get(r.LableType) ?? []), r]);
  }

  async loadForge(db: Database): Promise<void> {
    const [str, strG, fus, box, ex, tot, gold, cardU, petF, suitI, suitT, cfg, refinery, strExp, spirits, setsBuildTemp, fus6600] = await Promise.all([
      db.select().from(game.Item_Strengthen), db.select().from(game.Item_Strengthen_Goods), db.select().from(game.Item_Fusion),
      db.select().from(game.Shop_Goods_Box), db.select().from(game.ExerciseInfo), db.select().from(game.Totem_Info),
      db.select().from(game.GoldEquipTemplateLoad), db.select().from(game.CardUpdateInfo), db.select().from(game.Pet_Fight_Property),
      db.select().from(game.SuitTemplateInfo), db.select().from(game.Suit_TemplateID), db.select().from(game.Server_Config),
      db.select().from(game.Item_Refinery), db.select().from(game.StrengThenExp),
      db.select().from(app.SpiritInfo), db.select().from(game.Sets_Build_Temp),
      db.select().from(game.Item_Fusion_New),
    ]);
    this.refinery = refinery;
    this.spirits = spirits;
    this.setsBuildTemp = setsBuildTemp.slice().sort((a, b) => a.Level - b.Level);
    this.strengthenExp = new Map(strExp.map((r) => [r.Level, r]));
    this.serverConfig = new Map(cfg.map((c) => [String(c.Name), String(c.Value ?? "")]));
    this.strengthen = new Map(str.map((r) => [r.StrengthenLevel, r]));
    this.strengthenGoods = strG;
    this.fusions = new Map();
    for (const f of fus) {
      // FusionMgr.LoadFusion: key = the four item fusion types sorted, zeros skipped, concatenated.
      const key = [f.Item1, f.Item2, f.Item3, f.Item4].sort((a, b) => a - b).filter((x) => x !== 0).join("");
      if (!this.fusions.has(key)) this.fusions.set(key, f);
    }
    // FusionMgr.FindItemFusion (6600): dictionary direto por FusionID (research/6600/packets-m1.md "M2 forja").
    this.fusions6600 = new Map(fus6600.map((f) => [f.FusionID, f]));
    this.itemBoxes = new Map();
    for (const b of box) this.itemBoxes.set(b.ID, [...(this.itemBoxes.get(b.ID) ?? []), b]);
    const golds = gold as GoldEquipRow[];
    this.golds = golds;
    const cardMap = new Map((cardU as CardUpdateRow[]).map((c) => [`${c.Id}:${c.Level}`, c]));
    const pets = new Map((petF as PetFightRow[]).map((p) => [p.ID, p]));
    // PetMgr.GetEvolutionMax = Pet_Fight_Property row count.
    this.petFightMax = petF.length;
    const parts = new Map<number, string[]>();
    for (const p of suitT) if (p.ID != null) parts.set(p.ID, [...(parts.get(p.ID!) ?? []), p.ContainEquip ?? ""]);
    this.stats = {
      findItem: (id) => this.items.get(id),
      exercise: (ex as ExerciseRow[]).slice().sort((a, b) => a.Grage - b.Grage),
      totems: new Map((tot as TotemRow[]).map((t) => [t.ID, t])),
      // GoldEquipMgr.FindGoldEquipByTemplate(templateId, categoryId): OldTemplateId match first, then by category.
      goldEquip: (tpl, cat) => golds.find((g) => g.OldTemplateId === tpl) ?? golds.find((g) => g.CategoryID === cat && g.OldTemplateId === -1),
      cardUpdate: (tpl, lv) => cardMap.get(`${tpl}:${lv}`),
      petFight: (g) => pets.get(g),
      // loadPetsCards() (not yet run when this.stats is built) fills this.pets.moe; read it lazily.
      petMoe: (level) => this.pets.moe.get(level),
      suitParts: parts,
      suits: new Map((suitI as SuitInfoRow[]).map((s) => [s.SuitId, s])),
      // loadProgression() (not yet run when this.stats is built here) fills clothProperties/clothGroups; read lazily.
      clothProperty: (id) => this.clothProperties.get(id),
      countClothGroupWithID: (id) => this.countClothGroupWithID(id),
    };
  }

  /** PetMgr caches (Pet_Template_Info, Pet_Level, Pet_Config, Pet_Skill_Info, Pet_Skill_Template_Info). */
  pets: PetTables = emptyPetTables();
  /** CardMgr: CardUpdateCondition by level, CardUpdateInfo (full row) by template:level. */
  cardConditions = new Map<number, CardUpdateCond>();
  cardUpdates = new Map<string, CardUpdateRowFull>();
  get cardMaxLevel(): number {
    return Math.max(0, ...this.cardConditions.keys());
  }

  async loadPetsCards(db: Database, lang = "pt-BR"): Promise<void> {
    const [tpl, lv, cfg, sk, skt, cc, cu, starExp, moe] = await Promise.all([
      db.select().from(game.Pet_Template_Info), db.select().from(game.Pet_Level), db.select().from(game.Pet_Config),
      db.select().from(game.Pet_Skill_Info), db.select().from(game.Pet_Skill_Template_Info),
      db.select().from(game.CardUpdateCondition), db.select().from(game.CardUpdateInfo),
      db.select().from(game.Pet_Star_Exp), db.select().from(game.Pet_Moe_Property),
    ]);
    const [petTplOverlay, petSkillOverlay] = await Promise.all([
      loadTranslations(db, "Pet_Template_Info", lang),
      loadTranslations(db, "Pet_Skill_Info", lang),
    ]);
    this.pets = {
      templates: new Map(tpl.map((t) => [t.TemplateID, applyTranslations(t, "TemplateID", petTplOverlay)])),
      levelGp: new Map(lv.map((l) => [l.Level, l.GP])),
      config: new Map(cfg.map((c) => [String(c.Name), String(c.Value ?? "")])),
      skills: new Map(sk.map((s) => [s.ID, applyTranslations(s, "ID", petSkillOverlay)])),
      skillTemplates: skt,
      starExp: new Map(starExp.map((s) => [s.OldID, s])),
      moe: new Map(moe.map((m) => [m.Level, m])),
    };
    this.cardConditions = new Map((cc as unknown as CardUpdateCond[]).map((c) => [c.Level, c]));
    this.cardUpdates = new Map((cu as unknown as CardUpdateRowFull[]).map((c) => [`${c.Id}:${c.Level}`, c]));
  }

  /** StrengthenMgr.GetNeedRate (StrengthenMgr.cs:360): rock column by category of the NEXT level. */
  strengthenNeedRate(level: number, categoryId: number): number {
    const s = this.strengthen.get(level + 1);
    if (!s) return 0;
    switch (categoryId) {
      case 5: return s.Rock2;
      case 1: return s.Rock1;
      case 17: return s.Rock3;
      case 7: return s.Rock;
      default: return 0;
    }
  }

  golds: GoldEquipRow[] = [];
  /** GoldEquipMgr.FindGoldEquipOldTemplate(templateId): the gold row whose NewTemplateId is this item. */
  goldEquipByNew(newTemplateId: number): GoldEquipRow | undefined {
    return this.golds.find((g) => g.NewTemplateId === newTemplateId);
  }
  /** StrengthenMgr.FindStrengthenGoodsInfo(level, templateId). */
  findStrengthenGoods(level: number, templateId: number): StrengthenGoodsRow | undefined {
    return this.strengthenGoods.find((g) => g.Level === level && g.CurrentEquip === templateId);
  }
  /** StrengthenMgr.FindRealStrengthenGoodInfo(level, templateId): via the transfer row's OrginEquip. */
  findRealStrengthenGoods(level: number, templateId: number): StrengthenGoodsRow | undefined {
    const t = this.strengthenGoods.find((g) => g.GainEquip === templateId || g.CurrentEquip === templateId);
    return t ? this.findStrengthenGoods(level, t.OrginEquip) : undefined;
  }

  /** game."StrengThenExp" by Level (StrengthenMgr._Strengthens_Exps): usado só pelo colar (NECKLACE_STRENGTH). */
  strengthenExp = new Map<number, StrengthenExpRow>();
  /** StrengthenMgr.NECKLACE_MAX_LEVEL (StrengthenMgr.cs:27). */
  static readonly NECKLACE_MAX_LEVEL = 12;
  /** StrengthenMgr.GetNecklaceLevelByGP (StrengthenMgr.cs:400-411): maior nível cujo NecklaceStrengthExp <= gp. */
  necklaceLevelByGP(gp: number): number {
    for (let level = Templates.NECKLACE_MAX_LEVEL; level > -1; level--) {
      const row = this.strengthenExp.get(level);
      if (row && row.NecklaceStrengthExp <= gp) return level;
    }
    return 1;
  }
  /** StrengthenMgr.GetNecklaceMaxExp (StrengthenMgr.cs:413-420). */
  necklaceMaxExp(): number {
    return this.strengthenExp.get(Templates.NECKLACE_MAX_LEVEL)?.NecklaceStrengthExp ?? 0;
  }
  /** StrengthenMgr.GetNecklaceExpAdd (StrengthenMgr.cs:391-398): bônus (Plus) do nível atingido por `gp`. */
  necklaceExpAdd(gp: number, currentPlus: number): number {
    const row = this.strengthenExp.get(this.necklaceLevelByGP(gp));
    return row ? row.NecklaceStrengthPlus : currentPlus;
  }
  /** ItemMgr.GetGoodsbyFusionTypeandLevel. */
  goodsByFusionTypeAndLevel(fusionType: number, level: number): ItemTemplate | undefined {
    for (const t of this.items.values()) if (t.FusionType === fusionType && t.Level === level) return t;
    return undefined;
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

  /** PveInfoMgr.GetPveInfoByType(roomType, levelLimits) (PveInfoMgr.cs:79) */
  pveByType(roomType: number, levelLimits: number): (typeof game.Pve_Info.$inferSelect) | undefined {
    const l = [...this.pveInfos.values()].filter((p) => p.Type === roomType);
    return l.find((p) => p.LevelLimits === levelLimits) ?? l[0];
  }
  /** DropInventory.CopyDrop(copyId, user) / NPCDrop(dropId): eDropType.Copy = 5, NPC = 3 */
  pveDrop(kind: "copy" | "npc", id: number, user = 1): { templateId: number; count: number; isBind: boolean; validDate: number }[] | null {
    const dropId = kind === "copy" ? this.findDropCondition(5, String(id), String(user)) : id;
    if (!dropId) return null;
    const d = this.dropOne(dropId);
    return d ? [d] : null;
  }

  /** DropInventory.GetPetDrop(613, 1) (Game.Logic/DropInventory.cs:83): one pet template off the Trminhpc(13) drop
   * pool, same weighted-pick shape as dropOne() but resolved against pet templates instead of item templates. */
  petAdoptPick(rnd = Math.random): PetTemplate | undefined {
    const dropId = this.findDropCondition(13, "613", "1");
    const list = dropId ? this.dropItems.get(dropId) : undefined;
    if (!list?.length) return undefined;
    const max = Math.max(...list.map((d) => d.Random));
    const round = Math.floor(rnd() * max);
    const src = list.filter((d) => d.Random >= round);
    if (!src.length) return undefined;
    const d = src[Math.floor(rnd() * src.length)]!;
    return this.pets.templates.get(d.ItemId);
  }

  /** ShopMgr.FindShopbyTemplatID: every shop listing row selling this item template. */
  shopByTemplate(templateId: number): ShopItemInfo[] {
    return [...this.shop.values()].filter((s) => s.TemplateID === templateId);
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

  // ---------------------------------------------------------------- progression (TOTEM / HONOR_UP / AVATAR_COLLECTION)
  /**
   * TotemMgr/TotemHonorMgr (Bussiness/Managers/TotemMgr.cs, TotemHonorMgr.cs): full rows, including ConsumeExp/
   * ConsumeHonor/NeedMoney/AddHonor that `stats.totems` (game/stats.ts TotemRow) drops because it only keeps the
   * attribute-bonus columns FightPower needs. ClothGroupTemplateInfoMgr/ClothPropertyTemplateInfoMgr (Game.Server/
   * Managers/*.cs): AVATAR_COLLECTION (402) item sets.
   */
  totemInfos = new Map<number, typeof game.Totem_Info.$inferSelect>();
  totemHonor = new Map<number, typeof game.Totem_Honor_Template.$inferSelect>();
  clothGroups = new Map<number, (typeof game.ClothGroupTemplateInfo.$inferSelect)[]>();
  clothProperties = new Map<number, typeof game.ClothPropertyTemplateInfo.$inferSelect>();

  async loadProgression(db: Database): Promise<void> {
    const [totem, honor, groups, props] = await Promise.all([
      db.select().from(game.Totem_Info),
      db.select().from(game.Totem_Honor_Template),
      db.select().from(game.ClothGroupTemplateInfo),
      db.select().from(game.ClothPropertyTemplateInfo),
    ]);
    this.totemInfos = new Map(totem.map((t) => [t.ID, t]));
    this.totemHonor = new Map(honor.map((h) => [h.ID, h]));
    this.clothGroups = new Map();
    for (const g of groups) this.clothGroups.set(g.ID, [...(this.clothGroups.get(g.ID) ?? []), g]);
    this.clothProperties = new Map(props.map((p) => [p.ID, p]));
  }

  /** ClothGroupTemplateInfoMgr.GetClothGroup(ID, TemplateID, Sex) (ClothGroupTemplateInfoMgr.cs:29). */
  getClothGroup(id: number, templateId: number, sex: number): (typeof game.ClothGroupTemplateInfo.$inferSelect) | undefined {
    return this.clothGroups.get(id)?.find((g) => g.TemplateID === templateId && g.Sex === sex);
  }
  /** ClothGroupTemplateInfoMgr.CountClothGroupWithID(ID) (ClothGroupTemplateInfoMgr.cs:19). */
  countClothGroupWithID(id: number): number {
    return this.clothGroups.get(id)?.length ?? 0;
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

/**
 * ch-tabela: também grava em player."Server_List"."Online" (não só app."Servers") pra que o ServerList.ashx de
 * QUALQUER canal (`apps/api` de outro processo, ainda não existe antes de `ch-processo`) consiga mostrar a
 * contagem deste canal lendo só a própria linha — hoje é o mesmo processo, então é redundante com `upsertServer`
 * (ver `ServerList.ts` do apps/api, que prefere o valor em tempo real via `GAME_INTERNAL_URL` quando é o canal
 * local e cai nesta coluna pros demais).
 */
export async function heartbeat(db: Database, id: number, online: number): Promise<void> {
  await db.execute(sql`UPDATE "app"."Servers" SET "online" = ${online}, "lastSeenAt" = now() WHERE "id" = ${id}`);
  await db.execute(sql`UPDATE "player"."Server_List" SET "Online" = ${online} WHERE "ID" = ${id}`);
}
