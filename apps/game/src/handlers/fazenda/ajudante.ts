/**
 * Aba no jogo: Fazenda › ajudante automático (planta/colhe sozinho enquanto você está fora).
 * Pacotes: 81 FARM sub 8 HELPER_PAY_FIELD (renovar o próprio ajudante), sub 9 HELPER_SWITCH_FIELD
 * (ligar/desligar e configurar o que ele planta).
 * C#: `Farm/Handle/*`.
 * Fix vs o original: sub 9 lia o `price` direto do pacote e cobrava exatamente aquilo
 * (`FarmHandler.cs` §13, nota "Price supplied by client" — um pacote forjado comprava o ajudante de
 * graça). Aqui o preço é sempre calculado no servidor a partir de `seedTime` (minutos) ×
 * `FarmHelperPricePerMin` (Server_Config, padrão 2); o valor que o cliente manda é ignorado.
 * Como testar: `apps/game/test/farm-compose-hotspring-rooms.test.ts`. Manual: Fazenda → ícone do ajudante
 * → configurar semente/tempo/quantidade → ligar.
 */
import type { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { MIN_DATE } from "../../util/time.js";
import { helperSwitchPacket, saveFarm, saveField, type FarmState } from "./estado.js";

/** sub 8 HELPER_PAY_FIELD: int validity (dias) — renova o próprio slot do ajudante (não o contrato da
 * semente). C#: `Farm/Handle/HelperPayField.cs` responde com um `new UserFarmInfo()` em branco (só
 * `AutoValidDate` setado) — `SendHelperSwitchField` escreve sub 9 fixo, então quem realmente trata essa
 * resposta no cliente é `__onHelperSwitch` (não `__onHelperPay`, que nenhum writer C# aciona de verdade). */
export async function helperPayField(ctx: ServerContext, p: GamePlayer, pkt: GSPacket, s: FarmState): Promise<void> {
  const validity = pkt.readInt();
  const price = validity > 1 ? ctx.templates.cfgInt("FarmHelperMonthPrice", 300) : ctx.templates.cfgInt("FarmHelperWeekPrice", 100);
  if (p.info.Money + p.info.MoneyLock < price) return p.sendMessage(0, ctx.lang.t("Farm.NotEnough"));
  p.removeMoney(price);
  s.farm.VipLimitLevel = validity;
  await saveFarm(ctx, s.farm);
  p.send(helperSwitchPacket({ isFarmHelper: false, isAutoId: 0, AutoPayTime: MIN_DATE, AutoValidDate: validity, GainFieldId: 0, KillCropId: 0 }));
}

/** sub 9 HELPER_SWITCH_FIELD: bool on, int seedId, int seedTime, int seedCount, int getCount, int
 * payType, int price (ignorado, ver cabeçalho). */
export async function helperSwitchField(ctx: ServerContext, p: GamePlayer, pkt: GSPacket, s: FarmState): Promise<void> {
  const on = pkt.readBoolean();
  const seedId = pkt.readInt();
  const seedTime = pkt.readInt();
  const seedCount = pkt.readInt();
  const getCount = pkt.readInt();
  const payType = pkt.readInt();
  pkt.readInt(); // client-sent price — IGNORED (exploit fix, see module header)
  if (on) {
    const perMin = ctx.templates.cfgInt("FarmHelperPricePerMin", 2);
    const price = Math.max(1, perMin * Math.max(1, seedTime)) * Math.max(1, seedCount);
    if (payType === -2) { if (p.info.GiftToken < price) return p.sendMessage(0, ctx.lang.t("Farm.NotEnough")); p.removeGiftToken(price); }
    else { if (p.info.Money + p.info.MoneyLock < price) return p.sendMessage(0, ctx.lang.t("Farm.NotEnough")); p.removeMoney(price); }
    for (const f of s.fields.values()) { f.SeedID = 0; f.FieldValidDate = 1; f.AccelerateTime = 0; f.GainCount = 0; await saveField(ctx, p.id, f); }
  }
  s.farm.isFarmHelper = on;
  s.farm.isAutoId = on ? seedId : 0;
  s.farm.AutoPayTime = ctx.now();
  s.farm.AutoValidDate = on ? seedTime : 0;
  s.farm.GainFieldId = on ? Math.trunc(getCount / 10) : 0;
  s.farm.KillCropId = on ? getCount : 0;
  await saveFarm(ctx, s.farm);
  p.send(helperSwitchPacket(s.farm));
}
