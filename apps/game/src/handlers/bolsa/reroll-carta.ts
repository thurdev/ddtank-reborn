/**
 * Aba no jogo: Bolsa/Cartas — rerolar os 4 atributos (Ataque/Defesa/Agilidade/Sorte) de uma carta na bolsa.
 * Pacote: 196 CARD_RESET. Dois passos: modo 0 rola um preview (pago em cópias da carta, ou Money) e guarda
 * os 4 deltas num cache em memória por TemplateID; qualquer outro modo confirma — aplica os deltas como
 * campos `*Reset` e, se houver cópia da mesma carta equipada, espelha as novas stats nela também
 * (`UsersCardInfo.CopyProp`).
 * C#: `CardResetHandler.cs:548`.
 * Como testar: sem teste dedicado hoje. Manual: Cartas → carta na bolsa → Reroll → confirmar.
 *
 * Como lê esse código (cada variável):
 * - mode/slot: 0 = pedir preview; slot < 5 é zona dos 5 slots equipados (recusa, só carta na bolsa reseta).
 * - cond: CardUpdateCondition da linha do nível atual — ResetCardCount/ResetMoney = custo do reroll.
 * - delta: os 4 incrementos (Attack/Defence/Agility/Luck) rolados por nextSmallValue, só "reais" depois de confirmar.
 */
import { GSPacket } from "@ddt/protocol";
import { copyProp, nextSmallValue } from "../../game/cards.js";
import type { GamePlayer } from "../../game/player.js";
import type { HandlerRegistry } from "../registry.js";

export function registerRerollCarta(r: HandlerRegistry): void {
  const cardResetTemp = new WeakMap<GamePlayer, Map<number, [number, number, number, number]>>();
  r.player(196, "CARD_RESET", (ctx, p, pkt) => {
    const mode = pkt.readInt();
    const slot = pkt.readInt();
    if (slot < 5) return;
    const card = p.cardBag.getItemAt(slot);
    if (!card) return;
    if (mode === 0) {
      const cond = ctx.templates.cardConditions.get(card.Level);
      if (!cond || cond.ResetCardCount <= 0) return p.sendMessage(0, ctx.lang.t("GameServer.CardReset.Msg3"));
      let paid = false;
      if (card.Count >= cond.ResetCardCount) {
        card.Count -= cond.ResetCardCount;
        p.cardBag.updateCard(card);
        paid = true;
      } else if (cond.ResetMoney <= p.info.Money + p.info.MoneyLock) {
        p.removeMoney(cond.ResetMoney);
        paid = true;
      }
      if (!paid) return p.sendMessage(0, ctx.lang.t("GameServer.CardReset.Msg2"));
      const delta: [number, number, number, number] = [
        nextSmallValue(5, nextSmallValue(6, 50)), nextSmallValue(5, nextSmallValue(6, 50)),
        nextSmallValue(5, nextSmallValue(6, 50)), nextSmallValue(5, nextSmallValue(6, 50)),
      ];
      let m = cardResetTemp.get(p);
      if (!m) cardResetTemp.set(p, (m = new Map()));
      m.set(card.TemplateID, delta);
      const out = new GSPacket(196, p.id);
      out.writeInt(4);
      out.writeInt(card.Attack + delta[0]); out.writeInt(card.Defence + delta[1]); out.writeInt(card.Agility + delta[2]); out.writeInt(card.Luck + delta[3]);
      p.send(out);
    } else {
      const delta = cardResetTemp.get(p)?.get(card.TemplateID);
      if (!delta) return;
      [card.AttackReset, card.DefenceReset, card.AgilityReset, card.LuckReset] = delta;
      const equipped = p.cardBag.getCardEquip(card.TemplateID);
      if (equipped) {
        copyProp(equipped, card);
        p.cardBag.updateCard(equipped);
        p.updatePlayerProperties();
      }
      p.cardBag.updateCard(card);
      cardResetTemp.get(p)?.delete(card.TemplateID);
      p.sendMessage(0, ctx.lang.t("GameServer.CardReset.Msg1"));
    }
  }); // m3-partial-sweep (2026-10-19): `sendCardReset`(mode 0, preview)/`sendReplaceCardProp`(mode 1, confirm) do GameSocketOut.as 6600 são a MESMA ação já coberta pelo `if(mode===0) {...} else {...}` — nada faltando. Flipped partial -> implemented.
}
