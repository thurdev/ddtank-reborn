/**
 * Aba no jogo: Mascote › levar pra luta (equipar/desequipar o pet de batalha).
 * Pacotes: 68 PET sub 17 (FightPet).
 * C#: `FightPet.cs`.
 * Como testar: `apps/game/test/pets-advanced.test.ts`. Manual: Mascote → selecionar pet → Levar pra luta.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { petMaxLevelByGrade, petsChanged } from "./comum.js";

/** 17 FightPet: int place, bool equip — o nível do pet precisa caber no teto do jogador, exceto se já tava equipado. */
export function fight(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const t = ctx.lang.t.bind(ctx.lang);
  const bag = p.petBag;
  const place = pkt.readInt();
  const equip = pkt.readBoolean();
  const pet = bag.getPetAt(place);
  if (!pet) return;
  if (pet.Level > petMaxLevelByGrade(ctx, p) && !pet.IsEquip) return p.sendMessage(0, t("PetHandler.Msg21"));
  if (!bag.equipPet(place, equip)) return p.sendMessage(0, t("PetHandler.Msg22"));
  petsChanged(p, true);
}
