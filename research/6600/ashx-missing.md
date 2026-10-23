# M3 (task m3-ashx) — endpoints the DDT-6600 client calls that we didn't serve from our DB yet

> Pesquisa + port. Lista gerada comparando todo `solveRequestPath("X.ashx"/"X.xml")` em
> `vendor/DDT-6600/Flash_Project/DDT660/src` (grep, 155 strings únicas) contra
> `apps/api/src/request/registry.ts` (PORTED + STUBS) e os nomes de arquivo em
> `apps/api/src/templates/defs.ts` (`TEMPLATES[].files[].name`). **61 endpoints** ficaram de fora
> dessa comparação (script em `<scratch>\diff.mjs`, não
> commitado — refazível com o mesmo grep). Antes desta tarefa, todos os 61 caíam no fallback
> genérico de `apps/api/src/routes/request.ts`: `.xml` desconhecido → snapshot do vendor (ou
> `Result` vazio em zlib se nem o snapshot existir) e `.ashx` desconhecido → `Result value="false"`
> (zlib só se estiver em `COMPRESS_ASHX_6600`).
>
> Prioridade: **P0** = carregado no boot (fila de `StartupResourceLoader.as` ou de
> `LoaderCreate.as`, a tela de loading pós-login que já embasou `research/6600/xml-diff.md` — os
> 79 arquivos `.xml` daquele relatório são literalmente esta fila) **ou** citado explicitamente na
> tarefa. **P1** = janela comum (calendário, guilda, loja, atividades diárias, PvE) chamada sob
> demanda. **P2** = resto (eventos muito específicos, nenhuma fonte C# encontrada, ou string de
> teste/lixo no próprio cliente).

## Resumo

| Prioridade | Total | Implementado nesta tarefa | Motivo do que ficou de fora |
|---|---|---|---|
| P0 | 33 | 25 | 8 precisam de schema novo ou não têm fonte C# (ver tabela) |
| P1 | 19 | 10 | nested/complexo (CommunalActive, GmActivityInfo) ou tabela não encontrada |
| P2 | 9 | 0 | sem fonte C#, sem tabela, ou é lixo (`Casdfsdf.ashx`) |
| **Total** | **61** | **35** | — |

(35 = 7 `.ashx` novos + 3 stubs promovidos a real [`AdvanceQuestTime`/`VoteSubmit`/`LogTime`] + 1
`.xml` builder já existente reaproveitado [`SearchGoodsTemp`] + 19 `.xml` novos via `flat()`/builder
dedicado + `ConsortiaBossConfigLoad` — ver `apps/api/src/templates/defs.ts` e
`apps/api/src/request/endpoints/m3.ts`.)

## P0 — boot (StartupResourceLoader.as / LoaderCreate.as) ou citado na tarefa

| Endpoint | AS3 caller | C# handler | Tabelas | Status |
|---|---|---|---|---|
| `SceneCollecRandomNpc.ashx` | `ddt/loader/LoaderCreate.as` (boot) | `Tank.Request/scenecollecrandomnpc.cs:26` → `Road.Flash/FlashUtils.cs:9-12` | nenhuma (valores literais) | **Implementado** (`m3.ts`) |
| `SubActiveList.ashx` | `ddt/loader/LoaderCreate.as` (boot) | `Tank.Request/subactivelist.cs:26-41` → `PlayerBussiness.GetAllSubActive`/`GetAllSubActiveCondition` | `game.Sub_Active_List`, `game.Sub_Active_Condition` (4.1-era, já existiam, nunca ligadas) | **Implementado** (`m3.ts`) |
| `UpdateVersion.ashx` | `ddt/loader/StartupResourceLoader.as` (boot) | `Tank.Request/UpdateVersion.cs:11-13` | nenhuma (`"1"` literal) | **Implementado** (`m3.ts`) |
| `AdvanceQuestTime.ashx` | citado na tarefa | `Tank.Request/AdvanceQuestTime.cs:19-38` (bloco Bussiness vazio no próprio original; sempre escreve `"0,{DateTime.Now},0"` texto puro) | nenhuma | **Implementado**, promovido de stub (`m3.ts`) |
| `VoteSubmit.ashx` | citado na tarefa | `Tank.Request/VoteSubmit.cs:9-11` | nenhuma (`"1"` literal) | **Implementado**, promovido de stub (`m3.ts`) |
| `LogTime.ashx` | citado na tarefa | `Tank.Request/LogTime.cs:14-16` | nenhuma (`"1"` literal) | **Implementado**, promovido de stub (`m3.ts`) |
| `UserApprenticeshipInfoList.ashx` | citado na tarefa | — | `player.Sys_Users_Detail` | já estava **PORTED** antes desta tarefa (`social.ts`) |
| `AdvanceQuestionRead.ashx` | citado na tarefa | — | — | já estava **PORTED** antes desta tarefa (`social.ts`) |
| `GetFightReport.ashx` | `ddt/loader/LoaderCreate.as` (boot) | **não encontrado** em nenhum projeto do vendor (`Tank.Request`, `Fighting.Server`, `Center.Server`) | — | **Sem fonte** — fica no fallback zlib-vazio (já em `COMPRESS_ASHX_6600`); não dá para portar lógica que não existe no dump |
| `ConsortiaBossConfigLoad.xml` | `ddt/loader/LoaderCreate.as` (boot) | `Bussiness/ConsortiaBussiness.cs:735-764 GetConsortiaBossConfigAll` → `SP_Consortia_Boss_Config_All` | `player.Consortia_Boss_Config` (4.1-era, 0 linhas, nunca ligada) | **Implementado** (`defs.ts`, `elem="item"`, sem `BossLevel` — o builder original também nunca emite essa coluna) |
| `ActivityHalloweenItems.xml` | boot | sem `.cs` dedicado (snapshot) | `game.Activity_Halloween_Items` (m1-schema) | **Implementado** — builder agrupado por `rewardLevel` (`<items>` wrapper), `<item>` ordenado `templateId DESC` |
| `CardGrooveUpdateList.xml` | boot | sem `.cs` dedicado | `game.Card_Groove_Update` | **Implementado** |
| `CardTemplateInfo.xml` | boot | sem `.cs` dedicado | `game.Card_Template_Info` | **Implementado** |
| `DiceGameAwardItem.xml` | boot | sem `.cs` dedicado | `game.Dice_Game_Award` | **Implementado** (`rank`/`template`/`count` minúsculos — colunas da tabela também são) |
| `EveryDayActivePointTemplateInfoList.xml` | boot (`dayActivity/DayActivityManager.as`) | sem `.cs` dedicado | `game.Every_Day_Active_Point_Template` (m1-schema) | **Implementado** |
| `EveryDayActiveProgressInfoList.xml` | boot (`dayActivity/DayActivityManager.as`) | sem `.cs` dedicado | `game.Every_Day_Active_Progress` (m1-schema) | **Implementado** |
| `EveryDayActiveRewardTemplateInfoList.xml` | boot (`dayActivity/DayActivityManager.as`) | sem `.cs` dedicado | `game.Every_Day_Active_Reward_Template` (m1-schema) | **Implementado** |
| `LightRiddleQuest.xml` | boot | sem `.cs` dedicado | `game.Lightriddle_Quest` | **Implementado** (sem `OptionTrue` — não expor a resposta certa ao cliente) |
| `LoadPetFormData.xml` | boot | sem `.cs` dedicado | `game.Pet_Form_Data` (m1-schema) | **Implementado** |
| `MagicStoneTemplate.xml` | boot | sem `.cs` dedicado | `game.Magicstone_Template` | **Implementado** |
| `MountDrawTemplate.xml` | boot | sem `.cs` dedicado | `game.Mount_Draw_Template` (m1-schema) | **Implementado** |
| `MountSkillElementTemplate.xml` | boot | sem `.cs` dedicado | `game.Mount_SKill_Element_Tempalate` (m1-schema) | **Implementado** |
| `MountSkillGetTemplate.xml` | boot | sem `.cs` dedicado | `game.Mount_SKill_Get_Template` (m1-schema) | **Implementado** |
| `MountSkillTemplate.xml` | boot | sem `.cs` dedicado | `game.Mount_Skill_Template` (m1-schema) | **Implementado** |
| `MountTemplate.xml` | boot | sem `.cs` dedicado | `game.Mount_Template` (m1-schema) | **Implementado** |
| `SearchGoodsTemp.xml` | boot | `Tank.Request/searchgoodstemp.cs:30-55` (builder, admin-rebuild) → `ProduceBussiness.GetAllSearchGoodsTemp` | `game.Search_Goods_Temp` (4.1-era, nunca ligada) | **Implementado** (`endpoint: "/searchgoodstemp.ashx"`) |
| `TreeTemplateList.xml` | boot | sem `.cs` dedicado | `game.Tree_Template` | **Implementado** |
| `ActiveConvertItemInfo.xml` | boot | sem `.cs` dedicado | `game.Active_Convert_Item` (4.1-era, nunca ligada) | **Implementado** |
| `CardInfoList.xml` | boot | **nenhum `.cs` em nenhuma das duas vendors** — sempre foi snapshot estático offline (GameAdmin) | `game.Card_Info` + `game.Card_Group` | **Implementado** — 5 `<Card>` sempre, ordenado `TemplateID DESC`, preenchido com `ID=0` (padrão confirmado no snapshot 4.1 e 6600) |
| `FairBattleRewardTemp.xml` | boot (`battleGroud/BattleGroudManager.as`) | sem `.cs` dedicado | `game.Fair_Battle_Reward_Temp` (já usada por `DailyLeagueLevelList.ashx` com outro spec) | **Implementado** — segundo arquivo sobre a mesma tabela, spec de 6 atributos |
| `ActivitySystemItemsRate.xml` | boot | sem `.cs` encontrado | sem tabela (`Activity_System_Item` existente tem `Probability`, não `Rate`; não é a mesma fonte) | não implementado — precisa schema novo ou confirmar se é a mesma tabela com outro nome de coluna |
| `ButtonConfig.xml` | boot | `SqlDataProvider/Data/ButtonConfigInfo.cs` (classe de dados existe; sem `GetAllButtonConfig` em `Bussiness`) | sem tabela no nosso schema | não implementado — precisa schema novo |
| `ChargeSpendRewardTemplateInfoList.xml` | boot | sem `.cs` dedicado | sem tabela encontrada (parecido com `Login_Award_Item_Template` mas não é a mesma estrutura) | não implementado — precisa schema novo |
| `CommunalActive.xml` | boot | sem `.cs` dedicado | `game.Communal_Active` + `game.Communal_Active_Award` + `game.Communal_Active_Exp` (3 tabelas, estrutura aninhada `<Active>`/`<ActiveExp>`/provável `<ActiveAward>`) | não implementado — builder de 3 tabelas aninhadas, fora do orçamento desta tarefa |
| `FoodComposeList.xml` | boot | sem `.cs` nem tabela encontrada | — | não implementado — precisa schema novo |
| `FusionInfoLoad.xml` | boot | sem `.cs` dedicado | `game.Fusion`/`game.Item_Fusion` existem mas **nenhuma bate** com as colunas do XML (`Count1-4`, `FusionRate`, `FusionType` não existem em nenhuma das duas) | não implementado — precisa schema novo (ou achar a tabela certa) |
| `GmActivityInfo.xml` | boot | sem `.cs` dedicado | `game.GM_Activity` + `game.GM_Gift` + `game.GM_Active_Reward` + `game.GM_Active_Condition` (4 tabelas aninhadas) | não implementado — builder de 4 tabelas aninhadas, fora do orçamento desta tarefa |
| `GoodsCollect.xml` | boot (`LightRoadDataAnalyzer`, confirmado em `research/6600/xml-diff.md` como "ok" via fallback) | sem `.cs`/tabela encontrada | — | não implementado — precisa schema novo |
| `HelpGameReward.xml` | boot (`rescue/data/RescueRewardAnalyzer.as`, 277 RESCUE) | **implementado (m4-resgate, 2026-10-19)** — `SqlDataProvider.Data/HelpGameRewardInfo.cs` + `Bussiness/Managers/HelpGameRewardMgr.cs` existem (achados numa busca mais ampla, fora de `Tank.Request`/`Game.Server`), mas sem SP/`.ashx` real e 0 linhas em qualquer dump — mesma categoria "0 linhas na origem" do baú da galinha/dados | — | servido de `app."ScheduledEvents"` kind "rescue" (`apps/api/src/templates/defs.ts helpGameReward`), mesma fonte que `apps/game/src/game/rescue.ts rewardTiersFor` usa pra dar o prêmio de verdade — sem tabela nova |
| `ItemStrengthenPlusData.xml` | boot | — | — | **ausente até no snapshot vendor do 6600** (confirmado em `research/6600/xml-diff.md`) — referência morta no cliente, nada a portar |
| `LoadAllQuestions.xml` | boot | sem `.cs` dedicado | sem tabela própria (parecido com `game.Lightriddle_Quest` mas tem `QuestionCatalogID` extra e já existe só como snapshot estático) | não implementado — precisa schema novo (coluna de catálogo) |
| `LoadChargeActiveTemplate.xml` | boot | sem `.cs`/tabela encontrada | — | não implementado — precisa schema novo |
| `LotteryShowTemplate.xml` | boot | sem `.cs`/tabela encontrada | — | não implementado — precisa schema novo |
| `MagicItemTemp.xml` | boot | sem `.cs`/tabela encontrada (distinto de `Magicstone_Template`, que já tem outro schema) | — | não implementado — precisa schema novo |
| `MissionEnergyPrice.xml` | boot | `Tank.Request/missionenergyprice.cs:30-55` (builder, admin-rebuild) → `ProduceBussiness.GetAllMissionEnergyInfo` | sem tabela no nosso schema (`SP_MissionEnergyInfo_All`, nenhuma tabela `Mission_Energy_*` existe) | não implementado — precisa schema novo |
| `RankTemplateAll.xml` | não identificado (string com `?type=` não casa no grep simples) | sem `.cs`/tabela encontrada | — | não implementado — precisa mais pesquisa (provável sistema de "títulos" paralelo ao `New_Title`) |
| `SearchGoodsPayMoney.xml` | boot | sem `.cs` dedicado | sem tabela encontrada (`Number`/`NeedMoney`, não é `Search_Goods_Temp`) | não implementado — precisa schema novo |
| `ShopBox.xml` | boot | sem `.cs` dedicado | snapshot do 6600 já está vazio (`<Result value="true" message="Success!" />`) — o fallback atual já bate byte a byte | **sem ação necessária** — já correto via fallback |
| `DailyLeagueAward.xml` | boot | — | sem tabela (`SP_Daily_League_Award_All` não existe em nenhuma base) | já documentado/decidido antes desta tarefa — fallback para snapshot (`defs.ts`, comentário existente) |

## P1 — janela específica (calendário, guilda, loja, PvE, VIP…)

| Endpoint | AS3 caller / janela | C# handler | Tabelas | Status |
|---|---|---|---|---|
| `TeamBuyActiveAwardInfo.ashx` | compra em grupo | `Tank.Request/teambuyactiveawardinfo.cs:13-19` (sempre `value=false message="Success!"`, feature nunca terminada no original) | nenhuma | **Implementado** (`m3.ts`) |
| `ConsortiaWarConsortiaRank.ashx` | `consortion/ConsortionModelControl.as` (guerra de guildas) | `Tank.Request/consortiawarconsortiarank.cs:13-21` (sempre `value=false message="fail!"` com um `<Item/>` vazio) | nenhuma | **Implementado** (`m3.ts`) |
| `ConsortiaWarPlayerRank.ashx` | `consortion/ConsortionModelControl.as` (guerra de guildas) | `Tank.Request/consortiawarplayerrank.cs:13-29` (eco de um `<Item>` fixo quando `ConsortiaID`+`UserID` vêm preenchidos — não é leitura de banco no original) | nenhuma | **Implementado** (`m3.ts`) |
| `ConsortiaBossConfigLoad.xml` | ver P0 (listado nos dois por ser citado explicitamente na tarefa e carregado no boot) | | | |
| `CardInfoList.xml` | ver P0 | | | |
| `CelebByTotalPrestige.xml` | `battleGroud/BattleGroudManager.as` (ranking de campo de batalha) | `Tank.Request.CelebList/celebbytotalprestige.cs:21-33` → `csFunction.BuildCelebTotalPrestige` | provável `player.V_Sys_Users_Detail` (mesma família de `CelebList`, ordenação por "prestígio") | não implementado — precisa achar a coluna/ordem exata de "prestige" antes de portar (evitar adivinhar ranking) |
| `ConsortiaMatchHistory.ashx` | `kingDivision/KingDivisionManager.as` (Liga dos Exploradores) | **não encontrado** no vendor | — | **Sem fonte** — fallback genérico (`Result value="false"`) |
| `DragonBoatFriendInfos.ashx` | `drgnBoatBuild/DrgnBoatBuildManager.as` (evento Barco-Dragão) | **não encontrado** no vendor | — | **Sem fonte** — fallback genérico |
| `EliteMatchPrizeList.xml` | `eliteGame/EliteGameController.as` | sem `.cs`/tabela encontrada; sem até snapshot no vendor (`NO SNAPSHOT`) | — | não implementado — sem referência pra conferir formato |
| `ItemStrengthenData.xml` | `store/StrengthDataManager.as` (loja de fortalecimento) | sem `.cs` dedicado | sem tabela (`Item_Strengthen` existente tem outro spec, `StrengthenLevel`/`Rock*`, não `TemplateID`/`Data`) | não implementado — precisa schema novo |
| `LoginRemoveSmallAccount.ashx` | `login/view/ChooseRoleFrame.as` (seleção de personagem) | **não encontrado** no vendor | — | **Sem fonte** — fallback genérico |
| `ProxyVIP.ashx` | `yyvip/view/YYVipDailyAwardView.as` | **não encontrado** no vendor | — | **Sem fonte** — fallback genérico |
| `RecordSysInfo.ashx` | `SendRecord/SendRecordManager.as` (telemetria) | **não encontrado** no vendor | — | **Sem fonte** — fallback genérico |
| `RecordUserVersion.ashx` | `ddt/loader/StartupResourceLoader.as` (boot) | **não encontrado** no vendor | — | **Sem fonte** — fallback genérico |
| `ResetPassword4399.ashx` | `ddt/loader/LoaderCreate.as` (portal externo 4399) | **não encontrado** no vendor | — | **Sem fonte** — fallback genérico; SSO de portal chinês, fora de escopo mesmo se achássemos a fonte (igual `directlogin.ashx`, `research/6600/client-boot.md`) |
| `User_LotteryRank.xml` | `ddt/view/caddyII/badLuck/ReceiveBadLuckAwardFrame.as` | sem `.cs`/tabela encontrada; sem snapshot no vendor | — | não implementado — sem referência pra conferir formato |
| `WarriorFamRankList.xml` | `labyrinth/LabyrinthManager.as` (labirinto PvE) | sem `.cs`/tabela encontrada | — | não implementado — precisa schema novo |

## P2 — sem fonte, sem tabela, ou lixo no próprio cliente

| Endpoint | Observação |
|---|---|
| `Casdfsdf.ashx` | string literal dentro de `lottery/LotteryManger.as` — nome não decodificável, parece teste/placeholder esquecido no próprio cliente 6600. Não portar. |
| `AdvanceQuestTime.ashx`, `VoteSubmit.ashx`, `LogTime.ashx` | movidos para P0 (citados na tarefa) — ver tabela P0 |
| (demais sem tabela da lista P0/P1) | já cobertos acima com a razão específica de cada um |

## O que mudou no código

- `apps/api/src/request/endpoints/m3.ts` (novo): `SceneCollecRandomNpc`, `SubActiveList`,
  `UpdateVersion`, `VoteSubmit`, `LogTime`, `AdvanceQuestTime`, `TeamBuyActiveAwardInfo`,
  `ConsortiaWarConsortiaRank`, `ConsortiaWarPlayerRank`.
- `apps/api/src/request/registry.ts`: registra os 9 endpoints de `m3.ts` em `PORTED`; remove
  `AdvanceQuestTime.ashx`/`VoteSubmit.ashx`/`LogTime.ashx` de `STUBS` (agora respondem de verdade
  pro cliente 6600; o 4.1 continua recebendo a mesma resposta `Not supported` de antes, já que
  DDTank41 nunca teve handler pra essas URLs).
- `apps/api/src/templates/defs.ts`: 19 `TemplateDef` novos (18 `flat()` + 2 builders dedicados —
  `ActivityHalloweenItems` agrupado por `rewardLevel`, `CardInfoList` com padding de 5 `<Card>`) +
  11 specs novos em `S`.
- `apps/api/test/api.test.ts`: `describe("M3 ashx + templates (research/6600/ashx-missing.md)")`
  com 1+ teste por endpoint implementado (28 testes), usando as linhas reais já seedadas em
  `packages/db/seed` sempre que existiam (a maioria das tabelas m1-schema já tinha dados — só
  `Consortia_Boss_Config`/`Active_Convert_Item`/`Every_Day_Active_Point_Template`/
  `Every_Day_Active_Reward_Template` estavam vazias).

## Pendências (fora do orçamento desta tarefa, para a próxima fatia do M3)

1. **Schema novo** (M1 tarefa 1 do `docs/plan/MIGRACAO-6600.md`, não desta tarefa): `ButtonConfig`,
   `ChargeSpendRewardTemplateInfoList`, `FoodComposeList`, `FusionInfoLoad` (colunas
   `Count1-4`/`FusionRate`/`FusionType` não existem em `Fusion`/`Item_Fusion`), `GoodsCollect`,
   `ItemStrengthenData`, `LoadAllQuestions`, `LoadChargeActiveTemplate`,
   `LotteryShowTemplate`, `MagicItemTemp`, `MissionEnergyPrice`, `SearchGoodsPayMoney`,
   `WarriorFamRankList`, `ActivitySystemItemsRate` (confirmar se é mesma tabela com coluna
   renomeada antes de criar schema novo).
2. **Builders aninhados** (complexidade maior, não schema): `CommunalActive.xml` (3 tabelas),
   `GmActivityInfo.xml` (4 tabelas).
3. **Sem fonte C# em nenhum vendor** (`GetFightReport`, `ConsortiaMatchHistory`,
   `DragonBoatFriendInfos`, `LoginRemoveSmallAccount`, `ProxyVIP`, `RecordSysInfo`,
   `RecordUserVersion`, `ResetPassword4399`): ficam no fallback genérico; portar exigiria pesquisa
   em outro dump do 6600 (este vendor não tem o `.cs` de nenhum deles) ou decidir o comportamento
   do zero (não recomendado sem a fonte original, quebra a regra "comportamento deve bater com o
   C# original").
4. **Sem referência pra conferir formato** (`EliteMatchPrizeList.xml`, `User_LotteryRank.xml`):
   nem o snapshot do vendor tem o arquivo — qualquer builder seria um chute sem como validar.
5. **Pesquisa pendente**: `RankTemplateAll.xml` (AS3 caller não identificado pelo grep simples por
   causa do `?type=` concatenado — achar o `.as` real antes de decidir a tabela) e
   `CelebByTotalPrestige.xml` (achar a coluna de "prestígio" certa em `V_Sys_Users_Detail` antes de
   portar, pra não inventar um ranking).
