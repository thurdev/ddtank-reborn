# M3 — cobertura de pacotes e endpoints do cliente DDT-6600

> Gerado por `tools/qa/packet-coverage-6600.mjs` (`node tools/qa/packet-coverage-6600.mjs`).
> Fonte dos pacotes: todo `new PackageOut(ePackageType.X)` em qualquer `*SocketOut.as` de
> `vendor/DDT-6600/Flash_Project/DDT660/src`, resolvido contra `vendor/DDT-6600/Source/Game.Server/Game.Server.Packets/ePackageType.cs` (312 valores,
> docs/plan/MIGRACAO-6600.md §1.1), e contra o registro vivo de `apps/game/src/handlers/index.ts`
> (`createRegistry()`). Fonte dos endpoints: toda árvore real de
> `vendor/DDT-6600/Request` (263 `.ashx` + 184 `.xml` + 35 `.aspx`, mesma
> contagem de docs/plan/MIGRACAO-6600.md §1.3), contra `apps/api/src/request/registry.ts`
> (PORTED/STUBS) e `apps/api/src/templates/defs.ts` (TEMPLATES, builders DB-backed).

## Totais — pacotes (client→server)

| Status | Total |
|---|---|
| handled | 0 |
| partial | 24 |
| stub | 16 |
| MISSING | 28 |
| **Total de códigos enviados pelo cliente** | **213** |

## Totais — endpoints (.ashx/.xml/.aspx)

> Contagem de arquivo-fonte real (deduplicado, excluindo `obj/`/`Bin/`/publish de `vendor/DDT-6600/Request`): difere do "263 .ashx / 184 .xml / 35 .aspx" de docs/plan/MIGRACAO-6600.md §1.3, que é uma contagem recursiva simples (inclui cópias duplicadas em `obj/Release/Package/PackageTmp/*`) — aqui cada endpoint aparece 1 vez.

| Status | Total |
|---|---|
| native | 145 |
| empty (desconhecido) | 66 |
| snapshot | 44 |
| empty (stub gracioso) | 33 |
| empty (ranking vazio, sem tabela cross-area) | 32 |
| native (template rebuild) | 19 |
| não roteado (404) | 15 |
| não roteado (fora de escopo) | 2 |
| **Total de arquivos** | **356** |

## Pacotes por área

### Outros (46 código(s) — implemented 26, partial 6, stub 7, MISSING 7)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 64 | `OPTION_UPDATE` | sendOpition (ddt/manager/GameSocketOut.as) | implemented | basico/index.ts |
| 70 | `GAME_INVITE` | sendInviteGame (ddt/manager/GameInSocketOut.as) | implemented | salas/index.ts |
| 107 | `AREA_CHAT` | sendAreaPrivateMessage (ddt/manager/ChatManager.as) | implemented | amigos/index.ts |
| 112 | `DELETE_MAIL` | sendDeleteMail (ddt/manager/GameSocketOut.as) | implemented | correio/index.ts |
| 113 | `GET_MAIL_ATTACHMENT` | sendGetMail (ddt/manager/GameSocketOut.as) | implemented | correio/index.ts |
| 114 | `UPDATE_MAIL` | sendUpdateMail (ddt/manager/GameSocketOut.as) | implemented | correio/index.ts |
| 122 | `CLEAR_STORE_BAG` | sendClearStoreBag (ddt/manager/GameSocketOut.as) | implemented | forja/index.ts |
| 123 | `DEFY_AFFICHE` | sendDefyAffiche (ddt/manager/GameSocketOut.as) | implemented | chat/index.ts |
| 126 | `BUY_QUICK_GOLDBOX` | sendQuickBuyGoldBox (ddt/manager/GameSocketOut.as) | implemented | loja/bau-rapido-ouro.ts |
| 127 | `REClAIM_GOODS` | reclaimGoods (ddt/manager/GameSocketOut.as) | implemented | bolsa/reciclar.ts |
| 131 | `LABYRINTH` | labyrinthRequestUpdate (ddt/manager/GameSocketOut.as); labyrinthCleanOut (ddt/manager/GameSocketOut.as); labyrinthSpeededUpCleanOut (ddt/manager/GameSocketOut.as); labyrinthStopCleanOut (ddt/manager/GameSocketOut.as); labyrinthCleanOutTimerComplete (ddt/manager/GameSocketOut.as); labyrinthDouble (ddt/manager/GameSocketOut.as); labyrinthReset (ddt/manager/GameSocketOut.as); labyrinthTryAgain (ddt/manager/GameSocketOut.as) | partial | eventos/index.ts |
| 133 | `LATENT_ENERGY` | sendLatentEnergy (ddt/manager/GameSocketOut.as) | implemented | forja/index.ts |
| 147 | `FIND_BACK_INCOME` | sendWantStrongBack (ddt/manager/GameSocketOut.as) | MISSING |  |
| 149 | `OLDPLAYER_REGRESS` | sendRegressPkg (ddt/manager/GameSocketOut.as); sendRegressGetAwardPkg (ddt/manager/GameSocketOut.as); sendRegressCheckPlayer (ddt/manager/GameSocketOut.as); sendRegressApplyEnable (ddt/manager/GameSocketOut.as); sendRegressApllyPacks (ddt/manager/GameSocketOut.as); sendRegressCall (ddt/manager/GameSocketOut.as); sendRegressRecvPacks (ddt/manager/GameSocketOut.as); sendRegressTicketInfo (ddt/manager/GameSocketOut.as); sendRegressTicket (ddt/manager/GameSocketOut.as); sendUpdateIntegral (ddt/manager/GameSocketOut.as); sendBuyRegressIntegralGoods (ddt/manager/GameSocketOut.as) | partial | eventos/index.ts |
| 152 | `FIGHTFOOTBALLTIMETAKEOUT` | sendFightFootballTimeTakeOut (ddt/manager/GameInSocketOut.as) | MISSING |  |
| 156 | `TRANSNATIONAL_BUYGOODS` | sendButTransnationalGoods (ddt/manager/GameSocketOut.as) | MISSING |  |
| 159 | `WONDERFUL_ACTIVITY` | sendWonderfulActivity (ddt/manager/GameSocketOut.as) | stub | eventos/index.ts |
| 161 | `USER_LUCKYNUM` | sendUserLuckyNum (ddt/manager/GameSocketOut.as) | implemented |  |
| 162 | `ELITEGAME` | sendGetEliteGameState (ddt/manager/GameSocketOut.as); sendGetSelfRankSroce (ddt/manager/GameSocketOut.as); sendGetPaarungDetail (ddt/manager/GameSocketOut.as); sendEliteGameStart (ddt/manager/GameSocketOut.as) | partial | eventos/index.ts |
| 164 | `UPDATE_PLAYER_PROPERTY` | getPlayerPropertyAddition (ddt/manager/GameSocketOut.as) | MISSING |  |
| 166 | `LITTLEGAME_COMMAND` | createPackageOut (littleGame/LittleGameManager.as) | implemented | eventos/index.ts |
| 168 | `GOODS_COUNT` | sendUpdateGoodsCount (ddt/manager/GameSocketOut.as) | partial | loja/estoque-diario.ts |
| 171 | `USE_REWORK_NAME` | sendUseReworkName (ddt/manager/GameSocketOut.as) | implemented | bolsa/trocar-apelido.ts |
| 182 | `USE_COLOR_CARD` | sendChangeColor (ddt/manager/GameSocketOut.as) | implemented | bolsa/trocar-cor.ts |
| 188 | `USE_CONSORTIA_REWORK_NAME` | sendUseConsortiaReworkName (ddt/manager/GameSocketOut.as) | stub |  |
| 189 | `USER_CHANGE_RANK` | sendReworkRank (ddt/manager/GameSocketOut.as) | implemented | bolsa/titulos.ts |
| 200 | `CHECK_CODE` | sendCheckCode (ddt/manager/GameSocketOut.as) | partial | bolsa/codigo-verificacao.ts |
| 203 | `LOOKUP_EFFORT` | sendLookupEffort (ddt/manager/GameSocketOut.as) | implemented | bolsa/conquistas.ts |
| 205 | `USE_CHANGE_COLOR_SHELL` | sendUseChangeColorShell (ddt/manager/GameSocketOut.as) | stub |  |
| 206 | `CHANGE_COLOR_OVER_DUE` | sendChangeColorShellTimeOver (ddt/manager/GameSocketOut.as) | implemented |  |
| 207 | `REQUEST_FRIENDS_PAY` | requestUnWeddingPay (ddt/manager/GameSocketOut.as); requestShopPay (ddt/manager/GameSocketOut.as); requestAuctionPay (ddt/manager/GameSocketOut.as); isAcceptPayShop (ddt/manager/GameSocketOut.as); isAcceptPayAuc (ddt/manager/GameSocketOut.as); sendForAuction (ddt/manager/GameSocketOut.as); isAcceptPay (ddt/manager/GameSocketOut.as) | MISSING |  |
| 209 | `FIGHT_SPIRIT` | figSpiritUpGrade (ddt/manager/GameSocketOut.as); fightSpiritRequest (ddt/manager/GameSocketOut.as) | implemented | forja/index.ts |
| 213 | `USE_LOG` | sendUseLog (ddt/manager/GameSocketOut.as) | implemented |  |
| 214 | `USER_RELOAD_GIFT` | sendReloadGift (ddt/manager/GameSocketOut.as) | stub | correio/index.ts |
| 217 | `OPEN_FIVE_SIX_HOLE` | sendItemOpenFiveSixHole (ddt/manager/GameSocketOut.as) | implemented | forja/index.ts |
| 222 | `EQUIP_RECYCLE_ITEM` | sendEquipRetrieve (ddt/manager/GameSocketOut.as) | partial | bolsa/reaproveitar-forja.ts |
| 224 | `CID_CHECK` | sendCIDCheck (ddt/manager/GameSocketOut.as); sendCIDInfo (ddt/manager/GameSocketOut.as) | stub | basico/index.ts |
| 225 | `ENTHRALL_SWITCH/REQUEST_UPDATE` | sendForSwitch (ddt/manager/GameSocketOut.as); sendRequestUpdate (ddt/manager/GameSocketOut.as) | implemented | basico/index.ts |
| 238 | `ACCUMULATIVELOGIN_AWARD` | sendAccumulativeLoginAward (ddt/manager/GameSocketOut.as) | implemented | eventos/index.ts |
| 244 | `PLAYER_EXIT_MARRY_ROOM` | sendExitRoom (ddt/manager/GameSocketOut.as) | implemented | casamento/index.ts |
| 252 | `USE_CHANGE_SEX` | sendChangeSex (ddt/manager/GameSocketOut.as) | implemented | bolsa/trocar-sexo.ts |
| 279 | `SHOW_HIDE_TITLE` | showHideTitleState (ddt/manager/GameSocketOut.as) | implemented |  |
| 327 | `FAST_AUCTION_SMALL_BUGLE` | sendFastAuctionBugle (ddt/manager/GameSocketOut.as) | MISSING |  |
| 360 | `GET_CSM_BOX` | sendGetCSMTimeBox (ddt/manager/GameSocketOut.as) | MISSING |  |
| 373 | `WONDERFUL_GETREWARD` | sendWonderfulActivityGetReward (ddt/manager/GameSocketOut.as) | stub | eventos/index.ts |
| 405 | `WONDERFUL_ACTIVITY_INIT` | requestWonderfulActInit (ddt/manager/GameSocketOut.as) | stub | eventos/index.ts |

### Bolsa/Itens (25 código(s) — implemented 20, partial 3, stub 0, MISSING 2)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 25 | `BAG_LOCKED` | sendBagLocked (ddt/manager/GameSocketOut.as) | implemented | bolsa/senha-da-bolsa.ts |
| 48 | `SEll_GOODS` | sendSellGoods (ddt/manager/GameSocketOut.as) | implemented | bolsa/vender-item.ts |
| 49 | `CHANGE_PLACE_GOODS` | sendMoveGoods (ddt/manager/GameSocketOut.as) | partial | bolsa/mover.ts |
| 57 | `GOODS_PRESENT` | sendPresentGoods (ddt/manager/GameSocketOut.as) | implemented | loja/presentear-vitrine.ts |
| 58 | `ITEM_COMPOSE` | sendItemCompose (ddt/manager/GameSocketOut.as) | partial | forja/index.ts |
| 59 | `ITEM_STRENGTHEN` | sendItemStrength (ddt/manager/GameSocketOut.as) | partial | forja/index.ts |
| 60 | `ITEM_HIDE` | sendHideLayer (ddt/manager/GameSocketOut.as) | implemented | bolsa/ocultar-visual.ts |
| 61 | `ITEM_TRANSFER` | sendItemTransfer (ddt/manager/GameSocketOut.as) | implemented | forja/index.ts |
| 62 | `ITEM_CONTINUE` | sendGoodsContinue (ddt/manager/GameSocketOut.as) | implemented | loja/renovar.ts |
| 63 | `ITEM_OPENUP` | sendItemOpenUp (ddt/manager/GameSocketOut.as) | implemented | bolsa/abrir-caixa.ts |
| 66 | `PROP_USE` | sendUseProp (ddt/manager/GameSocketOut.as) | implemented | loja/usar-prop.ts |
| 74 | `ITEM_EQUIP` | sendItemEquip (ddt/manager/GameSocketOut.as) | implemented | bolsa/ver-equipamento.ts |
| 77 | `ITEM_OVERDUE` | sendItemOverDue (ddt/manager/GameSocketOut.as) | implemented | bolsa/item-vencido.ts |
| 78 | `ITEM_FUSION` | sendItemFusion (ddt/manager/GameSocketOut.as) | implemented | forja/index.ts |
| 98 | `SEARCH_GOODS` | enterBuried (ddt/manager/GameSocketOut.as); rollDice (ddt/manager/GameSocketOut.as); upgradeStartLevel (ddt/manager/GameSocketOut.as); refreshMap (ddt/manager/GameSocketOut.as); takeCard (ddt/manager/GameSocketOut.as); outCard (ddt/manager/GameSocketOut.as) | MISSING |  |
| 99 | `TEXP` | sendTexp (ddt/manager/GameSocketOut.as) | implemented | bolsa/treino-atributos.ts |
| 108 | `GAME_TAKE_TEMP` | sendGetTropToBag (ddt/manager/GameInSocketOut.as); sendGetTropToBag (ddt/manager/GameSocketOut.as) | implemented | bolsa/pegar-item-temporario.ts |
| 119 | `LINKREQUEST_GOODS` | sendGetLinkGoodsInfo (ddt/manager/GameSocketOut.as) | implemented | bolsa/comparar-item.ts |
| 120 | `ITEM_TREND` | sendItemTrend (ddt/manager/GameSocketOut.as) | implemented | forja/index.ts |
| 124 | `CHANGE_PLACE_GOODS_ALL` | sendMoveGoodsAll (ddt/manager/GameSocketOut.as) | implemented | bolsa/organizar-bolsa.ts |
| 125 | `ITEM_EMBED_BACKOUT` | sendItemEmbedBackout (ddt/manager/GameSocketOut.as) | implemented | forja/index.ts |
| 138 | `ITEM_ADVANCE` | sendItemExalt (ddt/manager/GameSocketOut.as) | implemented | forja/index.ts |
| 210 | `ITEM_REFINERY` | sendItemLianhua (ddt/manager/GameSocketOut.as) | implemented | forja/index.ts |
| 280 | `ITEM_ENCHANT` | sendEnchant (ddt/manager/GameSocketOut.as) | MISSING |  |
| 403 | `BAGLOCK_PWD` | getBackLockPwdByPhone (ddt/manager/GameSocketOut.as); getBackLockPwdByQuestion (ddt/manager/GameSocketOut.as); deletePwdQuestion (ddt/manager/GameSocketOut.as); deletePwdByPhone (ddt/manager/GameSocketOut.as); checkPhoneBind (ddt/manager/GameSocketOut.as) | implemented | bolsa/recuperar-senha.ts |

### Casamento (14 código(s) — implemented 9, partial 4, stub 1, MISSING 0)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 85 | `MATE_ONLINE_TIME` | sendMateTime (ddt/manager/GameSocketOut.as) | implemented | casamento/index.ts |
| 167 | `CHURCH_MOVIE_OVER` | sendChurchMovieOver (ddt/manager/GameSocketOut.as) | stub | casamento/index.ts |
| 233 | `MARRY_SCENE_CHANGE` | sendSceneChange (ddt/manager/GameSocketOut.as) | partial | casamento/index.ts |
| 235 | `MARRYINFO_GET` | sendForMarryInfo (ddt/manager/GameSocketOut.as) | implemented | casamento/index.ts |
| 236 | `MARRYINFO_ADD` | sendRegisterInfo (ddt/manager/GameSocketOut.as) | implemented | casamento/index.ts |
| 240 | `MARRY_SCENE_LOGIN` | sendMarryRoomLogin (ddt/manager/GameSocketOut.as) | implemented | casamento/index.ts |
| 241 | `MARRY_ROOM_CREATE` | sendCreateRoom (ddt/manager/GameSocketOut.as) | partial | casamento/index.ts |
| 242 | `MARRY_ROOM_LOGIN` | sendEnterRoom (ddt/manager/GameSocketOut.as) | implemented | casamento/index.ts |
| 246 | `MARRY_STATUS` | sendValidateMarry (ddt/manager/GameSocketOut.as) | implemented | casamento/index.ts |
| 247 | `MARRY_APPLY` | sendPropose (ddt/manager/GameSocketOut.as) | implemented | casamento/index.ts |
| 248 | `DIVORCE_APPLY` | sendUnmarry (ddt/manager/GameSocketOut.as) | implemented | casamento/index.ts |
| 249 | `MARRY_CMD` | sendChurchMove (ddt/manager/GameSocketOut.as); sendStartWedding (ddt/manager/GameSocketOut.as); sendChurchContinuation (ddt/manager/GameSocketOut.as); sendChurchInvite (ddt/manager/GameSocketOut.as); sendChurchLargess (ddt/manager/GameSocketOut.as); refund (ddt/manager/GameSocketOut.as); requestRefund (ddt/manager/GameSocketOut.as); sendUseFire (ddt/manager/GameSocketOut.as); sendChurchKick (ddt/manager/GameSocketOut.as); sendChurchForbid (ddt/manager/GameSocketOut.as); sendPosition (ddt/manager/GameSocketOut.as); sendGunSalute (ddt/manager/GameSocketOut.as) | partial | casamento/index.ts |
| 250 | `MARRY_APPLY_REPLY` | sendProposeRespose (ddt/manager/GameSocketOut.as) | implemented | casamento/index.ts |
| 253 | `MARRY_ROOM_INFO_UPDATE` | sendModifyChurchDiscription (ddt/manager/GameSocketOut.as) | partial | casamento/index.ts |

### Loteria/Roleta (13 código(s) — implemented 7, partial 2, stub 4, MISSING 0)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 26 | `LOTTERY_OPEN_BOX` | sendRouletteBox (ddt/manager/GameSocketOut.as); sendOpenDead (ddt/manager/GameSocketOut.as) | implemented | eventos/index.ts |
| 27 | `LOTTERY_RANDOM_SELECT` | sendStartTurn (ddt/manager/GameSocketOut.as) | implemented | eventos/index.ts |
| 28 | `LOTTERY_FINISH` | sendFinishRoulette (ddt/manager/GameSocketOut.as) | implemented | eventos/index.ts |
| 45 | `CADDY_GET_BADLUCK` | sendQequestBadLuck (ddt/manager/GameSocketOut.as) | implemented | eventos/index.ts |
| 87 | `NEWCHICKENBOX_SYS` | sendChickenBoxUseEagleEye (ddt/manager/GameSocketOut.as); sendChickenBoxTakeOverCard (ddt/manager/GameSocketOut.as); sendOverShowItems (ddt/manager/GameSocketOut.as); sendFlushNewChickenBox (ddt/manager/GameSocketOut.as); sendClickStartBntNewChickenBox (ddt/manager/GameSocketOut.as); sendNewChickenBox (ddt/manager/GameSocketOut.as); sendLuckyStarEnter (ddt/manager/GameSocketOut.as); sendLuckyStarClose (ddt/manager/GameSocketOut.as); sendLuckyStarTurnComplete (ddt/manager/GameSocketOut.as); sendLuckyStarTurn (ddt/manager/GameSocketOut.as) | partial | eventos/index.ts |
| 97 | `LUCKSTONE_RANK_LIMIT` | sendQequestLuckky (ddt/manager/GameSocketOut.as) | stub | eventos/index.ts |
| 128 | `LEFT_GUN_ROULETTE_SOCKET` | sendStartTurn_LeftGun (ddt/manager/GameSocketOut.as) | partial | loja/roleta-canhao.ts |
| 130 | `LEFT_GUN_ROULETTE_COMPLETTE` | sendEndTurn_LeftGun (ddt/manager/GameSocketOut.as) | implemented | loja/roleta-canhao.ts |
| 165 | `LUCKSTONE_CONFIG` | requestForLuckStone (ddt/manager/GameSocketOut.as) | stub | eventos/index.ts |
| 211 | `CADDY_EXCHANGE_ALL` | sendExchange (ddt/manager/GameSocketOut.as) | stub | eventos/index.ts |
| 215 | `CADDY_CONVERTED_ALL` | sendconverted (ddt/manager/GameSocketOut.as) | stub | eventos/index.ts |
| 232 | `CADDY_SELL_ALL_GOODS` | sendSellAll (ddt/manager/GameSocketOut.as) | implemented | eventos/index.ts |
| 245 | `CADDY_GET_AWARDS` | sendRequestAwards (ddt/manager/GameSocketOut.as) | implemented |  |

### Missões (11 código(s) — implemented 6, partial 1, stub 3, MISSING 1)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 31 | `GOODS_EXCHANGE` | sendGoodsExchange (ddt/manager/GameSocketOut.as) | partial | missoes/index.ts |
| 32 | `COLLECTINFO` | sendCollectInfoValidate (ddt/manager/GameSocketOut.as) | stub | missoes/stubs.ts |
| 50 | `FIGHT_NPC` | sendBeginFightNpc (ddt/manager/GameSocketOut.as) | stub | missoes/stubs.ts |
| 83 | `QUEST_LEVEL_UP` | sendImproveQuest (ddt/manager/GameSocketOut.as) | MISSING |  |
| 86 | `QUEST_ONEKEYFINISH` | sendQuestOneToFinish (ddt/manager/GameSocketOut.as) | implemented | salas/index.ts |
| 89 | `QUESTION_REPLY` | sendQuestionReply (ddt/manager/GameSocketOut.as) | stub | missoes/stubs.ts |
| 105 | `MISSION_ENERGY` | sendBuyEnergy (ddt/manager/GameSocketOut.as) | implemented | progressao/loterias.ts |
| 176 | `QUEST_ADD` | sendQuestAdd (ddt/manager/GameSocketOut.as) | implemented | missoes/index.ts |
| 177 | `QUEST_REMOVE` | sendQuestRemove (ddt/manager/GameSocketOut.as) | implemented | missoes/index.ts |
| 179 | `QUEST_FINISH` | sendQuestFinish (ddt/manager/GameSocketOut.as) | implemented | missoes/index.ts |
| 181 | `QUEST_CHECK` | sendQuestCheck (ddt/manager/GameSocketOut.as) | implemented | missoes/index.ts |

### Eventos/Atividades (9 código(s) — implemented 7, partial 2, stub 0, MISSING 0)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 13 | `DAILY_AWARD` | sendCalendarPet (ddt/manager/GameInSocketOut.as); sendDailyAward (ddt/manager/GameSocketOut.as); sendDaySign (ddt/manager/GameSocketOut.as) | implemented | eventos/index.ts |
| 53 | `GET_TIME_BOX` | sendGetTimeBox (ddt/manager/GameSocketOut.as) | implemented | eventos/index.ts |
| 84 | `ACTIVITY_PACKAGE` | sendChickActivationOpenKey (ddt/manager/GameSocketOut.as); sendChickActivationGetAward (ddt/manager/GameSocketOut.as); sendChickActivationQuery (ddt/manager/GameSocketOut.as); sendGrowthPackageGetItems (ddt/manager/GameSocketOut.as); sendGrowthPackageOpen (ddt/manager/GameSocketOut.as); sendUseEveryDayGiftRecord (ddt/manager/GameSocketOut.as); openMagicLib (ddt/manager/GameSocketOut.as); magicLibLevelUp (ddt/manager/GameSocketOut.as); magicLibFreeGet (ddt/manager/GameSocketOut.as); magicLibChargeGet (ddt/manager/GameSocketOut.as); magicOpenDepot (ddt/manager/GameSocketOut.as); zodiacRolling (ddt/manager/GameSocketOut.as); zodiacGetAward (ddt/manager/GameSocketOut.as); zodiacGetAwardAll (ddt/manager/GameSocketOut.as); zodiacAddCounts (ddt/manager/GameSocketOut.as) | partial | eventos/index.ts |
| 90 | `GET_SIGNAWARD` | sendSignAward (ddt/manager/GameSocketOut.as) | implemented | eventos/index.ts |
| 96 | `HONOR_UP_COUNT` | sendHonorUp (ddt/manager/GameSocketOut.as) | implemented | progressao/index.ts |
| 103 | `DAILYRECORD` | sendDailyRecord (ddt/manager/GameSocketOut.as) | implemented | eventos/index.ts |
| 145 | `ACTIVITY_SYSTEM/LIGHTROAD_SYSTEM/SEVENDAYTARGET_GODSROADS/TREASURELOST` | sendRequestEnterPyramidSystem (ddt/manager/GameInSocketOut.as); sendPyramidStartOrstop (ddt/manager/GameInSocketOut.as); sendPyramidTurnCard (ddt/manager/GameInSocketOut.as); sendPyramidRevive (ddt/manager/GameInSocketOut.as); enterGodsRoads (ddt/manager/GameSocketOut.as); getGodsRoadsAwards (ddt/manager/GameSocketOut.as); enterSuperWinner (ddt/manager/GameSocketOut.as); rollDiceInSuperWinner (ddt/manager/GameSocketOut.as); outSuperWinner (ddt/manager/GameSocketOut.as); sendButChristmasGoods (ddt/manager/GameSocketOut.as); enterChristmasRoomIsTrue (ddt/manager/GameSocketOut.as); enterChristmasRoom (ddt/manager/GameSocketOut.as); enterMakingSnowManRoom (ddt/manager/GameSocketOut.as); getPacksToPlayer (ddt/manager/GameSocketOut.as); sendLeaveChristmasRoom (ddt/manager/GameSocketOut.as); sendChristmasRoomMove (ddt/manager/GameSocketOut.as); sendChristmasUpGrade (ddt/manager/GameSocketOut.as); sendStartFightWithMonster (ddt/manager/GameSocketOut.as); sendBuyPlayingSnowmanVolumes (ddt/manager/GameSocketOut.as); sendLanternRiddlesQuestion (ddt/manager/GameSocketOut.as); sendLanternRiddlesAnswer (ddt/manager/GameSocketOut.as); sendLanternRiddlesUseSkill (ddt/manager/GameSocketOut.as); sendLanternRiddlesRankInfo (ddt/manager/GameSocketOut.as); sendCatchBeastBegin (ddt/manager/GameSocketOut.as); sendCatchBeastViewInfo (ddt/manager/GameSocketOut.as); sendCatchBeastChallenge (ddt/manager/GameSocketOut.as); sendCatchBeastBuyBuff (ddt/manager/GameSocketOut.as); sendCatchBeastGetAward (ddt/manager/GameSocketOut.as); sendEntertainment (ddt/manager/GameSocketOut.as); buyEntertainment (ddt/manager/GameSocketOut.as); sendLightRoadStarEnter (ddt/manager/GameSocketOut.as); lightRoadPointWork (ddt/manager/GameSocketOut.as); sevenDayTarget_enter (ddt/manager/GameSocketOut.as); newPlayerReward_enter (ddt/manager/GameSocketOut.as); sevenDayTarget_getReward (ddt/manager/GameSocketOut.as); newPlayerReward_getReward (ddt/manager/GameSocketOut.as); DDPlayEnter (ddt/manager/GameSocketOut.as); DDPlayStart (ddt/manager/GameSocketOut.as); DDPlayExchange (ddt/manager/GameSocketOut.as); sendBoguAdventureEnter (ddt/manager/GameSocketOut.as); sendBoguAdventureWalkInfo (ddt/manager/GameSocketOut.as); sendBoguAdventureUpdateGame (ddt/manager/GameSocketOut.as); sendBoguAdventureAcquireAward (ddt/manager/GameSocketOut.as); sendOutBoguAdventure (ddt/manager/GameSocketOut.as); halloweenInit (ddt/manager/GameSocketOut.as); enterOrLeaveInsectScene (ddt/manager/GameSocketOut.as); sendFightWithInsect (ddt/manager/GameSocketOut.as); sendInsectSceneMove (ddt/manager/GameSocketOut.as); updateInsectInfo (ddt/manager/GameSocketOut.as); updateInsectAreaRank (ddt/manager/GameSocketOut.as); updateInsectAreaSelfInfo (ddt/manager/GameSocketOut.as); updateInsectLocalRank (ddt/manager/GameSocketOut.as); updateInsectLocalSelfInfo (ddt/manager/GameSocketOut.as); getInsectPrize (ddt/manager/GameSocketOut.as); requestCakeStatus (ddt/manager/GameSocketOut.as); sendEnterGame (ddt/manager/GameSocketOut.as); sendYGBuyGoods (ddt/manager/GameSocketOut.as); sendLuckDrawGo (ddt/manager/GameSocketOut.as); enterTreasureLost (ddt/manager/GameSocketOut.as); treasureLostRollDice (ddt/manager/GameSocketOut.as); treasureLostRollGoldDice (ddt/manager/GameSocketOut.as); treasureLostSelcetDirection (ddt/manager/GameSocketOut.as); treasureLostMissBoss (ddt/manager/GameSocketOut.as); treasureLostEventDispatch (ddt/manager/GameSocketOut.as); treasureLostBuyItem (ddt/manager/GameSocketOut.as); treasureLostExit (ddt/manager/GameSocketOut.as); makeNewYearRice (ddt/manager/GameSocketOut.as); sendCheckNewYearRiceInfo (ddt/manager/GameSocketOut.as); sendCheckMakeNewYearFood (ddt/manager/GameSocketOut.as); sendNewYearRiceOpen (ddt/manager/GameSocketOut.as); sendExitYearFoodRoom (ddt/manager/GameSocketOut.as); sendInviteYearFoodRoom (ddt/manager/GameSocketOut.as); sendQuitNewYearRiceRoom (ddt/manager/GameSocketOut.as); getVipAndMerryInfo (ddt/manager/GameSocketOut.as) | partial | eventos/index.ts |
| 155 | `EVERYDAY_ACTIVEPOINT` | addSpeed (ddt/manager/GameSocketOut.as); sendGetGoods (ddt/manager/GameSocketOut.as); enterDayActivity (ddt/manager/GameSocketOut.as); sendExpBlessedData (ddt/manager/GameSocketOut.as) | implemented | bolsa/treino-diario.ts |
| 219 | `WEEKLY_CLICK_CNT` | sendWeeklyClick (ddt/manager/GameSocketOut.as) | implemented | eventos/index.ts |

### Chat/Amigos (9 código(s) — implemented 9, partial 0, stub 0, MISSING 0)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 19 | `SCENE_CHAT` | sendMessage (ddt/manager/ChatManager.as) | implemented | chat/index.ts |
| 20 | `SCENE_FACE` | sendFace (ddt/manager/GameSocketOut.as) | implemented | chat/index.ts |
| 37 | `CHAT_PERSONAL` | sendPrivateMessage (ddt/manager/ChatManager.as) | implemented | chat/index.ts |
| 40 | `SNS_MSG_RECEIVE` | sendSnsMsg (ddt/manager/GameSocketOut.as) | implemented | amigos/index.ts |
| 71 | `S_BUGLE` | sendSBugle (ddt/manager/GameSocketOut.as) | implemented | chat/index.ts |
| 72 | `B_BUGLE` | sendBBugle (ddt/manager/GameSocketOut.as) | implemented | chat/index.ts |
| 73 | `C_BUGLE` | sendCBugle (ddt/manager/GameSocketOut.as) | implemented | chat/index.ts |
| 160 | `IM_CMD` | sendAddFriend (ddt/manager/GameSocketOut.as); sendDelFriend (ddt/manager/GameSocketOut.as); sendFriendState (ddt/manager/GameSocketOut.as); sendOns (ddt/manager/GameSocketOut.as); sendCustomFriends (ddt/manager/GameSocketOut.as); sendOneOnOneTalk (ddt/manager/GameSocketOut.as) | implemented | amigos/index.ts |
| 223 | `FRIEND_BRITHDAY` | sendWithBrithday (ddt/manager/GameSocketOut.as) | implemented | amigos/index.ts |

### Termas (8 código(s) — implemented 8, partial 0, stub 0, MISSING 0)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 169 | `HOTSPRING_ROOM_PLAYER_REMOVE` | sendHotSpringRoomPlayerRemove (ddt/manager/GameSocketOut.as) | implemented | termas/index.ts |
| 175 | `HOTSPRING_ROOM_CREATE` | sendHotSpringRoomCreate (ddt/manager/GameSocketOut.as) | implemented | termas/index.ts |
| 187 | `HOTSPRING_ENTER` | sendHotSpringEnter (ddt/manager/GameSocketOut.as) | implemented | termas/index.ts |
| 190 | `HOTSPRING_ROOM_QUICK_ENTER` | sendHotSpringRoomQuickEnter (ddt/manager/GameSocketOut.as) | implemented | termas/index.ts |
| 191 | `HOTSPRING_CMD` | sendHotSpringRoomEdit (ddt/manager/GameSocketOut.as); sendHotSpringRoomPlayerTargetPoint (ddt/manager/GameSocketOut.as); sendHotSpringRoomRenewalFee (ddt/manager/GameSocketOut.as); sendHotSpringRoomInvite (ddt/manager/GameSocketOut.as); sendHotSpringRoomAdminRemovePlayer (ddt/manager/GameSocketOut.as); sendHotSpringRoomPlayerContinue (ddt/manager/GameSocketOut.as) | implemented | termas/index.ts |
| 201 | `HOTSPRING_ROOM_ENTER_VIEW` | sendHotSpringRoomEnterView (ddt/manager/GameSocketOut.as) | implemented | termas/index.ts |
| 202 | `HOTSPRING_ROOM_ENTER` | sendHotSpringRoomEnter (ddt/manager/GameSocketOut.as) | implemented | termas/index.ts |
| 212 | `HOTSPRING_ROOM_ENTER_CONFIRM` | sendHotSpringRoomEnterConfirm (ddt/manager/GameSocketOut.as) | implemented | termas/index.ts |

### Sala/Hall (6 código(s) — implemented 5, partial 1, stub 0, MISSING 0)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 16 | `SCENE_LOGIN` | sendSceneLogin (ddt/manager/GameSocketOut.as) | implemented | basico/index.ts |
| 21 | `SCENE_REMOVE_USER` | sendExitScene (ddt/manager/GameInSocketOut.as); sendExitMarryRoom (ddt/manager/GameSocketOut.as) | implemented | basico/index.ts |
| 30 | `PICC` | sendPicc (ddt/manager/GameSocketOut.as) | implemented |  |
| 69 | `SCENE_USERS_LIST` | sendGetScenePlayer (ddt/manager/GameInSocketOut.as) | implemented | basico/index.ts |
| 94 | `GAME_ROOM` | sendGameRoomSetUp (ddt/manager/GameInSocketOut.as); sendCreateRoom (ddt/manager/GameInSocketOut.as); sendGameRoomPlaceState (ddt/manager/GameInSocketOut.as); sendGameRoomKick (ddt/manager/GameInSocketOut.as); sendGamePlayerExit (ddt/manager/GameInSocketOut.as); sendGameTeam (ddt/manager/GameInSocketOut.as); sendGameStart (ddt/manager/GameInSocketOut.as); sendPlayerState (ddt/manager/GameInSocketOut.as); sendStartOrPreCheckEnergy (ddt/manager/GameInSocketOut.as); sendCancelWait (ddt/manager/GameInSocketOut.as); sendSingleRoomBegin (ddt/manager/GameInSocketOut.as); sendGameStyle (ddt/manager/GameInSocketOut.as); sendGameLogin (ddt/manager/GameSocketOut.as); sendFastInviteCall (ddt/manager/GameSocketOut.as); sendFastAuctionCall (ddt/manager/GameSocketOut.as); sendGameStyle (ddt/manager/GameSocketOut.as); sendGameMode (ddt/manager/GameSocketOut.as); sendUpdateRoomList (ddt/manager/GameSocketOut.as); createUserGuide (ddt/manager/GameSocketOut.as); enterUserGuide (ddt/manager/GameSocketOut.as); userGuideStart (ddt/manager/GameSocketOut.as) | implemented | salas/index.ts |
| 251 | `SCENE_STATE` | sendCurrentState (ddt/manager/GameSocketOut.as) | partial | casamento/index.ts |

### Loja (6 código(s) — implemented 6, partial 0, stub 0, MISSING 0)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 44 | `BUY_GOODS` | sendBuyGoods (ddt/manager/GameSocketOut.as) | implemented | loja/comprar.ts |
| 46 | `BUY_GIFTBAG` | sendBuyGiftBag (ddt/manager/GameSocketOut.as) | implemented | loja/pacote-presente.ts |
| 54 | `PROP_BUY` | sendBuyProp (ddt/manager/GameInSocketOut.as); sendBuyProp (ddt/manager/GameSocketOut.as) | implemented | loja/props-de-luta.ts |
| 55 | `PROP_SELL` | sendSellProp (ddt/manager/GameInSocketOut.as); sendSellProp (ddt/manager/GameSocketOut.as) | implemented | loja/props-de-luta.ts |
| 278 | `MYSTERY_SHOP` | sendGypsyBuy (ddt/manager/GameInSocketOut.as); sendGypsyRefreshItemList (ddt/manager/GameInSocketOut.as); sendGypsyManualRefreshItemList (ddt/manager/GameInSocketOut.as); sendGypsyRefreshRareList (ddt/manager/GameInSocketOut.as); sendRequestGypsyNPCState (ddt/manager/GameInSocketOut.as) | implemented | loja/loja-cigana.ts |
| 288 | `SHOP_BUYLIMITEDCOUNT` | sendGetShopBuyLimitedCount (ddt/manager/GameSocketOut.as) | implemented | loja/compra-limitada.ts |

### Login/Rede/Handshake (5 código(s) — implemented 4, partial 0, stub 0, MISSING 1)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 1 | `LOGIN` | sendLogin (ddt/manager/GameSocketOut.as) | implemented | basico/index.ts |
| 4 | `PING` | sendPint (ddt/manager/GameSocketOut.as) | implemented | basico/index.ts |
| 5 | `SYS_DATE` | sendUpdateSysDate (ddt/manager/GameSocketOut.as) | implemented | basico/index.ts |
| 8 | `CLIENT_LOG` | sendErrorMsg (ddt/manager/GameSocketOut.as) | implemented | basico/index.ts |
| 208 | `LAUNCHER_LOGIN` | sendDeskTopLogin (ddt/manager/GameSocketOut.as) | MISSING |  |

### Correio/Presentes (4 código(s) — implemented 4, partial 0, stub 0, MISSING 0)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 116 | `SEND_MAIL` | sendEmail (ddt/manager/GameSocketOut.as) | implemented | correio/index.ts |
| 118 | `MAIL_CANCEL` | untreadEmail (ddt/manager/GameSocketOut.as) | implemented | correio/index.ts |
| 218 | `USER_GET_GIFTS` | sendPlayerGift (ddt/manager/GameSocketOut.as) | implemented | bolsa/presentes-recebidos.ts |
| 221 | `USER_SEND_GIFTS` | sendBuyGift (ddt/manager/GameSocketOut.as) | implemented | loja/presentear.ts |

### Cartas (4 código(s) — implemented 3, partial 1, stub 0, MISSING 0)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 170 | `CARDS_SLOT` | sendUpdateSLOT (ddt/manager/GameSocketOut.as); sendResetCardSoul (ddt/manager/GameSocketOut.as) | implemented | mascote/index.ts |
| 183 | `CARD_USE` | sendUseCard (ddt/manager/GameSocketOut.as) | implemented | bolsa/usar-carta.ts |
| 196 | `CARD_RESET` | sendCardReset (ddt/manager/GameSocketOut.as); sendReplaceCardProp (ddt/manager/GameSocketOut.as) | partial | bolsa/reroll-carta.ts |
| 216 | `CARDS_DATA` | sendMoveCards (ddt/manager/GameSocketOut.as); sendOpenViceCard (ddt/manager/GameSocketOut.as); sendOpenCardBox (ddt/manager/GameSocketOut.as); sendOpenRandomBox (ddt/manager/GameSocketOut.as); sendUpGradeCard (ddt/manager/GameSocketOut.as); sendSortCards (ddt/manager/GameSocketOut.as); sendFirstGetCards (ddt/manager/GameSocketOut.as); sendGetCardSoul (ddt/manager/GameSocketOut.as) | implemented | mascote/index.ts |

### Progressão/Ranking (3 código(s) — implemented 3, partial 0, stub 0, MISSING 0)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 11 | `ACTIVE_PULLDOWN` | sendActivePullDown (ddt/manager/GameSocketOut.as) | implemented | progressao/loterias.ts |
| 18 | `GET_PLAYER_CARD` | getPlayerCardInfo (ddt/manager/GameSocketOut.as) | implemented | progressao/index.ts |
| 34 | `USER_RANK` | sendChangeDesignation (ddt/manager/GameSocketOut.as) | implemented | bolsa/mostrar-guilda.ts |

### Batalha (3 código(s) — implemented 2, partial 0, stub 0, MISSING 1)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 82 | `GAME_MISSION_START` | sendGameMissionStart (ddt/manager/GameInSocketOut.as) | implemented | salas/index.ts |
| 91 | `GAME_CMD` | sendFlagMode (ddt/manager/GameInSocketOut.as); sendGameMissionPrepare (ddt/manager/GameInSocketOut.as); sendLoadingProgress (ddt/manager/GameInSocketOut.as); sendGameCMDBlast (ddt/manager/GameInSocketOut.as); sendGameCMDChange (ddt/manager/GameInSocketOut.as); sendGameCMDDirection (ddt/manager/GameInSocketOut.as); sendGameCMDStunt (ddt/manager/GameInSocketOut.as); sendGameCMDShoot (ddt/manager/GameInSocketOut.as); sendGameSkipNext (ddt/manager/GameInSocketOut.as); sendTransmissionGate (ddt/manager/GameInSocketOut.as); sendGameStartMove (ddt/manager/GameInSocketOut.as); sendGameStopMove (ddt/manager/GameInSocketOut.as); sendGameTakeOut (ddt/manager/GameInSocketOut.as); sendBossTakeOut (ddt/manager/GameInSocketOut.as); sendShootTag (ddt/manager/GameInSocketOut.as); sendBeat (ddt/manager/GameInSocketOut.as); sendUseProp (ddt/manager/GameInSocketOut.as); sendGhostTarget (ddt/manager/GameInSocketOut.as); sendPaymentTakeCard (ddt/manager/GameInSocketOut.as); sendMissionTryAgain (ddt/manager/GameInSocketOut.as); sendFightLibInfoChange (ddt/manager/GameInSocketOut.as); sendPassStory (ddt/manager/GameInSocketOut.as); sendClientScriptStart (ddt/manager/GameInSocketOut.as); sendClientScriptEnd (ddt/manager/GameInSocketOut.as); sendFightLibAnswer (ddt/manager/GameInSocketOut.as); sendFightLibReanswer (ddt/manager/GameInSocketOut.as); sendUpdatePlayStep (ddt/manager/GameInSocketOut.as); sendSelectObject (ddt/manager/GameInSocketOut.as); sendSuicide (ddt/manager/GameSocketOut.as); sendKillSelf (ddt/manager/GameSocketOut.as); sendAirPlane (ddt/manager/GameSocketOut.as); useDeputyWeapon (ddt/manager/GameSocketOut.as); sendGamePick (ddt/manager/GameSocketOut.as); sendPetSkill (ddt/manager/GameSocketOut.as); createMonster (ddt/manager/GameSocketOut.as); deleteMonster (ddt/manager/GameSocketOut.as); sendWish (ddt/manager/GameSocketOut.as); sendGameTrusteeship (ddt/manager/GameSocketOut.as); sendActivityDungeonNextPoints (ddt/manager/GameSocketOut.as); useRescueKingBless (ddt/manager/GameSocketOut.as) | implemented | salas/index.ts |
| 101 | `BATTLE_COMPANION_GIVE` | sendBattleCompanionGive (ddt/manager/GameSocketOut.as) | MISSING |  |

### VIP/Recarga (3 código(s) — implemented 2, partial 0, stub 0, MISSING 1)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 92 | `VIP_RENEWAL` | sendOpenVip (ddt/manager/GameSocketOut.as) | implemented | loja/vip.ts |
| 157 | `RECHARGE` | getspree (ddt/manager/GameSocketOut.as) | MISSING |  |
| 259 | `CONSUME_RANK` | updateConsumeRank (ddt/manager/GameSocketOut.as) | implemented | eventos/index.ts |

### Leilão (3 código(s) — implemented 3, partial 0, stub 0, MISSING 0)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 192 | `AUCTION_ADD` | auctionGood (ddt/manager/GameSocketOut.as) | implemented | leilao/index.ts |
| 193 | `AUCTION_UPDATE` | auctionBid (ddt/manager/GameSocketOut.as) | implemented | leilao/index.ts |
| 194 | `AUCTION_DELETE` | auctionCancelSell (ddt/manager/GameSocketOut.as) | implemented | leilao/index.ts |

### Runas/Beads (2 código(s) — implemented 2, partial 0, stub 0, MISSING 0)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 106 | `WISHBEADEQUIP` | sendWishBeadEquip (ddt/manager/GameSocketOut.as) | implemented | forja/index.ts |
| 121 | `RUNE_COMMAND` | sendBeadEquip (ddt/manager/GameSocketOut.as); sendBeadUpgrade (ddt/manager/GameSocketOut.as); sendOpenBead (ddt/manager/GameSocketOut.as); sendBeadLock (ddt/manager/GameSocketOut.as); sendBeadOpenHole (ddt/manager/GameSocketOut.as) | implemented | forja/index.ts |

### Tesouro (2 código(s) — implemented 2, partial 0, stub 0, MISSING 0)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 110 | `SEPARATE_ACTIVITY` | sendInitTreasueHunting (ddt/manager/GameSocketOut.as); sendPayForHunting (ddt/manager/GameSocketOut.as); getAllTreasure (ddt/manager/GameSocketOut.as); updateTreasureBag (ddt/manager/GameSocketOut.as); sendHuntingByScore (ddt/manager/GameSocketOut.as); sendConvertScore (ddt/manager/GameSocketOut.as); sendRouletteRun (ddt/manager/GameSocketOut.as) | implemented | forja/index.ts |
| 135 | `TREASURE_IN` | arrange (ddt/manager/GameSocketOut.as); enterTreasure (ddt/manager/GameSocketOut.as); startTreasure (ddt/manager/GameSocketOut.as); endTreasure (ddt/manager/GameSocketOut.as); doTreasure (ddt/manager/GameSocketOut.as) | implemented | fazenda/index.ts |

### Sociedade/Guilda (2 código(s) — implemented 1, partial 1, stub 0, MISSING 0)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 129 | `CONSORTIA_CMD` | sendConsortiaEquipConstrol (ddt/manager/GameSocketOut.as); sendCreateConsortia (ddt/manager/GameSocketOut.as); sendConsortiaTryIn (ddt/manager/GameSocketOut.as); sendConsortiaCancelTryIn (ddt/manager/GameSocketOut.as); sendConsortiaInvate (ddt/manager/GameSocketOut.as); sendReleaseConsortiaTask (ddt/manager/GameSocketOut.as); sendConsortiaInvatePass (ddt/manager/GameSocketOut.as); sendConsortiaInvateDelete (ddt/manager/GameSocketOut.as); sendConsortiaUpdateDescription (ddt/manager/GameSocketOut.as); sendConsortiaUpdatePlacard (ddt/manager/GameSocketOut.as); sendConsortiaUpdateDuty (ddt/manager/GameSocketOut.as); sendConsortiaUpgradeDuty (ddt/manager/GameSocketOut.as); sendConsoritaApplyStatusOut (ddt/manager/GameSocketOut.as); sendConsortiaOut (ddt/manager/GameSocketOut.as); sendConsortiaMemberGrade (ddt/manager/GameSocketOut.as); sendConsortiaUserRemarkUpdate (ddt/manager/GameSocketOut.as); sendConsortiaDutyDelete (ddt/manager/GameSocketOut.as); sendConsortiaTryinPass (ddt/manager/GameSocketOut.as); sendConsortiaTryinDelete (ddt/manager/GameSocketOut.as); sendForbidSpeak (ddt/manager/GameSocketOut.as); sendConsortiaDismiss (ddt/manager/GameSocketOut.as); sendConsortiaChangeChairman (ddt/manager/GameSocketOut.as); sendConsortiaRichOffer (ddt/manager/GameSocketOut.as); sendDonate (ddt/manager/GameSocketOut.as); sendConsortiaLevelUp (ddt/manager/GameSocketOut.as); sendConsortionMail (ddt/manager/GameSocketOut.as); sendConsortionPoll (ddt/manager/GameSocketOut.as); sendConsortionSkill (ddt/manager/GameSocketOut.as); sendBuyBadge (ddt/manager/GameSocketOut.as); sendConsortiaBossInfo (ddt/manager/GameSocketOut.as) | implemented | sociedade/index.ts |
| 153 | `CONSORTIA_BATTLE` | sendConsBatRequestPlayerInfo (ddt/manager/GameSocketOut.as); sendConsBatMove (ddt/manager/GameSocketOut.as); sendConsBatChallenge (ddt/manager/GameSocketOut.as); sendConsBatExit (ddt/manager/GameSocketOut.as); sendConsBatConsume (ddt/manager/GameSocketOut.as); sendConsBatUpdateScore (ddt/manager/GameSocketOut.as); sendConsBatConfirmEnter (ddt/manager/GameSocketOut.as) | partial | consortia-battle/index.ts |

### Campo de Batalha/Acampamento (2 código(s) — implemented 1, partial 0, stub 0, MISSING 1)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 132 | `BATTLE_GROUND` | battleGroundUpdata (ddt/manager/GameSocketOut.as); battleGroundPlayerUpdata (ddt/manager/GameSocketOut.as) | implemented | eventos/index.ts |
| 146 | `CAMPBATTLE` | CampbattleEnterFight (ddt/manager/GameSocketOut.as); CampbattleRoleMove (ddt/manager/GameSocketOut.as); changeMap (ddt/manager/GameSocketOut.as); outCampBatttle (ddt/manager/GameSocketOut.as); captureMap (ddt/manager/GameSocketOut.as); requestPRankList (ddt/manager/GameSocketOut.as); requestCRankList (ddt/manager/GameSocketOut.as); enterPTPFight (ddt/manager/GameSocketOut.as); returnToPve (ddt/manager/GameSocketOut.as); resurrect (ddt/manager/GameSocketOut.as) | MISSING |  |

### Juramento do Rei (2 código(s) — implemented 2, partial 0, stub 0, MISSING 0)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 142 | `KING_BLESS_MAIN` | sendOpenKingBless (ddt/manager/GameSocketOut.as); sendOpenDeed (ddt/manager/GameSocketOut.as) | implemented | progressao/index.ts |
| 143 | `KING_BLESS_USE_ITEM` | sendUseItemKingBless (ddt/manager/GameSocketOut.as); sendUseItemDeed (ddt/manager/GameSocketOut.as) | implemented | progressao/index.ts |

### Conquistas (2 código(s) — implemented 2, partial 0, stub 0, MISSING 0)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 229 | `ACHIEVEMENT_UPDATE` | sendModifyInfo (ddt/manager/GameSocketOut.as) | implemented | casamento/index.ts |
| 230 | `ACHIEVEMENT_FINISH` | sendAchievementFinish (ddt/manager/GameSocketOut.as) | implemented | eventos/index.ts |

### Relíquias (Magic Stone) (2 código(s) — implemented 1, partial 1, stub 0, MISSING 0)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 258 | `MAGIC_STONE` | exploreMagicStone (ddt/manager/GameSocketOut.as); getMagicStoneScore (ddt/manager/GameSocketOut.as); convertMgStoneScore (ddt/manager/GameSocketOut.as); moveMagicStone (ddt/manager/GameSocketOut.as); lockMagicStone (ddt/manager/GameSocketOut.as); updateMagicStone (ddt/manager/GameSocketOut.as); sortMgStoneBag (ddt/manager/GameSocketOut.as); updateRemainCount (ddt/manager/GameSocketOut.as) | partial | eventos/index.ts |
| 284 | `MAGIC_STONE_MONSTER_INFO` | sendCheckMagicStoneNumber (ddt/manager/GameSocketOut.as) | implemented | progressao/index.ts |

### Quiz/Caixa de Respostas (1 código(s) — implemented 1, partial 0, stub 0, MISSING 0)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 15 | `USER_ANSWER` | syncStep (ddt/manager/GameSocketOut.as); syncWeakStep (ddt/manager/GameSocketOut.as) | implemented | missoes/index.ts |

### Pets (1 código(s) — implemented 1, partial 0, stub 0, MISSING 0)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 68 | `PET` | sendPetMove (ddt/manager/GameSocketOut.as); sendPetFightUnFight (ddt/manager/GameSocketOut.as); sendPetFeed (ddt/manager/GameSocketOut.as); sendEquipPetSkill (ddt/manager/GameSocketOut.as); sendPetRename (ddt/manager/GameSocketOut.as); sendReleasePet (ddt/manager/GameSocketOut.as); sendAdoptPet (ddt/manager/GameSocketOut.as); sendRefreshPet (ddt/manager/GameSocketOut.as); sendUpdatePetInfo (ddt/manager/GameSocketOut.as); sendPaySkill (ddt/manager/GameSocketOut.as); sendAddPet (ddt/manager/GameSocketOut.as); sendRevertPet (ddt/manager/GameSocketOut.as); sendBuyPetExpItem (ddt/manager/GameSocketOut.as); addPetEquip (ddt/manager/GameSocketOut.as); delPetEquip (ddt/manager/GameSocketOut.as); sendPetRisingStar (ddt/manager/GameSocketOut.as); sendPetEvolution (ddt/manager/GameSocketOut.as); sendPetFormInfo (ddt/manager/GameSocketOut.as); sendPetFollowOrCall (ddt/manager/GameSocketOut.as); sendPetWake (ddt/manager/GameSocketOut.as); eatPetsHandler (ddt/manager/GameSocketOut.as) | implemented | mascote/index.ts |

### Fazenda (1 código(s) — implemented 0, partial 1, stub 0, MISSING 0)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 81 | `FARM` | enterFarm (ddt/manager/GameSocketOut.as); seeding (ddt/manager/GameSocketOut.as); sendCompose (ddt/manager/GameSocketOut.as); doMature (ddt/manager/GameSocketOut.as); toGather (ddt/manager/GameSocketOut.as); toSpread (ddt/manager/GameSocketOut.as); toFarmHelper (ddt/manager/GameSocketOut.as); sendBeginHelper (ddt/manager/GameSocketOut.as); toKillCrop (ddt/manager/GameSocketOut.as); toHelperRenewMoney (ddt/manager/GameSocketOut.as); exitFarm (ddt/manager/GameSocketOut.as); fastForwardGrop (ddt/manager/GameSocketOut.as); giftPacks (ddt/manager/GameSocketOut.as); getFarmPoultryLevel (ddt/manager/GameSocketOut.as); initFarmTree (ddt/manager/GameSocketOut.as); callFarmPoultry (ddt/manager/GameSocketOut.as); wakeFarmPoultry (ddt/manager/GameSocketOut.as); feedFarmPoultry (ddt/manager/GameSocketOut.as); farmCondenser (ddt/manager/GameSocketOut.as); farmWater (ddt/manager/GameSocketOut.as) | partial | fazenda/index.ts |

### Colar (1 código(s) — implemented 1, partial 0, stub 0, MISSING 0)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 95 | `NECKLACE_STRENGTH` | necklaceStrength (ddt/manager/GameSocketOut.as) | implemented | forja/index.ts |

### Barco-dragão (1 código(s) — implemented 0, partial 0, stub 0, MISSING 1)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 100 | `DRAGON_BOAT` | sendDragonBoatBuildOrDecorate (ddt/manager/GameSocketOut.as); sendDragonBoatRefreshBoatStatus (ddt/manager/GameSocketOut.as); sendDragonBoatRefreshRank (ddt/manager/GameSocketOut.as); sendDragonBoatExchange (ddt/manager/GameSocketOut.as) | MISSING |  |

### Boss Mundial (1 código(s) — implemented 0, partial 1, stub 0, MISSING 0)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 102 | `WORLDBOSS_CMD` | enterWorldBossRoom (ddt/manager/GameSocketOut.as); openOrCloseWorldBossHelper (ddt/manager/GameSocketOut.as); quitWorldBossHelperView (ddt/manager/GameSocketOut.as); sendAddPlayer (ddt/manager/GameSocketOut.as); sendAddAllWorldBossPlayer (ddt/manager/GameSocketOut.as); sendWorldBossRoomMove (ddt/manager/GameSocketOut.as); sendWorldBossRoomStauts (ddt/manager/GameSocketOut.as); sendLeaveBossRoom (ddt/manager/GameSocketOut.as); sendBuyWorldBossBuff (ddt/manager/GameSocketOut.as); sendNewBuyWorldBossBuff (ddt/manager/GameSocketOut.as); requestRevive (worldboss/view/WorldBossResurrectView.as) | partial | eventos/index.ts |

### Dados (1 código(s) — implemented 1, partial 0, stub 0, MISSING 0)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 134 | `DICE_SYSTEM` | sendDiceRefreshData (ddt/manager/GameInSocketOut.as); sendStartDiceInfo (ddt/manager/GameInSocketOut.as); sendRequestEnterDiceSystem (ddt/manager/GameInSocketOut.as) | implemented | eventos/index.ts |

### Totem (1 código(s) — implemented 1, partial 0, stub 0, MISSING 0)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 136 | `TOTEM` | sendOpenOneTotem (ddt/manager/GameSocketOut.as) | implemented | progressao/index.ts |

### Curadoria/Automação (1 código(s) — implemented 1, partial 0, stub 0, MISSING 0)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 140 | `TRUSTEESHIP` | sendTrusteeshipStart (ddt/manager/GameSocketOut.as); sendTrusteeshipCancel (ddt/manager/GameSocketOut.as); sendTrusteeshipSpeedUp (ddt/manager/GameSocketOut.as); sendTrusteeshipBuySpirit (ddt/manager/GameSocketOut.as); sendTrusteeshipUseSpiritItem (ddt/manager/GameSocketOut.as) | implemented | missoes/index.ts |

### Compra em Grupo (1 código(s) — implemented 0, partial 0, stub 1, MISSING 0)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 144 | `GROUP_PURCHASE` | sendGroupPurchaseRefreshData (ddt/manager/GameSocketOut.as); sendGroupPurchaseRefreshRankData (ddt/manager/GameSocketOut.as); sendGroupPurchaseBuy (ddt/manager/GameSocketOut.as) | stub | eventos/index.ts |

### Sete Dobrado (1 código(s) — implemented 0, partial 0, stub 0, MISSING 1)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 148 | `SEVEN_DOUBLE` | sendSevenDoubleCallCar (ddt/manager/GameSocketOut.as); sendSevenDoubleStartGame (ddt/manager/GameSocketOut.as); sendSevenDoubleCancelGame (ddt/manager/GameSocketOut.as); sendSevenDoubleReady (ddt/manager/GameSocketOut.as); sendSevenDoubleMove (ddt/manager/GameSocketOut.as); sendSevenDoubleUseSkill (ddt/manager/GameSocketOut.as); sendSevenDoubleCanEnter (ddt/manager/GameSocketOut.as); sendSevenDoubleEnterOrLeaveScene (ddt/manager/GameSocketOut.as) | MISSING |  |

### Cross-zone/GvG (1 código(s) — implemented 0, partial 0, stub 0, MISSING 1)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 154 | `TRANSNATIONALFIGHT_ACTIVED` | sendTransnationalBegin (ddt/manager/GameInSocketOut.as); revertPlayerInfo (ddt/manager/GameInSocketOut.as); sendEquipmentTransnational (ddt/manager/GameInSocketOut.as) | MISSING |  |

### Infra/Sistema (1 código(s) — implemented 1, partial 0, stub 0, MISSING 0)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 172 | `SAVE_DB` | sendSaveDB (ddt/manager/GameSocketOut.as) | implemented | basico/index.ts |

### Figurino/Encantamento (1 código(s) — implemented 1, partial 0, stub 0, MISSING 0)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 237 | `PLAYER_DRESS` | setCurrentModel (ddt/manager/GameSocketOut.as); saveDressModel (ddt/manager/GameSocketOut.as); foldDressItem (ddt/manager/GameSocketOut.as); lockDressBag (ddt/manager/GameSocketOut.as) | implemented | casamento/index.ts |

### Dar Flores (1 código(s) — implemented 0, partial 0, stub 0, MISSING 1)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 257 | `FLOWER_GIVING` | getFlowerRankInfo (ddt/manager/GameSocketOut.as); sendGetFlowerReward (ddt/manager/GameSocketOut.as); getFlowerRewardStatus (ddt/manager/GameSocketOut.as); sendFlower (ddt/manager/GameSocketOut.as); sendFlowerRecord (ddt/manager/GameSocketOut.as) | MISSING |  |

### Montaria (1 código(s) — implemented 0, partial 0, stub 0, MISSING 1)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 260 | `HORSE` | sendHorseChangeHorse (ddt/manager/GameSocketOut.as); sendActiveHorsePicCherish (ddt/manager/GameSocketOut.as); sendHorseUpHorse (ddt/manager/GameSocketOut.as); sendHorseUpSkill (ddt/manager/GameSocketOut.as); sendHorseTakeUpDownSkill (ddt/manager/GameSocketOut.as) | MISSING |  |

### Coleta (1 código(s) — implemented 0, partial 0, stub 0, MISSING 1)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 261 | `COLLECTION_TASK` | sendCollectionSceneEnter (ddt/manager/GameSocketOut.as); sendCollectionSceneMove (ddt/manager/GameSocketOut.as); sendCollectionComplete (ddt/manager/GameSocketOut.as); sendLeaveCollectionScene (ddt/manager/GameSocketOut.as) | MISSING |  |

### Hall Novo (NewHall) (1 código(s) — implemented 1, partial 0, stub 0, MISSING 0)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 262 | `NEW_HALL` | sendPlayerExit (ddt/manager/GameSocketOut.as); sendOtherPlayerInfo (ddt/manager/GameSocketOut.as); sendPlayerPos (ddt/manager/GameSocketOut.as); sendAddNewPlayer (ddt/manager/GameSocketOut.as); sendModifyNewPlayerDress (ddt/manager/GameSocketOut.as); sendUpdatePets (ddt/manager/GameSocketOut.as); sendNewHallPlayerHid (ddt/manager/GameSocketOut.as); sendNewHallBattle (ddt/manager/GameSocketOut.as); sendLoadOtherPlayer (ddt/manager/GameSocketOut.as) | implemented | hall-6600/index.ts |

### Rei da Bomba (1 código(s) — implemented 0, partial 0, stub 0, MISSING 1)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 263 | `BOMB_KING` | sendBombKingStartBattle (ddt/manager/GameSocketOut.as); updateBombKingMainFrame (ddt/manager/GameSocketOut.as); updateBombKingRank (ddt/manager/GameSocketOut.as); updateBombKingBattleLog (ddt/manager/GameSocketOut.as); updateBKingItemEquip (ddt/manager/GameSocketOut.as); getBKingStatueInfo (ddt/manager/GameSocketOut.as); requestBKingShowTip (ddt/manager/GameSocketOut.as) | MISSING |  |

### Boss da Cripta (1 código(s) — implemented 0, partial 0, stub 0, MISSING 1)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 275 | `CRYPTBOSS` | sendCryptBossFight (ddt/manager/GameSocketOut.as) | MISSING |  |

### Ponte da Pega (1 código(s) — implemented 0, partial 0, stub 0, MISSING 1)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 276 | `MAGPIE_BRIDGE` | enterMagpieBridge (ddt/manager/GameSocketOut.as); magpieRollDice (ddt/manager/GameSocketOut.as); buyMagpieCount (ddt/manager/GameSocketOut.as); refreshMagpieView (ddt/manager/GameSocketOut.as); exitMagpieView (ddt/manager/GameSocketOut.as) | MISSING |  |

### Resgate (1 código(s) — implemented 0, partial 0, stub 0, MISSING 1)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 277 | `RESCUE` | requestRescueItemInfo (ddt/manager/GameSocketOut.as); requestRescueFrameInfo (ddt/manager/GameSocketOut.as); sendRescueChallenge (ddt/manager/GameSocketOut.as); sendRescueCleanCD (ddt/manager/GameSocketOut.as); sendRescueBuyBuff (ddt/manager/GameSocketOut.as); getRescuePrize (ddt/manager/GameSocketOut.as) | MISSING |  |

### Festival da Lua (1 código(s) — implemented 0, partial 0, stub 0, MISSING 1)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 281 | `WORSHIP_THE_MOON_MID_AUTUMN` | sendWorshipTheMoon (ddt/manager/GameInSocketOut.as); sendWorshipTheMoonIsActivityOpen (ddt/manager/GameInSocketOut.as); sendWorshipTheMoonFreeCount (ddt/manager/GameInSocketOut.as); sendWorshipTheMoonAwardsList (ddt/manager/GameInSocketOut.as); sendGainThe200timesAwardBox (ddt/manager/GameInSocketOut.as) | MISSING |  |

### Corrida de Montaria (1 código(s) — implemented 0, partial 0, stub 0, MISSING 1)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 282 | `HORSERACE` | sendHorseRaceItemUse (ddt/manager/GameSocketOut.as); sendHorseRaceItemUse2 (ddt/manager/GameSocketOut.as); sendHorseRaceEnd (ddt/manager/GameSocketOut.as); buyHorseRaceCount (ddt/manager/GameSocketOut.as) | MISSING |  |

### Liga dos Exploradores (1 código(s) — implemented 0, partial 0, stub 0, MISSING 1)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 328 | `KING_DIVISION` | sendKingDivisionGameStart (ddt/manager/GameInSocketOut.as); sendGetConsortionMessageThisZone (ddt/manager/GameInSocketOut.as); sendGetConsortionMessageAllZone (ddt/manager/GameInSocketOut.as); sendGetEliminateConsortionMessageThisZone (ddt/manager/GameInSocketOut.as); sendGetEliminateConsortionMessageAllZone (ddt/manager/GameInSocketOut.as) | MISSING |  |

### Álbum (AvatarCollection) (1 código(s) — implemented 1, partial 0, stub 0, MISSING 0)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 402 | `AVATAR_COLLECTION` | sendAvatarCollectionActive (ddt/manager/GameSocketOut.as); sendAvatarCollectionDelayTime (ddt/manager/GameSocketOut.as) | implemented | progressao/index.ts |

### Arena Ranqueada (RingStation) (1 código(s) — implemented 0, partial 0, stub 0, MISSING 1)

| Código | Nome(s) ePackageType | Função cliente (arquivo) | Status servidor | Handler |
|---|---|---|---|---|
| 404 | `RING_STATION` | sendRingStationGetInfo (ddt/manager/GameSocketOut.as); sendBuyBattleCountOrTime (ddt/manager/GameSocketOut.as); sendRingStationChallenge (ddt/manager/GameSocketOut.as); sendRingStationArmory (ddt/manager/GameSocketOut.as); sendRingStationBattleField (ddt/manager/GameSocketOut.as); sendRingStationFightFlag (ddt/manager/GameSocketOut.as); sendSignMsg (ddt/manager/GameSocketOut.as); receiveLandersAward (ddt/manager/GameSocketOut.as) | MISSING |  |

## Endpoints — detalhe completo

| Caminho | Tipo | Status | Observação |
|---|---|---|---|
| `/AASGetState.aspx` | aspx | não roteado (fora de escopo) | Anti-Addiction System (China/Ásia) — decidido fora de escopo BR, research/6600/client-boot.md |
| `/AASUpdateState.aspx` | aspx | não roteado (fora de escopo) | Anti-Addiction System (China/Ásia) — decidido fora de escopo BR, research/6600/client-boot.md |
| `/AccountRegister.ashx` | ashx | empty (stub gracioso) |  |
| `/achievementlist.xml` | xml | native |  |
| `/activeconvertiteminfo.ashx` | ashx | empty (desconhecido) |  |
| `/activeconvertiteminfo.xml` | xml | native |  |
| `/ActiveList.ashx` | ashx | native (template rebuild) |  |
| `/activelist.xml` | xml | native |  |
| `/ActivePullDown.ashx` | ashx | native |  |
| `/activityhalloweenitems.xml` | xml | native |  |
| `/activityhalloweenrank.ashx` | ashx | empty (desconhecido) |  |
| `/activityquestlist_out.xml` | xml | snapshot |  |
| `/activityquestlist.xml` | xml | snapshot |  |
| `/activitysystemitems.ashx` | ashx | native (template rebuild) |  |
| `/activitysystemitems.xml` | xml | native |  |
| `/activitysystemitemsrate.xml` | xml | snapshot |  |
| `/advancequestionread.ashx` | ashx | native |  |
| `/advancequestionread.xml` | xml | snapshot |  |
| `/AdvanceQuestTime.ashx` | ashx | native |  |
| `/ApprenticeshipClubList.ashx` | ashx | native |  |
| `/areacelebbyconsortiadaygiftgp.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/areacelebByConsortiaDayHonor.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/areacelebbyconsortiadayriches.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/areacelebbyconsortiafightpower.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/areacelebbyconsortiagiftgp.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/areacelebByConsortiaHonor.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/areacelebbyconsortialevel.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/areacelebbyconsortiariches.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/areacelebbyconsortiaweekgiftgp.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/areacelebByConsortiaWeekHonor.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/areacelebbyconsortiaweekriches.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/areacelebbydayfightpowerlist.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/areacelebbydaygplist.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/areacelebbydayofferlist.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/areacelebbygiftgpdaylist.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/areacelebbygiftgplist.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/areacelebbygiftgpweeklist.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/areacelebbygplist.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/areacelebbymountexplist.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/areacelebbyofferlist.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/areacelebbytotalprestige.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/areacelebbyweekgplist.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/areacelebbyweekofferlist.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/AreaCelebList/areacelebbyconsortiadaygiftgp.ashx` | ashx | empty (desconhecido) |  |
| `/AreaCelebList/areaCelebByConsortiaDayHonor.ashx` | ashx | empty (desconhecido) |  |
| `/AreaCelebList/areaCelebByConsortiaDayRiches.ashx` | ashx | empty (desconhecido) |  |
| `/AreaCelebList/areacelebbyconsortiafightpower.ashx` | ashx | empty (desconhecido) |  |
| `/AreaCelebList/areacelebbyconsortiagiftgp.ashx` | ashx | empty (desconhecido) |  |
| `/AreaCelebList/areaCelebByConsortiaHonor.ashx` | ashx | empty (desconhecido) |  |
| `/AreaCelebList/areaCelebByConsortiaLevel.ashx` | ashx | empty (desconhecido) |  |
| `/AreaCelebList/areaCelebByConsortiaRiches.ashx` | ashx | empty (desconhecido) |  |
| `/AreaCelebList/areacelebbyconsortiaweekgiftgp.ashx` | ashx | empty (desconhecido) |  |
| `/AreaCelebList/areaCelebByConsortiaWeekHonor.ashx` | ashx | empty (desconhecido) |  |
| `/AreaCelebList/areaCelebByConsortiaWeekRiches.ashx` | ashx | empty (desconhecido) |  |
| `/AreaCelebList/areaCelebByDayFightPowerList.ashx` | ashx | empty (desconhecido) |  |
| `/AreaCelebList/areacelebbydaygiftgp.ashx` | ashx | empty (desconhecido) |  |
| `/AreaCelebList/areaCelebByDayGPList.ashx` | ashx | empty (desconhecido) |  |
| `/AreaCelebList/areaCelebByDayOfferList.ashx` | ashx | empty (desconhecido) |  |
| `/AreaCelebList/areacelebbygiftgplist.ashx` | ashx | empty (desconhecido) |  |
| `/AreaCelebList/areaCelebByGpList.ashx` | ashx | empty (desconhecido) |  |
| `/AreaCelebList/areacelebbymountexplist.ashx` | ashx | empty (desconhecido) |  |
| `/AreaCelebList/areaCelebByOfferList.ashx` | ashx | empty (desconhecido) |  |
| `/AreaCelebList/areacelebbytotalprestige.ashx` | ashx | empty (desconhecido) |  |
| `/AreaCelebList/areacelebbyweekgiftgp.ashx` | ashx | empty (desconhecido) |  |
| `/AreaCelebList/areaCelebByWeekGPList.ashx` | ashx | empty (desconhecido) |  |
| `/AreaCelebList/areaCelebByWeekOfferList.ashx` | ashx | empty (desconhecido) |  |
| `/AuctionPageList.ashx` | ashx | empty (stub gracioso) |  |
| `/Balllist.ashx` | ashx | native (template rebuild) |  |
| `/balllist.xml` | xml | native |  |
| `/BombConfig.ashx` | ashx | native (template rebuild) |  |
| `/bombconfig.xml` | xml | native |  |
| `/buttonconfig.xml` | xml | snapshot |  |
| `/cardbufflist.xml` | xml | native |  |
| `/cardgrooveupdatelist.xml` | xml | native |  |
| `/cardinfolist.xml` | xml | native |  |
| `/cardtemplateinfo.xml` | xml | native |  |
| `/celebbyconsortiadaygiftgp.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/CelebByConsortiaDayHonor_Out.xml` | xml | native |  |
| `/CelebByConsortiaDayHonor.xml` | xml | native |  |
| `/CelebByConsortiaDayRiches_Out.xml` | xml | native |  |
| `/CelebByConsortiaDayRiches.xml` | xml | native |  |
| `/celebbyconsortiafightpower_Out.xml` | xml | native |  |
| `/celebbyconsortiafightpower.xml` | xml | native |  |
| `/celebbyconsortiagiftgp.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/CelebByConsortiaHonor_Out.xml` | xml | native |  |
| `/CelebByConsortiaHonor.xml` | xml | native |  |
| `/CelebByConsortiaLevel.xml` | xml | native |  |
| `/CelebByConsortiaRiches_Out.xml` | xml | native |  |
| `/CelebByConsortiaRiches.xml` | xml | native |  |
| `/celebbyconsortiaweekgiftgp.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/CelebByConsortiaWeekHonor_Out.xml` | xml | native |  |
| `/CelebByConsortiaWeekHonor.xml` | xml | native |  |
| `/CelebByConsortiaWeekRiches_Out.xml` | xml | native |  |
| `/CelebByConsortiaWeekRiches.xml` | xml | native |  |
| `/CelebByDayFightPowerList_Out.xml` | xml | native |  |
| `/CelebByDayFightPowerList.xml` | xml | native |  |
| `/celebbydaygiftgp.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/CelebByDayGPList.xml` | xml | native |  |
| `/CelebByDayOfferList_Out.xml` | xml | native |  |
| `/CelebByDayOfferList.xml` | xml | native |  |
| `/celebbygiftgplist.xml` | xml | native |  |
| `/CelebByGpList.xml` | xml | native |  |
| `/celebbymountexplist_Out.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/celebbymountexplist.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/CelebByOfferList_Out.xml` | xml | native |  |
| `/CelebByOfferList.xml` | xml | native |  |
| `/celebbytotalprestige_Out.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/celebbytotalprestige.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/celebbyweekgiftgp.xml` | xml | empty (ranking vazio, sem tabela cross-area) |  |
| `/CelebByWeekGPList_Out.xml` | xml | native |  |
| `/CelebByWeekGPList.xml` | xml | native |  |
| `/CelebByWeekOfferList_Out.xml` | xml | native |  |
| `/CelebByWeekOfferList.xml` | xml | native |  |
| `/CelebForBestEquip.xml` | xml | native |  |
| `/CelebForConsortia.xml` | xml | native |  |
| `/CelebForUsers.xml` | xml | native |  |
| `/CelebForUsersByDay.xml` | xml | native |  |
| `/CelebList/celebbyconsortiadaygiftgp.ashx` | ashx | empty (desconhecido) |  |
| `/CelebList/CelebByConsortiaDayHonor.ashx` | ashx | empty (desconhecido) |  |
| `/CelebList/CelebByConsortiaDayRiches.ashx` | ashx | empty (desconhecido) |  |
| `/CelebList/celebbyconsortiafightpower.ashx` | ashx | empty (desconhecido) |  |
| `/CelebList/celebbyconsortiagiftgp.ashx` | ashx | empty (desconhecido) |  |
| `/CelebList/CelebByConsortiaHonor.ashx` | ashx | empty (desconhecido) |  |
| `/CelebList/CelebByConsortiaLevel.ashx` | ashx | empty (desconhecido) |  |
| `/CelebList/CelebByConsortiaRiches.ashx` | ashx | empty (desconhecido) |  |
| `/CelebList/celebbyconsortiaweekgiftgp.ashx` | ashx | empty (desconhecido) |  |
| `/CelebList/CelebByConsortiaWeekHonor.ashx` | ashx | empty (desconhecido) |  |
| `/CelebList/CelebByConsortiaWeekRiches.ashx` | ashx | empty (desconhecido) |  |
| `/CelebList/CelebByDayBestEquip.ashx` | ashx | empty (desconhecido) |  |
| `/CelebList/CelebByDayFightPowerList.ashx` | ashx | empty (desconhecido) |  |
| `/CelebList/celebbydaygiftgp.ashx` | ashx | empty (desconhecido) |  |
| `/CelebList/CelebByDayGPList.ashx` | ashx | empty (desconhecido) |  |
| `/CelebList/CelebByDayOfferList.ashx` | ashx | empty (desconhecido) |  |
| `/CelebList/celebbygiftgplist.ashx` | ashx | empty (desconhecido) |  |
| `/CelebList/CelebByGpList.ashx` | ashx | empty (desconhecido) |  |
| `/CelebList/celebbymountexplist.ashx` | ashx | empty (desconhecido) |  |
| `/CelebList/CelebByOfferList.ashx` | ashx | empty (desconhecido) |  |
| `/CelebList/celebbytotalprestige.ashx` | ashx | empty (desconhecido) |  |
| `/CelebList/celebbyweekgiftgp.ashx` | ashx | empty (desconhecido) |  |
| `/CelebList/CelebByWeekGPList.ashx` | ashx | empty (desconhecido) |  |
| `/CelebList/CelebByWeekOfferList.ashx` | ashx | empty (desconhecido) |  |
| `/CelebList/CreateAllCeleb.ashx` | ashx | empty (desconhecido) |  |
| `/ChargeMoney.aspx` | aspx | não roteado (404) |  |
| `/ChargeMoneyForId.aspx` | aspx | não roteado (404) |  |
| `/chargespendrewardtemplateinfolist.xml` | xml | snapshot |  |
| `/ChargeTest.ashx` | ashx | empty (stub gracioso) |  |
| `/CheckRegistration.ashx` | ashx | empty (stub gracioso) |  |
| `/click.aspx` | aspx | não roteado (404) |  |
| `/clothgrouptemplateinfo_out.xml` | xml | native |  |
| `/clothgrouptemplateinfo.ashx` | ashx | empty (desconhecido) |  |
| `/clothgrouptemplateinfo.xml` | xml | native |  |
| `/clothpropertytemplateinfo_out.xml` | xml | native |  |
| `/clothpropertytemplateinfo.ashx` | ashx | empty (desconhecido) |  |
| `/clothpropertytemplateinfo.xml` | xml | native |  |
| `/commitweeklyuserrecord.ashx` | ashx | empty (stub gracioso) |  |
| `/communalactive.ashx` | ashx | empty (desconhecido) |  |
| `/communalactive.xml` | xml | snapshot |  |
| `/communalactiveawarditems.xml` | xml | snapshot |  |
| `/communalactiveexp.xml` | xml | snapshot |  |
| `/ConsortiaAllyList.ashx` | ashx | native |  |
| `/ConsortiaApplyAllyList.ashx` | ashx | native |  |
| `/ConsortiaApplyUsersList.ashx` | ashx | native |  |
| `/consortiabadgeconfig.xml` | xml | native |  |
| `/consortiabossconfigload.xml` | xml | native |  |
| `/consortiabuffertemp.xml` | xml | native |  |
| `/ConsortiaCandidateList.ashx` | ashx | empty (stub gracioso) |  |
| `/ConsortiaDutyList.ashx` | ashx | native |  |
| `/ConsortiaEquipControl.ashx` | ashx | native |  |
| `/ConsortiaEquipControlList.ashx` | ashx | native |  |
| `/ConsortiaEventList.ashx` | ashx | native |  |
| `/ConsortiaIMList.ashx` | ashx | native |  |
| `/ConsortiaInviteUsersList.ashx` | ashx | native |  |
| `/ConsortiaLevelList.ashx` | ashx | native (template rebuild) |  |
| `/consortialevellist.xml` | xml | native |  |
| `/ConsortiaList.ashx` | ashx | native |  |
| `/ConsortiaNameCheck.ashx` | ashx | native |  |
| `/ConsortiaUsersList.ashx` | ashx | native |  |
| `/consortiawarconsortiarank.ashx` | ashx | native |  |
| `/consortiawarplayerrank.ashx` | ashx | native |  |
| `/CreateAllAreaCeleb.ashx` | ashx | empty (desconhecido) |  |
| `/CreateAllCeleb.ashx` | ashx | empty (desconhecido) |  |
| `/CreateAllXml.ashx` | ashx | empty (desconhecido) |  |
| `/CreateLogin.aspx` | aspx | native |  |
| `/crossdomain.xml` | xml | snapshot |  |
| `/DailyAwardList.ashx` | ashx | native (template rebuild) |  |
| `/dailyawardlist.xml` | xml | native |  |
| `/dailyleagueaward.xml` | xml | snapshot |  |
| `/dailyleaguelevel.xml` | xml | native |  |
| `/dailyloglist.ashx` | ashx | native |  |
| `/dicegameawarditem.xml` | xml | native |  |
| `/directlogin.ashx` | ashx | empty (desconhecido) |  |
| `/DropItemForNewRegister.ashx` | ashx | empty (desconhecido) |  |
| `/everydayactivepointtemplateinfolist.xml` | xml | native |  |
| `/everydayactiveprogressinfolist.ashx` | ashx | empty (desconhecido) |  |
| `/everydayactiveprogressinfolist.xml` | xml | native |  |
| `/everydayactiverewardtemplateinfolist.xml` | xml | native |  |
| `/exerciseinfolist.xml` | xml | native |  |
| `/ExitGameTransit.ashx` | ashx | empty (stub gracioso) |  |
| `/ExperienceRate.aspx` | aspx | não roteado (404) |  |
| `/fairbattlerewardtemp.xml` | xml | native |  |
| `/FarmGetUserFieldInfos.ashx` | ashx | empty (stub gracioso) |  |
| `/farmgetuserfieldinfossingle.ashx` | ashx | empty (stub gracioso) |  |
| `/FavoriteTransit.ashx` | ashx | empty (stub gracioso) |  |
| `/fightlabdropitemlist.xml` | xml | native |  |
| `/fightspirittemplatelist.xml` | xml | native |  |
| `/foodcomposelist.xml` | xml | snapshot |  |
| `/fusioninfoload.xml` | xml | native |  |
| `/GetSID.ashx` | ashx | empty (stub gracioso) |  |
| `/GiftRecieveLog.ashx` | ashx | empty (stub gracioso) |  |
| `/GiftSendLog.ashx` | ashx | empty (stub gracioso) |  |
| `/gmactivityinfo_out.xml` | xml | snapshot |  |
| `/gmactivityinfo.xml` | xml | snapshot |  |
| `/goldequiptemplateload.xml` | xml | native |  |
| `/goodscollect_out.xml` | xml | snapshot |  |
| `/goodscollect.xml` | xml | snapshot |  |
| `/helpgamereward.xml` | xml | snapshot |  |
| `/IMFriendsBbs.ashx` | ashx | empty (stub gracioso) |  |
| `/IMFriendsGood.ashx` | ashx | empty (stub gracioso) |  |
| `/IMListLoad.ashx` | ashx | native |  |
| `/IMRecentContactsList.ashx` | ashx | empty (stub gracioso) |  |
| `/itemstrengthendata.xml` | xml | snapshot |  |
| `/itemstrengthengoodsinfo.xml` | xml | native |  |
| `/ItemStrengthenList.ashx` | ashx | native (template rebuild) |  |
| `/ItemStrengthenList.xml` | xml | native |  |
| `/KeyGenerator.ashx` | ashx | empty (stub gracioso) |  |
| `/KitoffUser.aspx` | aspx | não roteado (404) |  |
| `/levellist.xml` | xml | native |  |
| `/lightriddlequest.xml` | xml | native |  |
| `/loadallquestions.xml` | xml | snapshot |  |
| `/loadboxtemp_out.xml` | xml | snapshot |  |
| `/LoadBoxTemp.ashx` | ashx | native (template rebuild) |  |
| `/LoadBoxTemp.xml` | xml | native |  |
| `/loadchargeactivetemplate.xml` | xml | snapshot |  |
| `/LoadItemsCategory.ashx` | ashx | native (template rebuild) |  |
| `/loaditemscategory.xml` | xml | native |  |
| `/LoadMapsItems.ashx` | ashx | native (template rebuild) |  |
| `/loadmapsitems.xml` | xml | native |  |
| `/loadpetfightproperty_out.xml` | xml | native |  |
| `/loadpetfightproperty.xml` | xml | native |  |
| `/loadpetformdata.xml` | xml | native |  |
| `/loadpetmoeproperty.xml` | xml | native |  |
| `/loadpetstarexp_out.xml` | xml | snapshot |  |
| `/loadpetstarexp.xml` | xml | native |  |
| `/loadpveitems_out.xml` | xml | snapshot |  |
| `/LoadPVEItems.ashx` | ashx | native (template rebuild) |  |
| `/loadpveitems.xml` | xml | native |  |
| `/loadstrengthexp.xml` | xml | native |  |
| `/loaduserbox.xml` | xml | native |  |
| `/LoadUserEquip.ashx` | ashx | empty (stub gracioso) |  |
| `/LoadUserItems.ashx` | ashx | empty (stub gracioso) |  |
| `/LoadUserMail.ashx` | ashx | native |  |
| `/LoadUsersSort.ashx` | ashx | empty (stub gracioso) |  |
| `/LogClickTip.ashx` | ashx | empty (stub gracioso) |  |
| `/Login.ashx` | ashx | native |  |
| `/loginawarditemtemplate.xml` | xml | native |  |
| `/LoginForClient.aspx` | aspx | não roteado (404) |  |
| `/LoginSelectList.ashx` | ashx | native |  |
| `/LoginTest.aspx` | aspx | não roteado (404) |  |
| `/LogTime.ashx` | ashx | native |  |
| `/lotteryshowtemplate.xml` | xml | snapshot |  |
| `/luckstaractivityrank.ashx` | ashx | empty (stub gracioso) |  |
| `/magicitemtemp.xml` | xml | snapshot |  |
| `/magicstonetemplate_out.xml` | xml | snapshot |  |
| `/magicstonetemplate.xml` | xml | native |  |
| `/MailSenderList.ashx` | ashx | native |  |
| `/MapServerList.ashx` | ashx | native (template rebuild) |  |
| `/mapserverlist.xml` | xml | native |  |
| `/MapWeekList.ashx` | ashx | empty (stub gracioso) |  |
| `/MarryInfoPageList.ashx` | ashx | native |  |
| `/missionenergyprice.ashx` | ashx | empty (desconhecido) |  |
| `/missionenergyprice.xml` | xml | snapshot |  |
| `/mountdrawtemplate.ashx` | ashx | empty (desconhecido) |  |
| `/mountdrawtemplate.xml` | xml | native |  |
| `/mountskillelementtemplate_out.xml` | xml | snapshot |  |
| `/mountskillelementtemplate.xml` | xml | native |  |
| `/mountskillgettemplate_out.xml` | xml | snapshot |  |
| `/mountskillgettemplate.xml` | xml | native |  |
| `/mountskilltemplate_out.xml` | xml | snapshot |  |
| `/mountskilltemplate.xml` | xml | native |  |
| `/mounttemplate_out.xml` | xml | snapshot |  |
| `/mounttemplate.xml` | xml | native |  |
| `/newtitleinfo.xml` | xml | native |  |
| `/NickNameCheck.ashx` | ashx | native |  |
| `/nicknamerandom.ashx` | ashx | empty (desconhecido) |  |
| `/NoticeServerUpdate.aspx` | aspx | não roteado (404) |  |
| `/novicenodedata.ashx` | ashx | empty (desconhecido) |  |
| `/NPCInfoList_out.xml` | xml | snapshot |  |
| `/NPCInfoList.ashx` | ashx | native (template rebuild) |  |
| `/NPCInfoList.xml` | xml | native |  |
| `/PayTransit.ashx` | ashx | empty (stub gracioso) |  |
| `/petconfiginfo_out.xml` | xml | snapshot |  |
| `/petconfiginfo.xml` | xml | native |  |
| `/petexpitemprice.xml` | xml | native |  |
| `/petlevelinfo.xml` | xml | native |  |
| `/petskillelementinfo.xml` | xml | native |  |
| `/petskillinfo.xml` | xml | native |  |
| `/petskilltemplateinfo.xml` | xml | native |  |
| `/pettemplateinfo.xml` | xml | native |  |
| `/phpresponse.ashx` | ashx | empty (desconhecido) |  |
| `/questlist_out.xml` | xml | snapshot |  |
| `/QuestList.ashx` | ashx | native (template rebuild) |  |
| `/questlist.xml` | xml | native |  |
| `/ranktemplateall.xml` | xml | snapshot |  |
| `/RenameConsortiaName.ashx` | ashx | empty (stub gracioso) |  |
| `/RenameNick.ashx` | ashx | empty (stub gracioso) |  |
| `/runetemplatelist.xml` | xml | native |  |
| `/SameCityIMLoad.ashx` | ashx | empty (stub gracioso) |  |
| `/SavePlayerAction.ashx` | ashx | empty (desconhecido) |  |
| `/scenecollecrandomnpc.ashx` | ashx | native |  |
| `/searchgoodspaymoney.xml` | xml | snapshot |  |
| `/searchgoodstemp.ashx` | ashx | native (template rebuild) |  |
| `/searchgoodstemp.xml` | xml | native |  |
| `/SendActiveKeySystem.ashx` | ashx | empty (stub gracioso) |  |
| `/SendItemTest.aspx` | aspx | não roteado (404) |  |
| `/SentReward.ashx` | ashx | empty (stub gracioso) |  |
| `/SentRewardTest.aspx` | aspx | não roteado (404) |  |
| `/serverconfig_out.xml` | xml | snapshot |  |
| `/serverconfig.ashx` | ashx | native (template rebuild) |  |
| `/serverconfig.xml` | xml | native |  |
| `/ServerList.ashx` | ashx | native |  |
| `/ServerList.aspx` | aspx | não roteado (404) |  |
| `/shopbox_out.xml` | xml | snapshot |  |
| `/shopbox.xml` | xml | snapshot |  |
| `/shopcheapitemlist.ashx` | ashx | native |  |
| `/ShopGoodsShowList.ashx` | ashx | native (template rebuild) |  |
| `/shopgoodsshowlist.xml` | xml | native |  |
| `/shopitemlist_out.xml` | xml | snapshot |  |
| `/ShopItemList.ashx` | ashx | native (template rebuild) |  |
| `/shopitemlist.xml` | xml | native |  |
| `/subactivelist.ashx` | ashx | native |  |
| `/SubmitTest.aspx` | aspx | não roteado (404) |  |
| `/suitpartequipinfolist_out.xml` | xml | snapshot |  |
| `/suitpartequipinfolist.xml` | xml | native |  |
| `/suittemplateinfolist_out.xml` | xml | snapshot |  |
| `/suittemplateinfolist.xml` | xml | native |  |
| `/SystemNotice.aspx` | aspx | não roteado (404) |  |
| `/Tank.Request.Publish.xml` | xml | snapshot |  |
| `/teambuyactiveawardinfo.ashx` | ashx | native |  |
| `/TemplateAllList.ashx` | ashx | native (template rebuild) |  |
| `/TemplateAlllist.xml` | xml | native |  |
| `/totemhonortemplate.xml` | xml | native |  |
| `/toteminfo.xml` | xml | native |  |
| `/treetemplatelist.xml` | xml | native |  |
| `/UpdateUserRecruit.ashx` | ashx | empty (desconhecido) |  |
| `/UpdateVersion.ashx` | ashx | native |  |
| `/UserApprenticeshipInfoList.ashx` | ashx | native |  |
| `/UserGetActiveState.ashx` | ashx | empty (stub gracioso) |  |
| `/UserGoodsInfo.ashx` | ashx | empty (stub gracioso) |  |
| `/UserNameCheck.aspx` | aspx | não roteado (404) |  |
| `/UserQuestList.ashx` | ashx | empty (stub gracioso) |  |
| `/UserRankDate.ashx` | ashx | native |  |
| `/ValidateCode.aspx` | aspx | não roteado (404) |  |
| `/VisualizeItemLoad.ashx` | ashx | empty (stub gracioso) |  |
| `/VisualizeRegister.ashx` | ashx | native |  |
| `/VoteSubmit.ashx` | ashx | native |  |
| `/warriorfamranklist.xml` | xml | snapshot |  |
