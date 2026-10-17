/**
 * Aba no jogo: Loja — "presentear via vitrine de amigo" (botão que existe no cliente, mas o recurso já
 * estava desabilitado no original).
 * Pacote: 57 GOODS_PRESENT.
 * C#: `UserPresentGoodsHandler.cs:209` — o original JÁ desabilitou esse recurso (o código embaixo da
 * checagem nunca roda); este handler só drena o pacote e avisa o jogador pra contatar um admin.
 * Como testar: sem teste dedicado hoje (não há comportamento a testar, é um aviso fixo).
 */
import type { HandlerRegistry } from "../registry.js";

export function registerPresentearVitrine(r: HandlerRegistry): void {
  /** UserPresentGoodsHandler.cs:209 (57 GOODS_PRESENT): the original ALREADY disabled this feature (dead code
   * under it never runs) — just drains the packet and tells the player to contact an admin. */
  r.player(57, "GOODS_PRESENT", (ctx, p, pkt) => {
    pkt.readString();
    pkt.readString();
    pkt.readInt();
    p.sendMessage(0, ctx.lang.t("UserPresentGoodsHandler.Disabled"));
  });
}
