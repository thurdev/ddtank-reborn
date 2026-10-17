/**
 * Aba no jogo: Bolsa — usar o "cartão de troca de sexo" (item 11569) no personagem.
 * Pacote: 252 USE_CHANGE_SEX (mesmo código de pacote de MARRY_ROOM_STATE; ChangeSexHandler vence no
 * original — ver `research/qa/claude-requests.md` / spec 01-packet-handlers.md:125).
 * C#: `ChangeSexHandler.cs:12`.
 * Como testar: sem teste dedicado hoje. Manual: usar o cartão → sexo muda, casamento hétero-only desfaz,
 * equipamento com restrição de sexo é desequipado.
 */
import type { HandlerRegistry } from "../registry.js";

export function registerTrocarSexo(r: HandlerRegistry): void {
  /**
   * ChangeSexHandler.cs:12 — item 11569 ("Thẻ đổi giới tính"/sex-change card). Same packet code as
   * MARRY_ROOM_STATE (252); ChangeSexHandler wins in the original (spec 01-packet-handlers.md:125).
   */
  r.player(252, "USE_CHANGE_SEX", async (ctx, p, pkt) => {
    const bagType = pkt.readByte();
    const slot = pkt.readInt();
    const inv = p.getInventory(bagType);
    const item = inv?.getItemAt(slot);
    if (!inv || !item || item.TemplateID !== 11569) return;
    // Best-effort divorce: a same-sex marriage becomes invalid once Sex flips (ChangeSexHandler.cs:22-42).
    if (p.info.SpouseID > 0) {
      p.info.IsMarried = false;
      p.info.SpouseID = 0;
      p.info.MarryInfoID = 0;
    }
    const newSex = !p.info.Sex;
    p.info.Sex = newSex;
    // Unequip now-invalid gender-locked gear (NeedSex) instead of leaving it illegally equipped.
    for (let s = 0; s < 31; s++) {
      const eq = p.equipBag.getItemAt(s);
      if (eq && !p.canEquip(eq.template)) p.equipBag.moveItem(s, p.equipBag.findFirstEmptySlot(31), 0);
    }
    inv.removeCountFromStack(item, 1);
    p.updatePlayerProperties();
    p.sendMessage(0, ctx.lang.t("ChangeSexHandlerHandler.Success"));
    // Varredura pt.2: save immediately (like quest claim / mail attachment) — Sex, divorce and the item
    // consumption otherwise sit unpersisted until the 10-minute autosave tick.
    await p.saveIntoDatabase(ctx.db.db);
  });
}
