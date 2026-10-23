/**
 * Aba no jogo: Fazenda › alugar/expandir terrenos (além dos 8 iniciais, por semana ou por mês).
 * Pacotes: 81 FARM sub 6 PAY_FIELD.
 * C#: `Farm/Handle/*`.
 * Como testar: `apps/game/test/farm-compose-hotspring-rooms.test.ts`. Manual: Fazenda → terreno travado →
 * pagar aluguel (semana/mês).
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { FIELD_CAPACITY, payFieldsPacket, saveField, STARTER_FIELDS, type FarmState, type FieldRow } from "./estado.js";

/** sub 6 PAY_FIELD: int n, n*int fieldId, int months (0 = semana, senão mês — mesma convenção do AUnit da
 * loja). */
export async function payField(ctx: ServerContext, p: GamePlayer, pkt: GSPacket, s: FarmState): Promise<void> {
  const n = pkt.readInt();
  const ids = Array.from({ length: n }, () => pkt.readInt());
  const months = pkt.readInt();
  const week = months === 0;
  const hours = week ? ctx.templates.cfgInt("FarmFieldWeekHours", 168) : ctx.templates.cfgInt("FarmFieldMonthHours", 720);
  const price = week ? ctx.templates.cfgInt("FarmFieldWeekPrice", 5000) : ctx.templates.cfgInt("FarmFieldMonthPrice", 18000);
  const total = price * ids.length;
  if (p.info.Gold < total) return p.sendMessage(0, ctx.lang.t("Farm.NotEnough"));
  const now = ctx.now();
  const paid: FieldRow[] = [];
  for (const id of ids) {
    if (id < STARTER_FIELDS || id >= FIELD_CAPACITY) continue;
    let f = s.fields.get(id);
    const base = f && f.PayTime.getTime() > now.getTime() ? f.PayTime.getTime() : now.getTime();
    const payTime = new Date(base + hours * 3_600_000);
    if (!f) { f = { ID: 0, FarmID: p.id, FieldID: id, SeedID: 0, PlantTime: now, AccelerateTime: 0, FieldValidDate: 1, PayTime: payTime, GainCount: 0, AutoSeedID: 0, AutoFertilizerID: 0, AutoSeedIDCount: 0, AutoFertilizerCount: 0, isAutomatic: false, AutomaticTime: now, IsExit: true, payFieldTime: hours } as FieldRow; }
    else { f.PayTime = payTime; f.payFieldTime = hours; }
    await saveField(ctx, p.id, f);
    s.fields.set(id, f);
    paid.push(f);
  }
  p.removeGold(total);
  // AbstractPacketLib.SendPayFields (~2391-2409): só os terrenos pagos nessa chamada, não a fazenda inteira.
  p.send(payFieldsPacket(p.id, paid));
}
