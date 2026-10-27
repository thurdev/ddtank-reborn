/**
 * Whitelist: REST resource name -> Drizzle table (apps/admin/src/resources/*.ts names). Only these tables are reachable
 * through /api/admin/:resource. Composite keys are joined with "~" in URL ids.
 *
 * Generic per-column filter (admin-ux-2): `GET /api/admin/:resource` also accepts `cf_<field>` /
 * `cf_<field>_min` / `cf_<field>_max` query params, one per filterable column of `apps/admin/src/crud/types.ts`
 * `FieldDef` — built by the admin's `crud/ColumnFilters.tsx` `buildColFilterParams`. No table list here needs
 * updating when a new column is added to a resource; the generic block in `admin.ts`'s list route resolves the
 * column by name against this `table` and applies, by its Drizzle `dataType`: `_min`/`_max` -> numeric range,
 * boolean column -> exact true/false (`"1"`/`"true"` = true), number column -> exact match (covers `ref`/`select`
 * fields, whose underlying column is always numeric), anything else -> accent-insensitive "contains" (same
 * `colSemAcento` helper the free-text `?q=` search already uses). The dev mock (`apps/admin/src/mocks/handlers.ts`)
 * mirrors this using the `FieldDef.type` instead of a Drizzle column, so `VITE_USE_MOCKS=true` behaves the same.
 */
import { app, game, player, Accounts } from "@ddt/db";
import type { PgTable } from "drizzle-orm/pg-core";

export interface ResourceDef {
  table: PgTable;
  pk: string[];
  readOnly?: boolean;
  noCreate?: boolean;
  noDelete?: boolean;
  /** Columns never returned (hashes). */
  hidden?: string[];
  /**
   * pt-BR text overlay (site-admin-redesign, "no raw Vietnamese in the admin" fix): `table` is the
   * `app."Translations"` table name for this resource's rows (matches `packages/db/scripts/export-texts.ts`
   * `TARGETS` and `apps/api/src/templates/defs.ts` `TRANSLATED_PK` — same mechanism the game client's own
   * XML already uses, just not previously wired into the admin's generic CRUD). `cols` are the `game`-schema
   * text columns that carry pt-BR overlay rows. GET/list substitutes the overlay text in place (what the
   * player actually sees) and adds a read-only `<col>__original` sibling with the raw vendor value; PATCH
   * writes overlay columns to `app."Translations"` instead of the raw `game.*` column, which stays the
   * untouched source-language reference (see `apps/api/src/lib/i18n-admin.ts`).
   */
  translatable?: { table: string; cols: string[] };
}

export const RESOURCES: Record<string, ResourceDef> = {
  // players
  players: { table: player.Sys_Users_Detail, pk: ["UserID"], noCreate: true, noDelete: true, hidden: ["Password", "PasswordTwo", "QuestSite"] },
  "player-items": { table: player.Sys_Users_Goods, pk: ["ItemID"] },
  "player-mail": { table: player.User_Messages, pk: ["ID"] },
  accounts: { table: Accounts, pk: ["ID"], hidden: ["PasswordHash"] },
  bots: { table: app.Bots, pk: ["id"] },
  // guilds (Sociedade)
  guilds: { table: player.Consortia, pk: ["ConsortiaID"], noCreate: true, noDelete: true },
  "guild-members": { table: player.Consortia_Users, pk: ["ID"], noCreate: true },
  "guild-duties": { table: player.Consortia_Duty, pk: ["DutyID"], noCreate: true, noDelete: true },
  "guild-applications": { table: player.Consortia_Apply_Users, pk: ["ID"], noCreate: true },
  "guild-events": { table: player.Consortia_Event, pk: ["ID"], noCreate: true, readOnly: true },
  "guild-tasks": { table: player.Consortia_Task_Info, pk: ["ID"], noCreate: true },
  "guild-levels": { table: player.Consortia_Level, pk: ["Level"] },
  // content
  items: { table: game.Shop_Goods, pk: ["TemplateID"] },
  shop: { table: game.Shop, pk: ["ID"] },
  "shop-show": { table: game.ShopGoodsShowList, pk: ["TempID"] },
  "item-box": { table: game.Shop_Goods_Box, pk: ["ID", "TemplateId"] },
  quests: { table: game.Quest, pk: ["ID"], translatable: { table: "Quest", cols: ["Title", "Detail", "Objective"] } },
  "quest-conditions": { table: game.Quest_Condiction, pk: ["QuestID", "CondictionID"] },
  "quest-goods": { table: game.Quest_Goods, pk: ["QuestID", "RewardItemID"] },
  events: { table: game.Active, pk: ["ActiveID"] },
  "scheduled-events": { table: app.ScheduledEvents, pk: ["id"] },
  "event-claims": { table: app.EventClaims, pk: ["UserID", "Kind", "Key"], noCreate: true },
  "event-codes": { table: player.Active_Number, pk: ["AwardID"] },
  "login-award": { table: game.Login_Award_Item_Template, pk: ["ID"] },
  "time-box": { table: game.LoadUserBox, pk: ["ID"] },
  "event-awards": { table: game.Active_Award, pk: ["ID"] },
  "event-reward-info": { table: game.Event_Reward_Info, pk: ["ActivityType", "SubActivityType"] },
  "event-reward-goods": { table: game.Event_Reward_Goods, pk: ["ActivityType", "SubActivityType", "TemplateId"] },
  "activity-items": { table: game.Activity_System_Item, pk: ["ID"] },
  "daily-award": { table: game.Daily_Award, pk: ["ID"] },
  dungeons: { table: game.Pve_Info, pk: ["ID"], translatable: { table: "Pve_Info", cols: ["Name", "Description"] } },
  missions: { table: game.Mission_Info, pk: ["Id"], translatable: { table: "Mission_Info", cols: ["Name", "Title", "Description", "Success", "Failure"] } },
  npcs: { table: game.NPC_Info, pk: ["ID"], translatable: { table: "NPC_Info", cols: ["Name"] } },
  // task 41-instancias: balanceamento de masmorra (NPC HP/dano/defesa + recompensa) por (dungeon, dificuldade);
  // progresso de desbloqueio (quem já zerou qual dificuldade) só pra suporte/depuração, nunca criado pelo admin.
  "pve-balance": { table: app.PveBalance, pk: ["PveId", "HardLevel"] },
  "pve-clears": { table: app.PveInstanceClear, pk: ["UserID", "PveId", "HardLevel"], noCreate: true },
  maps: { table: game.Game_Map, pk: ["ID"] },
  balls: { table: game.Ball, pk: ["ID"] },
  "drop-items": { table: game.Drop_Item, pk: ["Id"] },
  // Fix (site-admin-redesign): the real column is "DropID" (capital ID, see packages/db/src/schema/game.ts
  // Drop_Condiction) — the wrong casing here was unnoticed because no admin resource used "drop-conditions"
  // yet (pkWhere would resolve to an undefined column and every single-row GET/PATCH/DELETE 404'd silently).
  "drop-conditions": { table: game.Drop_Condiction, pk: ["DropID"] },
  achievements: { table: game.Achievement, pk: ["ID"] },
  edicts: { table: game.Edictum_List, pk: ["ID"] },
  "game-config": { table: game.Server_Config, pk: ["ID"] },
  "server-list": { table: player.Server_List, pk: ["ID"] },
  "player-config": { table: player.Server_Config, pk: ["ID"] },
  // site / system (new tables)
  texts: { table: app.Texts, pk: ["key"] },
  news: { table: app.News, pk: ["id"] },
  logs: { table: app.Logs, pk: ["id"], readOnly: true },
  "mail-broadcasts": { table: app.MailBroadcasts, pk: ["id"], readOnly: true },
  // pix-admin: doações via Pix (docs/features/doacao-pix.md). Criação só pelo fluxo público (POST /api/donations),
  // nunca pelo CRUD genérico — mark-paid tem sua própria rota (/api/admin/donations/:id/mark-paid).
  donations: { table: app.Donations, pk: ["id"], noCreate: true },
};
