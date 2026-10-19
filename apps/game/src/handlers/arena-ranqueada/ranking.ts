/** 404/3 RINGSTATION_ARMORY (`RingStationArmory.cs`): top-50 ranking list (rank/grade/nickname/fightPower/total). */
import type { GamePlayer } from "../../game/player.js";
import { loadRingStationRanks, loadBasicInfos } from "../../db/ringstation.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";

export async function ringStationArmory(ctx: ServerContext, p: GamePlayer): Promise<void> {
  const ranks = await loadRingStationRanks(ctx.db.db, 50);
  const basics = await loadBasicInfos(ctx.db.db, ranks.map((r) => r.UserID));
  const rows = ranks.map((r) => {
    const b = basics.get(r.UserID);
    return { rank: r.Rank, grade: b?.Grade ?? 0, nickName: b?.NickName ?? "", fightPower: b?.FightPower ?? 0, total: b?.Total ?? 0 };
  });
  p.send(Out.ringStationArmory(p.id, rows));
}
