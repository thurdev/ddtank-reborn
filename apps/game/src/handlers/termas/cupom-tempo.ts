/**
 * Aba no jogo: Termas › comprar mais minutos com Cupom (tela de aviso "seu tempo acabou").
 * Pacotes: 12 HOTSPRING_CMD_B sub 11.
 * C#: `HotSpringRoomTimeAdded.cs`.
 * Como testar: `apps/game/test/hotspring.test.ts`. Manual: Termas → aviso de tempo esgotado → comprar mais.
 */
import { GSPacket, PacketOut } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { hotSpringMgr } from "./mgr.js";

/** 12 HOTSPRING_CMD_B: byte 11 = comprar `SpaPriRoomContinueTime` minutos por `SpaAddictionMoneyNeeded` Cupom. */
export async function hotSpringCmdB(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  if (pkt.readByte() !== 11) return;
  const price = ctx.templates.cfgInt("SpaAddictionMoneyNeeded", 1299);
  if (p.info.Money < price) return p.sendMessage(0, "Seus Cupons não são suficientes.");
  const mins = ctx.templates.cfgInt("SpaPriRoomContinueTime", 30);
  const m = await hotSpringMgr(ctx);
  p.info.Money -= price;
  p.updateProperties();
  m.st(p).min += mins;
  await m.saveExtra(p);
  const pk = new PacketOut(191);
  pk.writeByte(12);
  p.send(pk);
  p.sendMessage(0, `Renovado com sucesso! Foram descontados ${price} Cupons e você ganhou mais ${mins} minuto(s)`);
}
