/**
 * Aba no jogo: Bolsa — "desacorrentar" equipamento (tirar da área equipada sem passar pela troca normal).
 * Pacote: 47 UNCHAIN_EQUIP.
 * C#: `UserUnchainItemHandler.cs:8` — não funciona durante uma partida.
 * Como testar: sem teste dedicado hoje. Manual: equipar algo, clicar em "desacorrentar" — vai pra um slot livre.
 */
import type { HandlerRegistry } from "../registry.js";

export function registerDesacorrentarEquipamento(r: HandlerRegistry): void {
  /** UserUnchainItemHandler.cs:8 — not during a game. */
  r.player(47, "UNCHAIN_EQUIP", (_ctx, p, pkt) => {
    if (p.currentRoom?.IsPlaying) return;
    const from = pkt.readInt();
    if (!(from >= 0 && from < 31)) return;
    p.equipBag.moveItem(from, p.equipBag.findFirstEmptySlot(31), 0);
  });
}
