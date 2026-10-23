/**
 * Aba no jogo: Fazenda › acelerar o crescimento — "regar tudo" pagando Cupom/ouro, ou fertilizar um
 * terreno específico arrastando um item de adubo (MANURE) nele.
 * Pacotes: 81 FARM sub 18 FRAM_GROP_FASTFORWARD (regar), sub 3 ACCELERATE_FIELD (adubo).
 * C#: sub 18 é `Farm/Handle/*` normal; sub 3 ("doMature") **não tem handler C# nenhum** —
 * `FarmHandleMgr` (`Game.Server/Farm/Handle/FarmHandleMgr.cs`) só registra 1/2/4/6/7/8/9/16/18; o cliente
 * 4.1 manda mesmo assim (`GameSocketOut.doMature`), então é implementação nova do Reborn: consome 1
 * fertilizante e soma o `Property1` dele (minutos) em `AccelerateTime`. Resposta lida por
 * `FarmModelController.__onDoMature` (lote: int count, por entrada bool ok + fieldId/gainCount/
 * accelerateTime) — aqui sempre count 0 ou 1, já que o cliente só aduba um terreno por clique.
 * Como testar: `apps/game/test/farm-compose-hotspring-rooms.test.ts`. Manual: Fazenda → botão "regar
 * tudo" / arrastar adubo num terreno plantado.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { doMaturePacket, FAST_GROW_SUB_MIN, FIELD_CAPACITY, isRipe, saveField, type FarmState, type FieldRow } from "./estado.js";

/** sub 18 FRAM_GROP_FASTFORWARD: bool useGiftToken, bool all, int fieldId. Resposta: `PlayerFarm.
 * GropFastforward` (C#:128) chama `Out.SenddoMature(this)` — NÃO um echo do sub 18, é o mesmo pacote
 * sub 3 batizado abaixo em `doMaturePacket`, cobrindo todos os slots da fazenda (0..FIELD_CAPACITY). */
export async function growFastForward(ctx: ServerContext, p: GamePlayer, pkt: GSPacket, s: FarmState): Promise<void> {
  const useGiftToken = pkt.readBoolean();
  const all = pkt.readBoolean();
  const fieldId = pkt.readInt();
  const now = ctx.now();
  const targets = all ? [...s.fields.values()].filter((f) => f.SeedID !== 0 && !isRipe(f, now)) : [s.fields.get(fieldId)].filter((f): f is FieldRow => !!f && f.SeedID !== 0 && !isRipe(f, now));
  if (!targets.length) return;
  const unit = ctx.templates.cfgInt("FastGrowNeedMoney", 10);
  const cost = unit * targets.length;
  if (useGiftToken) { if (p.info.GiftToken < cost) return p.sendMessage(0, ctx.lang.t("Farm.NotEnough")); p.removeGiftToken(cost); }
  else { if (p.info.Money + p.info.MoneyLock < cost) return p.sendMessage(0, ctx.lang.t("Farm.NotEnough")); p.removeMoney(cost); }
  for (const f of targets) { f.AccelerateTime += FAST_GROW_SUB_MIN; await saveField(ctx, p.id, f); }
  const slots: (FieldRow | null)[] = Array.from({ length: FIELD_CAPACITY }, (_, i) => s.fields.get(i) ?? null);
  p.send(doMaturePacket(slots));
}

/** sub 3 ACCELERATE_FIELD ("doMature"): byte 13 (marcador constante, igual ao de GROW_FIELD), int 0
 * (não usado), int fertilizerTpl, int fieldId. */
export async function accelerateField(ctx: ServerContext, p: GamePlayer, pkt: GSPacket, s: FarmState): Promise<void> {
  pkt.readByte();
  pkt.readInt();
  const fertTpl = pkt.readInt();
  const fieldId = pkt.readInt();
  const now = ctx.now();
  const f = s.fields.get(fieldId);
  const fert = ctx.templates.findItem(fertTpl);
  if (!f || f.SeedID === 0 || isRipe(f, now) || !fert) { p.send(doMaturePacket([])); return; }
  if (!p.removeTemplateInShop(fertTpl, 1, (id) => ctx.templates.findItem(id))) {
    p.send(doMaturePacket([])); return;
  }
  f.AccelerateTime += Math.max(1, fert.Property1);
  await saveField(ctx, p.id, f);
  p.send(doMaturePacket([f]));
}
