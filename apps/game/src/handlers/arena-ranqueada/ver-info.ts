/**
 * 404/1 RINGSTATION_VIEWINFO (`RingStationViewInfo.cs`): own rank/counts/sign/award info + up to 4 challenge
 * candidates. Caches this player's current base atk/def/weapon into their own row (`ensureOwnRow`, so a later
 * challenger fights an accurate snapshot even if this player is offline by then), then does the original's
 * daily reset — `ChallengeNum`/`buyCount` back to the admin-config defaults the first time this player opens
 * the panel on a new calendar day.
 */
import { sameUtcDay } from "../../util/time.js";
import type { GamePlayer } from "../../game/player.js";
import { ensureOwnRow, pickChallengeList, awardNumByRank } from "../../game/ringstation.js";
import { saveRingStationRow } from "../../db/ringstation.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";

export async function ringStationViewInfo(ctx: ServerContext, p: GamePlayer): Promise<void> {
  const db = ctx.db.db;
  let row = await ensureOwnRow(ctx, p);
  const cfg = await ctx.ringStation.getConfig(db);
  const now = new Date();
  if (!sameUtcDay(row.LastDate, now)) {
    row.LastDate = now;
    row.ChallengeNum = cfg.ChallengeNum;
    row.buyCount = cfg.buyCount;
    row = await saveRingStationRow(db, row);
  }
  const candidates = await pickChallengeList(ctx, p.id, row.Rank);
  p.send(Out.ringStationInfo(p.id, {
    rank: row.Rank, challengeNum: row.ChallengeNum, buyCount: row.buyCount, buyPrice: cfg.buyPrice,
    challengeTime: row.ChallengeTime, cdPrice: cfg.cdPrice, signMsg: row.signMsg || ctx.lang.t("RingStation.signMsg"),
    awardNum: awardNumByRank(cfg, row.Rank), awardTime: cfg.AwardTime, championText: cfg.ChampionText,
  }, candidates.map((c) => ({ info: c.info, weaponId: c.weaponId, rank: c.rank, signMsg: c.signMsg || ctx.lang.t("RingStation.signMsg") }))));
}
