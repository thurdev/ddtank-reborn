import type { ResourceDef } from "@/crud/types";
import { items } from "./items";
import { dungeons, events, maps, missions, npcs, questConditions, questGoods, quests, shop } from "./content";
import { pveBalance, pveClears } from "./pve-balance";
import { dailyAward, eventAwards, eventCodes, scheduledEvents, timeBoxes } from "./event-systems";
import { bots, players } from "./players";
import { guildApplications, guildDuties, guildEvents, guildLevels, guildMembers, guilds, guildTasks } from "./guilds";
import { adminUsers, edicts, logs, mailBroadcasts, news, texts } from "./system";
import { channels } from "./channels";
import { donations } from "./donations";

/**
 * Registry of every CRUD resource. Adding a game table = add a ResourceDef and list it here;
 * it gets a route (/<name>), a sidebar entry (unless hidden) and dev mock data automatically.
 * REST contract: /api/admin/<name> (GET ?q&page&pageSize&sort=[-]field, POST), /api/admin/<name>/<id> (GET, PATCH, DELETE).
 */
export const resources: ResourceDef[] = [
  players,
  guilds,
  guildMembers,
  guildDuties,
  guildApplications,
  guildEvents,
  guildTasks,
  guildLevels,
  bots,
  items,
  shop,
  quests,
  questConditions,
  questGoods,
  events,
  scheduledEvents,
  eventAwards,
  eventCodes,
  dailyAward,
  timeBoxes,
  dungeons,
  missions,
  npcs,
  pveBalance,
  pveClears,
  maps,
  channels,
  texts,
  news,
  edicts,
  logs,
  adminUsers,
  mailBroadcasts,
  donations,
];

export const resourceByName = new Map(resources.map((r) => [r.name, r]));
export { guildApplications, guildDuties, guildEvents, guildLevels, guildMembers, guilds, guildTasks };
export { adminUsers, bots, channels, donations, dungeons, edicts, events, items, logs, mailBroadcasts, maps, missions, news, npcs, players, pveBalance, pveClears, questConditions, questGoods, quests, shop, texts };
