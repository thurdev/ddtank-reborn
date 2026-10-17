# Ícones do hall (`hallIcon.HallIconType`) — enumeração completa

> Pedido do dono: com `ALL_OPEN=true` só 5 ícones apareciam (Rương Gà/newChickenBox, Sao May Mắn/luckStar,
> Code Gà Hành/chickActivation no grupo EVENT; Chiến thần/league, Thần thú/worldboss em Destaques). Ele quer
> TODO ícone/atividade ativo pra testar. Esta tabela é o levantamento completo dos 60 valores de
> `vendor/DDTank41/Source Flash/src/hallIcon/HallIconType.as` e de todo lugar que liga um deles
> (`HallIconManager.updateSwitchHandler` — grep em toda `Source Flash/src`, não só nos managers óbvios).

## Método

1. `HallIconType.as` lista 60 constantes `icontype` (string).
2. `HallIconManager.convertIconInfo()` (switch gigante) só define o **layout** (halltype/orderid) pra
   constantes que algum dia poderiam aparecer — estar nesse switch NÃO significa que o ícone liga; é só
   "se alguém mandar `updateSwitchHandler` com este tipo, sei onde desenhar".
3. O que realmente liga um ícone é um `HallIconManager.instance.updateSwitchHandler($icontype, ...)`
   chamado em algum lugar do client. `grep -rn "updateSwitchHandler(" Source\ Flash/src` (todo o cliente,
   não só `hallIcon/`) encontrou só **14 call sites**, cobrindo **14 dos 60 tipos**. Os outros 46 não têm
   NENHUM caminho de ativação neste build do cliente — são constantes mortas (código morto de verdade, não
   "faltou implementar no servidor": não existe receptor client-side pra nenhum pacote que os ligaria).
4. Dos 46 mortos, 4 são categorias "sempre ligadas" (`checkDefaultIconShow()`, ver tabela) e 1
   (`FIRSTRECHARGE`) usa um mecanismo totalmente separado (não é um ícone do hall, é a tela de VIP/primeira
   recarga, pacote 259, já sempre enviada no login). Os 41 restantes realmente não têm como ligar.

## Grupo A — sempre ligados (categoria, não ícone individual)

`HallIconManager.checkDefaultIconShow()` liga estes direto, sem pacote nenhum, sempre:

| icontype | Constante | O que é |
|---|---|---|
| `expblessed` | EXPBLESSED | bônus de XP (sempre true) |
| `viplvl` | VIPLVL | lembrete de upar VIP (true se Grade<30 e não-VIP) |
| `wonderfulplay` | WONDERFULPLAY | categoria "Destaques" (sempre true) |
| `activity` | ACTIVITY | categoria "Eventos" (sempre true) |

Nada a fazer — não dependem de pacote/servidor.

## Grupo B — mecanismo próprio (não é hallIcon)

| icontype | Constante | Onde fica de verdade |
|---|---|---|
| `firstrecharge` | FIRSTRECHARGE | pacote 259, `Out.firstRecharge` já mandado sempre no login (`login.ts:185`), tela de VIP — não passa por `HallIconManager` |

## Grupo C — 14 tipos com ativação real no cliente

Cada linha: tipo → quem chama `updateSwitchHandler` → pacote/gatilho servidor → SWF/módulo → status.

| icontype | Constante | Trigger no cliente | Pacote servidor | Módulo (SWF) | Status |
|---|---|---|---|---|---|
| `newChickenBox` | NEWCHICKENBOX | `NewChickenBoxManager.as:105` | 87/1 `CHICKENBOXOPEN` | `newchickenbox.swf` | **ATIVO** (sempre, `sendActivityIcons`) |
| `luckStar` | LUCKSTAR | `LuckStarManager.as:216` | 87/25 (via `luckStarOpen`) | `luckstar.swf` | **ATIVO** (sempre) |
| `chickActivation` | CHICKACTIVATION | `ChickActivationManager.as:160`, chamado de `HallStateView.checkShowIcon()` no boot do hall | **não é pacote** — lê `app.Server_Config` (chave `ISCHICKENACTIVEKEYOPEN`) via `/serverconfig.ashx` (apps/api) | `chickactivation.swf` | **ATIVO** (flag já `1` nos dados seedados) |
| `league` | LEAGUE | `LeagueManager.as:108` (`isOpen=true` no evento `POPUP_LEAGUESTART_NOTICE`) | `Out.leagueNotice` (`eventsOnLogin`/`agendador.ts` ao forçar a janela `league` com `ALL_OPEN`) | embutido (sem módulo lazy) | **ATIVO** (com `ALL_OPEN`, `EventsRuntime.reload()` força a janela) |
| `worldbossentrance1`/`wantstrong`/`worldbossentrance4` | WORLDBOSSENTRANCE1/WANTSTRONG/WORLDBOSSENTRANCE4 | `WorldBossManager.as:259-267`, no evento de boss | `login.ts:187` (`worldBossOpen`/`Out.openWorldBoss`), janela forçada por `ALL_OPEN` em `agendador.ts` | `worldboss.swf` | **ATIVO** (com `ALL_OPEN`) |
| `guildMemberWeek` | GUILDMEMBERWEEK | `GuildMemberWeekManager.as:148` | 145/7 (`Out.guildMemberWeekOpen`) | `guildmemberweek.swf` | **ATIVO** (com `ALL_OPEN`, `sendActivityIcons`) |
| `lightRoad` | LIGHTROAD | `LightRoadManager.as:136` | 145/64 (`Out.lightRoadOpen`) | embutido no pacote 145 (caminho-da-luz.ts, design próprio) | **ATIVO** (com `ALL_OPEN`, `sendActivityIcons`) |
| `leftGunRoulette` | LEFTGUNROULETTE | `LeftGunRouletteManager.as:127` | 137/1 (`Out.leftGunRouletteOpen`) | `roulette.swf`/`roulette1.swf` | **ATIVO** (com `ALL_OPEN`, `sendActivityIcons`) |
| `littlegamenote` | LITTLEGAMENOTE | `HallStateView.__littlegameActived` (evento `LittleGameEvent.ActivedChanged`, de `LittleGameManager.__actived`) | **pacote 80 `LITTLEGAME_ACTIVED`** (topo, fora do 166) — **nunca existia no servidor** | `littlegame.swf` | **CORRIGIDO nesta sessão** — `Out.littleGameActived` + envio em `login.ts` com `ALL_OPEN` |
| `limitActivity` | LIMITACTIVITY | `HallStateView.addNoviceActivityAct` → `NoviceActivityManager.checkTime()`/`addIconNoviceActivity()` | pacote 258/0 `NOVICEACTIVITY_MESSAGE` (startDate/endDate) — **nunca existia um sender C#** | `noviceactivity.swf` | **CORRIGIDO nesta sessão** — `Out.noviceActivityRow` + `sendNoviceActivityOpen` em `login.ts` (default-aberto, igual chickenbox) |
| `accumulativeLogin` | ACCUMULATIVE_LOGIN | `AccumulativeManager.addAct()` | — | módulo embutido (sem UIModuleLoader próprio) | **BLOQUEADO — client morto**: a única chamada de `addAct()` (`HallStateView.as:420`, `addAccumulativeLoginAct()`) está **comentada** no próprio cliente (`//this.addAccumulativeLoginAct();`). Não existe nenhuma outra chamada. Nenhum pacote do servidor resolve isso — o cliente nunca vai chamar `updateSwitchHandler` pra este tipo neste build. |
| `lanternRiddles` | LANTERNRIDDLES | `LanternRiddlesManager.showLanternBtn()`, no evento `CrazyTankSocketEvent.LANTERNRIDDLES_BEGIN` | pacote dedicado (`LanternriddlesPackageType.LANTERNRIDDLES_BEGIN`, não é sub do 145) | **sem SWF** (nenhum arquivo em `apps/api/assets/flash/ui/vietnam/swf` corresponde) | **BLOQUEADO — client sem módulo**: mesmo portando o pacote, não há onde o cliente carregar a tela (`UIModuleTypes.LANTERN_RIDDLES` não tem swf correspondente nos assets). Consistente com `caminho-da-luz.ts`: "37-45 LanternRiddles continuam sem handler". |

## Grupo D — 41 tipos mortos (nenhum `updateSwitchHandler` em lugar nenhum do cliente)

Confirmado por grep em toda a árvore `Source Flash/src` — zero call sites pra estes tipos, em qualquer
arquivo, de qualquer jeito (nem direto, nem por outro nome de evento). **Client lacks module/activation
path** — não é lacuna de porte servidor, é ausência total no cliente 4.1 deste repositório (provavelmente
holiday events de uma build mais nova que nunca foi totalmente portada pra este fork):

`camp`, `ringstation`, `battle`, `sevendouble`, `transnational`, `fightfootballtime`, `consortiabattle`,
`flowerGiving`, `buried`, `christmas`, `catchBeast`, `pyramid`, `superWinner`, `growthPackage`, `dice`,
`groupPurchase`, `luckStone`, `mysteriousRoulette`, `syah`, `treasureHunting`, `oldPlayerRegress`,
`sevenDayTarget`, `godsRoads`, `entertainment`, `saleshop`, `kingDivision`, `DDPlay`, `boguadventure`,
`treasurepuzzle`, `escort`, `witchblessing`, `worshipTheMoon`, `FoodActivity`, `halloween`, `rescue`,
`catchinsect`, `magpiebridge`, `cloudbuylottery`, `treasurelost`, `everydayactivity`, `worldbossentrance2`

Nenhum desses tem código mostrando a tela mesmo que o ícone aparecesse (não há `UIModuleTypes` nem SWF
correspondente pra praticamente nenhum). Marcar um servidor pra "ligar" esses ícones não teria efeito —
não existe receptor no cliente. Fora do escopo até alguém trocar o cliente Flash por um build mais completo.

## Resumo pro dono

- **Antes desta sessão**: 5 ícones visíveis (newChickenBox, luckStar, chickActivation, league, worldboss) —
  todos os 5 já eram "default aberto" ou forçados por `ALL_OPEN` antes de qualquer pacote de ícone existir.
  `lightRoad`/`guildMemberWeek`/`leftGunRoulette` já estavam no código mas exigiam `ALL_OPEN=true` (o dono já
  tinha isso ligado — então na prática deviam aparecer; se não apareceram, vale checar se o processo do jogo
  realmente recarregou o código novo, não é um gap desta tabela).
- **Corrigidos nesta sessão**: `littlegamenote` (termas) e `limitActivity` (novato/newbie) — os únicos dois
  tipos com ativação real no cliente que estavam escuros por FALTA DE PACOTE no servidor (não por módulo
  faltando). Ver `research/qa/feature-designs.md`.
- **Bloqueados, sem solução possível sem trocar o cliente**: `accumulativeLogin` (chamada comentada no
  próprio Flash) e `lanternRiddles` (sem módulo SWF). Mais 41 tipos totalmente mortos (Grupo D).
- **14/60 é o teto real deste cliente** — dos 14 com caminho de ativação, 12 já ficam ativos com
  `ALL_OPEN=true` após esta sessão (os 2 bloqueados ficam escuros de propósito).
