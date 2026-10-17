/**
 * Aba no jogo: Mascote › reverter pet ("lavar" de volta pro estado de quando chocou): RecycleCost em Cupom;
 * crescimento/quebra/habilidades voltam pro `BaseProp` (a linha salva na choca), equipamentos removidos
 * (devolvidos travados), e o jogador recebe um item 334100 ("essência de pet") carregando o GP/MaxGP/quebra
 * que foi lavado (o mesmo item que `alimentar.ts` consome).
 * Pacotes: 68 PET sub 18 (RevertPet).
 * C#: `RevertPet.cs`.
 * Como testar: `apps/game/test/pets-advanced.test.ts`. Manual: Mascote → selecionar pet → Reverter.
 */
import type { GSPacket } from "@ddt/protocol";
import { cfgNum } from "../../game/pets.js";
import { ItemInfo } from "../../game/item.js";
import { mailItems } from "../bolsa/correio-excedente.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { petsChanged, tryRemoveMoney } from "./comum.js";

/** 18 RevertPet: int place. */
export async function revert(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const T = ctx.templates.pets;
  const t = ctx.lang.t.bind(ctx.lang);
  const bag = p.petBag;
  const place = pkt.readInt();
  const cost = cfgNum(T, "RecycleCost", 10000);
  if (!tryRemoveMoney(p, cost)) return;
  const pet = bag.getPetAt(place);
  if (!pet) return;
  let base: Partial<typeof pet> | null = null;
  try { base = JSON.parse(pet.BaseProp || "null"); } catch { base = null; }
  if (!base) { p.sendMessage(0, t("PetHandler.Msg7")); return; }
  const essenceTpl = ctx.templates.findItem(334100);
  if (essenceTpl) {
    const essence = ItemInfo.createFromTemplate(essenceTpl, 1, 102, ctx.now());
    essence.IsBinds = true;
    essence.DefendCompose = pet.GP; essence.AgilityCompose = pet.MaxGP;
    essence.Hole1 = pet.breakGrade; essence.Hole2 = pet.breakAttack; essence.Hole3 = pet.breakDefence;
    essence.Hole4 = pet.breakAgility; essence.Hole5 = pet.breakLuck; essence.Blood = pet.breakBlood;
    if (!p.propBag.addTemplate(essence, 1)) await mailItems(ctx, p, [essence], undefined, 7);
  }
  pet.breakGrade = base.breakGrade ?? 0; pet.breakAttack = base.breakAttack ?? 0; pet.breakDefence = base.breakDefence ?? 0;
  pet.breakAgility = base.breakAgility ?? 0; pet.breakLuck = base.breakLuck ?? 0; pet.breakBlood = base.breakBlood ?? 0;
  pet.Attack = base.Attack ?? pet.Attack; pet.Defence = base.Defence ?? pet.Defence; pet.Agility = base.Agility ?? pet.Agility;
  pet.Luck = base.Luck ?? pet.Luck; pet.Blood = base.Blood ?? pet.Blood;
  pet.AttackGrow = base.AttackGrow ?? pet.AttackGrow; pet.DefenceGrow = base.DefenceGrow ?? pet.DefenceGrow;
  pet.AgilityGrow = base.AgilityGrow ?? pet.AgilityGrow; pet.LuckGrow = base.LuckGrow ?? pet.LuckGrow; pet.BloodGrow = base.BloodGrow ?? pet.BloodGrow;
  pet.TemplateID = base.TemplateID ?? pet.TemplateID; pet.Skill = base.Skill ?? pet.Skill; pet.SkillEquip = base.SkillEquip ?? pet.SkillEquip;
  pet.GP = 0; pet.Level = 1; pet.MaxGP = 55;
  for (const eq of [0, 1, 2]) {
    const removed = bag.removeEqPet(place, eq);
    if (removed) {
      const gt = ctx.templates.findItem(removed.eqTemplateID);
      if (gt) {
        const item = ItemInfo.createFromTemplate(gt, 1, 105, ctx.now());
        item.IsBinds = true; item.IsUsed = true; item.ValidDate = removed.ValidDate; item.BeginDate = removed.startTime;
        if (!p.getItemInventory(gt)?.addTemplate(item, 1)) await mailItems(ctx, p, [item]);
      }
    }
  }
  bag.changed.add(place);
  p.sendMessage(0, t("PetHandler.Msg8"));
  petsChanged(p, pet.IsEquip);
  void p.saveIntoDatabase(ctx.db.db).catch((e) => ctx.log.warn(`pet revert save: ${e}`));
}
