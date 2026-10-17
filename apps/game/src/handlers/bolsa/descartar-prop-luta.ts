/**
 * Aba no jogo: dentro da luta — descartar um prop da mochila de combate (FightBag).
 * Pacote: 75 PROP_DELETE.
 * C#: `PropDeleteHandler.cs`.
 * Como testar: sem teste dedicado hoje. Manual: durante a luta, descartar uma granada/mina da mochila.
 */
import type { HandlerRegistry } from "../registry.js";

export function registerDescartarPropLuta(r: HandlerRegistry): void {
  /** PropDeleteHandler.cs (75 PROP_DELETE): discard a prop from the in-fight hand (FightBag). */
  r.player(75, "PROP_DELETE", (_ctx, p, pkt) => {
    p.fightBag.removeItemAt(pkt.readInt());
  });
}
