/**
 * Erros dentro de callbacks disparados pelo "player" (mouse, enterFrame,
 * timer, rede) não podem derrubar o loop do jogo — o Flash mostra e segue.
 * Aqui é o mesmo: loga no console (com origem) e continua.
 */
import { dlog } from "./debug";

export function safe<T>(fn: () => T, where: string): T | undefined {
  try {
    return fn();
  } catch (e) {
    console.error(`[flash] erro em ${where}:`, e);
    dlog("error", `erro em ${where}: ${(e as Error)?.message ?? e}`, e);
    return undefined;
  }
}
