/**
 * Aba no jogo: Fazenda › entrar na própria fazenda ou na de um amigo, e saír da visita.
 * Pacotes: 81 FARM sub 1 ENTER_FARM, sub 16 EXIT_FARM.
 * C#: `Farm/Handle/EnterFarm.cs`.
 * Como testar: `apps/game/test/marriage-farm-auction.test.ts`. Manual: Fazenda → clicar no avatar de um
 * amigo pra visitar, ou no próprio pra voltar.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { farmSnapshot, loadFarm, st, stateOf, type FarmState } from "./estado.js";

/** sub 1 ENTER_FARM: int ownerId (0 = você mesmo). */
export async function enterFarm(ctx: ServerContext, p: GamePlayer, pkt: GSPacket, s: FarmState): Promise<void> {
  const ownerId = pkt.readInt();
  if (!ownerId || ownerId === p.id) { s.viewing = null; p.send(farmSnapshot(1, p.id, p.info.NickName ?? "", s.farm.isFarmHelper, [...s.fields.values()])); return; }
  const other = ctx.world.get(ownerId);
  const { farm, fields } = other ? (stateOf(other) ?? (await st(ctx, other))) : await loadFarm(ctx, ownerId, "");
  s.viewing = ownerId;
  p.send(farmSnapshot(1, ownerId, farm.FarmerName ?? other?.info.NickName ?? "", farm.isFarmHelper, [...fields.values()]));
}

/** sub 16 EXIT_FARM: volta a ver a própria fazenda. */
export function exitFarm(_ctx: ServerContext, _p: GamePlayer, _pkt: GSPacket, s: FarmState): void {
  s.viewing = null;
}
