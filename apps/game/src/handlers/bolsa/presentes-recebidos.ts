/**
 * Aba no jogo: Bolsa/Personagem — resgatar/listar presentes recebidos (aniversário, presente de amigo via loja).
 * Pacote: 218 USER_GET_GIFTS. Soma por TemplateID de todo presente já recebido (seu ou de outro jogador).
 * C#: `UserGetGiftHandler.cs` (`PlayerGiftHandler`, também registrado no 218 no original, é um no-op morto
 * que o reflection loader do C# sobrepõe — este porte mantém só o que tem efeito real).
 * Como testar: sem teste dedicado hoje. Manual: receber presente (ver `loja/presentear.ts`) → ver na Bolsa.
 */
import { loadPlayerInfo } from "../../db/characters.js";
import { getAllUserReceivedGifts } from "../../db/social.js";
import { GSPacket } from "@ddt/protocol";
import type { HandlerRegistry } from "../registry.js";

export function registerPresentesRecebidos(r: HandlerRegistry): void {
  /** UserGetGiftHandler.cs (218 USER_GET_GIFTS): list every gift a player (self or anyone else, int userId) has
   * ever received, summed by TemplateID. (PlayerGiftHandler, also registered on 218 in the original, is a dead
   * single-int no-op the C# reflection loader shadows — this port keeps the meaningful one.) */
  r.player(218, "USER_GET_GIFTS", async (ctx, p, pkt) => {
    const userId = pkt.readInt();
    const online = ctx.world.get(userId);
    const info = online?.info ?? (userId === p.id ? p.info : await loadPlayerInfo(ctx.db.db, userId));
    if (!info) return;
    const gifts = await getAllUserReceivedGifts(ctx.db.db, userId);
    const out = new GSPacket(218, p.id);
    out.writeInt(info.ID);
    out.writeInt(info.charmGP ?? 0);
    out.writeInt(gifts.length);
    for (const g of gifts) { out.writeInt(g.TemplateID); out.writeInt(g.Count); }
    p.send(out);
  });
}
