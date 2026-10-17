/**
 * Aba no jogo: Fazenda › plantar semente num terreno livre.
 * Pacotes: 81 FARM sub 2 GROW_FIELD.
 * C#: `Farm/Handle/*` (ver índice em `fazenda/index.ts`).
 * Como testar: `apps/game/test/farm-compose-hotspring-rooms.test.ts`. Manual: Fazenda → arrastar semente
 * da bolsa pra um terreno vazio.
 */
import type { GSPacket } from "@ddt/protocol";
import { BagType } from "../../game/item.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { fieldPacket, isUnlocked, saveField, type FarmState } from "./estado.js";

/** sub 2 GROW_FIELD: byte _, int seedTpl, int fieldId. */
export async function growField(ctx: ServerContext, p: GamePlayer, pkt: GSPacket, s: FarmState): Promise<void> {
  pkt.readByte();
  const seedTpl = pkt.readInt();
  const fieldId = pkt.readInt();
  const f = s.fields.get(fieldId);
  const now = ctx.now();
  if (!f || !isUnlocked(f, now) || f.SeedID !== 0) return;
  const t = ctx.templates.findItem(seedTpl);
  if (!t) return;
  const inv = p.getInventory(BagType.FarmBag);
  const seed = inv?.getItemByTemplateID(0, seedTpl);
  if (!seed || !inv!.removeCountFromStack(seed, 1)) return p.sendMessage(0, ctx.lang.t("Farm.NoSeed"));
  f.SeedID = seedTpl; f.PlantTime = now; f.GainCount = t.Property2; f.FieldValidDate = Math.max(1, t.Property3); f.AccelerateTime = 0;
  await saveField(ctx, p.id, f);
  p.send(fieldPacket(f));
}
