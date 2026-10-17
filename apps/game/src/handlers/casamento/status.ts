/**
 * Aba no jogo: sem tela própria — consultas usadas pela tela de Casamento (saber se um jogador é casado,
 * ver há quanto tempo o casal ficou online junto).
 * Pacotes: 246 MARRY_STATUS, 85 MATE_ONLINE_TIME.
 * C#: `MateTimeHandler.cs` (85).
 * Como testar: `apps/game/test/marriage-farm-auction.test.ts`.
 */
import { GSPacket, PacketOut } from "@ddt/protocol";
import { eq } from "drizzle-orm";
import type { GamePlayer } from "../../game/player.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";
import { DETAIL, statusPacket } from "./infra.js";

/** 246 MARRY_STATUS: int userId — devolve se esse jogador é casado. */
export async function marryStatus(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const id = pkt.readInt();
  const online = ctx.world.get(id);
  const married = online ? online.info.IsMarried : !!(await ctx.db.db.select({ IsMarried: DETAIL.IsMarried }).from(DETAIL).where(eq(DETAIL.UserID, id)).limit(1))[0]?.IsMarried;
  p.send(statusPacket(id, !!married));
}

/** 85 MATE_ONLINE_TIME (MateTimeHandler.cs): int userId → último login dele (agora, se a linha não for
 * achada); a UI da capela usa isso pra mostrar "visto por último" de um cônjuge offline. Não é restrito
 * ao cônjuge — o handler original responde pra qualquer userId, online ou não. */
export async function mateOnlineTime(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const id = pkt.readInt();
  const online = ctx.world.get(id);
  const lastDate = online ? online.info.LastDate : (await ctx.db.db.select({ LastDate: DETAIL.LastDate }).from(DETAIL).where(eq(DETAIL.UserID, id)).limit(1))[0]?.LastDate ?? new Date();
  const o = new PacketOut(85);
  Out.wd(o, lastDate);
  p.send(o);
}
