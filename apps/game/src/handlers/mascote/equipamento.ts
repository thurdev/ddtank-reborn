/**
 * Aba no jogo: Mascote › equipar/remover item de pet (arma/roupa/chapéu, categorias 50/51/52).
 * Pacotes: 68 PET sub 20 (AddPetEquip), sub 21 (DelPetEquip).
 * C#: `AddPetEquip.cs`, `DelPetEquip.cs`.
 * Como testar: `apps/game/test/pets-advanced.test.ts`. Manual: Mascote → selecionar pet → Equipar item.
 */
import type { GSPacket } from "@ddt/protocol";
import { ItemInfo } from "../../game/item.js";
import { mailItems } from "../bolsa/correio-excedente.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { petsChanged } from "./comum.js";

/** 20 AddPetEquip: int bagType, int slot, int place (pet). O item precisa ser equip de pet (cat. 50/51/52). */
export function addEquip(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const bag = p.petBag;
  const bagType = pkt.readInt();
  const slot = pkt.readInt();
  const place = pkt.readInt();
  const inv = p.getInventory(bagType);
  const item = inv?.getItemAt(slot);
  const pet = bag.getPetAt(place);
  if (!item || !pet || ![50, 51, 52].includes(item.template.CategoryID)) return p.sendMessage(0, "AddPetEquip.WrongItem");
  if (pet.Level < item.template.Property2) return p.sendMessage(0, "AddPetEquip.WrongLevel");
  const eqType = item.template.CategoryID === 51 ? 1 : item.template.CategoryID === 52 ? 2 : 0;
  if (!bag.addEqPet(place, eqType, item.TemplateID, item.ValidDate, item.IsUsed ? item.BeginDate : ctx.now())) return;
  inv!.takeOutItem(item);
  bag.changed.add(place);
  petsChanged(p, true);
  p.sendMessage(0, "Item de PET equipado com sucesso!");
}

/** 21 DelPetEquip: int petPlace, int eqType — devolve o item (travado) pra mochila ou pro correio se não couber. */
export async function delEquip(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const bag = p.petBag;
  const place = pkt.readInt();
  const eqType = pkt.readInt();
  const removed = bag.removeEqPet(place, eqType);
  if (!removed) return;
  const gt = ctx.templates.findItem(removed.eqTemplateID);
  if (gt) {
    const item = ItemInfo.createFromTemplate(gt, 1, 105, ctx.now());
    item.IsBinds = true; item.IsUsed = true; item.ValidDate = removed.ValidDate; item.BeginDate = removed.startTime;
    if (!p.getItemInventory(gt)?.addTemplate(item, 1)) await mailItems(ctx, p, [item]);
  }
  bag.changed.add(place);
  petsChanged(p, true);
}
