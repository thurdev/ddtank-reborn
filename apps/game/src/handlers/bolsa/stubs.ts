/**
 * Aba no jogo: nenhuma — ações sem comportamento real (no-op explícito).
 * Pacotes: 42 DELETE_GOODS (deletar item: desabilitado também no original), 188 USE_CONSORTIA_REWORK_NAME e
 * 205 USE_CHANGE_COLOR_SHELL (fora do escopo deste porte: ambos têm handler C# de referência real —
 * `UseConsortiaReworkNameHandler.cs`/`UseChangeColorShellHandler.cs` em `vendor/DDTank41` — nunca
 * portados ainda; não é código morto, só pendente).
 * Como testar: não há o que testar (decisão documentada / pendência, não bug).
 */
import type { HandlerRegistry } from "../registry.js";

export function registerStubsBolsa(r: HandlerRegistry): void {
  /** UserDeleteItemHandler.cs (42): delete disabled in the original. */
  r.player(42, "DELETE_GOODS", () => undefined, "stub");

  // Out of this task's scope — left as documented stubs (both have a real [PacketHandler] class in vendor/DDTank41,
  // UseConsortiaReworkNameHandler.cs / UseChangeColorShellHandler.cs, so "dead code" was never accurate; nobody has
  // ported them yet).
  for (const [code, name] of [[188, "USE_CONSORTIA_REWORK_NAME"], [205, "USE_CHANGE_COLOR_SHELL"]] as [number, string][]) {
    r.player(code, name, () => undefined, "stub");
  }
}
