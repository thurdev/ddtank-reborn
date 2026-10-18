/**
 * Aba no jogo: Bolsa — vender 1 item direto da mochila (`PropBag`) por ouro/cupom-presente, sem abrir a
 * Loja. Pacote: 48 SEll_GOODS (`sendSellGoods`, `ddt/manager/GameSocketOut.as`).
 *
 * C#: NENHUM — confirmado em `vendor/DDTank41/Game.Server` e `vendor/DDT-6600/Source/Game.Server`: não existe
 * `[PacketHandler(ePackageType.SEll_GOODS)]` em lugar nenhum (igual ao achado de `m3-coverage`). E mais: o
 * próprio AS3 `sendSellGoods(position:int)` nunca é CHAMADO por nenhuma view nos dois clientes (grep de
 * `sendSellGoods(` fora de `GameSocketOut.as` é vazio em `DDTank41`/`DDTank4.1`/`SkelletonX-DDTank4.1`/
 * `DDT-6600`) — e o `case ePackageType.SEll_GOODS` do `SocketManager.as` só dispara um evento
 * (`CrazyTankSocketEvent.SELL_GOODS`) que também não tem NENHUM listener em lugar nenhum. É código 100%
 * morto nos dois lados (cliente nunca manda, e se mandasse ninguém leria a resposta) — mesma categoria do
 * "110/111 ITEM_REFINERY" (`refinaria.ts`): sem view viva, o botão de "vender" de verdade na bolsa usa
 * `127 REClAIM_GOODS` (`reciclar.ts`, `SellGoodsBtn.as:79` → `sendSellGoods(...)` de
 * `ddt/manager/SocketManager.as`, nome colidindo por acaso com o `sendSellGoods` de `GameSocketOut.as` —
 * são funções DIFERENTES, a daqui nunca é usada).
 *
 * Formato do pedido: respeitamos o ÚNICO dado que o AS3 morto escreve — `pkg.writeInt(position)`, 1 int só,
 * sem bagType. Por isso o alvo só pode ser um slot da `PropBag` (`BagType.PropBag`, consumíveis/materiais —
 * `templateBagType`, `game/item.ts`): equipamentos vivem sempre na `EquipBag`, que este pacote JAMAIS
 * consegue endereçar (não tem campo pra isso) — "nunca vender equipado" sai de graça da própria forma do
 * pacote, não precisa de guarda extra. Preço: mesma fonte EXATA do original citada pela tarefa —
 * `ItemTemplateInfo.ReclaimValue`/`ReclaimType` (`ItemReclaimHandler.cs:24`, já usada por `reciclar.ts`) —
 * `ReclaimType===3` não é vendável (mesma recusa do original). Como o pacote não tem campo `count`, vende
 * SEMPRE a pilha toda (`item.Count`, sempre >=1 por invariante) — não dá pra mandar um `count` negativo ou
 * maior que a pilha porque esse campo simplesmente não existe no formato; dupe por `count` manipulado fica
 * impossível por construção, não por validação.
 *
 * Validações (pedido explícito da tarefa, nenhuma vem do original porque o original não tem handler):
 *  - `bagLocked()` — mesma trava de senha da bolsa usada por `reciclar.ts`/`comprar.ts`/`usar-prop.ts`.
 *  - `item.cellLocked` — cadeado de slot (`trava-slot.ts`, 4.1 only; sempre `false` no 6600 porque o pacote
 *    313 que o escreve nem existe no enum 6600 — ver `research/6600/packets-m1.md`) recusa a venda, mesmo
 *    padrão de "não deixa gastar por engano" que `aprimorar.ts` já usa pra comida.
 *  - `count`/dupe: nenhum campo de contagem no pedido (ver acima) — nada pra validar, nada pra explorar.
 *
 * Resposta: design próprio (não existe reader de verdade no original pra copiar) — ecoa o pedido:
 * `[int place, bool success, int count, int reclaimType, int price]`.
 * Como testar: `apps/game/test/client-6600-m3-sell-goods.test.ts`.
 */
import { GSPacket } from "@ddt/protocol";
import { BagType } from "../../game/item.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import type { HandlerRegistry } from "../registry.js";
import { bagLocked } from "./senha-da-bolsa.js";

export function registerVenderItem(r: HandlerRegistry): void {
  r.player(48, "SEll_GOODS", (ctx: ServerContext, p: GamePlayer, pkt) => {
    const place = pkt.readInt();
    const out = new GSPacket(48, p.id);
    const bag = p.getInventory(BagType.PropBag);
    const item = bag?.getItemAt(place);
    const fail = (): void => {
      out.writeInt(place); out.writeBoolean(false); out.writeInt(0); out.writeInt(0); out.writeInt(0);
      p.send(out);
    };
    if (!bag || !item) { p.sendMessage(0, ctx.lang.t("SellGoodsHandler.NoSuccess")); return fail(); }
    if (item.cellLocked) { p.sendMessage(0, ctx.lang.t("SellGoodsHandler.Locked")); return fail(); }
    if (bagLocked(ctx, p)) return;
    const t = item.template;
    if (t.ReclaimType === 3) { p.sendMessage(0, ctx.lang.t("SellGoodsHandler.NotSellable")); return fail(); }
    const count = item.Count; // whole stack — the dead client packet has no count field to send
    const price = count * t.ReclaimValue;
    if (!Number.isSafeInteger(price) || price < 0) return fail(); // anti-dupe: ReclaimValue is always >= 0 in real data, but never trust it blindly
    if (t.ReclaimType === 2) {
      p.addGiftToken(price);
      p.sendMessage(0, ctx.lang.t("SellGoodsHandler.Success1", price));
    } else if (t.ReclaimType === 1) {
      p.addGold(price);
      p.sendMessage(0, ctx.lang.t("SellGoodsHandler.Success2", price));
    }
    bag.removeItemAt(place);
    out.writeInt(place); out.writeBoolean(true); out.writeInt(count); out.writeInt(t.ReclaimType); out.writeInt(price);
    p.send(out);
  });
}
