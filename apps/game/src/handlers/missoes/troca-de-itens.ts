/**
 * Aba no jogo: evento de calendário "troca de itens" — arrastar os itens pedidos pra bandeja e trocar por
 * uma recompensa fixa.
 * Pacote: 31 GOODS_EXCHANGE.
 * C#: `vendor/DDT-6600/.../GoodsExchangeHandler.cs` (única referência encontrada; `DDTank41/Game.Server` nunca
 * publicou esse handler). Receita vem de `db/templates.ts` (`loadActiveExchange`).
 * Como testar: `apps/game/test/activities.test.ts`. Manual: `docs/features/missoes.md`.
 */
import { BagType, type ItemInfo } from "../../game/item.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { grantRewards, type Reward } from "../../game/events.js";
import { mailItems } from "../bolsa/correio-excedente.js";
import { bagLocked } from "../bolsa/senha-da-bolsa.js";

/**
 * 31 GOODS_EXCHANGE (GoodsExchangeView.sendGoods, AS3): int activeId, int count, depois `count` × {int
 * templateId, int place, int bagType} — os itens que o jogador arrastou pra bandeja de troca. O
 * `GoodsExchangeHandler.cs` do DDT-6600 é a única referência de servidor encontrada, mas o formato dele lê 3
 * ints de cabeçalho mais um "tier" final que o cliente 4.1 nunca escreve — então só a parte que bate com o
 * nosso cliente (a lista de itens, sem tier) foi portada; ver `db/templates.ts` `loadActiveExchange` pra
 * convenção de custo/prêmio 0/1 resultante.
 * Como lê esse código (cada variável):
 * - `activeId`: id do evento de calendário (`Active.ActiveID`). Vem do pacote; escolhe a receita em
 *   `Active_Convert_Item`.
 * - `offered`: itens que o cliente arrastou pra bandeja (`{templateId, place, bagType}`). Vem do pacote, um
 *   por item.
 * - `missing`: (não usado aqui, mantido como nome pra futura mensagem detalhada) nomes dos itens que faltam.
 */
export async function trocarItens(ctx: ServerContext, p: GamePlayer, activeId: number, offered: { templateId: number; place: number; bagType: number }[]): Promise<void> {
  if (bagLocked(ctx, p)) return;
  const active = ctx.templates.actives.get(activeId);
  const now = ctx.now();
  if (!active || active.StartDate > now || (active.EndDate != null && active.EndDate < now)) {
    p.sendMessage(0, "Esta troca não está disponível.");
    return;
  }
  // Referência: vendor/DDT-6600/Source/Game.Server/Game.Server.Packets.Client/GoodsExchangeHandler.cs:42-78.
  // O cliente 4.1 só envia slots (GameSocketOut.as:1907-1920). A receita inteira vem do servidor:
  // aceitar apenas o subconjunto escolhido permitia recompensas grátis e cobrança duplicada do mesmo slot.
  const costs = (ctx.templates.activeConvertItems.get(activeId) ?? []).filter((row) => row.ItemType === 0);
  const awards = ctx.templates.activeConvertAward(activeId);
  const validCount = (n: number) => Number.isSafeInteger(n) && n > 0 && n <= 2_147_483_647;
  if (!costs.length || !awards.length || costs.some((row) => !validCount(row.ItemCount)) ||
      awards.some((row) => !validCount(row.ItemCount) || !ctx.templates.findItem(row.TemplateID))) {
    p.sendMessage(0, "Receita de troca indisponível.");
    return;
  }
  const required = new Map<number, number>();
  for (const row of costs) required.set(row.TemplateID, (required.get(row.TemplateID) ?? 0) + row.ItemCount);
  if (offered.length !== required.size) {
    p.sendMessage(0, "Selecione todos os itens necessários para a troca.");
    return;
  }
  const found: { item: ItemInfo; bagType: number; cost: number }[] = [];
  const seen = new Set<number>();
  for (const o of offered) {
    const bag = p.getInventory(o.bagType);
    const it = bag?.getItemAt(o.place);
    const cost = required.get(o.templateId);
    if ((o.bagType !== BagType.PropBag && o.bagType !== BagType.EquipBag) ||
        (o.bagType === BagType.EquipBag && o.place < 31) || !it || !it.IsExist ||
        it.TemplateID !== o.templateId || !it.isValidItem(now) || !cost || !validCount(cost) ||
        it.Count < cost || seen.has(o.templateId)) {
      p.sendMessage(0, "Itens insuficientes ou inválidos para a troca.");
      return;
    }
    seen.add(o.templateId);
    found.push({ item: it, bagType: o.bagType, cost });
  }
  // Nenhum await entre validar e consumir: a conexão serializa os pacotes do jogador.
  for (const { item, bagType, cost } of found) {
    p.getInventory(bagType)!.removeCountFromStack(item, cost);
  }
  const rewards: Reward[] = awards.map((a) => ({ templateId: a.TemplateID, count: a.ItemCount, isBind: a.IsBind, validDate: a.ValidDate, strengthenLevel: a.LimitValue > 0 ? a.LimitValue : undefined }));
  const g = grantRewards(p, rewards, ctx.templates.findItem, ctx.now());
  if (g.overflow.length) await mailItems(ctx, p, g.overflow, "Troca de Itens", 8);
  p.sendMessage(0, `Troca concluída: ${g.summary.join(", ")}`);
}
