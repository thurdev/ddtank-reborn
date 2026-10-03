# Matriz de QA — cliente Flash × servidor

> **Gerado** por `npx tsx tools/qa/gen-matrix.ts` — não edite as tabelas à mão. Colunas manuais (verificado no cliente,
> notas, evidência, status "broken") ficam em `tools/qa/overrides.json` (chave `<código>:<função>`). Fontes: pacotes que o
> cliente envia (`docs/spec/server/tools/out/client-sends.json`), quem chama cada função (varredura de
> `vendor/DDTank41/Source Flash/src`), status do handler lido do registro vivo `apps/game/src/handlers` (ver `apps/game/HANDLERS.md`).
>
> Status do servidor: **ok** = portado; **partial** = fluxo principal ok, partes faltando; **stub** = no-op registrado;
> **missing** = código não registrado (pacote descartado); **broken** = testado no cliente e com defeito (override).
> Códigos com sub-comando (94, 91, 129, 160, ...) mostram o status do código; o sub está na coluna *Sub*.

## Resumo por área

| Área | Linhas | ok | partial | stub | missing | broken | verificado no cliente |
|---|---|---|---|---|---|---|---|
| Amigos | 12 | 6 | 0 | 0 | 6 | 0 | 0 |
| Bolsa/Inventário | 27 | 11 | 3 | 0 | 13 | 0 | 8 |
| Boss mundial/Minigames | 7 | 0 | 6 | 0 | 1 | 0 | 4 |
| Cartas | 8 | 4 | 0 | 0 | 4 | 0 | 2 |
| Casamento | 24 | 9 | 13 | 0 | 2 | 0 | 0 |
| Combate (GAME_CMD) | 39 | 0 | 35 | 0 | 4 | 0 | 4 |
| Configurações | 2 | 1 | 0 | 0 | 1 | 0 | 0 |
| Conta/Login | 6 | 4 | 0 | 0 | 2 | 0 | 0 |
| Correio | 7 | 6 | 0 | 0 | 1 | 0 | 0 |
| Escola/Aprendiz | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| Eventos/Atividades | 37 | 12 | 10 | 9 | 6 | 0 | 2 |
| Fazenda | 14 | 0 | 14 | 0 | 0 | 0 | 0 |
| Ferreiro | 16 | 4 | 2 | 0 | 10 | 0 | 1 |
| GvG/Liga | 4 | 0 | 4 | 0 | 0 | 0 | 0 |
| Leilão | 3 | 1 | 2 | 0 | 0 | 0 | 0 |
| Lobby/Chat/Bugle | 10 | 9 | 0 | 0 | 1 | 0 | 0 |
| Loja | 7 | 2 | 1 | 0 | 4 | 0 | 1 |
| Missões | 23 | 15 | 2 | 1 | 5 | 0 | 5 |
| Outros | 16 | 6 | 2 | 0 | 8 | 0 | 1 |
| Personagem/FC | 3 | 1 | 0 | 0 | 2 | 0 | 0 |
| Pets | 17 | 0 | 17 | 0 | 0 | 0 | 2 |
| PvE/Masmorras | 9 | 0 | 7 | 0 | 2 | 0 | 0 |
| Salas PvP | 21 | 17 | 0 | 0 | 4 | 0 | 0 |
| Sociedade/Guilda | 28 | 25 | 1 | 2 | 0 | 0 | 12 |
| Spa/Fonte termal | 14 | 13 | 0 | 1 | 0 | 0 | 5 |
| Totem/Honra | 2 | 0 | 0 | 0 | 2 | 0 | 0 |
| VIP | 1 | 1 | 0 | 0 | 0 | 0 | 1 |
| **Total** | 361 | 151 | 119 | 13 | 78 | 0 | 48 |

## Amigos

| Função (botão) | Arquivo(s) do cliente | Código | Sub | Servidor | Cliente verificado | Notas |
|---|---|---|---|---|---|---|
| `sendSnsMsg` | `ddt/manager/DynamicManager.as`<br>`ddt/view/SNSFrame.as` | 40 SNS_MSG_RECEIVE |  | missing | no |  |
| `sendGameLogin` | `invite/ResponseInviteFrame.as`<br>`roomList/LookupRoomFrame.as`<br>`roomList/PassInputFrame.as` (+2) | 94 GAME_ROOM | GAME_ROOM_LOGIN=1 | ok | no |  |
| `enterInviteFriendView` | — | 107 INVITE_FRIEND | INVITE_FRIEND_OPENVIEW=2 | missing | no |  |
| `inviteFriendFBBntClick` | — | 107 INVITE_FRIEND | INVITE_FRIEND_FBCLICK=6 | missing | no |  |
| `inviteFriendOkClick` | — | 107 INVITE_FRIEND |  | missing | no |  |
| `inviteFriendRewardBntClick` | — | 107 INVITE_FRIEND | INVITE_FRIEND_GETREWARD=4 | missing | no |  |
| `sendAddFriend` | `cityWide/CityWideManager.as`<br>`ddt/view/tips/FriendGroupTItem.as`<br>`im/FriendGroupFrame.as` (+2) | 160 IM_CMD | FRIEND_ADD=160 | ok | partial | Varredura do básico pt.2: painel Bạn bè(F) abriu, diálogo 'Thêm bạn' aceitou o nickname 'Bob' com autocomplete e fechou sem erro. Não deu pra confirmar um ADD novo no banco porque Bob já era amigo do Thur antes desta sessão (Sys_Users_Friends AddDate antigo, não mudou) — fluxo de UI ok, mas não isola o caso de amigo novo. |
| `sendCustomFriends` | `im/IMController.as`<br>`im/IMListItemView.as` | 160 IM_CMD | ADD_CUSTOM_FRIENDS=208 | ok | no |  |
| `sendDelFriend` | `im/IMController.as` | 160 IM_CMD | FRIEND_REMOVE=161 | ok | no |  |
| `sendOneOnOneTalk` | `im/IMController.as`<br>`im/chatFrame/PrivateChatFrame.as` | 160 IM_CMD | ONE_ON_ONE_TALK=51 | ok | no |  |
| `sendOns` | `cityWide/CityWideManager.as` | 160 IM_CMD | ONS_EQUIP=45 | ok | no |  |
| `sendWithBrithday` | `socialContact/friendBirthday/FriendBirthdayManager.as` | 223 FRIEND_BRITHDAY |  | missing | no |  |

## Bolsa/Inventário

| Função (botão) | Arquivo(s) do cliente | Código | Sub | Servidor | Cliente verificado | Notas |
|---|---|---|---|---|---|---|
| `sendChangeDesignation` | `bagAndInfo/info/PlayerInfoView.as` | 34 USER_RANK |  | missing | no |  |
| `sendMoveGoods` | `bagAndInfo/bag/BagView.as`<br>`bagAndInfo/bag/BankBagView.as`<br>`bagAndInfo/cell/BagCell.as` (+33) | 49 CHANGE_PLACE_GOODS |  | partial | yes | Mover para o ferreiro/equipar. Banco da guilda (bolsa 11): StoreLevel × 10 espaços, depósito/retirada ok (research/e2e/guild/g40-bank-deposit.png). |
| `sendHideLayer` | `bagAndInfo/info/PlayerInfoView.as` | 60 ITEM_HIDE |  | ok | no |  |
| `sendGoodsContinue` | `ddt/view/goods/AddPricePanel.as`<br>`equipDebt/view/EquipAddMoneyFrame.as`<br>`shop/view/ShopRechargeEquipView.as` | 62 ITEM_CONTINUE |  | missing | no |  |
| `sendItemOpenUp` | `bagAndInfo/bag/BagView.as`<br>`bagAndInfo/bag/OpenBatchView.as` | 63 ITEM_OPENUP |  | ok | yes | Caixa (Túi quà mũi khoan) aberta: itens chegam e empilham na bolsa, caixa consumida antes de dar (sem dupe). — evidência: research/e2e/qa/b14-box-opened.png, b15-after-box.png |
| `sendUseProp` | `bagAndInfo/bag/BagView.as` | 66 PROP_USE |  | missing | no |  |
| `sendAddPet` | `bagAndInfo/bag/BagView.as` | 68 PET | ADD_PET=2 | partial | yes | Ovo de pet (cat. 35) chocado: CreatePet + 68/2 (janela de pet recebido), pet aparece na aba Thú cưng. — evidência: research/e2e/batch4/07-hatch.png, research/e2e/batch4/08-pet-bag.png |
| `sendItemEquip` | `bagAndInfo/info/PlayerInfoViewControl.as`<br>`eliteGame/view/EliteGamePaarungFrame.as`<br>`email/view/ReadingView.as` (+2) | 74 ITEM_EQUIP |  | ok | no | FC (Lực chiến) calculado pela fórmula original (apps/game/src/game/stats.ts) e enviado em 67/login/ranking: 2091 no Thur conferido à mão. — evidência: research/e2e/qa/b2-bag.png |
| `sendItemOverDue` | `ddt/data/goods/InventoryItemInfo.as`<br>`ddt/data/player/SelfInfo.as` | 77 ITEM_OVERDUE |  | missing | no |  |
| `sendUseProp` | `bagAndInfo/bag/BagView.as` | 91 GAME_CMD | PROP=32 | partial | yes | Props 1/2/3 (+1 tiro / x3 / +2) usados na luta e aplicados ao tiro. — evidência: research/e2e/batch4/20-props.png, research/e2e/batch4/22-shot2.png |
| `sendTexp` | `bagAndInfo/bag/BagView.as`<br>`texpSystem/view/TexpView.as` | 99 TEXP |  | ok | yes | Tu luyện: poção na StoreBag[0] → exp Tấn công 100/250, nível 4, stats atualizados. — evidência: research/e2e/batch4/17-texp-a.png, research/e2e/batch4/17-texp-done.png |
| `sendClearStoreBag` | `bagAndInfo/BagAndGiftFrame.as`<br>`bagAndInfo/BagAndInfoManager.as`<br>`ddt/bagStore/BagStoreFrame.as` (+6) | 122 CLEAR_STORE_BAG |  | ok | no |  |
| `sendMoveGoodsAll` | `ddt/data/BagInfo.as` | 124 CHANGE_PLACE_GOODS_ALL |  | ok | no |  |
| `reclaimGoods` | — | 127 REClAIM_GOODS |  | ok | yes | Varredura do básico pt.2: clicado item (Mũi khoan cấp 1 x5) então 'Bán' → confirmação 'Bạn muốn bán 5 cái, giá 200 Vàng' → OK → 'Bạn nhận được 200 vàng', Gold +200, item removido da bolsa. |
| `sendUpdateGoodsCount` | `bagAndInfo/BagAndGiftFrame.as`<br>`shop/ShopController.as` | 168 GOODS_COUNT |  | missing | no |  |
| `sendUseReworkName` | `bagAndInfo/ReworkName/ReworkNameFrame.as` | 171 USE_REWORK_NAME |  | missing | no |  |
| `sendChangeColor` | `changeColor/view/ChangeColorRightView.as` | 182 USE_COLOR_CARD |  | missing | no |  |
| `sendUseCard` | `bagAndInfo/bag/BagView.as`<br>`ddt/view/buff/buffButton/BuffButton.as`<br>`game/view/propContainer/RightPropView.as` (+1) | 183 CARD_USE |  | ok | yes | Cartão VIP (P1 23) agora ativa VIP (ícone VIP 1 no perfil); EXP x2 (13) e GP pill (21) como antes. — evidência: research/e2e/batch4/15-vipcard.png |
| `sendUseConsortiaReworkName` | `bagAndInfo/ReworkName/ReworkNameConsortia.as` | 188 USE_CONSORTIA_REWORK_NAME |  | missing | no |  |
| `sendReworkRank` | `bagAndInfo/info/PlayerInfoEffortHonorView.as` | 189 USER_CHANGE_RANK |  | missing | no |  |
| `sendUseChangeColorShell` | `bagAndInfo/bag/BagView.as` | 205 USE_CHANGE_COLOR_SHELL |  | missing | no |  |
| `sendChangeColorShellTimeOver` | `ddt/data/goods/InventoryItemInfo.as` | 206 CHANGE_COLOR_OVER_DUE |  | ok | no |  |
| `sendFirstGetCards` | `bagAndInfo/bag/BagView.as` | 216 CARDS_DATA |  | ok | no |  |
| `sendPlayerGift` | `bagAndInfo/info/PlayerInfoFrame.as`<br>`ddt/manager/PlayerManager.as`<br>`ddt/manager/ServerManager.as` | 218 USER_GET_GIFTS |  | missing | no |  |
| `sendEquipRetrieve` | `equipretrieve/view/RetrieveBgView.as` | 222 EQUIP_RECYCLE_ITEM |  | missing | no |  |
| `sendChangeSex` | `bagAndInfo/bag/BagView.as` | 252 USE_CHANGE_SEX |  | ok | yes | Varredura pt.3 (2026-10-02): a pista da pt.2 (double-click só em `_equiplist`) era incompleta — o gatilho real é `__cellUse` (BagView.as:1385-1451), ligado ao evento `CellMenu.USE`, que `_proplist` alcança via single-click → `__cellClick` (BagView.as:1102) → `CellMenu.instance.show()` quando `EquipType.canBeUsed()` é true (é, para CategoryID==CHANGE_SEX). Confirmado no cliente real: item 11569 (Đạo cụ) → clique único abre CellMenu com 'Sử dụng'/'Di chuyển' → 'Sử dụng' abre o `ChangeSexAlertFrame` ('Bạn muốn chuyển giới?...') → 'Đồng ý' → `Sex` false→true no banco, item consumido (`IsExist=false`). Nenhum patch de cliente foi necessário — é um gesto normal de jogo (como qualquer item 'usável' da Đạo cụ), só não documentado antes. Também corrigido: o handler só salvava no autosave de 10 min (`SAVE_INTERVAL_MIN`); agora chama `saveIntoDatabase` direto após o uso (`apps/game/src/handlers/items.ts` 252), como 179/mail/consortia. |
| `sendNewTitleCard` | `bagAndInfo/bag/BagView.as` | 265 NEWTITLE_CARD |  | missing | no |  |

## Boss mundial/Minigames

| Função (botão) | Arquivo(s) do cliente | Código | Sub | Servidor | Cliente verificado | Notas |
|---|---|---|---|---|---|---|
| `enterWorldBossRoom` | — | 102 WORLDBOSS_CMD | ENTER_WORLDBOSSROOM=32 | partial | yes | Boss mundial agendado (12:00/20:00 UTC, admin "Iniciar agora"): 102/0 OPEN com horários reais, ícone Thần thú no hall, sala com HP e ranking; fim = prêmio por posição (params.rankAwards, 1x por janela) + 102/1 OVER. — evidência: research/e2e/events/e14-dacsac.png, e15-worldboss-room.png, e16-worldboss-scene.png |
| `requestRevive` | `worldboss/view/WorldBossResurrectView.as` | 102 WORLDBOSS_CMD | REQUEST_REVIVE=37 | partial | no | Reviver 1000 / relutar 1200 Xu; não exige mais estar na lista (estado 3 removia). |
| `sendAddPlayer` | `worldboss/view/WorldBossRoomView.as` | 102 WORLDBOSS_CMD | ADDPLAYERS=34 | partial | yes | Entra na sala do boss (102/3 para todos + ranking). — evidência: research/e2e/events/e16-worldboss-scene.png |
| `sendBuyWorldBossBuff` | `worldboss/WorldBossManager.as`<br>`worldboss/view/BuffCartItem.as` | 102 WORLDBOSS_CMD | BUFF_BUY=38 | partial | yes | 30 Xu cobrados uma vez (o original cobrava duas). — evidência: research/e2e/events/e20-buff.png |
| `sendLeaveBossRoom` | `worldboss/view/RoomMenuView.as` | 102 WORLDBOSS_CMD | LEAVE_ROOM=33 | partial | no | Sai da sala (102/4). |
| `sendWorldBossRoomMove` | `worldboss/view/WorldBossScneneMap.as` | 102 WORLDBOSS_CMD | MOVE=35 | partial | yes | Movimento repassado a todos na sala (102/6). — evidência: research/e2e/events/e17-worldboss-move.png |
| `createPackageOut` | `littleGame/LittleGameManager.as` | 166 LITTLEGAME_COMMAND |  | missing | no |  |

## Cartas

| Função (botão) | Arquivo(s) do cliente | Código | Sub | Servidor | Cliente verificado | Notas |
|---|---|---|---|---|---|---|
| `sendActivePullDown` | `ddt/view/NovicePlatinumCard.as` | 11 ACTIVE_PULLDOWN |  | missing | no |  |
| `getPlayerCardInfo` | — | 18 GET_PLAYER_CARD |  | missing | no |  |
| `sendCardReset` | `cardSystem/view/PropResetFrame.as` | 196 CARD_RESET |  | missing | no |  |
| `sendReplaceCardProp` | `cardSystem/view/PropResetFrame.as` | 196 CARD_RESET |  | missing | no |  |
| `sendMoveCards` | `cardSystem/elements/CardCell.as`<br>`cardSystem/view/CardSelect.as`<br>`cardSystem/view/cardBag/CardBagListItem.as` (+2) | 216 CARDS_DATA |  | ok | yes | Equipar carta (cópia no slot 0..4), FC sobe; desequipar remove a cópia. — evidência: research/e2e/batch4/13-card-equip.png |
| `sendOpenViceCard` | `cardSystem/view/cardEquip/CardEquipView.as` | 216 CARDS_DATA |  | ok | no |  |
| `sendSortCards` | `cardSystem/view/cardBag/CardBagView.as`<br>`ddt/data/BagInfo.as` | 216 CARDS_DATA |  | ok | no |  |
| `sendUpGradeCard` | `cardSystem/view/UpGradeFrame.as` | 216 CARDS_DATA |  | ok | yes | Upgrade: gasta 3 cópias, +exp (4/50) e sobe nível com CardUpdateInfo. — evidência: research/e2e/batch4/14-card-upgrade.png |

## Casamento

| Função (botão) | Arquivo(s) do cliente | Código | Sub | Servidor | Cliente verificado | Notas |
|---|---|---|---|---|---|---|
| `sendExitMarryRoom` | `church/controller/ChurchRoomListController.as` | 21 SCENE_REMOVE_USER |  | ok | no |  |
| `sendMateTime` | `church/view/weddingRoomList/DivorcePromptFrame.as`<br>`church/view/weddingRoomList/WeddingRoomListNavView.as` | 85 MATE_ONLINE_TIME |  | missing | no |  |
| `sendCreateRoom` | `church/controller/ChurchRoomListController.as` | 94 GAME_ROOM | GAME_ROOM_CREATE=0 | ok | no |  |
| `sendChurchMovieOver` | — | 167 CHURCH_MOVIE_OVER |  | missing | no |  |
| `sendSceneChange` | `church/controller/ChurchRoomController.as` | 233 MARRY_SCENE_CHANGE |  | partial | no |  |
| `sendForMarryInfo` | `civil/view/CivilRegisterFrame.as` | 235 MARRYINFO_GET |  | ok | no |  |
| `sendMarryRoomLogin` | `church/view/ChurchMainView.as` | 240 MARRY_SCENE_LOGIN |  | ok | no |  |
| `sendCreateRoom` | `church/controller/ChurchRoomListController.as` | 241 MARRY_ROOM_CREATE |  | partial | no |  |
| `sendExitRoom` | `church/controller/ChurchRoomController.as`<br>`ddt/manager/ChurchManager.as` | 244 PLAYER_EXIT_MARRY_ROOM |  | ok | no |  |
| `sendValidateMarry` | `ddt/manager/ChurchManager.as` | 246 MARRY_STATUS |  | ok | no |  |
| `sendPropose` | `ddt/view/common/church/ChurchBuyRingFrame.as`<br>`ddt/view/common/church/ChurchProposeFrame.as` | 247 MARRY_APPLY |  | ok | no |  |
| `sendUnmarry` | `church/controller/ChurchRoomListController.as` | 248 DIVORCE_APPLY |  | ok | no |  |
| `sendChurchContinuation` | `church/controller/ChurchRoomController.as` | 249 MARRY_CMD | CONTINUATION=3 | partial | no |  |
| `sendChurchForbid` | `church/view/menu/MenuPanel.as` | 249 MARRY_CMD | FORBID=8 | partial | no |  |
| `sendChurchInvite` | `church/view/invite/ChurchInvitePlayerItem.as` | 249 MARRY_CMD | INVITE=4 | partial | no |  |
| `sendChurchKick` | `church/view/menu/MenuPanel.as` | 249 MARRY_CMD | KICK=7 | partial | no |  |
| `sendChurchLargess` | `church/controller/ChurchRoomController.as` | 249 MARRY_CMD | LARGESS=5 | partial | no |  |
| `sendChurchMove` | `church/view/churchScene/SceneMap.as` | 249 MARRY_CMD | MOVE=1 | partial | no |  |
| `sendGunSalute` | `church/view/churchScene/MoonSceneMap.as` | 249 MARRY_CMD | GUNSALUTE=11 | partial | no |  |
| `sendPosition` | `church/view/churchScene/WeddingSceneMap.as` | 249 MARRY_CMD | POSITION=10 | partial | no |  |
| `sendStartWedding` | `church/controller/ChurchRoomController.as` | 249 MARRY_CMD | HYMENEAL=2 | partial | no |  |
| `sendUseFire` | `church/view/churchFire/ChurchFireView.as` | 249 MARRY_CMD | USEFIRECRACKERS=6 | partial | no |  |
| `sendProposeRespose` | `ddt/view/common/church/ChurchProposeResponseFrame.as` | 250 MARRY_APPLY_REPLY |  | ok | no |  |
| `sendModifyChurchDiscription` | `church/controller/ChurchRoomController.as` | 253 MARRY_ROOM_INFO_UPDATE |  | partial | no |  |

## Combate (GAME_CMD)

| Função (botão) | Arquivo(s) do cliente | Código | Sub | Servidor | Cliente verificado | Notas |
|---|---|---|---|---|---|---|
| `sendThrowProp` | `ddt/manager/GameInSocketOut.as` | 75 CrazyTankPackageType.PROP_DELETE |  | missing | no |  |
| `createMonster` | — | 91 GAME_CMD | GENERAL_COMMAND=23 | partial | yes | Laboratório (sala tipo 5, Pve 1000-1004, missões 101-125): GENERAL_COMMAND agora leva os ints ao script da missão (OnGeneralCommand → OnMissionEvent; antes ninguém chamava e o quiz nunca começava). Vitória desbloqueia o próximo nível (SetFightLabPermission) e o 1º clear paga FightLabUserDrop (Drop_Condiction tipo 14). — evidência: research/e2e/batch3/15-lab.png, research/e2e/batch3/17-lab-fight.png, research/e2e/batch3/20-lab-quiz.png |
| `deleteMonster` | — | 91 GAME_CMD | GENERAL_COMMAND=23 | partial | no | Laboratório (sala tipo 5, Pve 1000-1004, missões 101-125): GENERAL_COMMAND agora leva os ints ao script da missão (OnGeneralCommand → OnMissionEvent; antes ninguém chamava e o quiz nunca começava). Vitória desbloqueia o próximo nível (SetFightLabPermission) e o 1º clear paga FightLabUserDrop (Drop_Condiction tipo 14). — evidência: research/e2e/batch3/15-lab.png, research/e2e/batch3/17-lab-fight.png, research/e2e/batch3/20-lab-quiz.png |
| `sendAirPlane` | `game/model/LocalPlayer.as` | 91 GAME_CMD | AIRPLANE=40 | partial | no |  |
| `sendBeat` | `ddt/manager/GameInSocketOut.as` | 91 GAME_CMD | BEAT=22 | partial | no |  |
| `sendBossTakeOut` | `ddt/manager/GameInSocketOut.as` | 91 GAME_CMD | BOSS_TAKE_CARD=130 | partial | no |  |
| `sendClientScriptEnd` | `ddt/manager/GameInSocketOut.as` | 91 GAME_CMD | GENERAL_COMMAND=23 | partial | yes | Laboratório (sala tipo 5, Pve 1000-1004, missões 101-125): GENERAL_COMMAND agora leva os ints ao script da missão (OnGeneralCommand → OnMissionEvent; antes ninguém chamava e o quiz nunca começava). Vitória desbloqueia o próximo nível (SetFightLabPermission) e o 1º clear paga FightLabUserDrop (Drop_Condiction tipo 14). — evidência: research/e2e/batch3/15-lab.png, research/e2e/batch3/17-lab-fight.png, research/e2e/batch3/20-lab-quiz.png |
| `sendClientScriptStart` | `ddt/manager/GameInSocketOut.as` | 91 GAME_CMD | GENERAL_COMMAND=23 | partial | no |  |
| `sendFightLibAnswer` | `ddt/manager/GameInSocketOut.as` | 91 GAME_CMD | GENERAL_COMMAND=23 | partial | no | Laboratório (sala tipo 5, Pve 1000-1004, missões 101-125): GENERAL_COMMAND agora leva os ints ao script da missão (OnGeneralCommand → OnMissionEvent; antes ninguém chamava e o quiz nunca começava). Vitória desbloqueia o próximo nível (SetFightLabPermission) e o 1º clear paga FightLabUserDrop (Drop_Condiction tipo 14). — evidência: research/e2e/batch3/15-lab.png, research/e2e/batch3/17-lab-fight.png, research/e2e/batch3/20-lab-quiz.png |
| `sendFightLibInfoChange` | `ddt/manager/GameInSocketOut.as` | 91 GAME_CMD |  | partial | no |  |
| `sendFightLibReanswer` | `ddt/manager/GameInSocketOut.as` | 91 GAME_CMD | GENERAL_COMMAND=23 | partial | no | Laboratório (sala tipo 5, Pve 1000-1004, missões 101-125): GENERAL_COMMAND agora leva os ints ao script da missão (OnGeneralCommand → OnMissionEvent; antes ninguém chamava e o quiz nunca começava). Vitória desbloqueia o próximo nível (SetFightLabPermission) e o 1º clear paga FightLabUserDrop (Drop_Condiction tipo 14). — evidência: research/e2e/batch3/15-lab.png, research/e2e/batch3/17-lab-fight.png, research/e2e/batch3/20-lab-quiz.png |
| `sendFlagMode` | `ddt/manager/GameInSocketOut.as` | 91 GAME_CMD | WANNA_LEADER=97 | partial | no |  |
| `sendGameCMDBlast` | `ddt/manager/GameInSocketOut.as` | 91 GAME_CMD | BLAST=3 | partial | no |  |
| `sendGameCMDChange` | `ddt/manager/GameInSocketOut.as` | 91 GAME_CMD | CHANGEBALL=19 | partial | no |  |
| `sendGameCMDDirection` | `ddt/manager/GameInSocketOut.as` | 91 GAME_CMD | DIRECTION=7 | partial | no |  |
| `sendGameCMDShoot` | `ddt/manager/GameInSocketOut.as` | 91 GAME_CMD | FIRE=2 | partial | yes | Tiro com base attack real (stats.ts), dano 1192, vitória e retorno à sala. — evidência: research/e2e/batch4/21-shot.png, research/e2e/batch4/23-after.png, research/e2e/batch4/25-pvp-end.png |
| `sendGameCMDStunt` | `ddt/manager/GameInSocketOut.as` | 91 GAME_CMD | STUNT=15 | partial | no |  |
| `sendGameMissionPrepare` | `ddt/manager/GameInSocketOut.as` | 91 GAME_CMD | GAME_MISSION_PREPARE=116 | partial | no |  |
| `sendGamePick` | `game/model/LocalPlayer.as` | 91 GAME_CMD | PICK=49 | partial | no |  |
| `sendGameSkipNext` | `ddt/manager/GameInSocketOut.as` | 91 GAME_CMD | SKIPNEXT=12 | partial | no |  |
| `sendGameStartMove` | `ddt/manager/GameInSocketOut.as` | 91 GAME_CMD | MOVESTART=9 | partial | no |  |
| `sendGameStopMove` | `ddt/manager/GameInSocketOut.as` | 91 GAME_CMD | MOVESTOP=10 | partial | no |  |
| `sendGameTakeOut` | `ddt/manager/GameInSocketOut.as` | 91 GAME_CMD | TAKE_CARD=98 | partial | no |  |
| `sendGhostTarget` | `ddt/manager/GameInSocketOut.as` | 91 GAME_CMD | GHOST_TARGET=54 | partial | no |  |
| `sendKillSelf` | — | 91 GAME_CMD | KILLSELF=21 | partial | no |  |
| `sendLoadingProgress` | `ddt/manager/GameInSocketOut.as` | 91 GAME_CMD | LOAD=16 | partial | no |  |
| `sendMissionTryAgain` | `ddt/manager/GameInSocketOut.as` | 91 91 |  | partial | no |  |
| `sendPassStory` | `ddt/manager/GameInSocketOut.as` | 91 GAME_CMD | PASS_STORY=133 | partial | no |  |
| `sendPaymentTakeCard` | `ddt/manager/GameInSocketOut.as` | 91 GAME_CMD | PAYMENT_TAKE_CARD=114 | partial | no |  |
| `sendPetSkill` | `game/view/prop/PetSkillBar.as` | 91 GAME_CMD | PET_SKILL=144 | partial | no |  |
| `sendShootTag` | `ddt/manager/GameInSocketOut.as` | 91 GAME_CMD | FIRE_TAG=96 | partial | no |  |
| `sendSuicide` | — | 91 GAME_CMD | SUICIDE=17 | partial | no |  |
| `sendTransmissionGate` | `ddt/manager/GameInSocketOut.as` | 91 GAME_CMD | DELIVER=137 | partial | no |  |
| `sendUpdatePlayStep` | `ddt/manager/GameInSocketOut.as` | 91 GAME_CMD | MISSION_CMD=25 | partial | no |  |
| `useDeputyWeapon` | — | 91 GAME_CMD | USE_DEPUTY_WEAPON=84 | partial | no |  |
| `sendWorldBossRoomStauts` | `game/actions/MissionOverAction.as`<br>`worldboss/WorldBossManager.as`<br>`worldboss/view/WorldBossFightRoomState.as` (+1) | 102 WORLDBOSS_CMD | STAUTS=36 | partial | yes | Luta PvE tipo 14 com o script do dragão portado (ACDragon/AC1243/WorldAcientDragon do DDT-6600 em packages/fight/src/pve/scripts/manual/worldboss.ts): o dragão aparece, fala e ataca (71087 de dano), HP inicial = HP global restante. Desvio: o jogador age antes do dragão (no 6600 o dragão one-shotava antes). Estado 3 não tira mais o jogador da sala do boss (corrigido: reviver dava 'Xu insuficiente'). — evidência: research/e2e/batch3/39-wb1.png, research/e2e/batch3/40-wb-myturn.png, research/e2e/batch3/45-wb-shot2.png |
| `sendGetTropToBag` | `game/view/card/TakeOutCardController.as` | 108 GAME_TAKE_TEMP |  | missing | no |  |
| `sendGetTropToBag` | `game/view/card/TakeOutCardController.as` | 108 GAME_TAKE_TEMP |  | missing | no |  |
| `sendDefyAffiche` | `game/view/DefyAfficheViewFrame.as` | 123 DEFY_AFFICHE |  | missing | no |  |

## Configurações

| Função (botão) | Arquivo(s) do cliente | Código | Sub | Servidor | Cliente verificado | Notas |
|---|---|---|---|---|---|---|
| `sendOpition` | `setting/view/SettingView.as` | 64 OPTION_UPDATE |  | ok | no |  |
| `sendCIDInfo` | `ddt/view/enthrall/ValidateFrame.as` | 224 CID_CHECK |  | missing | no |  |

## Conta/Login

| Função (botão) | Arquivo(s) do cliente | Código | Sub | Servidor | Cliente verificado | Notas |
|---|---|---|---|---|---|---|
| `sendLogin` | `ddt/manager/SocketManager.as` | 1 LOGIN | Version.Build=5498628 | ok | no |  |
| `sendPint` | `ddt/manager/SocketManager.as` | 4 PING |  | ok | no |  |
| `sendBagLocked` | `baglocked/BagLockedController.as`<br>`ddt/manager/ServerManager.as` | 25 BAG_LOCKED |  | missing | no |  |
| `sendCheckCode` | `ddt/view/CheckCodeFrame.as` | 200 CHECK_CODE |  | missing | no |  |
| `sendEnterRoom` | `church/controller/ChurchRoomListController.as`<br>`church/view/weddingRoomList/WeddingRoomListNavView.as`<br>`church/view/weddingRoomList/frame/WeddingRoomEnterConfirmView.as` (+2) | 242 MARRY_ROOM_LOGIN |  | ok | no |  |
| `sendpkgCheckHack` | `ddt/manager/CheckSpeedManager.as` | 300 300 |  | ok | no |  |

## Correio

| Função (botão) | Arquivo(s) do cliente | Código | Sub | Servidor | Cliente verificado | Notas |
|---|---|---|---|---|---|---|
| `sendDeleteMail` | `email/manager/MailManager.as` | 112 DELETE_MAIL |  | ok | no |  |
| `sendGetMail` | `email/manager/MailManager.as` | 113 GET_MAIL_ATTACHMENT |  | ok | no |  |
| `sendUpdateMail` | `email/manager/MailManager.as` | 114 UPDATE_MAIL |  | ok | no |  |
| `sendEmail` | `email/manager/MailManager.as` | 116 SEND_MAIL |  | ok | no |  |
| `untreadEmail` | — | 118 MAIL_CANCEL |  | ok | no |  |
| `sendConsortionMail` | `consortion/view/selfConsortia/ConsortionMailFrame.as` | 129 CONSORTIA_CMD | CONSORTION_MAIL=29 | ok | no |  |
| `sendReloadGift` | `email/manager/MailManager.as` | 214 USER_RELOAD_GIFT |  | missing | no |  |

## Escola/Aprendiz

| Função (botão) | Arquivo(s) do cliente | Código | Sub | Servidor | Cliente verificado | Notas |
|---|---|---|---|---|---|---|
| `sendAcademyFireApprentice` | `ddt/view/academyCommon/myAcademy/myAcademyItem/MyAcademyApprenticeItem.as` | 141 AcademyPackageType.ACADEMY_FATHER | FIRE_APPRENTICE=13 | ok | no | 20000 ouro (checado antes; o C# cobrava mesmo se falhasse), congela AcademyMasterFreezeHours. |
| `sendAcademyFireMaster` | `ddt/view/academyCommon/myAcademy/myAcademyItem/MyAcademyMasterItem.as` | 141 AcademyPackageType.ACADEMY_FATHER | FIRE_MASTER=12 | ok | no | 10000 ouro, congela AcademyApprenticeFreezeHours. |
| `sendAcademyRegister` | `ddt/view/academyCommon/register/AcademyRegisterFrame.as` | 141 AcademyPackageType.ACADEMY_FATHER | ACADEMY_REGISTER=1 | ok | no | No-op como no original: a lista (ApprenticeshipClubList.ashx, agora portada) mostra todos os elegíveis. |
| `sendAcademyRemoveRegister` | — | 141 AcademyPackageType.ACADEMY_FATHER | ACADEMY_REMOVE=3 | ok | no |  |

## Eventos/Atividades

| Função (botão) | Arquivo(s) do cliente | Código | Sub | Servidor | Cliente verificado | Notas |
|---|---|---|---|---|---|---|
| `sendOpenDead` | `ddt/view/caddyII/bead/BeadViewII.as`<br>`ddt/view/caddyII/offerPack/OfferPackViewII.as` | 26 LOTTERY_OPEN_BOX |  | ok | no | LOTTERY_OPEN_BOX implementado (apps/game/src/handlers/activities.ts): num=-1 abre o tabuleiro de 18 slots (item 112019/190000, ItemBoxMgr.FindLotteryItemBoxByRand portado em pickLotteryBoard); num=templateId abre um rương direto via createItemBox (reuso de use.ts), chaves 11456×4 para 112047/112100/112101 (Sys_Users_Extra.TotalCaddyOpen incrementado). Testado por código (activities.test.ts), não clicado no cliente real (orçamento de tokens estrito desta sessão). |
| `sendRouletteBox` | `ddt/manager/RouletteManager.as`<br>`ddt/view/caddyII/CaddyViewII.as` | 26 LOTTERY_OPEN_BOX |  | ok | no | Mesmo handler que sendOpenDead (código 26 LOTTERY_OPEN_BOX) — ver nota lá. |
| `sendStartTurn` | `ddt/view/roulette/RouletteView.as`<br>`surpriseRoulette/view/SurpriseRouletteView.as` | 27 LOTTERY_RANDOM_SELECT |  | ok | no | LOTTERY_RANDOM_SELECT implementado: 1 carta por sorteio do tabuleiro de 18, máx. 8 sorteios, custo de chave escalonado (sorteio N consome N chaves, igual ao original — LotteryRandomSelectHandler.cs). Testado por código, não clicado. |
| `sendFinishRoulette` | `ddt/view/caddyII/CaddyFrame.as`<br>`ddt/view/caddyII/CardBoxFrame.as`<br>`ddt/view/roulette/RouletteView.as` (+1) | 28 LOTTERY_FINISH |  | ok | no | LOTTERY_FINISH implementado: move CaddyBag + LotteryAwardList pras bolsas reais (sobra por correio), ResetLottery. Testado por código, não clicado. |
| `sendQequestBadLuck` | `ddt/view/caddyII/badLuck/CaddyBadLuckView.as` | 45 CADDY_GET_BADLUCK |  | ok | no | CADDY_GET_BADLUCK implementado: ranking top 20 por Sys_Users_Extra.TotalCaddyOpen (WorldMgr.CaddyRank). Testado por código, não clicado. |
| `sendGetTimeBox` | `ddt/manager/BossBoxManager.as`<br>`ddt/view/bossbox/BossBoxView.as` | 53 GET_TIME_BOX |  | ok | no | Caixa de tempo online: minutos contados no servidor desde o login/última caixa (o original confiava no relatório do cliente), 1x por caixa/dia; caixa de nível 1x por nível. Coberto por events.test.ts. No cliente o contador do hall (00:15:00) aparece; prêmio vem de Shop_Goods_Box. |
| `sendChickActivationGetAward` | `chickActivation/view/ChickActivationViewFrame.as` | 84 ACTIVITY_PACKAGE | ChickActivationType.CHICKACTIVATION=2 | missing | no |  |
| `sendChickActivationOpenKey` | `chickActivation/view/ChickActivationViewFrame.as` | 84 ACTIVITY_PACKAGE | ChickActivationType.CHICKACTIVATION=2 | missing | no |  |
| `sendChickActivationQuery` | `chickActivation/ChickActivationManager.as` | 84 ACTIVITY_PACKAGE | ChickActivationType.CHICKACTIVATION=2 | missing | no |  |
| `sendChickenBoxTakeOverCard` | `newChickenBox/view/NewChickenBoxView.as` | 87 NEWCHICKENBOX_SYS | TAKEOVERCARD=13 | partial | no | Ver 87:sendNewChickenBox. TAKEOVERCARD: custo escalonado (openCardPrice[canOpenCounts-1]), item entregue, 5 usos. |
| `sendChickenBoxUseEagleEye` | `newChickenBox/view/NewChickenBoxView.as` | 87 NEWCHICKENBOX_SYS | USEEAGLEEYE=11 | partial | no | Ver 87:sendNewChickenBox. USEEAGLEEYE: custo escalonado (eagleEyePrice), revela a carta sem consumir. |
| `sendClickStartBntNewChickenBox` | `newChickenBox/view/NewChickenBoxFrame.as` | 87 NEWCHICKENBOX_SYS | CLICKSTARTBNT=15 | partial | no | Ver 87:sendNewChickenBox. CLICKSTARTBNT: embaralha as posições do tabuleiro (RandomPosition portado). |
| `sendFlushNewChickenBox` | `newChickenBox/view/NewChickenBoxFrame.as` | 87 NEWCHICKENBOX_SYS | FLUSHCHICKENVIEW=14 | partial | no | Ver 87:sendNewChickenBox. FLUSHCHICKENVIEW: grátis se passaram 120 min desde o último flush (IsFreeFlushTime), senão cobra flushPrice. |
| `sendLuckyStarClose` | `luckStar/manager/LuckStarManager.as` | 87 NEWCHICKENBOX_SYS | CLOSE_GAME=32 | partial | no | CLOSE_GAME: no-op, igual ao original (ChickenBoxHandler.cs case CLOSE_GAME está vazio). |
| `sendLuckyStarEnter` | `luckStar/manager/LuckStarManager.as` | 87 NEWCHICKENBOX_SYS | ENTER_GAME=31 | partial | no | Lucky Star (mesmo código 87): ENTER_GAME cobra 2500 Xu, sorteia o tabuleiro de 14 (coinTemplateID 201193 forçado na posição 0, PlayerActives.CreateLuckyStartAward). Pool configurável via kind="luckystar". |
| `sendLuckyStarTurn` | `luckStar/view/LuckStarFrame.as` | 87 NEWCHICKENBOX_SYS | START_TURN=33 | partial | no | START_TURN: cooldown de 7s, consome item 201192 (LUCKYSTAR_ID), embaralha o tabuleiro e sorteia por peso (.Random); se cair na moeda, 97% de chance de re-sortear excluindo a moeda (GetAward portado). |
| `sendLuckyStarTurnComplete` | `luckStar/view/LuckStarFrame.as` | 87 NEWCHICKENBOX_SYS | TURN_COMPLETE=34 | partial | no | TURN_COMPLETE: entrega o prêmio sorteado (moeda credita Xu acumulado; outros itens vão pra bolsa, sobra por correio). |
| `sendNewChickenBox` | `newChickenBox/controller/NewChickenBoxManager.as` | 87 NEWCHICKENBOX_SYS | ENTERCHICKENVIEW=10 | partial | no | NEWCHICKENBOX_SYS implementado (apps/game/src/handlers/activities.ts): tabuleiro de 18 cartas (ChickenBoxHandler.cs portado), pool configurável via app."ScheduledEvents" kind="chickenbox" (admin Events page) com defaults embutidos. Estado em memória (não persistido em New_ChickenBox_Data — desvio documentado em HANDLERS.md). Testado por código, não clicado. |
| `sendOverShowItems` | `newChickenBox/controller/NewChickenBoxManager.as` | 87 NEWCHICKENBOX_SYS | AllITEMSHOW=12 | partial | no | Ver 87:sendNewChickenBox. ALLITEMSHOW: reenvia a lista atual do tabuleiro. |
| `sendCardLotteryIds` | `lottery/view/CardChooseRightView.as` | 104 CARD_LOTTERY |  | missing | no | Morto no original: ePackageType.CARD_LOTTERY=104 existe mas nenhuma classe [PacketHandler] assina esse código (grep em vendor/DDTank41/Game.Server/Packets/Client) — pacote é descartado pelo servidor original. Status 'missing' aqui é fidelidade, não lacuna. |
| `sendLuckLottery` | `lottery/LotteryContorller.as` | 105 LUCK_LOTTERY |  | missing | no | Morto no original: mesma situação de 104 (ePackageType.LUCK_LOTTERY=105 sem handler registrado). |
| `sendStartTurn_LeftGun` | `roulette/RouletteFrame.as` | 128 LEFT_GUN_ROULETTE_SOCKET |  | stub | no | Morto no próprio original: LeftGunHandler.cs está registrado (PacketHandler 128) mas todo o corpo está comentado — o recurso 'roleta esquerda' foi desativado pelo time original, não processa nada. Port: sem handler (mesmo efeito observável). |
| `sendEndTurn_LeftGun` | `roulette/RouletteFrame.as` | 130 LEFT_GUN_ROULETTE_COMPLETTE |  | stub | no | Mesma desativação do original que 128 (LeftGunCompleteHandler.cs só envia um aviso se LeftRoutteRate>0, campo nunca setado porque 128 está morto). |
| `sendGuildMemberWeekAddRanking` | `guildMemberWeek/controller/GuildMemberWeekController.as` | 145 GUILDMEMBERWEEK_SYSTEM | SEND_ADDRUNKING=10 | stub | no | Morto no próprio original: ActiveSystemHandler.cs (código 145 ACTIVITY_SYSTEM) só trata sub==8 (monta um pacote PLAYERTOP10 e NUNCA chama SendTCP — o cliente nunca recebe resposta); subs 9/10 (GuildMemberWeek) e os de LanternRiddles/LightRoad caem no 'return 0' default sem nenhum efeito. Confirmado lendo o arquivo inteiro (18 linhas). |
| `sendGuildMemberWeekStarClose` | `guildMemberWeek/manager/GuildMemberWeekManager.as` | 145 GUILDMEMBERWEEK_SYSTEM | CLOSE=9 | stub | no | Ver 145:sendGuildMemberWeekAddRanking — mesmo no-op do original. |
| `sendGuildMemberWeekStarEnter` | `guildMemberWeek/manager/GuildMemberWeekManager.as` | 145 GUILDMEMBERWEEK_SYSTEM | ENTER_GAME=8 | stub | no | Ver 145:sendGuildMemberWeekAddRanking — mesmo no-op do original. |
| `sendLanternRiddlesQuestion` | `lanternriddles/view/LanternRiddlesView.as` | 145 ACTIVITY_SYSTEM |  | stub | no | Ver 145:sendGuildMemberWeekAddRanking — mesmo no-op do original. |
| `sendLanternRiddlesRankInfo` | `lanternriddles/view/LanternRiddlesView.as` | 145 ACTIVITY_SYSTEM |  | stub | no | Ver 145:sendGuildMemberWeekAddRanking — mesmo no-op do original. |
| `sendLanternRiddlesUseSkill` | `lanternriddles/view/LanternRiddlesView.as` | 145 ACTIVITY_SYSTEM | LANTERNRIDDLES_SKILL=41 | stub | no | Ver 145:sendGuildMemberWeekAddRanking — mesmo no-op do original. |
| `sendLightRoadStarEnter` | `lightRoad/manager/LightRoadManager.as` | 145 LIGHTROAD_SYSTEM | ENTER_GAME=64 | stub | no | Ver 145:sendGuildMemberWeekAddRanking — mesmo no-op do original. |
| `sendOpenAll` | `ddt/view/caddyII/CaddyBagView.as` | 204 OPEN_ALL_CARDBOX |  | ok | no | OPEN_ALL_CARDBOX implementado: cada item da CaddyBag -> CardBag.addCard(Property5, rand 1..2), igual ao original (OpenAllCardBoxHandler.cs). Testado por código, não clicado. |
| `sendOpenCardBox` | `ddt/view/caddyII/card/CardViewII.as` | 216 CARDS_DATA |  | ok | yes | Caixa de cartas aberta → carta na bolsa de cartas (216). — evidência: research/e2e/batch4/11-cardbox-open.png, research/e2e/batch4/12-cardbag.png |
| `sendWeeklyClick` | `times/TimesManager.as` | 219 WEEKLY_CLICK_CNT |  | ok | no | Como o original (LastGetEgg). |
| `sendBuyGift` | `giftSystem/view/ClearingInterface.as` | 221 USER_SEND_GIFTS |  | ok | yes | Varredura do básico pt.2 (2026-10-02): 221 USER_SEND_GIFTS implementado (apps/game/src/handlers/items.ts sendGift, UserSendGiftHandler.cs). Verificado no cliente real: Thur (grade temporariamente 20 via qa-setup para liberar a aba Hộp quà, nível mínimo 16) comprou 'Hoa Mẫu đơn' (100 Xu) e enviou pra Bob pelo fluxo giftSystem (ClearingInterface, campo Tặng cho + autocomplete). Confirmado: Xu de Thur caiu exatamente 100 (99900), Bob.charmGP 0→10, linha em Sys_Users_Gift (SenderID 1, ReceiverID 34, TemplateID 325203, Count 1), mail tipo 55 'Bạn gửi tặng...' entregue pra Bob. Teste automatizado também em test/handlers.test.ts "shop" > "221 USER_SEND_GIFTS". |
| `sendSellAll` | `ddt/view/caddyII/CaddyBagView.as`<br>`ddt/view/caddyII/CaddyFrame.as`<br>`ddt/view/caddyII/CardBoxFrame.as` | 232 CADDY_SELL_ALL_GOODS |  | ok | no | Código 232 = CaddyClearAllHandler.cs no original (nome do pacote no cliente não corresponde ao nome da classe). Implementado: resgata cada item da CaddyBag por Ouro/Lễ kim via Item.ReclaimType/ReclaimValue, esvazia a bolsa. Testado por código, não clicado. |
| `gotoCardLottery` | — | 239 GOTO_CARD_LOTTERY |  | missing | no | Morto no original: ePackageType.GOTO_CARD_LOTTERY=239 sem handler registrado (mesma varredura de 104/105). |
| `sendRequestAwards` | `ddt/view/caddyII/reader/ReadAwardsView.as` | 245 CADDY_GET_AWARDS |  | ok | no |  |

## Fazenda

| Função (botão) | Arquivo(s) do cliente | Código | Sub | Servidor | Cliente verificado | Notas |
|---|---|---|---|---|---|---|
| `sendBuyPetExpItem` | `farm/viewx/FarmBuyExpFrame.as` | 68 PET | BUY_PET_EXP_ITEM=19 | partial | no |  |
| `doMature` | — | 81 FARM | ACCELERATE_FIELD=3 | partial | no |  |
| `enterFarm` | — | 81 FARM | ENTER_FARM=1 | partial | no |  |
| `exitFarm` | — | 81 FARM | EXIT_FARM=16 | partial | no |  |
| `fastForwardGrop` | — | 81 FARM | FRAM_GROP_FASTFORWARD=18 | partial | no |  |
| `giftPacks` | — | 81 FARM | FARM_GIFTPACKS=20 | partial | no |  |
| `seeding` | — | 81 FARM | GROW_FIELD=2 | partial | no |  |
| `sendBeginHelper` | `farm/viewx/helper/FarmHelperView.as`<br>`farm/viewx/helper/HelperBeginFrame.as` | 81 FARM | HELPER_SWITCH_FIELD=9 | partial | no |  |
| `sendCompose` | `farm/view/compose/FarmComposePnl.as` | 81 FARM | COMPOSE_FOOD=5 | partial | no |  |
| `toFarmHelper` | — | 81 FARM | HELPER_SWITCH_FIELD=9 | partial | no |  |
| `toGather` | — | 81 FARM | GAIN_FIELD=4 | partial | no |  |
| `toHelperRenewMoney` | — | 81 FARM | HELPER_PAY_FIELD=8 | partial | no |  |
| `toKillCrop` | — | 81 FARM | KILLCROP_FIELD=7 | partial | no |  |
| `toSpread` | — | 81 FARM | PAY_FIELD=6 | partial | no |  |

## Ferreiro

| Função (botão) | Arquivo(s) do cliente | Código | Sub | Servidor | Cliente verificado | Notas |
|---|---|---|---|---|---|---|
| `sendItemCompose` | `store/view/Compose/StoreIIComposeBG.as` | 58 ITEM_COMPOSE |  | partial | no | Implementado: taxa {80,50,30,10,5}% por qualidade (+1% sem amuleto), PRICE_COMPOSE_GOLD (1600). |
| `sendItemStrength` | `store/view/strength/StoreIIStrengthBG.as` | 59 ITEM_STRENGTHEN |  | partial | yes | Pedras nv 4/5 em arma: sucesso, +1 por clique, 1 pedra consumida por slot (desvio: C# consumia a pilha inteira), furo 1 abre no +3. — evidência: research/e2e/qa/b7-strengthen-tip.png, b8-weapon-tip.png, b11-inlay2.png |
| `sendItemTransfer` | `store/view/transfer/StoreIITransferBG.as` | 61 ITEM_TRANSFER |  | missing | no |  |
| `sendItemFusion` | `store/view/fusion/StoreIIFusionBG.as` | 78 ITEM_FUSION |  | ok | no | Implementado: prévia 76 + fusão 400 ouro (FusionMgr). |
| `necklaceStrength` | — | 95 NECKLACE_STRENGTH |  | missing | no |  |
| `sendWishBeadEquip` | `store/forge/wishBead/WishBeadMainView.as` | 106 WISHBEADEQUIP |  | missing | no |  |
| `sendItemTrend` | — | 120 ITEM_TREND |  | missing | no |  |
| `sendItemEmbed` | `store/view/embed/StoreEmbedBG.as` | 121 ITEM_INLAY |  | ok | no | Implementado (furo precisa estar aberto e tipo igual ao Property2 da gema); sem gema no personagem de teste para verificar no cliente. Varredura pt.3 (2026-10-02): agora chama `p.questInv?.onItemInsert()` em sucesso (`forge.ts` `inlay`), ligando a missão tipo 25 ItemInsertCondition (antes não portada) — testado por código/typecheck, não clicado (sem gema compatível com furo aberto no personagem de teste nesta sessão; furo tipo 0 na arma do Thur, única gema na bolsa era tipo 3). |
| `sendItemEmbedBackout` | `store/view/embed/StoreEmbedBG.as` | 125 ITEM_EMBED_BACKOUT |  | ok | no | Implementado: 500 Xu, gema volta vinculada, devolve itens do ferreiro. |
| `sendLatentEnergy` | `latentEnergy/LatentEnergyMainView.as` | 133 LATENT_ENERGY |  | missing | no |  |
| `sendItemExalt` | `store/view/exalt/StoreExaltBG.as` | 138 ITEM_ADVANCE |  | missing | no |  |
| `sendSaveDB` | `store/StoreMainView.as` | 172 SAVE_DB |  | ok | no |  |
| `fightSpiritRequest` | — | 209 FIGHT_SPIRIT | FIGHT_SPIRIT_INIT=1 | missing | no |  |
| `sendItemOpenFiveSixHole` | `store/view/embed/StoreEmbedBG.as` | 217 OPEN_FIVE_SIX_HOLE |  | missing | no |  |
| `sendForgeSuit` | `store/fineStore/view/FineForgeView.as` | 295 STORE_FINE_SUIT | FORGE_SUIT=1 | missing | no |  |
| `sendEquipGhost` | `store/equipGhost/EquipGhostManager.as` | 391 EQUIP_GHOST |  | missing | no |  |

## GvG/Liga

| Função (botão) | Arquivo(s) do cliente | Código | Sub | Servidor | Cliente verificado | Notas |
|---|---|---|---|---|---|---|
| `sendEliteGameStart` | `eliteGame/EliteGameController.as` | 162 ELITEGAME | ELITE_MATCH_RANK_START=2 | partial | no | Só com status 5 e nível ≥ 30 (EliteGameHandler); a partida de elite em si (salas 12/13, pontuação) não foi portada. |
| `sendGetEliteGameState` | `eliteGame/EliteGameController.as` | 162 ELITEGAME | ELITE_MATCH_TYPE=1 | partial | no | Estado do campeonato vem do agendador (app."ScheduledEvents" kind elite, status 5 quando aberto) e é empurrado (162/1) a todos ao abrir/fechar. |
| `sendGetPaarungDetail` | `eliteGame/view/EliteGamePaarungFrame.as` | 162 ELITEGAME | ELITE_MATCH_RANK_DETAIL=4 | partial | no | Lista de campeões vazia (sem chaveamento de elite). |
| `sendGetSelfRankSroce` | `eliteGame/EliteGameController.as` | 162 ELITEGAME | ELITE_MATCH_PLAYER_RANK=3 | partial | no | eliteRank/eliteScore de Sys_User_Match_Info. |

## Leilão

| Função (botão) | Arquivo(s) do cliente | Código | Sub | Servidor | Cliente verificado | Notas |
|---|---|---|---|---|---|---|
| `auctionGood` | — | 192 AUCTION_ADD |  | partial | no |  |
| `auctionBid` | — | 193 AUCTION_UPDATE |  | partial | no |  |
| `auctionCancelSell` | — | 194 AUCTION_DELETE |  | ok | no |  |

## Lobby/Chat/Bugle

| Função (botão) | Arquivo(s) do cliente | Código | Sub | Servidor | Cliente verificado | Notas |
|---|---|---|---|---|---|---|
| `sendMessage` | `ddt/manager/ChatManager.as` | 19 SCENE_CHAT |  | ok | no |  |
| `sendFace` | `ddt/manager/ChatManager.as` | 20 SCENE_FACE |  | ok | no |  |
| `sendExitScene` | `ddt/manager/GameInSocketOut.as` | 21 SCENE_REMOVE_USER |  | ok | no |  |
| `sendPrivateMessage` | `ddt/manager/ChatManager.as` | 37 CHAT_PERSONAL |  | ok | no |  |
| `sendGetScenePlayer` | `ddt/manager/GameInSocketOut.as` | 69 SCENE_USERS_LIST |  | ok | no |  |
| `sendSBugle` | `ddt/manager/ChatManager.as` | 71 S_BUGLE |  | ok | no |  |
| `sendBBugle` | `ddt/manager/ChatManager.as`<br>`ddt/view/chat/ChatBugleInputFrame.as` | 72 B_BUGLE |  | ok | no |  |
| `sendCBugle` | `ddt/manager/ChatManager.as` | 73 C_BUGLE |  | ok | no |  |
| `sendGetLinkGoodsInfo` | `ddt/view/chat/ChatOutputField.as` | 119 LINKREQUEST_GOODS |  | missing | no |  |
| `sendQuestCheck` | `auctionHouse/controller/AuctionHouseController.as`<br>`ddt/manager/ChatManager.as`<br>`ddt/manager/TaskManager.as` (+3) | 181 QUEST_CHECK |  | ok | no |  |

## Loja

| Função (botão) | Arquivo(s) do cliente | Código | Sub | Servidor | Cliente verificado | Notas |
|---|---|---|---|---|---|---|
| `sendBuyGoods` | `AvatarCollection/view/AvatarCollectionItemCell.as`<br>`chickActivation/view/ChickActivationViewFrame.as`<br>`consortion/view/selfConsortia/ConsortionShopItem.as` (+16) | 44 BUY_GOODS |  | ok | yes | Xu (money) e Lễ kim (giftToken) debitados e saldo atualiza na loja (corrigido pacote 38 sem petScore). Ouro/medalha/itens exigidos pelo mesmo caminho (GetItemPrice). Loja da guilda (ShopID 11-15): nível da loja + contribuição ≥ Consortia_Equip_Control verificados (compra ok). Varredura básico pt.1 (2026-10-02, só testes automatizados contra packets reais, não clicado no Ruffle): tiers A/B/C, duração (ValidDate dias) vs quantidade (Count) por BuyType, carrinho multi-linha sem falha parcial — `test/handlers.test.ts` "shop". Achado não corrigido: presente pra amigo (221 USER_SEND_GIFTS) não está registrado em handler nenhum. — evidência: research/e2e/qa/c6-shop-balance.png, research/e2e/guild/g43-shop-buy.png |
| `sendBuyGiftBag` | `store/view/strength/BuyGiftBagButton.as` | 46 BUY_GIFTBAG |  | missing | no |  |
| `sendSellGoods` | — | 48 SEll_GOODS |  | missing | no |  |
| `sendPresentGoods` | `shop/ShopController.as`<br>`shop/manager/ShopGiftsManager.as` | 57 GOODS_PRESENT |  | missing | no |  |
| `sendQuickBuyGoldBox` | `ddt/command/QuickBuyFrame.as` | 126 BUY_QUICK_GOLDBOX |  | missing | no |  |
| `sendFriendState` | `ddt/manager/PlayerStateManager.as`<br>`im/StateIconButton.as`<br>`labyrinth/view/CleanOutFrame.as` (+1) | 160 IM_CMD | FRIEND_STATE=165 | ok | no |  |
| `sendCurrentState` | `church/controller/ChurchRoomController.as`<br>`civil/CivilController.as`<br>`consortion/ConsortionControl.as` (+3) | 251 SCENE_STATE |  | partial | no |  |

## Missões

| Função (botão) | Arquivo(s) do cliente | Código | Sub | Servidor | Cliente verificado | Notas |
|---|---|---|---|---|---|---|
| `sendErrorMsg` | `calendar/CalendarManager.as`<br>`calendar/view/goodsExchange/GoodsExchangeView.as`<br>`ddt/bagStore/BagStoreFrame.as` (+13) | 8 CLIENT_LOG |  | ok | no |  |
| `sendDailyAward` | `calendar/CalendarManager.as`<br>`hall/HallStateView.as`<br>`times/TimesManager.as` (+1) | 13 DAILY_AWARD |  | ok | yes | Tipo 5 (presença no calendário) marca o dia em DailyLogList uma vez por dia (o original aceitava várias); tipo 0 "Nhận mỗi ngày" dá o buff Daily_Award tipo 0 uma vez por dia; 2 ovo e 3 caixa VIP também com claim diário (app."EventClaims"). — evidência: research/e2e/events/e3-signed.png, e5-daily-claimed.png |
| `syncStep` | — | 15 USER_ANSWER |  | missing | no |  |
| `syncWeakStep` | — | 15 USER_ANSWER |  | missing | no |  |
| `sendPicc` | `calendar/view/ActivityState.as` | 30 PICC |  | ok | no |  |
| `sendGoodsExchange` | `calendar/view/goodsExchange/GoodsExchangeView.as` | 31 GOODS_EXCHANGE |  | missing | no |  |
| `sendCollectInfoValidate` | `quest/InfoCollectView.as` | 32 COLLECTINFO |  | missing | no |  |
| `sendQuestionReply` | `ddt/manager/QuestionInfoMannager.as` | 89 QUESTION_REPLY |  | missing | no |  |
| `sendSignAward` | `calendar/CalendarManager.as` | 90 GET_SIGNAWARD |  | ok | no | Prêmio por N presenças no mês (Daily_Award tipos 1/7 com AwardDays=N): exige N dias marcados e paga uma vez por mês+tier (o C# duplicava itens no loop). Coberto por apps/game/test/events.test.ts; no cliente só dispara ao atingir 3/6/12/18 presenças. |
| `labyrinthRequestUpdate` | — | 131 LABYRINTH | REQUEST_UPDATE=2 | partial | no | LABYRINTH implementado como camada administrativa/econômica (apps/game/src/handlers/activities.ts + Sys_Users_Labyrinth): sub 1 DOUBLE_REWARD, 2 REQUEST_UPDATE, 3 CLEAN_OUT, 4 SPEEDED_UP, 5 STOP, 6 RESET, 9 TRY_AGAIN. Desvio documentado: o contador de andar por tempo real (Timer de 1s do original) é liquidado instantaneamente no CLEAN_OUT em vez de um timer por jogador; `myProgress` (andares vencidos em combate real) fica em 0 pra todo mundo até o tipo de sala PvE do labirinto ser portado — ver HANDLERS.md. Testado por código (activities.test.ts), não clicado. |
| `sendAcademyApprentice` | `ddt/view/academyCommon/academyRequest/AcademyRequestMasterFrame.as` | 141 AcademyPackageType.ACADEMY_FATHER | ACADEMY_FOR_APPRENTICE=4 | ok | yes | Pedido de aprendiz → mestre recebe 141/4 (AcademyMgr em memória, 1 h). — evidência: research/e2e/batch3/23-bob-academy.png, research/e2e/batch3/24-bob-ask.png, research/e2e/batch3/25-thur-request.png |
| `sendAcademyApprenticeConfirm` | `ddt/view/academyCommon/academyRequest/AcademyAnswerApprenticeFrame.as` | 141 AcademyPackageType.ACADEMY_FATHER | APPRENTICE_CONFIRM=7 | ok | no |  |
| `sendAcademyMaster` | `ddt/view/academyCommon/academyRequest/AcademyRequestApprenticeFrame.as` | 141 AcademyPackageType.ACADEMY_FATHER | ACADEMY_FOR_MASTER=5 | ok | no |  |
| `sendAcademyMasterConfirm` | `ddt/view/academyCommon/academyRequest/AcademyAnswerMasterFrame.as` | 141 AcademyPackageType.ACADEMY_FATHER | MASTER_CONFIRM=6 | ok | yes | Mestre aceita: 141/10 para os dois, Sys_Users_Detail atualizado (masterID/masterOrApprentices/estado), aviso 141/17 + correio. Formatura no nível 20: caixas por nível (AcademyApprenticeAward/MasterAward), prêmios de conclusão, graduatesCount+1 (test/academy.test.ts). — evidência: research/e2e/batch3/26-thur-accept.png, research/e2e/batch3/27-bob-accepted.png |
| `sendLanternRiddlesAnswer` | `lanternriddles/view/QuestionView.as` | 145 ACTIVITY_SYSTEM | LANTERNRIDDLES_ANSWER=40 | stub | no | Ver 145:sendGuildMemberWeekAddRanking — mesmo no-op do original. |
| `sendUserLuckyNum` | `calendar/CalendarManager.as`<br>`calendar/view/LuckyNumBar.as` | 161 USER_LUCKYNUM |  | ok | no |  |
| `sendQuestAdd` | `ddt/manager/TaskManager.as` | 176 QUEST_ADD |  | ok | no |  |
| `sendQuestRemove` | — | 177 QUEST_REMOVE |  | ok | no |  |
| `sendQuestFinish` | `ddt/manager/TaskManager.as`<br>`quest/TaskMainFrame.as` | 179 QUEST_FINISH |  | ok | yes | Varredura pt.3 (2026-10-02): root cause achado em `apps/game/src/game/quests.ts` `condCompleted` — tipo 18 (OwnConsortiaCondition, 'Hiệu lệnh guild'/'Gia nhập 1 guild', Quest_Condiction QuestID 339 Para1=0 Para2=1) nunca tinha sido portado; e tipos 3/9/11/19 (UsingItemCondition 'Thử nghiệm tu luyện' QuestID 8, ItemStrengthenCondition, ItemFusionCondition, ItemComposeCondition) já decrementavam via onUsingItem/onItemStrengthen/onItemFusion/onItemCompose mas estavam faltando no bucket 'completo quando valor<=0' do switch — o contador zerava e o claim nunca via como pronto. Todos corrigidos (18 avaliado on-demand como grade/owned-item: Para1 0 member count [ConsortiaID!=0, único Para2 real é 1], 1 riches, 2/3/4 smith/shop/store level; 3/9/11/19 adicionados ao bucket). Também adicionado tipo 25 (ItemInsertCondition) ligado ao handler de engaste (forge.ts inlay). Confirmado no cliente real: 'Nhận thưởng' nas duas missões OK!! (339 guild, 8 poção de treino) agora completa — `QuestData.IsComplete=true`, `CompletedDate` novo — e persiste na hora (179 agora chama `saveIntoDatabase` após o claim, não esperava mais o autosave de 10 min). |
| `sendRequestUpdate` | `effortView/EffortMainFrame.as` | 225 REQUEST_UPDATE |  | ok | no |  |
| `sendAchievementFinish` | `ddt/manager/EffortManager.as` | 230 ACHIEVEMENT_FINISH |  | ok | yes | O cliente envia ao completar; o servidor confere AchievementCondition × registros (Sys_Users_Record, tipos de snapshot: ataque/defesa/agilidade/sorte/FC/nível/partidas/vitórias/tempo online/dias de login) e grava AchievementData uma vez; pontos de conquista somados. Correção: o 228 precisa trazer todos os tipos de registro (o EffortManager quebrava com null e nada completava). Título (RewardType 1) só anunciado. — evidência: research/e2e/events/e25-achievement.png |
| `requestRefund` | — | 249 MARRY_CMD | MARRYROOMSENDGIFT=12 | partial | no |  |
| `sendAccumulativeLoginAward` | `accumulativeLogin/view/AccumulativeLoginView.as` | 338 ACCUMULATIVELOGIN_AWARD |  | ok | no | Login_Award_Item_Template (Type = dia, dia 7 = item escolhido); dias contados 1x/dia no login (máx. 7), prêmio 1x por dia (EventClaims). |

## Outros

| Função (botão) | Arquivo(s) do cliente | Código | Sub | Servidor | Cliente verificado | Notas |
|---|---|---|---|---|---|---|
| `sendDailyRecord` | `ddt/dailyRecord/DailyRecordControl.as` | 103 DAILYRECORD |  | ok | no | Devolve e apaga as linhas de DailyRecordInfo (como o original). |
| `sendItemLianhua` | — | 110 ITEM_REFINERY |  | missing | no |  |
| `arrange` | — | 135 135 |  | missing | no |  |
| `lightRoadPointWork` | — | 145 LIGHTROAD_SYSTEM | BECHOOSE_POINT=66 | missing | no |  |
| `sendLookupEffort` | `ddt/manager/EffortManager.as` | 203 LOOKUP_EFFORT |  | missing | no |  |
| `figSpiritUpGrade` | — | 209 FIGHT_SPIRIT | FIGHT_SPIRIT_LEVELUP=3 | missing | no |  |
| `sendUseLog` | — | 213 USE_LOG |  | ok | no |  |
| `sendCIDCheck` | — | 224 CID_CHECK |  | missing | no |  |
| `sendForSwitch` | — | 225 ENTHRALL_SWITCH |  | ok | no |  |
| `sendRegisterInfo` | `civil/view/CivilRegisterFrame.as`<br>`civil/view/CivilRightView.as` | 236 MARRYINFO_ADD |  | ok | no |  |
| `sendModifyInfo` | `civil/view/CivilRegisterFrame.as` | 237 MARRYINFO_UPDATE |  | ok | no |  |
| `refund` | — | 249 MARRY_CMD | MARRYROOMSENDGIFT=12 | partial | no |  |
| `sendNoviceActivityGetAward` | `ddt/manager/GameInSocketOut.as` | 258 NOVICEACTIVITY |  | partial | no | NOVICEACTIVITY implementado simplificado: usa as mesmas tabelas Event_Reward_Info/Goods do 259 (firstRecharge), elegibilidade = Grade do jogador >= Condition (o contador de progresso por PlayerExtra — nível/fortalecimento/recarga/VIP/FC — não foi portado; ver HANDLERS.md). Claim idempotente por (ActivityType, Condition) via app."EventClaims". Testado por código, não clicado. |
| `sendFirstRechargeGetAward` | `ddt/manager/GameInSocketOut.as` | 259 FIRSTRECHARGE |  | ok | yes | Sem pagamentos reais: o presente de primeira recarga é grátis e único (FIRST_RECHARGE_FREE=false volta ao original). Itens em Event_Reward_Goods tipo 7/1 (editáveis no admin); o ícone some após resgatar. — evidência: research/e2e/events/e11-firstrecharge.png, e12-firstrecharge-claimed.png |
| `sendBringUpEat` | `ddt/manager/GameInSocketOut.as` | 308 EQUIP_BRING_UP |  | missing | no |  |
| `sendBringUpLockStatusUpdate` | `ddt/manager/GameInSocketOut.as` | 313 ITEM_CELL_IS_LOCKED |  | missing | no |  |

## Personagem/FC

| Função (botão) | Arquivo(s) do cliente | Código | Sub | Servidor | Cliente verificado | Notas |
|---|---|---|---|---|---|---|
| `showHideTitleState` | — | 279 279 |  | ok | no |  |
| `sendAvatarCollectionActive` | `AvatarCollection/view/AvatarCollectionItemCell.as` | 402 AVATAR_COLLECTION | ACTIVE=3 | missing | no |  |
| `sendAvatarCollectionDelayTime` | `AvatarCollection/view/AvatarCollectionTimeView.as` | 402 AVATAR_COLLECTION | DELAY_TIME=4 | missing | no |  |

## Pets

| Função (botão) | Arquivo(s) do cliente | Código | Sub | Servidor | Cliente verificado | Notas |
|---|---|---|---|---|---|---|
| `addPetEquip` | — | 68 PET | ADD_PET_EQUIP=20 | partial | no |  |
| `delPetEquip` | — | 68 PET | DEL_PET_EQUIP=21 | partial | no |  |
| `eatPetsHandler` | — | 68 PET | EAT_PETS=33 | partial | no |  |
| `sendAdoptPet` | `petsBag/view/AdoptPetsGuideView.as`<br>`petsBag/view/AdoptPetsView.as` | 68 PET | ADOPT_PET=6 | partial | no |  |
| `sendEquipPetSkill` | `petsBag/view/PetGameSkillPnl.as`<br>`petsBag/view/PetSkillPnl.as`<br>`petsBag/view/item/SkillItem.as` | 68 PET | EQUIP_PET_SKILL=7 | partial | no | EquipSkillPet (slot 4 VIP 7) — servidor, não clicado no cliente. |
| `sendPaySkill` | `petsBag/view/PetGameSkillPnl.as` | 68 PET | PAY_SKILL=16 | partial | no |  |
| `sendPetEvolution` | `petsBag/petsAdvanced/PetsAdvancedView.as` | 68 PET | PET_EVOLUTION=23 | partial | no |  |
| `sendPetFeed` | `petsBag/view/PetsBagOutView.as` | 68 PET | FEED_PET=4 | partial | yes | Comida via StoreBag (split 49 corrigido) → FeedPet: nível/fome, mensagem. — evidência: research/e2e/batch4/10-feed.png |
| `sendPetFightUnFight` | `pet/sprite/PetSpriteController.as`<br>`petsBag/view/PetsBagOutView.as` | 68 PET | FIGHT_PET=17 | partial | yes | Pet de batalha (FightPet): stats somam no FC, pet segue o personagem no salão. — evidência: research/e2e/batch4/09-pet-fight-skill.png, research/e2e/batch4/34-reload.png |
| `sendPetFollowOrCall` | `petsBag/petsAdvanced/PetsFormPetsItem.as` | 68 PET | PET_FOLLOW=25 | partial | no |  |
| `sendPetFormInfo` | `petsBag/petsAdvanced/PetsFormView.as` | 68 PET | PET_FORMINFO=24 | partial | no |  |
| `sendPetRename` | `petsBag/view/PetsBagOutView.as` | 68 PET | RENAME_PET=9 | partial | no | RenamePet (ChangeNameCost Xu) — servidor, não clicado no cliente. |
| `sendPetRisingStar` | `petsBag/petsAdvanced/PetsAdvancedView.as` | 68 PET | PET_RISINGSTAR=22 | partial | no |  |
| `sendPetWake` | `petsBag/petsAdvanced/PetsFormPetsItem.as` | 68 PET | PET_WAKE=32 | partial | no |  |
| `sendRefreshPet` | `petsBag/view/AdoptPetsGuideView.as`<br>`petsBag/view/AdoptPetsView.as` | 68 PET | REFRESH_PET=5 | partial | no |  |
| `sendReleasePet` | `petsBag/view/PetsBagOutView.as` | 68 PET | RELEASE_PET=8 | partial | no | ReleasePet (IsExit=0, 12656×WashGetCount) — servidor, não clicado no cliente. |
| `sendRevertPet` | `petsBag/view/PetsBagOutView.as` | 68 PET | REVER_PET=18 | partial | no |  |

## PvE/Masmorras

| Função (botão) | Arquivo(s) do cliente | Código | Sub | Servidor | Cliente verificado | Notas |
|---|---|---|---|---|---|---|
| `sendBeginFightNpc` | — | 50 FIGHT_NPC |  | missing | no |  |
| `sendGameMissionStart` | `ddt/manager/GameInSocketOut.as` | 82 CrazyTankPackageType.GAME_MISSION_START |  | missing | no |  |
| `labyrinthCleanOut` | — | 131 LABYRINTH | CLEAN_OUT=3 | partial | no |  |
| `labyrinthCleanOutTimerComplete` | — | 131 LABYRINTH | CLEAN_OUT_COMPLETE=8 | partial | no |  |
| `labyrinthDouble` | — | 131 LABYRINTH | DOUBLE_REWARD=1 | partial | no |  |
| `labyrinthReset` | — | 131 LABYRINTH | RESET_LABYRINTH=6 | partial | no |  |
| `labyrinthSpeededUpCleanOut` | — | 131 LABYRINTH | SPEEDED_UP_CLEAN_OUT=4 | partial | no |  |
| `labyrinthStopCleanOut` | — | 131 LABYRINTH | STOP_CLEAN_OUT=5 | partial | no |  |
| `labyrinthTryAgain` | — | 131 LABYRINTH | TRY_AGAIN=9 | partial | no |  |

## Salas PvP

| Função (botão) | Arquivo(s) do cliente | Código | Sub | Servidor | Cliente verificado | Notas |
|---|---|---|---|---|---|---|
| `sendSceneLogin` | `hall/HallStateView.as`<br>`roomList/pveRoomList/DungeonListController.as`<br>`roomList/pvpRoomList/RoomListController.as` | 16 SCENE_LOGIN |  | ok | no |  |
| `sendBuyProp` | `room/view/RoomPropCell.as`<br>`room/view/states/FreshmanRoomState.as` | 54 PROP_BUY |  | missing | no |  |
| `sendBuyProp` | `room/view/RoomPropCell.as`<br>`room/view/states/FreshmanRoomState.as` | 54 PROP_BUY |  | missing | no |  |
| `sendSellProp` | `room/view/RoomPropCell.as` | 55 PROP_SELL |  | missing | no |  |
| `sendSellProp` | `room/view/RoomPropCell.as` | 55 PROP_SELL |  | missing | no |  |
| `sendInviteGame` | `ddt/manager/GameInSocketOut.as` | 70 GAME_INVITE |  | ok | no |  |
| `createUserGuide` | — | 94 GAME_ROOM | GAME_ROOM_CREATE=0 | ok | no |  |
| `enterUserGuide` | — | 94 GAME_ROOM | GAME_ROOM_SETUP_CHANGE=2 | ok | no |  |
| `sendCancelWait` | `ddt/manager/GameInSocketOut.as` | 94 GAME_ROOM | GAME_PICKUP_CANCEL=11 | ok | no |  |
| `sendGameMode` | — | 94 GAME_ROOM | GAME_PICKUP_STYLE=12 | ok | no |  |
| `sendGamePlayerExit` | `ddt/manager/GameInSocketOut.as` | 94 GAME_ROOM | GAME_ROOM_REMOVEPLAYER=5 | ok | no |  |
| `sendGameRoomKick` | `ddt/manager/GameInSocketOut.as` | 94 GAME_ROOM | GAME_ROOM_KICK=3 | ok | no |  |
| `sendGameRoomPlaceState` | `ddt/manager/GameInSocketOut.as` | 94 GAME_ROOM | GAME_ROOM_UPDATE_PLACE=10 | ok | no |  |
| `sendGameRoomSetUp` | `ddt/manager/GameInSocketOut.as` | 94 GAME_ROOM | GAME_ROOM_SETUP_CHANGE=2 | ok | no |  |
| `sendGameStart` | `ddt/manager/GameInSocketOut.as` | 94 GAME_ROOM | GAME_START=7 | ok | no |  |
| `sendGameStyle` | `room/view/bigMapInfoPanel/MatchRoomBigMapInfoPanel.as` | 94 GAME_ROOM | GAME_PICKUP_STYLE=12 | ok | no |  |
| `sendGameStyle` | `room/view/bigMapInfoPanel/MatchRoomBigMapInfoPanel.as` | 94 GAME_ROOM | GAME_PICKUP_STYLE=12 | ok | no |  |
| `sendGameTeam` | `ddt/manager/GameInSocketOut.as` | 94 GAME_ROOM | GAME_TEAM=6 | ok | no |  |
| `sendPlayerState` | `ddt/manager/GameInSocketOut.as` | 94 GAME_ROOM | GAME_PLAYER_STATE_CHANGE=15 | ok | no |  |
| `sendUpdateRoomList` | `roomList/RoomListMapTipPanel.as`<br>`roomList/RoomListTipPanel.as`<br>`roomList/pveRoomList/DungeonListBGView.as` (+1) | 94 GAME_ROOM | ROOMLIST_UPDATE=9 | ok | no |  |
| `userGuideStart` | — | 94 GAME_ROOM | GAME_START=7 | ok | no |  |

## Sociedade/Guilda

| Função (botão) | Arquivo(s) do cliente | Código | Sub | Servidor | Cliente verificado | Notas |
|---|---|---|---|---|---|---|
| `sendBuyBadge` | `consortion/view/selfConsortia/BadgeShopItem.as` | 129 CONSORTIA_CMD | BUY_BADGE=28 | ok | no | Implementado (Consortia_Badge, custo dos fundos, direito 16); o cliente 4.1 não tem loja de emblemas acessível. |
| `sendConsoritaApplyStatusOut` | `consortion/view/selfConsortia/TakeInMemberFrame.as` | 129 CONSORTIA_CMD | CONSORTIA_APPLY_STATE=7 | ok | no |  |
| `sendConsortiaCancelTryIn` | — | 129 CONSORTIA_CMD | CONSORTIA_TRYIN=0 | ok | no |  |
| `sendConsortiaChangeChairman` | `consortion/view/selfConsortia/ConsortionTrasferFrame.as` | 129 CONSORTIA_CMD | CONSORTIA_CHAIRMAN_CHAHGE=19 | ok | no | Implementado (SP_ConsortiaChangeChairman, alvo nível ≥ 5). O cliente só envia se o alvo tiver nível ≥ 12 — não verificado (Bob nível 10). |
| `sendConsortiaDismiss` | `consortion/view/selfConsortia/SelfConsortiaView.as` | 129 CONSORTIA_CMD | CONSORTIA_DISBAND=2 | ok | no | Implementado (líder, nível < 4; membros limpos, 128.2). O botão não está ligado no SelfConsortiaView desta versão do cliente; coberto pelo teste apps/game/test/consortia.test.ts. Correção: a resposta de falha não tinha o bool. |
| `sendConsortiaDutyDelete` | — | 129 CONSORTIA_CMD | CONSORTIA_DUTY_DELETE=9 | ok | no |  |
| `sendConsortiaEquipConstrol` | `consortion/view/selfConsortia/ManagerFrame.as` | 129 CONSORTIA_CMD | CONSORTIA_EQUIP_CONTROL=24 | ok | yes | Limites de contribuição (Consortia_Equip_Control) salvos; correção da ordem da resposta (7 ints, bool, msg). — evidência: research/e2e/guild/g13-thur-manage.png, g14-equip-control.png |
| `sendConsortiaInvate` | `consortion/view/selfConsortia/WantTakeInFrame.as`<br>`ddt/view/tips/PlayerTip.as` | 129 CONSORTIA_CMD | CONSORTIA_INVITE=11 | ok | yes | Convite por apelido (direito 2); alerta 128.4 no convidado. — evidência: research/e2e/guild/g32-invite-sent.png, g33-bob-invite.png |
| `sendConsortiaInvateDelete` | `consortion/ConsortionModelControl.as` | 129 CONSORTIA_CMD | CONSORTIA_INVITE_DELETE=13 | ok | no |  |
| `sendConsortiaInvatePass` | `consortion/ConsortionModelControl.as`<br>`consortion/view/club/ClubRecordItem.as` | 129 CONSORTIA_CMD | CONSORTIA_INVITE_PASS=12 | ok | yes | Aceitar convite. Correção: o C# escrevia o resultado no pacote recebido (resposta vazia). — evidência: research/e2e/guild/g34-bob-invite-accepted.png |
| `sendConsortiaLevelUp` | `consortion/view/selfConsortia/ConsortionUpGradeFrame.as` | 129 CONSORTIA_CMD | CONSORTIA_LEVEL_UP=21 | ok | yes | Nível da guilda (fundos + 100000 ouro), banco, ferreiro, loja (≤ nível/2), habilidade; anúncios 128.6/10/11/12/13. Correção: código 5 = fundos insuficientes. — evidência: research/e2e/guild/g20-levelup.png, g21-bank-up.png, g22-smith-up.png, g42-shop-up.png |
| `sendConsortiaMemberGrade` | `ddt/view/tips/PlayerTip.as` | 129 CONSORTIA_CMD | CONSORTIA_USER_GRADE_UPDATE=1 | ok | yes | Promover/rebaixar (direito 2048), 128.8 tipo 6/7. — evidência: research/e2e/guild/g29-bob-promoted.png |
| `sendConsortiaOut` | `consortion/view/selfConsortia/ConsortionQuitFrame.as`<br>`ddt/view/tips/PlayerTip.as` | 129 CONSORTIA_CMD | CONSORTIA_RENEGADE=3 | ok | yes | Expulsar (direito 32, limite diário KickMax) e sair; líder não sai; itens do banco voltam por correio. — evidência: research/e2e/guild/g30-kick.png, g31-bob-kicked.png, g36-bob-left.png, g37-thur-sees-leave.png |
| `sendConsortiaRichOffer` | `consortion/view/selfConsortia/TaxFrame.as`<br>`ddt/view/consortia/MyConsortiaTax.as` | 129 CONSORTIA_CMD | CONSORTIA_RICHES_OFFER=6 | ok | yes | Doação: tesouro += Xu/2, RichesOffer/RichesRob, evento tipo 5; pagamento salvo na hora. Melhoria: 128.16 atualiza o tesouro na tela dos outros membros. — evidência: research/e2e/guild/g11-bob-donated.png, g12-thur-sees-donation.png, g19-thur-riches-refreshed.png |
| `sendConsortiaTryIn` | `consortion/view/club/ClubView.as`<br>`tofflist/view/TofflistLeftCurrentCharcter.as` | 129 CONSORTIA_CMD | CONSORTIA_TRYIN=0 | ok | yes | Pedido de entrada; lista ConsortiaApplyUsersList. Correção: guilda com pedidos fechados (OpenApply) recusa (Msg7). — evidência: research/e2e/guild/g5-bob-list.png, g6-bob-applied.png |
| `sendConsortiaTryinDelete` | `consortion/view/club/ClubRecordItem.as`<br>`consortion/view/selfConsortia/TakeInMemberFrame.as`<br>`consortion/view/selfConsortia/TakeInMemberItem.as` | 129 CONSORTIA_CMD | CONSORTIA_TRYIN_DEL=5 | ok | no |  |
| `sendConsortiaTryinPass` | `consortion/view/selfConsortia/TakeInMemberFrame.as`<br>`consortion/view/selfConsortia/TakeInMemberItem.as` | 129 CONSORTIA_CMD | CONSORTIA_TRYIN_PASS=4 | ok | yes | Aceite pelo líder (direito 1): Bob entra, 128.1 para todos os membros online. — evidência: research/e2e/guild/g7-thur-takein.png, g8-thur-members.png, g9-bob-joined.png |
| `sendConsortiaUpdateDescription` | `consortion/view/selfConsortia/ConsortionDeclareFrame.as` | 129 CONSORTIA_CMD |  | ok | yes | Declaração (direito 16), ≤ 300 bytes. — evidência: research/e2e/guild/g38-description.png |
| `sendConsortiaUpdateDuty` | `consortion/view/selfConsortia/JobManageItem.as` | 129 CONSORTIA_CMD | CONSORTIA_DUTY_UPDATE=10 | ok | no |  |
| `sendConsortiaUpdatePlacard` | `consortion/view/selfConsortia/PlacardAndEvent.as` | 129 CONSORTIA_CMD | CONSORTIA_PLACARD_UPDATE=15 | ok | no |  |
| `sendConsortiaUpgradeDuty` | — | 129 CONSORTIA_CMD | CONSORTIA_DUTY_UPDATE=10 | ok | no |  |
| `sendConsortiaUserRemarkUpdate` | — | 129 CONSORTIA_CMD |  | ok | no |  |
| `sendConsortionPoll` | `consortion/view/selfConsortia/ConsortionPollFrame.as` | 129 CONSORTIA_CMD | POLL_CANDIDATE=25 | stub | no | Sem handler no servidor original. |
| `sendConsortionSkill` | `consortion/view/selfConsortia/ConsortionOpenSkillFrame.as`<br>`consortion/view/selfConsortia/ConsortionSkillItem.as` | 129 CONSORTIA_CMD | SKILL_SOCKET=26 | partial | no | Compra de habilidade (fundos/contribuição/medalhas), buff 101-112 salvo e 129/26; efeitos dos buffs no combate ainda não aplicados. Correção: buff tipo 1 era dado sem a guilda pagar. |
| `sendCreateConsortia` | `consortion/view/club/CreateConsortionFrame.as` | 129 CONSORTIA_CMD | CONSORTIA_CREATE=1 | ok | yes | Criação: nível ≥ 5 no servidor (cliente exige 12), 500 Xu + NeedGold do nível 1 (100000) debitados; 5 cargos padrão. — evidência: research/e2e/guild/g3-create-typed.png, g4-created.png |
| `sendDonate` | `consortion/view/selfConsortia/consortiaTask/DonateFrame.as` | 129 CONSORTIA_CMD | DONATE=23 | stub | no | Sem implementação no original (só loga o tipo de item). |
| `sendForbidSpeak` | `ddt/view/tips/PlayerTip.as` | 129 CONSORTIA_CMD | CONSORTIA_BANCHAT_UPDATE=16 | ok | no |  |
| `sendReleaseConsortiaTask` | `consortion/view/selfConsortia/consortiaTask/ConsortiaReleaseTaskFrame.as`<br>`consortion/view/selfConsortia/consortiaTask/ConsortiaSubmitTaskFrame.as`<br>`consortion/view/selfConsortia/consortiaTask/ConsortiaTaskView.as` | 129 CONSORTIA_CMD | CONSORTIA_TASK_RELEASE=22 | ok | yes | Missão: custo MissionRiches por nível, 3 condições aleatórias (Consortia_TaskConfig), progresso ao vivo (doação/PvP/guerra/item/masmorra), recompensa por participação. Correção: layout da resposta do cliente 4.1. — evidência: research/e2e/guild/g24-task-release.png, g26-task-released.png, g27-task-progress.png |

## Spa/Fonte termal

| Função (botão) | Arquivo(s) do cliente | Código | Sub | Servidor | Cliente verificado | Notas |
|---|---|---|---|---|---|---|
| `sendHotAddTime` | `hotSpring/controller/HotSpringRoomController.as`<br>`hotSpring/controller/HotSpringRoomListController.as` | 12 HOTSPRING_CMD_B | CONTINU_BY_MONEY=11 | ok | no | SpaAddictionMoneyNeeded (1299) Xu → +SpaPriRoomContinueTime (30) min, 191/12. |
| `sendHotSpringRoomPlayerRemove` | `ddt/manager/HotSpringManager.as`<br>`hotSpring/controller/HotSpringRoomController.as` | 169 HOTSPRING_ROOM_PLAYER_REMOVE |  | ok | yes | Sai da sala (199 aos outros, 169 'Đã thoát…'), lista atualizada. — evidência: research/e2e/batch3/13-spa-leave.png |
| `sendHotSpringRoomCreate` | `hotSpring/controller/HotSpringRoomListController.as` | 175 HOTSPRING_ROOM_CREATE |  | stub | no |  |
| `sendHotSpringEnter` | `hotSpring/controller/HotSpringRoomListController.as` | 187 HOTSPRING_ENTER |  | ok | yes | Lista de salas 197 a partir de game.HotSpringRoom (contagem ao vivo). — evidência: research/e2e/batch3/05-spa-list.png |
| `sendHotSpringRoomQuickEnter` | `hotSpring/controller/HotSpringRoomListController.as` | 190 HOTSPRING_ROOM_QUICK_ENTER |  | ok | no |  |
| `sendHotSpringRoomAdminRemovePlayer` | — | 191 HOTSPRING_CMD |  | ok | no |  |
| `sendHotSpringRoomEdit` | `hotSpring/controller/HotSpringRoomController.as` | 191 HOTSPRING_CMD | HOTSPRING_ROOM_EDIT=6 | ok | no |  |
| `sendHotSpringRoomInvite` | — | 191 HOTSPRING_CMD | HOTSPRING_ROOM_INVITE=4 | ok | no | Sem receptor no cliente 4.1: o convidado recebe aviso com o número da sala. |
| `sendHotSpringRoomPlayerContinue` | `hotSpring/controller/HotSpringRoomController.as` | 191 HOTSPRING_CMD |  | ok | no |  |
| `sendHotSpringRoomPlayerTargetPoint` | `hotSpring/controller/HotSpringRoomController.as` | 191 HOTSPRING_CMD | TARGET_POINT=1 | ok | yes | Servidor autoritativo: só move quem enviou (o C# movia qualquer id informado), caminho re-serializado de inteiros validados e preso à cena; repassado aos outros da sala. Ganho de EXP por minuto (HotSpringExp/10 × VIP, +50 honra/10 Xu bloq./50 ouro, 191/7). — evidência: research/e2e/batch3/12-thur-sees-bob.png |
| `sendHotSpringRoomRenewalFee` | `hotSpring/controller/HotSpringRoomController.as` | 191 HOTSPRING_CMD | HOTSPRING_ROOM_RENEWAL_FEE=3 | ok | no |  |
| `sendHotSpringRoomEnterView` | `hotSpring/view/HotSpringRoomView.as` | 201 HOTSPRING_ROOM_ENTER_VIEW |  | ok | yes | 198 por jogador da sala; o novo jogador também vai a todos (Bob aparece para Thur). — evidência: research/e2e/batch3/12-thur-sees-bob.png |
| `sendHotSpringRoomEnter` | `hotSpring/controller/HotSpringRoomListController.as` | 202 HOTSPRING_ROOM_ENTER |  | ok | yes | 10000 de ouro checado e cobrado ANTES de entrar (o C# cobrava depois, sem rollback); 202 com minutos restantes (60/dia, Sys_Users_Extra). — evidência: research/e2e/batch3/06-spa-enter.png, research/e2e/batch3/07-spa-room.png |
| `sendHotSpringRoomEnterConfirm` | `hotSpring/controller/HotSpringRoomListController.as` | 212 HOTSPRING_ROOM_ENTER_CONFIRM |  | ok | no |  |

## Totem/Honra

| Função (botão) | Arquivo(s) do cliente | Código | Sub | Servidor | Cliente verificado | Notas |
|---|---|---|---|---|---|---|
| `sendHonorUp` | `totem/view/HonorUpFrame.as`<br>`totem/view/HonorUpIcon.as` | 96 HONOR_UP_COUNT |  | missing | no |  |
| `sendOpenOneTotem` | `totem/view/TotemLeftWindowView.as` | 136 TOTEM |  | missing | no |  |

## VIP

| Função (botão) | Arquivo(s) do cliente | Código | Sub | Servidor | Cliente verificado | Notas |
|---|---|---|---|---|---|---|
| `sendOpenVip` | `vip/VipController.as` | 92 VIP_RENEWAL |  | ok | yes | Tiếp phí VIP 3 meses: 2790 Xu debitado, VIP 1→5, expira 2027-01-04, 92 atualiza a janela. — evidência: research/e2e/batch4/16-vip-buy2.png, research/e2e/batch4/16-vip-bought.png |

