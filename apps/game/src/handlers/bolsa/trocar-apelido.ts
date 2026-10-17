/**
 * Aba no jogo: Bolsa — usar o cartão de troca de apelido.
 * Pacote: 171 USE_REWORK_NAME.
 * C#: `UseReworkNameHandler.cs:384` (consome o item cartão, irmão do 11569 de troca de sexo, TemplateID ==
 * CHANGE_NAME_CARD). Rejeita o conjunto de caracteres especiais e apelido já usado por outra conta
 * (`db/characters.ts:renameNick`, checagem de unicidade + update num passo só — igual ao original).
 * Como testar: sem teste dedicado hoje. Manual: usar cartão de troca de nome → novo apelido salvo.
 */
import { renameNick } from "../../db/characters.js";
import type { HandlerRegistry } from "../registry.js";

export function registerTrocarApelido(r: HandlerRegistry): void {
  r.player(171, "USE_REWORK_NAME", async (ctx, p, pkt) => {
    const bagType = pkt.readByte();
    const place = pkt.readInt();
    const newNickname = pkt.readString();
    const card = p.getInventory(bagType)?.getItemAt(place);
    // UseReworkNameHandler.cs:394-399 — checked before the card even exists in the original (would NPE there; a
    // missing card can't happen from the real client UI, so this just orders the guard safely instead).
    const specialCharacters = "%!@#$%^&*()?/>.<,:;'\\|}]{[_~`+=-\"";
    if ([...newNickname].some((c) => specialCharacters.includes(c))) return p.sendMessage(0, ctx.lang.t("UseReworkNameHandler.HasSpecialCharacters"));
    if (!card || card.TemplateID !== 11569 /* EquipType.CHANGE_NAME_CARD */) return;
    const ok = await renameNick(ctx.db.db, p.id, newNickname);
    if (!ok) return p.sendMessage(0, ctx.lang.t("UseReworkNameHandler.Msg"));
    p.getInventory(bagType)!.removeCountFromStack(card, 1);
    p.info.NickName = newNickname;
    await p.saveIntoDatabase(ctx.db.db);
  });
}
