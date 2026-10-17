/**
 * Aba no jogo: Correio › apagar carta (recusado enquanto ainda tiver anexo preso).
 * Pacotes: 112 DELETE_MAIL.
 * C#: `UserDeleteMailHandler.cs`.
 * Como testar: `apps/game/test/mail.test.ts`. Manual: Correio → apagar uma carta.
 */
import { eq } from "drizzle-orm";
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";
import { ANNEX, getMail, M } from "./comum.js";

export async function deleteMail(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const id = pkt.readInt();
  const out = new GSPacket(112, p.id);
  out.writeInt(id);
  if (p.info.HasBagPassword && p.info.IsLocked) return p.sendMessage(0, ctx.lang.t("Bag.Locked"));
  const m = await getMail(ctx, p.id, id);
  if (!m) out.writeBoolean(false);
  else if (ANNEX.some((k) => Number.parseInt(m[k] ?? "", 10) > 0)) {
    out.writeBoolean(false);
    p.send(Out.mailResponse(p.id, 1));
  } else {
    await ctx.db.db.update(M).set({ IsExist: false, IsDelR: true }).where(eq(M.ID, id));
    p.send(Out.mailResponse(m.SenderID, 1));
    out.writeBoolean(true);
  }
  p.send(out);
}
