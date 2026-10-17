/**
 * Aba no jogo: Forja › Ferraria › Compor. Jogador coloca equipamento (slot 1) + pedra de composição
 * (slot 2) + opcional pedra da sorte (slot 0) e tenta gravar um atributo fixo (ataque/defesa/agilidade/sorte)
 * no equipamento.
 * Pacotes: 58 ITEM_COMPOSE.
 * C#: `ItemComposeHandler.cs` (chance em `:58-118`).
 * Como testar: `formulas.test.ts` (`composeChance`, fórmula pura). Manual: Forja → Ferraria → Compor →
 * arrastar equipamento + pedra → clicar compor → atributo (ex. `AttackCompose`) sobe ou nada muda.
 */
import { GSPacket } from "@ddt/protocol";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";
import { getEquipControl } from "../../db/consortia.js";
import { personalRiches, smithBonusLevel } from "../../game/consortia.js";
import { FORGE_SLOT, bagLocked } from "./bancada.js";

/** ItemComposeHandler.composeRate (by stone quality 1..5). */
export const COMPOSE_RATE = [0.8, 0.5, 0.3, 0.1, 0.05];

type ComposeAttribute = "AttackCompose" | "DefendCompose" | "AgilityCompose" | "LuckCompose";
const COMPOSE_ATTRIBUTE_BY_PROPERTY: Record<number, ComposeAttribute> = {
  1: "AttackCompose",
  2: "DefendCompose",
  3: "AgilityCompose",
  4: "LuckCompose",
};

/** ItemComposeHandler.cs:58-118: success if floor(rate*10)/10 > Random.Next(100). */
export function composeChance(stoneQuality: number, luckP2: number | null, smithLevel = 0): number {
  let p = (COMPOSE_RATE[stoneQuality - 1] ?? 0) * 100;
  if (luckP2 != null) p += (p * luckP2) / 100;
  else p += (p * 1) / 100; // C#: "+1%" when no luck stone
  if (smithLevel > 0) p *= 1 + 0.1 * smithLevel;
  return Math.floor(p * 10) / 10;
}

/**
 * Composição no jogo: grava atributo (`AttackCompose`/`DefendCompose`/`AgilityCompose`/`LuckCompose`) no equipamento.
 * Contrapartida C#: `ItemComposeHandler.cs` (pacote 58 ITEM_COMPOSE).
 * Pacote que lê: `boolean useGuild`; usa bancada `storeBag` (slot 1 equipamento, slot 2 pedra, slot 0 sorte) e cobra `PRICE_COMPOSE_GOLD` (padrão 1600). Resposta `GSPacket(58)`: `[byte ok]` (`0`=sucesso, `1`=falha).
 * Exemplo concreto: colar no slot 1 + pedra `Property3=1/Property4=50` no slot 2, `prob=42.5 > rand=10` → `AttackCompose=50`, consome pedra + 1600 ouro, responde byte `0`.
 * IMPORTANTE: ao contrário de `fortalecer.ts` (`guildSmith` manda e segue mesmo negado), aqui a negação de
 * permissão da guilda ABORTA a composição inteira (`return` com `"ItemStrengthenHandler.FailbyPermission"`) —
 * essa diferença já existia no C# original (`ItemComposeHandler.cs` vs `ItemStrengthenHandler.cs`), não é bug do porte.
 * Como lê esse código (cada variável):
 * - `mustGold`: custo em ouro lido de `cfgInt("PRICE_COMPOSE_GOLD", 1600)`.
 * - `useGuild`: `boolean` do pacote; `true` = tenta bônus de ferreiro da guilda.
 * - `store`: bancada da forja (`p.storeBag`); slots 1 equipamento, 2 pedra, 0 sorte.
 * - `item`: equipamento em `store.getItemAt(1)`; contém `CanCompose` e campos `*Compose`.
 * - `composeStone`: pedra de composição em `store.getItemAt(2)` (`CategoryID===11`, `Property1===1`); `Property3` = atributo, `Property4` = valor.
 * - `luckCandidate`: item cru do slot 0; `luckStone`: pedra da sorte validada (`CategoryID===11`, `Property1===3`) ou `null`.
 * - `isBinds`: amarração resultante (`item.IsBinds || composeStone.IsBinds || luckStone.IsBinds`).
 * - `smith`: nível de ferreiro da guilda (`0` sem `useGuild`); multiplica taxa por `(1+0.1*SmithLevel)`.
 * - `equipControl`: controle `Equip_Control` da guilda (`getEquipControl(...,0,2)`); `smithBonus`: resultado `smithBonusLevel` com `denied/level`.
 * - `successChance`: chance de `composeChance(Quality, luckStone.Property2, smith)`; `roll`: sorteio `Math.floor(rnd()*100)`.
 * - `attribute`: campo alterado (`AttackCompose|DefendCompose|AgilityCompose|LuckCompose`) via `composeStone.Property3 (1|2|3|4)`.
 * - `resultCode`: `1`=falha, `0`=sucesso (`successChance > roll` grava `item[attribute]=composeStone.Property4`).
 * - `out`: `GSPacket(58, p.id)` de resposta com `writeByte(resultCode)`.
 */
export async function compose(ctx: ServerContext, p: GamePlayer, pkt: GSPacket, rnd = Math.random): Promise<void> {
  const mustGold = ctx.templates.cfgInt("PRICE_COMPOSE_GOLD", 1600);
  if (bagLocked(ctx, p)) return;
  if (p.info.Gold < mustGold) return p.sendMessage(1, ctx.lang.t("ItemComposeHandler.NoMoney"));
  const useGuild = pkt.readBoolean();
  const store = p.storeBag;
  const item = store.getItemAt(FORGE_SLOT.composeItem);
  const composeStone = store.getItemAt(FORGE_SLOT.composeStone);
  if (!item || !composeStone || composeStone.Count <= 0) return p.sendMessage(1, ctx.lang.t("ItemComposeHandler.Msg"));
  // Port: the stone must be a compose stone (cat 11, Property1 1); the C# only checked it for items of category >= 10.
  if (!item.template.CanCompose || !(composeStone.template.CategoryID === 11 && composeStone.template.Property1 === 1)) {
    return p.sendMessage(0, ctx.lang.t("ItemComposeHandler.Fail"));
  }
  const luckCandidate = store.getItemAt(FORGE_SLOT.composeLuck);
  const luckStone = luckCandidate && luckCandidate.template.CategoryID === 11 && luckCandidate.template.Property1 === 3 ? luckCandidate : null;
  const isBinds = item.IsBinds || composeStone.IsBinds || !!luckStone?.IsBinds;
  // ItemComposeHandler.cs:105-130: guild smith multiplies the rate by (1 + 0.1 × SmithLevel); refused without riches
  let smith = 0;
  if (useGuild) {
    const equipControl = p.info.ConsortiaID ? await getEquipControl(ctx.db.db, p.info.ConsortiaID, 0, 2) : undefined;
    const smithBonus = smithBonusLevel(true, p.info.ConsortiaID !== 0, p.info.SmithLevel, personalRiches(p.info), equipControl);
    if (smithBonus.denied) return p.sendMessage(1, ctx.lang.t("ItemStrengthenHandler.FailbyPermission"));
    smith = smithBonus.level;
  }
  const successChance = composeChance(composeStone.template.Quality, luckStone ? luckStone.template.Property2 : null, smith);
  const roll = Math.floor(rnd() * 100);
  const attribute = COMPOSE_ATTRIBUTE_BY_PROPERTY[composeStone.template.Property3];
  if (!attribute || !(composeStone.template.Property4 > item[attribute])) return p.sendMessage(0, ctx.lang.t("ItemComposeHandler.NoLevel"));
  let resultCode = 1;
  if (successChance > roll) {
    resultCode = 0;
    item[attribute] = composeStone.template.Property4;
  }
  item.IsBinds = isBinds;
  store.beginChanges();
  try {
    store.removeTemplate(composeStone.TemplateID, 1);
    if (luckStone) store.removeTemplate(luckStone.TemplateID, 1);
    store.updateItem(item);
  } finally {
    store.commitChanges();
  }
  p.removeGold(mustGold);
  if (resultCode === 0) p.questInv?.onItemCompose(composeStone.TemplateID);
  const out = new GSPacket(58, p.id);
  out.writeByte(resultCode);
  p.send(out);
  p.updatePlayerProperties();
}
