/**
 * Aba no jogo: Bolsa — usar uma carta (buff temporário, pílula de GP, ou carta de dias VIP), por slot ou
 * por "compra rápida" (place -1, lista de IDs de loja). Idempotente: cada carta é consumida antes de dar
 * qualquer efeito, então repetir o pacote encontra o slot vazio/pilha menor e não duplica.
 * Pacote: 183 CARD_USE.
 * C#: `CardUseHandler.cs` (4.1), `Game.Server.Packets.Client/CardUseHandler.cs` (6600, decompilado).
 * Como testar: sem teste dedicado hoje. Manual: Bolsa → usar carta de buff/GP/VIP.
 *
 * GAP conhecido (m2-bolsa): `GameSocketOut.as sendUseCard` é IDÊNTICO nas duas versões pro caminho normal
 * (place≠-1, usar carta da bolsa — `writeInt(bagType,place,count=1,[ids],type,ignoreBagLock)`, o 6600 só
 * soma +1 bool +1 int no FINAL que ninguém lê, framed-by-length, sem fix). O caminho de "compra rápida"
 * (bagType=-1,place=-1, `[ShopManager...GoodsID]`) tem o MESMO wire format nos dois AS3 (confirmado pelos
 * 5 call-sites reais: `BagView.as`, `BuffButton.as`, `RightPropView.as`, `SetsShopView.as`,
 * `OpenBatchView.as`), mas o `.cs` 6600 decompilado deste handler lê um formato DIFERENTE pro mesmo caso
 * (`num3,num4,num5` — 3 ints crus, não um array de IDs) que não bate com o que o AS3 realmente manda —
 * decompilação provavelmente incompleta/código morto superposto, não dá pra confirmar o formato real do
 * 6600 sem rodar o servidor original. Deixado com o comportamento 4.1 (trata `ids` como ID de loja, igual
 * ao `.cs` 4.1) pros dois clientKinds — se um jogador 6600 reportar bug na compra rápida de carta
 * (ex. botão "comprar e usar" de buff), comece aqui.
 */
import { consortiaMgr } from "../../game/consortia-mgr.js";
import { ItemInfo } from "../../game/item.js";
import type { GamePlayer } from "../../game/player.js";
import type { BuffRow } from "../../db/social.js";
import type { ServerContext } from "../../session/context.js";
import * as Out from "../../packets/out.js";
import { GSPacket } from "@ddt/protocol";
import type { HandlerRegistry } from "../registry.js";
import { applyVipDays } from "../../game/vip.js";

/** BufferList.CreateBuffer(template, validDate) + the per-type Start (GPMultipleBuffer etc.: same type extends time). */
export function addItemBuff(p: GamePlayer, t: { Property1: number; Property2: number; Property3: number; TemplateID: number }, validDays: number, now: Date): BuffRow {
  const minutes = validDays * 24 * 60;
  const ex = p.buffs.find((b) => b.Type === t.Property1 && b.IsExist && b.BeginDate.getTime() + b.ValidDate * 60_000 > now.getTime());
  if (ex) {
    ex.ValidDate += minutes;
    return ex;
  }
  p.buffs = p.buffs.filter((b) => b.Type !== t.Property1);
  const b: BuffRow = { UserID: p.id, Type: t.Property1, Value: t.Property2, BeginDate: now, ValidDate: minutes, TemplateID: t.TemplateID, ValidCount: t.Property3, Data: null, IsExist: true };
  p.buffs.push(b);
  return b;
}

/** CardUseHandler.cs (183): int bag, int place (-1 = quick buy), int n, n×int shopIds, int, bool ignoreBagLock. */
export function cardUse(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const bagType = pkt.readInt();
  const place = pkt.readInt();
  const n = pkt.readInt();
  const ids: number[] = [];
  for (let i = 0; i < Math.min(n, 50); i++) ids.push(pkt.readInt());
  pkt.readInt();
  const ignoreLock = pkt.readBoolean();
  if (p.info.HasBagPassword && p.info.IsLocked && !ignoreLock) return p.sendMessage(0, ctx.lang.t("Bag.Locked"));
  const tpl = ctx.templates;
  const loops = place === -1 ? ids : [0];
  for (const shopId of loops) {
    let item: ItemInfo | null = null;
    const bag = place === -1 ? null : p.getInventory(bagType);
    if (place === -1) {
      const s = tpl.shop.get(shopId);
      const t = s ? tpl.findItem(s.TemplateID) : undefined;
      if (!s || !t || !tpl.isOnShop(shopId)) { p.sendMessage(0, "Não é possível comprar este item."); continue; }
      if (!(s.APrice1 === -1 && s.AValue1 > 0) || s.AValue1 > p.info.Money + p.info.MoneyLock) continue;
      p.removeMoney(s.AValue1);
      item = ItemInfo.createFromTemplate(t, 1, 102, ctx.now());
      item.ValidDate = s.AUnit;
    } else item = bag?.getItemAt(place) ?? null;
    if (!item) continue;
    const t = item.template;
    if (t.Property1 === 21) {
      // GP pill: Property2 × count, whole stack consumed.
      if (!item.isValidItem(ctx.now())) continue;
      const gp = t.Property2 * item.Count;
      if (bag && t.CanDelete && !bag.removeCountFromStack(item, item.Count)) continue;
      p.addGP(gp, false);
      p.sendMessage(0, ctx.lang.t("GPDanUser.Success", gp));
      p.questInv?.onUsingItem(item.TemplateID); void consortiaMgr(ctx).then((c) => c.onUseItem(p, item.TemplateID, 1));
      continue;
    }
    if (t.Property1 === 23) {
      // CardUseHandler case 23: VIPRenewal(ValidDate days) + OpenVIP / ContinuousVIP, 92 SendOpenVIP, consume when CanDelete
      const days = item.ValidDate || 1;
      const { opened } = applyVipDays(p.info, days, ctx.now());
      if (bag && t.CanDelete) bag.removeCountFromStack(item, 1);
      p.send(Out.openVip(p.info));
      p.updateProperties();
      p.sendMessage(0, opened ? `Parabéns, você recebeu ${days} dia(s) de privilégios VIP!` : `Você recebeu mais ${days} dia(s) de privilégios VIP!`);
      continue;
    }
    if (bag && !bag.removeCountFromStack(item, 1)) continue;
    addItemBuff(p, t, item.ValidDate, ctx.now());
    p.send(Out.bufferList(p.id, p.buffs));
    p.sendMessage(0, ctx.lang.t("CardUseHandler.Success"));
    p.questInv?.onUsingItem(item.TemplateID); void consortiaMgr(ctx).then((c) => c.onUseItem(p, item.TemplateID, 1));
  }
}

export function registerUsarCarta(r: HandlerRegistry): void {
  r.player(183, "CARD_USE", (ctx, p, pkt) => cardUse(ctx, p, pkt));
}
