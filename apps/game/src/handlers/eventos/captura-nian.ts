/**
 * Aba no jogo: "Capturar Nian" (`catchbeast.swf`, m4-catchbeast) — sub-códigos 32-36 de `145 ACTIVITY_SYSTEM`
 * (`CatchBeastPackageType`), despachados por `caminho-da-luz.ts activitySystemRouter` (que já é o ÚNICO ponto
 * de registro do pacote 145). Lógica/persistência real em `game/catchbeast.ts` — ver o cabeçalho desse
 * arquivo pra toda a citação C#, o exploit evitado (claim-once no GETAWARD) e o gap documentado (BuyBuff sem
 * efeito, mesma categoria do Boss Mundial).
 * Como testar: `apps/game/test/client-6600-m4-catchbeast.test.ts`.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import * as Out from "../../packets/out.js";
import { mailItems } from "../bolsa/correio-excedente.js";
import { grantRewards } from "../../game/events.js";
import {
  TIER_COUNT, boxStates, buffMoney, getOrCreate, persist, rewardsFor, tiersFor,
} from "../../game/catchbeast.js";

/** 145/33 CATCHBEAST_VIEWINFO (`CatchbeastViewInfo.cs:12-31`): equivalente a `PlayerActives.
 *  YearMonterValidate()` (sempre `true`, mas reseta diário) seguido do snapshot. */
async function viewInfo(ctx: ServerContext, p: GamePlayer): Promise<void> {
  const row = await getOrCreate(ctx, p);
  const tiers = tiersFor(ctx);
  const states = boxStates(row, tiers);
  const view = tiers.map((t, i) => ({ templateId: t.templateId, damageNeeded: t.damageNeeded, state: states[i]! }));
  p.send(Out.catchBeastViewInfo(row.ChallengeNum, row.BuyBuffNum, buffMoney(ctx), row.DamageNum, view));
}

/** 145/34 CATCHBEAST_CHALLENGE (`CatchbeastChallenge.cs:11-25`): exige arma equipada, consome 1 `ChallengeNum`
 *  e abre a luta PvE real (`RoomMgr.createCatchBeastRoom`). Sem pacote de resposta no original (o
 *  `GSPacketIn` local era criado mas NUNCA enviado — dead code — a sala/luta responde por conta própria via
 *  `Out.roomCreate`). */
async function challenge(ctx: ServerContext, p: GamePlayer): Promise<void> {
  if (!p.hasMainWeapon) return p.sendMessage(1, ctx.lang.t("Game.Server.SceneGames.NoEquip"));
  const row = await getOrCreate(ctx, p);
  if (row.ChallengeNum <= 0) return;
  await persist(ctx, p, { ...row, ChallengeNum: row.ChallengeNum - 1 });
  ctx.rooms.createCatchBeastRoom(p);
}

/** 145/35 CATCHBEAST_BUYBUFF (`CatchbeastBuybuff.cs:11-29`): `packet.ReadBoolean()` é lido e descartado (o
 *  original sempre cobra `Money` sem bind, nunca olha esse flag). Cobra ANTES de conceder (ordem já segura no
 *  original) — `BuyBuffNum` só decrementa display, nunca bloqueia a compra (ver `game/catchbeast.ts`). */
async function buyBuff(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  pkt.readBoolean(); // isBind do cliente — lido e descartado, igual ao original
  const price = buffMoney(ctx);
  if (p.info.Money < price) return p.sendMessage(0, ctx.lang.t("UserBuyItemHandler.NoMoney"));
  p.info.Money -= price;
  p.updateProperties();
  const row = await getOrCreate(ctx, p);
  const newBuyBuffNum = Math.max(0, row.BuyBuffNum - 1);
  await persist(ctx, p, { ...row, BuyBuffNum: newBuyBuffNum });
  p.send(Out.catchBeastBuyBuffAck(newBuyBuffNum));
  p.sendMessage(0, ctx.lang.t("ActiveSystemHandler.Msg2"));
}

/**
 * 145/36 CATCHBEAST_GETAWARD (`CatchbeastGetAward.cs:14-51`): tier (0-4). **Exploit evitado**: o original só
 * confere `DamageNum >= threshold` (`method_0`), nunca se o tier já tem estado "3" (claimed) — um cliente que
 * manda o mesmo índice de novo ganhava a recompensa de novo (sem bind check, sem claim-once). Aqui, `state`
 * precisa ser exatamente 2 (claimable, nunca já reclamado) antes de conceder.
 */
async function getAward(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const tier = pkt.readInt();
  if (tier < 0 || tier >= TIER_COUNT) return;
  const row = await getOrCreate(ctx, p);
  const tiers = tiersFor(ctx);
  const states = boxStates(row, tiers);
  if (states[tier] !== 2) return p.send(Out.catchBeastGetAwardAck(false, tier));
  states[tier] = 3;
  await persist(ctx, p, { ...row, BoxState: states.join("-") });
  p.send(Out.catchBeastGetAwardAck(true, tier));
  const rewards = rewardsFor(ctx, tier);
  const g = grantRewards(p, rewards.map((r) => ({ templateId: r.templateId, count: r.count, validDate: r.validDate, isBind: r.isBind })), ctx.templates.findItem, ctx.now());
  if (g.overflow.length) await mailItems(ctx, p, g.overflow, "Capturar Nian", 8);
  if (g.summary.length) p.sendMessage(0, `Capturar Nian: recompensa ${tier + 1} recebida — ${g.summary.join(", ")}.`);
}

/** Roteador das sub-ações 32-36, chamado por `caminho-da-luz.ts activitySystemRouter`. 32 BEGIN é só
 *  srv->clt (sem handler, igual ao original — nenhum `[Attribute0(32)]` existe). */
export async function catchBeastRouter(ctx: ServerContext, p: GamePlayer, sub: number, pkt: GSPacket): Promise<void> {
  if (sub === 33) return viewInfo(ctx, p);
  if (sub === 34) return challenge(ctx, p);
  if (sub === 35) return buyBuff(ctx, p, pkt);
  if (sub === 36) return getAward(ctx, p, pkt);
}
