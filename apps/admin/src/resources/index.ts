import type { ResourceDef } from "@/crud/types";
import { items } from "./items";
import { dungeons, events, quests, shop } from "./content";
import { bots, players } from "./players";
import { adminUsers, logs, mailBroadcasts, news, texts } from "./system";

/**
 * Registry of every CRUD resource. Adding a game table = add a ResourceDef file and list it here;
 * it gets a route (/<name>), sidebar entry (unless hidden) and dev mock automatically.
 */
export const resources: ResourceDef[] = [
  players,
  bots,
  items,
  shop,
  quests,
  events,
  dungeons,
  texts,
  news,
  logs,
  adminUsers,
  mailBroadcasts,
];

export const resourceByName = new Map(resources.map((r) => [r.name, r]));
export { adminUsers, bots, dungeons, events, items, logs, mailBroadcasts, news, players, quests, shop, texts };
