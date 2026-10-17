/**
 * Aba no jogo: Honra (`HonorUpIcon`) — comprar pontos de Honra com Money (usados em `totem.ts` pra subir de
 * totem).
 * Pacote: 96 HONOR_UP_COUNT.
 * C#: `HonorUpHandler.cs:13-55` em `vendor/DDTank41/Game.Server/Packets/Client`.
 * Como testar: `apps/game/test/progression.test.ts`. Manual: `docs/features/totem.md`.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import * as Out from "../../packets/out.js";
import { bagLocked, tryRemoveMoney } from "./totem.js";

/**
 * 96 HONOR_UP_COUNT (HonorUpHandler.cs:13-55).
 * Como lê esse código (cada variável): `type` sub-comando (1 = no-op no C# original, 2 = comprar honra com
 * Money); `_isBland` segundo byte lido pelo cliente (bool), nunca usado pelo C# original — só consome o
 * byte do pacote; `maxBuyHonor` = contador diário (MaxBuyHonor) + 1, usado como ID em
 * Totem_Honor_Template (1 compra = 1 linha); `temp` = linha encontrada (NeedMoney custo, AddHonor ganho). Se
 * `temp` não existe, o C# original retorna sem mandar pacote nenhum (HonorUpHandler.cs:36: `return 0` antes
 * do `SendUpdateUpCount` do fim da função).
 */
export async function honorUp(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const type = pkt.readByte();
  const _isBland = pkt.readBoolean();
  if (bagLocked(ctx, p)) return;
  if (type === 2) {
    const maxBuyHonor = p.info.MaxBuyHonor + 1;
    const temp = ctx.templates.totemHonor.get(maxBuyHonor);
    if (!temp) return;
    if (tryRemoveMoney(p, temp.NeedMoney)) {
      p.addHonor(temp.AddHonor);
      p.addMaxBuyHonor(1);
    } else {
      p.send(Out.insufficientMoney(p.id, 0));
    }
  }
  p.send(Out.honorUpCount(p.id, p.info.MaxBuyHonor));
}
