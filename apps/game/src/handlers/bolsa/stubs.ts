/**
 * Aba no jogo: nenhuma — ações sem comportamento real (no-op explícito).
 * Pacotes: 42 DELETE_GOODS (deletar item: desabilitado também no original) e 205 USE_CHANGE_COLOR_SHELL.
 *
 * Correção (41-stubs-rates): a nota antiga dizia que 205 tinha um `UseChangeColorShellHandler.cs` de
 * referência real — isso está errado, não existe esse arquivo nem qualquer `[PacketHandler(205, ...)]` /
 * `[PacketHandler((byte)ePackageType.USE_CHANGE_COLOR_SHELL, ...)]` em `vendor/DDTank41` (confirmado por
 * grep em todo `Game.Server/Packets/Client/*.cs`; só a entrada no enum, `ePackageType.cs:185`). O cliente
 * manda de verdade — `BagView.as:1467` (`CategoryID == 11 && Property1 == "37"`, arma no slot 6 com
 * `StrengthenLevel >= 10`), `sendUseChangeColorShell(bagType, place)` = byte+int — mas o servidor original
 * nunca respondia: pacote morto do lado servidor, igual a 214 USER_RELOAD_GIFT/224 CID_CHECK, não pendência.
 * Noop fiel (lê byte+int, não responde) é o comportamento real; "implemented", não "stub".
 * 188 USE_CONSORTIA_REWORK_NAME foi portado — ver `trocar-apelido-guilda.ts`.
 * Como testar: não há o que testar pros dois acima (decisão documentada, não bug).
 */
import type { HandlerRegistry } from "../registry.js";

export function registerStubsBolsa(r: HandlerRegistry): void {
  /** UserDeleteItemHandler.cs (42): delete disabled in the original. */
  r.player(42, "DELETE_GOODS", () => undefined, "stub");

  /** 205 USE_CHANGE_COLOR_SHELL: fio morto do lado servidor (ver comentário acima) — byte bagType, int place. */
  r.player(205, "USE_CHANGE_COLOR_SHELL", (_ctx, _p, pkt) => {
    pkt.readByte();
    pkt.readInt();
  });
}
