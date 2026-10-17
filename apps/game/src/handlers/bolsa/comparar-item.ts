/**
 * Aba no jogo: Chat — comparar item pelo link compartilhado no chat (ícone de item clicável na mensagem).
 * Pacote: 119 LINKREQUEST_GOODS. `num` 4/5 são sub-modos "link" que o original deixa totalmente zerados
 * (sem tabela de stats de usuário migrada pra eles também); o caso padrão é o payload real de comparação.
 * C#: `GetLinkGoodsHandler.cs:695`.
 * Como testar: sem teste dedicado hoje. Manual: clicar num link de item no chat → ver stats completos.
 */
import { loadItemById } from "../../db/items.js";
import { GSPacket } from "@ddt/protocol";
import type { HandlerRegistry } from "../registry.js";

export function registerCompararItem(r: HandlerRegistry): void {
  r.player(119, "LINKREQUEST_GOODS", async (ctx, p, pkt) => {
    const num = pkt.readInt();
    pkt.readString(); // nickname param — read and discarded like the original
    const itemId = pkt.readInt();
    const out = new GSPacket(119, p.id);
    out.writeInt(num);
    if (num === 4) {
      out.writeString(p.info.NickName ?? "");
      for (let i = 0; i < 5; i++) out.writeInt(0);
      return p.send(out);
    }
    if (num === 5) {
      pkt.readString();
      out.writeString(p.info.NickName ?? "");
      for (let i = 0; i < 8; i++) out.writeInt(0);
      return p.send(out);
    }
    const it = await loadItemById(ctx.db.db, itemId, ctx.templates.findItem);
    if (!it) return;
    out.writeString(p.info.NickName ?? "");
    out.writeInt(it.TemplateID); out.writeInt(it.ItemID); out.writeInt(it.StrengthenLevel);
    out.writeInt(it.AttackCompose); out.writeInt(it.AgilityCompose); out.writeInt(it.LuckCompose); out.writeInt(it.DefendCompose);
    out.writeInt(it.ValidDate); out.writeBoolean(it.IsBinds); out.writeBoolean(it.IsJudge); out.writeBoolean(it.IsUsed);
    if (it.IsUsed) out.writeString(it.BeginDate.toISOString());
    out.writeInt(it.Hole1); out.writeInt(it.Hole2); out.writeInt(it.Hole3); out.writeInt(it.Hole4); out.writeInt(it.Hole5); out.writeInt(it.Hole6);
    out.writeString(it.template.Hole ?? ""); out.writeString(it.template.Pic ?? "");
    out.writeInt(it.StrengthenRefineryLevel);
    out.writeDateTime(ctx.now());
    out.writeByte(it.Hole5Level); out.writeInt(it.Hole5Exp); out.writeByte(it.Hole6Level); out.writeInt(it.Hole6Exp);
    p.send(out);
  });
}
