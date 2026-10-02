import { HandlerRegistry } from "./registry.js";
import { registerBasic } from "./basic.js";
import { registerChat } from "./chat.js";
import { registerItems } from "./items.js";
import { registerSocial } from "./social.js";
import { registerRooms } from "./rooms.js";
import { registerQuests } from "./quests.js";
import { registerMail } from "./mail.js";

export function createRegistry(): HandlerRegistry {
  const r = new HandlerRegistry();
  registerBasic(r);
  registerChat(r);
  registerItems(r);
  registerSocial(r);
  registerRooms(r);
  registerQuests(r);
  registerMail(r);
  return r;
}
