# Mapa do jogo — tela → cliente → pacote → servidor → C#

Gerado por `node tools/docs/game-map.mjs` (não editar à mão). Como achar uma feature:
1. Ache a tela abaixo (nome que aparece no jogo).
2. A coluna **Cliente** mostra o arquivo AS3 do botão/janela (`vendor/DDTank41/Source Flash/src/...`).
3. **Pacote** é o número que o cliente manda; **Servidor** é o arquivo:linha em TS que responde (Ctrl+clique).
4. **C# original** é a base que foi portada (só leitura).

Fluxo de qualquer ação: clique no cliente → `GameSocketOut.sendX()` manda o pacote → `handlers/<arquivo>.ts`
(`r.player(código, ...)`) lê os bytes → muda o jogador/bolsa → responde com pacote de `packets/out.ts` → salva em
`game/player.ts` `saveIntoDatabase` (ao sair e a cada 10 min).

## accumulativeLogin

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendAccumulativeLoginAward` | `accumulativeLogin/view/AccumulativeLoginView.as` | 338 ACCUMULATIVELOGIN_AWARD | [accumulativeLoginHandler](../apps/game/src/handlers/eventos/index.ts#L64) `apps/game/src/handlers/eventos/index.ts:64` | `vendor/DDTank41/Game.Server/Packets/Client/AccumulAtiveLoginAwardHandler.cs` |

## Amigos / chat privado

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendItemEquip` | `im/IMController.as`<br>`im/messagebox/MessageBoxItem.as` | 74 ITEM_EQUIP | [async](../apps/game/src/handlers/bolsa/ver-equipamento.ts#L14) `apps/game/src/handlers/bolsa/ver-equipamento.ts:14` | `vendor/DDTank41/Game.Server/Packets/Client/UserEquipListHandler.cs` |
| `sendOneOnOneTalk` | `im/chatFrame/PrivateChatFrame.as`<br>`im/IMController.as` | 160 IM_CMD | [im](../apps/game/src/handlers/amigos/index.ts#L60) `apps/game/src/handlers/amigos/index.ts:60` | `vendor/DDTank41/Game.Server/Packets/Client/IMHandler.cs` |
| `sendAddFriend` | `im/FriendGroupFrame.as`<br>`im/IMController.as` (+1) | 160 IM_CMD | [im](../apps/game/src/handlers/amigos/index.ts#L60) `apps/game/src/handlers/amigos/index.ts:60` | `vendor/DDTank41/Game.Server/Packets/Client/IMHandler.cs` |
| `sendCustomFriends` | `im/IMController.as`<br>`im/IMListItemView.as` | 160 IM_CMD | [im](../apps/game/src/handlers/amigos/index.ts#L60) `apps/game/src/handlers/amigos/index.ts:60` | `vendor/DDTank41/Game.Server/Packets/Client/IMHandler.cs` |
| `sendDelFriend` | `im/IMController.as` | 160 IM_CMD | [im](../apps/game/src/handlers/amigos/index.ts#L60) `apps/game/src/handlers/amigos/index.ts:60` | `vendor/DDTank41/Game.Server/Packets/Client/IMHandler.cs` |
| `sendFriendState` | `im/StateIconButton.as` | 160 IM_CMD | [im](../apps/game/src/handlers/amigos/index.ts#L60) `apps/game/src/handlers/amigos/index.ts:60` | `vendor/DDTank41/Game.Server/Packets/Client/IMHandler.cs` |

## Atividades de novato

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendErrorMsg` | `noviceactivity/NoviceActivityManager.as`<br>`noviceactivity/NoviceActivityRightAwardItem.as` | 8 CLIENT_LOG | [clientLog](../apps/game/src/handlers/basico/index.ts#L32) `apps/game/src/handlers/basico/index.ts:32` | `vendor/DDTank41/Game.Server/Packets/Client/ClientErrorLog.cs` |

## Batalha

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendErrorMsg` | `game/actions/ActionManager.as`<br>`game/objects/BombAction.as` (+1) | 8 CLIENT_LOG | [clientLog](../apps/game/src/handlers/basico/index.ts#L32) `apps/game/src/handlers/basico/index.ts:32` | `vendor/DDTank41/Game.Server/Packets/Client/ClientErrorLog.cs` |
| `syncWeakStep` | `game/view/arrow/ArrowView.as`<br>`game/view/card/SmallCardsView.as` (+5) | 15 USER_ANSWER | [USER_ANSWER](../apps/game/src/handlers/missoes/index.ts#L39) `apps/game/src/handlers/missoes/index.ts:39` | `vendor/DDTank41/Game.Server/Packets/Client/UserAnswerHandler.cs` |
| `sendGamePick` | `game/model/LocalPlayer.as` | 91 GAME_CMD | [comandoDeJogo](../apps/game/src/handlers/salas/index.ts#L67) `apps/game/src/handlers/salas/index.ts:67` | — |
| `sendAirPlane` | `game/model/LocalPlayer.as` | 91 GAME_CMD | [comandoDeJogo](../apps/game/src/handlers/salas/index.ts#L67) `apps/game/src/handlers/salas/index.ts:67` | — |
| `useDeputyWeapon` | `game/model/LocalPlayer.as` | 91 GAME_CMD | [comandoDeJogo](../apps/game/src/handlers/salas/index.ts#L67) `apps/game/src/handlers/salas/index.ts:67` | — |
| `sendPetSkill` | `game/view/prop/PetSkillBar.as` | 91 GAME_CMD | [comandoDeJogo](../apps/game/src/handlers/salas/index.ts#L67) `apps/game/src/handlers/salas/index.ts:67` | — |
| `sendGetTropToBag` | `game/view/card/TakeOutCardController.as` | 108 GAME_TAKE_TEMP | [async](../apps/game/src/handlers/bolsa/pegar-item-temporario.ts#L18) `apps/game/src/handlers/bolsa/pegar-item-temporario.ts:18` | `vendor/DDTank41/Game.Server/Packets/Client/GameTakeTempItemsHandler.cs` |
| `sendDefyAffiche` | `game/view/DefyAfficheViewFrame.as` | 123 DEFY_AFFICHE | [defyAffiche](../apps/game/src/handlers/chat/index.ts#L27) `apps/game/src/handlers/chat/index.ts:27` | `vendor/DDTank41/Game.Server/Packets/Client/DefyAfficheHandler.cs` |
| `sendUseCard` | `game/view/propContainer/RightPropView.as` | 183 CARD_USE | [cardUse](../apps/game/src/handlers/bolsa/usar-carta.ts#L88) `apps/game/src/handlers/bolsa/usar-carta.ts:88` | `vendor/DDTank41/Game.Server/Packets/Client/CardUseHandler.cs` |

## Baú da galinha

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendNewChickenBox` | `newChickenBox/controller/NewChickenBoxManager.as` | 87 NEWCHICKENBOX_SYS | [newChickenBoxDispatch](../apps/game/src/handlers/eventos/index.ts#L71) `apps/game/src/handlers/eventos/index.ts:71` | `vendor/DDTank41/Game.Server/Packets/Client/ChickenBoxHandler.cs` |
| `sendOverShowItems` | `newChickenBox/controller/NewChickenBoxManager.as` | 87 NEWCHICKENBOX_SYS | [newChickenBoxDispatch](../apps/game/src/handlers/eventos/index.ts#L71) `apps/game/src/handlers/eventos/index.ts:71` | `vendor/DDTank41/Game.Server/Packets/Client/ChickenBoxHandler.cs` |
| `sendClickStartBntNewChickenBox` | `newChickenBox/view/NewChickenBoxFrame.as` | 87 NEWCHICKENBOX_SYS | [newChickenBoxDispatch](../apps/game/src/handlers/eventos/index.ts#L71) `apps/game/src/handlers/eventos/index.ts:71` | `vendor/DDTank41/Game.Server/Packets/Client/ChickenBoxHandler.cs` |
| `sendFlushNewChickenBox` | `newChickenBox/view/NewChickenBoxFrame.as` | 87 NEWCHICKENBOX_SYS | [newChickenBoxDispatch](../apps/game/src/handlers/eventos/index.ts#L71) `apps/game/src/handlers/eventos/index.ts:71` | `vendor/DDTank41/Game.Server/Packets/Client/ChickenBoxHandler.cs` |
| `sendChickenBoxUseEagleEye` | `newChickenBox/view/NewChickenBoxView.as` | 87 NEWCHICKENBOX_SYS | [newChickenBoxDispatch](../apps/game/src/handlers/eventos/index.ts#L71) `apps/game/src/handlers/eventos/index.ts:71` | `vendor/DDTank41/Game.Server/Packets/Client/ChickenBoxHandler.cs` |
| `sendChickenBoxTakeOverCard` | `newChickenBox/view/NewChickenBoxView.as` | 87 NEWCHICKENBOX_SYS | [newChickenBoxDispatch](../apps/game/src/handlers/eventos/index.ts#L71) `apps/game/src/handlers/eventos/index.ts:71` | `vendor/DDTank41/Game.Server/Packets/Client/ChickenBoxHandler.cs` |

## Bolsa do mascote

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendMoveGoods` | `petsBag/view/item/FeedItem.as` | 49 CHANGE_PLACE_GOODS | [CHANGE_PLACE_GOODS](../apps/game/src/handlers/bolsa/mover.ts#L93) `apps/game/src/handlers/bolsa/mover.ts:93` | — |
| `sendPetRisingStar` | `petsBag/petsAdvanced/PetsAdvancedView.as` | 68 PET | [petCommand](../apps/game/src/handlers/mascote/index.ts#L82) `apps/game/src/handlers/mascote/index.ts:82` | `vendor/DDTank41/Game.Server/Packets/Client/PetHandler.cs` |
| `sendPetEvolution` | `petsBag/petsAdvanced/PetsAdvancedView.as` | 68 PET | [petCommand](../apps/game/src/handlers/mascote/index.ts#L82) `apps/game/src/handlers/mascote/index.ts:82` | `vendor/DDTank41/Game.Server/Packets/Client/PetHandler.cs` |
| `eatPetsHandler` | `petsBag/petsAdvanced/PetsEatView.as` | 68 PET | [petCommand](../apps/game/src/handlers/mascote/index.ts#L82) `apps/game/src/handlers/mascote/index.ts:82` | `vendor/DDTank41/Game.Server/Packets/Client/PetHandler.cs` |
| `sendPetFollowOrCall` | `petsBag/petsAdvanced/PetsFormPetsItem.as` | 68 PET | [petCommand](../apps/game/src/handlers/mascote/index.ts#L82) `apps/game/src/handlers/mascote/index.ts:82` | `vendor/DDTank41/Game.Server/Packets/Client/PetHandler.cs` |
| `sendPetWake` | `petsBag/petsAdvanced/PetsFormPetsItem.as` | 68 PET | [petCommand](../apps/game/src/handlers/mascote/index.ts#L82) `apps/game/src/handlers/mascote/index.ts:82` | `vendor/DDTank41/Game.Server/Packets/Client/PetHandler.cs` |
| `sendPetFormInfo` | `petsBag/petsAdvanced/PetsFormView.as` | 68 PET | [petCommand](../apps/game/src/handlers/mascote/index.ts#L82) `apps/game/src/handlers/mascote/index.ts:82` | `vendor/DDTank41/Game.Server/Packets/Client/PetHandler.cs` |
| `sendRefreshPet` | `petsBag/view/AdoptPetsGuideView.as`<br>`petsBag/view/AdoptPetsView.as` | 68 PET | [petCommand](../apps/game/src/handlers/mascote/index.ts#L82) `apps/game/src/handlers/mascote/index.ts:82` | `vendor/DDTank41/Game.Server/Packets/Client/PetHandler.cs` |
| `sendAdoptPet` | `petsBag/view/AdoptPetsGuideView.as`<br>`petsBag/view/AdoptPetsView.as` | 68 PET | [petCommand](../apps/game/src/handlers/mascote/index.ts#L82) `apps/game/src/handlers/mascote/index.ts:82` | `vendor/DDTank41/Game.Server/Packets/Client/PetHandler.cs` |
| `sendEquipPetSkill` | `petsBag/view/item/SkillItem.as`<br>`petsBag/view/PetGameSkillPnl.as` (+1) | 68 PET | [petCommand](../apps/game/src/handlers/mascote/index.ts#L82) `apps/game/src/handlers/mascote/index.ts:82` | `vendor/DDTank41/Game.Server/Packets/Client/PetHandler.cs` |
| `sendPaySkill` | `petsBag/view/PetGameSkillPnl.as` | 68 PET | [petCommand](../apps/game/src/handlers/mascote/index.ts#L82) `apps/game/src/handlers/mascote/index.ts:82` | `vendor/DDTank41/Game.Server/Packets/Client/PetHandler.cs` |
| `sendPetFightUnFight` | `petsBag/view/PetsBagOutView.as` | 68 PET | [petCommand](../apps/game/src/handlers/mascote/index.ts#L82) `apps/game/src/handlers/mascote/index.ts:82` | `vendor/DDTank41/Game.Server/Packets/Client/PetHandler.cs` |
| `sendPetRename` | `petsBag/view/PetsBagOutView.as` | 68 PET | [petCommand](../apps/game/src/handlers/mascote/index.ts#L82) `apps/game/src/handlers/mascote/index.ts:82` | `vendor/DDTank41/Game.Server/Packets/Client/PetHandler.cs` |
| `sendRevertPet` | `petsBag/view/PetsBagOutView.as` | 68 PET | [petCommand](../apps/game/src/handlers/mascote/index.ts#L82) `apps/game/src/handlers/mascote/index.ts:82` | `vendor/DDTank41/Game.Server/Packets/Client/PetHandler.cs` |
| `sendReleasePet` | `petsBag/view/PetsBagOutView.as` | 68 PET | [petCommand](../apps/game/src/handlers/mascote/index.ts#L82) `apps/game/src/handlers/mascote/index.ts:82` | `vendor/DDTank41/Game.Server/Packets/Client/PetHandler.cs` |
| `sendPetFeed` | `petsBag/view/PetsBagOutView.as` | 68 PET | [petCommand](../apps/game/src/handlers/mascote/index.ts#L82) `apps/game/src/handlers/mascote/index.ts:82` | `vendor/DDTank41/Game.Server/Packets/Client/PetHandler.cs` |
| `delPetEquip` | `petsBag/view/ShowPet.as` | 68 PET | [petCommand](../apps/game/src/handlers/mascote/index.ts#L82) `apps/game/src/handlers/mascote/index.ts:82` | `vendor/DDTank41/Game.Server/Packets/Client/PetHandler.cs` |
| `sendClearStoreBag` | `petsBag/view/item/FeedItem.as`<br>`petsBag/view/PetsBagOutView.as` | 122 CLEAR_STORE_BAG | [clearStoreBag](../apps/game/src/handlers/forja/index.ts#L76) `apps/game/src/handlers/forja/index.ts:76` | `vendor/DDTank41/Game.Server/Packets/Client/StoreClearItemHandler.cs` |

## Bolsa e personagem

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `syncWeakStep` | `bagAndInfo/BagAndGiftFrame.as` | 15 USER_ANSWER | [USER_ANSWER](../apps/game/src/handlers/missoes/index.ts#L39) `apps/game/src/handlers/missoes/index.ts:39` | `vendor/DDTank41/Game.Server/Packets/Client/UserAnswerHandler.cs` |
| `getPlayerCardInfo` | `bagAndInfo/info/PlayerInfoFrame.as` | 18 GET_PLAYER_CARD | [getPlayerCard](../apps/game/src/handlers/progressao/index.ts#L30) `apps/game/src/handlers/progressao/index.ts:30` | `vendor/DDTank41/Game.Server/Packets/Client/GetPlayerCardHandler.cs` |
| `sendChangeDesignation` | `bagAndInfo/info/PlayerInfoView.as` | 34 USER_RANK | [USER_RANK](../apps/game/src/handlers/bolsa/mostrar-guilda.ts#L11) `apps/game/src/handlers/bolsa/mostrar-guilda.ts:11` | `vendor/DDTank41/Game.Server/Packets/Client/ChangeDesignationHandler.cs` |
| `sendMoveGoods` | `bagAndInfo/bag/BagView.as`<br>`bagAndInfo/bag/BankBagView.as` (+4) | 49 CHANGE_PLACE_GOODS | [CHANGE_PLACE_GOODS](../apps/game/src/handlers/bolsa/mover.ts#L93) `apps/game/src/handlers/bolsa/mover.ts:93` | — |
| `sendHideLayer` | `bagAndInfo/info/PlayerInfoView.as` | 60 ITEM_HIDE | [ITEM_HIDE](../apps/game/src/handlers/bolsa/ocultar-visual.ts#L11) `apps/game/src/handlers/bolsa/ocultar-visual.ts:11` | `vendor/DDTank41/Game.Server/Packets/Client/UserHideItemHandler.cs` |
| `sendItemOpenUp` | `bagAndInfo/bag/BagView.as`<br>`bagAndInfo/bag/OpenBatchView.as` | 63 ITEM_OPENUP | [openBox](../apps/game/src/handlers/bolsa/abrir-caixa.ts#L116) `apps/game/src/handlers/bolsa/abrir-caixa.ts:116` | `vendor/DDTank41/Game.Server/Packets/Client/OpenUpArkHandler.cs` |
| `sendUseProp` | `bagAndInfo/bag/BagView.as` | 66 PROP_USE | [async](../apps/game/src/handlers/loja/usar-prop.ts#L15) `apps/game/src/handlers/loja/usar-prop.ts:15` | `vendor/DDTank41/Game.Server/Packets/Client/PropUseHandler.cs` |
| `addPetEquip` | `bagAndInfo/bag/BagView.as`<br>`bagAndInfo/cell/BagCell.as` (+1) | 68 PET | [petCommand](../apps/game/src/handlers/mascote/index.ts#L82) `apps/game/src/handlers/mascote/index.ts:82` | `vendor/DDTank41/Game.Server/Packets/Client/PetHandler.cs` |
| `sendAddPet` | `bagAndInfo/bag/BagView.as` | 68 PET | [petCommand](../apps/game/src/handlers/mascote/index.ts#L82) `apps/game/src/handlers/mascote/index.ts:82` | `vendor/DDTank41/Game.Server/Packets/Client/PetHandler.cs` |
| `delPetEquip` | `bagAndInfo/cell/BagCell.as` | 68 PET | [petCommand](../apps/game/src/handlers/mascote/index.ts#L82) `apps/game/src/handlers/mascote/index.ts:82` | `vendor/DDTank41/Game.Server/Packets/Client/PetHandler.cs` |
| `sendItemEquip` | `bagAndInfo/info/PlayerInfoViewControl.as` | 74 ITEM_EQUIP | [async](../apps/game/src/handlers/bolsa/ver-equipamento.ts#L14) `apps/game/src/handlers/bolsa/ver-equipamento.ts:14` | `vendor/DDTank41/Game.Server/Packets/Client/UserEquipListHandler.cs` |
| `sendTexp` | `bagAndInfo/bag/BagView.as` | 99 TEXP | [texp](../apps/game/src/handlers/bolsa/treino-atributos.ts#L41) `apps/game/src/handlers/bolsa/treino-atributos.ts:41` | `vendor/DDTank41/Game.Server/Packets/Client/TexpHandler.cs` |
| `sendClearStoreBag` | `bagAndInfo/BagAndGiftFrame.as`<br>`bagAndInfo/BagAndInfoManager.as` | 122 CLEAR_STORE_BAG | [clearStoreBag](../apps/game/src/handlers/forja/index.ts#L76) `apps/game/src/handlers/forja/index.ts:76` | `vendor/DDTank41/Game.Server/Packets/Client/StoreClearItemHandler.cs` |
| `sendUpdateGoodsCount` | `bagAndInfo/BagAndGiftFrame.as` | 168 GOODS_COUNT | [GOODS_COUNT](../apps/game/src/handlers/loja/estoque-diario.ts#L13) `apps/game/src/handlers/loja/estoque-diario.ts:13` | `vendor/DDTank41/Game.Server/Packets/Client/GoodsCountHandler.cs` |
| `sendUseReworkName` | `bagAndInfo/ReworkName/ReworkNameFrame.as` | 171 USE_REWORK_NAME | [async](../apps/game/src/handlers/bolsa/trocar-apelido.ts#L13) `apps/game/src/handlers/bolsa/trocar-apelido.ts:13` | — |
| `sendUseCard` | `bagAndInfo/bag/BagView.as` | 183 CARD_USE | [cardUse](../apps/game/src/handlers/bolsa/usar-carta.ts#L88) `apps/game/src/handlers/bolsa/usar-carta.ts:88` | `vendor/DDTank41/Game.Server/Packets/Client/CardUseHandler.cs` |
| `sendReworkRank` | `bagAndInfo/info/PlayerInfoEffortHonorView.as` | 189 USER_CHANGE_RANK | [async](../apps/game/src/handlers/bolsa/titulos.ts#L13) `apps/game/src/handlers/bolsa/titulos.ts:13` | `vendor/DDTank41/Game.Server/Packets/Client/ReworkRankHandler.cs` |
| `sendUseChangeColorShell` | `bagAndInfo/bag/BagView.as` | 205 USE_CHANGE_COLOR_SHELL | **FALTA PORTAR** | — |
| `sendFirstGetCards` | `bagAndInfo/bag/BagView.as` | 216 CARDS_DATA | [cardCommand](../apps/game/src/handlers/mascote/index.ts#L83) `apps/game/src/handlers/mascote/index.ts:83` | `vendor/DDTank41/Game.Server/Packets/Client/CardDataHandler.cs` |
| `sendPlayerGift` | `bagAndInfo/info/PlayerInfoFrame.as` | 218 USER_GET_GIFTS | [async](../apps/game/src/handlers/bolsa/presentes-recebidos.ts#L17) `apps/game/src/handlers/bolsa/presentes-recebidos.ts:17` | `vendor/DDTank41/Game.Server/Packets/Client/PlayerGiftHandler.cs` |
| `sendChangeSex` | `bagAndInfo/bag/BagView.as` | 252 USE_CHANGE_SEX | [async](../apps/game/src/handlers/bolsa/trocar-sexo.ts#L16) `apps/game/src/handlers/bolsa/trocar-sexo.ts:16` | `vendor/DDTank41/Game.Server/Packets/Client/ChangeSexHandler.cs` |
| `sendNewTitleCard` | `bagAndInfo/bag/BagView.as` | 265 NEWTITLE_CARD | [NEWTITLE_CARD](../apps/game/src/handlers/bolsa/titulos.ts#L31) `apps/game/src/handlers/bolsa/titulos.ts:31` | `vendor/DDTank41/Game.Server/Packets/Client/NewTitleCardHandler.cs` |
| `reclaimGoods` | `bagAndInfo/bag/SellGoodsFrame.as` | undefined REC | **FALTA PORTAR** | — |

## Boss mundial

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendBuyGoods` | `worldboss/view/AwardGoodItem.as` | 44 BUY_GOODS | [buyGoods](../apps/game/src/handlers/loja/comprar.ts#L130) `apps/game/src/handlers/loja/comprar.ts:130` | — |
| `enterUserGuide` | `worldboss/view/WorldBossFightRoomState.as`<br>`worldboss/WorldBossManager.as` | 94 GAME_ROOM | [rr](../apps/game/src/handlers/salas/index.ts#L66) `apps/game/src/handlers/salas/index.ts:66` | `vendor/DDTank41/Game.Server/Packets/Client/GameRoomHandler.cs` |
| `createUserGuide` | `worldboss/view/WorldBossScneneMap.as` | 94 GAME_ROOM | [rr](../apps/game/src/handlers/salas/index.ts#L66) `apps/game/src/handlers/salas/index.ts:66` | `vendor/DDTank41/Game.Server/Packets/Client/GameRoomHandler.cs` |

## Calendário

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendErrorMsg` | `calendar/CalendarManager.as`<br>`calendar/view/goodsExchange/GoodsExchangeView.as` | 8 CLIENT_LOG | [clientLog](../apps/game/src/handlers/basico/index.ts#L32) `apps/game/src/handlers/basico/index.ts:32` | `vendor/DDTank41/Game.Server/Packets/Client/ClientErrorLog.cs` |
| `sendDailyAward` | `calendar/CalendarManager.as` | 13 DAILY_AWARD | [dailyAwardHandler](../apps/game/src/handlers/eventos/index.ts#L59) `apps/game/src/handlers/eventos/index.ts:59` | `vendor/DDTank41/Game.Server/Packets/Client/DailyAwardHandler.cs` |
| `sendPicc` | `calendar/view/ActivityState.as` | 30 PICC | **FALTA PORTAR** | `vendor/DDTank41/Game.Server/Packets/Client/LotteryGetItem.cs` |
| `sendGoodsExchange` | `calendar/view/goodsExchange/GoodsExchangeView.as` | 31 GOODS_EXCHANGE | [GOODS_EXCHANGE](../apps/game/src/handlers/missoes/index.ts#L46) `apps/game/src/handlers/missoes/index.ts:46` | — |
| `sendSignAward` | `calendar/CalendarManager.as` | 90 GET_SIGNAWARD | [signAwardHandler](../apps/game/src/handlers/eventos/index.ts#L63) `apps/game/src/handlers/eventos/index.ts:63` | `vendor/DDTank41/Game.Server/Packets/Client/SignAwardHandler.cs` |
| `sendUserLuckyNum` | `calendar/CalendarManager.as`<br>`calendar/view/LuckyNumBar.as` | 161 USER_LUCKYNUM | **FALTA PORTAR** | `vendor/DDTank41/Game.Server/Packets/Client/UserLuckyNumHandler.cs` |

## Campo de treino

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `syncWeakStep` | `fightLib/FightLibState.as` | 15 USER_ANSWER | [USER_ANSWER](../apps/game/src/handlers/missoes/index.ts#L39) `apps/game/src/handlers/missoes/index.ts:39` | `vendor/DDTank41/Game.Server/Packets/Client/UserAnswerHandler.cs` |
| `createMonster` | `fightLib/command/CreateMonsterCommand.as`<br>`fightLib/view/FightLibGameView.as` | 91 GAME_CMD | [comandoDeJogo](../apps/game/src/handlers/salas/index.ts#L67) `apps/game/src/handlers/salas/index.ts:67` | — |
| `deleteMonster` | `fightLib/command/CreateMonsterCommand.as` | 91 GAME_CMD | [comandoDeJogo](../apps/game/src/handlers/salas/index.ts#L67) `apps/game/src/handlers/salas/index.ts:67` | — |
| `sendQuestCheck` | `fightLib/FightLibState.as` | 181 QUEST_CHECK | [progressoMissao](../apps/game/src/handlers/missoes/index.ts#L37) `apps/game/src/handlers/missoes/index.ts:37` | `vendor/DDTank41/Game.Server/Packets/Client/QuestCheckHandler.cs` |

## Cartas

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendReplaceCardProp` | `cardSystem/view/PropResetFrame.as` | 196 CARD_RESET | [CARD_RESET](../apps/game/src/handlers/bolsa/reroll-carta.ts#L22) `apps/game/src/handlers/bolsa/reroll-carta.ts:22` | `vendor/DDTank41/Game.Server/Packets/Client/CardResetHandler.cs` |
| `sendCardReset` | `cardSystem/view/PropResetFrame.as` | 196 CARD_RESET | [CARD_RESET](../apps/game/src/handlers/bolsa/reroll-carta.ts#L22) `apps/game/src/handlers/bolsa/reroll-carta.ts:22` | `vendor/DDTank41/Game.Server/Packets/Client/CardResetHandler.cs` |
| `sendMoveCards` | `cardSystem/elements/CardCell.as`<br>`cardSystem/view/cardBag/CardBagListItem.as` (+3) | 216 CARDS_DATA | [cardCommand](../apps/game/src/handlers/mascote/index.ts#L83) `apps/game/src/handlers/mascote/index.ts:83` | `vendor/DDTank41/Game.Server/Packets/Client/CardDataHandler.cs` |
| `sendSortCards` | `cardSystem/view/cardBag/CardBagView.as` | 216 CARDS_DATA | [cardCommand](../apps/game/src/handlers/mascote/index.ts#L83) `apps/game/src/handlers/mascote/index.ts:83` | `vendor/DDTank41/Game.Server/Packets/Client/CardDataHandler.cs` |
| `sendOpenViceCard` | `cardSystem/view/cardEquip/CardEquipView.as` | 216 CARDS_DATA | [cardCommand](../apps/game/src/handlers/mascote/index.ts#L83) `apps/game/src/handlers/mascote/index.ts:83` | `vendor/DDTank41/Game.Server/Packets/Client/CardDataHandler.cs` |
| `sendUpGradeCard` | `cardSystem/view/UpGradeFrame.as` | 216 CARDS_DATA | [cardCommand](../apps/game/src/handlers/mascote/index.ts#L83) `apps/game/src/handlers/mascote/index.ts:83` | `vendor/DDTank41/Game.Server/Packets/Client/CardDataHandler.cs` |

## chickActivation

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendBuyGoods` | `chickActivation/view/ChickActivationViewFrame.as` | 44 BUY_GOODS | [buyGoods](../apps/game/src/handlers/loja/comprar.ts#L130) `apps/game/src/handlers/loja/comprar.ts:130` | — |

## cityWide

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendOns` | `cityWide/CityWideManager.as` | 160 IM_CMD | [im](../apps/game/src/handlers/amigos/index.ts#L60) `apps/game/src/handlers/amigos/index.ts:60` | `vendor/DDTank41/Game.Server/Packets/Client/IMHandler.cs` |
| `sendAddFriend` | `cityWide/CityWideManager.as` | 160 IM_CMD | [im](../apps/game/src/handlers/amigos/index.ts#L60) `apps/game/src/handlers/amigos/index.ts:60` | `vendor/DDTank41/Game.Server/Packets/Client/IMHandler.cs` |

## civil

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendForMarryInfo` | `civil/view/CivilRegisterFrame.as` | 235 MARRYINFO_GET | [marryInfoGet](../apps/game/src/handlers/casamento/index.ts#L64) `apps/game/src/handlers/casamento/index.ts:64` | `vendor/DDTank41/Game.Server/Packets/Client/MarryInfoGetHandler.cs` |
| `sendRegisterInfo` | `civil/view/CivilRegisterFrame.as`<br>`civil/view/CivilRightView.as` | 236 MARRYINFO_ADD | [marryInfoAdd](../apps/game/src/handlers/casamento/index.ts#L63) `apps/game/src/handlers/casamento/index.ts:63` | `vendor/DDTank41/Game.Server/Packets/Client/MarryInfoAddHandler.cs` |
| `sendModifyInfo` | `civil/view/CivilRegisterFrame.as` | 237 MARRYINFO_UPDATE | [marryInfoUpdate](../apps/game/src/handlers/casamento/index.ts#L65) `apps/game/src/handlers/casamento/index.ts:65` | `vendor/DDTank41/Game.Server/Packets/Client/MarryRoomInfoUpdateHandler.cs` |
| `sendCurrentState` | `civil/CivilController.as` | 251 SCENE_STATE | [sceneState](../apps/game/src/handlers/casamento/index.ts#L74) `apps/game/src/handlers/casamento/index.ts:74` | `vendor/DDTank41/Game.Server/Packets/Client/MarryStateHandler.cs` |

## Coleção de visuais

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendBuyGoods` | `AvatarCollection/view/AvatarCollectionItemCell.as` | 44 BUY_GOODS | [buyGoods](../apps/game/src/handlers/loja/comprar.ts#L130) `apps/game/src/handlers/loja/comprar.ts:130` | — |

## Configurações

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendOpition` | `setting/view/SettingView.as` | 64 OPTION_UPDATE | [optionUpdate](../apps/game/src/handlers/basico/index.ts#L40) `apps/game/src/handlers/basico/index.ts:40` | `vendor/DDTank41/Game.Server/Packets/Client/OptionHandler.cs` |

## Convidar amigos

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `enterInviteFriendView` | `inviteFriends/InviteFriendsManager.as` | 107 INVITE_FRIEND | [inviteRouter](../apps/game/src/handlers/amigos/index.ts#L61) `apps/game/src/handlers/amigos/index.ts:61` | — |
| `inviteFriendRewardBntClick` | `inviteFriends/view/InviteFriendItem.as` | 107 INVITE_FRIEND | [inviteRouter](../apps/game/src/handlers/amigos/index.ts#L61) `apps/game/src/handlers/amigos/index.ts:61` | — |
| `inviteFriendFBBntClick` | `inviteFriends/view/InviteFriendsMainView.as` | 107 INVITE_FRIEND | [inviteRouter](../apps/game/src/handlers/amigos/index.ts#L61) `apps/game/src/handlers/amigos/index.ts:61` | — |
| `inviteFriendOkClick` | `inviteFriends/view/InviteFriendsMainView.as` | 107 INVITE_FRIEND | [inviteRouter](../apps/game/src/handlers/amigos/index.ts#L61) `apps/game/src/handlers/amigos/index.ts:61` | — |

## Convites

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendGameLogin` | `invite/ResponseInviteFrame.as` | 94 GAME_ROOM | [rr](../apps/game/src/handlers/salas/index.ts#L66) `apps/game/src/handlers/salas/index.ts:66` | `vendor/DDTank41/Game.Server/Packets/Client/GameRoomHandler.cs` |

## Correio

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendItemEquip` | `email/view/ReadingView.as` | 74 ITEM_EQUIP | [async](../apps/game/src/handlers/bolsa/ver-equipamento.ts#L14) `apps/game/src/handlers/bolsa/ver-equipamento.ts:14` | `vendor/DDTank41/Game.Server/Packets/Client/UserEquipListHandler.cs` |
| `sendDeleteMail` | `email/manager/MailManager.as` | 112 DELETE_MAIL | [deleteMail](../apps/game/src/handlers/correio/index.ts#L28) `apps/game/src/handlers/correio/index.ts:28` | — |
| `sendGetMail` | `email/manager/MailManager.as` | 113 GET_MAIL_ATTACHMENT | [getAttachment](../apps/game/src/handlers/correio/index.ts#L29) `apps/game/src/handlers/correio/index.ts:29` | — |
| `sendUpdateMail` | `email/manager/MailManager.as` | 114 UPDATE_MAIL | [updateMail](../apps/game/src/handlers/correio/index.ts#L27) `apps/game/src/handlers/correio/index.ts:27` | `vendor/DDTank41/Game.Server/Packets/Client/UserUpdateMailHandler.cs` |
| `sendEmail` | `email/manager/MailManager.as` | 116 SEND_MAIL | [sendMailPacket](../apps/game/src/handlers/correio/index.ts#L30) `apps/game/src/handlers/correio/index.ts:30` | — |
| `untreadEmail` | `email/manager/MailManager.as` | 118 MAIL_CANCEL | [mailCancel](../apps/game/src/handlers/correio/index.ts#L32) `apps/game/src/handlers/correio/index.ts:32` | `vendor/DDTank41/Game.Server/Packets/Client/MailPaymentCancelHandler.cs` |
| `sendReloadGift` | `email/manager/MailManager.as` | 214 USER_RELOAD_GIFT | [userReloadGift](../apps/game/src/handlers/correio/index.ts#L31) `apps/game/src/handlers/correio/index.ts:31` | — |

## effortView

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendRequestUpdate` | `effortView/EffortMainFrame.as` | 225 REQUEST_UPDATE | [enthrallSwitch](../apps/game/src/handlers/basico/index.ts#L35) `apps/game/src/handlers/basico/index.ts:35` | `vendor/DDTank41/Game.Server/Packets/Client/ForSwitchHandler.cs` |

## equipDebt

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendGoodsContinue` | `equipDebt/view/EquipAddMoneyFrame.as` | 62 ITEM_CONTINUE | [itemContinue](../apps/game/src/handlers/loja/renovar.ts#L72) `apps/game/src/handlers/loja/renovar.ts:72` | `vendor/DDTank41/Game.Server/Packets/Client/UserItemContineueHandler.cs` |

## equipretrieve

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendMoveGoods` | `equipretrieve/view/RetrieveBagcell.as`<br>`equipretrieve/view/RetrieveBgView.as` (+1) | 49 CHANGE_PLACE_GOODS | [CHANGE_PLACE_GOODS](../apps/game/src/handlers/bolsa/mover.ts#L93) `apps/game/src/handlers/bolsa/mover.ts:93` | — |
| `sendEquipRetrieve` | `equipretrieve/view/RetrieveBgView.as` | 222 EQUIP_RECYCLE_ITEM | [EQUIP_RECYCLE_ITEM](../apps/game/src/handlers/bolsa/reaproveitar-forja.ts#L26) `apps/game/src/handlers/bolsa/reaproveitar-forja.ts:26` | — |

## Fazenda

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendBuyGoods` | `farm/viewx/shop/FarmShopPayPnl.as` | 44 BUY_GOODS | [buyGoods](../apps/game/src/handlers/loja/comprar.ts#L130) `apps/game/src/handlers/loja/comprar.ts:130` | — |
| `sendBuyPetExpItem` | `farm/viewx/FarmBuyExpFrame.as` | 68 PET | [petCommand](../apps/game/src/handlers/mascote/index.ts#L82) `apps/game/src/handlers/mascote/index.ts:82` | `vendor/DDTank41/Game.Server/Packets/Client/PetHandler.cs` |
| `enterFarm` | `farm/FarmModelController.as` | 81 FARM | [async](../apps/game/src/handlers/fazenda/index.ts#L39) `apps/game/src/handlers/fazenda/index.ts:39` | `vendor/DDTank41/Game.Server/Packets/Client/FarmHandler.cs` |
| `seeding` | `farm/FarmModelController.as` | 81 FARM | [async](../apps/game/src/handlers/fazenda/index.ts#L39) `apps/game/src/handlers/fazenda/index.ts:39` | `vendor/DDTank41/Game.Server/Packets/Client/FarmHandler.cs` |
| `doMature` | `farm/FarmModelController.as` | 81 FARM | [async](../apps/game/src/handlers/fazenda/index.ts#L39) `apps/game/src/handlers/fazenda/index.ts:39` | `vendor/DDTank41/Game.Server/Packets/Client/FarmHandler.cs` |
| `toGather` | `farm/FarmModelController.as` | 81 FARM | [async](../apps/game/src/handlers/fazenda/index.ts#L39) `apps/game/src/handlers/fazenda/index.ts:39` | `vendor/DDTank41/Game.Server/Packets/Client/FarmHandler.cs` |
| `toSpread` | `farm/FarmModelController.as` | 81 FARM | [async](../apps/game/src/handlers/fazenda/index.ts#L39) `apps/game/src/handlers/fazenda/index.ts:39` | `vendor/DDTank41/Game.Server/Packets/Client/FarmHandler.cs` |
| `toKillCrop` | `farm/FarmModelController.as` | 81 FARM | [async](../apps/game/src/handlers/fazenda/index.ts#L39) `apps/game/src/handlers/fazenda/index.ts:39` | `vendor/DDTank41/Game.Server/Packets/Client/FarmHandler.cs` |
| `toFarmHelper` | `farm/FarmModelController.as` | 81 FARM | [async](../apps/game/src/handlers/fazenda/index.ts#L39) `apps/game/src/handlers/fazenda/index.ts:39` | `vendor/DDTank41/Game.Server/Packets/Client/FarmHandler.cs` |
| `toHelperRenewMoney` | `farm/FarmModelController.as` | 81 FARM | [async](../apps/game/src/handlers/fazenda/index.ts#L39) `apps/game/src/handlers/fazenda/index.ts:39` | `vendor/DDTank41/Game.Server/Packets/Client/FarmHandler.cs` |
| `exitFarm` | `farm/FarmModelController.as` | 81 FARM | [async](../apps/game/src/handlers/fazenda/index.ts#L39) `apps/game/src/handlers/fazenda/index.ts:39` | `vendor/DDTank41/Game.Server/Packets/Client/FarmHandler.cs` |
| `giftPacks` | `farm/player/FarmPlayer.as` | 81 FARM | [async](../apps/game/src/handlers/fazenda/index.ts#L39) `apps/game/src/handlers/fazenda/index.ts:39` | `vendor/DDTank41/Game.Server/Packets/Client/FarmHandler.cs` |
| `sendCompose` | `farm/view/compose/FarmComposePnl.as` | 81 FARM | [async](../apps/game/src/handlers/fazenda/index.ts#L39) `apps/game/src/handlers/fazenda/index.ts:39` | `vendor/DDTank41/Game.Server/Packets/Client/FarmHandler.cs` |
| `fastForwardGrop` | `farm/viewx/CountdownView.as`<br>`farm/viewx/FarmMainView.as` | 81 FARM | [async](../apps/game/src/handlers/fazenda/index.ts#L39) `apps/game/src/handlers/fazenda/index.ts:39` | `vendor/DDTank41/Game.Server/Packets/Client/FarmHandler.cs` |
| `sendBeginHelper` | `farm/viewx/helper/FarmHelperView.as`<br>`farm/viewx/helper/HelperBeginFrame.as` | 81 FARM | [async](../apps/game/src/handlers/fazenda/index.ts#L39) `apps/game/src/handlers/fazenda/index.ts:39` | `vendor/DDTank41/Game.Server/Packets/Client/FarmHandler.cs` |
| `arrange` | `farm/FarmModelController.as` | 135 135 | [async](../apps/game/src/handlers/fazenda/index.ts#L63) `apps/game/src/handlers/fazenda/index.ts:63` | — |

## Forja — aba Forno (Dourar/Evolução/Energia latente/Gemas)

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendClearStoreBag` | `store/forge/ForgeMainView.as` | 122 CLEAR_STORE_BAG | [clearStoreBag](../apps/game/src/handlers/forja/index.ts#L76) `apps/game/src/handlers/forja/index.ts:76` | `vendor/DDTank41/Game.Server/Packets/Client/StoreClearItemHandler.cs` |

## Forja — Ferraria (Fortalecer/Montar/Compor/Transferir/Fundir)

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `syncWeakStep` | `store/view/Compose/StoreIIComposeBG.as`<br>`store/view/fusion/StoreIIFusionBG.as` (+1) | 15 USER_ANSWER | [USER_ANSWER](../apps/game/src/handlers/missoes/index.ts#L39) `apps/game/src/handlers/missoes/index.ts:39` | `vendor/DDTank41/Game.Server/Packets/Client/UserAnswerHandler.cs` |
| `sendBuyGoods` | `store/view/shortcutBuy/ShortcutBuyFrame.as` | 44 BUY_GOODS | [buyGoods](../apps/game/src/handlers/loja/comprar.ts#L130) `apps/game/src/handlers/loja/comprar.ts:130` | — |
| `sendBuyGiftBag` | `store/view/strength/BuyGiftBagButton.as` | 46 BUY_GIFTBAG | [async](../apps/game/src/handlers/loja/pacote-presente.ts#L47) `apps/game/src/handlers/loja/pacote-presente.ts:47` | `vendor/DDTank41/Game.Server/Packets/Client/BuyGiftBagHandler.cs` |
| `sendMoveGoods` | `store/StoneCell.as`<br>`store/StoreCell.as` (+16) | 49 CHANGE_PLACE_GOODS | [CHANGE_PLACE_GOODS](../apps/game/src/handlers/bolsa/mover.ts#L93) `apps/game/src/handlers/bolsa/mover.ts:93` | — |
| `sendItemCompose` | `store/view/Compose/StoreIIComposeBG.as` | 58 ITEM_COMPOSE | [compose](../apps/game/src/handlers/forja/index.ts#L55) `apps/game/src/handlers/forja/index.ts:55` | `vendor/DDTank41/Game.Server/Packets/Client/ItemComposeHandler.cs` |
| `sendItemStrength` | `store/view/strength/StoreIIStrengthBG.as` | 59 ITEM_STRENGTHEN | [strengthen](../apps/game/src/handlers/forja/index.ts#L54) `apps/game/src/handlers/forja/index.ts:54` | `vendor/DDTank41/Game.Server/Packets/Client/ItemStrengthenHandler.cs` |
| `sendItemTransfer` | `store/view/transfer/StoreIITransferBG.as` | 61 ITEM_TRANSFER | [transfer](../apps/game/src/handlers/forja/index.ts#L59) `apps/game/src/handlers/forja/index.ts:59` | `vendor/DDTank41/Game.Server/Packets/Client/ItemTransferHandler.cs` |
| `sendItemFusion` | `store/view/fusion/StoreIIFusionBG.as` | 78 ITEM_FUSION | [fusion](../apps/game/src/handlers/forja/index.ts#L60) `apps/game/src/handlers/forja/index.ts:60` | — |
| `sendItemEmbed` | `store/view/embed/StoreEmbedBG.as` | 121 ITEM_INLAY | [inlay](../apps/game/src/handlers/forja/index.ts#L56) `apps/game/src/handlers/forja/index.ts:56` | — |
| `sendClearStoreBag` | `store/StoreMainView.as` | 122 CLEAR_STORE_BAG | [clearStoreBag](../apps/game/src/handlers/forja/index.ts#L76) `apps/game/src/handlers/forja/index.ts:76` | `vendor/DDTank41/Game.Server/Packets/Client/StoreClearItemHandler.cs` |
| `sendItemEmbedBackout` | `store/view/embed/StoreEmbedBG.as` | 125 ITEM_EMBED_BACKOUT | [embedBackout](../apps/game/src/handlers/forja/index.ts#L57) `apps/game/src/handlers/forja/index.ts:57` | `vendor/DDTank41/Game.Server/Packets/Client/ItemEmbedBackOutHandler.cs` |
| `sendItemExalt` | `store/view/exalt/StoreExaltBG.as` | 138 ITEM_ADVANCE | [itemAdvance](../apps/game/src/handlers/forja/index.ts#L64) `apps/game/src/handlers/forja/index.ts:64` | `vendor/DDTank41/Game.Server/Packets/Client/ItemAdvanceHandler.cs` |
| `sendSaveDB` | `store/StoreMainView.as` | 172 SAVE_DB | [saveDb](../apps/game/src/handlers/basico/index.ts#L33) `apps/game/src/handlers/basico/index.ts:33` | — |
| `sendItemOpenFiveSixHole` | `store/view/embed/StoreEmbedBG.as` | 217 OPEN_FIVE_SIX_HOLE | [openFiveSixHole](../apps/game/src/handlers/forja/index.ts#L58) `apps/game/src/handlers/forja/index.ts:58` | `vendor/DDTank41/Game.Server/Packets/Client/OpenFiveSixHoleHandler.cs` |

## Forja — Forno › Dourar (fusão dourada)

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendWishBeadEquip` | `store/forge/wishBead/WishBeadMainView.as` | 106 WISHBEADEQUIP | [wishBeadEquip](../apps/game/src/handlers/forja/index.ts#L63) `apps/game/src/handlers/forja/index.ts:63` | — |

## Forja — Gemas

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendBuyGoods` | `gemstone/views/GemstoneObtainView.as` | 44 BUY_GOODS | [buyGoods](../apps/game/src/handlers/loja/comprar.ts#L130) `apps/game/src/handlers/loja/comprar.ts:130` | — |

## Forja — Refinar conjunto

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendMoveGoods` | `store/fineStore/view/FineGhostView.as`<br>`store/fineStore/view/GhostItemCell.as` (+3) | 49 CHANGE_PLACE_GOODS | [CHANGE_PLACE_GOODS](../apps/game/src/handlers/bolsa/mover.ts#L93) `apps/game/src/handlers/bolsa/mover.ts:93` | — |
| `sendClearStoreBag` | `store/fineStore/view/FineStoreView.as` | 122 CLEAR_STORE_BAG | [clearStoreBag](../apps/game/src/handlers/forja/index.ts#L76) `apps/game/src/handlers/forja/index.ts:76` | `vendor/DDTank41/Game.Server/Packets/Client/StoreClearItemHandler.cs` |

## giftSystem

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendBuyGift` | `giftSystem/view/ClearingInterface.as` | 221 USER_SEND_GIFTS | [sendGift](../apps/game/src/handlers/loja/presentear.ts#L61) `apps/game/src/handlers/loja/presentear.ts:61` | `vendor/DDTank41/Game.Server/Packets/Client/UserSendGiftHandler.cs` |

## Ícones do lobby

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `syncWeakStep` | `hallIcon/view/HallRightIconView.as` | 15 USER_ANSWER | [USER_ANSWER](../apps/game/src/handlers/missoes/index.ts#L39) `apps/game/src/handlers/missoes/index.ts:39` | `vendor/DDTank41/Game.Server/Packets/Client/UserAnswerHandler.cs` |

## Igreja / casamento

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendExitMarryRoom` | `church/controller/ChurchRoomListController.as` | 21 SCENE_REMOVE_USER | [sceneRemoveUser](../apps/game/src/handlers/basico/index.ts#L38) `apps/game/src/handlers/basico/index.ts:38` | `vendor/DDTank41/Game.Server/Packets/Client/UserLeaveSceneHandler.cs` |
| `sendMateTime` | `church/view/weddingRoomList/DivorcePromptFrame.as`<br>`church/view/weddingRoomList/WeddingRoomListNavView.as` | 85 MATE_ONLINE_TIME | [mateOnlineTime](../apps/game/src/handlers/casamento/index.ts#L56) `apps/game/src/handlers/casamento/index.ts:56` | `vendor/DDTank41/Game.Server/Packets/Client/MateTimeHandler.cs` |
| `sendSceneChange` | `church/controller/ChurchRoomController.as` | 233 MARRY_SCENE_CHANGE | [marrySceneChange](../apps/game/src/handlers/casamento/index.ts#L73) `apps/game/src/handlers/casamento/index.ts:73` | `vendor/DDTank41/Game.Server/Packets/Client/MarrySceneChangeHandler.cs` |
| `sendMarryRoomLogin` | `church/view/ChurchMainView.as` | 240 MARRY_SCENE_LOGIN | [marrySceneLogin](../apps/game/src/handlers/casamento/index.ts#L69) `apps/game/src/handlers/casamento/index.ts:69` | `vendor/DDTank41/Game.Server/Packets/Client/UserEnterMarrySceneHandler.cs` |
| `sendCreateRoom` | `church/controller/ChurchRoomListController.as` | 241 MARRY_ROOM_CREATE | [marryRoomCreate](../apps/game/src/handlers/casamento/index.ts#L70) `apps/game/src/handlers/casamento/index.ts:70` | `vendor/DDTank41/Game.Server/Packets/Client/MarryRoomCreateHandler.cs` |
| `sendEnterRoom` | `church/controller/ChurchRoomListController.as`<br>`church/view/weddingRoomList/frame/WeddingRoomEnterConfirmView.as` (+2) | 242 MARRY_ROOM_LOGIN | [marryRoomLogin](../apps/game/src/handlers/casamento/index.ts#L71) `apps/game/src/handlers/casamento/index.ts:71` | `vendor/DDTank41/Game.Server/Packets/Client/MarryRoomLoginHandler.cs` |
| `sendExitRoom` | `church/controller/ChurchRoomController.as` | 244 PLAYER_EXIT_MARRY_ROOM | [playerExitMarryRoom](../apps/game/src/handlers/casamento/index.ts#L72) `apps/game/src/handlers/casamento/index.ts:72` | `vendor/DDTank41/Game.Server/Packets/Client/UserLeaveMarryRoom.cs` |
| `sendUnmarry` | `church/controller/ChurchRoomListController.as` | 248 DIVORCE_APPLY | [divorceApply](../apps/game/src/handlers/casamento/index.ts#L60) `apps/game/src/handlers/casamento/index.ts:60` | `vendor/DDTank41/Game.Server/Packets/Client/DivorceApplyHandler.cs` |
| `sendStartWedding` | `church/controller/ChurchRoomController.as` | 249 MARRY_CMD | [cmd](../apps/game/src/handlers/casamento/index.ts#L54) `apps/game/src/handlers/casamento/index.ts:54` | `vendor/DDTank41/Game.Server/Packets/Client/MarryDataHandler.cs` |
| `sendChurchLargess` | `church/controller/ChurchRoomController.as` | 249 MARRY_CMD | [cmd](../apps/game/src/handlers/casamento/index.ts#L54) `apps/game/src/handlers/casamento/index.ts:54` | `vendor/DDTank41/Game.Server/Packets/Client/MarryDataHandler.cs` |
| `sendChurchContinuation` | `church/controller/ChurchRoomController.as` | 249 MARRY_CMD | [cmd](../apps/game/src/handlers/casamento/index.ts#L54) `apps/game/src/handlers/casamento/index.ts:54` | `vendor/DDTank41/Game.Server/Packets/Client/MarryDataHandler.cs` |
| `sendUseFire` | `church/view/churchFire/ChurchFireView.as` | 249 MARRY_CMD | [cmd](../apps/game/src/handlers/casamento/index.ts#L54) `apps/game/src/handlers/casamento/index.ts:54` | `vendor/DDTank41/Game.Server/Packets/Client/MarryDataHandler.cs` |
| `sendGunSalute` | `church/view/churchScene/MoonSceneMap.as` | 249 MARRY_CMD | [cmd](../apps/game/src/handlers/casamento/index.ts#L54) `apps/game/src/handlers/casamento/index.ts:54` | `vendor/DDTank41/Game.Server/Packets/Client/MarryDataHandler.cs` |
| `sendChurchMove` | `church/view/churchScene/SceneMap.as` | 249 MARRY_CMD | [cmd](../apps/game/src/handlers/casamento/index.ts#L54) `apps/game/src/handlers/casamento/index.ts:54` | `vendor/DDTank41/Game.Server/Packets/Client/MarryDataHandler.cs` |
| `sendPosition` | `church/view/churchScene/WeddingSceneMap.as` | 249 MARRY_CMD | [cmd](../apps/game/src/handlers/casamento/index.ts#L54) `apps/game/src/handlers/casamento/index.ts:54` | `vendor/DDTank41/Game.Server/Packets/Client/MarryDataHandler.cs` |
| `sendChurchInvite` | `church/view/invite/ChurchInvitePlayerItem.as` | 249 MARRY_CMD | [cmd](../apps/game/src/handlers/casamento/index.ts#L54) `apps/game/src/handlers/casamento/index.ts:54` | `vendor/DDTank41/Game.Server/Packets/Client/MarryDataHandler.cs` |
| `sendChurchKick` | `church/view/menu/MenuPanel.as` | 249 MARRY_CMD | [cmd](../apps/game/src/handlers/casamento/index.ts#L54) `apps/game/src/handlers/casamento/index.ts:54` | `vendor/DDTank41/Game.Server/Packets/Client/MarryDataHandler.cs` |
| `sendChurchForbid` | `church/view/menu/MenuPanel.as` | 249 MARRY_CMD | [cmd](../apps/game/src/handlers/casamento/index.ts#L54) `apps/game/src/handlers/casamento/index.ts:54` | `vendor/DDTank41/Game.Server/Packets/Client/MarryDataHandler.cs` |
| `requestRefund` | `church/view/weddingRoom/WeddingRoomToolView.as` | 249 MARRY_CMD | [cmd](../apps/game/src/handlers/casamento/index.ts#L54) `apps/game/src/handlers/casamento/index.ts:54` | `vendor/DDTank41/Game.Server/Packets/Client/MarryDataHandler.cs` |
| `sendCurrentState` | `church/controller/ChurchRoomController.as` | 251 SCENE_STATE | [sceneState](../apps/game/src/handlers/casamento/index.ts#L74) `apps/game/src/handlers/casamento/index.ts:74` | `vendor/DDTank41/Game.Server/Packets/Client/MarryStateHandler.cs` |
| `sendModifyChurchDiscription` | `church/controller/ChurchRoomController.as` | 253 MARRY_ROOM_INFO_UPDATE | [marryRoomInfoUpdate](../apps/game/src/handlers/casamento/index.ts#L75) `apps/game/src/handlers/casamento/index.ts:75` | — |

## Labirinto

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendBuyGoods` | `labyrinth/view/LabyrinthShopItem.as` | 44 BUY_GOODS | [buyGoods](../apps/game/src/handlers/loja/comprar.ts#L130) `apps/game/src/handlers/loja/comprar.ts:130` | — |
| `enterUserGuide` | `labyrinth/LabyrinthManager.as` | 94 GAME_ROOM | [rr](../apps/game/src/handlers/salas/index.ts#L66) `apps/game/src/handlers/salas/index.ts:66` | `vendor/DDTank41/Game.Server/Packets/Client/GameRoomHandler.cs` |
| `createUserGuide` | `labyrinth/view/LabyrinthFrame.as` | 94 GAME_ROOM | [rr](../apps/game/src/handlers/salas/index.ts#L66) `apps/game/src/handlers/salas/index.ts:66` | `vendor/DDTank41/Game.Server/Packets/Client/GameRoomHandler.cs` |
| `labyrinthTryAgain` | `labyrinth/LabyrinthManager.as` | 131 LABYRINTH | [labyrinthHandler](../apps/game/src/handlers/eventos/index.ts#L82) `apps/game/src/handlers/eventos/index.ts:82` | `vendor/DDTank41/Game.Server/Packets/Client/LabyrinthHandler.cs` |
| `labyrinthCleanOutTimerComplete` | `labyrinth/view/CleanOutFrame.as` | 131 LABYRINTH | [labyrinthHandler](../apps/game/src/handlers/eventos/index.ts#L82) `apps/game/src/handlers/eventos/index.ts:82` | `vendor/DDTank41/Game.Server/Packets/Client/LabyrinthHandler.cs` |
| `labyrinthStopCleanOut` | `labyrinth/view/CleanOutFrame.as` | 131 LABYRINTH | [labyrinthHandler](../apps/game/src/handlers/eventos/index.ts#L82) `apps/game/src/handlers/eventos/index.ts:82` | `vendor/DDTank41/Game.Server/Packets/Client/LabyrinthHandler.cs` |
| `labyrinthSpeededUpCleanOut` | `labyrinth/view/CleanOutFrame.as` | 131 LABYRINTH | [labyrinthHandler](../apps/game/src/handlers/eventos/index.ts#L82) `apps/game/src/handlers/eventos/index.ts:82` | `vendor/DDTank41/Game.Server/Packets/Client/LabyrinthHandler.cs` |
| `labyrinthCleanOut` | `labyrinth/view/CleanOutFrame.as` | 131 LABYRINTH | [labyrinthHandler](../apps/game/src/handlers/eventos/index.ts#L82) `apps/game/src/handlers/eventos/index.ts:82` | `vendor/DDTank41/Game.Server/Packets/Client/LabyrinthHandler.cs` |
| `labyrinthDouble` | `labyrinth/view/LabyrinthFrame.as` | 131 LABYRINTH | [labyrinthHandler](../apps/game/src/handlers/eventos/index.ts#L82) `apps/game/src/handlers/eventos/index.ts:82` | `vendor/DDTank41/Game.Server/Packets/Client/LabyrinthHandler.cs` |
| `labyrinthRequestUpdate` | `labyrinth/view/LabyrinthFrame.as` | 131 LABYRINTH | [labyrinthHandler](../apps/game/src/handlers/eventos/index.ts#L82) `apps/game/src/handlers/eventos/index.ts:82` | `vendor/DDTank41/Game.Server/Packets/Client/LabyrinthHandler.cs` |
| `labyrinthReset` | `labyrinth/view/LabyrinthFrame.as` | 131 LABYRINTH | [labyrinthHandler](../apps/game/src/handlers/eventos/index.ts#L82) `apps/game/src/handlers/eventos/index.ts:82` | `vendor/DDTank41/Game.Server/Packets/Client/LabyrinthHandler.cs` |
| `sendFriendState` | `labyrinth/view/CleanOutFrame.as` | 160 IM_CMD | [im](../apps/game/src/handlers/amigos/index.ts#L60) `apps/game/src/handlers/amigos/index.ts:60` | `vendor/DDTank41/Game.Server/Packets/Client/IMHandler.cs` |

## Leilão

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `syncWeakStep` | `auctionHouse/controller/AuctionHouseController.as` | 15 USER_ANSWER | [USER_ANSWER](../apps/game/src/handlers/missoes/index.ts#L39) `apps/game/src/handlers/missoes/index.ts:39` | `vendor/DDTank41/Game.Server/Packets/Client/UserAnswerHandler.cs` |
| `sendQuestCheck` | `auctionHouse/controller/AuctionHouseController.as` | 181 QUEST_CHECK | [progressoMissao](../apps/game/src/handlers/missoes/index.ts#L37) `apps/game/src/handlers/missoes/index.ts:37` | `vendor/DDTank41/Game.Server/Packets/Client/QuestCheckHandler.cs` |
| `auctionGood` | `auctionHouse/view/AuctionSellLeftView.as` | 192 AUCTION_ADD | [add](../apps/game/src/handlers/leilao/index.ts#L22) `apps/game/src/handlers/leilao/index.ts:22` | `vendor/DDTank41/Game.Server/Packets/Client/AuctionAddHandler.cs` |
| `auctionBid` | `auctionHouse/view/AuctionBrowseView.as`<br>`auctionHouse/view/AuctionBuyView.as` | 193 AUCTION_UPDATE | [update](../apps/game/src/handlers/leilao/index.ts#L23) `apps/game/src/handlers/leilao/index.ts:23` | `vendor/DDTank41/Game.Server/Packets/Client/AuctionUpdateHandler.cs` |
| `auctionCancelSell` | `auctionHouse/view/AuctionSellView.as` | 194 AUCTION_DELETE | [remove](../apps/game/src/handlers/leilao/index.ts#L24) `apps/game/src/handlers/leilao/index.ts:24` | `vendor/DDTank41/Game.Server/Packets/Client/AuctionDeleteHandler.cs` |

## Liga de elite

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendItemEquip` | `eliteGame/view/EliteGamePaarungFrame.as` | 74 ITEM_EQUIP | [async](../apps/game/src/handlers/bolsa/ver-equipamento.ts#L14) `apps/game/src/handlers/bolsa/ver-equipamento.ts:14` | `vendor/DDTank41/Game.Server/Packets/Client/UserEquipListHandler.cs` |
| `sendGetSelfRankSroce` | `eliteGame/EliteGameController.as` | 162 ELITEGAME | [eliteGameHandler](../apps/game/src/handlers/eventos/index.ts#L86) `apps/game/src/handlers/eventos/index.ts:86` | `vendor/DDTank41/Game.Server/Packets/Client/EliteGameHandler.cs` |
| `sendGetEliteGameState` | `eliteGame/EliteGameController.as` | 162 ELITEGAME | [eliteGameHandler](../apps/game/src/handlers/eventos/index.ts#L86) `apps/game/src/handlers/eventos/index.ts:86` | `vendor/DDTank41/Game.Server/Packets/Client/EliteGameHandler.cs` |
| `sendEliteGameStart` | `eliteGame/EliteGameController.as` | 162 ELITEGAME | [eliteGameHandler](../apps/game/src/handlers/eventos/index.ts#L86) `apps/game/src/handlers/eventos/index.ts:86` | `vendor/DDTank41/Game.Server/Packets/Client/EliteGameHandler.cs` |
| `sendGetPaarungDetail` | `eliteGame/view/EliteGamePaarungFrame.as` | 162 ELITEGAME | [eliteGameHandler](../apps/game/src/handlers/eventos/index.ts#L86) `apps/game/src/handlers/eventos/index.ts:86` | `vendor/DDTank41/Game.Server/Packets/Client/EliteGameHandler.cs` |

## Lista de salas

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `syncWeakStep` | `roomList/pvpRoomList/RoomListCreateRoomView.as` | 15 USER_ANSWER | [USER_ANSWER](../apps/game/src/handlers/missoes/index.ts#L39) `apps/game/src/handlers/missoes/index.ts:39` | `vendor/DDTank41/Game.Server/Packets/Client/UserAnswerHandler.cs` |
| `sendSceneLogin` | `roomList/pveRoomList/DungeonListController.as`<br>`roomList/pvpRoomList/RoomListController.as` | 16 SCENE_LOGIN | [sceneLogin](../apps/game/src/handlers/basico/index.ts#L37) `apps/game/src/handlers/basico/index.ts:37` | `vendor/DDTank41/Game.Server/Packets/Client/UserEnterSceneHandler.cs` |
| `sendGameLogin` | `roomList/LookupRoomFrame.as`<br>`roomList/PassInputFrame.as` (+2) | 94 GAME_ROOM | [rr](../apps/game/src/handlers/salas/index.ts#L66) `apps/game/src/handlers/salas/index.ts:66` | `vendor/DDTank41/Game.Server/Packets/Client/GameRoomHandler.cs` |
| `sendUpdateRoomList` | `roomList/pveRoomList/DungeonListBGView.as`<br>`roomList/pvpRoomList/RoomListBGView.as` (+2) | 94 GAME_ROOM | [rr](../apps/game/src/handlers/salas/index.ts#L66) `apps/game/src/handlers/salas/index.ts:66` | `vendor/DDTank41/Game.Server/Packets/Client/GameRoomHandler.cs` |
| `sendCurrentState` | `roomList/pveRoomList/DungeonListController.as`<br>`roomList/pvpRoomList/RoomListController.as` | 251 SCENE_STATE | [sceneState](../apps/game/src/handlers/casamento/index.ts#L74) `apps/game/src/handlers/casamento/index.ts:74` | `vendor/DDTank41/Game.Server/Packets/Client/MarryStateHandler.cs` |

## Lobby

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendDailyAward` | `hall/HallStateView.as` | 13 DAILY_AWARD | [dailyAwardHandler](../apps/game/src/handlers/eventos/index.ts#L59) `apps/game/src/handlers/eventos/index.ts:59` | `vendor/DDTank41/Game.Server/Packets/Client/DailyAwardHandler.cs` |
| `syncWeakStep` | `hall/HallStateView.as` | 15 USER_ANSWER | [USER_ANSWER](../apps/game/src/handlers/missoes/index.ts#L39) `apps/game/src/handlers/missoes/index.ts:39` | `vendor/DDTank41/Game.Server/Packets/Client/UserAnswerHandler.cs` |
| `syncStep` | `hall/HallStateView.as` | 15 USER_ANSWER | [USER_ANSWER](../apps/game/src/handlers/missoes/index.ts#L39) `apps/game/src/handlers/missoes/index.ts:39` | `vendor/DDTank41/Game.Server/Packets/Client/UserAnswerHandler.cs` |
| `sendSceneLogin` | `hall/HallStateView.as` | 16 SCENE_LOGIN | [sceneLogin](../apps/game/src/handlers/basico/index.ts#L37) `apps/game/src/handlers/basico/index.ts:37` | `vendor/DDTank41/Game.Server/Packets/Client/UserEnterSceneHandler.cs` |
| `createUserGuide` | `hall/HallStateView.as` | 94 GAME_ROOM | [rr](../apps/game/src/handlers/salas/index.ts#L66) `apps/game/src/handlers/salas/index.ts:66` | `vendor/DDTank41/Game.Server/Packets/Client/GameRoomHandler.cs` |

## Loja

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `syncWeakStep` | `shop/view/ShopRightView.as` | 15 USER_ANSWER | [USER_ANSWER](../apps/game/src/handlers/missoes/index.ts#L39) `apps/game/src/handlers/missoes/index.ts:39` | `vendor/DDTank41/Game.Server/Packets/Client/UserAnswerHandler.cs` |
| `sendBuyGoods` | `shop/ShopController.as`<br>`shop/view/BuyMultiGoodsView.as` (+3) | 44 BUY_GOODS | [buyGoods](../apps/game/src/handlers/loja/comprar.ts#L130) `apps/game/src/handlers/loja/comprar.ts:130` | — |
| `sendPresentGoods` | `shop/manager/ShopGiftsManager.as`<br>`shop/ShopController.as` | 57 GOODS_PRESENT | [GOODS_PRESENT](../apps/game/src/handlers/loja/presentear-vitrine.ts#L14) `apps/game/src/handlers/loja/presentear-vitrine.ts:14` | `vendor/DDTank41/Game.Server/Packets/Client/UserPresentGoodsHandler.cs` |
| `sendGoodsContinue` | `shop/view/ShopRechargeEquipView.as` | 62 ITEM_CONTINUE | [itemContinue](../apps/game/src/handlers/loja/renovar.ts#L72) `apps/game/src/handlers/loja/renovar.ts:72` | `vendor/DDTank41/Game.Server/Packets/Client/UserItemContineueHandler.cs` |
| `sendFriendState` | `shop/ShopController.as` | 160 IM_CMD | [im](../apps/game/src/handlers/amigos/index.ts#L60) `apps/game/src/handlers/amigos/index.ts:60` | `vendor/DDTank41/Game.Server/Packets/Client/IMHandler.cs` |
| `sendUpdateGoodsCount` | `shop/ShopController.as` | 168 GOODS_COUNT | [GOODS_COUNT](../apps/game/src/handlers/loja/estoque-diario.ts#L13) `apps/game/src/handlers/loja/estoque-diario.ts:13` | `vendor/DDTank41/Game.Server/Packets/Client/GoodsCountHandler.cs` |
| `sendUseCard` | `shop/view/SetsShopView.as` | 183 CARD_USE | [cardUse](../apps/game/src/handlers/bolsa/usar-carta.ts#L88) `apps/game/src/handlers/bolsa/usar-carta.ts:88` | `vendor/DDTank41/Game.Server/Packets/Client/CardUseHandler.cs` |
| `sendCurrentState` | `shop/ShopController.as` | 251 SCENE_STATE | [sceneState](../apps/game/src/handlers/casamento/index.ts#L74) `apps/game/src/handlers/casamento/index.ts:74` | `vendor/DDTank41/Game.Server/Packets/Client/MarryStateHandler.cs` |

## Loteria

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendCardLotteryIds` | `lottery/view/CardChooseRightView.as` | 104 CARD_LOTTERY | [async](../apps/game/src/handlers/progressao/loterias.ts#L75) `apps/game/src/handlers/progressao/loterias.ts:75` | — |
| `sendLuckLottery` | `lottery/LotteryContorller.as` | 105 LUCK_LOTTERY | [async](../apps/game/src/handlers/progressao/loterias.ts#L105) `apps/game/src/handlers/progressao/loterias.ts:105` | — |
| `gotoCardLottery` | `lottery/LotteryContorller.as` | 239 GOTO_CARD_LOTTERY | [GOTO_CARD_LOTTERY](../apps/game/src/handlers/progressao/loterias.ts#L67) `apps/game/src/handlers/progressao/loterias.ts:67` | — |

## Mascote

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendPetFightUnFight` | `pet/sprite/PetSpriteController.as` | 68 PET | [petCommand](../apps/game/src/handlers/mascote/index.ts#L82) `apps/game/src/handlers/mascote/index.ts:82` | `vendor/DDTank41/Game.Server/Packets/Client/PetHandler.cs` |

## Minigames

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendErrorMsg` | `littleGame/LittleGamePacketQueue.as` | 8 CLIENT_LOG | [clientLog](../apps/game/src/handlers/basico/index.ts#L32) `apps/game/src/handlers/basico/index.ts:32` | `vendor/DDTank41/Game.Server/Packets/Client/ClientErrorLog.cs` |
| `sendBuyGoods` | `littleGame/view/AwardGoodItem.as` | 44 BUY_GOODS | [buyGoods](../apps/game/src/handlers/loja/comprar.ts#L130) `apps/game/src/handlers/loja/comprar.ts:130` | — |

## Missões

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `syncWeakStep` | `quest/TaskMainFrame.as` | 15 USER_ANSWER | [USER_ANSWER](../apps/game/src/handlers/missoes/index.ts#L39) `apps/game/src/handlers/missoes/index.ts:39` | `vendor/DDTank41/Game.Server/Packets/Client/UserAnswerHandler.cs` |
| `sendCollectInfoValidate` | `quest/InfoCollectView.as` | 32 COLLECTINFO | [COLLECTINFO](../apps/game/src/handlers/missoes/stubs.ts#L23) `apps/game/src/handlers/missoes/stubs.ts:23` | — |
| `sendQuestFinish` | `quest/TaskMainFrame.as` | 179 QUEST_FINISH | [entregarMissao](../apps/game/src/handlers/missoes/index.ts#L36) `apps/game/src/handlers/missoes/index.ts:36` | `vendor/DDTank41/Game.Server/Packets/Client/QuestFinishHandler.cs` |

## Núcleo do cliente (várias telas)

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendLogin` | `ddt/manager/SocketManager.as` | 1 LOGIN | **FALTA PORTAR** | `vendor/DDTank41/Game.Server/Packets/Client/UserLoginHandler.cs` |
| `sendPint` | `ddt/manager/SocketManager.as` | 4 PING | **FALTA PORTAR** | `vendor/DDTank41/Game.Server/Packets/Client/PingTimeCallBackHandler.cs` |
| `sendErrorMsg` | `ddt/bagStore/BagStoreFrame.as`<br>`ddt/data/BagInfo.as` (+5) | 8 CLIENT_LOG | [clientLog](../apps/game/src/handlers/basico/index.ts#L32) `apps/game/src/handlers/basico/index.ts:32` | `vendor/DDTank41/Game.Server/Packets/Client/ClientErrorLog.cs` |
| `sendActivePullDown` | `ddt/view/NovicePlatinumCard.as` | 11 ACTIVE_PULLDOWN | [async](../apps/game/src/handlers/progressao/loterias.ts#L123) `apps/game/src/handlers/progressao/loterias.ts:123` | — |
| `syncWeakStep` | `ddt/manager/ChatManager.as` | 15 USER_ANSWER | [USER_ANSWER](../apps/game/src/handlers/missoes/index.ts#L39) `apps/game/src/handlers/missoes/index.ts:39` | `vendor/DDTank41/Game.Server/Packets/Client/UserAnswerHandler.cs` |
| `sendFace` | `ddt/manager/ChatManager.as` | 20 SCENE_FACE | [sceneFace](../apps/game/src/handlers/chat/index.ts#L28) `apps/game/src/handlers/chat/index.ts:28` | `vendor/DDTank41/Game.Server/Packets/Client/SceneSmileHandler.cs` |
| `sendBagLocked` | `ddt/manager/ServerManager.as` | 25 BAG_LOCKED | [async](../apps/game/src/handlers/bolsa/senha-da-bolsa.ts#L57) `apps/game/src/handlers/bolsa/senha-da-bolsa.ts:57` | — |
| `sendRouletteBox` | `ddt/manager/RouletteManager.as`<br>`ddt/view/caddyII/CaddyViewII.as` | 26 LOTTERY_OPEN_BOX | [lotteryOpenBox](../apps/game/src/handlers/eventos/index.ts#L74) `apps/game/src/handlers/eventos/index.ts:74` | `vendor/DDTank41/Game.Server/Packets/Client/LotteryOpenBoxHandler.cs` |
| `sendOpenDead` | `ddt/view/caddyII/bead/BeadViewII.as`<br>`ddt/view/caddyII/offerPack/OfferPackViewII.as` | 26 LOTTERY_OPEN_BOX | [lotteryOpenBox](../apps/game/src/handlers/eventos/index.ts#L74) `apps/game/src/handlers/eventos/index.ts:74` | `vendor/DDTank41/Game.Server/Packets/Client/LotteryOpenBoxHandler.cs` |
| `sendStartTurn` | `ddt/view/roulette/RouletteView.as` | 27 LOTTERY_RANDOM_SELECT | [lotteryRandomSelect](../apps/game/src/handlers/eventos/index.ts#L75) `apps/game/src/handlers/eventos/index.ts:75` | `vendor/DDTank41/Game.Server/Packets/Client/LotteryRandomSelectHandler.cs` |
| `sendFinishRoulette` | `ddt/view/caddyII/CaddyFrame.as`<br>`ddt/view/caddyII/CardBoxFrame.as` (+1) | 28 LOTTERY_FINISH | [lotteryFinish](../apps/game/src/handlers/eventos/index.ts#L76) `apps/game/src/handlers/eventos/index.ts:76` | `vendor/DDTank41/Game.Server/Packets/Client/LotteryFinishBoxHandler.cs` |
| `sendSnsMsg` | `ddt/manager/DynamicManager.as`<br>`ddt/view/SNSFrame.as` | 40 SNS_MSG_RECEIVE | [snsMsgReceive](../apps/game/src/handlers/amigos/index.ts#L62) `apps/game/src/handlers/amigos/index.ts:62` | — |
| `sendBuyGoods` | `ddt/command/QuickBuyFrame.as`<br>`ddt/view/caddyII/bead/CardBoxQuickBuy.as` (+3) | 44 BUY_GOODS | [buyGoods](../apps/game/src/handlers/loja/comprar.ts#L130) `apps/game/src/handlers/loja/comprar.ts:130` | — |
| `sendQequestBadLuck` | `ddt/view/caddyII/badLuck/CaddyBadLuckView.as` | 45 CADDY_GET_BADLUCK | [caddyBadLuck](../apps/game/src/handlers/eventos/index.ts#L77) `apps/game/src/handlers/eventos/index.ts:77` | `vendor/DDTank41/Game.Server/Packets/Client/RequestBadLuckHandler.cs` |
| `sendMoveGoods` | `ddt/view/caddyII/CaddyBagView.as` | 49 CHANGE_PLACE_GOODS | [CHANGE_PLACE_GOODS](../apps/game/src/handlers/bolsa/mover.ts#L93) `apps/game/src/handlers/bolsa/mover.ts:93` | — |
| `sendGetTimeBox` | `ddt/manager/BossBoxManager.as`<br>`ddt/view/bossbox/BossBoxView.as` | 53 GET_TIME_BOX | [timeBox](../apps/game/src/handlers/eventos/index.ts#L60) `apps/game/src/handlers/eventos/index.ts:60` | `vendor/DDTank41/Game.Server/Packets/Client/UserGetBoxHandler.cs` |
| `sendGoodsContinue` | `ddt/view/goods/AddPricePanel.as` | 62 ITEM_CONTINUE | [itemContinue](../apps/game/src/handlers/loja/renovar.ts#L72) `apps/game/src/handlers/loja/renovar.ts:72` | `vendor/DDTank41/Game.Server/Packets/Client/UserItemContineueHandler.cs` |
| `delPetEquip` | `ddt/data/goods/InventoryItemInfo.as`<br>`ddt/data/player/SelfInfo.as` | 68 PET | [petCommand](../apps/game/src/handlers/mascote/index.ts#L82) `apps/game/src/handlers/mascote/index.ts:82` | `vendor/DDTank41/Game.Server/Packets/Client/PetHandler.cs` |
| `sendSBugle` | `ddt/manager/ChatManager.as` | 71 S_BUGLE | [smallBugle](../apps/game/src/handlers/chat/index.ts#L24) `apps/game/src/handlers/chat/index.ts:24` | `vendor/DDTank41/Game.Server/Packets/Client/SmallBugleHandler.cs` |
| `sendBBugle` | `ddt/manager/ChatManager.as`<br>`ddt/view/chat/ChatBugleInputFrame.as` | 72 B_BUGLE | [bigBugle](../apps/game/src/handlers/chat/index.ts#L25) `apps/game/src/handlers/chat/index.ts:25` | `vendor/DDTank41/Game.Server/Packets/Client/BigBugleHandler.cs` |
| `sendCBugle` | `ddt/manager/ChatManager.as` | 73 C_BUGLE | [worldBugle](../apps/game/src/handlers/chat/index.ts#L26) `apps/game/src/handlers/chat/index.ts:26` | `vendor/DDTank41/Game.Server/Packets/Client/CBugleHandler.cs` |
| `sendItemOverDue` | `ddt/data/goods/InventoryItemInfo.as`<br>`ddt/data/player/SelfInfo.as` | 77 ITEM_OVERDUE | [async](../apps/game/src/handlers/bolsa/item-vencido.ts#L19) `apps/game/src/handlers/bolsa/item-vencido.ts:19` | — |
| `sendQuestionReply` | `ddt/manager/QuestionInfoMannager.as` | 89 QUESTION_REPLY | [QUESTION_REPLY](../apps/game/src/handlers/missoes/stubs.ts#L27) `apps/game/src/handlers/missoes/stubs.ts:27` | — |
| `sendDailyRecord` | `ddt/dailyRecord/DailyRecordControl.as` | 103 DAILYRECORD | [dailyRecordHandler](../apps/game/src/handlers/eventos/index.ts#L62) `apps/game/src/handlers/eventos/index.ts:62` | `vendor/DDTank41/Game.Server/Packets/Client/DailyRecordHandler.cs` |
| `sendGetLinkGoodsInfo` | `ddt/view/chat/ChatOutputField.as` | 119 LINKREQUEST_GOODS | [async](../apps/game/src/handlers/bolsa/comparar-item.ts#L13) `apps/game/src/handlers/bolsa/comparar-item.ts:13` | `vendor/DDTank41/Game.Server/Packets/Client/GetLinkGoodsHandler.cs` |
| `sendClearStoreBag` | `ddt/bagStore/BagStoreFrame.as` | 122 CLEAR_STORE_BAG | [clearStoreBag](../apps/game/src/handlers/forja/index.ts#L76) `apps/game/src/handlers/forja/index.ts:76` | `vendor/DDTank41/Game.Server/Packets/Client/StoreClearItemHandler.cs` |
| `sendMoveGoodsAll` | `ddt/data/BagInfo.as` | 124 CHANGE_PLACE_GOODS_ALL | [CHANGE_PLACE_GOODS_ALL](../apps/game/src/handlers/bolsa/organizar-bolsa.ts#L50) `apps/game/src/handlers/bolsa/organizar-bolsa.ts:50` | `vendor/DDTank41/Game.Server/Packets/Client/ArrangeBagHandler.cs` |
| `sendQuickBuyGoldBox` | `ddt/command/QuickBuyFrame.as` | 126 BUY_QUICK_GOLDBOX | [BUY_QUICK_GOLDBOX](../apps/game/src/handlers/loja/bau-rapido-ouro.ts#L14) `apps/game/src/handlers/loja/bau-rapido-ouro.ts:14` | `vendor/DDTank41/Game.Server/Packets/Client/QuickBuyGoldBoxHandler.cs` |
| `sendConsortiaRichOffer` | `ddt/view/consortia/MyConsortiaTax.as` | 129 CONSORTIA_CMD | [consortiaRouter](../apps/game/src/handlers/sociedade/index.ts#L95) `apps/game/src/handlers/sociedade/index.ts:95` | `vendor/DDTank41/Game.Server/Packets/Client/ConsortiaHandler.cs` |
| `sendConsortiaMemberGrade` | `ddt/view/tips/PlayerTip.as` | 129 CONSORTIA_CMD | [consortiaRouter](../apps/game/src/handlers/sociedade/index.ts#L95) `apps/game/src/handlers/sociedade/index.ts:95` | `vendor/DDTank41/Game.Server/Packets/Client/ConsortiaHandler.cs` |
| `sendConsortiaInvate` | `ddt/view/tips/PlayerTip.as` | 129 CONSORTIA_CMD | [consortiaRouter](../apps/game/src/handlers/sociedade/index.ts#L95) `apps/game/src/handlers/sociedade/index.ts:95` | `vendor/DDTank41/Game.Server/Packets/Client/ConsortiaHandler.cs` |
| `sendConsortiaOut` | `ddt/view/tips/PlayerTip.as` | 129 CONSORTIA_CMD | [consortiaRouter](../apps/game/src/handlers/sociedade/index.ts#L95) `apps/game/src/handlers/sociedade/index.ts:95` | `vendor/DDTank41/Game.Server/Packets/Client/ConsortiaHandler.cs` |
| `sendForbidSpeak` | `ddt/view/tips/PlayerTip.as` | 129 CONSORTIA_CMD | [consortiaRouter](../apps/game/src/handlers/sociedade/index.ts#L95) `apps/game/src/handlers/sociedade/index.ts:95` | `vendor/DDTank41/Game.Server/Packets/Client/ConsortiaHandler.cs` |
| `sendFriendState` | `ddt/manager/PlayerStateManager.as` | 160 IM_CMD | [im](../apps/game/src/handlers/amigos/index.ts#L60) `apps/game/src/handlers/amigos/index.ts:60` | `vendor/DDTank41/Game.Server/Packets/Client/IMHandler.cs` |
| `sendAddFriend` | `ddt/view/tips/FriendGroupTItem.as` | 160 IM_CMD | [im](../apps/game/src/handlers/amigos/index.ts#L60) `apps/game/src/handlers/amigos/index.ts:60` | `vendor/DDTank41/Game.Server/Packets/Client/IMHandler.cs` |
| `sendHotSpringRoomPlayerRemove` | `ddt/manager/HotSpringManager.as` | 169 HOTSPRING_ROOM_PLAYER_REMOVE | [hotSpringRoomPlayerRemove](../apps/game/src/handlers/termas/index.ts#L56) `apps/game/src/handlers/termas/index.ts:56` | `vendor/DDTank41/Game.Server/Packets/Client/HotSpringRoomPlayerRemoveHandler.cs` |
| `sendQuestAdd` | `ddt/manager/TaskManager.as` | 176 QUEST_ADD | [aceitarMissoes](../apps/game/src/handlers/missoes/index.ts#L34) `apps/game/src/handlers/missoes/index.ts:34` | `vendor/DDTank41/Game.Server/Packets/Client/QuestAddHandler.cs` |
| `sendQuestFinish` | `ddt/manager/TaskManager.as` | 179 QUEST_FINISH | [entregarMissao](../apps/game/src/handlers/missoes/index.ts#L36) `apps/game/src/handlers/missoes/index.ts:36` | `vendor/DDTank41/Game.Server/Packets/Client/QuestFinishHandler.cs` |
| `sendQuestCheck` | `ddt/manager/ChatManager.as`<br>`ddt/manager/TaskManager.as` | 181 QUEST_CHECK | [progressoMissao](../apps/game/src/handlers/missoes/index.ts#L37) `apps/game/src/handlers/missoes/index.ts:37` | `vendor/DDTank41/Game.Server/Packets/Client/QuestCheckHandler.cs` |
| `sendUseCard` | `ddt/view/buff/buffButton/BuffButton.as` | 183 CARD_USE | [cardUse](../apps/game/src/handlers/bolsa/usar-carta.ts#L88) `apps/game/src/handlers/bolsa/usar-carta.ts:88` | `vendor/DDTank41/Game.Server/Packets/Client/CardUseHandler.cs` |
| `sendCheckCode` | `ddt/view/CheckCodeFrame.as` | 200 CHECK_CODE | [CHECK_CODE](../apps/game/src/handlers/bolsa/codigo-verificacao.ts#L14) `apps/game/src/handlers/bolsa/codigo-verificacao.ts:14` | `vendor/DDTank41/Game.Server/Packets/Client/CheckCodeHandler.cs` |
| `sendLookupEffort` | `ddt/manager/EffortManager.as` | 203 LOOKUP_EFFORT | [async](../apps/game/src/handlers/bolsa/conquistas.ts#L14) `apps/game/src/handlers/bolsa/conquistas.ts:14` | `vendor/DDTank41/Game.Server/Packets/Client/LookupEffortHandler.cs` |
| `sendOpenAll` | `ddt/view/caddyII/CaddyBagView.as` | 204 OPEN_ALL_CARDBOX | [openAllCardBox](../apps/game/src/handlers/eventos/index.ts#L78) `apps/game/src/handlers/eventos/index.ts:78` | `vendor/DDTank41/Game.Server/Packets/Client/OpenAllCardBoxHandler.cs` |
| `sendChangeColorShellTimeOver` | `ddt/data/goods/InventoryItemInfo.as` | 206 CHANGE_COLOR_OVER_DUE | **FALTA PORTAR** | `vendor/DDTank41/Game.Server/Packets/Client/ChangeColorShellTimeOverHandler.cs` |
| `sendSortCards` | `ddt/data/BagInfo.as` | 216 CARDS_DATA | [cardCommand](../apps/game/src/handlers/mascote/index.ts#L83) `apps/game/src/handlers/mascote/index.ts:83` | `vendor/DDTank41/Game.Server/Packets/Client/CardDataHandler.cs` |
| `sendOpenCardBox` | `ddt/view/caddyII/card/CardViewII.as` | 216 CARDS_DATA | [cardCommand](../apps/game/src/handlers/mascote/index.ts#L83) `apps/game/src/handlers/mascote/index.ts:83` | `vendor/DDTank41/Game.Server/Packets/Client/CardDataHandler.cs` |
| `sendPlayerGift` | `ddt/manager/PlayerManager.as`<br>`ddt/manager/ServerManager.as` | 218 USER_GET_GIFTS | [async](../apps/game/src/handlers/bolsa/presentes-recebidos.ts#L17) `apps/game/src/handlers/bolsa/presentes-recebidos.ts:17` | `vendor/DDTank41/Game.Server/Packets/Client/PlayerGiftHandler.cs` |
| `sendCIDInfo` | `ddt/view/enthrall/ValidateFrame.as` | 224 CID_CHECK | [cidCheck](../apps/game/src/handlers/basico/index.ts#L36) `apps/game/src/handlers/basico/index.ts:36` | — |
| `sendAchievementFinish` | `ddt/manager/EffortManager.as` | 230 ACHIEVEMENT_FINISH | [achievementFinishHandler](../apps/game/src/handlers/eventos/index.ts#L68) `apps/game/src/handlers/eventos/index.ts:68` | `vendor/DDTank41/Game.Server/Packets/Client/AchievementFinishHandler.cs` |
| `sendExitRoom` | `ddt/manager/ChurchManager.as` | 244 PLAYER_EXIT_MARRY_ROOM | [playerExitMarryRoom](../apps/game/src/handlers/casamento/index.ts#L72) `apps/game/src/handlers/casamento/index.ts:72` | `vendor/DDTank41/Game.Server/Packets/Client/UserLeaveMarryRoom.cs` |
| `refund` | `ddt/manager/ChurchManager.as` | 249 MARRY_CMD | [cmd](../apps/game/src/handlers/casamento/index.ts#L54) `apps/game/src/handlers/casamento/index.ts:54` | `vendor/DDTank41/Game.Server/Packets/Client/MarryDataHandler.cs` |
| `sendAcademyApprenticeConfirm` | `ddt/view/academyCommon/academyRequest/AcademyAnswerApprenticeFrame.as` | undefined A | **FALTA PORTAR** | — |
| `sendAcademyMasterConfirm` | `ddt/view/academyCommon/academyRequest/AcademyAnswerMasterFrame.as` | undefined A | **FALTA PORTAR** | — |
| `sendAcademyMaster` | `ddt/view/academyCommon/academyRequest/AcademyRequestApprenticeFrame.as` | undefined A | **FALTA PORTAR** | — |
| `sendAcademyApprentice` | `ddt/view/academyCommon/academyRequest/AcademyRequestMasterFrame.as` | undefined A | **FALTA PORTAR** | — |
| `sendAcademyFireApprentice` | `ddt/view/academyCommon/myAcademy/myAcademyItem/MyAcademyApprenticeItem.as` | undefined A | **FALTA PORTAR** | — |
| `sendAcademyFireMaster` | `ddt/view/academyCommon/myAcademy/myAcademyItem/MyAcademyMasterItem.as` | undefined A | **FALTA PORTAR** | — |
| `sendAcademyRegister` | `ddt/view/academyCommon/register/AcademyRegisterFrame.as` | undefined A | **FALTA PORTAR** | — |
| `sendSellAll` | `ddt/view/caddyII/CaddyBagView.as`<br>`ddt/view/caddyII/CaddyFrame.as` (+1) | 232 CADDY_SELL_ALL_GOODS | [caddySellAll](../apps/game/src/handlers/eventos/index.ts#L79) `apps/game/src/handlers/eventos/index.ts:79` | `vendor/DDTank41/Game.Server/Packets/Client/CaddyClearAllHandler.cs` |
| `sendEnterRoom` | `ddt/view/common/church/ChurchInviteFrame.as` | 242 MARRY_ROOM_LOGIN | [marryRoomLogin](../apps/game/src/handlers/casamento/index.ts#L71) `apps/game/src/handlers/casamento/index.ts:71` | `vendor/DDTank41/Game.Server/Packets/Client/MarryRoomLoginHandler.cs` |
| `sendRequestAwards` | `ddt/view/caddyII/reader/ReadAwardsView.as` | 245 CADDY_GET_AWARDS | **FALTA PORTAR** | `vendor/DDTank41/Game.Server/Packets/Client/RequestAwardsHandler.cs` |
| `sendPropose` | `ddt/view/common/church/ChurchBuyRingFrame.as`<br>`ddt/view/common/church/ChurchProposeFrame.as` | 247 MARRY_APPLY | [marryApply](../apps/game/src/handlers/casamento/index.ts#L58) `apps/game/src/handlers/casamento/index.ts:58` | `vendor/DDTank41/Game.Server/Packets/Client/MarryApplyHandler.cs` |
| `sendProposeRespose` | `ddt/view/common/church/ChurchProposeResponseFrame.as` | 250 MARRY_APPLY_REPLY | [marryApplyReply](../apps/game/src/handlers/casamento/index.ts#L59) `apps/game/src/handlers/casamento/index.ts:59` | `vendor/DDTank41/Game.Server/Packets/Client/MarryApplyReplyHandler.cs` |

## overSeasCommunity

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendQuestCheck` | `overSeasCommunity/OverSeasCommunController.as` | 181 QUEST_CHECK | [progressoMissao](../apps/game/src/handlers/missoes/index.ts#L37) `apps/game/src/handlers/missoes/index.ts:37` | `vendor/DDTank41/Game.Server/Packets/Client/QuestCheckHandler.cs` |

## Ranking

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `syncWeakStep` | `tofflist/TofflistController.as` | 15 USER_ANSWER | [USER_ANSWER](../apps/game/src/handlers/missoes/index.ts#L39) `apps/game/src/handlers/missoes/index.ts:39` | `vendor/DDTank41/Game.Server/Packets/Client/UserAnswerHandler.cs` |
| `sendConsortiaTryIn` | `tofflist/view/TofflistLeftCurrentCharcter.as` | 129 CONSORTIA_CMD | [consortiaRouter](../apps/game/src/handlers/sociedade/index.ts#L95) `apps/game/src/handlers/sociedade/index.ts:95` | `vendor/DDTank41/Game.Server/Packets/Client/ConsortiaHandler.cs` |
| `sendQuestCheck` | `tofflist/TofflistController.as` | 181 QUEST_CHECK | [progressoMissao](../apps/game/src/handlers/missoes/index.ts#L37) `apps/game/src/handlers/missoes/index.ts:37` | `vendor/DDTank41/Game.Server/Packets/Client/QuestCheckHandler.cs` |

## Roleta

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendStartTurn_LeftGun` | `roulette/RouletteFrame.as` | 128 LEFT_GUN_ROULETTE_SOCKET | [async](../apps/game/src/handlers/loja/roleta-canhao.ts#L30) `apps/game/src/handlers/loja/roleta-canhao.ts:30` | — |
| `sendEndTurn_LeftGun` | `roulette/RouletteFrame.as` | 130 LEFT_GUN_ROULETTE_COMPLETTE | [LEFT_GUN_COMPLETE](../apps/game/src/handlers/loja/roleta-canhao.ts#L16) `apps/game/src/handlers/loja/roleta-canhao.ts:16` | `vendor/DDTank41/Game.Server/Packets/Client/LeftGunCompleteHandler.cs` |

## Sala

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `syncWeakStep` | `room/view/roomView/BaseRoomView.as`<br>`room/view/roomView/MatchRoomView.as` (+1) | 15 USER_ANSWER | [USER_ANSWER](../apps/game/src/handlers/missoes/index.ts#L39) `apps/game/src/handlers/missoes/index.ts:39` | `vendor/DDTank41/Game.Server/Packets/Client/UserAnswerHandler.cs` |
| `sendBuyProp` | `room/view/RoomPropCell.as`<br>`room/view/states/FreshmanRoomState.as` | 54 PROP_BUY | [PROP_BUY](../apps/game/src/handlers/loja/props-de-luta.ts#L69) `apps/game/src/handlers/loja/props-de-luta.ts:69` | `vendor/DDTank41/Game.Server/Packets/Client/PropBuyHandler.cs` |
| `sendSellProp` | `room/view/RoomPropCell.as` | 55 PROP_SELL | [PROP_SELL](../apps/game/src/handlers/loja/props-de-luta.ts#L95) `apps/game/src/handlers/loja/props-de-luta.ts:95` | `vendor/DDTank41/Game.Server/Packets/Client/PropSellHandler.cs` |
| `sendGameStyle` | `room/view/bigMapInfoPanel/MatchRoomBigMapInfoPanel.as` | 94 GAME_ROOM | [rr](../apps/game/src/handlers/salas/index.ts#L66) `apps/game/src/handlers/salas/index.ts:66` | `vendor/DDTank41/Game.Server/Packets/Client/GameRoomHandler.cs` |
| `enterUserGuide` | `room/view/states/FreshmanRoomState.as` | 94 GAME_ROOM | [rr](../apps/game/src/handlers/salas/index.ts#L66) `apps/game/src/handlers/salas/index.ts:66` | `vendor/DDTank41/Game.Server/Packets/Client/GameRoomHandler.cs` |

## Senha da bolsa

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendBagLocked` | `baglocked/BagLockedController.as` | 25 BAG_LOCKED | [async](../apps/game/src/handlers/bolsa/senha-da-bolsa.ts#L57) `apps/game/src/handlers/bolsa/senha-da-bolsa.ts:57` | — |

## socialContact

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendWithBrithday` | `socialContact/friendBirthday/FriendBirthdayManager.as` | 223 FRIEND_BRITHDAY | [friendBirthday](../apps/game/src/handlers/amigos/index.ts#L63) `apps/game/src/handlers/amigos/index.ts:63` | — |

## Sociedade (guilda)

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendBuyGoods` | `consortion/view/selfConsortia/ConsortionShopItem.as` | 44 BUY_GOODS | [buyGoods](../apps/game/src/handlers/loja/comprar.ts#L130) `apps/game/src/handlers/loja/comprar.ts:130` | — |
| `sendMoveGoods` | `consortion/view/selfConsortia/ConsortionBankBagView.as` | 49 CHANGE_PLACE_GOODS | [CHANGE_PLACE_GOODS](../apps/game/src/handlers/bolsa/mover.ts#L93) `apps/game/src/handlers/bolsa/mover.ts:93` | — |
| `sendConsortiaInvatePass` | `consortion/ConsortionModelControl.as`<br>`consortion/view/club/ClubRecordItem.as` | 129 CONSORTIA_CMD | [consortiaRouter](../apps/game/src/handlers/sociedade/index.ts#L95) `apps/game/src/handlers/sociedade/index.ts:95` | `vendor/DDTank41/Game.Server/Packets/Client/ConsortiaHandler.cs` |
| `sendConsortiaInvateDelete` | `consortion/ConsortionModelControl.as` | 129 CONSORTIA_CMD | [consortiaRouter](../apps/game/src/handlers/sociedade/index.ts#L95) `apps/game/src/handlers/sociedade/index.ts:95` | `vendor/DDTank41/Game.Server/Packets/Client/ConsortiaHandler.cs` |
| `sendConsortiaTryinDelete` | `consortion/view/club/ClubRecordItem.as`<br>`consortion/view/selfConsortia/TakeInMemberFrame.as` (+1) | 129 CONSORTIA_CMD | [consortiaRouter](../apps/game/src/handlers/sociedade/index.ts#L95) `apps/game/src/handlers/sociedade/index.ts:95` | `vendor/DDTank41/Game.Server/Packets/Client/ConsortiaHandler.cs` |
| `sendConsortiaTryIn` | `consortion/view/club/ClubView.as` | 129 CONSORTIA_CMD | [consortiaRouter](../apps/game/src/handlers/sociedade/index.ts#L95) `apps/game/src/handlers/sociedade/index.ts:95` | `vendor/DDTank41/Game.Server/Packets/Client/ConsortiaHandler.cs` |
| `sendCreateConsortia` | `consortion/view/club/CreateConsortionFrame.as` | 129 CONSORTIA_CMD | [consortiaRouter](../apps/game/src/handlers/sociedade/index.ts#L95) `apps/game/src/handlers/sociedade/index.ts:95` | `vendor/DDTank41/Game.Server/Packets/Client/ConsortiaHandler.cs` |
| `sendBuyBadge` | `consortion/view/selfConsortia/BadgeShopItem.as` | 129 CONSORTIA_CMD | [consortiaRouter](../apps/game/src/handlers/sociedade/index.ts#L95) `apps/game/src/handlers/sociedade/index.ts:95` | `vendor/DDTank41/Game.Server/Packets/Client/ConsortiaHandler.cs` |
| `sendReleaseConsortiaTask` | `consortion/view/selfConsortia/consortiaTask/ConsortiaReleaseTaskFrame.as`<br>`consortion/view/selfConsortia/consortiaTask/ConsortiaSubmitTaskFrame.as` (+1) | 129 CONSORTIA_CMD | [consortiaRouter](../apps/game/src/handlers/sociedade/index.ts#L95) `apps/game/src/handlers/sociedade/index.ts:95` | `vendor/DDTank41/Game.Server/Packets/Client/ConsortiaHandler.cs` |
| `sendDonate` | `consortion/view/selfConsortia/consortiaTask/DonateFrame.as` | 129 CONSORTIA_CMD | [consortiaRouter](../apps/game/src/handlers/sociedade/index.ts#L95) `apps/game/src/handlers/sociedade/index.ts:95` | `vendor/DDTank41/Game.Server/Packets/Client/ConsortiaHandler.cs` |
| `sendConsortiaUpdateDescription` | `consortion/view/selfConsortia/ConsortionDeclareFrame.as` | 129 CONSORTIA_CMD | [consortiaRouter](../apps/game/src/handlers/sociedade/index.ts#L95) `apps/game/src/handlers/sociedade/index.ts:95` | `vendor/DDTank41/Game.Server/Packets/Client/ConsortiaHandler.cs` |
| `sendConsortionMail` | `consortion/view/selfConsortia/ConsortionMailFrame.as` | 129 CONSORTIA_CMD | [consortiaRouter](../apps/game/src/handlers/sociedade/index.ts#L95) `apps/game/src/handlers/sociedade/index.ts:95` | `vendor/DDTank41/Game.Server/Packets/Client/ConsortiaHandler.cs` |
| `sendConsortionSkill` | `consortion/view/selfConsortia/ConsortionOpenSkillFrame.as`<br>`consortion/view/selfConsortia/ConsortionSkillItem.as` | 129 CONSORTIA_CMD | [consortiaRouter](../apps/game/src/handlers/sociedade/index.ts#L95) `apps/game/src/handlers/sociedade/index.ts:95` | `vendor/DDTank41/Game.Server/Packets/Client/ConsortiaHandler.cs` |
| `sendConsortionPoll` | `consortion/view/selfConsortia/ConsortionPollFrame.as` | 129 CONSORTIA_CMD | [consortiaRouter](../apps/game/src/handlers/sociedade/index.ts#L95) `apps/game/src/handlers/sociedade/index.ts:95` | `vendor/DDTank41/Game.Server/Packets/Client/ConsortiaHandler.cs` |
| `sendConsortiaOut` | `consortion/view/selfConsortia/ConsortionQuitFrame.as` | 129 CONSORTIA_CMD | [consortiaRouter](../apps/game/src/handlers/sociedade/index.ts#L95) `apps/game/src/handlers/sociedade/index.ts:95` | `vendor/DDTank41/Game.Server/Packets/Client/ConsortiaHandler.cs` |
| `sendConsortiaChangeChairman` | `consortion/view/selfConsortia/ConsortionTrasferFrame.as` | 129 CONSORTIA_CMD | [consortiaRouter](../apps/game/src/handlers/sociedade/index.ts#L95) `apps/game/src/handlers/sociedade/index.ts:95` | `vendor/DDTank41/Game.Server/Packets/Client/ConsortiaHandler.cs` |
| `sendConsortiaLevelUp` | `consortion/view/selfConsortia/ConsortionUpGradeFrame.as` | 129 CONSORTIA_CMD | [consortiaRouter](../apps/game/src/handlers/sociedade/index.ts#L95) `apps/game/src/handlers/sociedade/index.ts:95` | `vendor/DDTank41/Game.Server/Packets/Client/ConsortiaHandler.cs` |
| `sendConsortiaUpdateDuty` | `consortion/view/selfConsortia/JobManageItem.as` | 129 CONSORTIA_CMD | [consortiaRouter](../apps/game/src/handlers/sociedade/index.ts#L95) `apps/game/src/handlers/sociedade/index.ts:95` | `vendor/DDTank41/Game.Server/Packets/Client/ConsortiaHandler.cs` |
| `sendConsortiaEquipConstrol` | `consortion/view/selfConsortia/ManagerFrame.as` | 129 CONSORTIA_CMD | [consortiaRouter](../apps/game/src/handlers/sociedade/index.ts#L95) `apps/game/src/handlers/sociedade/index.ts:95` | `vendor/DDTank41/Game.Server/Packets/Client/ConsortiaHandler.cs` |
| `sendConsortiaUpdatePlacard` | `consortion/view/selfConsortia/PlacardAndEvent.as` | 129 CONSORTIA_CMD | [consortiaRouter](../apps/game/src/handlers/sociedade/index.ts#L95) `apps/game/src/handlers/sociedade/index.ts:95` | `vendor/DDTank41/Game.Server/Packets/Client/ConsortiaHandler.cs` |
| `sendConsortiaDismiss` | `consortion/view/selfConsortia/SelfConsortiaView.as` | 129 CONSORTIA_CMD | [consortiaRouter](../apps/game/src/handlers/sociedade/index.ts#L95) `apps/game/src/handlers/sociedade/index.ts:95` | `vendor/DDTank41/Game.Server/Packets/Client/ConsortiaHandler.cs` |
| `sendConsoritaApplyStatusOut` | `consortion/view/selfConsortia/TakeInMemberFrame.as` | 129 CONSORTIA_CMD | [consortiaRouter](../apps/game/src/handlers/sociedade/index.ts#L95) `apps/game/src/handlers/sociedade/index.ts:95` | `vendor/DDTank41/Game.Server/Packets/Client/ConsortiaHandler.cs` |
| `sendConsortiaTryinPass` | `consortion/view/selfConsortia/TakeInMemberFrame.as`<br>`consortion/view/selfConsortia/TakeInMemberItem.as` | 129 CONSORTIA_CMD | [consortiaRouter](../apps/game/src/handlers/sociedade/index.ts#L95) `apps/game/src/handlers/sociedade/index.ts:95` | `vendor/DDTank41/Game.Server/Packets/Client/ConsortiaHandler.cs` |
| `sendConsortiaRichOffer` | `consortion/view/selfConsortia/TaxFrame.as` | 129 CONSORTIA_CMD | [consortiaRouter](../apps/game/src/handlers/sociedade/index.ts#L95) `apps/game/src/handlers/sociedade/index.ts:95` | `vendor/DDTank41/Game.Server/Packets/Client/ConsortiaHandler.cs` |
| `sendConsortiaInvate` | `consortion/view/selfConsortia/WantTakeInFrame.as` | 129 CONSORTIA_CMD | [consortiaRouter](../apps/game/src/handlers/sociedade/index.ts#L95) `apps/game/src/handlers/sociedade/index.ts:95` | `vendor/DDTank41/Game.Server/Packets/Client/ConsortiaHandler.cs` |
| `sendCurrentState` | `consortion/ConsortionControl.as` | 251 SCENE_STATE | [sceneState](../apps/game/src/handlers/casamento/index.ts#L74) `apps/game/src/handlers/casamento/index.ts:74` | `vendor/DDTank41/Game.Server/Packets/Client/MarryStateHandler.cs` |

## surpriseRoulette

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendStartTurn` | `surpriseRoulette/view/SurpriseRouletteView.as` | 27 LOTTERY_RANDOM_SELECT | [lotteryRandomSelect](../apps/game/src/handlers/eventos/index.ts#L75) `apps/game/src/handlers/eventos/index.ts:75` | `vendor/DDTank41/Game.Server/Packets/Client/LotteryRandomSelectHandler.cs` |
| `sendFinishRoulette` | `surpriseRoulette/view/SurpriseRouletteView.as` | 28 LOTTERY_FINISH | [lotteryFinish](../apps/game/src/handlers/eventos/index.ts#L76) `apps/game/src/handlers/eventos/index.ts:76` | `vendor/DDTank41/Game.Server/Packets/Client/LotteryFinishBoxHandler.cs` |

## Termas

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendHotAddTime` | `hotSpring/controller/HotSpringRoomController.as`<br>`hotSpring/controller/HotSpringRoomListController.as` | 12 HOTSPRING_CMD_B | [hotSpringCmdB](../apps/game/src/handlers/termas/index.ts#L57) `apps/game/src/handlers/termas/index.ts:57` | `vendor/DDTank41/Game.Server/Packets/Client/HotSpringRoomTimeAdded.cs` |
| `sendHotSpringRoomPlayerRemove` | `hotSpring/controller/HotSpringRoomController.as` | 169 HOTSPRING_ROOM_PLAYER_REMOVE | [hotSpringRoomPlayerRemove](../apps/game/src/handlers/termas/index.ts#L56) `apps/game/src/handlers/termas/index.ts:56` | `vendor/DDTank41/Game.Server/Packets/Client/HotSpringRoomPlayerRemoveHandler.cs` |
| `sendHotSpringRoomCreate` | `hotSpring/controller/HotSpringRoomListController.as` | 175 HOTSPRING_ROOM_CREATE | [hotSpringRoomCreate](../apps/game/src/handlers/termas/index.ts#L58) `apps/game/src/handlers/termas/index.ts:58` | — |
| `sendHotSpringEnter` | `hotSpring/controller/HotSpringRoomListController.as` | 187 HOTSPRING_ENTER | [hotSpringEnter](../apps/game/src/handlers/termas/index.ts#L51) `apps/game/src/handlers/termas/index.ts:51` | `vendor/DDTank41/Game.Server/Packets/Client/HotSpringEnterHandler.cs` |
| `sendHotSpringRoomQuickEnter` | `hotSpring/controller/HotSpringRoomListController.as` | 190 HOTSPRING_ROOM_QUICK_ENTER | [hotSpringRoomQuickEnter](../apps/game/src/handlers/termas/index.ts#L53) `apps/game/src/handlers/termas/index.ts:53` | `vendor/DDTank41/Game.Server/Packets/Client/HotSpringRoomQuickEnterHandler.cs` |
| `sendHotSpringRoomPlayerTargetPoint` | `hotSpring/controller/HotSpringRoomController.as` | 191 HOTSPRING_CMD | [async](../apps/game/src/handlers/termas/index.ts#L60) `apps/game/src/handlers/termas/index.ts:60` | `vendor/DDTank41/Game.Server/Packets/Client/HotSpringCmdDataHandler.cs` |
| `sendHotSpringRoomRenewalFee` | `hotSpring/controller/HotSpringRoomController.as` | 191 HOTSPRING_CMD | [async](../apps/game/src/handlers/termas/index.ts#L60) `apps/game/src/handlers/termas/index.ts:60` | `vendor/DDTank41/Game.Server/Packets/Client/HotSpringCmdDataHandler.cs` |
| `sendHotSpringRoomEdit` | `hotSpring/controller/HotSpringRoomController.as` | 191 HOTSPRING_CMD | [async](../apps/game/src/handlers/termas/index.ts#L60) `apps/game/src/handlers/termas/index.ts:60` | `vendor/DDTank41/Game.Server/Packets/Client/HotSpringCmdDataHandler.cs` |
| `sendHotSpringRoomPlayerContinue` | `hotSpring/controller/HotSpringRoomController.as` | 191 HOTSPRING_CMD | [async](../apps/game/src/handlers/termas/index.ts#L60) `apps/game/src/handlers/termas/index.ts:60` | `vendor/DDTank41/Game.Server/Packets/Client/HotSpringCmdDataHandler.cs` |
| `sendHotSpringRoomEnterView` | `hotSpring/view/HotSpringRoomView.as` | 201 HOTSPRING_ROOM_ENTER_VIEW | [hotSpringRoomEnterView](../apps/game/src/handlers/termas/index.ts#L55) `apps/game/src/handlers/termas/index.ts:55` | `vendor/DDTank41/Game.Server/Packets/Client/HotSpringRoomEnterViewHandler.cs` |
| `sendHotSpringRoomEnter` | `hotSpring/controller/HotSpringRoomListController.as` | 202 HOTSPRING_ROOM_ENTER | [hotSpringRoomEnter](../apps/game/src/handlers/termas/index.ts#L52) `apps/game/src/handlers/termas/index.ts:52` | `vendor/DDTank41/Game.Server/Packets/Client/HotSpringRoomEnterHandler.cs` |
| `sendHotSpringRoomEnterConfirm` | `hotSpring/controller/HotSpringRoomListController.as` | 212 HOTSPRING_ROOM_ENTER_CONFIRM | [hotSpringRoomEnterConfirm](../apps/game/src/handlers/termas/index.ts#L54) `apps/game/src/handlers/termas/index.ts:54` | `vendor/DDTank41/Game.Server/Packets/Client/HotSpringEnterConfirmHandler.cs` |

## times

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendDailyAward` | `times/TimesManager.as` | 13 DAILY_AWARD | [dailyAwardHandler](../apps/game/src/handlers/eventos/index.ts#L59) `apps/game/src/handlers/eventos/index.ts:59` | `vendor/DDTank41/Game.Server/Packets/Client/DailyAwardHandler.cs` |
| `sendWeeklyClick` | `times/TimesManager.as` | 219 WEEKLY_CLICK_CNT | [weeklyClickCnt](../apps/game/src/handlers/eventos/index.ts#L61) `apps/game/src/handlers/eventos/index.ts:61` | `vendor/DDTank41/Game.Server/Packets/Client/UserWeeklyClickHandler.cs` |

## Títulos

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `showHideTitleState` | `newTitle/view/NewTitleFrame.as` | 279 279 | **FALTA PORTAR** | `vendor/DDTank41/Game.Server/Packets/Client/ShowHideTitleStateHandler.cs` |

## Totem

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendErrorMsg` | `totem/view/HonorUpIcon.as` | 8 CLIENT_LOG | [clientLog](../apps/game/src/handlers/basico/index.ts#L32) `apps/game/src/handlers/basico/index.ts:32` | `vendor/DDTank41/Game.Server/Packets/Client/ClientErrorLog.cs` |

## trainer

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `syncWeakStep` | `trainer/controller/WeakGuildManager.as`<br>`trainer/view/TrainerGameView.as` (+1) | 15 USER_ANSWER | [USER_ANSWER](../apps/game/src/handlers/missoes/index.ts#L39) `apps/game/src/handlers/missoes/index.ts:39` | `vendor/DDTank41/Game.Server/Packets/Client/UserAnswerHandler.cs` |
| `syncStep` | `trainer/data/Step.as` | 15 USER_ANSWER | [USER_ANSWER](../apps/game/src/handlers/missoes/index.ts#L39) `apps/game/src/handlers/missoes/index.ts:39` | `vendor/DDTank41/Game.Server/Packets/Client/UserAnswerHandler.cs` |
| `createUserGuide` | `trainer/view/WelcomeView.as` | 94 GAME_ROOM | [rr](../apps/game/src/handlers/salas/index.ts#L66) `apps/game/src/handlers/salas/index.ts:66` | `vendor/DDTank41/Game.Server/Packets/Client/GameRoomHandler.cs` |

## Treino de atributos

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendMoveGoods` | `texpSystem/view/TexpCell.as` | 49 CHANGE_PLACE_GOODS | [CHANGE_PLACE_GOODS](../apps/game/src/handlers/bolsa/mover.ts#L93) `apps/game/src/handlers/bolsa/mover.ts:93` | — |
| `sendTexp` | `texpSystem/view/TexpView.as` | 99 TEXP | [texp](../apps/game/src/handlers/bolsa/treino-atributos.ts#L41) `apps/game/src/handlers/bolsa/treino-atributos.ts:41` | `vendor/DDTank41/Game.Server/Packets/Client/TexpHandler.cs` |
| `sendClearStoreBag` | `texpSystem/view/TexpView.as` | 122 CLEAR_STORE_BAG | [clearStoreBag](../apps/game/src/handlers/forja/index.ts#L76) `apps/game/src/handlers/forja/index.ts:76` | `vendor/DDTank41/Game.Server/Packets/Client/StoreClearItemHandler.cs` |

## Trocar cor

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendChangeColor` | `changeColor/view/ChangeColorRightView.as` | 182 USE_COLOR_CARD | [USE_COLOR_CARD](../apps/game/src/handlers/bolsa/trocar-cor.ts#L11) `apps/game/src/handlers/bolsa/trocar-cor.ts:11` | `vendor/DDTank41/Game.Server/Packets/Client/UserChangeItemColorHandler.cs` |

## VIP

| Ação (função do cliente) | Cliente | Pacote | Servidor | C# original |
|---|---|---|---|---|
| `sendDailyAward` | `vip/view/GiveYourselfOpenView.as` | 13 DAILY_AWARD | [dailyAwardHandler](../apps/game/src/handlers/eventos/index.ts#L59) `apps/game/src/handlers/eventos/index.ts:59` | `vendor/DDTank41/Game.Server/Packets/Client/DailyAwardHandler.cs` |
| `sendOpenVip` | `vip/VipController.as` | 92 VIP_RENEWAL | [openVip](../apps/game/src/handlers/loja/vip.ts#L37) `apps/game/src/handlers/loja/vip.ts:37` | `vendor/DDTank41/Game.Server/Packets/Client/OpenVipHandler.cs` |
