# Bolsa e personagem

## 1. O que é no jogo
A janela de inventário (`Bolsa`) e a ficha do personagem (`Personagem`): arrastar
item entre slots, equipar/desequipar, abrir caixas, usar pergaminhos de atributo
(Texp), trocar cor de equipamento, mudar sexo, trocar apelido, ver/mostrar título,
mostrar tag de guilda sobre a cabeça, e enviar presentes de aniversário.

## 2. Onde fica no código
| Ação | Pacote | Servidor TS | C# original | Tabelas |
|---|---|---|---|---|
| Arrastar item (bolsa↔bolsa, split, empilhar) | 49 CHANGE_PLACE_GOODS | [`changeItemPlace`](../../apps/game/src/handlers/bolsa/mover.ts#L24) `bolsa/mover.ts:24`, registro no fim do arquivo | — (regra nova, ver nota) | `player."Sys_Users_Goods"` |
| Equipar item (ver equip de qualquer jogador) | 74 ITEM_EQUIP | [`bolsa/ver-equipamento.ts`](../../apps/game/src/handlers/bolsa/ver-equipamento.ts) | `UserEquipListHandler.cs` | `player."Sys_Users_Goods"` |
| Mostrar/ocultar tag de guilda | 34 USER_RANK | [`bolsa/mostrar-guilda.ts`](../../apps/game/src/handlers/bolsa/mostrar-guilda.ts) | `ChangeDesignationHandler.cs` | `Sys_Users_Detail.IsShowConsortia` |
| Abrir caixa/pacote | 63 ITEM_OPENUP | [`openBox`](../../apps/game/src/handlers/bolsa/abrir-caixa.ts) `bolsa/abrir-caixa.ts` | `OpenUpArkHandler.cs` | `game.LoadUserBox` (tabela de drops da caixa) |
| Usar pergaminho de atributo (Texp) | 99 TEXP | [`texp`](../../apps/game/src/handlers/bolsa/treino-atributos.ts) `bolsa/treino-atributos.ts` | `TexpHandler.cs` | `player."Sys_Users_Goods"` |
| Usar carta (buff/GP/VIP) | 183 CARD_USE | [`cardUse`](../../apps/game/src/handlers/bolsa/usar-carta.ts) `bolsa/usar-carta.ts` | `CardUseHandler.cs` | `player."Sys_Users_BufferAdd"` |
| Esconder camada de visual | 60 ITEM_HIDE | [`bolsa/ocultar-visual.ts`](../../apps/game/src/handlers/bolsa/ocultar-visual.ts) | `UserHideItemHandler.cs` | `player."Sys_Users_Goods"` |
| Trocar cor de equipamento | 182 USE_COLOR_CARD | [`bolsa/trocar-cor.ts`](../../apps/game/src/handlers/bolsa/trocar-cor.ts) | `UserChangeItemColorHandler.cs` | `player."Sys_Users_Goods"` |
| Trocar sexo | 252 USE_CHANGE_SEX | [`bolsa/trocar-sexo.ts`](../../apps/game/src/handlers/bolsa/trocar-sexo.ts) | `ChangeSexHandler.cs` | `Sys_Users_Detail.Sex` |
| Trocar apelido | 171 USE_REWORK_NAME | [`bolsa/trocar-apelido.ts`](../../apps/game/src/handlers/bolsa/trocar-apelido.ts) | — | `Sys_Users_Detail.NickName` |
| Ver conquistas/pontos de esforço (seu ou de outro) | 203 LOOKUP_EFFORT | [`bolsa/conquistas.ts`](../../apps/game/src/handlers/bolsa/conquistas.ts) | `LookupEffortHandler.cs:655` | `Sys_Users_Detail.AchievementPoint` |
| Comparar item pelo link do chat | 119 LINKREQUEST_GOODS | [`bolsa/comparar-item.ts`](../../apps/game/src/handlers/bolsa/comparar-item.ts) | `GetLinkGoodsHandler.cs:695` | `player."Sys_Users_Goods"` |
| Reroll de atributo de carta na bolsa | 196 CARD_RESET | [`bolsa/reroll-carta.ts`](../../apps/game/src/handlers/bolsa/reroll-carta.ts) | `CardResetHandler.cs:548` | `game.CardUpdateCondition` |
| Mostrar/trocar título | 189 USER_CHANGE_RANK, 265 NEWTITLE_CARD | [`bolsa/titulos.ts`](../../apps/game/src/handlers/bolsa/titulos.ts) | `ReworkRankHandler.cs`, `NewTitleCardHandler.cs` | `player."Sys_Users_Goods"` |
| Organizar bolsa automaticamente | 124 CHANGE_PLACE_GOODS_ALL | [`arrangeBag`](../../apps/game/src/handlers/bolsa/organizar-bolsa.ts) `bolsa/organizar-bolsa.ts` | `ArrangeBagHandler.cs` | — |
| Resgatar presente (aniversário/sistema) | 218 USER_GET_GIFTS | [`bolsa/presentes-recebidos.ts`](../../apps/game/src/handlers/bolsa/presentes-recebidos.ts) | `PlayerGiftHandler.cs` | `player."Sys_Users_Goods"` |

> Nota sobre `49 CHANGE_PLACE_GOODS` estar marcado `"partial"`: `changeItemPlace`
> cobre mover/empilhar/trocar/split dentro e entre a maioria das bolsas, mas algumas
> combinações de bolsa de destino (ex. regras finas de bolsa de banco/consórcio) ainda
> não espelham 100% o C# — ver comentário no topo de `bolsa/mover.ts`.

## 3. Fluxo passo a passo (exemplo: equipar um item)
1. Jogador arrasta um item da bolsa de prop para um slot de equipamento no cliente.
2. Cliente manda `49 CHANGE_PLACE_GOODS` com `bagType`, `place`, `toBag`, `toPlace`,
   `count`.
3. `changeItemPlace` (`bolsa/mover.ts`) confere se o item pode ir pra aquele slot
   (nível mínimo, sexo, se é arma/armadura compatível — via `canEquip` hook de
   `inventory.ts`), move o `ItemInfo` entre as duas `PlayerInventory`.
4. A bolsa de origem e destino chamam `onSlotsChanged` → servidor responde
   `64 GRID_GOODS` com os slots que mudaram (ver [COMO-FUNCIONA.md](./COMO-FUNCIONA.md) §1).
5. Se o equipamento mudou os atributos totais, `p.updatePlayerProperties()` recalcula
   e propaga (ex. ataque/defesa na ficha).
6. Nada é gravado no banco nesse momento — fica em memória até o próximo
   `saveIntoDatabase` (autosave periódico, logout, ou `172 SAVE_DB`).

## 4. Quero mudar…
- **Quais categorias de item podem ser equipadas / em qual bolsa caem**:
  `templateBagType()` em `apps/game/src/game/item.ts:30` (`switch (t.CategoryID)`).
- **Regra de quem pode equipar o quê (nível/sexo)**: hook `canEquip` passado pra
  `PlayerInventory` — procurar `canEquip` em `apps/game/src/game/player.ts`.
- **Custo de trocar apelido/sexo/cor**: ler o preço de dentro de cada handler
  (`bolsa/trocar-sexo.ts` troca de sexo, `bolsa/trocar-cor.ts` troca de cor,
  `bolsa/trocar-apelido.ts` troca de nome) — cada um lê um item/preço da tabela
  `game."Shop_Goods"` associado ao `TemplateID` do item consumível correspondente.
- **O que cada caixa pode dropar**: tabela `game."LoadUserBox"` (seed
  `LoadUserBox.json.gz`), lida por `createItemBox()` (`bolsa/abrir-caixa.ts`).
- **Limite diário de Texp**: `bolsa/treino-atributos.ts` — `p.info.Grade * (p.info.VIPLevel <= 2 ? 2 : 3)`.

## 5. Testes
- `apps/game/test/handlers.test.ts` cobre vários pacotes básicos de item/chat.
- `apps/game/test/forge-advanced.test.ts` — `describe("ItemInfo.isDrill...")`, cobre leitura de item.
- `apps/game/test/pets-cards-vip.test.ts` — parte de cartas/VIP que também passa pela bolsa.
- Sem teste dedicado hoje para troca de sexo/cor/apelido isoladamente (cobertura indireta).
- Status: **OK** pra equipar/mover/abrir caixa/Texp/cartas; **parcial** em `CHANGE_PLACE_GOODS` (casos de borda entre bolsas especiais) e `GOODS_COUNT` (estoque diário global não é compartilhado entre jogadores, ver nota em `loja/estoque-diario.ts`).
