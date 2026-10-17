/**
 * Aba no jogo: Sociedade › carta pra todo o clã (manda uma carta pra cada membro, pagando com Riqueza).
 * Pacotes: 129 CONSORTIA_CMD sub 29 CONSORTION_MAIL.
 * C#: `ConsortiaMail.cs`.
 * Como testar: `apps/game/test/consortia.test.ts`. Manual: Sociedade → Correio do clã → escrever carta.
 */
import type { GSPacket } from "@ddt/protocol";
import * as Db from "../../db/consortia.js";
import { MAIL_RICHES, Right, hasRight } from "../../game/consortia.js";
import { consortiaMgr } from "../../game/consortia-mgr.js";
import { sendMail } from "../../db/social.js";
import type { GamePlayer } from "../../game/player.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";
import { reply } from "./comum.js";

/**
 * 29 CONSORTION_MAIL (ConsortiaMail.cs) — cobra primeiro (`SP_ConsortiaRiches_Update` exige o direito
 * `Enounce`, por isso o desconto vem antes de mandar as cartas; o original mandava as cartas e só depois
 * cobrava). Se não tiver ninguém pra mandar (clã com 1 membro), devolve a Riqueza gasta.
 */
export async function guildMail(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  if (p.info.ConsortiaID === 0) return;
  const m = await consortiaMgr(ctx);
  const title = pkt.readString();
  const content = pkt.readString();
  const cid = p.info.ConsortiaID;
  const c = await Db.getConsortia(ctx.db.db, cid);
  if (!c) return;
  if (c.Riches < MAIL_RICHES) return p.sendMessage(0, m.t("ConsortiaBussiness.Riches.Msg3", "Riqueza do Clã insuficiente."));
  let ok = hasRight(p.info.Right, Right.Enounce) && (await Db.spendRiches(ctx.db.db, cid, p.id, MAIL_RICHES)) === 0;
  if (ok) {
    ok = false;
    for (const mem of await Db.listMembers(ctx.db.db, cid)) {
      if (mem.UserID === p.id) continue;
      await sendMail(ctx.db.db, { SenderID: p.id, Sender: `Clã ${c.ConsortiaName}`, ReceiverID: mem.UserID, Receiver: mem.UserName, Title: title, Content: content, Type: 59, Gold: 0, Money: 0 });
      ok = true;
      ctx.world.get(mem.UserID)?.send(Out.mailResponse(mem.UserID, 1));
    }
    if (!ok) await Db.addRiches(ctx.db.db, cid, MAIL_RICHES, 0, "", () => ""); // ninguém pra mandar: devolve
    p.send(Out.mailResponse(p.id, 2));
    await m.refreshRiches(cid);
  }
  const out = reply(29);
  out.writeBoolean(ok);
  p.send(out);
}
