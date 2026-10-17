/**
 * Aba no jogo: ícone do hall "Liga" (Chiến thần / Deus da Guerra — stats fixos de referência + prestígio +
 * ranking semanal) e "Liga de elite" (EliteGame — janela por horário/nota, sala de combate pontuada).
 * A janela em si (quando a Liga/Elite abrem) é decidida pelo agendador (`agendador.ts`, kinds "league"/"elite");
 * este arquivo é o que o cliente lê/manda enquanto a janela está aberta.
 * Pacotes: 132 BATTLEGROUND (sub 3 info/rank/prestígio, sub 5 stats de referência fixos),
 *   162 ELITEGAME (sub 1 status, sub 2 entrar na sala, sub 3 meu rank/pontuação, sub 4 campeões).
 * C#: `BattleGroundHandler.cs`, `EliteGameHandler.cs`.
 * Como testar: sem teste automatizado dedicado ainda. Manual: `docs/features/eventos.md`.
 */
import { sql } from "drizzle-orm";
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { eventsRuntime } from "./agendador.js";

/** 162/1 (resposta de status) — compartilhado com o agendador (broadcast quando a janela elite abre/fecha). */
export function eliteStatusPkt(status: number): GSPacket {
  const p = new GSPacket(162);
  p.writeByte(1);
  p.writeInt(status);
  return p;
}

// ------------------------------------------------------------------ 132 BATTLEGROUND (liga / Chiến thần)
/** PlayerBattle's reference stats are hard-coded constants in the original too (not derived from the player). */
const BATTLE_REF = { Agility: 1600, Attack: 1700, Blood: 25000, Damage: 1000, Defend: 1500, Energy: 293, Guard: 500, Lucky: 1500 };
const FAIR_BATTLE_DAY_PRESTIGE = 2000;

async function leagueRank(ctx: ServerContext, userId: number): Promise<number> {
  const res = (await ctx.db.db.execute(sql`
    SELECT rnk FROM (SELECT "UserID", RANK() OVER (ORDER BY "weeklyScore" DESC) rnk FROM player."Sys_User_Match_Info") x WHERE "UserID" = ${userId}`)) as unknown;
  const rows = (Array.isArray(res) ? res : ((res as { rows?: unknown[] }).rows ?? [])) as { rnk: number }[];
  return rows[0]?.rnk ?? 0;
}

export async function battleGroundHandler(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const b = pkt.readByte();
  const out = new GSPacket(132, p.id);
  if (b === 3) {
    const b2 = pkt.readByte();
    out.writeByte(3); out.writeBoolean(true); out.writeByte(b2);
    if (b2 === 2) out.writeInt(await leagueRank(ctx, p.id));
    else if (b2 === 1) { out.writeInt(p.match.addDayPrestge ?? 0); out.writeInt(p.match.totalPrestige ?? 0); out.writeInt(FAIR_BATTLE_DAY_PRESTIGE); }
    p.send(out);
  } else if (b === 5) {
    out.writeByte(5);
    out.writeInt(BATTLE_REF.Attack); out.writeInt(BATTLE_REF.Defend); out.writeInt(BATTLE_REF.Agility); out.writeInt(BATTLE_REF.Lucky);
    out.writeInt(BATTLE_REF.Damage); out.writeInt(BATTLE_REF.Guard); out.writeInt(BATTLE_REF.Blood); out.writeInt(BATTLE_REF.Energy);
    p.send(out);
  }
}

// ------------------------------------------------------------------ 162 ELITEGAME
/** EliteGameHandler: 1 status, 2 start room (status 5 and grade >= 30), 3 my rank/score, 4 champions (none kept). */
export function eliteGameHandler(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  const rt = eventsRuntime(ctx);
  const sub = pkt.readByte();
  const out = new GSPacket(162);
  if (sub === 1) { out.writeByte(1); out.writeInt(rt.eliteStatus); }
  else if (sub === 2) { if (!(ctx.cfg.ALL_OPEN || (rt.eliteStatus === 5 && p.info.Grade >= 30))) return; out.writeByte(2); }
  else if (sub === 3) { out.writeByte(3); out.writeInt(p.match.eliteRank ?? 0); out.writeInt(p.match.eliteScore ?? p.info.EliteScore ?? 0); }
  else if (sub === 4) { const gt = pkt.readInt(); out.writeByte(4); out.writeInt(gt); out.writeInt(0); }
  else return;
  p.send(out);
}
