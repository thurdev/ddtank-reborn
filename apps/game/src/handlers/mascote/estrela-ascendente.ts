/**
 * Aba no jogo: Mascote › estrela ascendente (sobe a estrela do pet consumindo o item 11162).
 * Pacotes: 68 PET sub 22 (PetRisingStar).
 * C#: `PetRisingStar.cs`.
 * Como testar: `apps/game/test/pets-advanced.test.ts`. Manual: Mascote → selecionar pet → Estrela ascendente.
 */
import type { GSPacket } from "@ddt/protocol";
import { petRisingStar } from "../../game/pets.js";
import type { GamePlayer } from "../../game/player.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";
import { petMaxLevelByGrade, petsChanged } from "./comum.js";

/** 22 PetRisingStar: int templateId (item 11162), int count, int petPlace. */
export function risingStar(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const T = ctx.templates.pets;
  const bag = p.petBag;
  const templateId = pkt.readInt();
  const count = pkt.readInt();
  const petPlace = pkt.readInt();
  const pet = bag.getPetAt(petPlace);
  if (!pet) return p.sendMessage(0, "PetRisingStar.PetNotFound");
  const found = p.propBag.getItemByTemplateID(0, templateId);
  if (!found || found.TemplateID !== 11162) { p.sendMessage(0, "PetRisingStar.ItemNotFound"); p.send(Out.petRisingStarReply(false)); return; }
  const r = petRisingStar(T, pet, found.template.Property2, Math.min(count, found.Count), petMaxLevelByGrade(ctx, p), p.info.VIPLevel);
  if (!r) { p.sendMessage(0, "PetRisingStar.UnSupport"); p.send(Out.petRisingStarReply(false)); return; }
  if (r.consumed > 0) p.propBag.removeCountFromStack(found, r.consumed);
  bag.changed.add(petPlace);
  petsChanged(p, pet.IsEquip);
  p.send(Out.petRisingStarReply(r.success));
}
