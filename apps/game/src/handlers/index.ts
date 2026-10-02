import { HandlerRegistry } from "./registry.js";
import { registerBasic } from "./basic.js";
import { registerChat } from "./chat.js";
import { registerItems } from "./items.js";
import { registerSocial } from "./social.js";
import { registerRooms } from "./rooms.js";
import { registerQuests } from "./quests.js";
import { registerMail } from "./mail.js";
import { registerForge } from "./forge.js";
import { registerUse } from "./use.js";
import { registerConsortia } from "./consortia.js";
import { registerEvents } from "./events.js";
import { registerAcademy } from "./academy.js";
import { registerHotSpring } from "./hotspring.js";
import { registerPets } from "./pets.js";

export function createRegistry(): HandlerRegistry {
  const r = new HandlerRegistry();
  registerBasic(r);
  registerChat(r);
  registerItems(r);
  registerSocial(r);
  registerRooms(r);
  registerQuests(r);
  registerMail(r);
  registerForge(r);
  registerUse(r);
  registerConsortia(r);
  registerEvents(r);
  registerAcademy(r);
  registerHotSpring(r);
  registerPets(r);
  return r;
}
