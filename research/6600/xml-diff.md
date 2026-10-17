# XML diff: cliente 6600 (boot/lobby) vs /request do nosso servidor

Gerado por `tools/qa/xml-diff-6600.mjs` contra `http://localhost:8091/request/` (nosso) e `vendor/DDT-6600/Request` (snapshot original).
Lista de arquivos: todo `solveRequestPath("X.xml")` em LoaderCreate.as (tela de loading pós-login), 79 arquivos únicos. Analyzer de cada um resolvido pelo `loader.analyzer = new XAnalyzer(...)` adjacente.

**Resumo:** 1/79 arquivos com pelo menos uma diferença de elemento ou atributo.

## Metodologia e limitações

- **Agrupamento por nome de tag, não por caminho completo**: os analyzers quase sempre navegam com E4X descendente (`xml..Item`), que ignora profundidade/wrapper — então um elemento `Item` dentro de `ItemTemplate` conta como o mesmo `Item` direto sob `Result`. Reduz falso-positivo de "elemento ausente" só por wrapper diferente, mas pode juntar tags de mesmo nome usadas em contextos diferentes dentro do mesmo arquivo (raro nesses templates, não observado nesta rodada).
- **"Lido pelo analyzer" (✅/❌) cobre dois padrões**: `xml.@Attr` direto no analyzer, e `ObjectUtils.copyPorpertiesByXML(infoVar, xmlItem)` (com.pickgliss.utils.ObjectUtils.as:34-61) — nesse segundo caso o atributo só é lido se a classe de `infoVar` (resolvida por `new Classe()` no mesmo arquivo) declarar uma `public var`/getter-setter de mesmo nome. Não cobre analyzers que delegam pra uma 3a classe (ex. `QuestListAnalyzer` → `QuestInfo.createFromXML`, verificado manualmente pro caso do QuestList) nem reflexão por outros meios (`describeType`, `for each (var p in obj)`).
- ❌ não é "pode ignorar": é "este analyzer específico não lê", verificar manualmente antes de apagar um atributo de qualquer gerador — o 4.1 ignora atributo desconhecido, mas outra tela/handler no 6600 pode ler.

## Tabela resumo

| Arquivo | Analyzer(s) | Nosso | Snapshot | Caminhos ausentes | Atributos ausentes (lidos/total) |
|---|---|---|---|---|---|
| AchievementList | EffortItemTemplateInfoAnalyzer | ok | ok | 0 | 0/0 |
| ActivityHalloweenItems | HalloweenDataAnalyzer | ok | ok | 0 | 0/0 |
| ActivityQuestList | GodsRoadsDataAnalyzer,SevenDayTargetDataAnalyzer | ok | ok | 0 | 0/0 |
| ActivitySystemItems | ActivitySystemItemsDataAnalyzer | ok | ok | 0 | 0/0 |
| ActivitySystemItemsRate | AddPublicTipDataAnalyzer | ok | ok | 0 | 0/0 |
| BallList | BallInfoAnalyzer | ok | ok | 0 | 0/0 |
| BombConfig | WeaponBallInfoAnalyze | ok | ok | 0 | 0/0 |
| ButtonConfig | HallIconDataAnalyz | ok | ok | 0 | 0/0 |
| CardBuffList | SetsPropertiesAnalyzer | ok | ok | 0 | 0/0 |
| CardGrooveUpdateList | CardGrooveEventAnalyzer | ok | ok | 0 | 0/0 |
| CardInfoList | SetsSortRuleAnalyzer | ok | ok | 0 | 0/0 |
| CardTemplateInfo | CardTemplateAnalyzer | ok | ok | 0 | 0/0 |
| ChargeSpendRewardTemplateInfoList | RechargeAnalyer | ok | ok | 0 | 0/0 |
| ClothGroupTemplateInfo | AvatarCollectionItemDataAnalyzer | ok | ok | 0 | 0/0 |
| ClothPropertyTemplateInfo | AvatarCollectionUnitDataAnalyzer | ok | ok | 0 | 0/0 |
| CommunalActive | DragonBoatActiveDataAnalyzer | ok | ok | 0 | 0/0 |
| ConsortiaBadgeConfig | BadgeInfoAnalyzer | ok | ok | 0 | 0/0 |
| ConsortiaBossConfigLoad | ConsortiaBossDataAnalyzer | ok | ok | 0 | 0/0 |
| DailyAwardList | DaylyGiveAnalyzer | ok | ok | 0 | 0/0 |
| DailyLeagueAward | DailyLeagueAwardAnalyzer | ok | ok | 0 | 0/0 |
| DailyLeagueLevel | DailyLeagueLevelAnalyzer | ok | ok | 0 | 0/0 |
| DiceGameAwardItem | SuperWinnerAnalyze | ok | ok | 0 | 0/0 |
| EveryDayActivePointTemplateInfoList | ActivityAnalyzer | ok | ok | 0 | 0/0 |
| EveryDayActiveProgressInfoList | ActivePointAnalzer | ok | ok | 0 | 0/0 |
| EveryDayActiveRewardTemplateInfoList | ActivityRewardAnalyzer | ok | ok | 0 | 0/0 |
| ExerciseInfoList | TexpExpAnalyze | ok | ok | 0 | 0/0 |
| FoodComposeList | FoodComposeListAnalyzer | ok | ok | 0 | 0/0 |
| FusionInfoLoad | FusionNewDataAnalyzer | ok | ok | 0 | 0/0 |
| GmActivityInfo | WonderfulGMActAnalyer | ok | ok | 0 | 0/0 |
| GoldEquipTemplateLoad | WishInfoAnalyzer | ok | ok | 0 | 0/0 |
| GoodsCollect | LightRoadDataAnalyzer | ok | ok | 0 | 0/0 |
| HelpGameReward | RescueRewardAnalyzer | ok | ok | 0 | 0/0 |
| ItemStrengthenGoodsInfo | ItemStrengthenGoodsInfoAnalyzer | ok | ok | 0 | 0/0 |
| ItemStrengthenPlusData | GoodsAdditionAnalyer | HTTP 404 | ausente no snapshot vendor | - | - |
| LevelList | ExpericenceAnalyze | ok | ok | 0 | 0/0 |
| LightRiddleQuest | LanternDataAnalyzer | ok | ok | 0 | 0/0 |
| LoadAllQuestions | QuestionInfoAnalyze | ok | ok | 0 | 0/0 |
| LoadBoxTemp | BoxTempInfoAnalyzer | ok | ok | 0 | 0/0 |
| LoadChargeActiveTemplate | WonderfulActAnalyer | ok | ok | 0 | 0/0 |
| LoadItemsCategory | GoodCategoryAnalyzer | ok | ok | 0 | 0/0 |
| LoadMapsItems | MapAnalyzer | ok | ok | 0 | 0/0 |
| LoadPetFightProperty | PetsEvolutionDataAnalyzer | ok | ok | 0 | 0/0 |
| LoadPetFormData | PetsFormDataAnalyzer | ok | ok | 0 | 0/0 |
| LoadPetMoeProperty | PetMoePropertyAnalyzer | ok | ok | 0 | 0/0 |
| LoadPetStarExp | PetsRisingStarDataAnalyzer | ok | ok | 0 | 0/0 |
| LoadPVEItems | DungeonAnalyzer | ok | ok | 0 | 0/0 |
| LoadStrengthExp | StoreEquipExpericenceAnalyze | ok | ok | 0 | 0/0 |
| LoadUserBox | UserBoxInfoAnalyzer | ok | ok | 0 | 0/0 |
| LoginAwardItemTemplate | AccumulativeLoginAnalyer | ok | ok | 0 | 0/0 |
| LotteryShowTemplate | CaddyAwardDataAnalyzer | ok | ok | 0 | 0/0 |
| MagicItemTemp | EnchantInfoAnalyzer | ok | ok | 0 | 0/0 |
| MagicStoneTemplate | MagicStoneTempAnalyer | ok | ok | 0 | 0/0 |
| MapServerList | WeekOpenMapAnalyze | ok | ok | 0 | 0/0 |
| MissionEnergyPrice | EnergyDataAnalyzer | ok | ok | 0 | 0/0 |
| MountDrawTemplate | HorsePicCherishAnalyzer | ok | ok | 0 | 0/0 |
| MountSkillElementTemplate | HorseSkillElementDataAnalyzer | ok | ok | 0 | 0/0 |
| MountSkillGetTemplate | HorseSkillGetDataAnalyzer | ok | ok | 0 | 0/0 |
| MountSkillTemplate | HorseSkillDataAnalyzer | ok | ok | 0 | 0/0 |
| MountTemplate | HorseTemplateDataAnalyzer | ok | ok | 0 | 0/0 |
| NewTitleInfo | NewTitleDataAnalyz | ok | ok | 0 | 0/0 |
| PetConfigInfo | PetconfigAnalyzer | ok | ok | 0 | 0/1 |
| PetLevelInfo | PetExpericenceAnalyze | ok | ok | 0 | 0/0 |
| Petskillinfo | PetSkillAnalyzer | ok | ok | 0 | 0/0 |
| PetSkillTemplateInfo | PetAllSkillAnalyzer | ok | ok | 0 | 0/0 |
| PetTemplateInfo | PetInfoAnalyzer | ok | ok | 0 | 0/0 |
| QuestList | QuestListAnalyzer | ok | ok | 0 | 0/0 |
| RuneTemplateList | BeadAnalyzer | ok | ok | 0 | 0/0 |
| SearchGoodsPayMoney | SearchGoodsPayAnalyer | ok | ok | 0 | 0/0 |
| SearchGoodsTemp | UpdateStarAnalyer | ok | ok | 0 | 0/0 |
| ServerConfig | ServerConfigAnalyz | ok | ok | 0 | 0/0 |
| ShopBox | ItemTempleteAnalyzer | ok | ok | 0 | 0/0 |
| ShopGoodsShowList | ShopItemSortAnalyzer | ok | ok | 0 | 0/0 |
| ShopItemList | ShopItemAnalyzer | ok | ok | 0 | 0/0 |
| SuitPartEquipInfoList | EquipSuitTempleteAnalyzer | ok | ok | 0 | 0/0 |
| SuitTemplateInfoList | SuitTempleteAnalyzer | ok | ok | 0 | 0/0 |
| TemplateAllList | ItemTempleteAnalyzer | ok | ok | 0 | 0/0 |
| TotemHonorTemplate | HonorUpDataAnalyz | ok | ok | 0 | 0/0 |
| TotemInfo | TotemDataAnalyz | ok | ok | 0 | 0/0 |
| TreeTemplateList | FarmTreePoultryListAnalyzer | ok | ok | 0 | 0/0 |

## Detalhe por arquivo

### AchievementList.xml
- analyzer: EffortItemTemplateInfoAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### ActivityHalloweenItems.xml
- analyzer: HalloweenDataAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### ActivityQuestList.xml
- analyzer: GodsRoadsDataAnalyzer, SevenDayTargetDataAnalyzer (2/2 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### ActivitySystemItems.xml
- analyzer: ActivitySystemItemsDataAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### ActivitySystemItemsRate.xml
- analyzer: AddPublicTipDataAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### BallList.xml
- analyzer: BallInfoAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### BombConfig.xml
- analyzer: WeaponBallInfoAnalyze (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### ButtonConfig.xml
- analyzer: HallIconDataAnalyz (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### CardBuffList.xml
- analyzer: SetsPropertiesAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### CardGrooveUpdateList.xml
- analyzer: CardGrooveEventAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### CardInfoList.xml
- analyzer: SetsSortRuleAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### CardTemplateInfo.xml
- analyzer: CardTemplateAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### ChargeSpendRewardTemplateInfoList.xml
- analyzer: RechargeAnalyer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### ClothGroupTemplateInfo.xml
- analyzer: AvatarCollectionItemDataAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### ClothPropertyTemplateInfo.xml
- analyzer: AvatarCollectionUnitDataAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### CommunalActive.xml
- analyzer: DragonBoatActiveDataAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### ConsortiaBadgeConfig.xml
- analyzer: BadgeInfoAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### ConsortiaBossConfigLoad.xml
- analyzer: ConsortiaBossDataAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### DailyAwardList.xml
- analyzer: DaylyGiveAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### DailyLeagueAward.xml
- analyzer: DailyLeagueAwardAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### DailyLeagueLevel.xml
- analyzer: DailyLeagueLevelAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### DiceGameAwardItem.xml
- analyzer: SuperWinnerAnalyze (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### EveryDayActivePointTemplateInfoList.xml
- analyzer: ActivityAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### EveryDayActiveProgressInfoList.xml
- analyzer: ActivePointAnalzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### EveryDayActiveRewardTemplateInfoList.xml
- analyzer: ActivityRewardAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### ExerciseInfoList.xml
- analyzer: TexpExpAnalyze (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### FoodComposeList.xml
- analyzer: FoodComposeListAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### FusionInfoLoad.xml
- analyzer: FusionNewDataAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### GmActivityInfo.xml
- analyzer: WonderfulGMActAnalyer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### GoldEquipTemplateLoad.xml
- analyzer: WishInfoAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### GoodsCollect.xml
- analyzer: LightRoadDataAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### HelpGameReward.xml
- analyzer: RescueRewardAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### ItemStrengthenGoodsInfo.xml
- analyzer: ItemStrengthenGoodsInfoAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### ItemStrengthenPlusData.xml
- analyzer: GoodsAdditionAnalyer
- nosso: **HTTP 404**
- snapshot 6600: **ausente no snapshot vendor**

### LevelList.xml
- analyzer: ExpericenceAnalyze (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### LightRiddleQuest.xml
- analyzer: LanternDataAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### LoadAllQuestions.xml
- analyzer: QuestionInfoAnalyze (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### LoadBoxTemp.xml
- analyzer: BoxTempInfoAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### LoadChargeActiveTemplate.xml
- analyzer: WonderfulActAnalyer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### LoadItemsCategory.xml
- analyzer: GoodCategoryAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### LoadMapsItems.xml
- analyzer: MapAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### LoadPetFightProperty.xml
- analyzer: PetsEvolutionDataAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### LoadPetFormData.xml
- analyzer: PetsFormDataAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### LoadPetMoeProperty.xml
- analyzer: PetMoePropertyAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### LoadPetStarExp.xml
- analyzer: PetsRisingStarDataAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### LoadPVEItems.xml
- analyzer: DungeonAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### LoadStrengthExp.xml
- analyzer: StoreEquipExpericenceAnalyze (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### LoadUserBox.xml
- analyzer: UserBoxInfoAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### LoginAwardItemTemplate.xml
- analyzer: AccumulativeLoginAnalyer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### LotteryShowTemplate.xml
- analyzer: CaddyAwardDataAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### MagicItemTemp.xml
- analyzer: EnchantInfoAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### MagicStoneTemplate.xml
- analyzer: MagicStoneTempAnalyer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### MapServerList.xml
- analyzer: WeekOpenMapAnalyze (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### MissionEnergyPrice.xml
- analyzer: EnergyDataAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### MountDrawTemplate.xml
- analyzer: HorsePicCherishAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### MountSkillElementTemplate.xml
- analyzer: HorseSkillElementDataAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### MountSkillGetTemplate.xml
- analyzer: HorseSkillGetDataAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### MountSkillTemplate.xml
- analyzer: HorseSkillDataAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### MountTemplate.xml
- analyzer: HorseTemplateDataAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### NewTitleInfo.xml
- analyzer: NewTitleDataAnalyz (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### PetConfigInfo.xml
- analyzer: PetconfigAnalyzer (1/1 arquivo(s) .as encontrado(s))
- **Atributos ausentes** (✅ = o analyzer 6600 lê de verdade, prioridade; ❌ = presente no XML mas não lido por este analyzer):
  - ❌ `item` @NotRemoveLevel

### PetLevelInfo.xml
- analyzer: PetExpericenceAnalyze (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### Petskillinfo.xml
- analyzer: PetSkillAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### PetSkillTemplateInfo.xml
- analyzer: PetAllSkillAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### PetTemplateInfo.xml
- analyzer: PetInfoAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### QuestList.xml
- analyzer: QuestListAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### RuneTemplateList.xml
- analyzer: BeadAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### SearchGoodsPayMoney.xml
- analyzer: SearchGoodsPayAnalyer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### SearchGoodsTemp.xml
- analyzer: UpdateStarAnalyer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### ServerConfig.xml
- analyzer: ServerConfigAnalyz (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### ShopBox.xml
- analyzer: ItemTempleteAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### ShopGoodsShowList.xml
- analyzer: ShopItemSortAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### ShopItemList.xml
- analyzer: ShopItemAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### SuitPartEquipInfoList.xml
- analyzer: EquipSuitTempleteAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### SuitTemplateInfoList.xml
- analyzer: SuitTempleteAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### TemplateAllList.xml
- analyzer: ItemTempleteAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### TotemHonorTemplate.xml
- analyzer: HonorUpDataAnalyz (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### TotemInfo.xml
- analyzer: TotemDataAnalyz (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.

### TreeTemplateList.xml
- analyzer: FarmTreePoultryListAnalyzer (1/1 arquivo(s) .as encontrado(s))
- sem diferenças detectadas (atributos/elementos) nos primeiros 200 itens por caminho.


## Status (M1 tarefa 2-3, docs/plan/MIGRACAO-6600.md)

Corrigidos nesta rodada (apps/api/src/templates/defs.ts): QuestList.xml (`<Rate>` + RewardBindMoney/OneKeyFinishNeedMoney/CollocationCost/CollocationColdTime/Level2-5NeedMoney/RewardItemCount1-5), SuitPartEquipInfoList.xml e SuitTemplateInfoList.xml (bug preexistente de case no nome do elemento, `Item`→`item`, afetava a 4.1 também), ActivitySystemItems.xml (`Probability`), LoginAwardItemTemplate.xml (`AttackCompose`), TemplateAllList.xml (`FloorPrice`) — todas colunas já existentes, só faltava no spec — e DailyLeagueAward.xml (removido o builder sempre-vazio, agora cai no fallback do snapshot 6600 em request.ts, que também beneficia a 4.1).

Precisa de schema novo (fora de escopo, M1 tarefa 1 — ver docs/plan/MIGRACAO-6600.md §5): `LoadPVEItems.xml` (`EpicTemplateIds`, dificuldade "Épico" acima de Terror em game.Pve_Info; emitido `''` por ora). `QuestList.xml` Level2-5NeedMoney/CollocationCost/CollocationColdTime usam defaults fixos (`-1`/`0`, constantes em 100% da amostra do snapshot 6600) em vez de coluna própria; RewardItemCount1-5 duplica o único RewardItemCount que já temos (diverge em ~0,3% das linhas do snapshot 6600 — aceitável sem schema novo).

Sem ação (atributo presente no XML mas não lido pelo analyzer resolvido, ver Metodologia): `PetConfigInfo.xml` `NotRemoveLevel`, `TemplateAllList.xml` nenhum restante.