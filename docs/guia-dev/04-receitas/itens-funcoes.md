# Função de um item — de ponta a ponta

Um "item" é uma linha em `game."Shop_Goods"` (PK `TemplateID`). A **categoria**
(`CategoryID`) decide o que o jogo deixa você fazer com ele (equipar, usar, abrir), e os
campos `Property1`-`Property8` são parâmetros livres cujo significado depende da categoria
(igual uma union/`switch` gigante — não tem documentação central no C# original além do
próprio código, então a fonte da verdade é sempre "onde o campo é lido").

**Como verificar**: lido/confirmado contra `apps/admin/src/resources/items.ts` (categorias
reais em produção), `apps/client/src/game/bagAndInfo/bag/CellMenu.ts`+`BagView.ts` (decide
o botão do menu), `apps/client/src/game/ddt/data/EquipType.ts` (constantes), e os handlers
server citados (lidos, não todos exercitados ao vivo — `cardUse`/`openBox` foram verificados
rodando em vitest, ver [testes.md](./testes.md)).

## 1. Campos que valem pra TODO item (`Shop_Goods`, `packages/db/src/schema/game.ts:2348`)

| Campo | Tipo | Pra quê |
|---|---|---|
| `TemplateID` | PK | Identidade do item em todo o jogo (bolsa, loja, drop, pacote). |
| `CategoryID` | int | **O que o item É** — ver tabela §2. Decide ícone (`itemIconRel`), slot de equipar (`placeForCategory`), botão do menu (`EquipType.canEquip/canBeUsed/isCardBox/...`). |
| `CanEquip`/`CanUse`/`CanDrop`/`CanDelete`/`CanStrengthen`/`CanCompose` | bool | Flags de regra — checadas no handler relevante (equipar é `CHANGE_PLACE_GOODS`, consumir é `CARD_USE`/`PROP_USE`, etc.). |
| `Property1`..`Property8` | int | **O que o item FAZ** dentro da categoria — significado depende de `CategoryID` (ver §2 e §3). |
| `MaxCount` | int | Pilha máxima (1 = não empilha). |
| `NeedLevel`/`NeedSex` | int | Requisito de nível/sexo pra equipar/usar. |
| `Pic` | texto | Nome da pasta/arquivo de imagem (ver [trocar-icone-imagem.md](./trocar-icone-imagem.md)). |
| `BindType` | int | Vínculo (não pode negociar/vender depois de X). |
| `Script` | texto | Script de efeito opcional (poucas categorias usam). |

## 2. Categorias (`CategoryID`) — o que cada uma faz e onde

Lista oficial (igual ao admin, `apps/admin/src/resources/items.ts:14-54`, espelhando
`EquipType.as:163-327`):

| CategoryID | Categoria | Vira equipável? | Vira "Usar"/"Abrir"? | Onde o uso é tratado |
|---|---|---|---|---|
| 1 Chapéu, 2 Óculos, 3 Cabelo, 4 Olhos, 5 Roupa, 6 Rosto, 7 Arma, 8 Bracelete, 9 Anel, 13 Traje, 14 Colar, 15 Asas, 17 Arma secundária, 40 Emblema | equipamento | **Sim** — `EquipType.canEquip` true; slot via `placeForCategory(categoryId)` (`apps/game/src/game/item.ts:38`) | não | Arrastar para o slot = `49 CHANGE_PLACE_GOODS` (`apps/game/src/handlers/bolsa/mover.ts:100`) — equipar É mover. |
| 11 Consumível/material | genérico, parametrizado por `Property1` | não (regra abaixo) | **depende de `Property1`** — ver §3 | `183 CARD_USE`/`186 PROP_USE` (`apps/game/src/handlers/bolsa/usar-carta.ts`) |
| 16 Balão de chat | consumível de chat | não | Usar (CategoryID 11 variante, Property1="5") | `showChatBugleInputFrame` (client) + handler de chat |
| 18 Caixa de carta | caixa | não | **Abrir** — `EquipType.isCardBox` true | `63 ITEM_OPENUP` (`apps/game/src/handlers/bolsa/abrir-caixa.ts`) |
| 19 Pedra de cura | pedra de cura | não (regra própria) | Usar com checagem de nível (`Property1`) | `usar-carta.ts` (via drag, `__onCellResponse`) |
| 24 Carta de título | título | não | Usar | `sendNewTitleCard` → handler de títulos (`apps/game/src/handlers/bolsa/titulos.ts`) |
| 27/28/29/31 Armas/bracelete/anel/arma-sec. temporários | equip. temporário | Sim (slot temporário) | — | mesma mecânica de equipar, campos `Property` controlam duração |
| 32 Semente, 33 Adubo, 34 Comida, 36 Vegetal | fazenda/pet | não | consumido pelo sistema de Fazenda/Mascote | `apps/game/src/handlers/fazenda/*`, `apps/game/src/game/pets.ts` |
| 35 Ovo de pet | ovo | não | **Abrir** — `EquipType.isPetEgg` true | `68 PET` sub 2 (`apps/game/src/handlers/mascote/chocar-ovo.ts`) |
| 50/51/52 Equip. de pet (braço/cabeça/roupa) | equip. de pet | Sim (bolsa do pet) | — | `68 PET` sub 20/21 (`apps/game/src/handlers/mascote/equipamento.ts`) |

## 3. Dentro da categoria 11 (a "genérica") — o que `Property1` significa

Categoria 11 (`UNFRIGHTPROP`) é onde a maioria dos consumíveis "especiais" mora. O cliente
decide o botão do menu (`EquipType.canBeUsed`, `EquipType.isPackage`, `EquipType.isCard`,
`CellMenu.ts`) e, ao clicar "Usar", `BagView.__cellUse`
(`apps/client/src/game/bagAndInfo/bag/BagView.ts:1133+`) faz um `if` gigante por
`TemplateID`/`Property1` ANTES de cair no genérico. Valores conhecidos de `Property1`
dentro da categoria 11:

| `Property1` | Significa | Botão do menu | Tratado em |
|---|---|---|---|
| `"5"` (e `Property2 != "0"`) | Buzina de chat (bugle) | Usar → abre janela de digitar texto | client-only até mandar `163`-ish; ver `showChatBugleInputFrame` |
| `"6"` | Caixa/pacote (`isPackage`) | **Abrir** | `63 ITEM_OPENUP` (`abrir-caixa.ts`) — sorteio real, ver [item-com-menu-e-acao.md](./item-com-menu-e-acao.md) |
| `"12"`/`"13"` | Carta (`isCard`) | Usar (pode ter "Abrir tudo" se empilhado, `isCanBatchHandler`) | `183 CARD_USE` |
| `"21"` | Pílula de GP | Usar → soma `Property2 × quantidade` de GP e consome a pilha inteira | `cardUse()` caso `Property1===21` (`usar-carta.ts:72-81`) |
| `"23"` | Dias de VIP | Usar → `applyVipDays(Property2 ou ValidDate dias)` | `cardUse()` caso `Property1===23` (`:82-93`) |
| `"27"`/`"29"` | Item de pet com requisito de nível 25 | Usar bloqueado por nível | `BagView.__cellUse` |
| `"37"` | Cápsula de cor de bala | Usar (requer arma +10) | `sendUseChangeColorShell` |
| `"100"` | Prop especial (`useProp`) | Usar → `186 PROP_USE` em vez de `183 CARD_USE` | `useProp()` (`BagView.ts:1300`) |
| qualquer outro valor | **Buff genérico** | Usar | `cardUse()` fallback: `addItemBuff(p, template, item.ValidDate, now)` — cria/estende um buff (`BuffRow`) por `Property1` (tipo), `Property2` (valor), `Property3` (contagem) |

**Isso significa**: se você criar um item novo CategoryID 11 com `CanUse=true` e um
`Property1` que **não** bate com nenhum caso especial acima (nem no cliente nem no
servidor), ele automaticamente se comporta como um **buff genérico** (cai no fallback de
`cardUse()`) — é o caminho de menor esforço pra um consumível novo. Pra uma ação totalmente
customizada (abrir uma tela própria, rodar um minigame), veja
[item-com-menu-e-acao.md](./item-com-menu-e-acao.md).

## 4. Como testar uma mudança de categoria/Property sem tocar em nada real

```ts
// vitest, mesma base de apps/game/test/
const tpl = tplPartial({ TemplateID: 999999, CategoryID: 11, Property1: 21, Property2: 500, CanUse: true });
// ... loggedIn(server), addTemplateToBag, c.out(183 CARD_USE, ...), c.code(183) ...
```

Ver [testes.md](./testes.md) pro padrão completo de `loggedIn()`/`FakeClient`.
