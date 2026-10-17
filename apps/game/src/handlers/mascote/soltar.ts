/**
 * Aba no jogo: Mascote › soltar pet (libera o slot; se ele tiver WashGetCount, manda uma "essência" 12656
 * de volta pra mochila/correio).
 * Pacotes: 68 PET sub 8 (ReleasePet).
 * C#: `ReleasePet.cs`. Não portado: o WashGetCount × 12656 do original ia por carta direta — aqui vai pra
 * mochila (ou correio se não couber), sem o helper de carta de item específico que o C# usava.
 * Como testar: `apps/game/test/pets-advanced.test.ts`. Manual: Mascote → selecionar pet → Soltar.
 */
import type { GSPacket } from "@ddt/protocol";
import { ItemInfo } from "../../game/item.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { petsChanged } from "./comum.js";

/** 8 ReleasePet: int place. */
export async function release(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const T = ctx.templates.pets;
  const t = ctx.lang.t.bind(ctx.lang);
  const bag = p.petBag;
  const pet = bag.getPetAt(pkt.readInt());
  if (!pet || !bag.removePet(pet)) return;
  const info = T.templates.get(pet.TemplateID);
  const wash = info?.WashGetCount ?? 0;
  const tpl = wash > 0 ? ctx.templates.findItem(12656) : undefined;
  if (tpl) {
    const item = ItemInfo.createFromTemplate(tpl, wash, 105, ctx.now());
    item.IsBinds = true;
    if (!p.getItemInventory(tpl)?.addTemplate(item, wash)) p.tempBag.addTemplate(item, wash);
  }
  p.sendMessage(0, t("PetHandler.Msg19"));
  petsChanged(p, pet.IsEquip);
  p.updatePlayerProperties();
}
