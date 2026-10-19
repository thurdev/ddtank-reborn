/**
 * 404/2 RINGSTATION_BUYCOUNTORTIME (`RingStationBuyBattleCountOrTime.cs`): `timeFlag` buys away the 10-minute
 * challenge cooldown (sets `ChallengeTime` to "now - 1min", instantly satisfying `canChallenge`); otherwise
 * buys one extra challenge for today, capped by `buyCount` (reset daily in `ver-info.ts`).
 *
 * Exploit avoided: the original charges `buyPrice` with `Player.MoneyDirect` BEFORE checking `buyCount > 0`
 * in the "buy extra challenge" branch — a player already at today's purchase cap still gets charged, with
 * nothing granted back ("RingStationBuyBattleCountOrTime.Limit" is shown, money is just gone). Charging the
 * daily cap-limited action here happens AFTER the cap check, so no money leaves the account once the cap is
 * hit; every other quirk of the original is kept (the "money is read with `MoneyLock` first, insufficient
 * funds responds with nothing at all" behavior comes straight from `tryRemoveMoney`/the original's own
 * missing `else` on that path).
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import { ensureOwnRow } from "../../game/ringstation.js";
import { saveRingStationRow } from "../../db/ringstation.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";

/** GamePlayer.MoneyDirect(MoneyType.Money, value): MoneyLock first, then Money; no-op (false) if short. */
function tryRemoveMoney(p: GamePlayer, cost: number): boolean {
  if (p.info.Money + p.info.MoneyLock < cost) return false;
  p.removeMoney(cost);
  return true;
}

export async function ringStationBuy(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const timeFlag = pkt.readBoolean();
  pkt.readBoolean(); // isBand: read by the original, never used (dead parameter)
  const cfg = await ctx.ringStation.getConfig(ctx.db.db);
  let row = await ensureOwnRow(ctx, p);

  if (timeFlag) {
    if (tryRemoveMoney(p, cfg.buyPrice)) {
      row.ChallengeTime = new Date(Date.now() - 60_000);
      await saveRingStationRow(ctx.db.db, row);
      p.sendMessage(0, ctx.lang.t("RingStationBuyBattleCountOrTime.ClearTime"));
      p.send(Out.ringStationBuyTimeResult(p.id, true));
    } else {
      p.send(Out.ringStationBuyTimeResult(p.id, false));
    }
    return;
  }

  if (row.buyCount > 0) {
    if (!tryRemoveMoney(p, cfg.buyPrice)) return; // insufficient funds: silent, matches the original
    row.buyCount--;
    row.ChallengeNum++;
    row = await saveRingStationRow(ctx.db.db, row);
    p.sendMessage(0, ctx.lang.t("RingStationBuyBattleCountOrTime.BuyChallenge"));
  } else {
    p.sendMessage(0, ctx.lang.t("RingStationBuyBattleCountOrTime.Limit"));
  }
  p.send(Out.ringStationBuyCountResult(p.id, row.buyCount, row.ChallengeNum));
}
