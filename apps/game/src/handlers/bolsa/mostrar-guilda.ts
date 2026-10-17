/**
 * Aba no jogo: Personagem — mostrar/ocultar a tag da guilda sobre a cabeça do personagem.
 * Pacote: 34 USER_RANK.
 * C#: `ChangeDesignationHandler.cs`.
 * Como testar: sem teste dedicado hoje. Manual: ficha do personagem → alternar "mostrar guilda".
 */
import type { HandlerRegistry } from "../registry.js";

export function registerMostrarGuilda(r: HandlerRegistry): void {
  /** ChangeDesignationHandler.cs (34 USER_RANK): show/hide the guild tag over the player's head. */
  r.player(34, "USER_RANK", (_ctx, p, pkt) => {
    p.info.IsShowConsortia = pkt.readBoolean();
  });
}
