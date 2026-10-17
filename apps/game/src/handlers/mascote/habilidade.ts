/**
 * Aba no jogo: Mascote › equipar habilidade (slot 4 exige VIP 7).
 * Pacotes: 68 PET sub 7 (EquipSkillPet).
 * C#: `EquipSkillPet.cs`.
 * Como testar: `apps/game/test/pets-cards-vip.test.ts`. Manual: Mascote → selecionar pet → Habilidades.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { petsChanged } from "./comum.js";

/** 7 EquipSkillPet: int place, int skillId, int slot. */
export function equipSkill(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const t = ctx.lang.t.bind(ctx.lang);
  const bag = p.petBag;
  const place = pkt.readInt(), skillId = pkt.readInt(), slot = pkt.readInt();
  if (slot === 4 && p.info.VIPLevel < 7) return p.sendMessage(0, t("PetHandler.Msg181"));
  const r = bag.equipSkill(place, skillId, slot);
  if (r.msg) p.sendMessage(0, t(r.msg));
  petsChanged(p, false);
}
