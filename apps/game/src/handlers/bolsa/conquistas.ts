/**
 * Aba no jogo: Personagem — pontos/lista de conquistas de qualquer jogador (seu ou de outro).
 * Pacote: 203 LOOKUP_EFFORT.
 * C#: `LookupEffortHandler.cs:655`.
 * Como testar: sem teste dedicado hoje. Manual: ver ficha de outro jogador → aba de conquistas.
 */
import { loadPlayerInfo } from "../../db/characters.js";
import { loadAchievementIds } from "../../db/social.js";
import { GSPacket } from "@ddt/protocol";
import type { HandlerRegistry } from "../registry.js";

export function registerConquistas(r: HandlerRegistry): void {
  /** LookupEffortHandler.cs:655 (203 LOOKUP_EFFORT): achievement points + ID list of any user, online or not (self or other). */
  r.player(203, "LOOKUP_EFFORT", async (ctx, p, pkt) => {
    const userId = pkt.readInt();
    const online = ctx.world.get(userId);
    const info = online?.info ?? (userId === p.id ? p.info : await loadPlayerInfo(ctx.db.db, userId));
    const out = new GSPacket(203, userId);
    if (!info) { out.writeInt(0); out.writeInt(0); out.writeInt(0); return p.send(out); } // mirrors the original's 3 zeros
    const ids = online ? online.achievements.map((a) => a.AchievementID) : await loadAchievementIds(ctx.db.db, userId);
    out.writeInt(info.AchievementPoint ?? 0);
    out.writeInt(ids.length);
    for (const id of ids) out.writeInt(id);
    p.send(out);
  });
}
