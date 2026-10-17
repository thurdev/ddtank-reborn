/**
 * Aba no jogo: Forja › Forno › Refinar conjunto. Consome um item específico (`SetsBuildTemp.UseItemTemplate`)
 * da bolsa de itens pra subir a barra `fineSuitExp` do personagem; ao cruzar os limiares de
 * `SetsBuildTemp` (70 níveis, 5 "SetsType" de 14 níveis cada), o conjunto sobe de nível e o cliente
 * mostra o bônus (`FineSuitManager`/`FineForgeView.as`).
 * Pacotes: 295 STORE_FINE_SUIT, sub-tipo 1 FORGE_SUIT (único sub-tipo usado pelo cliente) → resposta
 * `GSPacket(295)` `[byte 1, boolean result, int fineSuitExp]`.
 * C#: nenhum handler existe em `vendor/DDTank41`/`vendor/DDT-6600` (tela do cliente — `store/fineStore/**`
 * — nunca ligada no servidor base deste projeto, ver `research/qa/feature-sources.md`). Porte 1:1 de
 * `barrydevp/ddt3.4server` (`Game.Server/Game.Server.Packets/Added/FineStoreSuitHandler.cs` +
 * `Bussiness/Bussiness.Managers/SetsBuildTempMgr.cs`), licença não publicada no repo — ver
 * `THIRD_PARTY_NOTICES.md`. CORREÇÃO (achado nesta sessão): a tabela de dados `SetsBuildTemp` JÁ EXISTIA
 * no catálogo original como `game."Sets_Build_Temp"` (70 linhas reais no `.bak`, seed em
 * `packages/db/seed/game/Sets_Build_Temp.json.gz` — os valores batem byte a byte com o `Request/SetsBuildTemp.xml`
 * do fork, mesma linhagem de dados) — só nunca tinha sido carregada por `apps/game` nem servida ao cliente
 * dinamicamente; o endpoint `SetsBuildTemp.xml` já existia em `apps/api/src/templates/defs.ts`. Nenhuma
 * tabela/migration nova precisou ser criada pra esta tela (ver `apps/game/src/db/templates.ts:loadForge`).
 * Persistência: `player."Sys_Users_Detail".fineSuitExp` — coluna que JÁ existia no catálogo original
 * (reservada, nunca escrita por nenhum handler). Adicionada a `SAVED_DETAIL_COLUMNS` (`game/player-info.ts`).
 * Como testar: `apps/game/test/forge-fine-suit.test.ts`.
 * Manual: Forja → Forno → Refinar conjunto → ter o item certo (`needForgeCellId`) na bolsa → clicar
 * forjar → `fineSuitExp` sobe; ao cruzar nível, o bônus de conjunto do personagem muda.
 */
import { GSPacket } from "@ddt/protocol";
import { ItemInfo } from "../../game/item.js";
import type { GamePlayer } from "../../game/player.js";
import type { ServerContext } from "../../session/context.js";

/** FineStorePackageType.FORGE_SUIT (store/fineStore/data/FineStorePackageType.as:5) — único sub-tipo usado. */
const FORGE_SUIT = 1;

/**
 * Refinar conjunto no jogo: gasta `count` unidades do item do nível atual pra somar `Property2 × count`
 * de EXP em `fineSuitExp`, até o teto do nível (`SetsBuildTemp.Exp`); excesso que não fecha outra
 * unidade inteira é devolvido como itens (`ItemInfo.createFromTemplate`).
 * Contrapartida C#: `FineStoreSuitHandler.cs` (pacote 295 STORE_FINE_SUIT, sub-tipo 1 FORGE_SUIT).
 * Pacote que lê: `[byte cmd, int count]` (`count===0` = usar toda a pilha, igual ao checkbox
 * "usar tudo" do cliente — `FineForgeView.as:__onClickForgeBtn`).
 * Como lê esse código (cada variável):
 * - `useItem`: linha de `SetsBuildTemp` do PRÓXIMO nível (`findNextSetsBuild(fineSuitExp)`); `null` ou
 *   `fineSuitExp` já no teto (`setsBuildMaxExp()`) = nada a fazer, responde `result=false` sem gastar nada.
 * - `item`: item do nível (`useItem.UseItemTemplate`) na `propBag`; precisa `item.Count >= count`.
 * - `maxExp`: teto do nível atual (`useItem.Exp`); `fineSuitExp` nunca passa disso nesta chamada.
 * - excesso: quando a soma passa `maxExp`, devolve como itens as unidades que não couberam
 *   (`needExp / Property2` unidades, divisão inteira) — replica o troco do original.
 * - `result`: só `true` quando `propBag.removeTemplate` de fato consome o item.
 * - nível sobe (chama `updatePlayerProperties`) só quando o PRÓXIMO `useItem` (recalculado com o novo
 *   `fineSuitExp`) tem `Level` maior que o `useItem` usado nesta chamada.
 */
export async function forgeSuit(ctx: ServerContext, p: GamePlayer, pkt: GSPacket): Promise<void> {
  const cmd = pkt.readByte();
  if (cmd !== FORGE_SUIT) return; // cliente só manda FORGE_SUIT; outros sub-tipos não existem no original

  let count = pkt.readInt();
  let fineSuitExp = p.info.fineSuitExp;
  let result = false;

  const useItem = ctx.templates.findNextSetsBuild(fineSuitExp);
  if (useItem && fineSuitExp < ctx.templates.setsBuildMaxExp()) {
    const item = p.propBag.getItemByTemplateID(0, useItem.UseItemTemplate);
    if (item && item.Count >= count) {
      if (count === 0) count = item.Count;
      const maxExp = useItem.Exp;
      fineSuitExp += item.template.Property2 * count;
      if (fineSuitExp > maxExp) {
        const needExp = fineSuitExp - maxExp;
        fineSuitExp = maxExp;
        if (needExp >= item.template.Property2) {
          const count2 = Math.trunc(needExp / item.template.Property2);
          const addBack = ItemInfo.createFromTemplate(item.template, count2, 105, ctx.now());
          p.propBag.addTemplate(addBack, count2);
        }
      }
      result = p.propBag.removeTemplate(useItem.UseItemTemplate, count);
    }
  }

  const out = new GSPacket(295, p.id);
  out.writeByte(FORGE_SUIT);
  out.writeBoolean(result);
  out.writeInt(fineSuitExp);
  p.send(out);

  if (result) {
    p.info.fineSuitExp = fineSuitExp;
    const newUseItem = ctx.templates.findNextSetsBuild(fineSuitExp);
    if (newUseItem && useItem && useItem.Level < newUseItem.Level) p.updatePlayerProperties();
  }
}
