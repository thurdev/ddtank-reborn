/**
 * 404/6 RINGSTATION_FIGHTFLAG and 404/7 RINGSTATION_SENDSIGNMSG. Both are tiny in the original:
 * `RingStationFightFlag.cs` writes a hardcoded `0`/`now` with no real state behind it (no server-side
 * "fight flag" was ever wired up — ported byte-for-byte, nothing to improve on); `RingStationSignMsg.cs`
 * just overwrites this player's own banner text shown to challengers (`ensureOwnRow` so a brand-new player
 * signing before ever opening the panel still gets a row to write into).
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import { ensureOwnRow } from "../../game/ringstation.js";
import { saveRingStationRow } from "../../db/ringstation.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";

export function ringStationFightFlag(_ctx: ServerContext, p: GamePlayer): void {
  p.send(Out.ringStationFightFlag(p.id));
}

export async function ringStationSignMsg(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const signMsg = pkt.readString();
  const row = await ensureOwnRow(ctx, p);
  row.signMsg = signMsg;
  await saveRingStationRow(ctx.db.db, row);
}
