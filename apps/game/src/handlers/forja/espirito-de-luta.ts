/**
 * Aba no jogo: Forja › Forno › Gemas, botão "Espírito de luta". Usa uma pedra de espírito da bolsa
 * de itens pra dar EXP a um dos 3 slots de gema do equipamento indicado. O modelo de dados dos slots
 * (nível/exp/posição) está em `gemas.ts`.
 * Pacotes: 209 FIGHT_SPIRIT (sub-tipo 2 PLAYER_FIGHT_SPIRIT_UP).
 * C#: `FigSpiritUpGradeHandler.cs`.
 * Como testar: sem teste automatizado dedicado ainda. Manual: Forja → Forno → Gemas → escolher slot
 * do equipamento → usar pedra de espírito → EXP/nível daquele slot sobe.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { getGemStone, updateGemStone } from "../../db/gemstone.js";
import { FIGHT_SPIRIT_EXPS, canLevelUpFightSpirit, formatFigSpiritIdValue, isMaxFightSpiritLevel, neededFightSpiritExp, parseFigSpiritIdValue, reorderFightSpiritSlots, type FigSpiritSlot } from "./gemas.js";

/** FightSpiritPackageType.PLAYER_FIGHT_SPIRIT_UP (ddt/data/socket/FightSpiritPackageType.as:7). */
const PLAYER_FIGHT_SPIRIT_UP = 2;

/**
 * Espírito de luta no jogo: usa uma "pedra de espírito" (`TemplateID===100100`) da `propBag` pra dar EXP a um dos
 * 3 slots da `UserGemStone` do equipamento indicado (persistida em `player."Sys_User_Gemstone"`, ver `db/gemstone.ts`).
 * Contrapartida C#: `FigSpiritUpGradeHandler.cs` (pacote 209 FIGHT_SPIRIT, sub-tipo 2 PLAYER_FIGHT_SPIRIT_UP).
 * NOTA: a única implementação de `IPacketLib` no servidor original (`ConsolePacketLib.cs:606`) tem
 * `SendPlayerFigSpiritUp` como `throw new NotImplementedException()` — ou seja, essa resposta NUNCA funcionou
 * no build C# fornecido. O formato abaixo foi reconstruído do LEITOR do cliente
 * (`gemstone/GemstoneManager.as:292-322`), não do escritor C#, pra realmente funcionar no cliente real.
 * Pacote que lê: `[byte subTypeDescartado][int autoBuyId][int goodsId(não usado)][int type(não usado)]
 * [int templateId][int fightSpiritId][int equipPlace][int place][int count(não usado)]`.
 * Resposta `GSPacket(209)`: `[byte 2][boolean isUp][boolean isMaxLevel][boolean isFall][int num]
 * [int count=3][count×(int fightSpiritId, int level, int exp, int place)][int equipPlace][int dir]`.
 * Como lê esse código (cada variável):
 * - `gem`: linha `Sys_User_Gemstone` da categoria `equipPlace` (null nunca deveria acontecer — login cria as 5
 *   categorias padrão via `loadOrCreateGemStones`; aqui só leio, sem criar, pra não mascarar bug de equipPlace).
 * - `slots`: os 3 `{level,exp,place}` de `gem.FigSpiritIdValue`; `isMaxLevel`: calculado UMA vez, reusado em
 *   todas as respostas (igual ao original — só o caso `!gem` manda `isMaxLevel=true` fixo, ver código C#).
 * - `curGem`: slot cujo `.place` bate com o `place` pedido pelo cliente; `null` = `"WrongPlace"`.
 * - `autoBuyId===1`: compra automática — gasta quantas pedras couberem até completar o próximo nível;
 *   outro valor: gasta 1 pedra só.
 * - `isUp`/`isFall`/`dir`: só a tentativa final calcula de verdade (`dir=1` quando subiu); todo early-return
 *   manda `isUp=false,isFall=true,dir=0` (replicando os valores iniciais do C#).
 */
export async function figSpiritUpGrade(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  if (p.info.Grade < 30) return;
  pkt.readByte(); // sub-tipo (3 FIGHT_SPIRIT_LEVELUP) — descartado, igual ao original
  const autoBuyId = pkt.readInt();
  pkt.readInt(); // goodsId — nunca usado no original
  pkt.readInt(); // type — nunca usado no original
  const templateId = pkt.readInt();
  const fightSpiritId = pkt.readInt();
  const equipPlace = pkt.readInt();
  const place = pkt.readInt();
  pkt.readInt(); // count — nunca usado no original

  const golden = ctx.templates.cfgInt("FightSpiritMaxLevel", FIGHT_SPIRIT_EXPS.length - 1);

  const reply = (figId: number, slots: FigSpiritSlot[], isUp: boolean, isMaxLevel: boolean, isFall: boolean, num: number, dir: number): void => {
    const out = new GSPacket(209, p.id);
    out.writeByte(PLAYER_FIGHT_SPIRIT_UP);
    out.writeBoolean(isUp);
    out.writeBoolean(isMaxLevel);
    out.writeBoolean(isFall);
    out.writeInt(num);
    out.writeInt(slots.length);
    for (const slot of slots) {
      out.writeInt(figId);
      out.writeInt(slot.level);
      out.writeInt(slot.exp);
      out.writeInt(slot.place);
    }
    out.writeInt(equipPlace);
    out.writeInt(dir);
    p.send(out);
  };

  const gem = await getGemStone(ctx.db.db, p.id, equipPlace);
  if (!gem) {
    reply(0, [], false, true, true, 0, 0); // C#: isMaxLevel fixo `true` quando gemStone é null
    return p.sendMessage(0, ctx.lang.t("FigSpiritUpGradeHandler.Msg"));
  }
  const slots = parseFigSpiritIdValue(gem.FigSpiritIdValue);
  const isMaxLevel = isMaxFightSpiritLevel(slots, golden);

  const item = p.propBag.getItemByTemplateID(0, templateId);
  const itemCount = p.propBag.getItemCount(templateId);
  if (itemCount <= 0 || !item) {
    reply(gem.FigSpiritId, slots, false, isMaxLevel, true, 0, 0);
    return p.sendMessage(0, ctx.lang.t("FigSpiritUpGradeHandler.Msg"));
  }
  if (!item.isGemStone()) {
    reply(gem.FigSpiritId, slots, false, isMaxLevel, true, 0, 0);
    return p.sendMessage(0, ctx.lang.t("FigSpiritUpGradeHandler.Msg"));
  }
  if (isMaxLevel) {
    reply(gem.FigSpiritId, slots, false, true, true, 0, 0);
    return;
  }
  const curGem = slots.find((slot) => slot.place === place);
  if (!curGem) {
    reply(gem.FigSpiritId, slots, false, isMaxLevel, true, 0, 0);
    return p.sendMessage(0, ctx.lang.t("FigSpiritUpGradeHandler.WrongPlace"));
  }

  let exp: number;
  if (autoBuyId === 1) {
    let needCount = Math.trunc(neededFightSpiritExp(curGem.exp, curGem.level) / item.template.Property2);
    if (itemCount < needCount) needCount = itemCount;
    exp = item.template.Property2 * needCount;
    p.propBag.removeTemplate(templateId, needCount);
  } else {
    exp = item.template.Property2;
    p.propBag.removeCountFromStack(item, 1);
  }

  let isUp = false;
  let updated: FigSpiritSlot = curGem;
  if (curGem.level < golden) {
    const newExp = curGem.exp + exp;
    isUp = canLevelUpFightSpirit(newExp, curGem.level);
    updated = isUp ? { ...curGem, level: curGem.level + 1, exp: 0 } : { ...curGem, exp: newExp };
  }
  const newSlots = reorderFightSpiritSlots(slots, updated, isUp);
  let dir = 0;
  if (isUp) {
    p.updatePlayerProperties();
    dir = 1;
  }

  gem.FigSpiritId = fightSpiritId;
  gem.FigSpiritIdValue = formatFigSpiritIdValue(newSlots);
  await updateGemStone(ctx.db.db, gem);
  reply(fightSpiritId, newSlots, isUp, isMaxLevel, !isUp, 1, dir);
}
