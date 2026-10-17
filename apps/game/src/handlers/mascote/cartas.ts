/**
 * Aba no jogo: Cartas (não é tela de Mascote, mas mora no mesmo pacote histórico — ver cartas.md).
 * Pacotes: 216 CARDS_DATA.
 * C#: `CardDataHandler.cs`. Lógica em `game/cards.ts`.
 * Como testar: `apps/game/test/pets-cards-vip.test.ts`. Manual: Cartas.
 */
import type { GSPacket } from "@ddt/protocol";
import { moveOrEquipCard, upgradeCard, type CardUpdateRowFull } from "../../game/cards.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

/** CardDataHandler (216): int cmd — 0 mover/equipar/desequipar, 1 abrir slot vice, 2 abrir caixa de carta,
 *  3 evoluir, 4 ordenar (no-op). */
export function cardCommand(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const bag = p.cardBag;
  const cmd = pkt.readInt();
  let stats = false;
  switch (cmd) {
    case 0: {
      const r = moveOrEquipCard(bag, pkt.readInt(), pkt.readInt());
      stats = r.changedStats;
      if (r.msg) p.sendMessage(0, r.msg);
      break;
    }
    case 1: {
      // abrir um slot vice: carta placeholder 314101 com Count −1 (CardDataHandler case 1)
      const place = pkt.readInt();
      if (place < 0 || place >= 5 || bag.getItemAt(place)) break;
      bag.addCardTo({ CardID: 0, UserID: p.id, TemplateID: 314101, Place: place, Count: -1, Attack: 0, Defence: 0, Agility: 0, Luck: 0, Guard: 0, Damage: 0, AttackReset: 0, DefenceReset: 0, AgilityReset: 0, LuckReset: 0, Level: 0, CardGP: 0, isFirstGet: true }, place);
      break;
    }
    case 2: {
      // abrir uma caixa de carta (slot da EquipBag): Property5 = template da carta (categoria 26); count + rand(1,3) por caixa
      const slot = pkt.readInt();
      const count = pkt.readInt();
      const it = p.equipBag.getItemAt(slot);
      const card = it ? ctx.templates.findItem(it.template.Property5) : undefined;
      if (!it || count <= 0 || count > it.Count || !card || card.CategoryID !== 26) {
        p.sendMessage(0, "A carta não existe.");
        return;
      }
      const n = it.Count;
      if (!p.equipBag.removeCountFromStack(it, n)) return;
      let total = n;
      for (let i = 0; i < n; i++) total += 1 + Math.floor(Math.random() * 2);
      bag.addCard(card.TemplateID, total);
      break;
    }
    case 3: {
      const k = ctx.templates;
      const r = upgradeCard(bag, pkt.readInt(), (lv) => k.cardConditions.get(lv), (tpl, lv) => k.cardUpdates.get(`${tpl}:${lv}`) as CardUpdateRowFull | undefined, k.cardMaxLevel || 30);
      if (r.msg) p.sendMessage(0, r.msg);
      stats = r.levelUp;
      break;
    }
    default:
      break; // 4 ordenar: lê dois ints e não faz nada no original
  }
  p.cards = bag.equipped();
  p.flushCards();
  if (stats) p.updatePlayerProperties();
}
