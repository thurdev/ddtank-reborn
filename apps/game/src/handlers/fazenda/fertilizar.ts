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
import { PacketOut, type GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { FAST_GROW_SUB_MIN, fieldPacket, isRipe, saveField, type FarmState, type FieldRow } from "./estado.js";

/** sub 18 FRAM_GROP_FASTFORWARD: bool useGiftToken, bool all, int fieldId. */
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
  for (const f of targets) { f.AccelerateTime += FAST_GROW_SUB_MIN; await saveField(ctx, p.id, f); p.send(fieldPacket(f)); }
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
  const reply = new PacketOut(81);
  reply.writeByte(3);
  if (!f || f.SeedID === 0 || isRipe(f, now) || !fert) { reply.writeInt(0); p.send(reply); return; }
  if (!p.removeTemplateInShop(fertTpl, 1, (id) => ctx.templates.findItem(id))) {
    reply.writeInt(0); p.send(reply); return;
  }
  f.AccelerateTime += Math.max(1, fert.Property1);
  await saveField(ctx, p.id, f);
  reply.writeInt(1);
  reply.writeBoolean(true);
  reply.writeInt(fieldId);
  reply.writeInt(f.GainCount);
  reply.writeInt(f.AccelerateTime);
  p.send(reply);
}
