/**
 * Aba no jogo: Bolsa — usar o cartão de troca de nome do clã (só o presidente).
 * Pacote: 188 USE_CONSORTIA_REWORK_NAME.
 * C#: `UseConsortiaReworkNameHandler.cs` (TemplateID == CONSORTIA_CHANGE_NAME_CARD = 11993, EquipType.cs:37).
 * Fora do clã ou item errado: silencioso, igual ao original (nenhum `if` cobre esses casos). Clã inexistente
 * (Msg1), quem manda não é o presidente (Msg2, redundante com a checagem feita pelo client antes de montar o
 * cartão — `BagView.as:1437` já só libera o botão pro `ChairmanName`) e rename recusado pelo
 * `SP_Users_RenameConsortia` (Msg3, `db/consortia.ts:renameConsortia`) seguem a mesma ordem do handler.
 * Como testar: `apps/game/test/consortia.test.ts` (bloco "188 USE_CONSORTIA_REWORK_NAME").
 */
import type { GSPacket } from "@ddt/protocol";
import * as Db from "../../db/consortia.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import type { HandlerRegistry } from "../registry.js";

const CONSORTIA_CHANGE_NAME_CARD = 11993; // EquipType.cs:37 (alias de CONSORTIA_REWORK_NAME, mesmo valor)

export function registerTrocarApelidoGuilda(r: HandlerRegistry): void {
  r.player(188, "USE_CONSORTIA_REWORK_NAME", async (ctx: ServerContext, p: GamePlayer, pkt: GSPacket) => {
    const consortiaId = pkt.readInt();
    const bagType = pkt.readByte();
    const place = pkt.readInt();
    const newNickname = pkt.readString();
    // UseConsortiaReworkNameHandler.cs:19-20 — nada acontece se o jogador não está em clã nenhum.
    if (p.info.ConsortiaID === 0) return;
    const card = p.getInventory(bagType)?.getItemAt(place);
    // :22-24 — item errado também é silencioso (só entra no `if` do TemplateID certo).
    if (!card || card.TemplateID !== CONSORTIA_CHANGE_NAME_CARD) return;
    const guild = await Db.getConsortia(ctx.db.db, consortiaId);
    if (!guild) return p.sendMessage(0, ctx.lang.t("UseConsortiaReworkNameHandler.Msg1"));
    if (guild.ChairmanID !== p.id) return p.sendMessage(0, ctx.lang.t("UseConsortiaReworkNameHandler.Msg2"));
    const ok = await Db.renameConsortia(ctx.db.db, consortiaId, p.info.NickName ?? "", newNickname);
    if (!ok) return p.sendMessage(0, ctx.lang.t("UseConsortiaReworkNameHandler.Msg3"));
    p.getInventory(bagType)!.removeCountFromStack(card, 1);
  });
}
