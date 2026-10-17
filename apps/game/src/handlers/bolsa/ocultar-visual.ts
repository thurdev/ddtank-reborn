/**
 * Aba no jogo: Bolsa/Equipamento — esconder/mostrar uma camada de visual equipada (ex. capa, chapéu).
 * Pacote: 60 ITEM_HIDE (dígito `n` do campo `Hide`: 1 = mostrado, 2 = escondido).
 * C#: `UserHideItemHandler.cs` + `GamePlayer.EquipShowImp`.
 * Como testar: sem teste dedicado hoje. Manual: equipamento → ícone de olho pra esconder uma peça.
 */
import type { HandlerRegistry } from "../registry.js";

export function registerOcultarVisual(r: HandlerRegistry): void {
  /** UserHideItemHandler.cs (60) + GamePlayer.EquipShowImp: digit `slot` of Hide = 1 shown / 2 hidden. */
  r.player(60, "ITEM_HIDE", (_ctx, p, pkt) => {
    const hide = pkt.readBoolean();
    let n = pkt.readInt();
    if (n === 13) n = 3;
    else if (n === 15) n = 4;
    if (n < 0 || n >= 10) return;
    const pow = 10 ** n;
    const cur = Math.trunc(p.info.Hide / pow) % 10;
    p.info.Hide += pow * ((hide ? 2 : 1) - cur);
    p.updateProperties();
  });
}
