/**
 * Aba no jogo: Mascote › alimentar (dar comida pro pet, sobe GP/fome).
 * Pacotes: 68 PET sub 4 (FeedPet).
 * C#: `FeedPet.cs`. Fix: o original sempre consumia da mochila de bens (StoreBag); aqui respeita a mochila
 * que o cliente de fato mandou.
 * Como testar: `apps/game/test/pets-advanced.test.ts`. Manual: Mascote → selecionar pet → Alimentar.
 */
import type { GSPacket } from "@ddt/protocol";
import { feedPet } from "../../game/pets.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { petMaxLevelByGrade, petsChanged } from "./comum.js";

/** 4 FeedPet: int itemPlace, int bagType, int petPlace. */
export async function feed(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const T = ctx.templates.pets;
  const t = ctx.lang.t.bind(ctx.lang);
  const bag = p.petBag;
  const itemPlace = pkt.readInt();
  const inv = p.getInventory(pkt.readInt());
  const pet = bag.getPetAt(pkt.readInt());
  const it = inv?.getItemAt(itemPlace) ?? null;
  if (!inv || !it) return p.sendMessage(0, t("PetHandler.Msg9"));
  if (!pet) return;
  const r = feedPet(T, pet, {
    TemplateID: it.TemplateID, Count: it.Count, Property1: it.template.Property1, Property2: it.template.Property2,
    DefendCompose: it.DefendCompose, holes: [it.Hole1, it.Hole2, it.Hole3, it.Hole4, it.Hole5], Blood: (it as unknown as { Blood?: number }).Blood ?? 0,
  }, petMaxLevelByGrade(ctx, p), p.info.VIPLevel);
  if (r.consume > 0) {
    if (it.TemplateID === 334100) inv.removeItem(it);
    else inv.removeCountFromStack(it, Math.min(r.consume, it.Count));
  }
  if (r.ok) bag.changed.add(pet.Place);
  petsChanged(p, r.ok);
  if (r.msg) p.sendMessage(0, t(...r.msg));
}
