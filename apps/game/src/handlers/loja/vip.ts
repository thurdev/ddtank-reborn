/**
 * Aba no jogo: VIP — comprar/renovar dias de VIP pagando Money (pra si mesmo ou de presente pra outro nick).
 * Preço vem da linha de loja do cartão VIP (template 11992), cobrado ANTES de aplicar os dias.
 * Pacote: 92 VIP_RENEWAL.
 * C#: `OpenVipHandler.cs`.
 * Diferente de usar um cartão de VIP já na bolsa (isso é `bolsa/usar-carta.ts`, CARD_USE Property1===23 —
 * consome item, não cobra Money; os dois caminhos não se chamam).
 * Como testar: sem teste automatizado dedicado hoje. Manual: tela VIP → comprar dias.
 */
import { addExpVip, applyVipDays, vipExpTable, vipNextLevelDays, vipPrice } from "../../game/vip.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import * as Out from "../../packets/out.js";
import type { HandlerRegistry } from "../registry.js";

/** OpenVipHandler.cs (92): str nick, int days. Price from the VIP card (11992) shop entry, charged first (MoneyDirect). */
export function openVip(ctx: ServerContext, p: GamePlayer, nick: string, days: number): void {
  const card = [...ctx.templates.shop.values()].find((s) => s.TemplateID === 11992);
  const money = vipPrice(card, days);
  if (days <= 0 || money < 0) return;
  const target = nick === p.info.NickName ? p : ctx.world.all().find((o) => o.info.NickName === nick);
  if (!target) return p.sendMessage(0, `O jogador ${nick} não existe ou está ausente!`);
  if (target === p && p.info.VIPLevel === 9) return p.sendMessage(0, "Você já atingiu o nível VIP máximo!"); // checked before charging (original charged first)
  if (p.info.Money + p.info.MoneyLock < money) return p.sendMessage(0, ctx.lang.t("UserBuyItemHandler.Money"));
  p.removeMoney(money);
  const table = vipExpTable(ctx.templates.serverConfig.get("VIPExpForEachLv"));
  const { opened } = applyVipDays(target.info, days, ctx.now());
  addExpVip(target.info, money, table);
  if (target.info.typeVIP > 0) target.info.VIPNextLevelDaysNeeded = vipNextLevelDays(target.info, table, card);
  target.send(Out.openVip(target.info));
  target.updateProperties();
  if (target !== p) target.sendMessage(0, `${p.info.NickName} ${opened ? "renovou" : "estendeu"} seu VIP com sucesso!`);
  p.sendMessage(0, target === p ? (opened ? "VIP ativado com sucesso!" : "VIP renovado com sucesso!") : `VIP ${opened ? "ativado" : "renovado"} para ${nick} com sucesso!`);
}

export function registerVip(r: HandlerRegistry): void {
  r.player(92, "VIP_RENEWAL", (ctx, p, pkt) => openVip(ctx, p, pkt.readString(), pkt.readInt()));
}
