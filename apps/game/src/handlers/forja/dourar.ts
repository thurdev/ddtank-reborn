/**
 * Aba no jogo: Forja › Forno › Dourar. Jogador coloca uma arma/chapéu/roupa + o Grânulo do Desejo
 * certo pra aquela categoria (11560 arma, 11561 chapéu, 11562 roupa) e tenta "dourar" o item —
 * efeito visual dourado + bônus, válido por 3 dias. Sucesso avisa o SERVIDOR INTEIRO no chat.
 * Pacotes: 106 WISHBEADEQUIP.
 * C#: `WishBeadEquipHandler.cs`.
 * Como testar: sem teste automatizado dedicado ainda (chance configurável, ver `docs/features/forja.md`
 * seção "Quero mudar"). Manual: Forja → Forno → Dourar → arrastar arma + Grânulo do Desejo → confirmar →
 * aviso global aparece no chat quando dá certo (chance baixa, padrão 0,8%).
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import * as Out from "../../packets/out.js";

/**
 * Dourar no jogo (WishBeadEquipHandler.cs, pacote 106): gasta 1 Grânulo do Desejo numa tentativa de dourar
 * o equipamento. Chance por mil vem de `WishBeadRate` (padrão 8 = 0,8%). Resposta `GSPacket(106)` int:
 * `0`=sucesso, `1`=falhou, `5`=inválido, `6`=já está dourado.
 * Como lê esse código (cada variável):
 * - `place`/`bagType`/`templateId`: onde está o equipamento alvo; `placeBead`/`bagTypeBead`/`beadId`: onde está o grânulo.
 * - `itemBag`/`beadBag`: inventários correspondentes; `item`/`bead`: os `ItemInfo` lidos deles.
 * - `category`: `item.template.CategoryID`; `canWish`: combinação válida grânulo↔categoria (arma/chapéu/roupa).
 * - `goldEquip`: linha de `ctx.templates.golds` (tabela `GoldEquipTemplateLoad`) pro `templateId`, se for arma.
 * - `validGold`: já está dourado e a validade (`goldValidDate` dias desde `goldBeginTime`) ainda não passou.
 * - `code`: resultado final (`0` sucesso, `1` falhou); sucesso marca `isGold=true`, `goldValidDate=3` dias,
 *   e manda aviso pra TODOS os jogadores online (`ctx.world.all()`), não só o jogador.
 */
export async function wishBeadEquip(ctx: ServerContext, p: GamePlayer, pkt: GSPacket, rnd = Math.random): Promise<void> {
  const place = pkt.readInt(), bagType = pkt.readInt(), templateId = pkt.readInt();
  const placeBead = pkt.readInt(), bagTypeBead = pkt.readInt(), beadId = pkt.readInt();
  const reply = (code: number) => { const out = new GSPacket(106, p.id); out.writeInt(code); p.send(out); };
  const itemBag = p.getInventory(bagType), beadBag = p.getInventory(bagTypeBead);
  const item = itemBag?.getItemAt(place), bead = beadBag?.getItemAt(placeBead);
  if (!item || !bead || !itemBag || !beadBag) { p.sendMessage(0, ctx.lang.t("WishBeadEquipHandler.Msg1")); return reply(5); }
  if (bead.Count < 1 || bead.TemplateID !== beadId) { p.sendMessage(0, ctx.lang.t("WishBeadEquipHandler.Msg2")); return reply(5); }
  const category = item.template.CategoryID;
  const canWish = (beadId === 11560 && category === 7) || (beadId === 11561 && category === 5) || (beadId === 11562 && category === 1);
  if (!canWish) return reply(5);
  const goldEquip = ctx.templates.golds.find((g) => g.OldTemplateId === templateId);
  item.IsBinds = true;
  const validGold = item.goldValidDate > 0 && item.goldBeginTime.getTime() + item.goldValidDate * 864e5 > Date.now();
  if (!goldEquip && category === 7) return reply(5);
  if (/^true$/i.test(ctx.templates.serverConfig.get("IsWishBeadLimit") ?? "") && item.StrengthenLevel > ctx.templates.cfgInt("WishBeadLimitLv", 12)) return reply(5);
  if (validGold) return reply(6);
  let code = 1;
  if (ctx.templates.cfgInt("WishBeadRate", 8) > Math.floor(rnd() * 1000)) {
    item.goldBeginTime = new Date();
    item.goldValidDate = 3;
    item.isGold = true;
    code = 0;
    const notice = Out.message(2, `Parabéns! O jogador [${p.info.NickName}] dourou um equipamento com sucesso e ficou ainda mais forte.`);
    for (const onlinePlayer of ctx.world.all()) onlinePlayer.send(notice);
  }
  itemBag.updateItem(item);
  beadBag.removeCountFromStack(bead, 1);
  itemBag.commitChanges?.();
  beadBag.commitChanges?.();
  reply(code);
  p.updatePlayerProperties();
}
