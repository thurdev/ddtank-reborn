/**
 * Aba no jogo: Treino de atributos (Texp) — usar um pergaminho (categoria 20) pra subir um dos 5 atributos
 * de treino. A poção fica no slot `StoreBag[0]` (célula do TexpView). Limite diário = grade × 2 (VIP ≤ 2)
 * ou × 3.
 * Pacote: 99 TEXP (byte selectIndex: 0 hp, 1 att, 2 def, 3 spd, 4 luk).
 * C#: `TexpHandler.cs`.
 * Como testar: sem teste dedicado hoje. Manual: `texpSystem` → usar pergaminho até o limite diário.
 */
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import type { HandlerRegistry } from "../registry.js";

/**
 * TexpHandler.cs (99): int selectIndex (0 hp, 1 att, 2 def, 3 spd, 4 luk), int templateId, int place. The potion
 * (category 20) sits in StoreBag[0] (TexpView's cell); Property2 = exp. Daily cap = grade × 2 (VIP ≤ 2) or × 3.
 */
export function texp(ctx: ServerContext, p: GamePlayer, selectIndex: number, templateId: number, place: number): void {
  const it = p.storeBag.getItemAt(place);
  const info = p.info.Texp;
  if (!it || !info || it.TemplateID !== templateId || it.template.CategoryID !== 20) return;
  const limit = p.info.Grade * (p.info.VIPLevel <= 2 ? 2 : 3);
  const now = ctx.now();
  const day = (d: Date) => Math.floor(d.getTime() / 86_400_000);
  if (day(info.texpTaskDate) + 1 <= day(now) && info.texpCount >= limit) {
    info.texpCount = 0;
    info.texpTaskDate = now;
  }
  if (info.texpCount >= limit) return p.sendMessage(0, ctx.lang.t("texpSystem.texpCountToplimit"));
  const key = (["hpTexpExp", "attTexpExp", "defTexpExp", "spdTexpExp", "lukTexpExp"] as const)[selectIndex];
  if (!key) return; // -1 (BagView quest refresh) changes nothing in the original either, besides eating the potion
  if (!p.storeBag.removeTemplate(templateId, 1)) return;
  info[key] += it.template.Property2;
  info.texpCount++;
  info.texpTaskCount++;
  p.questInv?.onUsingItem(templateId);
  p.questInv?.onUsingItem(45001 + ((selectIndex + 4) % 5)); // OnUsingItem(45005 hp / 45001 att / 45002 def / 45003 spd / 45004 luk)
  p.updatePlayerProperties();
}

export function registerTreinoAtributos(r: HandlerRegistry): void {
  r.player(99, "TEXP", (ctx, p, pkt) => texp(ctx, p, pkt.readInt(), pkt.readInt(), pkt.readInt()));
}
