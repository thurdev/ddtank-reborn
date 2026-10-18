/**
 * Aba no jogo: Cartas › slot/"alma da carta" ("soul slot") — subir o nível de uma das 5 cartas equipadas
 * gastando CardSoul (sub 0), ou resetar todas de volta pra nível 0 devolvendo CardSoul proporcional ao
 * CardGP acumulado, cobrando 300 de Money (sub 1).
 * Pacote: 170 CARDS_SLOT (`sendUpdateSLOT`/`sendResetCardSoul`, `GameSocketOut.as:2019-2034`).
 * C#: `CardSlotHandler.cs` (6600 only — sem equivalente 4.1, `ePackageType` não tem `CARDS_SLOT` no enum
 * 4.1; confirmado: código novo do 6600, nunca mandado por um cliente 4.1).
 * Como testar: `apps/game/test/client-6600-m3-cards-slot.test.ts`. Manual: Cartas → carta equipada → slot.
 *
 * m3-cards-slot (2026-10-18): `UsersCardInfo.Type` (int_4, decompilado) escolhe qual curva de
 * `Card_Groove_Update` o slot usa — a origem decompilada não mostra onde um cartão novo ganha `Type=1` em
 * vez de `0` (os únicos 2 valores na seed, +4 vs +5 de stat por nível); todo cartão criado por este port usa
 * `Type=0` (gap documentado, não um palpite — ver `UserCardRow.Type` em `game/cards.ts`). O dado persiste
 * numa coluna nova (`player."Sys_Users_Card"."Type"`, migration `0019_cards-slot-type.sql`, adicionada só
 * porque faltava — a tabela 4.1 nunca teve essa coluna).
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { cardGrooveLevelForGP } from "../../game/cards.js";
import * as Out from "../../packets/out.js";

/**
 * CardSlotHandler.cs sub 0 (UpGraceSlot): slot (index into the 5 EQUIPPED cards, same as `cards[num3]` in
 * the original, not a raw `Place`), soulPoint (CardSoul to spend, must be > 0 and <= player's CardSoul).
 * At max level the cost is capped to exactly what's needed to reach it (`num5 = GetGP(maxLv) - CardGP`),
 * same as the original — never lets you "bank" wasted CardSoul past the curve's last threshold.
 */
function upgradeSlot(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const slot = pkt.readInt();
  const soulPoint = pkt.readInt();
  const card = p.cardBag.equipped()[slot];
  if (!card || soulPoint <= 0 || soulPoint > (p.info.CardSoul ?? 0)) return;
  const rows = ctx.templates.cardGrooveUpdates.get(card.Type) ?? [];
  if (!rows.length) return;
  const maxLv = rows.length - 1;
  let spend = soulPoint;
  const gp = card.CardGP + spend;
  const level = cardGrooveLevelForGP(rows, gp);
  if (level === rows[maxLv]!.Level) spend = rows[maxLv]!.Exp - card.CardGP;
  if (spend <= 0 || spend > (p.info.CardSoul ?? 0)) return;
  card.CardGP += spend;
  card.Level = level;
  p.cardBag.updateCard(card);
  p.info.CardSoul = (p.info.CardSoul ?? 0) - spend;
  p.updatePlayerProperties();
  p.send(Out.playerCardSlot(p.id, p.zoneId, p.info.CardSoul ?? 0, [card]));
}

/**
 * CardSlotHandler.cs sub 1 (ResetCardSoul): costs 300 Money (MoneyDirect — bound money first, then free,
 * same order as `removeMoney`), refunds the SUM of all 5 equipped cards' CardGP as CardSoul, and zeroes
 * every equipped card's Level/CardGP back to 0 (not just the one that triggered it).
 */
function resetCardSoul(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  pkt.readBoolean(); // isBand (unused by CardSlotHandler.cs — read and discarded, same as the original)
  const RESET_COST = 300;
  // CardSlotHandler.cs:57 hardcodes "Xu không đủ!" directly (not a LanguageMgr key) — ported as a literal
  // PT-BR string, same convention as the other hardcoded-original messages in roleta.ts/forja/*.
  if (p.info.Money + p.info.MoneyLock < RESET_COST) return void p.sendMessage(0, "Ouro insuficiente!");
  const cards = p.cardBag.equipped();
  let refund = 0;
  for (const c of cards) {
    refund += c.CardGP;
    c.Level = 0;
    c.CardGP = 0;
    p.cardBag.updateCard(c);
  }
  p.removeMoney(RESET_COST);
  p.info.CardSoul = (p.info.CardSoul ?? 0) + refund;
  p.updatePlayerProperties();
  // CardSlotHandler.cs:51 LanguageMgr key "UpdateSLOT.ResetComplete" (real key, unlike the Money failure above).
  p.sendMessage(0, ctx.lang.t("UpdateSLOT.ResetComplete", refund));
  p.send(Out.playerCardSlot(p.id, p.zoneId, p.info.CardSoul ?? 0, cards));
}

/** 170 CARDS_SLOT: int sub — 0 upgradeSlot, 1 resetCardSoul (CardSlotHandler.cs). */
export function cardsSlot(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const sub = pkt.readInt();
  switch (sub) {
    case 0: return upgradeSlot(ctx, p, pkt);
    case 1: return resetCardSoul(ctx, p, pkt);
    default: ctx.log.debug(`170 CARDS_SLOT: sub ${sub} not handled`);
  }
}
