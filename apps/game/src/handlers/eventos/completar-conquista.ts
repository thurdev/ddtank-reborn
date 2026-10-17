/**
 * Aba no jogo: "Conquistas" (achievements) — o cliente marca uma conquista como completa (o progresso em si
 * é só contadores — `pushRecords` empurra o 229 sempre que um contador muda, chamado de vários lugares do
 * servidor: forja, batalhas, etc). Concluir uma conquista com recompensa de título grava/atualiza o título
 * no `Sys_User_Rank` do jogador e o equipa na hora.
 * Pacotes: 230 ACHIEVEMENT_FINISH (228/229 são respostas do servidor, não pedidos do cliente).
 * C#: `AchievementFinishHandler.cs`, `PlayerRank.AddAchievementRank` (GameUtils/PlayerRank.cs:195).
 * Como testar: sem teste automatizado dedicado ainda. Manual: `docs/features/eventos.md`.
 */
import { and, eq } from "drizzle-orm";
import { GSPacket } from "@ddt/protocol";
import { player as P } from "@ddt/db";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { canCompleteAchievement, insertAchievementData, updateRecords } from "../../game/events.js";
import * as Out from "../../packets/out.js";
import { eventsRuntime } from "./agendador.js";

/** Pushes changed achievement records (229) after property changes (grade, wins, fight power...). */
export function pushRecords(p: GamePlayer, add?: Map<number, number>): void {
  const ch = updateRecords(p, add);
  if (ch.length) p.send(Out.achievementRecords(229, p.id, ch));
}

/**
 * PlayerRank.AddAchievementRank (GameUtils/PlayerRank.cs:195): persists a title into player."Sys_User_Rank" instead
 * of only announcing it (the original's `NewTitleMgr` title-definition table isn't migrated, so NewTitleID stays 0
 * and the title is identified by its Name, same as the achievement reward text). Permanent (Validate 0, like
 * AddAchievementRank), equipped immediately (IsExit true) and re-sent as the full 34 USER_RANK list.
 */
async function grantTitle(ctx: ServerContext, p: GamePlayer, name: string): Promise<void> {
  const db = ctx.db.db;
  const now = ctx.now();
  const [row] = await db.select().from(P.Sys_User_Rank).where(and(eq(P.Sys_User_Rank.UserID, p.id), eq(P.Sys_User_Rank.Name, name))).limit(1);
  if (row) await db.update(P.Sys_User_Rank).set({ IsExit: true, BeginDate: now, EndDate: now, Validate: 0 }).where(eq(P.Sys_User_Rank.ID, row.ID));
  else await db.insert(P.Sys_User_Rank).values({ UserID: p.id, Name: name, NewTitleID: 0, BeginDate: now, EndDate: now, Validate: 0, IsExit: true });
  const ranks = await db.select().from(P.Sys_User_Rank).where(and(eq(P.Sys_User_Rank.UserID, p.id), eq(P.Sys_User_Rank.IsExit, true)));
  p.send(Out.userRanks(p.id, ranks));
}

/** 230 ACHIEVEMENT_FINISH: the original granted any id the client sent; the port checks CanCompleted against records. */
export async function achievementFinish(ctx: ServerContext, p: GamePlayer, id: number): Promise<boolean> {
  const rt = eventsRuntime(ctx);
  const now = ctx.now();
  updateRecords(p);
  if (!canCompleteAchievement(rt.data, p, id, now)) return false;
  if (!(await insertAchievementData(ctx.db.db, p.id, id, now))) return false;
  const a = rt.data.achievements.get(id)!;
  p.achievements.push({ UserID: p.id, AchievementID: id, IsComplete: true, CompletedDate: now });
  if (a.AchievementPoint) { p.info.AchievementPoint = (p.info.AchievementPoint ?? 0) + a.AchievementPoint; p.updateProperties(); }
  const titles = (rt.data.achGoods.get(id) ?? []).filter((g) => g.RewardType === 1).map((g) => g.RewardPara);
  const out = new GSPacket(230, p.id);
  out.writeInt(id); out.writeInt(now.getUTCFullYear()); out.writeInt(now.getUTCMonth() + 1); out.writeInt(now.getUTCDate());
  p.send(out);
  for (const name of titles) await grantTitle(ctx, p, name);
  if (titles.length) p.sendMessage(0, `Título obtido: ${titles.join(", ")}`);
  return true;
}

export function achievementFinishHandler(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  void achievementFinish(ctx, p, pkt.readInt());
}
