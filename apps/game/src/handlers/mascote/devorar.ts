/**
 * Aba no jogo: Mascote › devorar (sacrificar pets ou pedras de fortalecimento pra subir o nível de
 * arma/roupa/chapéu "de comer pet").
 * Pacotes: 68 PET sub 33 (EatPet).
 * C#: `EatPet.cs`.
 * Como testar: `apps/game/test/pets-advanced.test.ts`. Manual: Mascote → Devorar.
 */
import type { GSPacket } from "@ddt/protocol";
import { eatPetsUpgrade, hungBuCacCho, moeNeedExp } from "../../game/pets.js";
import type { GamePlayer } from "../../game/player.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";

/** 33 EatPet: int amor (0 arma/1 roupa/2 chapéu), int type (1 = sacrificar pets, senão item 201567). */
export function eat(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const T = ctx.templates.pets;
  const bag = p.petBag;
  const amor = pkt.readInt() as 0 | 1 | 2;
  const type = pkt.readInt();
  const e = bag.eat;
  const blocked = hungBuCacCho(e.weaponLevel, e.clothesLevel, e.hatLevel);
  const names = ["Roupa ou Chapéu", "Vũ khí và Nón", "Vũ khí và Áo"] as const;
  if (([e.weaponLevel, e.clothesLevel, e.hatLevel][amor]) === blocked) {
    return p.sendMessage(0, `Evolua ${names[amor]} primeiro!`);
  }
  if (type === 1) {
    const count = pkt.readInt();
    let totalPoint = 0;
    for (let i = 0; i < count; i++) {
      const slot = pkt.readInt();
      const tplId = pkt.readInt();
      const petAt = bag.getPetAt(slot);
      if (petAt) {
        const info = T.templates.get(tplId);
        if (info) totalPoint += Math.trunc(10 ** (info.StarLevel - 2) + 5 * Math.max(petAt.Level - 8, petAt.Level * 0.2));
      }
      if (petAt && bag.removePet(petAt)) eatPetsUpgrade(T, e, amor, totalPoint);
    }
  } else {
    const count = pkt.readInt();
    const eatItemId = 201567;
    const info2 = p.propBag.getItemByTemplateID(0, eatItemId);
    if (!info2) return p.sendMessage(0, "Pedras de fortalecimento insuficientes!");
    let totalPoint = count * info2.template.Property2;
    const need = moeNeedExp(T, [e.weaponExp, e.clothesExp, e.hatExp][amor]!, [e.weaponLevel, e.clothesLevel, e.hatLevel][amor]!);
    let realCount = count;
    if (totalPoint > need && info2.template.Property2 > 0) { realCount = Math.ceil(need / info2.template.Property2); totalPoint = info2.template.Property2; }
    if (!p.propBag.removeCountFromStack(info2, realCount)) return p.sendMessage(0, "Pedras de fortalecimento insuficientes!");
    eatPetsUpgrade(T, e, amor, totalPoint);
  }
  bag.eatDirty = true;
  p.send(Out.eatPetsInfo(e));
  p.updatePlayerProperties();
}
