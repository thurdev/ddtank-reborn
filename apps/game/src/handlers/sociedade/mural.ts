/**
 * Aba no jogo: Sociedade › mural (manifesto/placar na tela de informações do clã, descrição) e observação
 * interna sobre um membro (texto só o próprio clã vê, tipo apelido).
 * Pacotes: 129 CONSORTIA_CMD sub 14 CONSORTIA_DESCRIPTION_UPDATE, sub 15 CONSORTIA_PLACARD_UPDATE,
 * sub 17 CONSORTIA_USER_REMARK_UPDATE.
 * C#: `ConsortiaDescriptionUpdate.cs`, `ConsortiaPlacardUpdate.cs`, `ConsortiaUserRemark.cs`.
 * Como testar: `apps/game/test/consortia.test.ts`. Manual: Sociedade → Informações → editar descrição/mural;
 * Membros → editar observação de alguém.
 */
import type { GSPacket } from "@ddt/protocol";
import * as Db from "../../db/consortia.js";
import { defaultByteCount } from "../../game/consortia.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { GM_NOTICE, pick, reply } from "./comum.js";

const MSG_DESC = { 2: "ConsortiaBussiness.UpdateConsortiaDescription.Msg2" };
const MSG_PLACARD = { 2: "ConsortiaBussiness.UpdateConsortiaPlacard.Msg2" };
const MSG_REMARK = { 2: "ConsortiaBussiness.UpdateConsortiaUserRemark.Msg2" };

/** Os dois textos (14 descrição / 15 mural) seguem o mesmo formato de resposta — só a coluna no banco muda. */
async function textUpdate(ctx: ServerContext, p: GamePlayer, pkt: GSPacket, sub: number, field: "Description" | "Placard", h: string, map: Record<number, string>): Promise<void> {
  const text = pkt.readString();
  if (defaultByteCount(text) > 300) return p.sendMessage(GM_NOTICE, ctx.lang.t(`${h}.Long`));
  const code = p.info.ConsortiaID ? await Db.setText(ctx.db.db, field, p.info.ConsortiaID, p.id, text) : 2;
  const out = reply(sub);
  out.writeString(text); out.writeBoolean(code === 0); out.writeString(ctx.lang.t(code === 0 ? `${h}.Success` : pick(map, code, `${h}.Failed`)));
  p.send(out);
}

/** 14 CONSORTIA_DESCRIPTION_UPDATE (ConsortiaDescriptionUpdate.cs) — descrição do clã, até 300 bytes. */
export function descriptionUpdate(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  return textUpdate(ctx, p, pkt, 14, "Description", "ConsortiaDescriptionUpdateHandler", MSG_DESC);
}

/** 15 CONSORTIA_PLACARD_UPDATE (ConsortiaPlacardUpdate.cs) — mural/placar do clã, até 300 bytes. */
export function placardUpdate(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  return textUpdate(ctx, p, pkt, 15, "Placard", "ConsortiaPlacardUpdateHandler", MSG_PLACARD);
}

/** 17 CONSORTIA_USER_REMARK_UPDATE (ConsortiaUserRemark.cs) — observação interna sobre um membro, até 100 bytes. */
export async function userRemarkUpdate(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  if (p.info.ConsortiaID === 0) return;
  const id = pkt.readInt();
  const text = pkt.readString();
  if (!text || defaultByteCount(text) > 100) return p.sendMessage(GM_NOTICE, ctx.lang.t("ConsortiaUserRemarkHandler.Long"));
  const code = await Db.setUserRemark(ctx.db.db, id, p.info.ConsortiaID, p.id, text);
  const out = reply(17);
  out.writeInt(id); out.writeString(text); out.writeBoolean(code === 0);
  out.writeString(ctx.lang.t(code === 0 ? "ConsortiaUserRemarkHandler.Success" : pick(MSG_REMARK, code, "ConsortiaUserRemarkHandler.Failed")));
  p.send(out);
}
