/**
 * Aba no jogo: Personagem — títulos (mostrar/trocar o título exibido, e desbloquear título via cartão).
 * Pacotes: 189 USER_CHANGE_RANK (trocar título exibido), 265 NEWTITLE_CARD (desbloquear título por cartão).
 * C#: `ReworkRankHandler.cs`, `NewTitleCardHandler.cs:500`.
 * Como testar: sem teste dedicado hoje. Manual: ficha do personagem → título.
 */
import { loadUserRanks } from "../../db/social.js";
import type { HandlerRegistry } from "../registry.js";

export function registerTitulos(r: HandlerRegistry): void {
  /** ReworkRankHandler.cs (189 USER_CHANGE_RANK): switch the displayed title to one of the player's own, earned
   * (Sys_User_Rank) titles — or clear it when the name doesn't match any. */
  r.player(189, "USER_CHANGE_RANK", async (ctx, p, pkt) => {
    const honor = pkt.readString();
    if (!honor) return;
    const now = ctx.now();
    const ranks = await loadUserRanks(ctx.db.db, p.id);
    const match = ranks.find((rk) => (rk.Name ?? "").includes(honor) && (rk.Validate <= 0 || rk.BeginDate.getTime() + rk.Validate * 86_400_000 > now.getTime()));
    p.info.Honor = match ? honor : "";
    p.info.honorId = 0; // NewTitleID table was never migrated (see HANDLERS.md "Player stats") — honor is matched by Name only
    p.updatePlayerProperties();
  });

  /**
   * NewTitleCardHandler.cs:500 (265 NEWTITLE_CARD): unlock a title from a card. The original resolves the card's
   * ItemTemplate.Property1 through NewTitleMgr's title-definition table — never migrated here (same gap as the
   * NewTitleID column noted at events.ts:491 for 189 USER_CHANGE_RANK), so a title can never be found; this still
   * reads the packet correctly and gives the player the same "not found" feedback the original would for any
   * unrecognised Property1.
   */
  r.player(265, "NEWTITLE_CARD", (ctx, p, pkt) => {
    const bagType = pkt.readByte();
    const place = pkt.readInt();
    const item = p.getInventory(bagType)?.getItemAt(place);
    p.sendMessage(0, ctx.lang.t(item ? "NewTitleCardHandler.TitleNotFound" : "NewTitleCardHandler.ItemNotFound"));
  }, "partial");
}
