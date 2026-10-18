/**
 * Aba no jogo: Treino de atributos (Texp) — usar um pergaminho (categoria 20) pra subir um dos 5 atributos
 * de treino. A poção fica no slot `StoreBag[0]` (célula do TexpView). Limite diário (4.1) = grade × 2
 * (VIP ≤ 2) ou × 3.
 * Pacote: 99 TEXP (byte selectIndex: 0 hp, 1 att, 2 def, 3 spd, 4 luk).
 * C#: `TexpHandler.cs` (4.1), `Game.Server.Packets.Client/TexpHandler.cs` (6600, decompilado por completo).
 * Como testar: `apps/game/test/client-6600-m2-bolsa.test.ts`. Manual: `texpSystem` → usar pergaminho até o
 * limite diário.
 *
 * NOVO (m2-bolsa): request muda de FORMA (não só layout) entre as versões — `GameSocketOut.as sendTexp`
 * 4.1 escreve `type, templateID, place` (3 ints); 6600 escreve `type, templateID, count, place` (4 ints,
 * `count` NOVO antes de `place` — ler como se fosse 4.1 desalinharia `place` com o `count` do cliente).
 * Lógica também muda: o `.cs` 6600 real (lido por completo) não tem multiplicador de VIP nem reset diário —
 * só um teto simples `texpCount <= Grade`, e permite consumir VÁRIOS pergaminhos de uma vez (`count`,
 * truncado pra não passar do teto); a 4.1 só consome 1 por pacote. Implementado como dois caminhos
 * (`texp()` 4.1 intacto, `texp6600()` novo) despachados pelo `clientKind` no registro do handler.
 */
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import type { HandlerRegistry } from "../registry.js";

/**
 * TexpHandler.cs (99, 4.1): int selectIndex (0 hp, 1 att, 2 def, 3 spd, 4 luk), int templateId, int place. The
 * potion (category 20) sits in StoreBag[0] (TexpView's cell); Property2 = exp. Daily cap = grade × 2 (VIP ≤ 2)
 * or × 3.
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

/**
 * TexpHandler.cs (99, 6600): int type, int templateId, int count, int slot — sem multiplicador de VIP, sem
 * reset diário explícito nesta rotina; teto simples `texpCount <= Grade`, truncando `count` pra não passar
 * do teto (`num2 + texpCount >= Grade → num2 = Grade - texpCount`). Item validado por `isTexp()` (categoria
 * 20, mesmo que a 4.1), não por bater `templateId` com o slot — mantido o mesmo cheque de anti-cheat da
 * 4.1 aqui porque é estritamente mais seguro e não muda nenhum caso de uso real.
 */
export function texp6600(ctx: ServerContext, p: GamePlayer, selectIndex: number, templateId: number, count: number, place: number): void {
  const it = p.storeBag.getItemAt(place);
  const info = p.info.Texp;
  if (!it || !info || it.TemplateID !== templateId || it.template.CategoryID !== 20) return;
  if (info.texpCount > p.info.Grade) return p.sendMessage(0, ctx.lang.t("texpSystem.texpCountToplimit"));
  let n = Math.max(1, Math.trunc(count));
  if (n + info.texpCount >= p.info.Grade) n = p.info.Grade - info.texpCount;
  if (n <= 0) return;
  const key = (["hpTexpExp", "attTexpExp", "defTexpExp", "spdTexpExp", "lukTexpExp"] as const)[selectIndex];
  if (!key) return;
  if (!p.storeBag.removeTemplate(templateId, n)) return;
  info[key] += it.template.Property2 * n;
  info.texpCount += n;
  info.texpTaskCount++;
  info.texpTaskDate = ctx.now();
  p.questInv?.onUsingItem(templateId);
  p.questInv?.onUsingItem(45001 + ((selectIndex + 4) % 5));
  p.updatePlayerProperties();
}

export function registerTreinoAtributos(r: HandlerRegistry): void {
  r.player(99, "TEXP", (ctx, p, pkt) => {
    if (p.clientKind === "6600") {
      const selectIndex = pkt.readInt(), templateId = pkt.readInt(), count = pkt.readInt(), place = pkt.readInt();
      return texp6600(ctx, p, selectIndex, templateId, count, place);
    }
    texp(ctx, p, pkt.readInt(), pkt.readInt(), pkt.readInt());
  });
}
