/** 404/4 RINGSTATION_NEWBATTLEFIELD (`RingStationBattleField.cs`): last 10 fight-log entries for this player. */
import type { GamePlayer } from "../../game/player.js";
import { loadBattleField } from "../../db/ringstation.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";

export async function ringStationBattleFieldLog(ctx: ServerContext, p: GamePlayer): Promise<void> {
  const rows = await loadBattleField(ctx.db.db, p.id, 10);
  p.send(Out.ringStationBattleField(p.id, rows.map((r) => ({ dareFlag: r.DareFlag, userName: r.UserName, successFlag: r.SuccessFlag, level: r.Level }))));
}
