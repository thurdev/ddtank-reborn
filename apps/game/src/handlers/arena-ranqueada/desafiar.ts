/**
 * 404/5 RINGSTATION_CHALLENGE (`RingStationChallenge.cs`): challenge a real player's stats SNAPSHOT or the
 * baseline practice bot into a real 1v1 fight (`rooms/room-mgr.ts createRingStationBattle` -> `FightEngine.
 * startPvp`). Rank swap on win / the League Money reward / the battle-field log entry all happen later, from
 * the fight's own game-over hook (`game/ringstation.ts onFightOver`, wired in `server.ts`) — never decided
 * here from a client-reported result.
 *
 * Exploit avoided: see `game/ringstation.ts` file banner (`ctx.ringStation.hasPending`) — rejects a second
 * challenge from the same player while one is still resolving, so `ChallengeNum`/the League Money reward
 * can't be farmed by firing this packet faster than fights resolve.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import { canChallenge, ensureOwnRow, resolveChallengeTarget } from "../../game/ringstation.js";
import type { ServerContext } from "../../session/context.js";

export async function ringStationChallenge(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const targetUserId = pkt.readInt();
  const rank = pkt.readInt();

  if (ctx.ringStation.hasPending(p.id)) {
    p.sendMessage(1, "Você já tem um desafio da Arena em andamento.");
    return;
  }

  const row = await ensureOwnRow(ctx, p);
  if (!canChallenge(row)) {
    p.sendMessage(1, ctx.lang.t("RingStationFightFlag.CdFail"));
    return;
  }
  if (row.ChallengeNum <= 0) {
    p.sendMessage(1, ctx.lang.t("RingStationChallenge.Fail"));
    return;
  }

  const { bot, row: defenderRow } = await resolveChallengeTarget(ctx, targetUserId, rank);
  if (defenderRow && ctx.ringStation.isLocked(defenderRow.UserID)) {
    p.sendMessage(1, ctx.lang.t("RingStationChallenge.OnFight", bot.info.NickName ?? ""));
    return;
  }

  const now = new Date();
  ctx.ringStation.setPending(p.id, {
    dare: { userId: p.id, userName: bot.info.NickName ?? "", levelBefore: row.Rank, battleTime: now },
    success: defenderRow ? { userId: defenderRow.UserID, userName: p.info.NickName ?? "", levelBefore: defenderRow.Rank, battleTime: now } : null,
  });
  if (defenderRow) ctx.ringStation.lock(defenderRow.UserID);

  ctx.rooms.createRingStationBattle(p, bot, () => {
    // Server at max room capacity (CreateRoomAction.MaxRoom): undo the guards above, nothing was spent.
    ctx.ringStation.takePending(p.id);
    if (defenderRow) ctx.ringStation.unlock(defenderRow.UserID);
  });
}
