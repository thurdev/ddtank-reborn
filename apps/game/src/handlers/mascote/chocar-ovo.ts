/**
 * Aba no jogo: Mascote › chocar ovo (usar um item de ovo pra ganhar um pet novo).
 * Pacotes: 68 PET sub 2 (AddPet).
 * C#: `AddPet.cs`.
 * Como testar: `apps/game/test/pets-advanced.test.ts`. Manual: Mascote → Chocar ovo.
 */
import type { GSPacket } from "@ddt/protocol";
import { createPet } from "../../game/pets.js";
import type { GamePlayer } from "../../game/player.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";
import { petMaxLevelByGrade } from "./comum.js";

/** 2 AddPet: int place, int bagType — template do pet vem de `Property5` do item (o ovo). */
export async function addPet(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const T = ctx.templates.pets;
  const t = ctx.lang.t.bind(ctx.lang);
  const bag = p.petBag;
  const place = pkt.readInt();
  const bagType = pkt.readInt();
  const slot = bag.findFirstEmptySlot();
  if (slot === -1) return p.sendMessage(0, t("PetHandler.Msg3"));
  const inv = p.getInventory(bagType);
  const it = inv?.getItemAt(place) ?? null;
  const info = it ? T.templates.get(it.template.Property5) : undefined;
  if (!inv || !it || !info) return p.sendMessage(0, t("PetHandler.Msg4"));
  const pet = createPet(T, info, p.id, slot, petMaxLevelByGrade(ctx, p), p.info.VIPLevel);
  pet.BaseProp = JSON.stringify({ ...pet, dirty: undefined });
  if (!inv.removeCountFromStack(it, 1)) return;
  bag.addPetTo(pet, slot);
  if (info.StarLevel > 4) {
    const msg = t("PetHandler.Msg5", p.info.NickName, info.Name, info.StarLevel);
    for (const o of ctx.world.all()) o.sendMessage(0, msg);
  } else p.sendMessage(0, t("PetHandler.Msg6", info.Name, info.StarLevel));
  p.flushPets();
  p.send(Out.petAdded(info.TemplateID));
  void p.saveIntoDatabase(ctx.db.db).catch((e) => ctx.log.warn(`pet save: ${e}`));
}
