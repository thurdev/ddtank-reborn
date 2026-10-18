/**
 * Aba no jogo: Forja › Ferraria › Montar (incrustar gema). Jogador encaixa uma joia num dos 6 furos
 * do equipamento (`Montar`), pode remover de volta (`Remover gema`), e os furos 5/6 (os mais fundos)
 * só abrem usando uma broca de nível certo.
 * Pacotes: 121 ITEM_INLAY (incrustar), 125 ITEM_EMBED_BACKOUT (remover), 217 OPEN_FIVE_SIX_HOLE (broca).
 * C#: `ItemInlayHandle.cs`, `ItemEmbedBackOutHandler.cs`, `OpenFiveSixHoleHandler.cs`.
 * Como testar: sem teste automatizado dedicado (ver `apps/game/test/forge-*.test.ts` pra bancada geral).
 * Manual: Forja → Ferraria → Montar → arrastar joia pro furo certo → ouro desconta e furo preenche.
 *
 * NOVO (m1-pacotes-acao): o 6600 reaproveita o código 121 pra `RUNE_COMMAND` (sistema de "beads"/runas —
 * `ddt/data/socket/ePackageType.as`: 4.1 `ITEM_INLAY=121`, 6600 `RUNE_COMMAND=121`; `ITEM_INLAY` nem existe
 * mais no enum 6600). É uma colisão de CÓDIGO, igual à do 259 FIRSTRECHARGE/CONSUME_RANK
 * (research/6600/packets-m1.md Detalhe D) — mandar nossa resposta `GSPacket(121)` pra um cliente 6600 faz
 * `SocketManager.handleBeadPkg` ler o primeiro byte como sub-comando de bead/rune (`RUNE_SENDINFO_TOCLIENT`/
 * `RUNE_OPENPACKAGE`), não como o ack de inlay. O sistema de beads/runas não foi portado (fora do escopo
 * desta rodada — ver `BEAD_HOLE_INFO` em packets-m1.md), então `inlay()` só SUPRIME o envio da resposta 121
 * pra clientKind 6600 (o estado do servidor muda normalmente; só o ack visual pro cliente não vai).
 * `embedBackout()` (125) e `openFiveSixHole()` (217) não colidem — confirmado mesmo valor numérico nos dois
 * enums.
 */
import { GSPacket } from "@ddt/protocol";
import { ItemInfo } from "../../game/item.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { mailItems } from "../bolsa/correio-excedente.js";
import { bagLocked, clearStoreBag, isWarrior } from "./bancada.js";

/**
 * Incrustação no jogo: coloca joia (`Property1===31`) num furo cujo tipo (`holeType`) equals `gem.Property2`.
 * Contrapartida C#: `ItemInlayHandle.cs` (pacote 121 ITEM_INLAY).
 * Pacote que lê: `[int itemBag, int itemPlace, int hole(1-6), int gemBag, int gemPlace]`; cobra `InlayGoldPrice` (padrão 2000) mesmo quando furo não combina. Resposta `GSPacket(121)`: `writeByte(1)` na falha, `writeInt(0)` no sucesso.
 * Exemplo concreto: arma com furo 1 do tipo 5 + joia `Property1=31/Property2=5` → `Hole1=TemplateID` da joia, joia consumida, ouro -2000; joia de tipo errado → ouro cobrado mesmo assim, mensagem exata `"GameServer.InlayItem.Msg1"`.
 * Como lê esse código (cada variável):
 * - `itemBag`: id da bolsa do equipamento lido do pacote; `itemPlace`: slot do equipamento nessa bolsa.
 * - `hole`: número do furo (1-6) lido do pacote; fora disso responde `1` + `"ItemInlayHandle.NoPlace"`.
 * - `gemBag`: id da bolsa da joia lido do pacote; `gemPlace`: slot da joia nessa bolsa.
 * - `equipInventory`: inventário do equipamento (`p.getInventory(itemBag)`); `gemInventory`: inventário da joia (`p.getInventory(gemBag)`).
 * - `item`: equipamento em `equipInventory.getItemAt(itemPlace)`; contém campos `Hole1..Hole6` e `holeType(hole)`.
 * - `gem`: joia em `gemInventory.getItemAt(gemPlace)`; válida quando `template.Property1===31`, tipo em `template.Property2`.
 * - `price`: custo `cfgInt("InlayGoldPrice", 2000)`; exige `p.info.Gold > price`, senão `"UserBuyItemHandler.NoMoney"`.
 * - `out`: `GSPacket(121, p.id)` de resposta.
 * - `holeField`: campo do furo (`Hole${hole}`); `holeMatches`: `holeType(hole)===gem.Property2 && item[holeField]>=0` (furo aberto).
 * - `returnedOldGems`: joias antigas dos furos 5/6 devolvidas via `propBag` ou correio; `oldGemTemplate`: `ItemTemplate` da joia antiga; `oldGem`: nova `ItemInfo` amarrada criada dessa joia.
 */
export async function inlay(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const itemBag = pkt.readInt(), itemPlace = pkt.readInt(), hole = pkt.readInt(), gemBag = pkt.readInt(), gemPlace = pkt.readInt();
  const equipInventory = p.getInventory(itemBag), gemInventory = p.getInventory(gemBag);
  const item = equipInventory?.getItemAt(itemPlace), gem = gemInventory?.getItemAt(gemPlace);
  if (!equipInventory || !gemInventory || !item || !gem || gem.template.Property1 !== 31) return;
  const price = ctx.templates.cfgInt("InlayGoldPrice", 2000);
  if (!(p.info.Gold > price)) return p.sendMessage(0, ctx.lang.t("UserBuyItemHandler.NoMoney"));
  const out = new GSPacket(121, p.id);
  if (!(hole > 0 && hole < 7)) {
    out.writeByte(1);
    p.sendMessage(0, ctx.lang.t("ItemInlayHandle.NoPlace"));
    // 6600 reassigns code 121 to RUNE_COMMAND (ePackageType.as: ITEM_INLAY=121 na 4.1, RUNE_COMMAND=121 no
    // 6600 — colisão real de código, não só de layout; `ITEM_INLAY` nem existe mais no enum 6600). Ver nota
    // abaixo e research/6600/packets-m1.md.
    if (p.clientKind !== "6600") p.send(out);
    return;
  }
  p.removeGold(price); // C#: charged even when the hole type does not match
  const holeField = `Hole${hole}` as "Hole1";
  // Port: the hole must be open (>= 0); the C# trusted the client.
  const holeMatches = item.holeType(hole) === gem.template.Property2 && item[holeField] >= 0;
  if (holeMatches) {
    const returnedOldGems: ItemInfo[] = [];
    if ((hole === 5 || hole === 6) && item[holeField] > 0) {
      const oldGemTemplate = ctx.templates.findItem(item[holeField]);
      if (oldGemTemplate) {
        const oldGem = ItemInfo.createFromTemplate(oldGemTemplate, 1, 102, ctx.now());
        oldGem.IsBinds = true;
        oldGem.ValidDate = 0;
        if (!p.propBag.addTemplate(oldGem, 1)) returnedOldGems.push(oldGem);
      }
    }
    item[holeField] = gem.TemplateID;
    if (gem.IsBinds) item.IsBinds = true;
    gemInventory.removeCountFromStack(gem, 1);
    equipInventory.updateItem(item);
    if (returnedOldGems.length) await mailItems(ctx, p, returnedOldGems);
    p.questInv?.onItemInsert(); // player.ItemInsert (ItemInsertCondition, type 25)
    out.writeInt(0);
  } else {
    p.sendMessage(0, ctx.lang.t("GameServer.InlayItem.Msg1"));
    out.writeByte(1);
  }
  if (p.clientKind !== "6600") p.send(out); // see 121/RUNE_COMMAND collision note above
  if (equipInventory === p.equipBag && item.Place < 31) p.updatePlayerProperties();
}

/** ItemEmbedBackOutHandler.cs (125): remove a gem from Store[0] for 500 Money; gem returns bound. */
export async function embedBackout(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const hole = pkt.readInt();
  const templateId = pkt.readInt();
  const requiredMoney = 500;
  if (bagLocked(ctx, p)) return;
  const warrior = isWarrior(p);
  if (p.info.Money + p.info.MoneyLock < requiredMoney && !warrior) return p.sendMessage(3, ctx.lang.t("ItemComposeHandler.NoMoney"));
  if (p.propBag.getEmptyCount() <= 0) return p.sendMessage(0, ctx.lang.t("UserChangeItemPlaceHandler.full"));
  const item = p.storeBag.getItemAt(0);
  const goods = ctx.templates.findItem(templateId);
  if (!item || !goods || !(hole >= 1 && hole <= 6)) return;
  const holeField = `Hole${hole}` as "Hole1";
  const out = new GSPacket(125, p.id);
  if (item[holeField] > 0 && item[holeField] === goods.TemplateID) {
    item[holeField] = 0;
    out.writeInt(0);
    p.beginChanges();
    const gem = ItemInfo.createFromTemplate(goods, 1, 102, ctx.now());
    gem.IsBinds = true;
    gem.ValidDate = 0;
    const mailQueue: ItemInfo[] = [];
    if (!p.propBag.addTemplate(gem, 1)) mailQueue.push(gem);
    p.storeBag.updateItem(item);
    if (!warrior) p.removeMoney(requiredMoney);
    p.commitChanges();
    if (mailQueue.length) await mailItems(ctx, p, mailQueue);
    await clearStoreBag(ctx, p);
    p.sendMessage(0, ctx.lang.t("OK"));
  } else out.writeInt(1);
  p.send(out);
}

/**
 * OpenFiveSixHoleHandler.cs (217): drill (PropBag item whose own TemplateID is the right tier for the hole's
 * current level) spent on the StoreBag[slot] equip's hole 5 or 6, Property7..8 random exp; a 100 ms cooldown per
 * player (LastOpenHole) matches the throttle, not an anti-cheat.
 */
const HOLE_LEVEL_UP_EXP = [400, 600, 700, 800, 800];
export async function openFiveSixHole(ctx: ServerContext, p: GamePlayer, pkt: GSPacket, rnd = Math.random): Promise<void> {
  const slot = pkt.readInt();
  const hole = pkt.readInt(); // 5 or 6
  const drillTemplateId = pkt.readInt();
  const now = ctx.now().getTime();
  if (p.lastOpenHole + 100 > now) return p.sendMessage(0, ctx.lang.t("GameServer.OpenHole.TooQuickly"));
  p.lastOpenHole = now;
  const item = p.storeBag.getItemAt(slot);
  if (!item || ![7, 1, 5].includes(item.template.CategoryID)) return p.sendMessage(0, "Não é possível abrir o furo.");
  const drill = p.propBag.getItemByTemplateID(0, drillTemplateId);
  if (!drill || drill.Count <= 0 || (hole !== 5 && hole !== 6)) return;
  if (drill.IsBinds && !item.IsBinds) p.storeBag.updateItem(item);
  const lvKey = (hole === 6 ? "Hole6Level" : "Hole5Level") as "Hole5Level" | "Hole6Level";
  const expKey = (hole === 6 ? "Hole6Exp" : "Hole5Exp") as "Hole5Exp" | "Hole6Exp";
  const holeKey = (hole === 6 ? "Hole6" : "Hole5") as "Hole5" | "Hole6";
  let leveledUp = false;
  if (drill.isDrill(item[lvKey])) {
    p.propBag.removeCountFromStack(drill, 1);
    item[expKey] += Math.trunc(drill.template.Property7 + rnd() * (drill.template.Property8 - drill.template.Property7));
    const needExp = HOLE_LEVEL_UP_EXP[item[lvKey]];
    if (needExp !== undefined && item[expKey] >= needExp) {
      item[lvKey]++;
      item[expKey] = 0;
      if (item[lvKey] > 0 && item[holeKey] < 0) item[holeKey] = 0;
      leveledUp = true;
    }
  } else {
    p.sendMessage(0, "O nível da broca não é adequado para abrir o furo.");
  }
  p.storeBag.updateItem(item);
  const out = new GSPacket(217, p.id);
  out.writeByte(0);
  out.writeBoolean(leveledUp);
  out.writeInt(hole);
  p.send(out);
}
