/**
 * Aba no jogo: Correio › cancelar pagamento pendente (devolve uma carta COD pro remetente, com os itens e tudo).
 * Pacotes: 118 MAIL_CANCEL.
 * C#: `MailPaymentCancelHandler.cs`.
 * Como testar: `apps/game/test/mail.test.ts`. Manual: Correio → carta COD enviada → Cancelar.
 */
import { eq } from "drizzle-orm";
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";
import { getMail, M } from "./comum.js";

export async function mailCancel(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const id = pkt.readInt();
  const db = ctx.db.db;
  const m = await getMail(ctx, p.id, id);
  const out = new GSPacket(118, p.id);
  out.writeInt(id);
  if (m && m.Type > 100 && m.Money > 0) {
    await db.update(M).set({ ReceiverID: m.SenderID, Receiver: m.Sender, SenderID: p.id, Sender: p.info.NickName, Type: 1, Money: 0, IsRead: false, SendTime: new Date(), ValidDate: 72 }).where(eq(M.ID, id));
    ctx.world.get(m.SenderID)?.send(Out.mailResponse(m.SenderID, 1));
    p.send(Out.mailResponse(p.id, 1));
    out.writeBoolean(true);
  } else out.writeBoolean(false);
  p.send(out);
}
