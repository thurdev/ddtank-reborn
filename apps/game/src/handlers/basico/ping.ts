/**
 * Aba no jogo: sem tela própria — ping/relógio e o heartbeat anti-speedhack.
 * Pacotes: 4 PING, 5 SYS_DATE, 300 BAOLTFUNCTION.
 * C#: `PingTimeCallBackHandler.cs` (PingTime = agora - PingStart), `SyncSystemDateHandler.cs`,
 * `baoltfunction.CheckSpeedHack` (Packets/Client/baoltfunction.cs:28).
 * Como testar: `apps/game/test/*` (via login/sessão). Manual: nenhuma tela — roda em segundo plano.
 */
import { GSPacket } from "@ddt/protocol";
import { forbidPlayer } from "../../db/characters.js";
import type { GamePlayer } from "../../game/player.js";
import * as Out from "../../packets/out.js";
import type { ServerContext } from "../../session/context.js";
import { unixSeconds } from "../../util/time.js";

/** 4 PING: PingTimeCallBackHandler — PingTime = agora - PingStart. */
export function ping(_ctx: ServerContext, p: GamePlayer | null | undefined): void {
  if (p) p.pingTime = Date.now() - p.pingStart;
}

/** 5 SYS_DATE: SyncSystemDateHandler — devolve a hora do servidor. */
export function sysDate(ctx: ServerContext, p: GamePlayer): void {
  p.send(Out.dateTime(ctx.now()));
}

/** baoltfunction.CheckSpeedHack (Packets/Client/baoltfunction.cs:28). */
export async function checkSpeedHack(ctx: ServerContext, p: GamePlayer): Promise<void> {
  const cfg = ctx.cfg;
  const now = unixSeconds(ctx.now());
  if (cfg.SPEED_CHECK_ENABLED && now - p.timeCheckHack < cfg.SPEED_CHECK_INTERVAL_MIN * 60 - cfg.SPEED_CHECK_TOLERANCE_SEC) {
    ctx.log.warn(`speed hack detected: ${p.info.UserName}`);
    p.sendMessage(0, `Você foi bloqueado por ${cfg.SPEED_CHECK_BAN_MIN} minuto(s) por usar acelerador de tempo!`);
    await p.saveIntoDatabase(ctx.db.db);
    await forbidPlayer(ctx.db.db, p.id, new Date(ctx.now().getTime() + cfg.SPEED_CHECK_BAN_MIN * 60_000), true, "Hack speed");
    p.sink.disconnect("speed hack");
    return;
  }
  p.timeCheckHack = now;
  const pkt = new GSPacket(300);
  pkt.writeInt(0);
  p.send(pkt);
}

/** 300 speed-hack heartbeat (cliente CheckSpeedManager.as, a cada 5 min). */
export async function baoltfunction(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  if (pkt.readInt() === 0) await checkSpeedHack(ctx, p);
}

/** GamePlayer.SaveIntoDatabase watchdog: sem heartbeat 300 por SPEED_CHECK_MISSING_MIN -> bane (GamePlayer.cs:4491). */
export async function checkMissingHeartbeat(ctx: ServerContext, p: GamePlayer): Promise<boolean> {
  const cfg = ctx.cfg;
  if (!cfg.SPEED_CHECK_ENABLED) return false;
  if (unixSeconds(ctx.now()) - p.timeCheckHack > cfg.SPEED_CHECK_MISSING_MIN * 60 - 10) {
    await forbidPlayer(ctx.db.db, p.id, new Date(ctx.now().getTime() + cfg.SPEED_CHECK_MISSING_BAN_MIN * 60_000), true, "Lách check speed");
    p.sink.disconnect("missing speed heartbeat");
    return true;
  }
  return false;
}
