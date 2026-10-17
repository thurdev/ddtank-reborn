/**
 * Aba no jogo: Correio › marcar carta como lida (abrir a carta na lista).
 * Pacotes: 114 UPDATE_MAIL.
 * C#: `UserUpdateMailHandler.cs` (marca lida; cartas com `Type < 100` ganham `ValidDate` 72h a partir daqui).
 * Como testar: `apps/game/test/mail.test.ts`. Manual: Correio → abrir uma carta não lida.
 */
import { eq } from "drizzle-orm";
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { getMail, M } from "./comum.js";

export async function updateMail(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const id = pkt.readInt();
  const m = await getMail(ctx, p.id, id);
  const out = new GSPacket(114, p.id);
  if (m && !m.IsRead) {
    await ctx.db.db.update(M).set(m.Type < 100 ? { IsRead: true, ValidDate: 72, SendTime: new Date() } : { IsRead: true }).where(eq(M.ID, id));
    out.writeBoolean(true);
  } else out.writeBoolean(false);
  p.send(out);
}
