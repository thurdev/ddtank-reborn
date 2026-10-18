/**
 * Aba no jogo: Casamento › divórcio.
 * Pacotes: 248 DIVORCE_APPLY.
 * C#: `DivorceApplyHandler.cs`.
 * Fix vs o original: cobrava `PRICE_DIVORCED(_DISCOUNT)` duas vezes — `MoneyDirect` já deduz no sucesso,
 * e o handler chamava `RemoveMoney` de novo sem condição. Este port cobra uma única vez.
 * Como testar: `apps/game/test/marriage-farm-auction.test.ts`. Manual: Casamento → menu → Divorciar.
 *
 * NOVO (m2-bolsa): código IDÊNTICO nas duas versões. 4.1 manda 1 bool (`sendUnmarry(isPlayMovie)`); 6600
 * soma +1 bool (`PlayerManager.Instance.merryActivity`) no fim. O 1º campo (o único que lemos, `discount`)
 * fica na mesma posição nas duas — campo novo só sobra, sem fix. Resposta `divorceReplyPacket(ok,
 * discount)` (2 bools) confirmada idêntica contra `ChurchManager.as __divorceApply` dos dois lados.
 */
import { GSPacket } from "@ddt/protocol";
import { player } from "@ddt/db";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { divorceReplyPacket, marryPropPacket, PRICE_DIVORCED, PRICE_DIVORCED_DISCOUNT, setMarried } from "./infra.js";

/** 248 DIVORCE_APPLY: bool discount. */
export async function divorceApply(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const discount = pkt.readBoolean();
  if (!p.info.IsMarried) return;
  if (p.info.HasBagPassword && p.info.IsLocked) return p.sendMessage(0, ctx.lang.t("Bag.Locked"));
  if (p.info.IsCreatedMarryRoom) return p.sendMessage(0, ctx.lang.t("DivorceApplyHandler.Msg2"));
  const price = discount ? PRICE_DIVORCED_DISCOUNT(ctx) : PRICE_DIVORCED(ctx);
  if (p.info.Money + p.info.MoneyLock < price) return p.sendMessage(0, ctx.lang.t("DivorceApplyHandler.Msg1"));
  p.removeMoney(price); // charged once — see module header ("Fixes vs the original")
  const spouseId = p.info.SpouseID;
  await setMarried(ctx, p.id, { IsMarried: false, SpouseID: 0, SpouseName: "", IsGotRing: false, IsCreatedMarryRoom: false, SelfMarryRoomID: 0 });
  if (spouseId) await setMarried(ctx, spouseId, { IsMarried: false, SpouseID: 0, SpouseName: "", IsGotRing: false, IsCreatedMarryRoom: false, SelfMarryRoomID: 0 });
  await ctx.db.db.insert(player.Marry_Apply).values({ UserID: spouseId, ApplyUserID: p.id, ApplyUserName: p.info.NickName ?? "", ApplyType: 3, LoveProclamation: "", ApplyResult: false });
  p.send(divorceReplyPacket(true, true));
  p.send(marryPropPacket(p.info));
  const spouse = ctx.world.get(spouseId);
  if (spouse) { spouse.send(divorceReplyPacket(true, false)); spouse.send(marryPropPacket(spouse.info)); }
  p.sendMessage(0, ctx.lang.t("DivorceApplyHandler.Msg3"));
}
