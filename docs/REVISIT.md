# Pendências para revisitar (gerado — não editar à mão)

Tudo que NÃO está 100% (servidor ok + verificado no cliente). Inclui itens "mortos no original" (sem handler nem no C#): decidir depois se implementamos do zero ou removemos o botão do cliente.

Totais: 327 linhas — missing 78, stub 13, partial 119, ok-mas-não-verificado-no-cliente 117.

## Combate (GAME_CMD) (39)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| missing | 75 | CrazyTankPackageType.PROP_DELETE | sendThrowProp |  |
| missing | 108 | GAME_TAKE_TEMP | sendGetTropToBag |  |
| missing | 108 | GAME_TAKE_TEMP | sendGetTropToBag |  |
| missing | 123 | DEFY_AFFICHE | sendDefyAffiche |  |
| partial | 91/GENERAL_COMMAND=23 | GAME_CMD | createMonster | Laboratório (sala tipo 5, Pve 1000-1004, missões 101-125): GENERAL_COMMAND agora leva os ints ao script da missão (OnGeneralCommand → OnMissionEvent; antes ninguém chamava e o quiz nunca começava). Vitória desbloqueia o próximo nível (SetFightLabPermission) e o 1º clear paga FightLabUserDrop (Drop_Condiction tipo 14). |
| partial | 91/GENERAL_COMMAND=23 | GAME_CMD | deleteMonster | Laboratório (sala tipo 5, Pve 1000-1004, missões 101-125): GENERAL_COMMAND agora leva os ints ao script da missão (OnGeneralCommand → OnMissionEvent; antes ninguém chamava e o quiz nunca começava). Vitória desbloqueia o próximo nível (SetFightLabPermission) e o 1º clear paga FightLabUserDrop (Drop_Condiction tipo 14). |
| partial | 91/AIRPLANE=40 | GAME_CMD | sendAirPlane |  |
| partial | 91/BEAT=22 | GAME_CMD | sendBeat |  |
| partial | 91/BOSS_TAKE_CARD=130 | GAME_CMD | sendBossTakeOut |  |
| partial | 91/GENERAL_COMMAND=23 | GAME_CMD | sendClientScriptEnd | Laboratório (sala tipo 5, Pve 1000-1004, missões 101-125): GENERAL_COMMAND agora leva os ints ao script da missão (OnGeneralCommand → OnMissionEvent; antes ninguém chamava e o quiz nunca começava). Vitória desbloqueia o próximo nível (SetFightLabPermission) e o 1º clear paga FightLabUserDrop (Drop_Condiction tipo 14). |
| partial | 91/GENERAL_COMMAND=23 | GAME_CMD | sendClientScriptStart |  |
| partial | 91/GENERAL_COMMAND=23 | GAME_CMD | sendFightLibAnswer | Laboratório (sala tipo 5, Pve 1000-1004, missões 101-125): GENERAL_COMMAND agora leva os ints ao script da missão (OnGeneralCommand → OnMissionEvent; antes ninguém chamava e o quiz nunca começava). Vitória desbloqueia o próximo nível (SetFightLabPermission) e o 1º clear paga FightLabUserDrop (Drop_Condiction tipo 14). |
| partial | 91 | GAME_CMD | sendFightLibInfoChange |  |
| partial | 91/GENERAL_COMMAND=23 | GAME_CMD | sendFightLibReanswer | Laboratório (sala tipo 5, Pve 1000-1004, missões 101-125): GENERAL_COMMAND agora leva os ints ao script da missão (OnGeneralCommand → OnMissionEvent; antes ninguém chamava e o quiz nunca começava). Vitória desbloqueia o próximo nível (SetFightLabPermission) e o 1º clear paga FightLabUserDrop (Drop_Condiction tipo 14). |
| partial | 91/WANNA_LEADER=97 | GAME_CMD | sendFlagMode |  |
| partial | 91/BLAST=3 | GAME_CMD | sendGameCMDBlast |  |
| partial | 91/CHANGEBALL=19 | GAME_CMD | sendGameCMDChange |  |
| partial | 91/DIRECTION=7 | GAME_CMD | sendGameCMDDirection |  |
| partial | 91/FIRE=2 | GAME_CMD | sendGameCMDShoot | Tiro com base attack real (stats.ts), dano 1192, vitória e retorno à sala. |
| partial | 91/STUNT=15 | GAME_CMD | sendGameCMDStunt |  |
| partial | 91/GAME_MISSION_PREPARE=116 | GAME_CMD | sendGameMissionPrepare |  |
| partial | 91/PICK=49 | GAME_CMD | sendGamePick |  |
| partial | 91/SKIPNEXT=12 | GAME_CMD | sendGameSkipNext |  |
| partial | 91/MOVESTART=9 | GAME_CMD | sendGameStartMove |  |
| partial | 91/MOVESTOP=10 | GAME_CMD | sendGameStopMove |  |
| partial | 91/TAKE_CARD=98 | GAME_CMD | sendGameTakeOut |  |
| partial | 91/GHOST_TARGET=54 | GAME_CMD | sendGhostTarget |  |
| partial | 91/KILLSELF=21 | GAME_CMD | sendKillSelf |  |
| partial | 91/LOAD=16 | GAME_CMD | sendLoadingProgress |  |
| partial | 91 | 91 | sendMissionTryAgain |  |
| partial | 91/PASS_STORY=133 | GAME_CMD | sendPassStory |  |
| partial | 91/PAYMENT_TAKE_CARD=114 | GAME_CMD | sendPaymentTakeCard |  |
| partial | 91/PET_SKILL=144 | GAME_CMD | sendPetSkill |  |
| partial | 91/FIRE_TAG=96 | GAME_CMD | sendShootTag |  |
| partial | 91/SUICIDE=17 | GAME_CMD | sendSuicide |  |
| partial | 91/DELIVER=137 | GAME_CMD | sendTransmissionGate |  |
| partial | 91/MISSION_CMD=25 | GAME_CMD | sendUpdatePlayStep |  |
| partial | 91/USE_DEPUTY_WEAPON=84 | GAME_CMD | useDeputyWeapon |  |
| partial | 102/STAUTS=36 | WORLDBOSS_CMD | sendWorldBossRoomStauts | Luta PvE tipo 14 com o script do dragão portado (ACDragon/AC1243/WorldAcientDragon do DDT-6600 em packages/fight/src/pve/scripts/manual/worldboss.ts): o dragão aparece, fala e ataca (71087 de dano), HP inicial = HP global restante. Desvio: o jogador age antes do dragão (no 6600 o dragão one-shotava antes). Estado 3 não tira mais o jogador da sala do boss (corrigido: reviver dava 'Xu insuficiente'). |

## Eventos/Atividades (35)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| missing | 84/ChickActivationType.CHICKACTIVATION=2 | ACTIVITY_PACKAGE | sendChickActivationGetAward |  |
| missing | 84/ChickActivationType.CHICKACTIVATION=2 | ACTIVITY_PACKAGE | sendChickActivationOpenKey |  |
| missing | 84/ChickActivationType.CHICKACTIVATION=2 | ACTIVITY_PACKAGE | sendChickActivationQuery |  |
| missing | 104 | CARD_LOTTERY | sendCardLotteryIds | Morto no original: ePackageType.CARD_LOTTERY=104 existe mas nenhuma classe [PacketHandler] assina esse código (grep em vendor/DDTank41/Game.Server/Packets/Client) — pacote é descartado pelo servidor original. Status 'missing' aqui é fidelidade, não lacuna. |
| missing | 105 | LUCK_LOTTERY | sendLuckLottery | Morto no original: mesma situação de 104 (ePackageType.LUCK_LOTTERY=105 sem handler registrado). |
| missing | 239 | GOTO_CARD_LOTTERY | gotoCardLottery | Morto no original: ePackageType.GOTO_CARD_LOTTERY=239 sem handler registrado (mesma varredura de 104/105). |
| stub | 128 | LEFT_GUN_ROULETTE_SOCKET | sendStartTurn_LeftGun | Morto no próprio original: LeftGunHandler.cs está registrado (PacketHandler 128) mas todo o corpo está comentado — o recurso 'roleta esquerda' foi desativado pelo time original, não processa nada. Port: sem handler (mesmo efeito observável). |
| stub | 130 | LEFT_GUN_ROULETTE_COMPLETTE | sendEndTurn_LeftGun | Mesma desativação do original que 128 (LeftGunCompleteHandler.cs só envia um aviso se LeftRoutteRate>0, campo nunca setado porque 128 está morto). |
| stub | 145/SEND_ADDRUNKING=10 | GUILDMEMBERWEEK_SYSTEM | sendGuildMemberWeekAddRanking | Morto no próprio original: ActiveSystemHandler.cs (código 145 ACTIVITY_SYSTEM) só trata sub==8 (monta um pacote PLAYERTOP10 e NUNCA chama SendTCP — o cliente nunca recebe resposta); subs 9/10 (GuildMemberWeek) e os de LanternRiddles/LightRoad caem no 'return 0' default sem nenhum efeito. Confirmado lendo o arquivo inteiro (18 linhas). |
| stub | 145/CLOSE=9 | GUILDMEMBERWEEK_SYSTEM | sendGuildMemberWeekStarClose | Ver 145:sendGuildMemberWeekAddRanking — mesmo no-op do original. |
| stub | 145/ENTER_GAME=8 | GUILDMEMBERWEEK_SYSTEM | sendGuildMemberWeekStarEnter | Ver 145:sendGuildMemberWeekAddRanking — mesmo no-op do original. |
| stub | 145 | ACTIVITY_SYSTEM | sendLanternRiddlesQuestion | Ver 145:sendGuildMemberWeekAddRanking — mesmo no-op do original. |
| stub | 145 | ACTIVITY_SYSTEM | sendLanternRiddlesRankInfo | Ver 145:sendGuildMemberWeekAddRanking — mesmo no-op do original. |
| stub | 145/LANTERNRIDDLES_SKILL=41 | ACTIVITY_SYSTEM | sendLanternRiddlesUseSkill | Ver 145:sendGuildMemberWeekAddRanking — mesmo no-op do original. |
| stub | 145/ENTER_GAME=64 | LIGHTROAD_SYSTEM | sendLightRoadStarEnter | Ver 145:sendGuildMemberWeekAddRanking — mesmo no-op do original. |
| partial | 87/TAKEOVERCARD=13 | NEWCHICKENBOX_SYS | sendChickenBoxTakeOverCard | Ver 87:sendNewChickenBox. TAKEOVERCARD: custo escalonado (openCardPrice[canOpenCounts-1]), item entregue, 5 usos. |
| partial | 87/USEEAGLEEYE=11 | NEWCHICKENBOX_SYS | sendChickenBoxUseEagleEye | Ver 87:sendNewChickenBox. USEEAGLEEYE: custo escalonado (eagleEyePrice), revela a carta sem consumir. |
| partial | 87/CLICKSTARTBNT=15 | NEWCHICKENBOX_SYS | sendClickStartBntNewChickenBox | Ver 87:sendNewChickenBox. CLICKSTARTBNT: embaralha as posições do tabuleiro (RandomPosition portado). |
| partial | 87/FLUSHCHICKENVIEW=14 | NEWCHICKENBOX_SYS | sendFlushNewChickenBox | Ver 87:sendNewChickenBox. FLUSHCHICKENVIEW: grátis se passaram 120 min desde o último flush (IsFreeFlushTime), senão cobra flushPrice. |
| partial | 87/CLOSE_GAME=32 | NEWCHICKENBOX_SYS | sendLuckyStarClose | CLOSE_GAME: no-op, igual ao original (ChickenBoxHandler.cs case CLOSE_GAME está vazio). |
| partial | 87/ENTER_GAME=31 | NEWCHICKENBOX_SYS | sendLuckyStarEnter | Lucky Star (mesmo código 87): ENTER_GAME cobra 2500 Xu, sorteia o tabuleiro de 14 (coinTemplateID 201193 forçado na posição 0, PlayerActives.CreateLuckyStartAward). Pool configurável via kind="luckystar". |
| partial | 87/START_TURN=33 | NEWCHICKENBOX_SYS | sendLuckyStarTurn | START_TURN: cooldown de 7s, consome item 201192 (LUCKYSTAR_ID), embaralha o tabuleiro e sorteia por peso (.Random); se cair na moeda, 97% de chance de re-sortear excluindo a moeda (GetAward portado). |
| partial | 87/TURN_COMPLETE=34 | NEWCHICKENBOX_SYS | sendLuckyStarTurnComplete | TURN_COMPLETE: entrega o prêmio sorteado (moeda credita Xu acumulado; outros itens vão pra bolsa, sobra por correio). |
| partial | 87/ENTERCHICKENVIEW=10 | NEWCHICKENBOX_SYS | sendNewChickenBox | NEWCHICKENBOX_SYS implementado (apps/game/src/handlers/activities.ts): tabuleiro de 18 cartas (ChickenBoxHandler.cs portado), pool configurável via app."ScheduledEvents" kind="chickenbox" (admin Events page) com defaults embutidos. Estado em memória (não persistido em New_ChickenBox_Data — desvio documentado em HANDLERS.md). Testado por código, não clicado. |
| partial | 87/AllITEMSHOW=12 | NEWCHICKENBOX_SYS | sendOverShowItems | Ver 87:sendNewChickenBox. ALLITEMSHOW: reenvia a lista atual do tabuleiro. |
| ok (não verificado) | 26 | LOTTERY_OPEN_BOX | sendOpenDead | LOTTERY_OPEN_BOX implementado (apps/game/src/handlers/activities.ts): num=-1 abre o tabuleiro de 18 slots (item 112019/190000, ItemBoxMgr.FindLotteryItemBoxByRand portado em pickLotteryBoard); num=templateId abre um rương direto via createItemBox (reuso de use.ts), chaves 11456×4 para 112047/112100/112101 (Sys_Users_Extra.TotalCaddyOpen incrementado). Testado por código (activities.test.ts), não clicado no cliente real (orçamento de tokens estrito desta sessão). |
| ok (não verificado) | 26 | LOTTERY_OPEN_BOX | sendRouletteBox | Mesmo handler que sendOpenDead (código 26 LOTTERY_OPEN_BOX) — ver nota lá. |
| ok (não verificado) | 27 | LOTTERY_RANDOM_SELECT | sendStartTurn | LOTTERY_RANDOM_SELECT implementado: 1 carta por sorteio do tabuleiro de 18, máx. 8 sorteios, custo de chave escalonado (sorteio N consome N chaves, igual ao original — LotteryRandomSelectHandler.cs). Testado por código, não clicado. |
| ok (não verificado) | 28 | LOTTERY_FINISH | sendFinishRoulette | LOTTERY_FINISH implementado: move CaddyBag + LotteryAwardList pras bolsas reais (sobra por correio), ResetLottery. Testado por código, não clicado. |
| ok (não verificado) | 45 | CADDY_GET_BADLUCK | sendQequestBadLuck | CADDY_GET_BADLUCK implementado: ranking top 20 por Sys_Users_Extra.TotalCaddyOpen (WorldMgr.CaddyRank). Testado por código, não clicado. |
| ok (não verificado) | 53 | GET_TIME_BOX | sendGetTimeBox | Caixa de tempo online: minutos contados no servidor desde o login/última caixa (o original confiava no relatório do cliente), 1x por caixa/dia; caixa de nível 1x por nível. Coberto por events.test.ts. No cliente o contador do hall (00:15:00) aparece; prêmio vem de Shop_Goods_Box. |
| ok (não verificado) | 204 | OPEN_ALL_CARDBOX | sendOpenAll | OPEN_ALL_CARDBOX implementado: cada item da CaddyBag -> CardBag.addCard(Property5, rand 1..2), igual ao original (OpenAllCardBoxHandler.cs). Testado por código, não clicado. |
| ok (não verificado) | 219 | WEEKLY_CLICK_CNT | sendWeeklyClick | Como o original (LastGetEgg). |
| ok (não verificado) | 232 | CADDY_SELL_ALL_GOODS | sendSellAll | Código 232 = CaddyClearAllHandler.cs no original (nome do pacote no cliente não corresponde ao nome da classe). Implementado: resgata cada item da CaddyBag por Ouro/Lễ kim via Item.ReclaimType/ReclaimValue, esvazia a bolsa. Testado por código, não clicado. |
| ok (não verificado) | 245 | CADDY_GET_AWARDS | sendRequestAwards |  |

## Casamento (24)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| missing | 85 | MATE_ONLINE_TIME | sendMateTime |  |
| missing | 167 | CHURCH_MOVIE_OVER | sendChurchMovieOver |  |
| partial | 233 | MARRY_SCENE_CHANGE | sendSceneChange |  |
| partial | 241 | MARRY_ROOM_CREATE | sendCreateRoom |  |
| partial | 249/CONTINUATION=3 | MARRY_CMD | sendChurchContinuation |  |
| partial | 249/FORBID=8 | MARRY_CMD | sendChurchForbid |  |
| partial | 249/INVITE=4 | MARRY_CMD | sendChurchInvite |  |
| partial | 249/KICK=7 | MARRY_CMD | sendChurchKick |  |
| partial | 249/LARGESS=5 | MARRY_CMD | sendChurchLargess |  |
| partial | 249/MOVE=1 | MARRY_CMD | sendChurchMove |  |
| partial | 249/GUNSALUTE=11 | MARRY_CMD | sendGunSalute |  |
| partial | 249/POSITION=10 | MARRY_CMD | sendPosition |  |
| partial | 249/HYMENEAL=2 | MARRY_CMD | sendStartWedding |  |
| partial | 249/USEFIRECRACKERS=6 | MARRY_CMD | sendUseFire |  |
| partial | 253 | MARRY_ROOM_INFO_UPDATE | sendModifyChurchDiscription |  |
| ok (não verificado) | 21 | SCENE_REMOVE_USER | sendExitMarryRoom |  |
| ok (não verificado) | 94/GAME_ROOM_CREATE=0 | GAME_ROOM | sendCreateRoom |  |
| ok (não verificado) | 235 | MARRYINFO_GET | sendForMarryInfo |  |
| ok (não verificado) | 240 | MARRY_SCENE_LOGIN | sendMarryRoomLogin |  |
| ok (não verificado) | 244 | PLAYER_EXIT_MARRY_ROOM | sendExitRoom |  |
| ok (não verificado) | 246 | MARRY_STATUS | sendValidateMarry |  |
| ok (não verificado) | 247 | MARRY_APPLY | sendPropose |  |
| ok (não verificado) | 248 | DIVORCE_APPLY | sendUnmarry |  |
| ok (não verificado) | 250 | MARRY_APPLY_REPLY | sendProposeRespose |  |

## Bolsa/Inventário (22)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| missing | 34 | USER_RANK | sendChangeDesignation |  |
| missing | 62 | ITEM_CONTINUE | sendGoodsContinue |  |
| missing | 66 | PROP_USE | sendUseProp |  |
| missing | 77 | ITEM_OVERDUE | sendItemOverDue |  |
| missing | 168 | GOODS_COUNT | sendUpdateGoodsCount |  |
| missing | 171 | USE_REWORK_NAME | sendUseReworkName |  |
| missing | 182 | USE_COLOR_CARD | sendChangeColor |  |
| missing | 188 | USE_CONSORTIA_REWORK_NAME | sendUseConsortiaReworkName |  |
| missing | 189 | USER_CHANGE_RANK | sendReworkRank |  |
| missing | 205 | USE_CHANGE_COLOR_SHELL | sendUseChangeColorShell |  |
| missing | 218 | USER_GET_GIFTS | sendPlayerGift |  |
| missing | 222 | EQUIP_RECYCLE_ITEM | sendEquipRetrieve |  |
| missing | 265 | NEWTITLE_CARD | sendNewTitleCard |  |
| partial | 49 | CHANGE_PLACE_GOODS | sendMoveGoods | Mover para o ferreiro/equipar. Banco da guilda (bolsa 11): StoreLevel × 10 espaços, depósito/retirada ok (research/e2e/guild/g40-bank-deposit.png). |
| partial | 68/ADD_PET=2 | PET | sendAddPet | Ovo de pet (cat. 35) chocado: CreatePet + 68/2 (janela de pet recebido), pet aparece na aba Thú cưng. |
| partial | 91/PROP=32 | GAME_CMD | sendUseProp | Props 1/2/3 (+1 tiro / x3 / +2) usados na luta e aplicados ao tiro. |
| ok (não verificado) | 60 | ITEM_HIDE | sendHideLayer |  |
| ok (não verificado) | 74 | ITEM_EQUIP | sendItemEquip | FC (Lực chiến) calculado pela fórmula original (apps/game/src/game/stats.ts) e enviado em 67/login/ranking: 2091 no Thur conferido à mão. |
| ok (não verificado) | 122 | CLEAR_STORE_BAG | sendClearStoreBag |  |
| ok (não verificado) | 124 | CHANGE_PLACE_GOODS_ALL | sendMoveGoodsAll |  |
| ok (não verificado) | 206 | CHANGE_COLOR_OVER_DUE | sendChangeColorShellTimeOver |  |
| ok (não verificado) | 216 | CARDS_DATA | sendFirstGetCards |  |

## Salas PvP (21)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| missing | 54 | PROP_BUY | sendBuyProp |  |
| missing | 54 | PROP_BUY | sendBuyProp |  |
| missing | 55 | PROP_SELL | sendSellProp |  |
| missing | 55 | PROP_SELL | sendSellProp |  |
| ok (não verificado) | 16 | SCENE_LOGIN | sendSceneLogin |  |
| ok (não verificado) | 70 | GAME_INVITE | sendInviteGame |  |
| ok (não verificado) | 94/GAME_ROOM_CREATE=0 | GAME_ROOM | createUserGuide |  |
| ok (não verificado) | 94/GAME_ROOM_SETUP_CHANGE=2 | GAME_ROOM | enterUserGuide |  |
| ok (não verificado) | 94/GAME_PICKUP_CANCEL=11 | GAME_ROOM | sendCancelWait |  |
| ok (não verificado) | 94/GAME_PICKUP_STYLE=12 | GAME_ROOM | sendGameMode |  |
| ok (não verificado) | 94/GAME_ROOM_REMOVEPLAYER=5 | GAME_ROOM | sendGamePlayerExit |  |
| ok (não verificado) | 94/GAME_ROOM_KICK=3 | GAME_ROOM | sendGameRoomKick |  |
| ok (não verificado) | 94/GAME_ROOM_UPDATE_PLACE=10 | GAME_ROOM | sendGameRoomPlaceState |  |
| ok (não verificado) | 94/GAME_ROOM_SETUP_CHANGE=2 | GAME_ROOM | sendGameRoomSetUp |  |
| ok (não verificado) | 94/GAME_START=7 | GAME_ROOM | sendGameStart |  |
| ok (não verificado) | 94/GAME_PICKUP_STYLE=12 | GAME_ROOM | sendGameStyle |  |
| ok (não verificado) | 94/GAME_PICKUP_STYLE=12 | GAME_ROOM | sendGameStyle |  |
| ok (não verificado) | 94/GAME_TEAM=6 | GAME_ROOM | sendGameTeam |  |
| ok (não verificado) | 94/GAME_PLAYER_STATE_CHANGE=15 | GAME_ROOM | sendPlayerState |  |
| ok (não verificado) | 94/ROOMLIST_UPDATE=9 | GAME_ROOM | sendUpdateRoomList |  |
| ok (não verificado) | 94/GAME_START=7 | GAME_ROOM | userGuideStart |  |

## Missões (18)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| missing | 15 | USER_ANSWER | syncStep |  |
| missing | 15 | USER_ANSWER | syncWeakStep |  |
| missing | 31 | GOODS_EXCHANGE | sendGoodsExchange |  |
| missing | 32 | COLLECTINFO | sendCollectInfoValidate |  |
| missing | 89 | QUESTION_REPLY | sendQuestionReply |  |
| stub | 145/LANTERNRIDDLES_ANSWER=40 | ACTIVITY_SYSTEM | sendLanternRiddlesAnswer | Ver 145:sendGuildMemberWeekAddRanking — mesmo no-op do original. |
| partial | 131/REQUEST_UPDATE=2 | LABYRINTH | labyrinthRequestUpdate | LABYRINTH implementado como camada administrativa/econômica (apps/game/src/handlers/activities.ts + Sys_Users_Labyrinth): sub 1 DOUBLE_REWARD, 2 REQUEST_UPDATE, 3 CLEAN_OUT, 4 SPEEDED_UP, 5 STOP, 6 RESET, 9 TRY_AGAIN. Desvio documentado: o contador de andar por tempo real (Timer de 1s do original) é liquidado instantaneamente no CLEAN_OUT em vez de um timer por jogador; `myProgress` (andares vencidos em combate real) fica em 0 pra todo mundo até o tipo de sala PvE do labirinto ser portado — ver HANDLERS.md. Testado por código (activities.test.ts), não clicado. |
| partial | 249/MARRYROOMSENDGIFT=12 | MARRY_CMD | requestRefund |  |
| ok (não verificado) | 8 | CLIENT_LOG | sendErrorMsg |  |
| ok (não verificado) | 30 | PICC | sendPicc |  |
| ok (não verificado) | 90 | GET_SIGNAWARD | sendSignAward | Prêmio por N presenças no mês (Daily_Award tipos 1/7 com AwardDays=N): exige N dias marcados e paga uma vez por mês+tier (o C# duplicava itens no loop). Coberto por apps/game/test/events.test.ts; no cliente só dispara ao atingir 3/6/12/18 presenças. |
| ok (não verificado) | 141/APPRENTICE_CONFIRM=7 | AcademyPackageType.ACADEMY_FATHER | sendAcademyApprenticeConfirm |  |
| ok (não verificado) | 141/ACADEMY_FOR_MASTER=5 | AcademyPackageType.ACADEMY_FATHER | sendAcademyMaster |  |
| ok (não verificado) | 161 | USER_LUCKYNUM | sendUserLuckyNum |  |
| ok (não verificado) | 176 | QUEST_ADD | sendQuestAdd |  |
| ok (não verificado) | 177 | QUEST_REMOVE | sendQuestRemove |  |
| ok (não verificado) | 225 | REQUEST_UPDATE | sendRequestUpdate |  |
| ok (não verificado) | 338 | ACCUMULATIVELOGIN_AWARD | sendAccumulativeLoginAward | Login_Award_Item_Template (Type = dia, dia 7 = item escolhido); dias contados 1x/dia no login (máx. 7), prêmio 1x por dia (EventClaims). |

## Pets (17)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| partial | 68/ADD_PET_EQUIP=20 | PET | addPetEquip |  |
| partial | 68/DEL_PET_EQUIP=21 | PET | delPetEquip |  |
| partial | 68/EAT_PETS=33 | PET | eatPetsHandler |  |
| partial | 68/ADOPT_PET=6 | PET | sendAdoptPet |  |
| partial | 68/EQUIP_PET_SKILL=7 | PET | sendEquipPetSkill | EquipSkillPet (slot 4 VIP 7) — servidor, não clicado no cliente. |
| partial | 68/PAY_SKILL=16 | PET | sendPaySkill |  |
| partial | 68/PET_EVOLUTION=23 | PET | sendPetEvolution |  |
| partial | 68/FEED_PET=4 | PET | sendPetFeed | Comida via StoreBag (split 49 corrigido) → FeedPet: nível/fome, mensagem. |
| partial | 68/FIGHT_PET=17 | PET | sendPetFightUnFight | Pet de batalha (FightPet): stats somam no FC, pet segue o personagem no salão. |
| partial | 68/PET_FOLLOW=25 | PET | sendPetFollowOrCall |  |
| partial | 68/PET_FORMINFO=24 | PET | sendPetFormInfo |  |
| partial | 68/RENAME_PET=9 | PET | sendPetRename | RenamePet (ChangeNameCost Xu) — servidor, não clicado no cliente. |
| partial | 68/PET_RISINGSTAR=22 | PET | sendPetRisingStar |  |
| partial | 68/PET_WAKE=32 | PET | sendPetWake |  |
| partial | 68/REFRESH_PET=5 | PET | sendRefreshPet |  |
| partial | 68/RELEASE_PET=8 | PET | sendReleasePet | ReleasePet (IsExit=0, 12656×WashGetCount) — servidor, não clicado no cliente. |
| partial | 68/REVER_PET=18 | PET | sendRevertPet |  |

## Ferreiro (16)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| missing | 61 | ITEM_TRANSFER | sendItemTransfer |  |
| missing | 95 | NECKLACE_STRENGTH | necklaceStrength |  |
| missing | 106 | WISHBEADEQUIP | sendWishBeadEquip |  |
| missing | 120 | ITEM_TREND | sendItemTrend |  |
| missing | 133 | LATENT_ENERGY | sendLatentEnergy |  |
| missing | 138 | ITEM_ADVANCE | sendItemExalt |  |
| missing | 209/FIGHT_SPIRIT_INIT=1 | FIGHT_SPIRIT | fightSpiritRequest |  |
| missing | 217 | OPEN_FIVE_SIX_HOLE | sendItemOpenFiveSixHole |  |
| missing | 295/FORGE_SUIT=1 | STORE_FINE_SUIT | sendForgeSuit |  |
| missing | 391 | EQUIP_GHOST | sendEquipGhost |  |
| partial | 58 | ITEM_COMPOSE | sendItemCompose | Implementado: taxa {80,50,30,10,5}% por qualidade (+1% sem amuleto), PRICE_COMPOSE_GOLD (1600). |
| partial | 59 | ITEM_STRENGTHEN | sendItemStrength | Pedras nv 4/5 em arma: sucesso, +1 por clique, 1 pedra consumida por slot (desvio: C# consumia a pilha inteira), furo 1 abre no +3. |
| ok (não verificado) | 78 | ITEM_FUSION | sendItemFusion | Implementado: prévia 76 + fusão 400 ouro (FusionMgr). |
| ok (não verificado) | 121 | ITEM_INLAY | sendItemEmbed | Implementado (furo precisa estar aberto e tipo igual ao Property2 da gema); sem gema no personagem de teste para verificar no cliente. Varredura pt.3 (2026-10-02): agora chama `p.questInv?.onItemInsert()` em sucesso (`forge.ts` `inlay`), ligando a missão tipo 25 ItemInsertCondition (antes não portada) — testado por código/typecheck, não clicado (sem gema compatível com furo aberto no personagem de teste nesta sessão; furo tipo 0 na arma do Thur, única gema na bolsa era tipo 3). |
| ok (não verificado) | 125 | ITEM_EMBED_BACKOUT | sendItemEmbedBackout | Implementado: 500 Xu, gema volta vinculada, devolve itens do ferreiro. |
| ok (não verificado) | 172 | SAVE_DB | sendSaveDB |  |

## Sociedade/Guilda (16)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| stub | 129/POLL_CANDIDATE=25 | CONSORTIA_CMD | sendConsortionPoll | Sem handler no servidor original. |
| stub | 129/DONATE=23 | CONSORTIA_CMD | sendDonate | Sem implementação no original (só loga o tipo de item). |
| partial | 129/SKILL_SOCKET=26 | CONSORTIA_CMD | sendConsortionSkill | Compra de habilidade (fundos/contribuição/medalhas), buff 101-112 salvo e 129/26; efeitos dos buffs no combate ainda não aplicados. Correção: buff tipo 1 era dado sem a guilda pagar. |
| ok (não verificado) | 129/BUY_BADGE=28 | CONSORTIA_CMD | sendBuyBadge | Implementado (Consortia_Badge, custo dos fundos, direito 16); o cliente 4.1 não tem loja de emblemas acessível. |
| ok (não verificado) | 129/CONSORTIA_APPLY_STATE=7 | CONSORTIA_CMD | sendConsoritaApplyStatusOut |  |
| ok (não verificado) | 129/CONSORTIA_TRYIN=0 | CONSORTIA_CMD | sendConsortiaCancelTryIn |  |
| ok (não verificado) | 129/CONSORTIA_CHAIRMAN_CHAHGE=19 | CONSORTIA_CMD | sendConsortiaChangeChairman | Implementado (SP_ConsortiaChangeChairman, alvo nível ≥ 5). O cliente só envia se o alvo tiver nível ≥ 12 — não verificado (Bob nível 10). |
| ok (não verificado) | 129/CONSORTIA_DISBAND=2 | CONSORTIA_CMD | sendConsortiaDismiss | Implementado (líder, nível < 4; membros limpos, 128.2). O botão não está ligado no SelfConsortiaView desta versão do cliente; coberto pelo teste apps/game/test/consortia.test.ts. Correção: a resposta de falha não tinha o bool. |
| ok (não verificado) | 129/CONSORTIA_DUTY_DELETE=9 | CONSORTIA_CMD | sendConsortiaDutyDelete |  |
| ok (não verificado) | 129/CONSORTIA_INVITE_DELETE=13 | CONSORTIA_CMD | sendConsortiaInvateDelete |  |
| ok (não verificado) | 129/CONSORTIA_TRYIN_DEL=5 | CONSORTIA_CMD | sendConsortiaTryinDelete |  |
| ok (não verificado) | 129/CONSORTIA_DUTY_UPDATE=10 | CONSORTIA_CMD | sendConsortiaUpdateDuty |  |
| ok (não verificado) | 129/CONSORTIA_PLACARD_UPDATE=15 | CONSORTIA_CMD | sendConsortiaUpdatePlacard |  |
| ok (não verificado) | 129/CONSORTIA_DUTY_UPDATE=10 | CONSORTIA_CMD | sendConsortiaUpgradeDuty |  |
| ok (não verificado) | 129 | CONSORTIA_CMD | sendConsortiaUserRemarkUpdate |  |
| ok (não verificado) | 129/CONSORTIA_BANCHAT_UPDATE=16 | CONSORTIA_CMD | sendForbidSpeak |  |

## Outros (15)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| missing | 110 | ITEM_REFINERY | sendItemLianhua |  |
| missing | 135 | 135 | arrange |  |
| missing | 145/BECHOOSE_POINT=66 | LIGHTROAD_SYSTEM | lightRoadPointWork |  |
| missing | 203 | LOOKUP_EFFORT | sendLookupEffort |  |
| missing | 209/FIGHT_SPIRIT_LEVELUP=3 | FIGHT_SPIRIT | figSpiritUpGrade |  |
| missing | 224 | CID_CHECK | sendCIDCheck |  |
| missing | 308 | EQUIP_BRING_UP | sendBringUpEat |  |
| missing | 313 | ITEM_CELL_IS_LOCKED | sendBringUpLockStatusUpdate |  |
| partial | 249/MARRYROOMSENDGIFT=12 | MARRY_CMD | refund |  |
| partial | 258 | NOVICEACTIVITY | sendNoviceActivityGetAward | NOVICEACTIVITY implementado simplificado: usa as mesmas tabelas Event_Reward_Info/Goods do 259 (firstRecharge), elegibilidade = Grade do jogador >= Condition (o contador de progresso por PlayerExtra — nível/fortalecimento/recarga/VIP/FC — não foi portado; ver HANDLERS.md). Claim idempotente por (ActivityType, Condition) via app."EventClaims". Testado por código, não clicado. |
| ok (não verificado) | 103 | DAILYRECORD | sendDailyRecord | Devolve e apaga as linhas de DailyRecordInfo (como o original). |
| ok (não verificado) | 213 | USE_LOG | sendUseLog |  |
| ok (não verificado) | 225 | ENTHRALL_SWITCH | sendForSwitch |  |
| ok (não verificado) | 236 | MARRYINFO_ADD | sendRegisterInfo |  |
| ok (não verificado) | 237 | MARRYINFO_UPDATE | sendModifyInfo |  |

## Fazenda (14)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| partial | 68/BUY_PET_EXP_ITEM=19 | PET | sendBuyPetExpItem |  |
| partial | 81/ACCELERATE_FIELD=3 | FARM | doMature |  |
| partial | 81/ENTER_FARM=1 | FARM | enterFarm |  |
| partial | 81/EXIT_FARM=16 | FARM | exitFarm |  |
| partial | 81/FRAM_GROP_FASTFORWARD=18 | FARM | fastForwardGrop |  |
| partial | 81/FARM_GIFTPACKS=20 | FARM | giftPacks |  |
| partial | 81/GROW_FIELD=2 | FARM | seeding |  |
| partial | 81/HELPER_SWITCH_FIELD=9 | FARM | sendBeginHelper |  |
| partial | 81/COMPOSE_FOOD=5 | FARM | sendCompose |  |
| partial | 81/HELPER_SWITCH_FIELD=9 | FARM | toFarmHelper |  |
| partial | 81/GAIN_FIELD=4 | FARM | toGather |  |
| partial | 81/HELPER_PAY_FIELD=8 | FARM | toHelperRenewMoney |  |
| partial | 81/KILLCROP_FIELD=7 | FARM | toKillCrop |  |
| partial | 81/PAY_FIELD=6 | FARM | toSpread |  |

## Amigos (12)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| missing | 40 | SNS_MSG_RECEIVE | sendSnsMsg |  |
| missing | 107/INVITE_FRIEND_OPENVIEW=2 | INVITE_FRIEND | enterInviteFriendView |  |
| missing | 107/INVITE_FRIEND_FBCLICK=6 | INVITE_FRIEND | inviteFriendFBBntClick |  |
| missing | 107 | INVITE_FRIEND | inviteFriendOkClick |  |
| missing | 107/INVITE_FRIEND_GETREWARD=4 | INVITE_FRIEND | inviteFriendRewardBntClick |  |
| missing | 223 | FRIEND_BRITHDAY | sendWithBrithday |  |
| ok (não verificado) | 94/GAME_ROOM_LOGIN=1 | GAME_ROOM | sendGameLogin |  |
| ok (não verificado) | 160/FRIEND_ADD=160 | IM_CMD | sendAddFriend | Varredura do básico pt.2: painel Bạn bè(F) abriu, diálogo 'Thêm bạn' aceitou o nickname 'Bob' com autocomplete e fechou sem erro. Não deu pra confirmar um ADD novo no banco porque Bob já era amigo do Thur antes desta sessão (Sys_Users_Friends AddDate antigo, não mudou) — fluxo de UI ok, mas não isola o caso de amigo novo. |
| ok (não verificado) | 160/ADD_CUSTOM_FRIENDS=208 | IM_CMD | sendCustomFriends |  |
| ok (não verificado) | 160/FRIEND_REMOVE=161 | IM_CMD | sendDelFriend |  |
| ok (não verificado) | 160/ONE_ON_ONE_TALK=51 | IM_CMD | sendOneOnOneTalk |  |
| ok (não verificado) | 160/ONS_EQUIP=45 | IM_CMD | sendOns |  |

## Lobby/Chat/Bugle (10)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| missing | 119 | LINKREQUEST_GOODS | sendGetLinkGoodsInfo |  |
| ok (não verificado) | 19 | SCENE_CHAT | sendMessage |  |
| ok (não verificado) | 20 | SCENE_FACE | sendFace |  |
| ok (não verificado) | 21 | SCENE_REMOVE_USER | sendExitScene |  |
| ok (não verificado) | 37 | CHAT_PERSONAL | sendPrivateMessage |  |
| ok (não verificado) | 69 | SCENE_USERS_LIST | sendGetScenePlayer |  |
| ok (não verificado) | 71 | S_BUGLE | sendSBugle |  |
| ok (não verificado) | 72 | B_BUGLE | sendBBugle |  |
| ok (não verificado) | 73 | C_BUGLE | sendCBugle |  |
| ok (não verificado) | 181 | QUEST_CHECK | sendQuestCheck |  |

## PvE/Masmorras (9)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| missing | 50 | FIGHT_NPC | sendBeginFightNpc |  |
| missing | 82 | CrazyTankPackageType.GAME_MISSION_START | sendGameMissionStart |  |
| partial | 131/CLEAN_OUT=3 | LABYRINTH | labyrinthCleanOut |  |
| partial | 131/CLEAN_OUT_COMPLETE=8 | LABYRINTH | labyrinthCleanOutTimerComplete |  |
| partial | 131/DOUBLE_REWARD=1 | LABYRINTH | labyrinthDouble |  |
| partial | 131/RESET_LABYRINTH=6 | LABYRINTH | labyrinthReset |  |
| partial | 131/SPEEDED_UP_CLEAN_OUT=4 | LABYRINTH | labyrinthSpeededUpCleanOut |  |
| partial | 131/STOP_CLEAN_OUT=5 | LABYRINTH | labyrinthStopCleanOut |  |
| partial | 131/TRY_AGAIN=9 | LABYRINTH | labyrinthTryAgain |  |

## Spa/Fonte termal (9)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| stub | 175 | HOTSPRING_ROOM_CREATE | sendHotSpringRoomCreate |  |
| ok (não verificado) | 12/CONTINU_BY_MONEY=11 | HOTSPRING_CMD_B | sendHotAddTime | SpaAddictionMoneyNeeded (1299) Xu → +SpaPriRoomContinueTime (30) min, 191/12. |
| ok (não verificado) | 190 | HOTSPRING_ROOM_QUICK_ENTER | sendHotSpringRoomQuickEnter |  |
| ok (não verificado) | 191 | HOTSPRING_CMD | sendHotSpringRoomAdminRemovePlayer |  |
| ok (não verificado) | 191/HOTSPRING_ROOM_EDIT=6 | HOTSPRING_CMD | sendHotSpringRoomEdit |  |
| ok (não verificado) | 191/HOTSPRING_ROOM_INVITE=4 | HOTSPRING_CMD | sendHotSpringRoomInvite | Sem receptor no cliente 4.1: o convidado recebe aviso com o número da sala. |
| ok (não verificado) | 191 | HOTSPRING_CMD | sendHotSpringRoomPlayerContinue |  |
| ok (não verificado) | 191/HOTSPRING_ROOM_RENEWAL_FEE=3 | HOTSPRING_CMD | sendHotSpringRoomRenewalFee |  |
| ok (não verificado) | 212 | HOTSPRING_ROOM_ENTER_CONFIRM | sendHotSpringRoomEnterConfirm |  |

## Boss mundial/Minigames (7)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| missing | 166 | LITTLEGAME_COMMAND | createPackageOut |  |
| partial | 102/ENTER_WORLDBOSSROOM=32 | WORLDBOSS_CMD | enterWorldBossRoom | Boss mundial agendado (12:00/20:00 UTC, admin "Iniciar agora"): 102/0 OPEN com horários reais, ícone Thần thú no hall, sala com HP e ranking; fim = prêmio por posição (params.rankAwards, 1x por janela) + 102/1 OVER. |
| partial | 102/REQUEST_REVIVE=37 | WORLDBOSS_CMD | requestRevive | Reviver 1000 / relutar 1200 Xu; não exige mais estar na lista (estado 3 removia). |
| partial | 102/ADDPLAYERS=34 | WORLDBOSS_CMD | sendAddPlayer | Entra na sala do boss (102/3 para todos + ranking). |
| partial | 102/BUFF_BUY=38 | WORLDBOSS_CMD | sendBuyWorldBossBuff | 30 Xu cobrados uma vez (o original cobrava duas). |
| partial | 102/LEAVE_ROOM=33 | WORLDBOSS_CMD | sendLeaveBossRoom | Sai da sala (102/4). |
| partial | 102/MOVE=35 | WORLDBOSS_CMD | sendWorldBossRoomMove | Movimento repassado a todos na sala (102/6). |

## Correio (7)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| missing | 214 | USER_RELOAD_GIFT | sendReloadGift |  |
| ok (não verificado) | 112 | DELETE_MAIL | sendDeleteMail |  |
| ok (não verificado) | 113 | GET_MAIL_ATTACHMENT | sendGetMail |  |
| ok (não verificado) | 114 | UPDATE_MAIL | sendUpdateMail |  |
| ok (não verificado) | 116 | SEND_MAIL | sendEmail |  |
| ok (não verificado) | 118 | MAIL_CANCEL | untreadEmail |  |
| ok (não verificado) | 129/CONSORTION_MAIL=29 | CONSORTIA_CMD | sendConsortionMail |  |

## Cartas (6)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| missing | 11 | ACTIVE_PULLDOWN | sendActivePullDown |  |
| missing | 18 | GET_PLAYER_CARD | getPlayerCardInfo |  |
| missing | 196 | CARD_RESET | sendCardReset |  |
| missing | 196 | CARD_RESET | sendReplaceCardProp |  |
| ok (não verificado) | 216 | CARDS_DATA | sendOpenViceCard |  |
| ok (não verificado) | 216 | CARDS_DATA | sendSortCards |  |

## Conta/Login (6)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| missing | 25 | BAG_LOCKED | sendBagLocked |  |
| missing | 200 | CHECK_CODE | sendCheckCode |  |
| ok (não verificado) | 1/Version.Build=5498628 | LOGIN | sendLogin |  |
| ok (não verificado) | 4 | PING | sendPint |  |
| ok (não verificado) | 242 | MARRY_ROOM_LOGIN | sendEnterRoom |  |
| ok (não verificado) | 300 | 300 | sendpkgCheckHack |  |

## Loja (6)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| missing | 46 | BUY_GIFTBAG | sendBuyGiftBag |  |
| missing | 48 | SEll_GOODS | sendSellGoods |  |
| missing | 57 | GOODS_PRESENT | sendPresentGoods |  |
| missing | 126 | BUY_QUICK_GOLDBOX | sendQuickBuyGoldBox |  |
| partial | 251 | SCENE_STATE | sendCurrentState |  |
| ok (não verificado) | 160/FRIEND_STATE=165 | IM_CMD | sendFriendState |  |

## Escola/Aprendiz (4)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| ok (não verificado) | 141/FIRE_APPRENTICE=13 | AcademyPackageType.ACADEMY_FATHER | sendAcademyFireApprentice | 20000 ouro (checado antes; o C# cobrava mesmo se falhasse), congela AcademyMasterFreezeHours. |
| ok (não verificado) | 141/FIRE_MASTER=12 | AcademyPackageType.ACADEMY_FATHER | sendAcademyFireMaster | 10000 ouro, congela AcademyApprenticeFreezeHours. |
| ok (não verificado) | 141/ACADEMY_REGISTER=1 | AcademyPackageType.ACADEMY_FATHER | sendAcademyRegister | No-op como no original: a lista (ApprenticeshipClubList.ashx, agora portada) mostra todos os elegíveis. |
| ok (não verificado) | 141/ACADEMY_REMOVE=3 | AcademyPackageType.ACADEMY_FATHER | sendAcademyRemoveRegister |  |

## GvG/Liga (4)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| partial | 162/ELITE_MATCH_RANK_START=2 | ELITEGAME | sendEliteGameStart | Só com status 5 e nível ≥ 30 (EliteGameHandler); a partida de elite em si (salas 12/13, pontuação) não foi portada. |
| partial | 162/ELITE_MATCH_TYPE=1 | ELITEGAME | sendGetEliteGameState | Estado do campeonato vem do agendador (app."ScheduledEvents" kind elite, status 5 quando aberto) e é empurrado (162/1) a todos ao abrir/fechar. |
| partial | 162/ELITE_MATCH_RANK_DETAIL=4 | ELITEGAME | sendGetPaarungDetail | Lista de campeões vazia (sem chaveamento de elite). |
| partial | 162/ELITE_MATCH_PLAYER_RANK=3 | ELITEGAME | sendGetSelfRankSroce | eliteRank/eliteScore de Sys_User_Match_Info. |

## Leilão (3)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| partial | 192 | AUCTION_ADD | auctionGood |  |
| partial | 193 | AUCTION_UPDATE | auctionBid |  |
| ok (não verificado) | 194 | AUCTION_DELETE | auctionCancelSell |  |

## Personagem/FC (3)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| missing | 402/ACTIVE=3 | AVATAR_COLLECTION | sendAvatarCollectionActive |  |
| missing | 402/DELAY_TIME=4 | AVATAR_COLLECTION | sendAvatarCollectionDelayTime |  |
| ok (não verificado) | 279 | 279 | showHideTitleState |  |

## Configurações (2)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| missing | 224 | CID_CHECK | sendCIDInfo |  |
| ok (não verificado) | 64 | OPTION_UPDATE | sendOpition |  |

## Totem/Honra (2)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| missing | 96 | HONOR_UP_COUNT | sendHonorUp |  |
| missing | 136 | TOTEM | sendOpenOneTotem |  |

