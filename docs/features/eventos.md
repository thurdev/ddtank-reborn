# Eventos (ícones do lobby)

> Este doc é maior que os outros porque cada ícone do hall é a sua própria mini-feature.
> Cada seção `##` abaixo segue o mesmo esqueleto de 5 partes dos outros docs (o que é →
> onde fica → fluxo → quero mudar → testes), só que compacto por ícone. A seção final
> **6. Testes e status geral** junta tudo numa tabela só.
>
> Quem registra todos estes pacotes: [`registerEventos`](../../apps/game/src/handlers/eventos/index.ts#L51)
> em `apps/game/src/handlers/eventos/index.ts` — um arquivo por ícone/atividade (ver o
> comentário de cabeçalho desse arquivo pra tabela completa código → função → arquivo).
> O cabeçalho também cita exatamente o que no C# original é **código morto de verdade**
> (nunca foi enviado por nenhum handler, ou o enum existe mas nenhum `[PacketHandler]`
> assina) — tratado aqui como "não registrado, de propósito", não como gap de porte.

## 1. Baú da galinha (+ Lucky Star)

**O que é no jogo**: o ícone "Baú do Rei Galinha" no hall. Abre um painel com 18 cartas
viradas pra baixo; o jogador paga Cupons pra virar (`Revelar`/eagle eye) ou pra resgatar
(`Pegar`) cada carta, e pode "Atualizar" (`Flush`) o painel inteiro. De dentro do mesmo
painel dá pra entrar no minigame **Lucky Star** (roleta de 2500 Cupons por rodada).

**Onde fica no código**

| Ação (sub-código do pacote 87) | Servidor TS | C# original |
|---|---|---|
| 10 ENTERCHICKENVIEW (abrir painel) | [`newChickenBoxDispatch`](../../apps/game/src/handlers/eventos/bau-da-galinha.ts#L144) despacha pra `chickenBoxCmd` case 10, `bau-da-galinha.ts:137` | `ChickenBoxHandler.cs` |
| 11 USEEAGLEEYE (revelar 1 carta) | `chickenBoxCmd` case 11, `bau-da-galinha.ts:100` | idem |
| 12 AllITEMSHOW (reenviar lista) | case 12, `bau-da-galinha.ts:127` | idem |
| 13 TAKEOVERCARD (resgatar 1 carta) | case 13, `bau-da-galinha.ts:79` | idem |
| 14 FLUSHCHICKENVIEW (atualizar painel) | case 14, `bau-da-galinha.ts:118` | idem |
| 15 CLICKSTARTBNT (embaralhar posições) | case 15, `bau-da-galinha.ts:129` | idem |
| 31 ENTER_GAME (entrar no Lucky Star, 2500 Cupons) | `luckyStarCmd` case 31, `estrela-da-sorte.ts:69` | idem |
| 33 START_TURN (girar, 7s cooldown) | case 33, `estrela-da-sorte.ts:80` | idem |
| 34 TURN_COMPLETE (confirma prêmio) | case 34, `estrela-da-sorte.ts:99` | idem |

Pacote: **87 NEWCHICKENBOX_SYS**, registrado `"partial"` em
[`registerEventos`](../../apps/game/src/handlers/eventos/index.ts#L65) `eventos/index.ts:65`.
Tabelas: nenhuma migrada do `.bak` original (`EventAwardItem` nunca foi populada) — a
lista de prêmios vem de `app."ScheduledEvents"` (kind `"chickenbox"` / `"luckystar"`,
params `pool`/`openCardPrice`/`eagleEyePrice`/`flushPrice`), com um pool padrão embutido
em código (`DEFAULT_CHICKENBOX_POOL` em `bau-da-galinha.ts:34-38` /
`DEFAULT_LUCKYSTAR_POOL` em `estrela-da-sorte.ts:17-21`) pra funcionar sem configurar nada.

**Fluxo passo a passo**
1. Cliente manda `87/10` → `chickenState()` sorteia 18 cartas distintas do pool
   (`drawDistinct`, `bau-da-galinha.ts:30`) e devolve via `chickenListPkt`.
2. `87/11` (revelar) gasta Cupons escalonados (`eagleEyePrice[5-canEagleEyeCounts]`),
   marca a carta `isSeeded`.
3. `87/13` (resgatar) gasta Cupons escalonados (`openPrice`), marca `isSelected`, chama
   `grantRewards` — se a bolsa de destino estiver cheia, manda por correio.
4. `87/14` (atualizar) é grátis se fizer < 120 min desde o último flush
   (`FREE_FLUSH_MIN`), senão cobra `flushPrice` (padrão 500).
5. Lucky Star (`31`/`33`/`34`): `33` sorteia com peso (`luckyDraw`, `estrela-da-sorte.ts:44`) —
   se cair na moeda (`COIN_TEMPLATE`), 97% das vezes resorteia excluindo a moeda; `34`
   confirma e entrega o prêmio (ou soma Cupons se foi moeda).

**Quero mudar…**
- **O pool de prêmios**: `app."ScheduledEvents"` → crie/edite uma linha `kind:
  "chickenbox"` (ou `"luckystar"`) com `params.pool = [{templateId, count, weight}]` no
  admin (recurso `scheduled-events`, aba Eventos agendados). Sem configurar, usa
  `DEFAULT_CHICKENBOX_POOL`/`DEFAULT_LUCKYSTAR_POOL` (ver arquivos acima).
- **Preço de revelar/resgatar/atualizar**: mesmos `params.openCardPrice` /
  `params.eagleEyePrice` (arrays de 5, um por tentativa) / `params.flushPrice` — ou os
  fallbacks em `bau-da-galinha.ts:93-94,119`.
- **Tempo de atualização grátis**: `FREE_FLUSH_MIN = 120` em `bau-da-galinha.ts:52`.
- **Custo de entrar no Lucky Star**: `money = 2500` fixo em `estrela-da-sorte.ts:70` (não é
  configurável por admin ainda — editar o código).
- **Chance de a moeda "escapar" no Lucky Star**: `Math.random() * 100 > 3` em
  `estrela-da-sorte.ts:52` (97% de resorteio).

## 2. Caça-níquel (baú da sorte / "deus da riqueza") — e surpriseRoulette

**O que é no jogo**: o baú de 18 cartas aberto a partir da bancada do Caça-níquel
(`caddyII`) — os itens `112019`/`190000` ("deus da riqueza") abrem esse painel quando
usados. É um painel **diferente** do Baú da galinha (acima), apesar de parecer igual;
aqui as recompensas ficam temporariamente na `CaddyBag` (`BagType` 5) até o jogador
clicar em "Confirmar" (`LOTTERY_FINISH`). O frame de evento `surpriseRoulette` (a tela
de "roleta surpresa" que aparece em datas especiais) **reusa os mesmos pacotes 27/28** —
é a mesma lógica de sorteio, só com outra UI por cima.

**Onde fica no código**

| Ação | Pacote | Servidor TS | C# original | Tabelas |
|---|---|---|---|---|
| Abrir o baú de 18 cartas | 26 LOTTERY_OPEN_BOX | [`lotteryOpenBox`](../../apps/game/src/handlers/eventos/roleta.ts#L70) `roleta.ts:70` | `LotteryOpenBoxHandler.cs` | — |
| Girar/revelar 1 carta (1 a 8x, custo crescente) | 27 LOTTERY_RANDOM_SELECT | [`lotteryRandomSelect`](../../apps/game/src/handlers/eventos/roleta.ts#L119) `roleta.ts:119` | `LotteryRandomSelectHandler.cs` | — |
| Confirmar e mover prêmios pra bolsa real | 28 LOTTERY_FINISH | [`lotteryFinish`](../../apps/game/src/handlers/eventos/roleta.ts#L144) `roleta.ts:144` | `LotteryFinishBoxHandler.cs` | — |
| Ranking "pior sorte" do caça-níquel | 45 CADDY_GET_BADLUCK | [`caddyBadLuck`](../../apps/game/src/handlers/eventos/roleta.ts#L160) `roleta.ts:160` | — | `player."Sys_Users_Extra".TotalCaddyOpen` |
| Abrir todas as cartas da bancada de uma vez | 204 OPEN_ALL_CARDBOX | [`openAllCardBox`](../../apps/game/src/handlers/eventos/roleta.ts#L174) `roleta.ts:174` | — | — |
| Vender (reclamar) tudo da `CaddyBag` | 232 CADDY_SELL_ALL_GOODS | [`caddySellAll`](../../apps/game/src/handlers/eventos/roleta.ts#L185) `roleta.ts:185` | — | — |

Todos `implemented` (não `partial`) em
[`registerEventos`](../../apps/game/src/handlers/eventos/index.ts#L68-73)
`eventos/index.ts:68-73`. O "god of wealth" abre a partir de um item na `StoreBag`/bolsa
atual (`idNum === -1` abre o board de 18; qualquer outro `idNum` abre uma caixa comum
via `createItemBox`, o mesmo helper usado pelo resto da bolsa, em `bolsa/abrir-caixa.ts`).

**Fluxo passo a passo**
1. `26` com `idNum = -1`: exige item `112019` ou `190000` no slot indicado; monta o board
   via `pickLotteryBoard()` (`roleta.ts:38`, 18 posições, sem repetir
   `(TemplateID,Count)` enquanto houver opções distintas).
2. `27` cada chamada consome `n` chaves (`190001` se o board veio de `190000`, senão
   `11444`), onde `n` é o número da tentativa (1ª custa 1, 2ª custa 2...), até 8 vezes.
3. `28` move tudo que ficou em `CaddyBag` + os prêmios acumulados pra bolsa definitiva do
   jogador; o que não couber vai por correio (`mailItems`, assunto "Mochila cheia...").
4. `232` (vender tudo): soma `ReclaimValue × Count` por `ReclaimType` (1 = ouro, 2 =
   Cupons/`giftToken`) de cada item e esvazia a `CaddyBag`.

**Quero mudar…**
- **Quantas vezes dá pra girar antes de travar**: `8` fixo em `roleta.ts:122`
  (`s.lottery >= 8`).
- **Item/chave que cada board usa**: `keyId = s.lotteryId === 190000 ? 190001 : 11444` em
  `roleta.ts:123`.
- **Itens especiais que exigem 4 chaves pra abrir** (`112047`/`112100`/`112101`): bloco
  `special` em `roleta.ts:89-95` (chave fixa `11456`, custo fixo `4`).
- **Conteúdo de cada baú/caixa**: tabela `game."Shop_Goods_Box"` (recurso admin
  `item-box`), a mesma usada pelo resto do jogo (ver `createItemBox` em `bolsa/abrir-caixa.ts`).

## 3. Roleta (`roulette/RouletteFrame.as`, "pistola esquerda")

**O que é no jogo**: uma roleta separada (não confundir com o item acima) acessada via
item consumível — gira e dá um "bônus de taxa" (`LeftRoutteRate`) que depois é anunciado
pra todo o servidor quando o jogador fecha a tela.

**Onde fica no código**: pacotes **128 LEFT_GUN_ROULETTE_SOCKET** (girar) e **130
LEFT_GUN_ROULETTE_COMPLETTE** (fechar/anunciar) — ambos em `items.ts`, **não** em
`activities.ts`.

| Ação | Servidor TS | C# original | Tabelas |
|---|---|---|---|
| Girar | [`items.ts:831`](../../apps/game/src/handlers/items.ts#L831) (registro inline, `"partial"`) | `LeftGunHandler.cs:837` | `player."Sys_Users_Extra"` (`LeftRoutteCount`/`LeftRoutteRate`) |
| Fechar/anunciar | [`items.ts:817`](../../apps/game/src/handlers/items.ts#L817) (registro inline) | `LeftGunCompleteHandler.cs:837` | idem |

**Fluxo passo a passo**
1. `128`: sorteia uma das 5 faixas de `GameProperties.LeftRouterRateData` (config do
   servidor, string `"gold|silver|...|"` com 5 floats) — `roll = rand(55)`, faixas em
   `< 15/25/35/45/55` (`items.ts:835-836`).
2. Decrementa `LeftRoutteCount`, grava `LeftRoutteRate` (upsert em
   `player."Sys_Users_Extra"`), responde `163` com a taxa formatada.
3. `130`: se `LeftRoutteRate > 0`, broadcast pra todo o mundo com nome do jogador + taxa
   em %.

**Quero mudar…**
- **As 5 faixas/pesos e seus valores**: config do servidor `LeftRouterRateData` (string
  `"f1|f2|f3|f4|f5|"`), lida em `items.ts:834` via
  `ctx.templates.serverConfig.get("LeftRouterRateData")` — editar na tabela `game."Server_Config"`
  (recurso admin `game-config`).
- **Os cortes de `rand(55)`** (`15/25/35/45/55`): fixos em `items.ts:836`, não vêm de
  config — editar o código pra mudar a distribuição.

## 4. Loteria (`lottery/LotteryContorller.as`) — card lottery, NÃO portado

**O que é no jogo**: uma tela separada de "loteria de cartas" (escolher cartas por um
preço, tipo bingo) — **não é o mesmo sistema que o baú de 18 cartas da seção 2**, apesar
do nome parecido nos pacotes.

**Onde fica no código**: pacotes **104 CARD_LOTTERY**, **105 LUCK_LOTTERY**, **239
GOTO_CARD_LOTTERY** — todos registrados como `"stub"` em `progression.ts` (leem e
descartam o pacote, sem lógica real; ver `docs/MIGRATION-GAP.md`). Confirmado também no
header de `apps/game/src/handlers/eventos/index.ts`: o comentário do código lista esses 3
como "confirmed DEAD in the original too" — ou seja, nem o C# original tinha um handler real
pra eles (`ePackageType` existe no enum, mas nenhum `[PacketHandler]` assina). **Não há
gap de porte aqui**: não existe comportamento original pra replicar.

**Quero mudar…**: se um dia quiser implementar essa tela do zero, não há `.cs` de
referência — teria que desenhar a regra nova. Fora do escopo deste doc.

## 5. Ativação (`chickActivation`) — códigos de resgate

**O que é no jogo**: a tela onde o jogador digita um "código de 14 caracteres" pra abrir
uma janela de 60 dias de recompensas (diária, fim de semana, semanal e 10 marcos de
nível).

**Onde fica no código**: pacote **84 ACTIVITY_PACKAGE**, handler
[`activityPackageHandler`](../../apps/game/src/handlers/eventos/ativacao-pintinho.ts#L168)
`ativacao-pintinho.ts:168`, registrado `"partial"` em
[`registerEventos`](../../apps/game/src/handlers/eventos/index.ts#L85) `eventos/index.ts:85`.
C# original: `ActivityPackageHandler.cs` (só o `case CHICKACTIVATION=2` é código vivo; os
outros `case` — `GROWTHPACKAGE`, casa magica, zodíaco, pool de bilhete de loteria, PvE
power buff — são código morto comentado no original, nunca portados de propósito, ver o
cabeçalho de `ativacao-pintinho.ts:1-24`). Tabelas: `player."Sys_Active_System_Data"`
(CSV com 7 campos: chave aberta, tipo, data de abertura, última diária, última semanal,
última de fim-de-semana, marco de nível atual). Também existe o item `201316`
(`PropUseHandler.cs`) que ativa a mesma chave direto da bolsa — ver
[`activateChickItem`](../../apps/game/src/handlers/eventos/ativacao-pintinho.ts#L127) `ativacao-pintinho.ts:127`.

**Fluxo passo a passo**
1. `84/1 OPENKEY` com um código de 14 chars → `chickCodes()` confere contra
   `app."ScheduledEvents"` kind `"chickactivation"` (`params.codes`) ou o padrão
   `CHICK_DEFAULT_CODES = ["DDTANKREBORN01"]` (`ativacao-pintinho.ts:40`); `claimOnce` garante
   que o código só é usado **uma vez no servidor todo** (não por jogador).
2. Abre a chave: `keyOpenedType` = 2 se `Grade > 15` (código "VIP", pula a escada de
   nível), senão 1.
3. `84/2 GETAWARD` com `awardType` (1-7 diário, 8-10 fim de semana, 11 semanal, 12 +
   `awardIndex` 1-10 pra marco de nível) → confere a janela de 60 dias ainda válida,
   confere se já resgatou hoje/essa semana/esse marco, e **sempre manda por correio**
   (nunca pro bolso direto — `mailChickAward`, `ativacao-pintinho.ts:147`).
4. `84/3 QUERY` só devolve o estado atual (pra desenhar a tela).

**Quero mudar…**
- **Os códigos válidos**: `app."ScheduledEvents"` kind `"chickactivation"`, `params.codes
  = ["MEUCODIGO123456"]` — mas **esse `kind` não está na lista `KINDS` do formulário
  admin** (`apps/admin/src/resources/event-systems.ts:7-17`), então pra usar o dropdown
  seria preciso adicionar `{ value: "chickactivation", label: "..." }` lá; por ora só dá
  pra criar essa linha via SQL direto ou API. Sem configurar, usa
  `CHICK_DEFAULT_CODES` (`ativacao-pintinho.ts:40`).
- **Os prêmios de cada "qualidade"**: `params.pools[quality]` no mesmo evento, ou o
  fallback `DEFAULT_CHICKACTIVE_POOL` (`ativacao-pintinho.ts:46-57`, indexado por `"1"`,
  `"2"`, `"3"` diário/`"101"`-`"103"` versão VIP/`"10001"`-`"10010"` marcos de nível).
- **Os marcos de nível** (quais níveis liberam qual marco): arrays `CHICK_LEVEL_NEED`
  (`[5,10,25,30,40,45,48,50,55,60]`) e `CHICK_GRADE_VAL` (bitmask) em
  `ativacao-pintinho.ts:41-42`.

## 6. Liga de elite (`eliteGame`)

**O que é no jogo**: o campeonato "Elite" — fica aberto numa janela configurada
(`app."ScheduledEvents"` kind `"elite"`) e dá acesso a uma sala de PvP ranqueada
especial pra quem tem nível ≥ 30.

**Onde fica no código**: pacote **162 ELITEGAME**, handler
[`eliteGameHandler`](../../apps/game/src/handlers/eventos/liga-elite.ts#L56) `liga-elite.ts:56`,
registrado `"partial"` em
[`registerEventos`](../../apps/game/src/handlers/eventos/index.ts#L80) `eventos/index.ts:80`.
C# original: `EliteGameHandler.cs`. Sub-ações (sub-byte do
pacote): `1` status atual (`rt.eliteStatus`, bitmask: 1=pontuação 30-40, 2=campeão
30-40, 4=pontuação 41-50, 8=campeão 41-50, 0=fechado), `2` entrar na sala (exige status
`5` e `Grade ≥ 30`), `3` meu rank/pontuação (`p.match.eliteRank`/`eliteScore`), `4`
"campeões" (sempre devolve lista vazia — não implementado). Tabelas: nenhuma própria;
estado vive em `EventsRuntime.eliteStatus` (memória) + `player."Sys_User_Match_Info"`
(rank/score do jogador).

**Fluxo passo a passo**
1. Quando a janela `kind: "elite"` do scheduler abre, `EventsRuntime.onStart`
   (`agendador.ts:102`) seta `eliteStatus = params.status ?? 5` e avisa todo mundo
   online (`eliteStatusPkt`, em `liga-elite.ts:18`).
2. Jogador que loga durante a janela recebe o status também no burst de login
   (`eventsOnLogin`, `agendador.ts:242`).
3. `162/2` só deixa entrar se `eliteStatus === 5` e `p.info.Grade >= 30` — a sala em si é
   uma sala PvP comum (ver [salas-batalha.md](./salas-batalha.md)), este pacote só
   libera a entrada.

**Quero mudar…**
- **Quando a Liga abre/fecha e por quanto tempo**: recurso admin `scheduled-events`,
  linha `kind: "elite"` (dias da semana + horário UTC + duração).
- **O bitmask de status inicial**: `params.status` nessa mesma linha (padrão `5` =
  "pontuação 30-40" ligado); os outros bits (2/4/8) não têm UI dedicada hoje — setar via
  JSON do campo `Parâmetros`.
- **Nível mínimo pra entrar**: `30` fixo em `liga-elite.ts:61` — editar o código.

## 7. Prêmio diário / Calendário / Presença / Caixa de tempo

Esta seção **não duplica** [lobby.md](./lobby.md) (que já cobre o clique básico do botão
**Prêmio diário** no hall) — aqui só o que falta: presença mensal com sequência, prêmio
por tier de presença, e a caixa de tempo/nível.

**Onde fica no código**

| Ação | Pacote | Servidor TS | C# original | Tabelas |
|---|---|---|---|---|
| Prêmio diário (buff/ovo/caixa VIP/presença) | 13 DAILY_AWARD | [`dailyAward`](../../apps/game/src/handlers/eventos/recompensa-diaria.ts#L37) `recompensa-diaria.ts:37` | `DailyAwardHandler.cs` | `game."Daily_Award"` |
| Marcar presença do dia (sub-tipo 5 de 13) | 13/5 | [`signIn`](../../apps/game/src/handlers/eventos/presenca.ts#L19) `presenca.ts:19` | idem | `player."DailyLogList"` |
| Resgatar prêmio de X dias de presença | 90 GET_SIGNAWARD | [`signAward`](../../apps/game/src/handlers/eventos/presenca.ts#L37) `presenca.ts:37` | `SignAwardHandler.cs` | `game."Daily_Award"` (`AwardDays`), `app."EventClaims"` |
| Caixa de tempo (online) / caixa de nível | 53 GET_TIME_BOX | [`timeBox`](../../apps/game/src/handlers/eventos/recompensa-diaria.ts#L100) `recompensa-diaria.ts:100` | `UserGetBoxHandler.cs` | `game."LoadUserBox"` |
| "PICC" (obsoleto, confirme abaixo) | 30 PICC / LOTTERY_GET_ITEM | no-op registrado em [`basic.ts:130`](../../apps/game/src/handlers/basic.ts#L130) | `LotteryGetItem.cs` | — |
| Lucky num (obsoleto, confirme abaixo) | 161 USER_LUCKYNUM | no-op registrado em [`basic.ts:130`](../../apps/game/src/handlers/basic.ts#L130) | `UserLuckyNumHandler.cs` | — |
| Trocar itens por outro (goods exchange) | 31 GOODS_EXCHANGE | [`goodsExchange`](../../apps/game/src/handlers/pve-misc.ts#L77) `pve-misc.ts:77`, registro `"partial"` em `pve-misc.ts:145` | — | `game."Active"` |

> **Nota sobre `docs/MAPA-DO-JOGO.md` dizer "FALTA PORTAR" nos pacotes 30 e 161**: ao ler
> o código, os dois **estão registrados** — só que como no-op de propósito
> (`apps/game/src/handlers/basic.ts:129-131`, comentário "Obsolete no-ops in the
> original"), no mesmo espírito do que o C# original faz (pacote enviado pelo cliente,
> mas sem handler real do outro lado). O mapa automático não distingue "sem handler" de
> "handler vazio de propósito"; aqui confirmamos lendo o handler.

**Fluxo passo a passo (o que falta no doc do lobby)**
1. `13/5` marca o dia atual em `DailyLogList.DayLog` (string de `"True"/"False"` por dia
   do mês, reseta a cada mês — `signIn()`, `presenca.ts:19-32`).
2. `90` (resgatar tier): `rt.data.signTiers()` lista os tiers configurados em
   `game."Daily_Award"` (`AwardDays`); se os dias assinados este mês `>= tier` e o tier
   ainda não foi resgatado (`claimOnce` por `mês:tier`), dá a recompensa (`Type 1` =
   item, `Type 7` = Cupons/`giftToken`, filtrando por `Sex`).
3. `53` caixa de tempo (`boxType 0`): usa **minutos online desde o login/última caixa no
   próprio servidor** (não confia no "minuto" que o cliente manda) — `findBox(0, Grade,
   BoxProgression)` por `Condition` crescente; caixa de nível (`boxType 1`):
   `findBox(1, GetBoxLevel, Sexo)` por `Level`.

**Quero mudar…**
- **Quais dias de presença dão prêmio e o quê**: tabela `game."Daily_Award"` (`AwardDays`
  = quantos dias assinados liberam o tier; `Type 1` item / `Type 7` Cupons) — recurso
  admin `daily-award`.
- **Quantos minutos online liberam cada caixa de tempo**: tabela `game."LoadUserBox"`
  (`Type 0`, coluna `Condition` em minutos) — recurso admin `time-box`.
- **Quais níveis liberam caixa de nível**: mesma tabela, `Type 1`, coluna `Level`.

## 8. Conquistas / login acumulado / primeira recarga / clique semanal / registro diário

**Onde fica no código**

| Ação | Pacote | Servidor TS | Tabelas |
|---|---|---|---|
| Completar uma conquista | 230 ACHIEVEMENT_FINISH | [`achievementFinish`](../../apps/game/src/handlers/eventos/completar-conquista.ts#L42) `completar-conquista.ts:42` | `game."Achievement"`, `game."AchievementCondition"`, `player."Sys_User_Rank"` (título) |
| Resgatar prêmio de login acumulado (dias 1-7) | 338 ACCUMULATIVELOGIN_AWARD | [`accumulativeLogin`](../../apps/game/src/handlers/eventos/presenca.ts#L58) `presenca.ts:58` | `game."Login_Award_Item_Template"` |
| Primeira recarga (grátis neste port) | 259 FIRSTRECHARGE | [`firstRecharge`](../../apps/game/src/handlers/eventos/primeira-recarga.ts#L18) `primeira-recarga.ts:18` | `game."Event_Reward_Goods"` (`ActivityType=7`) |
| Clique semanal (flag de "já clicou hoje") | 219 WEEKLY_CLICK_CNT | [`weeklyClickCnt`](../../apps/game/src/handlers/eventos/recompensa-diaria.ts#L142) `recompensa-diaria.ts:142` | — |
| Registro diário (devolve e apaga as linhas) | 103 DAILYRECORD | [`dailyRecordHandler`](../../apps/game/src/handlers/eventos/recompensa-diaria.ts#L149) `recompensa-diaria.ts:149` | `player."DailyRecordInfo"` |

Todos `implemented` (sem `"partial"`) em
[`registerEventos`](../../apps/game/src/handlers/eventos/index.ts#L51) `eventos/index.ts:51-89`
(uma linha `r.player(...)` por pacote, ver cabeçalho desse arquivo pra tabela completa).

**Fluxo passo a passo**
1. `230`: `canCompleteAchievement()` confere as condições de `game."AchievementCondition"`
   contra os "records" acumulados do jogador (`updateRecords`, atualizado a cada
   propriedade relevante que muda — nível, vitórias, fortalecimento etc. via
   `pushRecords`, em `completar-conquista.ts:20`); se tiver algum prêmio `RewardType=1`
   (título), chama `grantTitle()` (`completar-conquista.ts:29`) que grava permanente em
   `player."Sys_User_Rank"`.
2. `338`: dias 1-6 dão a lista fixa daquele dia; dia 7 deixa o jogador escolher
   (`selected` = `RewardItemID` de uma linha `Type=7`) — processa em sequência todo dia
   ainda não resgatado (`accumulativeAwardDays` até `accumulativeLoginDays`).
3. `259`: sem gateway de pagamento real neste port, o prêmio é liberado de graça por
   padrão (`FIRST_RECHARGE_FREE` env var, `"true"` por padrão) — ver `primeira-recarga.ts:19`.

**Quero mudar…**
- **Condição/prêmio de cada conquista**: tabelas `game."Achievement"` +
  `"AchievementCondition"` — recurso admin `achievements` está **na whitelist da API**
  (`admin-resources.ts:59`) mas **sem página no admin ainda** (nenhum `defineResource`
  registrado em `apps/admin/src/resources/*.ts`/`index.ts`) — editar via SQL/seed, ou
  seguir o padrão de `event-systems.ts` pra criar a página.
- **Prêmio de cada dia de login acumulado**: tabela `game."Login_Award_Item_Template"`
  (`Type` = dia 1-7) — mesma situação: **sem página admin** (recurso `login-award` só
  existe no whitelist da API).
- **Se a primeira recarga é grátis ou exige pagamento real**: env var
  `FIRST_RECHARGE_FREE` (`apps/api/.env.example`/`apps/game` — ver `primeira-recarga.ts:19`).
- **O que a primeira recarga dá**: tabela `game."Event_Reward_Goods"` filtrando
  `ActivityType=7, SubActivityType=1` — recurso admin `event-reward-goods` também só no
  whitelist da API, sem página ainda.

## 9. Battleground / Atividade novata / Little game

**Onde fica no código**

| Ação | Pacote | Servidor TS | Status |
|---|---|---|---|
| Stats fixos de referência + prestígio da liga | 132 BATTLEGROUND | [`battleGroundHandler`](../../apps/game/src/handlers/eventos/liga-elite.ts#L37) `liga-elite.ts:37` | implemented |
| Prêmio de atividade pra jogador novato (por nível) | 258 NOVICEACTIVITY | [`noviceActivity`](../../apps/game/src/handlers/eventos/novato.ts#L19) `novato.ts:19` | **partial** |
| Minigame "Đại chiến Hút Gà" (captura de bichinhos) | 166 LITTLEGAME_COMMAND | [`littleGameRouter`](../../apps/game/src/handlers/minigame-termas/index.ts#L21) `minigame-termas/index.ts:21` | implemented |

Registrados em
[`registerEventos`](../../apps/game/src/handlers/eventos/index.ts#L91-93)
`eventos/index.ts:91-93`.

- **132** devolve constantes fixas (`BATTLE_REF`, `liga-elite.ts:27`) — não depende dos
  atributos reais do jogador, igual ao C# original.
- **258** (`"partial"`): o original rastreava várias condições por `PlayerExtra` (subir
  de nível, fortalecer, recarregar, subir VIP, poder de luta...); este port simplifica
  pra só "nível atual ≥ `Event_Reward_Goods.SubActivityType`" (a condição "subir de
  nível" é a única usada pelo painel novato real do cliente 4.1 — ver comentário em
  `novato.ts:1-10`). Resgate único por `(ActivityType, Condition)` via `claimOnce`.
- **166**: porte completo do simulador em tempo real (`Game.Server/LittleGame/**`,
  spawner de bichinhos, pathing client-side, captura por clique, pontuação) — pasta
  própria `handlers/minigame-termas/` (não é `eventos/`, movida pra lá por ter infra
  própria grande). Detalhe completo: `docs/features/termas.md` §6.

**Quero mudar…**
- **Prêmio por nível do evento de boas-vindas**: tabela `game."Event_Reward_Goods"`
  filtrando por `ActivityType`/`SubActivityType=nível` — mesma tabela da seção 8,
  mesma falta de página admin.
- **Minigame Hút Gà**: ver `docs/features/termas.md` §6 ("Quero mudar" fica lá —
  config de bichinhos/nível mínimo/mapa).

## 10. Labirinto, Boss mundial e Convidar amigos (eventos) — ficam em docs próprios

Estes três ícones têm **doc dedicado** e não são repetidos aqui pra não duplicar:
- **Labirinto** (pacote 131 LABYRINTH, `"partial"`,
  [`labyrinthHandler`](../../apps/game/src/handlers/eventos/labirinto.ts#L67) `labirinto.ts:67`)
  → [labirinto.md](./labirinto.md).
- **Boss mundial** (pacote 102 WORLDBOSS_CMD, `"partial"`,
  [`worldBossCmd`](../../apps/game/src/handlers/eventos/boss-mundial.ts#L141) `boss-mundial.ts:141`, mais o
  `kind: "worldboss"` do scheduler em `agendador.ts:76-86`) → [boss-mundial.md](./boss-mundial.md).
- **Convidar amigos** (pacote 107 INVITE_FRIEND, `handlers/amigos/`) é a mesma feature de
  convite documentada em [amigos.md](./amigos.md) — o ícone de evento do hall abre a
  mesma tela, não há lógica de evento separada.

## 11. Admin: o que já dá pra configurar vs. o que exige SQL

| Tabela | Recurso admin (API, `admin-resources.ts`) | Página no admin (`apps/admin/src/resources/*.ts`) |
|---|---|---|
| `app."ScheduledEvents"` (janelas: worldboss/league/elite/weekly_reset/double_exp/double_gold/chickenbox/luckystar/labyrinth) | `scheduled-events` | ✅ `event-systems.ts` → `scheduledEvents` |
| `game."Daily_Award"` | `daily-award` | ✅ `event-systems.ts` → `dailyAward` |
| `game."Active_Award"` | `event-awards` | ✅ `event-systems.ts` → `eventAwards` |
| `player."Active_Number"` (códigos gerados) | `event-codes` | ✅ `event-systems.ts` → `eventCodes` |
| `game."LoadUserBox"` | `time-box` | ✅ `event-systems.ts` → `timeBoxes` |
| `game."Active"` (calendário/anúncio, `HasKey`) | `events` | ✅ `content.ts` → `events` (página custom `/events`) |
| `game."Achievement"` / `"AchievementCondition"` | `achievements` (só API) | ❌ sem página — editar via SQL/seed |
| `game."Login_Award_Item_Template"` | `login-award` (só API) | ❌ sem página |
| `game."Event_Reward_Info"` / `"Event_Reward_Goods"` | `event-reward-info` / `event-reward-goods` (só API) | ❌ sem página |
| `game."Activity_System_Item"` | `activity-items` (só API) | ❌ sem página |

Pra transformar uma linha "só API" numa página de verdade: siga o padrão de
[admin.md](./admin.md) seção "Quero mudar — adicionar uma tabela nova ao admin" (criar um
`defineResource`, registrar em `apps/admin/src/resources/index.ts`; a rota
`/api/admin/<nome>` já existe, não precisa tocar em `admin-resources.ts`).

O `kind: "chickactivation"` (seção 5) também é uma excessão: a linha pode ser criada em
`app."ScheduledEvents"` normalmente, só falta adicionar a entrada em `KINDS`
(`event-systems.ts:7-17`) pra ela aparecer no dropdown do formulário.

## 12. Testes e status geral

| Icone/pacote | Arquivo de teste | `describe()` |
|---|---|---|
| Caça-níquel/loteria (helpers puros) | `apps/game/test/activities.test.ts` | `"caddy/lottery pure helpers"` (`pickLotteryBoard`, `drawDistinct`, `luckyDraw`) |
| Labirinto (131) | `apps/game/test/activities.test.ts` | `"131 LABYRINTH economy"` |
| Battleground (132) | `apps/game/test/activities.test.ts` | `"132 league battleground stats"` |
| Atividade novata (258) | `apps/game/test/activities.test.ts` | `"258 NOVICEACTIVITY idempotency"` |
| Ativação/chickActivation (84) | `apps/game/test/activities.test.ts` | `"84 ACTIVITY_PACKAGE ChickActivation"` |
| Claims idempotentes, prêmio diário/presença/conquistas/caixa de tempo/reset semanal/boss mundial | `apps/game/test/events.test.ts` | `"event claims (idempotency)"` (vários `it` por pacote: 13, 90, 230, 53, weekly reset, world boss) |
| Scheduler de janelas (worldboss/league/double_exp etc.) | `apps/game/test/activities.test.ts` | `"EventScheduler windows"` |
| Roleta 130 (no-op sem `LeftRoutteRate`) | `apps/game/test/shop-prop-misc.test.ts` | `"items: 77 ITEM_OVERDUE / ... / 130 LEFT_GUN_COMPLETE / ..."` |

**Sem teste de pacote dedicado** (só cobertos indiretamente ou nada):
- **26/27/28** (abrir baú de 18 cartas / girar / confirmar): só os helpers puros têm
  teste (`pickLotteryBoard`, `drawDistinct`); não há teste end-to-end do fluxo completo
  via socket.
- **128** (girar a Roleta/left gun): sem teste; só o `130` (fechar) tem um teste do caso
  "sem taxa setada".
- **45/204/232** (ranking de pior sorte / abrir tudo / vender tudo da `CaddyBag`): sem
  teste.
- **162 ELITEGAME**: sem teste de pacote (só a lógica de janela do scheduler em
  `"EventScheduler windows"`).
- **219/103** (clique semanal / registro diário): sem teste dedicado.
- **166 LITTLEGAME_COMMAND**: `apps/game/test/littlegame.test.ts` (implementado — ver
  `docs/features/termas.md` §6).

**Status resumido**: `implemented` — 13, 26, 27, 28, 45, 90, 103, 132, 166, 204, 219,
230, 232, 259, 338 (todos sem flag `"partial"`/`"stub"` no registro). `partial` — 53, 84, 87,
131, 162, 258, e agora 145 (ver seção 13 — sub 64-66 implementado, sub 7-13 despachado
pra `sociedade/semana-da-sociedade.ts`, sub 37-45 LanternRiddles continua sem handler).
**Design próprio, sem fonte C#** (`research/qa/feature-designs.md`) — 104
CARD_LOTTERY / 105 LUCK_LOTTERY / 239 GOTO_CARD_LOTTERY / 11 ACTIVE_PULLDOWN agora
implementados em `progressao/loterias.ts` (ver `docs/features/cartas.md`).

## 13. Caminho da luz (145 ACTIVITY_SYSTEM sub 64-66, design próprio)

Sem fonte C# em lugar nenhum (confirmado em `vendor/` e nos forks externos,
`research/qa/feature-sources.md`) — o cliente tem o tabuleiro pronto
(`lightRoad/view/MainFrame`) mas o servidor original nunca respondia nada de verdade.
Design novo (detalhe completo em `research/qa/feature-designs.md`): tabuleiro semanal de
`lightRoad.spaces` (12) espaços; 1ª escolha do dia grátis, as próximas custam Ouro
crescente (`lightRoad.pickCost`); cada espaço revelado sorteia 1 prêmio do pool
`lightRoad.pool` (admin) e marca um bit; vira tabuleiro novo sozinho quando a semana
troca (`weekKey()`, sem cron de reset). Persistido em `app."LightRoadProgress"`.
Compartilha o pacote 145 com a Semana da Sociedade (`sociedade/semana-da-sociedade.ts`)
— um roteador só (`caminho-da-luz.ts` `activitySystemRouter`) decide pelo byte inicial.
Arquivo: `apps/game/src/handlers/eventos/caminho-da-luz.ts`. Teste:
`apps/game/test/events.test.ts` ("145 ACTIVITY_SYSTEM sub 64-66").

## 14. Loteria de cartas / da sorte / cartão platina de novato (104/105/239/11, design próprio)

Sem fonte C# em lugar nenhum (`research/qa/feature-sources.md`: 0 resultados em qualquer
fork público pesquisado) — telas prontas no cliente (`lottery/**`,
`ddt/view/NovicePlatinumCard.as`), servidor original nunca implementou. Design novo
(detalhe completo em `research/qa/feature-designs.md`): aposta em 1-24 "cartas de
tarot" (`104`, custo `lottery.cardCost`/3 giros por dia), 1 giro grátis/dia na "bola de
cristal" (`105`, `lottery.luckChance`% de chance de prêmio), e resgate único do "cartão
platina de novato" (`11`, só pra nível baixo). Arquivo:
`apps/game/src/handlers/progressao/loterias.ts`. Teste: `apps/game/test/progression.test.ts`.
