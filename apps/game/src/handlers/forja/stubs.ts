/**
 * Aba no jogo: ações da Forja sem comportamento real — ou porque o servidor C# original nunca ligou
 * esse recurso (nenhum handler existe nele), ou porque a tabela que ele dependeria nunca foi
 * configurada neste projeto (código vivo, mas sempre um no-op observável).
 * Pacotes: 120 ITEM_TREND (refinar conjunto/tendência, sempre no-op pela tabela vazia) — é o único
 * stub que sobra aqui.
 * 313 ITEM_CELL_IS_LOCKED SAIU de stub — ver `trava-slot.ts` (fonte externa trivial, só um booleano que já
 * existe no nosso `ItemInfo`). 110/111 ITEM_REFINERY(_PREVIEW) SAÍRAM de stub — ver `refinaria.ts` (design
 * próprio, sem fonte C#; `research/qa/feature-designs.md`). 295 STORE_FINE_SUIT, 391 EQUIP_GHOST, 308
 * EQUIP_BRING_UP SAÍRAM de stub — fonte externa real (`research/qa/feature-sources.md`,
 * `THIRD_PARTY_NOTICES.md`), ver `refinar-conjunto.ts`, `espirito-do-equipamento.ts`, `aprimorar.ts`.
 * C#: ver comentário do stub abaixo.
 * Como testar: não há o que testar pro ITEM_TREND — por decisão documentada, não por pendência (ver
 * `docs/features/forja.md` seção 4 e `research/qa/port-A.md`).
 */
import { ItemInfo } from "../../game/item.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { GSPacket } from "@ddt/protocol";

/**
 * Refinar conjunto/tendência (120 ITEM_TREND): converte um equipamento do jogador entre variantes de
 * "tendência" listadas na cadeia de recompensa de `Item_Refinery`, ou compra o dispositivo de treino
 * (item 34101) direto quando `num === -1`.
 *
 * A tabela `Item_Refinery` do jogo tem 0 linhas no `.bak` original (nunca foi configurada neste
 * servidor — nem no original) — então este é código VIVO que hoje é sempre um no-op
 * (`RefineryMgr.RefineryTrend` nunca encontra correspondência), igual ao comportamento observável
 * do original com a configuração vazia.
 */
export async function itemTrend(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const bagType = pkt.readInt();
  const place = pkt.readInt();
  const bagType2 = pkt.readInt();
  const num = pkt.readInt();
  const operation = pkt.readInt();
  let catalyst: ItemInfo | null = null;
  if (num === -1) {
    pkt.readInt(); pkt.readInt(); // unused ints (gold/display, the original never prices this branch either)
    const trainingDeviceTemplate = ctx.templates.findItem(34101);
    if (!trainingDeviceTemplate) return;
    catalyst = ItemInfo.createFromTemplate(trainingDeviceTemplate, 1, 102, ctx.now());
    const shop = ctx.templates.shopByTemplate(34101).find((s) => s.APrice1 === -1 && s.AValue1 !== 0);
    const money = shop?.AValue1 ?? 0;
    if (!(money <= p.info.Money + p.info.MoneyLock)) return;
    p.removeMoney(money);
    catalyst.ValidDate = shop?.AUnit ?? 0;
  } else {
    catalyst = p.getInventory(bagType2)?.getItemAt(num) ?? null;
  }
  const item = p.getInventory(bagType)?.getItemAt(place);
  if (!catalyst || !item) return;
  const newTemplateId = ctx.templates.refineryTrend(operation, item.TemplateID);
  const newTemplate = newTemplateId != null ? ctx.templates.findItem(newTemplateId) : undefined;
  if (newTemplate) {
    const resultItem = ItemInfo.createFromTemplate(newTemplate, 1, 115, ctx.now());
    const inv = p.getItemInventory(newTemplate);
    if (inv?.addItem(resultItem, inv.beginSlot)) {
      inv.updateItem(resultItem);
      p.getInventory(bagType)?.removeItem(item);
      catalyst.Count--;
      if (num !== -1) p.getInventory(bagType2)?.updateItem(catalyst); // num === -1: a virtual, never-stored catalyst
      p.sendMessage(0, ctx.lang.t("ItemTrendHandle.Success"));
    } else {
      p.sendMessage(0, ctx.lang.t("ItemFusionHandler.NoPlace"));
    }
    return;
  }
  p.sendMessage(0, ctx.lang.t("ItemTrendHandle.Fail"));
}

/**
 * Stub explícito: nenhum handler C# de referência existe (em `vendor/`) pro ITEM_TREND virar algo além
 * de no-op (a tabela `Item_Refinery` tem 0 linhas — ver `itemTrend` acima). Os outros 5 pacotes que já
 * passaram por aqui saíram todos com fonte real: 313 ITEM_CELL_IS_LOCKED (`trava-slot.ts`), 110/111
 * ITEM_REFINERY(_PREVIEW) (`refinaria.ts`, design próprio), 295/391/308 (`refinar-conjunto.ts`,
 * `espirito-do-equipamento.ts`, `aprimorar.ts` — fonte `barrydevp/ddt3.4server`/`ddt3.8`).
 */
export const STUB_PACKETS: [code: number, name: string][] = [];
