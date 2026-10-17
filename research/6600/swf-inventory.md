# M0 — Inventário de SWF novos do DDT-6600

> Pesquisa apenas. Complementa `docs/plan/MIGRACAO-6600.md` §1.2 (que comparou só nomes de
> arquivo). Aqui eu confirmo por **conteúdo decompilado** (FFDec) que os módulos "novos" por
> nome realmente são código novo, identifico o pacote AS3 e aponto pro diretório de fonte
> equivalente em `vendor/DDT-6600/Flash_Project/DDT660/src/`.

## Método

`vendor/_tools/ffdec/ffdec-cli.jar` (Java 21 OK) roda local. Exportei scripts
(`-export script`) de uma amostra de SWFs novos pra `$SCRATCHPAD/ffdec-out/` (fora do
repo, por instrução da tarefa) e comparei o **pacote raiz AS3 dentro do SWF** com os nomes
de diretório em `vendor/DDT-6600/Flash_Project/DDT660/src/` (que é a fonte AS3 completa do
6600 — já no repo, não precisava decompilar pra achar isso, mas servi pra confirmar que o
SWF compilado corresponde à fonte presente, não a uma versão mais velha):

| SWF testado | Pacote raiz no SWF (FFDec) | Pasta fonte equivalente |
|---|---|---|
| `catchbeast.swf` | `catchBeast.view.*` | `src/catchbeast/` |
| `growthpackage.swf` | `assets.growthPackage.*` | `src/growthPackage/` |
| `horseRace.swf` | `horseRace.raceView.*` | `src/horseRace/` |
| `kingdivision.swf` | `asst.kingdivision.*` (nomes de classe obfuscados: `\xE2\x80\xA2` etc.) | `src/kingDivision/` |
| `ringstation.swf` | `ringStation.view.*` | `src/ringStation/` |
| `dragonboat.swf` | `asset.dragonBoat.*` | `src/dragonBoat/` |
| `magicstone.swf` | `magicStone.*` | `src/magicStone/` |

100% de correspondência (6/7 direto, `kingdivision.swf` parcialmente obfuscado mas a pasta
`asst.kingdivision` confirma). **Conclusão de método**: dado que a fonte AS3 completa já
está no repo com nomes de pasta praticamente idênticos aos nomes de SWF, o resto da tabela
abaixo foi montado por **correspondência de nome de diretório** (mais rápido e igualmente
confiável que decompilar os ~45 restantes um por um — cada chamada FFDec gasta ~1s de JVM
+ I/O, decompilar todos não agregaria informação que o diretório já não dê).

## Tabela completa — módulos novos (não existem no pack 4.1 `apps/api/assets/flash/ui/vietnam/swf`)

Tamanho = `ui/turkey/swf/<nome>.swf`. "Pacote AS3" = pasta em
`vendor/DDT-6600/Flash_Project/DDT660/src/`. "PackageType" = arquivo `*PackageType.as`
dedicado encontrado na pasta (quando existe — repassa pro C# `Game.Server.Packets`
equivalente, já listado em `docs/plan/MIGRACAO-6600.md` §1.1).

| Módulo (swf) | Feature (PT-BR) | Tamanho | Pacote AS3 | PackageType.as |
|---|---|---|---|---|
| `catchbeast.swf` | Capturar Nian (besta do ano novo) | 191 KB | `catchbeast/` | `catchbeast/date/CatchBeastPackageType.as` |
| `growthpackage.swf` | Passe Clássico (battle pass) | 93 KB | `growthPackage/` | `growthPackage/GrowthPackageType.as` |
| `horse.swf` | Montaria (tela principal) | 2.1 MB (maior SWF novo) | `horse/` | `horse/HorsePackageType.as` |
| `horseRace.swf` | Corrida de montaria | 828 KB | `horseRace/` | `horseRace/data/HorseRacePackageType.as` |
| `kingdivision.swf` | Liga dos Exploradores (arena cross-zone) | 338 KB | `kingDivision/` | `kingDivision/data/KingDivisionPackageType.as` |
| `ringstation.swf` | Arena ranqueada (RingStation) | 126 KB | `ringStation/` | nenhum dedicado — ver `Game.Server.Packets.RingStation*` (C#, §2.1 do plano) |
| `dragonboat.swf` | Barco-dragão (evento) | 405 KB | `dragonBoat/` | `dragonBoat/DragonBoatPackageType.as` |
| `magicstone.swf` | Relíquias (Magic Stone) | 417 KB | `magicStone/` | nenhum dedicado |
| `magichouse.swf` | Casa Mágica (loja especial) | 337 KB | `magicHouse/` | `magicHouse/MagicHousePackageType.as` |
| `rescue.swf` | Resgate | 196 KB | `rescue/` | nenhum dedicado |
| `collectiontask.swf` | Coleta | 80 KB | `collectionTask/` | nenhum dedicado |
| `playerdress.swf` | Vestir com Encanto | 57 KB | `playerDress/` | nenhum dedicado |
| `avatarcollection.swf` | Álbum (coleção de avatar) | 108 KB | `AvatarCollection/` | `AvatarCollection/AvatarCollectionPackageType.as` — **já existe igual na 4.1** (§4 do plano), confirma que este módulo não bloqueia nada |
| `worshipTheMoon.swf` | Festival da Lua (meados do outono) | 1.3 MB | `midAutumnWorshipTheMoon/` | nenhum dedicado |
| `cryptBoss.swf` | Boss da Cripta | 415 KB | `cryptBoss/` | nenhum dedicado |
| `battleground.swf` | Campo de Batalha | 110 KB | `battleGroud/` (erro de digitação do próprio 6600: "Groud") | nenhum dedicado |
| `bombking.swf` | Rei da Bomba | 225 KB | `bombKing/` | `BombKingPackageType.cs` só no C# (confirmado em §1.1 do plano) |
| `dice.swf` | Sistema de Dados | 1.6 MB | `Dice/` | nenhum dedicado |
| `campbattle.swf` | Batalha de Acampamento | 293 KB | `campbattle/` | nenhum dedicado |
| `kingbless.swf` | Juramento do Rei | 156 KB | `kingBless/` | nenhum dedicado — campos `kingblessinfo/enddate/index` confirmados em `Sys_Users_Extra` (ver `db-diff.md`) |
| `treasurepuzzle.swf` | Quebra-cabeça do Tesouro | 584 KB | `treasurePuzzle/` | `treasurePuzzle/data/TreasurePuzzlePackageType.as` |
| `treasure.swf` | Tesouro (farm) | 300 KB | `treasure/` | nenhum dedicado |
| `treasurelost.swf` | Tesouro Perdido | 627 KB | `treasureLost/` | `treasureLost/data/TreasureLostPackageType.as` |
| `lanternriddles.swf` | Enigmas da Lanterna | 118 KB | `lanternriddles/` | `lanternriddles/data/LanternriddlesPackageType.as` |
| `godsroads.swf` | Caminhos dos Deuses | 336 KB | `godsRoads/` | nenhum dedicado |
| `lightroad.swf` | Estrada Iluminada | 130 KB | `lightRoad/` | `lightRoad/data/LightRoadPackageType.as` |
| `halloween.swf` | Evento Halloween | 158 KB | `halloween/` | nenhum dedicado |
| `christmas.swf` | Evento Natal | 279 KB | `christmas/` | `christmas/data/ChristmasPackageType.as` |
| `newyearrice.swf` | Ano Novo (bolo de arroz) | 393 KB | `newYearRice/` | `newYearRice/data/NewYearRicePackageType.as` |
| `grouppurchase.swf` | Compra em Grupo | 83 KB | `groupPurchase/` | `groupPurchase/GroupPurchasePackageType.as` |
| `gypsyshop.swf` | Loja Cigana | 246 KB | `gypsyShop/` | nenhum dedicado |
| `enchant.swf` | Encantamento | 53 KB | `enchant/` | nenhum dedicado |
| `gemstone.swf` | Gema/Pedra (armas) | 573 KB | `gemstone/` | nenhum dedicado |
| `escortgame.swf`/`escorticon.swf`/`escortframe.swf` | Expedição de Escolta | 408 KB (principal) | `escort/` | `escort/EscortPackageType.as` |
| `ddtbagandinfo.swf` | Bolsa/Perfil (UI nova, abas extras) | 560 KB | `bagAndInfo/` | lógica já existe em pacotes antigos (`GRID_GOODS` etc.) |
| `lottery.swf` | Loteria | 2.3 MB (2º maior) | `lottery/` | nenhum dedicado |
| `mysteriousroulette.swf` | Roleta Misteriosa | 147 KB | `mysteriousRoullete/` | nenhum dedicado |
| `ddtim.swf` | Chat/IM (UI nova) | 46 KB | `im/` | `IM_CMD` já existe idêntico (§1.1 do plano) |
| `newhandopencartoon.swf`/`newopenguide.swf`/`newversionguide.swf` | Onboarding novo | 738/578/121 KB | `newOpenGuide/`, `newVersionGuide/` | n/a (tutorial client-side) |
| `yyvip.swf` | VIP (parceiro "yy") | 167 KB | `yyvip/` | nenhum dedicado — provável integração de SSO externa, baixa prioridade |
| `superwinner.swf` | Super Vencedor (evento) | 299 KB | `superWinner/` | nenhum dedicado |
| `flowergiving.swf` | Dar Flores | 167 KB | `flowerGiving/` | `FlowerGivingPackageType.cs` só no C# |
| `magpiebridge.swf` | Ponte da Pega (Qixi/Dia dos Namorados chinês) | 1.2 MB | `magpieBridge/` | nenhum dedicado — campos confirmados em `Sys_Users_Extra` |

**Não encontrado como arquivo único**: `sevendouble*.swf` citado em `docs/plan/MIGRACAO-6600.md`
§1.2 não existe com esse nome exato em `ui/turkey/swf/` nem `ui/1/swf/` — a pasta fonte
`src/sevenDouble/` (com `SevenDoublePackageType.as`) existe, então a feature é real, mas o
SWF deve estar embutido em outro módulo (candidato: `church.swf`/`activeevents.swf`,
confirmar por conteúdo quando for portar).

## Candidatos a renome/fusão (existiam só na 4.1 — §1.2 do plano, 50 nomes)

Não abri os 50 por conteúdo (fora do orçamento de M0 — são telas que **já funcionam** na
nossa 4.1 atual, baixo risco, confirmar individualmente só quando a tela for migrada no
M1/M2). Os 6 citados no plano como heurística óbvia de renome (`hall`→`ddthall`,
`academy`→`ddtacademy`, `email`→`ddtemail`, `invite`→`ddtinvite`,
`feedback`→(mesmo nome, falso-positivo), `fightlib`→`newfightlib`) ficam confirmados por
diretório fonte também: `src/hall/`, `src/academy/`, `src/email/`, `src/invite/`,
`src/feedback/`, `src/fightLib/` todos existem no 6600 com conteúdo bem maior que a pasta
4.1 equivalente — são evolução da mesma tela, não remoção.
