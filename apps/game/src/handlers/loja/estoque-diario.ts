/**
 * Aba no jogo: Loja — contador global de estoque diário comprado hoje (usado pela loja #20, item grátis diário).
 * Pacote: 168 GOODS_COUNT.
 * C#: `GoodsCountHandler.cs` (`WorldMgr.GetAllShopFreeCount`). Desvio documentado (igual HANDLERS.md): o
 * limite diário da loja id 20 é checado por jogador aqui, não como estoque global compartilhado — então
 * não há nada pra reportar e a lista volta sempre vazia.
 * Como testar: sem teste dedicado hoje. Manual: n/a (sempre lista vazia, ver nota acima).
 */
import { GSPacket } from "@ddt/protocol";
import type { HandlerRegistry } from "../registry.js";

export function registerEstoqueDiario(r: HandlerRegistry): void {
  r.player(168, "GOODS_COUNT", (_ctx, p) => {
    const out = new GSPacket(168, p.id);
    out.writeInt(0);
    p.send(out);
  }, "partial");
}
