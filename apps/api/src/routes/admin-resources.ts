/**
 * Whitelist: REST resource name -> Drizzle table (apps/admin/src/resources/*.ts names). Only these tables are reachable
 * through /api/admin/:resource. Composite keys are joined with "~" in URL ids.
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
  quests: { table: game.Quest, pk: ["ID"] },
  "quest-conditions": { table: game.Quest_Condiction, pk: ["QuestID", "CondictionID"] },
  "quest-goods": { table: game.Quest_Goods, pk: ["QuestID", "RewardItemID"] },
  events: { table: game.Active, pk: ["ActiveID"] },
  "event-awards": { table: game.Active_Award, pk: ["ID"] },
  "event-reward-info": { table: game.Event_Reward_Info, pk: ["ActivityType", "SubActivityType"] },
  "event-reward-goods": { table: game.Event_Reward_Goods, pk: ["ActivityType", "SubActivityType", "TemplateId"] },
  "activity-items": { table: game.Activity_System_Item, pk: ["ID"] },
  "daily-award": { table: game.Daily_Award, pk: ["ID"] },
  dungeons: { table: game.Pve_Info, pk: ["ID"] },
  missions: { table: game.Mission_Info, pk: ["Id"] },
  npcs: { table: game.NPC_Info, pk: ["ID"] },
  maps: { table: game.Game_Map, pk: ["ID"] },
  balls: { table: game.Ball, pk: ["ID"] },
  "drop-items": { table: game.Drop_Item, pk: ["Id"] },
  "drop-conditions": { table: game.Drop_Condiction, pk: ["DropId"] },
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
};
