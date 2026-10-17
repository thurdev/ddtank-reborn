/**
 * Aba no jogo: Roleta do canhão esquerdo ("left gun") — gira uma vez e, se der prêmio, avisa o servidor
 * todo. Fica em `loja/` (sem tela de loja de verdade) por ser o par mais próximo de um sorteio pago que
 * existia em `items.ts` antes deste porte; não tem sala própria em `bolsa/` nem `loja/`.
 * Pacotes: 130 LEFT_GUN_COMPLETE (anúncio público do prêmio), 128 LEFT_GUN_ROULETTE_SOCKET (girar).
 * C#: `LeftGunCompleteHandler.cs:837`, `LeftGunHandler.cs:837`.
 * Como testar: sem teste automatizado dedicado hoje. Manual: n/a (recurso restante do 4.1 original).
 */
import { sql } from "drizzle-orm";
import type { HandlerRegistry } from "../registry.js";
import { GSPacket } from "@ddt/protocol";

export function registerRoletaCanhao(r: HandlerRegistry): void {
  /** LeftGunCompleteHandler.cs:837 (130 LEFT_GUN_COMPLETE): if the "left gun" roulette extra (Sys_Users_Extra.LeftRoutteRate)
   * is set, broadcast a system tip naming the player and the rate as a percentage. No packet fields to read. */
  r.player(130, "LEFT_GUN_COMPLETE", (ctx, p) => {
    const rate = p.extra?.LeftRoutteRate ?? 0;
    if (rate <= 0) return;
    const pct = Math.trunc(rate * 100);
    for (const o of ctx.world.all()) o.sendMessage(0, ctx.lang.t("GameServer.LeftRotter.Notice.Msg", p.info.NickName ?? "", pct));
  });

  /**
   * LeftGunHandler.cs:837 (128 LEFT_GUN_ROULETTE_SOCKET): spin the same "left gun" roulette once (`cmd` is always
   * 1 — the only case in the original's switch). Rolls a rate out of 5 weighted bands (rand(55) < 15/25/35/45/55)
   * from the GameProperties.LeftRouterRateData config (`gold|silver|...` 5 floats), decrements LeftRoutteCount,
   * persists both via a raw upsert (same shape as hotspring.ts's saveExtra — Sys_Users_Extra has no `db/*.ts`
   * helper of its own yet), and replies with 163 (AbstractPacketLib.SendLeftRouleteResult).
   */
  r.player(128, "LEFT_GUN_ROULETTE_SOCKET", async (ctx, p, pkt) => {
    const cmd = pkt.readInt();
    if (cmd !== 1) return;
    const rates = String(ctx.templates.serverConfig.get("LeftRouterRateData") ?? "0.0003|0.0002|0.0001|0.001|0.002|").split("|").map(Number);
    const roll = Math.floor(Math.random() * 55);
    const idx = roll < 15 ? 0 : roll < 25 ? 1 : roll < 35 ? 2 : roll < 45 ? 3 : 4;
    const result = rates[idx] || 0;
    if (result > 0) {
      const count = (p.extra?.LeftRoutteCount ?? 0) - 1;
      await ctx.db.db.execute(sql`INSERT INTO player."Sys_Users_Extra" ("UserID", "LeftRoutteCount", "LeftRoutteRate") VALUES (${p.id}, ${count}, ${result})
        ON CONFLICT ("UserID") DO UPDATE SET "LeftRoutteCount" = EXCLUDED."LeftRoutteCount", "LeftRoutteRate" = EXCLUDED."LeftRoutteRate"`);
      if (p.extra) { p.extra.LeftRoutteCount = count; p.extra.LeftRoutteRate = result; }
    }
    const out = new GSPacket(163, p.id);
    out.writeInt(result > 0 ? 0 : p.extra?.LeftRoutteCount ?? 0);
    out.writeString(result.toFixed(1)); // original formats "{0:N1}" — every configured rate is < 0.01, so this is always "0.0", kept as-is
    p.send(out);
  }, "partial");
}
