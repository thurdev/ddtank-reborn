/**
 * Aba no jogo: Mascote › adotar (sorteia uma lista de pets pra escolher; atualizar/rerolar a oferta).
 * Pacotes: 68 PET sub 5 (RefereshPet), sub 6 (AdoptPet).
 * C#: `RefereshPet.cs`, `AdoptPet.cs`.
 * Como testar: `apps/game/test/pets-advanced.test.ts`. Manual: Mascote → Adotar.
 */
import type { GSPacket } from "@ddt/protocol";
import { cfgNum, createAdoptList } from "../../game/pets.js";
import type { GamePlayer } from "../../game/player.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";
import { petMaxLevelByGrade, tryRemoveMoney } from "./comum.js";

/**
 * 5 RefereshPet.cs: bool refreshBtn (+ um 2º bool do cliente nunca lido). false = só reexibe a oferta atual;
 * true = reroll (`AdoptRefereshCost` em Cupom, ou 1 item `FreeRefereshID` em vez disso — sem PetScore então).
 */
export function refresh(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const T = ctx.templates.pets;
  const bag = p.petBag;
  const refreshBtn = pkt.readBoolean();
  if (refreshBtn) {
    const cost = cfgNum(T, "AdoptRefereshCost", 190);
    const freeId = cfgNum(T, "FreeRefereshID", 0);
    const freeItem = freeId > 0 ? p.propBag.getItemByTemplateID(0, freeId) : null;
    let addScore = true;
    if (freeItem) { p.propBag.removeCountFromStack(freeItem, 1); addScore = false; }
    else if (!tryRemoveMoney(p, cost)) return;
    if (addScore) p.addPetScore(Math.trunc(cost * 0.1));
    bag.adopt = createAdoptList(T, () => ctx.templates.petAdoptPick(), p.id, petMaxLevelByGrade(ctx, p), p.info.VIPLevel);
  }
  const reply = Out.refreshPet(bag.adopt, refreshBtn);
  if (reply) p.send(reply);
}

/** 6 AdoptPet.cs: int place na oferta atual -> movido pro primeiro slot vazio de pet. */
export async function adopt(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const T = ctx.templates.pets;
  const bag = p.petBag;
  const place = pkt.readInt();
  const slot = bag.findFirstEmptySlot();
  if (slot === -1) { p.sendMessage(0, "O número de pets atingiu o limite!"); return; }
  if (place < 0 || place >= bag.adopt.length) { p.sendMessage(0, "Pet não encontrado!"); return; }
  const picked = bag.adopt[place];
  if (!picked) return;
  if (bag.addPetTo(picked, slot)) {
    const info = T.templates.get(picked.TemplateID);
    if (info && (info.StarLevel > 3 || info.KindID >= 5)) {
      const msg = `[${p.zoneName}] O jogador [${p.info.NickName}] teve sorte e capturou ${info.Name} de ${info.StarLevel} estrela(s).`;
      for (const o of ctx.world.all()) o.sendMessage(0, msg);
    } else p.sendMessage(0, "Captura bem-sucedida.");
  }
  bag.adopt = [];
  p.flushPets();
  void p.saveIntoDatabase(ctx.db.db).catch((e) => ctx.log.warn(`pet adopt save: ${e}`));
}
