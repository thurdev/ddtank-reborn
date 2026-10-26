# 01 — Cobertura `Tank.Request` × `apps/api` (cliente 4.1)

Tarefa `api-ashx` (2026-10-26). Cruza os 123 `.ashx` de `vendor/DDTank41/Tank.Request/` (catálogo completo em
[00a-endpoint-catalog.md](00a-endpoint-catalog.md), coluna `client` = referenciado pelo cliente 4.1 via grep em
`vendor/DDTank41/Source Flash/src`) com o que `apps/api/src/request/endpoints/` implementa hoje. Escopo: só 4.1
(`vendor/DDT-6600` e as tarefas `m3-endpoints*` ficam de fora, decisão do dono — ver `AGENTS.md`).

## Resumo

| status | contagem | o que é |
|---|---|---|
| `template` | 55 | builder estático (`achievementlist.ashx` etc.): o `.ashx` em si é admin-only (reconstrói `<File>.xml` no disco); o cliente baixa o `.xml` gerado, já servido por `src/templates/defs.ts` + `TemplateCache` (`routes/request.ts`). Cobertos antes desta tarefa. |
| `ported` | 28 | endpoint dinâmico já portado antes desta tarefa (`Login`, `ConsortiaList`, `LoadUserMail`, …). |
| **`ported (api-ashx)`** | **14** | **portado nesta tarefa** — lista abaixo. |
| `admin-orchestrator` | 2 | `CreateAllXml.ashx` / `CelebList/CreateAllCeleb.ashx` chamam ~30 builders de uma vez; sem uso pelo cliente, superseded por `POST /api/admin/templates/rebuild`. |
| `duplicate` | 1 | `/CelebList/UserRankDate.ashx` — mesma classe C# que `/UserRankDate.ashx` (já portado); o cliente só pede a URL sem prefixo (ver nota na tabela). |
| `stub (cliente não chama)` | 23 | fora de escopo: nenhuma referência em `Source Flash/src` (admin/legado/teste/transição de domínio). |

`55 + 28 + 14 + 2 + 1 + 23 = 123`. **Nenhum `.ashx` que o cliente 4.1 chama ficou sem handler real ou sem motivo
documentado de estar fora de escopo.**

## Portados nesta tarefa (14)

| endpoint | arquivo | C# citado | observação |
|---|---|---|---|
| `RenameNick.ashx` | `src/request/endpoints/rename.ts` | `RenameNick.ashx.cs:30-90` | correção de segurança (mesmo padrão do `Login.ts`): o original comenta `if (PlayerManager.Login(...))` e roda pra qualquer blob RSA decriptável; aqui `pwd` precisa bater com a sessão (web/game key) atual |
| `RenameConsortiaName.ashx` | `src/request/endpoints/rename.ts` | `RenameConsortiaName.ashx.cs:22-69` | o original nunca renomeia sociedade nenhuma (`ConsortiaBussiness` é instanciado e descartado) — portado bug-por-bug: só valida sessão e gira a chave |
| `AuctionPageList.ashx` | `src/request/endpoints/auction.ts` | `AuctionPageList.ashx.cs:26-81` + `PlayerBussiness.GetAuctionPage:1041-1238` | porta completa dos filtros de `type` (Category/TemplateID, ~30 casos do switch original) |
| `GiftRecieveLog.ashx` | `src/request/endpoints/gifts.ts` | `GiftRecieveLog.ashx.cs:20-54` | zlib, `player."Sys_Users_Gift"` filtrado por `ReceiverID` |
| `giftsendlog.ashx` | `src/request/endpoints/gifts.ts` | `giftsendlog.ashx.cs:20-54` | zlib, mesma tabela filtrada por `SenderID`; `playerID` no XML mostra sempre `ReceiverID`, igual ao original |
| `gmtipallbyids.ashx` | `src/request/endpoints/misc.ts` | `gmtipallbyids.ashx.cs:24-70` | `game."Edictum_List"`; bug do original mantido de propósito — todo `<Item>` sai com `ID` igual ao PRIMEIRO id da querystring, não o id real da linha |
| `FarmGetUserFieldInfos.ashx` | `src/request/endpoints/misc.ts` | `FarmGetUserFieldInfos.ashx.cs:41-71` | lista de amigos real (`app."V_Sys_Users_Friends"`, mesma view do `IMListLoad`); `<Item>` sem filhos — não existe tabela de Farm no `packages/db` ainda |
| `FarmGetUserFieldInfosSingle.ashx` | `src/request/endpoints/misc.ts` | `FarmGetUserFieldInfosSingle.ashx.cs:14-39` | sem acesso a banco no original — só ecoa `friendID` com `isFeed=false` |
| `luckstaractivityrank.ashx` | `src/request/endpoints/misc.ts` | `luckstaractivityrank.ashx.cs:24-57` | raiz `<Ranks>` (não `<Result>`) — forma correta com lista vazia + `myRank` placeholder, já que não existe tabela Luckstar no `packages/db` ainda |
| `CreatShortCut.ashx` | `src/request/endpoints/misc.ts` | `CreatShortCut.ashx.cs:17-22` | literal `"Not support right now"`, sem XML |
| `API/Login.ashx` | `src/request/endpoints/misc.ts` | `API/Login.ashx.cs:16-37` | handler inteiro comentado no original exceto `Response.Write(1)` — literal `"1"` |
| `IMRecentContactsList.ashx` | `src/request/endpoints/misc.ts` | `IMRecentContactsList.ashx.cs:25-54` | bloco de consulta inteiro comentado no original — sempre `value=true message="Success!"` sem `<Item>` |
| `AdvanceQuestTime.ashx` | `src/request/endpoints/m3.ts` | `AdvanceQuestTime.ashx.cs:25-53` | **fix de regressão**: a tarefa `m3-ashx` tinha assumido esse endpoint como exclusivo do 6600 e respondia "Not supported" pro 4.1; o `.cs` real existe em `vendor/DDTank41` e sempre escreve o texto literal `"0,<DateTime.Now>,0"` (o XML que ele monta é código morto) — agora os dois clientes recebem o mesmo byte-a-byte |
| `LogTime.ashx` | `src/request/endpoints/m3.ts` | `LogTime.ashx.cs:27-73` | **fix de regressão** igual ao acima: o `.cs` do 4.1 nunca chama `Response.Write` em lugar nenhum do método — corpo HTTP sempre vazio, não "Not supported" |

Testes novos/corrigidos: `apps/api/test/api.test.ts`, describe `"api-ashx: newly ported Tank.Request endpoints
(4.1 coverage)"` (10 casos) + 2 casos corrigidos em `"M3 ashx + templates"` (LogTime/AdvanceQuestTime deixam de
assumir 4.1 = stub).

## Fora de escopo — "cliente não chama" (23)

Nenhuma referência em `grep -r "<nome>" "vendor/DDTank41/Source Flash/src"`: `AccountRegister.ashx`,
`API/Register.ashx`, `CelebList/celebbyweekleaguescore.ashx`, `ChargeTest.ashx` (chave compartilhada, só
GM/pagamento), `CheckRegistration.ashx`, `ExitGameTransit.ashx`, `FavoriteTransit.ashx`, `GetSID.ashx`,
`giftsendlog1.ashx`, `IMFriendsBbs.ashx`, `IMFriendsGood.ashx`, `KeyGenerator.ashx`, `LoadUserEquip.ashx`,
`LoadUserItems.ashx`, `LoadUsersSort.ashx`, `MapWeekList.ashx`, `PayTransit.ashx`, `runetemplatelist.ashx`
(admin-IP), `SentReward.ashx` (GM), `shopcheapitemlist2.ashx`, `UserGoodsInfo.ashx`, `UserQuestList.ashx`,
`VisualizeItemLoad.ashx`. Continuam como stub `<Result value="false" message="Not supported" />` em
`src/request/registry.ts` (`STUBS`) — nada implementado, nada a implementar.

## Fora de escopo — referenciadas pelo cliente, sem handler nenhum em DDTank41 (14)

Essas URLs aparecem em `Source Flash/src` mas não existem nem como `.ashx` em `vendor/DDTank41/Tank.Request`
(então não entram na contagem de 123 acima) — o recurso já estava quebrado no servidor original, o 404 do IIS é
o comportamento "correto" a reproduzir. `src/request/registry.ts` responde com o stub genérico em vez de um 404
puro pra degradar melhor no cliente: `AdvanceQuestion.ashx`, `AdvanceQuestionAppraisal.ashx`, `AdvanceReply.ashx`,
`ChargeMoneyForTest.ashx`, `CommitWeeklyUserRecord.ashx` (existe no doador `DDTank4.1/Request`, não em
`DDTank41`), `ConsortiaCandidateList.ashx`, `GetWorldWealth.ashx`, `LogClickTip.ashx`, `LogInviteFriends.ashx`,
`QueryWealthDivineNum.ashx`, `SameCityIMLoad.ashx`, `SendActiveKeySystem.ashx`, `SendMailGameUrl.ashx`,
`UserGetActiveState.ashx`, `VoteSubmitResult.ashx`.

## `Road.Service` (pedido pela tarefa, não é `.ashx`)

Investigado: `vendor/DDTank41/Road.Service` não expõe nenhum HTTP/`.ashx` — é só o executável/Windows Service
(`GameServerService.cs`, `ServiceName="ROAD"`, `Actions/Service{Install,Start,Stop,Run}.cs`) que chama
`GameServer.CreateInstance().Start()`, o mesmo `Game.Server` que hoje é `apps/game` (processo Node comum, sem
precisar de wrapper de serviço — nada a portar aí). O "ranking" da linha da `MIGRATION-GAP.md` é a geração das
`CelebBy*.xml` (já cobertas pelos 55 templates, rebuild periódico `CELEB_REBUILD_MIN`) e `UserRankDate.ashx`/
`src/rank.ts` (portado). Ver `docs/MIGRATION-GAP.md` linha `Road.Service`.

## Tabela completa (123 linhas)

Colunas: `mode` (igual ao catálogo — `build→X.xml` builder estático, `zlib` resposta comprimida, `xml` resposta
plana, `other` texto/redirect/literal), `client 4.1` (referenciado pelo cliente, do catálogo gerado), `boot`
(fila de carregamento inicial), `status` + `notes` (novos nesta tarefa).

| # | URL | mode | client 4.1 | boot | status | notes |
|---|---|---|---|---|---|---|
| 1 | `/AccountRegister.ashx` | xml | — |  | stub (cliente não chama) | fora de escopo: não referenciado pelo cliente 4.1 |
| 2 | `/achievementlist.ashx` | build→achievementlist_out.xml,achievementlist.xml | yes | **boot** | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 3 | `/ActiveList.ashx` | build→ActiveList.xml | yes |  | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 4 | `/ActivePullDown.ashx` | xml | yes |  | ported |  |
| 5 | `/activitysystemitems.ashx` | build→activitysystemitems_out.xml,activitysystemitems.xml | yes | **boot** | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 6 | `/AdvanceQuestionRead.ashx` | zlib | yes | **boot** | ported |  |
| 7 | `/AdvanceQuestTime.ashx` | zlib | yes |  | **ported (api-ashx)** | novo nesta tarefa (fix de regressão do `m3-ashx`) |
| 8 | `/API/Login.ashx` | other | yes |  | **ported (api-ashx)** | novo nesta tarefa |
| 9 | `/API/Register.ashx` | other | — |  | stub (cliente não chama) | fora de escopo: não referenciado pelo cliente 4.1 |
| 10 | `/ApprenticeshipClubList.ashx` | xml | yes |  | ported |  |
| 11 | `/AuctionPageList.ashx` | zlib | yes |  | **ported (api-ashx)** | novo nesta tarefa |
| 12 | `/BallList.ashx` | build→BallList.xml | yes | **boot** | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 13 | `/bombconfig.ashx` | build→bombconfig.xml | yes | **boot** | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 14 | `/CardUpdateCondition.ashx` | build→CardUpdateCondition.xml | yes | **boot** | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 15 | `/CardUpdateInfo.ashx` | build→CardUpdateInfo.xml | yes | **boot** | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 16 | `/CelebList/CelebByConsortiaDayHonor.ashx` | build→CelebByConsortiaDayHonor.xml | — |  | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 17 | `/CelebList/CelebByConsortiaDayRiches.ashx` | build→CelebByConsortiaDayRiches.xml | yes |  | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 18 | `/CelebList/celebbyconsortiafightpower.ashx` | build→celebbyconsortiafightpower.xml | yes |  | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 19 | `/CelebList/CelebByConsortiaHonor.ashx` | build→CelebByConsortiaHonor.xml | — |  | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 20 | `/CelebList/CelebByConsortiaLevel.ashx` | build→CelebByConsortiaLevel.xml | yes |  | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 21 | `/CelebList/CelebByConsortiaRiches.ashx` | build→CelebByConsortiaRiches.xml | yes |  | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 22 | `/CelebList/CelebByConsortiaWeekHonor.ashx` | build→CelebByConsortiaWeekHonor.xml | — |  | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 23 | `/CelebList/CelebByConsortiaWeekRiches.ashx` | build→CelebByConsortiaWeekRiches.xml | yes |  | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 24 | `/CelebList/CelebByDayBestEquip.ashx` | build→CelebForBestEquip.xml | — |  | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 25 | `/CelebList/CelebByDayFightPowerList.ashx` | build→CelebByDayFightPowerList.xml | yes |  | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 26 | `/CelebList/CelebByDayGPList.ashx` | build→CelebByDayGPList.xml | yes |  | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 27 | `/CelebList/CelebByDayOfferList.ashx` | build→CelebByDayOfferList.xml,CelebByDayOfferList.xml | — |  | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 28 | `/CelebList/CelebByGpList.ashx` | build→CelebByGPList.xml,CelebByGpList.xml | yes |  | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 29 | `/CelebList/CelebByOfferList.ashx` | build→CelebByOfferList.xml,CelebByOfferList.xml | — |  | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 30 | `/CelebList/CelebByWeekGPList.ashx` | build→CelebByWeekGPList.xml,CelebByWeekGPList.xml | yes |  | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 31 | `/CelebList/celebbyweekleaguescore.ashx` | other | — |  | stub (cliente não chama) | fora de escopo: não referenciado pelo cliente 4.1 |
| 32 | `/CelebList/CelebByWeekOfferList.ashx` | build→CelebByWeekOfferList.xml,CelebByWeekOfferList.xml | — |  | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 33 | `/CelebList/CreateAllCeleb.ashx` | other | — |  | admin-orchestrator | chama ~30 builders de uma vez; superseded by `POST /api/admin/templates/rebuild` |
| 34 | `/CelebList/UserRankDate.ashx` | xml | yes |  | duplicate (ver #121) | mesma classe `Tank.Request.UserRankDate` do `.ashx.cs` que só existe em `CelebList/`; o cliente só pede `/UserRankDate.ashx` (sem prefixo, `TofflistModel.as:787`) via o markup duplicado na raiz — não é uma URL separada de verdade |
| 35 | `/ChargeTest.ashx` | other | — |  | stub (cliente não chama) | fora de escopo: não referenciado pelo cliente 4.1 |
| 36 | `/CheckRegistration.ashx` | zlib | — |  | stub (cliente não chama) | fora de escopo: não referenciado pelo cliente 4.1 |
| 37 | `/ConsortiaAllyList.ashx` | xml | — |  | ported |  |
| 38 | `/ConsortiaApplyAllyList.ashx` | xml | — |  | ported |  |
| 39 | `/ConsortiaApplyUsersList.ashx` | xml | yes |  | ported |  |
| 40 | `/consortiabuffertemp.ashx` | build→consortiabuffertemp_out.xml,consortiabuffertemp.xml | yes |  | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 41 | `/ConsortiaDutyList.ashx` | xml | yes |  | ported |  |
| 42 | `/ConsortiaEquipControl.ashx` | xml | — |  | ported |  |
| 43 | `/ConsortiaEquipControlList.ashx` | xml | yes |  | ported |  |
| 44 | `/ConsortiaEventList.ashx` | xml | yes |  | ported |  |
| 45 | `/ConsortiaIMList.ashx` | xml | — |  | ported |  |
| 46 | `/ConsortiaInviteUsersList.ashx` | xml | yes |  | ported |  |
| 47 | `/ConsortiaLevelList.ashx` | build→ConsortiaLevelList.xml | yes |  | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 48 | `/ConsortiaList.ashx` | zlib | yes | **boot** | ported |  |
| 49 | `/ConsortiaNameCheck.ashx` | xml | yes |  | ported |  |
| 50 | `/ConsortiaUsersList.ashx` | xml | yes | **boot** | ported |  |
| 51 | `/CreateAllXml.ashx` | other | — |  | admin-orchestrator | chama ~30 builders de uma vez; superseded by `POST /api/admin/templates/rebuild` |
| 52 | `/CreatShortCut.ashx` | other | yes |  | **ported (api-ashx)** | novo nesta tarefa |
| 53 | `/DailyAwardList.ashx` | build→DailyAwardList.xml | yes | **boot** | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 54 | `/DailyLeagueAwardList.ashx` | build→dailyleagueaward_out.xml,dailyleagueaward.xml | yes | **boot** | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 55 | `/DailyLeagueLevelList.ashx` | build→dailyleaguelevel_out.xml,dailyleaguelevel.xml | yes | **boot** | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 56 | `/dailyloglist.ashx` | zlib | yes |  | ported |  |
| 57 | `/elitematchplayerlist.ashx` | build→elitematchplayerlist.xml | yes |  | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 58 | `/eventrewarditemlist.ashx` | build→eventrewarditemlist_out.xml,eventrewarditemlist.xml | yes | **boot** | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 59 | `/ExitGameTransit.ashx` | other | — |  | stub (cliente não chama) | fora de escopo: não referenciado pelo cliente 4.1 |
| 60 | `/FarmGetUserFieldInfos.ashx` | xml | yes |  | **ported (api-ashx)** | novo nesta tarefa |
| 61 | `/FarmGetUserFieldInfosSingle.ashx` | xml | yes |  | **ported (api-ashx)** | novo nesta tarefa |
| 62 | `/FavoriteTransit.ashx` | other | — |  | stub (cliente não chama) | fora de escopo: não referenciado pelo cliente 4.1 |
| 63 | `/fightlabdropitemlist.ashx` | build→fightlabdropitemlist_out.xml | — |  | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 64 | `/GetSID.ashx` | other | — |  | stub (cliente não chama) | fora de escopo: não referenciado pelo cliente 4.1 |
| 65 | `/GiftRecieveLog.ashx` | zlib | yes |  | **ported (api-ashx)** | novo nesta tarefa |
| 66 | `/giftsendlog.ashx` | zlib | yes |  | **ported (api-ashx)** | novo nesta tarefa |
| 67 | `/giftsendlog1.ashx` | zlib | — |  | stub (cliente não chama) | fora de escopo: não referenciado pelo cliente 4.1 |
| 68 | `/gmtipallbyids.ashx` | xml | yes |  | **ported (api-ashx)** | novo nesta tarefa |
| 69 | `/IMFriendsBbs.ashx` | xml | — |  | stub (cliente não chama) | fora de escopo: não referenciado pelo cliente 4.1 |
| 70 | `/IMFriendsGood.ashx` | xml | — |  | stub (cliente não chama) | fora de escopo: não referenciado pelo cliente 4.1 |
| 71 | `/IMListLoad.ashx` | zlib | yes | **boot** | ported |  |
| 72 | `/IMRecentContactsList.ashx` | zlib | yes |  | **ported (api-ashx)** | novo nesta tarefa |
| 73 | `/ItemStrengthenList.ashx` | build→ItemStrengthenList.xml | yes |  | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 74 | `/KeyGenerator.ashx` | other | — |  | stub (cliente não chama) | fora de escopo: não referenciado pelo cliente 4.1 |
| 75 | `/LoadBoxTemp.ashx` | build→LoadBoxTemp.xml | yes | **boot** | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 76 | `/LoadItemsCategory.ashx` | build→LoadItemsCategory.xml | yes | **boot** | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 77 | `/LoadMapsItems.ashx` | build→LoadMapsItems.xml | yes | **boot** | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 78 | `/loadpetfightproperty.ashx` | build→loadpetfightproperty_out.xml,loadpetfightproperty.xml | yes | **boot** | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 79 | `/loadpetmoeproperty.ashx` | build→loadpetmoeproperty_out.xml,loadpetmoeproperty.xml | yes | **boot** | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 80 | `/LoadPVEItems.ashx` | build→LoadPVEItems.xml | yes | **boot** | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 81 | `/LoadUserBox.ashx` | build→LoadUserBox.xml | yes | **boot** | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 82 | `/LoadUserEquip.ashx` | xml | — |  | stub (cliente não chama) | fora de escopo: não referenciado pelo cliente 4.1 |
| 83 | `/LoadUserItems.ashx` | xml | — |  | stub (cliente não chama) | fora de escopo: não referenciado pelo cliente 4.1 |
| 84 | `/LoadUserMail.ashx` | zlib | yes |  | ported |  |
| 85 | `/LoadUsersSort.ashx` | xml | — |  | stub (cliente não chama) | fora de escopo: não referenciado pelo cliente 4.1 |
| 86 | `/Login.ashx` | xml | yes |  | ported |  |
| 87 | `/LoginAwardItemTemplate.ashx` | build→loginawarditemtemplate.xml | yes | **boot** | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 88 | `/LoginSelectList.ashx` | xml | yes | **boot** | ported |  |
| 89 | `/LogTime.ashx` | other | yes |  | **ported (api-ashx)** | novo nesta tarefa (fix de regressão do `m3-ashx`) |
| 90 | `/luckstaractivityrank.ashx` | xml | yes |  | **ported (api-ashx)** | novo nesta tarefa |
| 91 | `/MailSenderList.ashx` | zlib | yes |  | ported |  |
| 92 | `/MapServerList.ashx` | build→MapServerList.xml | yes | **boot** | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 93 | `/MapWeekList.ashx` | xml | — |  | stub (cliente não chama) | fora de escopo: não referenciado pelo cliente 4.1 |
| 94 | `/MarryInfoPageList.ashx` | zlib | yes |  | ported |  |
| 95 | `/newtitle.ashx` | build→newtitleinfo.xml | yes | **boot** | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 96 | `/NickNameCheck.ashx` | xml | yes |  | ported |  |
| 97 | `/NPCInfoList.ashx` | build→NPCInfoList.xml | — |  | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 98 | `/PayTransit.ashx` | other | — |  | stub (cliente não chama) | fora de escopo: não referenciado pelo cliente 4.1 |
| 99 | `/petskillelementinfo.ashx` | build→petskillelementinfo.xml | yes |  | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 100 | `/petskillinfo.ashx` | build→petskillinfo.xml | yes | **boot** | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 101 | `/petskilltemplateinfo.ashx` | build→petskilltemplateinfo.xml | — |  | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 102 | `/pettemplateinfo.ashx` | build→pettemplateinfo.xml | yes | **boot** | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 103 | `/QuestList.ashx` | build→QuestList.xml | yes | **boot** | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 104 | `/RenameConsortiaName.ashx` | xml | yes |  | **ported (api-ashx)** | novo nesta tarefa |
| 105 | `/RenameNick.ashx` | xml | yes |  | **ported (api-ashx)** | novo nesta tarefa |
| 106 | `/runetemplatelist.ashx` | other | — |  | stub (cliente não chama) | fora de escopo: não referenciado pelo cliente 4.1 |
| 107 | `/SentReward.ashx` | other | — |  | stub (cliente não chama) | fora de escopo: não referenciado pelo cliente 4.1 |
| 108 | `/serverconfig.ashx` | build→ServerConfig.xml | yes | **boot** | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 109 | `/ServerList.ashx` | xml | yes | **boot** | ported |  |
| 110 | `/shopcheapitemlist.ashx` | xml | yes | **boot** | ported |  |
| 111 | `/shopcheapitemlist2.ashx` | xml | — |  | stub (cliente não chama) | fora de escopo: não referenciado pelo cliente 4.1 |
| 112 | `/ShopGoodsShowList.ashx` | build→ShopGoodsShowList.xml | yes | **boot** | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 113 | `/ShopItemList.ashx` | build→ShopItemList.xml | yes | **boot** | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 114 | `/suitpartequipinfolist.ashx` | build→suitpartequipinfolist.xml | yes | **boot** | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 115 | `/suittemplateinfolist.ashx` | build→suittemplateinfolist.xml | yes | **boot** | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 116 | `/TemplateAllList.ashx` | build→TemplateAlllist1.xml,TemplateAlllist.xml | yes | **boot** | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 117 | `/totemhonortemplate.ashx` | build→totemhonortemplate.xml | yes | **boot** | template | builder estático (`src/templates/defs.ts`); `.ashx` em si é admin-only |
| 118 | `/UserApprenticeshipInfoList.ashx` | xml | yes | **boot** | ported |  |
| 119 | `/UserGoodsInfo.ashx` | xml | — |  | stub (cliente não chama) | fora de escopo: não referenciado pelo cliente 4.1 |
| 120 | `/UserQuestList.ashx` | zlib | — |  | stub (cliente não chama) | fora de escopo: não referenciado pelo cliente 4.1 |
| 121 | `/UserRankDate.ashx` | xml | yes |  | ported |  |
| 122 | `/VisualizeItemLoad.ashx` | xml | — |  | stub (cliente não chama) | fora de escopo: não referenciado pelo cliente 4.1 |
| 123 | `/VisualizeRegister.ashx` | xml | yes | **boot** | ported |  |
