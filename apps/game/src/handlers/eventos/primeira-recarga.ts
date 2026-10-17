/**
 * Aba no jogo: "Primeira recarga" (VIP) — presente único de boas-vindas. Este port não processa pagamentos
 * reais, então o presente é liberado de graça (uma vez só por conta), controlado pela env
 * `FIRST_RECHARGE_FREE` (default "true"); com ela em "false" cai de volta na regra original
 * (`p.info.IsRecharged`, que exigiria uma recarga real ainda não portada).
 * Pacotes: 259 FIRSTRECHARGE.
 * C#: `FirstRechargeGetAward.cs`.
 * Como testar: sem teste automatizado dedicado ainda. Manual: `docs/features/vip.md`.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { eventsRuntime, give, throttled } from "./agendador.js";
import * as Out from "../../packets/out.js";
import { claimOnce } from "../../game/events.js";

/** 259 FIRSTRECHARGE: no real payments here, so the gift is a free one-time claim (FIRST_RECHARGE_FREE, default on). */
export async function firstRecharge(ctx: ServerContext, p: GamePlayer): Promise<boolean> {
  const rt = eventsRuntime(ctx);
  const free = String(process.env.FIRST_RECHARGE_FREE ?? "true") !== "false";
  if (!free && !p.info.IsRecharged) return false;
  if (p.info.IsGetAward || !(await claimOnce(ctx.db.db, p.id, "firstrecharge", "once"))) {
    p.sendMessage(0, ctx.lang.t("FirstRechargeGetAward.AlreadyGetAward"));
    return false;
  }
  const goods = rt.data.eventGoods.filter((g) => g.ActivityType === 7 && g.SubActivityType === 1);
  const s = await give(ctx, p, goods.map((g) => ({ templateId: g.TemplateId, count: g.Count ?? 1, validDate: g.ValidDate ?? 0, isBind: g.IsBind ?? true, strengthenLevel: g.StrengthLevel ?? 0, attack: g.AttackCompose ?? 0, defence: g.DefendCompose ?? 0, agility: g.AgilityCompose ?? 0, luck: g.LuckCompose ?? 0 })), "Presente da primeira recarga");
  p.info.IsGetAward = true;
  p.send(Out.firstRecharge(true, true));
  p.sendMessage(0, `Presente recebido! ${s}`);
  return true;
}

/** Registro: lê o int vazio do pacote, aplica o debounce compartilhado com 13 DAILY_AWARD e despacha. */
export function firstRechargeHandler(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): void {
  pkt.readInt();
  if (throttled(p, 500)) return;
  void firstRecharge(ctx, p);
}
