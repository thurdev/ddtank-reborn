# Pendências para revisitar (gerado — não editar à mão)

Tudo que NÃO está 100% (servidor ok + verificado no cliente). Inclui itens "mortos no original" (sem handler nem no C#): decidir depois se implementamos do zero ou removemos o botão do cliente.

Totais: 318 linhas — missing 48, stub 39, partial 66, ok-mas-não-verificado-no-cliente 165.

## Combate (GAME_CMD) (36)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| stub | 91/BEAT=22 | GAME_CMD | sendBeat | BEAT (sub 22): morto no próprio original, mesma varredura de sendGameCMDBlast (nenhum GameCommand(22,...)). |
| stub | 91/WANNA_LEADER=97 | GAME_CMD | sendFlagMode | WANNA_LEADER (sub 97, WannaLeadCommand.cs): registrado no original mas com HandleCommand vazio — no-op confirmado lendo o arquivo, não código morto por falta de registro (diferente de BLAST/CHANGEBALL/BEAT/KILLSELF). Mesmo efeito observável: port apenas consome o pacote. |
| stub | 91/BLAST=3 | GAME_CMD | sendGameCMDBlast | BLAST (sub 3): morto no próprio original — nenhuma classe Game.Logic.Cmd.* carrega GameCommand(3,...) (CommandMgr.cs varre por reflexão; confirmado via grep em vendor/DDTank41/Game.Logic/Cmd/*.cs). Pacote aceito e descartado, sem crash (test/fight.test.ts). |
| stub | 91/CHANGEBALL=19 | GAME_CMD | sendGameCMDChange | CHANGEBALL (sub 19): morto no próprio original, mesma varredura de sendGameCMDBlast (nenhum GameCommand(19,...)). |
| stub | 91/MOVESTOP=10 | GAME_CMD | sendGameStopMove | MOVESTOP (sub 10, MoveStopCommand.cs): mesmo caso de sendFlagMode — registrado, HandleCommand vazio, no-op confirmado no original. |
| stub | 91/KILLSELF=21 | GAME_CMD | sendKillSelf | KILLSELF (sub 21): morto no próprio original, mesma varredura de sendGameCMDBlast (nenhum GameCommand(21,...)). |
| partial | 102/STAUTS=36 | WORLDBOSS_CMD | sendWorldBossRoomStauts | Luta PvE tipo 14 com o script do dragão portado (ACDragon/AC1243/WorldAcientDragon do DDT-6600 em packages/fight/src/pve/scripts/manual/worldboss.ts): o dragão aparece, fala e ataca (71087 de dano), HP inicial = HP global restante. Desvio: o jogador age antes do dragão (no 6600 o dragão one-shotava antes). Estado 3 não tira mais o jogador da sala do boss (corrigido: reviver dava 'Xu insuficiente'). |
| ok (não verificado) | 75 | CrazyTankPackageType.PROP_DELETE | sendThrowProp | PROP_DELETE implementado (PropDeleteHandler.cs): descarta o item da FightBag (mão de props em luta). Testado por código, não clicado. |
| ok (não verificado) | 91/GENERAL_COMMAND=23 | GAME_CMD | deleteMonster | Laboratório (sala tipo 5, Pve 1000-1004, missões 101-125): GENERAL_COMMAND agora leva os ints ao script da missão (OnGeneralCommand → OnMissionEvent; antes ninguém chamava e o quiz nunca começava). Vitória desbloqueia o próximo nível (SetFightLabPermission) e o 1º clear paga FightLabUserDrop (Drop_Condiction tipo 14). |
| ok (não verificado) | 91/AIRPLANE=40 | GAME_CMD | sendAirPlane |  |
| ok (não verificado) | 91/BOSS_TAKE_CARD=130 | GAME_CMD | sendBossTakeOut |  |
| ok (não verificado) | 91/GENERAL_COMMAND=23 | GAME_CMD | sendClientScriptStart |  |
| ok (não verificado) | 91/GENERAL_COMMAND=23 | GAME_CMD | sendFightLibAnswer | Laboratório (sala tipo 5, Pve 1000-1004, missões 101-125): GENERAL_COMMAND agora leva os ints ao script da missão (OnGeneralCommand → OnMissionEvent; antes ninguém chamava e o quiz nunca começava). Vitória desbloqueia o próximo nível (SetFightLabPermission) e o 1º clear paga FightLabUserDrop (Drop_Condiction tipo 14). |
| ok (não verificado) | 91 | GAME_CMD | sendFightLibInfoChange |  |
| ok (não verificado) | 91/GENERAL_COMMAND=23 | GAME_CMD | sendFightLibReanswer | Laboratório (sala tipo 5, Pve 1000-1004, missões 101-125): GENERAL_COMMAND agora leva os ints ao script da missão (OnGeneralCommand → OnMissionEvent; antes ninguém chamava e o quiz nunca começava). Vitória desbloqueia o próximo nível (SetFightLabPermission) e o 1º clear paga FightLabUserDrop (Drop_Condiction tipo 14). |
| ok (não verificado) | 91/DIRECTION=7 | GAME_CMD | sendGameCMDDirection |  |
| ok (não verificado) | 91/STUNT=15 | GAME_CMD | sendGameCMDStunt |  |
| ok (não verificado) | 91/GAME_MISSION_PREPARE=116 | GAME_CMD | sendGameMissionPrepare |  |
| ok (não verificado) | 91/PICK=49 | GAME_CMD | sendGamePick |  |
| ok (não verificado) | 91/SKIPNEXT=12 | GAME_CMD | sendGameSkipNext |  |
| ok (não verificado) | 91/MOVESTART=9 | GAME_CMD | sendGameStartMove |  |
| ok (não verificado) | 91/TAKE_CARD=98 | GAME_CMD | sendGameTakeOut |  |
| ok (não verificado) | 91/GHOST_TARGET=54 | GAME_CMD | sendGhostTarget |  |
| ok (não verificado) | 91/LOAD=16 | GAME_CMD | sendLoadingProgress |  |
| ok (não verificado) | 91 | 91 | sendMissionTryAgain | TryAgainCommand.cs (sub 119 GAME_MISSION_TRY_AGAIN) no C# live deste donor server toma SEMPRE o ramo de desistir: WantTryAgain=0, Stop(), SendMissionTryAgain() — a lógica de retry pago (cobrar TryAgainCost em Xu e voltar pra mesma sessão) está presente só como bloco comentado, com uma mensagem fixa de 'recurso em desenvolvimento' no meio do código morto. Ou seja: 'tentar de novo' sempre fecha a sessão no original de verdade, não é uma lacuna do port. apps/game/src/fight/ddt.ts (case TRY_AGAIN) replica esse comportamento 1:1 (WantTryAgain forçado a 0, sempre fecha). Verificado lendo TryAgainCommand.cs:9-96 inteiro (o ramo ativo termina na linha 23; o resto é comentário). |
| ok (não verificado) | 91/PASS_STORY=133 | GAME_CMD | sendPassStory |  |
| ok (não verificado) | 91/PAYMENT_TAKE_CARD=114 | GAME_CMD | sendPaymentTakeCard | PAYMENT_TAKE_CARD (sub 114) implementado (PaymentTakeCardCommand.cs): paga 486 Xu (437 VIP) por um flip de carta extra (CanTakeOut++) e chama TakeCard. Desvio: o fast-path do buff Card_Get (BuffType 73, uso gratuito) não foi portado — sempre cobra Xu. Testado: apps/game/test/fight.test.ts "GAME_CMD 114 PAYMENT_TAKE_CARD charges Money and grants one extra pick" (saldo de Xu debitado e resposta 91/98 isAuto=false confirmados). |
| ok (não verificado) | 91/PET_SKILL=144 | GAME_CMD | sendPetSkill |  |
| ok (não verificado) | 91/FIRE_TAG=96 | GAME_CMD | sendShootTag |  |
| ok (não verificado) | 91/SUICIDE=17 | GAME_CMD | sendSuicide |  |
| ok (não verificado) | 91/DELIVER=137 | GAME_CMD | sendTransmissionGate | DELIVER (sub 137, TransmissionGateCommand.cs) agora portado: stepping no portão marca Player.Ready=true (só liga, nunca desliga, sem eco — diferente do checkbox 116 MISSION_PREPARE) e chama game.CheckState(0), desbloqueando o encadeamento de andares multi-sessão de masmorra (apps/game/src/fight/ddt.ts parsePveCommand sub 137 -> packages/fight/src/pve/game.ts case DELIVER). Testado em packages/fight/test/pve.test.ts ('dungeon floor chaining also works via GAME_CMD 137 DELIVER'), não clicado no cliente real. |
| ok (não verificado) | 91/MISSION_CMD=25 | GAME_CMD | sendUpdatePlayStep |  |
| ok (não verificado) | 91/USE_DEPUTY_WEAPON=84 | GAME_CMD | useDeputyWeapon |  |
| ok (não verificado) | 108 | GAME_TAKE_TEMP | sendGetTropToBag | GAME_TAKE_TEMP implementado (GameTakeTempItemsHandler.cs): pega 1 (int place) ou todos (-1) os itens da TempBag pra bolsa real; sobra por correio. Achado: o branch `item.Template.BagType == eBageType.Card` do original é código morto (ItemTemplateInfo.BagType nunca retorna Card pra nenhum CategoryID — ItemTemplateInfo.cs:11-31) — omitido, toda carta/item passa pelo caminho normal. Testado em apps/game/test/handlers.test.ts (existente) + typecheck/test suite completa, não clicado. |
| ok (não verificado) | 108 | GAME_TAKE_TEMP | sendGetTropToBag | GAME_TAKE_TEMP implementado (GameTakeTempItemsHandler.cs): pega 1 (int place) ou todos (-1) os itens da TempBag pra bolsa real; sobra por correio. Achado: o branch `item.Template.BagType == eBageType.Card` do original é código morto (ItemTemplateInfo.BagType nunca retorna Card pra nenhum CategoryID — ItemTemplateInfo.cs:11-31) — omitido, toda carta/item passa pelo caminho normal. Testado em apps/game/test/handlers.test.ts (existente) + typecheck/test suite completa, não clicado. |
| ok (não verificado) | 123 | DEFY_AFFICHE | sendDefyAffiche | DEFY_AFFICHE implementado (DefyAfficheHandler.cs): cartaz de 500 Xu, repassado a todos os jogadores online (original repassava via Center/login server; processo único aqui = broadcast local equivalente). Testado por código, não clicado. |

## Eventos/Atividades (35)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| missing | 84/ChickActivationType.CHICKACTIVATION=2 | ACTIVITY_PACKAGE | sendChickActivationGetAward | Ver 84:sendChickActivationQuery — mesmo handler (ActivityPackageHandler.cs:198+), prêmio por faixa de Grade dentro de 60 dias do resgate (chickInfo.KeyOpenedTime.AddDays(60)). |
| missing | 84/ChickActivationType.CHICKACTIVATION=2 | ACTIVITY_PACKAGE | sendChickActivationOpenKey | Ver 84:sendChickActivationQuery — mesmo handler (ActivityPackageHandler.cs:171-197), código de 14 caracteres resgatado uma vez (IsKeyOpened). |
| missing | 84/ChickActivationType.CHICKACTIVATION=2 | ACTIVITY_PACKAGE | sendChickActivationQuery | Real no original (não é lacuna de fidelidade, é feature grande não portada ainda por orçamento): ActivityPackageHandler.cs (668 linhas, sub ACTIVITY_PACKAGE=84) trata ChickActivationType.CHICKACTIVATION (linhas 135-250ish) como um sistema de 'código de ativação' de 14 caracteres (QUERY consulta UserChickActiveInfo/IsKeyOpened; OPENKEY resgata o código; GETAWARD paga um prêmio por faixa de nível — m_gradeList {10,20,30,40,45,50,55,60,65} — dentro de 60 dias do resgate). A tabela Activity_System_Item já foi migrada para Postgres, mas falta o UserChickActiveInfo/handler em apps/game e a UI admin pra cadastrar códigos. Ver BACKLOG.md 'Não portado nesta batch'. |
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

## Casamento (22)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| missing | 167 | CHURCH_MOVIE_OVER | sendChurchMovieOver | Morto no original dos dois lados: GameSocketOut.as define sendChurchMovieOver() (PackageOut(CHURCH_MOVIE_OVER=167)) mas nenhum arquivo do cliente chama essa função (grep em vendor/DDTank41/Source Flash/src), e nenhum [PacketHandler(167,...)] existe em Game.Server. Status 'missing' aqui é fidelidade, não lacuna. |
| partial | 233 | MARRY_SCENE_CHANGE | sendSceneChange |  |
| partial | 241 | MARRY_ROOM_CREATE | sendCreateRoom | Fluxo completo testado de ponta a ponta com o layout real de pacotes (apps/game/test/marriage-farm-auction.test.ts '247/250 MARRY_APPLY...'): 247 propõe (anel consumido) -> 250 aceita (ambos IsMarried) -> 241 cria a capela (cobra PRICE_MARRY_ROOM, IsCreatedMarryRoom=true, SelfMarryRoomID setado) -> 242 noivo recebe o ack (roomInfoPacket + bool true) -> 242 noiva entra na mesma sala -> 249/2 HYMENEAL inicia o casamento, ambos os clientes recebem started=true. Não clicado no Ruffle real (orçamento de screenshots), mas verificado byte a byte contra o formato confirmado em ChurchManager.as. |
| partial | 249/CONTINUATION=3 | MARRY_CMD | sendChurchContinuation |  |
| partial | 249/FORBID=8 | MARRY_CMD | sendChurchForbid |  |
| partial | 249/INVITE=4 | MARRY_CMD | sendChurchInvite |  |
| partial | 249/KICK=7 | MARRY_CMD | sendChurchKick |  |
| partial | 249/LARGESS=5 | MARRY_CMD | sendChurchLargess |  |
| partial | 249/MOVE=1 | MARRY_CMD | sendChurchMove |  |
| partial | 249/GUNSALUTE=11 | MARRY_CMD | sendGunSalute |  |
| partial | 249/POSITION=10 | MARRY_CMD | sendPosition |  |
| partial | 249/HYMENEAL=2 | MARRY_CMD | sendStartWedding | Ver 241:sendCreateRoom — mesmo teste cobre 249/HYMENEAL=2: primeira vez (IsGotRing=false em ambos) manda os anéis por correio e grava IsMarried/IsGotRing sem cobrar Xu; broadcast 249/2 roomId+started=true chega pros dois clientes. Não clicado no Ruffle real, verificado por teste de protocolo com os codes/subs reais. |
| partial | 249/USEFIRECRACKERS=6 | MARRY_CMD | sendUseFire |  |
| partial | 253 | MARRY_ROOM_INFO_UPDATE | sendModifyChurchDiscription |  |
| ok (não verificado) | 21 | SCENE_REMOVE_USER | sendExitMarryRoom |  |
| ok (não verificado) | 85 | MATE_ONLINE_TIME | sendMateTime | MATE_ONLINE_TIME implementado (MateTimeHandler.cs, apps/game/src/handlers/marriage.ts): int userId -> responde com o LastDate daquele jogador (online: valor em memória; offline: linha de Sys_Users_Detail; desconhecido: agora). Usado pela capela pra mostrar 'visto por último' do cônjuge offline. Testado em apps/game/test/marriage-farm-auction.test.ts (online, offline via DB, userId inexistente), não clicado no cliente real. |
| ok (não verificado) | 94/GAME_ROOM_CREATE=0 | GAME_ROOM | sendCreateRoom |  |
| ok (não verificado) | 235 | MARRYINFO_GET | sendForMarryInfo |  |
| ok (não verificado) | 240 | MARRY_SCENE_LOGIN | sendMarryRoomLogin |  |
| ok (não verificado) | 244 | PLAYER_EXIT_MARRY_ROOM | sendExitRoom |  |
| ok (não verificado) | 246 | MARRY_STATUS | sendValidateMarry |  |
| ok (não verificado) | 248 | DIVORCE_APPLY | sendUnmarry |  |

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

## Bolsa/Inventário (20)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| stub | 66 | PROP_USE | sendUseProp | PROP_USE (código 66, fora de luta): morto no próprio original — nenhum [PacketHandler(66,...)] registrado (não confundir com 91/PROP=32, usado em luta, esse sim implementado). |
| stub | 77 | ITEM_OVERDUE | sendItemOverDue | ITEM_OVERDUE: mesma varredura de 66:sendUseProp — nenhum [PacketHandler(77,...)] registrado. |
| stub | 171 | USE_REWORK_NAME | sendUseReworkName | USE_REWORK_NAME: mesma varredura de 66:sendUseProp — nenhum [PacketHandler(171,...)] registrado. |
| stub | 188 | USE_CONSORTIA_REWORK_NAME | sendUseConsortiaReworkName | USE_CONSORTIA_REWORK_NAME: mesma varredura de 66:sendUseProp — nenhum [PacketHandler(188,...)] registrado. |
| stub | 205 | USE_CHANGE_COLOR_SHELL | sendUseChangeColorShell | USE_CHANGE_COLOR_SHELL: mesma varredura de 66:sendUseProp — nenhum [PacketHandler(205,...)] registrado. |
| stub | 222 | EQUIP_RECYCLE_ITEM | sendEquipRetrieve | EQUIP_RECYCLE_ITEM: mesma varredura de 66:sendUseProp — nenhum [PacketHandler(222,...)] registrado. |
| stub | 265 | NEWTITLE_CARD | sendNewTitleCard | NEWTITLE_CARD: mesma varredura de 66:sendUseProp — nenhum [PacketHandler(265,...)] registrado. |
| partial | 49 | CHANGE_PLACE_GOODS | sendMoveGoods | Mover para o ferreiro/equipar. Banco da guilda (bolsa 11): StoreLevel × 10 espaços, depósito/retirada ok (research/e2e/guild/g40-bank-deposit.png). |
| partial | 168 | GOODS_COUNT | sendUpdateGoodsCount | GOODS_COUNT implementado (GoodsCountHandler.cs) respondendo lista vazia: o estoque diário global (WorldMgr.GetAllShopFreeCount) não é rastreado neste port — o ShopID 20 já é limitado por jogador (ver 44 BUY_GOODS), não por estoque global, então não há nada pra reportar. Mesmo desvio documentado em HANDLERS.md. |
| ok (não verificado) | 34 | USER_RANK | sendChangeDesignation | USER_RANK implementado (ChangeDesignationHandler.cs): mostra/esconde o selo da guilda sobre o personagem (IsShowConsortia). |
| ok (não verificado) | 60 | ITEM_HIDE | sendHideLayer |  |
| ok (não verificado) | 62 | ITEM_CONTINUE | sendGoodsContinue | ITEM_CONTINUE implementado (UserItemContineueHandler.cs): estende o ValidDate do item usando o preço da loja (tiers A/B/C, igual BUY_GOODS via setItemType). Testado por código/typecheck, não clicado. |
| ok (não verificado) | 74 | ITEM_EQUIP | sendItemEquip | FC (Lực chiến) calculado pela fórmula original (apps/game/src/game/stats.ts) e enviado em 67/login/ranking: 2091 no Thur conferido à mão. |
| ok (não verificado) | 122 | CLEAR_STORE_BAG | sendClearStoreBag |  |
| ok (não verificado) | 124 | CHANGE_PLACE_GOODS_ALL | sendMoveGoodsAll |  |
| ok (não verificado) | 182 | USE_COLOR_CARD | sendChangeColor | USE_COLOR_CARD implementado (UserChangeItemColorHandler.cs): recolore um slot do EquipBag usando um item de cor do PropBag ou Xu (preço do Shop pelo templateId, APrice1=-1). |
| ok (não verificado) | 189 | USER_CHANGE_RANK | sendReworkRank | USER_CHANGE_RANK implementado (ReworkRankHandler.cs): troca o título exibido por um dos títulos que o jogador já possui (player."Sys_User_Rank"); NewTitleID continua 0 (tabela de definição de título nunca migrada, mesma lacuna documentada em HANDLERS.md "Player stats"). |
| ok (não verificado) | 206 | CHANGE_COLOR_OVER_DUE | sendChangeColorShellTimeOver |  |
| ok (não verificado) | 216 | CARDS_DATA | sendFirstGetCards |  |
| ok (não verificado) | 218 | USER_GET_GIFTS | sendPlayerGift | USER_GET_GIFTS implementado (UserGetGiftHandler.cs): lista todos os presentes já recebidos, somados por TemplateID. Achado: o original registra DUAS classes no código 218 (PlayerGiftHandler, um no-op de 1 int, e UserGetGiftHandler, o de verdade) — a reflexão do dicionário do C# favorece uma delas; este port implementa a significativa (UserGetGiftHandler), que bate com o nome do pacote USER_GET_GIFTS. |

## Missões (18)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| missing | 15 | USER_ANSWER | syncStep | Real no original, não lacuna de fidelidade — feature de tutorial não portada ainda (orçamento): UserAnswerHandler.cs (código 15 USER_ANSWER) recebe byte b, int step (enum Step em SqlDataProvider/Step.cs, ~90 marcos tipo POP_WELCOME/BAG_OPEN_SHOW/POP_WIN_I), opcionalmente paga um prêmio via DropInventory.AnswerDrop(step) e sempre grava UpdateAnswerSite(step) (bitmask de progresso, pra retomar o tutorial sem repetir popups). O campo PlayerInfo.AnswerSite já existe (apps/game/src/game/player-info.ts, persistido) mas nada escreve nele ainda — nenhum handler para o código 15. Baixo impacto de gameplay (é bookkeeping de UI do tutorial Freshman, que já funciona via outros meios nesta port — packages/fight/test/pve.test.ts 'freshman 6-2'); mapear as ~90 constantes de Step com precisão ficou fora do orçamento desta sessão. |
| missing | 15 | USER_ANSWER | syncWeakStep | Ver 15:syncStep — mesmo handler/código 15 (variante 'weak' = sem o prêmio automático, só grava progresso). |
| missing | 31 | GOODS_EXCHANGE | sendGoodsExchange | Chamado pelo cliente (calendar/view/goodsExchange/GoodsExchangeView.as:177) mas sem [PacketHandler(31,...)] em Game.Server — o pedido de troca de itens do calendário é descartado silenciosamente no próprio original (não é um no-op registrado como 128/130, é ausência total de handler, igual 104/105/239). Status 'missing' aqui é fidelidade, não lacuna. |
| missing | 32 | COLLECTINFO | sendCollectInfoValidate | Chamado pelo cliente (quest/InfoCollectView.as:200) mas sem [PacketHandler(32,...)] em Game.Server — o formulário de 'coleta de informação' (CPF/telefone etc. de alguma campanha) nunca foi implementado no servidor original; o cliente envia e nada responde. Status 'missing' aqui é fidelidade, não lacuna. |
| missing | 89 | QUESTION_REPLY | sendQuestionReply | Chamado pelo cliente (ddt/manager/QuestionInfoMannager.as:85) mas sem [PacketHandler(89,...)] em Game.Server — resposta a uma pergunta (survey/quiz de evento) nunca implementada no original. Status 'missing' aqui é fidelidade, não lacuna. |
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

## Ferreiro (16)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| stub | 61 | ITEM_TRANSFER | sendItemTransfer | ITEM_TRANSFER: morto no próprio original — nenhum [PacketHandler(61,...)] em todo vendor/DDTank41 (grep completo nos projetos Game.Server/Fighting.Server/Center.Server). |
| stub | 95 | NECKLACE_STRENGTH | necklaceStrength | NECKLACE_STRENGTH: mesma varredura de sendItemTransfer — nenhum [PacketHandler(95,...)] registrado. |
| stub | 106 | WISHBEADEQUIP | sendWishBeadEquip | WISHBEADEQUIP: mesma varredura de sendItemTransfer — nenhum [PacketHandler(106,...)] registrado. |
| stub | 133 | LATENT_ENERGY | sendLatentEnergy | LATENT_ENERGY: mesma varredura de sendItemTransfer — nenhum [PacketHandler(133,...)] registrado. |
| stub | 138 | ITEM_ADVANCE | sendItemExalt | ITEM_ADVANCE: mesma varredura de sendItemTransfer — nenhum [PacketHandler(138,...)] registrado. |
| stub | 209/FIGHT_SPIRIT_INIT=1 | FIGHT_SPIRIT | fightSpiritRequest | FIGHT_SPIRIT_INIT: mesma varredura de sendItemTransfer — nenhum [PacketHandler(209,...)] registrado. |
| stub | 295/FORGE_SUIT=1 | STORE_FINE_SUIT | sendForgeSuit | FORGE_SUIT: mesma varredura de sendItemTransfer — nenhum [PacketHandler(295,...)] registrado. |
| stub | 391 | EQUIP_GHOST | sendEquipGhost | EQUIP_GHOST: mesma varredura de sendItemTransfer — nenhum [PacketHandler(391,...)] registrado. |
| partial | 58 | ITEM_COMPOSE | sendItemCompose | Implementado: taxa {80,50,30,10,5}% por qualidade (+1% sem amuleto), PRICE_COMPOSE_GOLD (1600). |
| partial | 59 | ITEM_STRENGTHEN | sendItemStrength | Pedras nv 4/5 em arma: sucesso, +1 por clique, 1 pedra consumida por slot (desvio: C# consumia a pilha inteira), furo 1 abre no +3. |
| ok (não verificado) | 78 | ITEM_FUSION | sendItemFusion | Implementado: prévia 76 + fusão 400 ouro (FusionMgr). |
| ok (não verificado) | 120 | ITEM_TREND | sendItemTrend | ITEM_TREND implementado (ItemTrendHandle.cs + RefineryMgr.RefineryTrend, Templates.refineryTrend): converte um equip entre variantes de "tendência" listadas no Item_Refinery, ou compra o item 34101 direto (num=-1). A tabela game."Item_Refinery" tem 0 linhas no .bak de origem (nunca configurada neste servidor, no original também) — handler vivo, porém sempre no-op até alguém popular a tabela; mesmo comportamento observável do original com a config vazia. Testado em apps/game/test/forge-advanced.test.ts (lógica de busca na lista achatada), não clicado. |
| ok (não verificado) | 121 | ITEM_INLAY | sendItemEmbed | Implementado (furo precisa estar aberto e tipo igual ao Property2 da gema); sem gema no personagem de teste para verificar no cliente. Varredura pt.3 (2026-10-02): agora chama `p.questInv?.onItemInsert()` em sucesso (`forge.ts` `inlay`), ligando a missão tipo 25 ItemInsertCondition (antes não portada) — testado por código/typecheck, não clicado (sem gema compatível com furo aberto no personagem de teste nesta sessão; furo tipo 0 na arma do Thur, única gema na bolsa era tipo 3). |
| ok (não verificado) | 125 | ITEM_EMBED_BACKOUT | sendItemEmbedBackout | Implementado: 500 Xu, gema volta vinculada, devolve itens do ferreiro. |
| ok (não verificado) | 172 | SAVE_DB | sendSaveDB |  |
| ok (não verificado) | 217 | OPEN_FIVE_SIX_HOLE | sendItemOpenFiveSixHole | OPEN_FIVE_SIX_HOLE implementado (OpenFiveSixHoleHandler.cs): broca (PropBag, ItemInfo.isDrill) gasta no furo 5/6 do equip no StoreBag[slot], exp Property7..8 aleatória, cooldown de 100ms (LastOpenHole). Testado em apps/game/test/forge-advanced.test.ts (isDrill por nível), não clicado. |

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
| missing | 224 | CID_CHECK | sendCIDCheck |  |
| missing | 308 | EQUIP_BRING_UP | sendBringUpEat |  |
| missing | 313 | ITEM_CELL_IS_LOCKED | sendBringUpLockStatusUpdate |  |
| stub | 209/FIGHT_SPIRIT_LEVELUP=3 | FIGHT_SPIRIT | figSpiritUpGrade |  |
| partial | 249/MARRYROOMSENDGIFT=12 | MARRY_CMD | refund |  |
| partial | 258 | NOVICEACTIVITY | sendNoviceActivityGetAward | NOVICEACTIVITY implementado simplificado: usa as mesmas tabelas Event_Reward_Info/Goods do 259 (firstRecharge), elegibilidade = Grade do jogador >= Condition (o contador de progresso por PlayerExtra — nível/fortalecimento/recarga/VIP/FC — não foi portado; ver HANDLERS.md). Claim idempotente por (ActivityType, Condition) via app."EventClaims". Testado por código, não clicado. |
| ok (não verificado) | 103 | DAILYRECORD | sendDailyRecord | Devolve e apaga as linhas de DailyRecordInfo (como o original). |
| ok (não verificado) | 213 | USE_LOG | sendUseLog |  |
| ok (não verificado) | 225 | ENTHRALL_SWITCH | sendForSwitch |  |
| ok (não verificado) | 236 | MARRYINFO_ADD | sendRegisterInfo |  |
| ok (não verificado) | 237 | MARRYINFO_UPDATE | sendModifyInfo |  |

## Pets (15)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| stub | 68/PAY_SKILL=16 | PET | sendPaySkill | PAY_SKILL (sub 16): sem classe Handle no original (grep em vendor/DDTank41/Game.Server/Pet/Handle/*.cs — nenhum arquivo com PetHandleAttbute(PAY_SKILL)); PetHandleMgr.LoadCommandHandler loga erro e descarta. Morto no original. |
| stub | 68/PET_FOLLOW=25 | PET | sendPetFollowOrCall | PET_FOLLOW (sub 25): mesma varredura de sendPaySkill — sem classe Handle registrada, morto no original. |
| stub | 68/PET_FORMINFO=24 | PET | sendPetFormInfo | PET_FORMINFO (sub 24): mesma varredura de sendPaySkill — sem classe Handle registrada, morto no original. |
| stub | 68/PET_WAKE=32 | PET | sendPetWake | PET_WAKE (sub 32): mesma varredura de sendPaySkill — sem classe Handle registrada, morto no original. |
| ok (não verificado) | 68/ADD_PET_EQUIP=20 | PET | addPetEquip | ADD_PET_EQUIP (sub 20) implementado (AddPetEquip.cs): item de gear de pet (CategoryID 50/51/52) do bagType/slot indicado, nível do pet >= Property2, 1 peça por eqType (máx 3). FightPower: cada peça soma a tempera ("manh hóa"/moe) do slot correspondente (stats.ts). Testado em apps/game/test/pets-advanced.test.ts, não clicado. |
| ok (não verificado) | 68/DEL_PET_EQUIP=21 | PET | delPetEquip | DEL_PET_EQUIP (sub 21) implementado (DelPetEquip.cs): remove a peça do eqType indicado, devolve o item vinculado. Testado em apps/game/test/pets-advanced.test.ts, não clicado. |
| ok (não verificado) | 68/EAT_PETS=33 | PET | eatPetsHandler | EAT_PETS (sub 33, "manh hóa"/tempera de gear) implementado (EatPet.cs + PetMoePropertyMgr): HungBuCacCho bloqueia subir o slot já no nível máx único; tipo 1 sacrifica pets (ganho por StarLevel/Level), tipo 2 consome item 201567. Persistido em player."Sys_Eat_Pets" (nunca carregado/salvo antes desta sessão). Testado em apps/game/test/pets-advanced.test.ts (cascata de tiers, cap no nível máx), não clicado. |
| ok (não verificado) | 68/ADOPT_PET=6 | PET | sendAdoptPet | ADOPT_PET (sub 6) implementado (AdoptPet.cs): move o pet sorteado (oferta do REFRESH_PET) pro primeiro slot livre da bolsa de pets; aviso mundial se 4+ estrelas ou KindID >= 5. Fonte do sorteio: DropInventory.GetPetDrop(613,1) portado em Templates.petAdoptPick (reusa Drop_Condiction/Drop_Item tipo 13 Trminhpc). Testado em apps/game/test/pets-advanced.test.ts, não clicado. |
| ok (não verificado) | 68/EQUIP_PET_SKILL=7 | PET | sendEquipPetSkill | EquipSkillPet (slot 4 VIP 7) — servidor, não clicado no cliente. |
| ok (não verificado) | 68/PET_EVOLUTION=23 | PET | sendPetEvolution | PET_EVOLUTION (sub 23) implementado (PetEvolution.cs): item 11163 soma exp a player.evolutionGrade/evolutionExp (tiers Pet_Fight_Property, PetMgr.GetEvolutionMax = contagem de linhas, exposto como Templates.petFightMax); já alimentava o FightPower (stats.ts), só faltava o handler que avança o tier. Testado por código/typecheck, não clicado. |
| ok (não verificado) | 68/RENAME_PET=9 | PET | sendPetRename | RenamePet (ChangeNameCost Xu) — servidor, não clicado no cliente. |
| ok (não verificado) | 68/PET_RISINGSTAR=22 | PET | sendPetRisingStar | PET_RISINGSTAR (sub 22, "tăng sao") implementado (PetRisingStar.cs): item 11162, Pet_Star_Exp[TemplateID].Exp necessário; ao bater a meta, evolui pro NewID no nível atual (grow recalculado). Testado em apps/game/test/pets-advanced.test.ts (abaixo/acima da meta, pet sem suporte), não clicado. |
| ok (não verificado) | 68/REFRESH_PET=5 | PET | sendRefreshPet | REFRESH_PET (sub 5) implementado (RefereshPet.cs): reroll custa AdoptRefereshCost Xu (ou 1 item FreeRefereshID), senão só reenvia a oferta atual. Lista de adoção em memória (como lottery/chicken-box). Testado em apps/game/test/pets-advanced.test.ts, não clicado. |
| ok (não verificado) | 68/RELEASE_PET=8 | PET | sendReleasePet | ReleasePet (IsExit=0, 12656×WashGetCount) — servidor, não clicado no cliente. |
| ok (não verificado) | 68/REVER_PET=18 | PET | sendRevertPet | REVER_PET (sub 18, "lavar"/reverter pet) implementado (RevertPet.cs): RecycleCost Xu; grow/break/skills voltam ao BaseProp salvo na choco; gear devolvida vinculada; dá um item 334100 (essência) carregando o GP/MaxGP/break perdidos. Testado em apps/game/test/pets-advanced.test.ts (plumbing de gear), não clicado no cliente. |

## Fazenda (14)

| status | código | pacote | função cliente | notas |
|---|---|---|---|---|
| partial | 81/ACCELERATE_FIELD=3 | FARM | doMature |  |
| partial | 81/ENTER_FARM=1 | FARM | enterFarm | Fluxo plantar->regar->colher testado de ponta a ponta com o layout real de pacotes (apps/game/test/marriage-farm-auction.test.ts '81 FARM — plant, fast-forward, harvest'): ENTER_FARM(1) devolve o snapshot dos 8 campos iniciais. Não clicado no Ruffle real (orçamento de screenshots). |
| partial | 81/EXIT_FARM=16 | FARM | exitFarm |  |
| partial | 81/FRAM_GROP_FASTFORWARD=18 | FARM | fastForwardGrop | FRAM_GROP_FASTFORWARD(18): cobra FastGrowNeedMoney em Money (ou GiftToken) por campo e soma FAST_GROW_SUB_MIN de AccelerateTime, adiantando a maturação sem esperar o relógio real. Ver 81:enterFarm. |
| partial | 81/FARM_GIFTPACKS=20 | FARM | giftPacks |  |
| partial | 81/GROW_FIELD=2 | FARM | seeding | GROW_FIELD(2): consome 1 semente da FarmBag (332100 Lúa Mì testado), grava SeedID/PlantTime/FieldValidDate/GainCount no campo e responde FARM_LAND_INFO (sub 17, não ecoa o sub da requisição). Replantar após colher também testado. Ver 81:enterFarm. |
| partial | 81/HELPER_SWITCH_FIELD=9 | FARM | sendBeginHelper |  |
| partial | 81/COMPOSE_FOOD=5 | FARM | sendCompose |  |
| partial | 81/HELPER_SWITCH_FIELD=9 | FARM | toFarmHelper |  |
| partial | 81/GAIN_FIELD=4 | FARM | toGather | GAIN_FIELD(4) em campo próprio: exige isRipe (elapsed+AccelerateTime >= FieldValidDate), zera o campo e entrega Property2 unidades do item Property4 na bolsa (propBag aqui; correio se a bolsa estiver cheia). Ver 81:enterFarm. |
| partial | 81/HELPER_PAY_FIELD=8 | FARM | toHelperRenewMoney |  |
| partial | 81/KILLCROP_FIELD=7 | FARM | toKillCrop |  |
| partial | 81/PAY_FIELD=6 | FARM | toSpread |  |
| ok (não verificado) | 68/BUY_PET_EXP_ITEM=19 | PET | sendBuyPetExpItem |  |

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
| missing | 50 | FIGHT_NPC | sendBeginFightNpc | Morto no original dos dois lados: GameSocketOut.as define sendBeginFightNpc() (PackageOut(FIGHT_NPC=50)) mas nenhum arquivo do cliente chama essa função (grep em vendor/DDTank41/Source Flash/src), e o servidor não registra [PacketHandler(50,...)] em Game.Server/Fighting.Server (o 'FIGHT_NPC=88' de Game.Logic/Protocol/eFightPackageType.cs é um protocolo interno Center<->Fighting diferente, não o pacote de cliente). Status 'missing' aqui é fidelidade, não lacuna. |
| partial | 131/CLEAN_OUT=3 | LABYRINTH | labyrinthCleanOut |  |
| partial | 131/CLEAN_OUT_COMPLETE=8 | LABYRINTH | labyrinthCleanOutTimerComplete |  |
| partial | 131/DOUBLE_REWARD=1 | LABYRINTH | labyrinthDouble |  |
| partial | 131/RESET_LABYRINTH=6 | LABYRINTH | labyrinthReset |  |
| partial | 131/SPEEDED_UP_CLEAN_OUT=4 | LABYRINTH | labyrinthSpeededUpCleanOut |  |
| partial | 131/STOP_CLEAN_OUT=5 | LABYRINTH | labyrinthStopCleanOut |  |
| partial | 131/TRY_AGAIN=9 | LABYRINTH | labyrinthTryAgain |  |
| ok (não verificado) | 82 | CrazyTankPackageType.GAME_MISSION_START | sendGameMissionStart | GAME_MISSION_START implementado (GameUserStartHandler.cs, apps/game/src/handlers/rooms.ts + Fight.missionStart em apps/game/src/fight/ddt.ts): bool flag; se true, força Ready=true em todo jogador do jogo PvE da sala atual e chama checkState(0) (sem checagem de host no original). É isto que o MissionRoomView.as do cliente envia, no lugar de 94/7 GAME_START, ao clicar 'Iniciar' entre sessões de uma masmorra multi-andar tipo FightLab (roomType 5) já em andamento — sem este handler o jogo ficava parado em SessionPrepared/GameOver a partir do 2º andar. Reusa a semântica de 137 DELIVER (só liga Ready, sem eco). Testado em apps/game/test/fight.test.ts ('82 GAME_MISSION_START ... forwarded to the room's active game.missionStart()'), não clicado no cliente real. |

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
| missing | 166 | LITTLEGAME_COMMAND | createPackageOut | Real no original, não lacuna de fidelidade — subsistema inteiro não portado ainda (orçamento): LITTLEGAME_COMMAND (código 166) é só um relay fino (LittleGameHandler.cs, 13 linhas: client.Player.LittleGame?.ProcessData(...)) para um minigame completo da fonte termal em vendor/DDTank41/Game.Server/LittleGame/* (22 arquivos: LittleGameWorldMgr, LittleGameLogicProcessor, handlers de EnterWorld/LeaveWorld/Move/Click/CancelClick/PosSync/ReportScore — um jogo de posição/clique em tempo real dentro da sala de spa, Source Flash/src/littleGame/LittleGameManager.as no cliente). Nenhuma parte foi portada; nenhuma tabela/estado equivalente existe em apps/game. Tamanho comparável ao chick activation (84) — fora do orçamento desta sessão. |
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

