# Loja

## 1. O que é no jogo
A loja principal (abas de equipamento, consumíveis, pacotes promocionais...),
comprada em até 7 "moedas" diferentes (ouro, cupom, mérito, medalha de presente,
score de PvE, score de pet, score de dano). Também cobre presentear item a um
amigo e renovar a validade de um item alugado/temporário. A loja de **props de
combate** (granada, mina... que entram direto na mochila de luta) é um sistema
separado — ver `loja/props-de-luta.ts`.

## 2. Onde fica no código
| Ação | Pacote | Servidor TS | C# original | Tabelas |
|---|---|---|---|---|
| Comprar item da loja | 44 BUY_GOODS | [`buyGoods`](../../apps/game/src/handlers/loja/comprar.ts) `loja/comprar.ts` | — (sem handler explícito no 4.1; porte segue `ShopMgr`) | `game."Shop_Goods"` (catálogo), `player."Sys_Users_Goods"` |
| Presentear item (compra pra outro jogador) | 221 USER_SEND_GIFTS | [`sendGift`](../../apps/game/src/handlers/loja/presentear.ts) `loja/presentear.ts` | `UserSendGiftHandler.cs` | `game."Shop_Goods"` |
| Renovar validade de item | 62 ITEM_CONTINUE | [`itemContinue`](../../apps/game/src/handlers/loja/renovar.ts) `loja/renovar.ts` | `UserItemContineueHandler.cs` | `player."Sys_Users_Goods"` |
| Resgatar presente recebido | 218 USER_GET_GIFTS | [`bolsa/presentes-recebidos.ts`](../../apps/game/src/handlers/bolsa/presentes-recebidos.ts) | `PlayerGiftHandler.cs` | `player."Sys_Users_Goods"` |
| Pacote-presente (BUY_GIFTBAG) | 46 BUY_GIFTBAG | [`loja/pacote-presente.ts`](../../apps/game/src/handlers/loja/pacote-presente.ts) | `BuyGiftBagHandler.cs` | `game."Shop_Goods"` |
| Compra rápida de caixa de ouro | 126 BUY_QUICK_GOLDBOX | [`loja/bau-rapido-ouro.ts`](../../apps/game/src/handlers/loja/bau-rapido-ouro.ts) | `QuickBuyGoldBoxHandler.cs` | `game."Shop_Goods"` |
| Presentear via loja (vitrine de amigo) | 57 GOODS_PRESENT | [`loja/presentear-vitrine.ts`](../../apps/game/src/handlers/loja/presentear-vitrine.ts) | `UserPresentGoodsHandler.cs` | — |
| Estoque diário global (contador) | 168 GOODS_COUNT | [`loja/estoque-diario.ts`](../../apps/game/src/handlers/loja/estoque-diario.ts) | `GoodsCountHandler.cs` | — (sempre devolve lista vazia, ver nota) |

## 3. Fluxo passo a passo (comprar um item)
1. Cliente manda `44 BUY_GOODS` com o `ID` da linha de `game."Shop_Goods"` e quantidade.
2. `buyGoods()` (`loja/comprar.ts`) busca a linha (`ctx.templates.shop`), confere
   `canBuyShop(shopId, guild)` (`loja/preco.ts`) — algumas abas (ex. 11-15) só compram
   se o jogador tiver acesso de guilda (`canBuyGuildShop`).
3. `setItemType()` (`loja/preco.ts`) resolve o preço real: cada item de loja tem 3
   "tiers" de preço (A/B/C, cada um com até 3 moedas) — `getItemPrice()`
   (`loja/preco.ts`) traduz o código de moeda (`-1` Money, `-2` Gold, `-3` Offer, `-4`
   GiftToken, `-6` Score, `-8` petScore, `-9` damageScore; valor positivo = precisa de
   outro item como "moeda").
4. Confere se o jogador tem tudo, debita, cria o(s) `ItemInfo` via
   `ItemInfo.createFromTemplate`, tenta colocar na bolsa certa (`templateBagType`); se
   não couber, manda por carta (`mailItems`, ver [correio.md](./correio.md)).
5. Responde atualização de slots/bolsa (`64 GRID_GOODS`) e, se gastou moeda "status"
   (ouro/cupom/mérito), atualiza a UI de recursos do jogador.

## 4. Quero mudar…
- **Preço/moeda de um item da loja**: tabela `game."Shop_Goods"` — linhas `AUnit`,
  `BUnit`, `CUnit`, `Beat` (desconto) editáveis pelo admin em **Loja**
  (`apps/admin/src/resources/content.ts`, recurso `shop`, rota `/shop`). Campos
  `TemplateID` (item vendido), `ShopID` (aba), `StartDate/EndDate` (promoção por
  período), `LimitCount`/`LimitGrade` (limite de compra/nível mínimo).
- **Qual aba de loja aceita o quê (guilda, etc.)**: `canBuyShop()` em `loja/preco.ts` —
  faixas de `shopId` fixas no código (1-4 geral, 20/72/91 sempre vinculado, 11-15 só
  guilda).
- **Tradução de código de moeda pra campo do jogador**: `getItemPrice()` em
  `loja/preco.ts` — mudar aqui só se for **adicionar uma moeda nova**, não pra mexer em
  preço de item (isso é na tabela).
- **Estoque diário por item**: hoje o limite de algumas lojas (ex. id 20) é checado
  **por jogador**, não como contador global compartilhado (diferente do C# original,
  que tinha estoque mundial) — ver nota em `loja/estoque-diario.ts`. Pra reativar estoque
  global seria preciso portar `WorldMgr.GetAllShopFreeCount`.

## 5. Testes
- `apps/game/test/shop-prop-misc.test.ts` — `describe("shop-prop: 57 GOODS_PRESENT / 46 BUY_GIFTBAG / 126 BUY_QUICK_GOLDBOX")`.
- `apps/game/test/handlers.test.ts` cobre parte de compra básica.
- Status: **OK** (44/46/57/62/126/218/221 implementados); `168 GOODS_COUNT` parcial (estoque não é global, só devolve lista vazia — ver nota acima).
