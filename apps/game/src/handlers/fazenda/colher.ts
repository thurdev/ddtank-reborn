/**
 * Aba no jogo: Fazenda › colher um terreno maduro (seu ou roubar 1 unidade de um amigo), e limpar um
 * terreno com praga/morto.
 * Pacotes: 81 FARM sub 4 GAIN_FIELD, sub 7 KILLCROP_FIELD.
 * C#: `Farm/Handle/*`.
 * Como testar: `apps/game/test/farm-compose-hotspring-rooms.test.ts`. Manual: Fazenda → clicar num
 * terreno maduro (seu ou de um amigo visitado) / clicar num terreno morto pra limpar.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { fieldPacket, giveOrMail, isRipe, loadFarm, saveField, stateOf, type FarmState } from "./estado.js";

/** sub 4 GAIN_FIELD: int ownerId, int fieldId. ownerId 0/você = colheita normal; outro = roubo (1
 * unidade, só se `GainCount > 9`, espelha `PlayerFarm.GainFriendFields`). */
export async function gainField(ctx: ServerContext, p: GamePlayer, pkt: GSPacket, s: FarmState): Promise<void> {
  const ownerId = pkt.readInt();
  const fieldId = pkt.readInt();
  const now = ctx.now();
  if (!ownerId || ownerId === p.id) {
    const f = s.fields.get(fieldId);
    if (!f || !isRipe(f, now)) return;
    const t = ctx.templates.findItem(f.SeedID);
    const goodsT = t ? ctx.templates.findItem(t.Property4) : undefined;
    const count = f.GainCount;
    f.SeedID = 0; f.FieldValidDate = 1; f.AccelerateTime = 0; f.GainCount = 0;
    await saveField(ctx, p.id, f);
    if (goodsT && count > 0) await giveOrMail(ctx, p, goodsT, count);
    p.send(fieldPacket(f));
    return;
  }
  const other = ctx.world.get(ownerId);
  const owner = other ? stateOf(other) : undefined;
  const theirFields = owner?.fields ?? (await loadFarm(ctx, ownerId, "")).fields;
  const f = theirFields.get(fieldId);
  if (!f || !isRipe(f, now) || f.GainCount <= 9) return;
  const t = ctx.templates.findItem(f.SeedID);
  const goodsT = t ? ctx.templates.findItem(t.Property4) : undefined;
  f.GainCount -= 1;
  await saveField(ctx, ownerId, f);
  if (goodsT) await giveOrMail(ctx, p, goodsT, 1);
  p.send(fieldPacket(f));
  other?.send(fieldPacket(f));
}

/** sub 7 KILLCROP_FIELD: int fieldId — limpa um terreno (praga/plantação morta). */
export async function killCropField(ctx: ServerContext, p: GamePlayer, pkt: GSPacket, s: FarmState): Promise<void> {
  const fieldId = pkt.readInt();
  const f = s.fields.get(fieldId);
  if (!f) return;
  f.SeedID = 0; f.FieldValidDate = 1; f.AccelerateTime = 0; f.GainCount = 0;
  await saveField(ctx, p.id, f);
  p.send(fieldPacket(f));
}
