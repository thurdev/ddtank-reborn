# Gap C# → TS + protocolo de verificação (fonte: `docs/qa-matrix.json`)

Panorama 2026-10-26 (pós feature/41-partial-a + feature/41-partial-b + feature/41-partial-c +
feature/41-partial-d + feature/41-stubs-rates) — 361 itens (cliente 4.1; 6600 em stand-by, ver AGENTS.md):
servidor `ok` 354 · `partial` 3 · `stub` 4 · `missing` 0 · `wontfix` 0.
Verificado em jogo: `yes` 56 · resto `no`. **Nada conta como pronto sem `verified:yes` + evidência.**

`feature/41-partial-a` fechou **41-labirinto-combate** (131 LABYRINTH, 8 subs) e **41-guilda-skill-combate**
(129 CONSORTIA_CMD sub 26 SKILL_SOCKET). `feature/41-partial-b` fechou **41-loja-estoque-global**
(168 GOODS_COUNT), **41-titulo-por-cartao** (265 NEWTITLE_CARD) e **41-capela-reembolso** (249/12
MARRYROOMSENDGIFT) — os 2 `missing` que restavam no 4.1 somem (zero `missing` agora). `feature/41-partial-c`
fechou **41-boss-mundial-revisao** (102 REQUEST_REVIVE), **41-novato-progresso** (258) e
**41-captcha-anti-bot** (200 CHECK_CODE). `feature/41-partial-d` fechou **41-chickenbox-persistencia**
(87 NEWCHICKENBOX_SYS, 10 linhas — board do Baú da Galinha + moedas da Estrela da Sorte agora persistem de
verdade) e corrigiu duas áreas da matriz que estavam desatualizadas por auditorias anteriores incompletas,
não por trabalho desta tarefa: **41-chick-activation-qa-sync** (84 ACTIVITY_PACKAGE, 3 linhas — já estava
100% portado desde `m4-passe-classico`, a matriz nunca foi atualizada) e **41-boss-mundial-sala-qa-sync**
(102 WORLDBOSS_CMD, 4 linhas que `41-boss-mundial-revisao` não tinha revisado) — ver seção "Prioridade"
abaixo (itens agora `server:ok`, riscados).

A matriz estava defasada (lote anterior, 2026-10-08, media `partial` 66/`missing` 48/`stub` 39 — números
que o próprio `AGENTS.md`/orientação desta tarefa ainda citava): muita coisa foi implementada desde então
(m3-partial-sweep, m3-elite-brackets, loterias/Reborn design, Semana da Sociedade, Caminho da Luz, minigame
das Termas, etc.) sem a matriz ser atualizada. Esta rodada (feature/41-qa-sync) reauditou os 117 itens
`!= ok` um a um contra `apps/game/src/handlers/**` + `HANDLERS.md` + `vendor/DDTank41` e sincronizou
`server` (sem tocar `verified`, que só muda com teste em jogo de verdade). Os 9 códigos `stub` do
`tools/qa/packet-coverage.mjs` (32 COLLECTINFO, 50 FIGHT_NPC, 89 QUESTION_REPLY, 167 CHURCH_MOVIE_OVER,
188 USE_CONSORTIA_REWORK_NAME, 205 USE_CHANGE_COLOR_SHELL, 214 USER_RELOAD_GIFT, 224 CID_CHECK ×2) tinham
sido marcados `wontfix` na matriz, mas a varredura desta rodada estava parcialmente errada.

`feature/41-stubs-rates` (2026-10-26) reauditou os 8 códigos (9 linhas) um a um contra `vendor/DDTank41`:
7 (32, 50, 89, 167, 205, 214, 224) são de fato pacotes mortos nos dois lados (confirmado de novo, citação
`file:line` em cada `notes`) — noop fiel é o comportamento correto, então saíram de `wontfix` e foram
reclassificados `ok` (status do registro trocado de `"stub"` pra o default `"implemented"`, mesma
convenção já usada por 206 CHANGE_COLOR_OVER_DUE/213 USE_LOG). O 8º, **188 USE_CONSORTIA_REWORK_NAME**,
era na verdade um handler real nunca portado — a varredura anterior (`41-qa-sync`) leu errado: existe sim
um `[PacketHandler((byte)ePackageType.USE_CONSORTIA_REWORK_NAME,...)]` em `UseConsortiaReworkNameHandler.cs`
(`vendor/DDTank41/Game.Server/Packets/Client/UseConsortiaReworkNameHandler.cs:11`). Portado agora:
`apps/game/src/db/consortia.ts renameConsortia` (mirror de `SP_Users_RenameConsortia`) +
`apps/game/src/handlers/bolsa/trocar-apelido-guilda.ts`. `tools/qa/packet-coverage.mjs` agora reporta
`stub: 0` (era 9). Testes: `apps/game/test/stubs-rates.test.ts`.

Mesma tarefa também ligou os multiplicadores `dropRate`/`offerRate` do painel admin
("Configuração do servidor" › Taxas), que só eram cosméticos desde `41-admin-config` (só `expRate`/
`goldRate` valiam): `dropRate` escala a contagem de itens de drop de PvE (`apps/game/src/fight/ddt.ts
startPve`, ao lado do multiplicador por instância `PveBalance.reward`); `offerRate` é
`RateMgr.GetRate(eRateType.Offer_Rate)` (`Game.Server/Managers/ConsortiaMgr.cs:81`), agora lido em
`apps/game/src/handlers/sociedade/guerra-gvg.ts consortiaGameOver` no lugar do `1` fixo. Ver
`apps/game/src/db/templates.ts` (campo `rates`) e `apps/game/test/rates.test.ts`.

## Mapa origem C# → destino TS

| Subsistema C# (`vendor/DDTank41`) | Destino TS | Situação |
|---|---|---|
| `Tank.Request` (.ashx: login, serverlist, nickname…) | `apps/api/src/request/endpoints/` (14 arquivos) | **`api-ashx` (2026-10-26): fechado.** Cobertura completa em `docs/spec/request/01-cobertura-41.md` — todo `.ashx` que o cliente 4.1 chama está portado ou documentado como fora de escopo (admin-only/legado/sem handler no DDTank41 também) |
| `Game.Server` + `Center.Server` (handlers de pacote) | `apps/game/src/handlers/` (20 arquivos) | Maioria ok; ver tabela por área |
| `Game.Logic` (Player, Bag, Quest, Pet, Fight…) | `apps/game/src/game/` (14 arquivos) | Núcleo ok |
| `Game.Logic` PvE/AI + `DDTank4.1` scripts missão/NPC | `packages/fight` (646 arquivos) | Maior parte gerada; validar em jogo |
| `SqlDataProvider` + `.bak` | `packages/db` (Drizzle, 15 arquivos) | Schema/migrações em andamento |
| Protocolo binário/crypto | `packages/protocol` (16 arquivos) | Ok (cliente conecta) |
| `GameAdmin` | `apps/admin` | Parcial (joins/filtros pendentes — ver ROADMAP) |
| `Road.Service` / ranking e serviços auxiliares | `apps/game` (processo Node direto) + `apps/api/src/rank.ts` + templates `CelebBy*` | **Gap resolvido (`api-ashx`, 2026-10-26): `Road.Service` não expõe nenhum `.ashx`/HTTP — é só o host de Windows Service (`GameServerService.cs`, `ServiceName="ROAD"`) que chama `GameServer.CreateInstance().Start()`, o mesmo `Game.Server` que virou `apps/game`; sem HTTP, não há endpoint pra portar aqui (`apps/game` já roda como processo Node comum, sem precisar de wrapper de serviço). O "ranking" do nome da linha é as `CelebBy*.xml` (builders já cobertos pelos 55 templates em `apps/api/src/templates/defs.ts`, rebuild periódico `CELEB_REBUILD_MIN`) + `src/rank.ts`/`UserRankDate.ashx` (ported) — nada pendente |
| `Center.Server` cross-server (GvG inter-server) | — | **Gap: checar se entra no escopo Fase 1** |

## Por área (matriz QA) — ordem de ataque

1. **`missing` (0)**: resolvido — `249 MARRY_CMD` sub 12 (refund/requestRefund da capela), o único gap
   `missing` real que restava no cliente 4.1, foi concluído em `feature/41-partial-b` (ver lista abaixo).
2. **`stub` (4)**: `145 ACTIVITY_SYSTEM` subs 37-45 (LanternRiddles) — subsistema real do cliente sem
   handler no original nenhum; candidato a feature nova (mesmo molde de "Semana da Sociedade"/"Caminho da
   Luz", que começaram exatamente assim). Os outros 8 `stub` antigos (32/50/89/167/188/205/214/224) foram
   confirmados mortos e viraram `wontfix` nesta rodada — não sobra `stub` "fácil" nenhum.
3. **`partial` (3)**: os 3 que restam são desvios INTENCIONAIS, não trabalho em aberto — ver seção
   "Prioridade" abaixo (`49 CHANGE_PLACE_GOODS` — Playwright pendente, lógica já testada; `102
   BUFF_BUY`/`STAUTS` — mantidos de propósito em `41-boss-mundial-revisao`).
4. **`ok` + `verified:no` (maioria)**: só Playwright, sem código novo.

Áreas com mais dívida agora (contando só `partial`/`stub`/`missing`, não `wontfix`; 7 itens no total —
`feature/41-partial-d` fechou 87 NEWCHICKENBOX_SYS inteiro (10 linhas, Eventos/Atividades) + corrigiu a
matriz desatualizada de 84 ACTIVITY_PACKAGE (3 linhas, Eventos/Atividades) e 4 linhas de 102 WORLDBOSS_CMD
— `feature/41-partial-a`/`-b`/`-c` já tinham fechado tudo mais, listas anteriores já refletidas aqui):
Eventos/Atividades (3 — só LanternRiddles/145, candidato a feature nova com fonte só no 6600, em espera),
Boss mundial/Minigames (1 — 102 BUFF_BUY, intencional), Bolsa/Inventário (1 — 49, Playwright pendente),
Missões (1 — 145 sub LanternRiddles), Combate/GAME_CMD (1 — 102 STAUTS, intencional).

## Prioridade dos `partial`/`stub`/`missing` restantes (2026-10-20, por impacto no jogador)

Cada linha é uma tarefa do tamanho de um agente. Ordem: battle/PvE core loop primeiro, depois bolsa/loja,
depois guilda/social, depois eventos secundários (board games/minigames que não bloqueiam a progressão
principal).

- ~~**41-labirinto-combate** — 131 LABYRINTH~~ **feito** (`feature/41-partial-a`, 2026-10-20): a sala PvE
  real (`RoomType.Labyrinth=15`, `Pve_Info.ID=401` fixo) já tinha chegado via merge concorrente
  (`feature/41-instancias`) — `myProgress` avança de verdade via combate real (`updateLabyrinthFloor`/
  `outLabyrinth`, server-authoritative, nunca o cliente). Esta rodada confirmou charge-before-grant e
  claim-once em CLEAN_OUT/SPEEDED_UP (já existiam) e atualizou `qa-matrix.json` (estava `partial` por um
  reaudit defasado). Timer real de 1s/jogador do CLEAN_OUT original não foi portado (liquidação é
  instantânea) — deviation de baixo impacto, documentada no header de `labirinto.ts` e em
  `docs/features/labirinto.md`. `vendor/DDTank41/Game.Server/Packets/Client/LabyrinthHandler.cs`.
- ~~**41-guilda-skill-combate** — 129 CONSORTIA_CMD sub 26 `SKILL_SOCKET`~~ **feito**
  (`feature/41-partial-a`, 2026-10-20): os buffs de guilda (Type 101-112) agora entram em combate pelo
  mesmo caminho do stat de equipamento — `apps/game/src/fight/ddt.ts` `specOf` lê `GamePlayer.buffs` ativos
  (`game/consortia.ts` `guildFightBonus`) pro `PlayerSpec.guildBuffs` do `@ddt/fight`, que `Player.reset()`/
  `prepareNewTurn()` aplicam: Type 102 dano, 103 crítico, 104 HP%, 105 ataque/defesa/agilidade/sorte, 107
  energia (todo turno); Type 110 (bônus de GP/"gold") aplicado no reward de PvE/PvP
  (`applyGuildGpBonus`, `fight/ddt.ts`). Sem stacking (Value sempre substitui, nunca soma); charge-before-
  grant já existia (`loja-habilidades.ts`), confirmado. Gap residual documentado (mecânica de bomba/feitiço
  que `@ddt/fight` não tem): Type 101/106/109/111/112. `vendor/DDTank41/Game.Server/Consortia/Handle/SkillSocket.cs`,
  `Game.Logic/Phy/Object/Player.cs:1422-1464`.
- ~~**41-boss-mundial-revisao** — 102 WORLDBOSS_CMD~~ **feito** (`feature/41-partial-c`, 2026-10-20): revisados
  os 4 pontos pedidos contra `vendor/DDTank41/Game.Server/WorldBoss/Handle/*.cs` + `Rooms/BaseWorldBossRoom.cs`.
  Achado e corrigido um desvio real de cobrança: `REQUEST_REVIVE=37` (reviver 1000 / relutar 1200 Xu) só
  olhava `Money` livre; o original (`RequestRevive.cs:32-37` via `GamePlayer.MoneyDirect`/`RemoveMoney`,
  `GamePlayer.cs:3427-3444`) checa e gasta o POOL COMBINADO `Money+MoneyLock` (dinheiro vinculado primeiro) —
  um jogador com Xu vinculado suficiente mas livre insuficiente era recusado errado. `apps/game/src/handlers/
  eventos/boss-mundial.ts` agora usa `p.removeMoney()` (já existia, espelha `RemoveMoney` certinho) com o
  check combinado; teste novo em `apps/game/test/events.test.ts`. Ranking por dano (`UpdateRank`/
  `RankPlayerCommit`, ordenado por `TotalDamage` desc) e prêmios pagos uma vez só (`claimOnce`) já
  conferiam com o original — sem mudança. HP compartilhado entre canais (líder/seguidor via barramento,
  `ctx.leader`/`ctx.crossChannel`) seguiu correto (`apps/game/test/ch-eventos.test.ts`, sem mudança).
  Os 2 desvios documentados antes foram revisados e MANTIDOS de propósito (decisão desta tarefa, não
  regressão): (1) jogador age antes do dragão em vez do dragão one-shotar primeiro — o 6600 doador do
  script é mais forte que o nível 4.1 alvo; dragão one-shotando sem turno nenhum do jogador tornaria o
  boss mundial infuturável pro público 4.1 (documentado em `packages/fight/src/pve/scripts/manual/
  worldboss.ts:58-62`); (2) `BUFF_BUY=38` continua recusando SEM cobrar nada (nem a cobrança simples que a
  nota antiga da matriz dizia) até o motor de luta ter camada de buff pago (task `m4-catchbeast-buff`) —
  cobrar 2× replicaria um bug de duplo-débito do próprio original (`BuyBuff.cs:19-26`: `MoneyDirect` já
  deduz, e chama `RemoveMoney` de novo por cima) que nunca replicamos.
  **41-boss-mundial-sala-qa-sync** (`feature/41-partial-d`, 2026-10-26): as outras 4 linhas de `102
  WORLDBOSS_CMD` que `41-boss-mundial-revisao` não tinha revisado (`ENTER_WORLDBOSSROOM=32`,
  `ADDPLAYERS=34`, `LEAVE_ROOM=33`, `MOVE=35` — ficaram `partial` só por herdar o status do código 102
  como um todo) foram reauditadas contra `vendor/DDTank41/Game.Server/WorldBoss/Handle/{EnterRoom,
  AddPlayer,LeaveRoom,Move}.cs`: nenhum desvio real, batem 1:1 com `apps/game/src/handlers/eventos/
  boss-mundial.ts`. Matriz corrigida pra `ok` nessas 4 linhas; `BUFF_BUY=38`/`STAUTS=36` continuam `partial`
  de propósito (desvios documentados acima, decisão da tarefa anterior, não revisitados aqui).
- ~~**41-loja-estoque-global** — 168 GOODS_COUNT~~ **concluído** (`feature/41-partial-b`, 2026-10-20):
  estoque diário global por `Shop.ID` rastreado de verdade (`handlers/loja/estoque-diario.ts`, reset por
  chave), enforçado em 44 BUY_GOODS (ShopID 20) só depois do carrinho passar a checagem de dinheiro. Testes:
  `apps/game/test/shop-estoque-global.test.ts`.
- **41-bolsa-split-drag** — 49 CHANGE_PLACE_GOODS: split de pilha por drag duplo (botão "Tách" vira o
  drag, depois um segundo drag da quantidade) não confirmado no cliente real via Playwright (gestos
  `Sprite.startDrag()` nativos do Flash não dispararam nas tentativas); lógica server-side já testada
  (unit test). `vendor/DDTank41/Game.Server/Packets/Client/UserChangeItemPlaceHandler.cs`.
- ~~**41-titulo-por-cartao** — 265 NEWTITLE_CARD~~ **concluído** (`feature/41-partial-b`, 2026-10-20):
  `game."New_Title"` já tinha schema+seed (325 linhas) no Postgres desde a geração inicial — o gap real era
  `Templates` nunca carregar pra memória (sem migração nova). Título agora é encontrado/concedido
  (`PlayerRank.AddNewRank` por `NewTitleID`, claim-once por título) e 189 USER_CHANGE_RANK ganhou o
  `NewTitleID` real. Testes: `apps/game/test/titulos.test.ts`.
- ~~**41-capela-reembolso** — 249 MARRY_CMD sub 12 `MARRYROOMSENDGIFT`~~ **concluído**
  (`feature/41-partial-b`, 2026-10-20): nenhum vendor (4.1 nem 6600) tinha handler real pro código 12 —
  design próprio: 249/5 LARGESS passa a acumular num saldo por sala em vez de mandar por correio na hora;
  o casal consulta (`BEGINSENDGIFT=1`) e resgata (`CLIENTCONFIRM=4`) esse saldo, 50/50, nunca paga mais do
  que foi dado, idempotente (zera antes de mandar o correio). Testes:
  `apps/game/test/marriage-farm-auction.test.ts`.
- ~~**41-scene-state-cobertura** — 251 SCENE_STATE~~ **feito** (`feature/41-partial-c`, 2026-10-20):
  auditoria completa, sem gap real nenhum pra fechar. `MarryStateHandler.cs` (único handler C# do código
  251) só tem 2 `case` (0/1), sem `default` — nada a mais existe pra portar. O sender AS3 é a função
  genérica `GameSocketOut.sendCurrentState(sub)`; os 5 outros controllers (loja, consórcio, lista PvP/PvE,
  civil) mandam TODOS sub 1 (confirmado grep nos arquivos), o MESMO pacote que a capela manda ao sair da
  lista — já tratado de forma genérica (`ctx.rooms.enterWaitingRoom` = `RoomMgr.EnterWaitingRoom`,
  `RoomMgr.cs:221`, reusado também pelo 21 SCENE_REMOVE_USER/`basico/cena.ts`). Loja/consórcio/lista de
  salas já funcionavam de verdade antes desta tarefa; só faltava confirmar via teste a partir de um jogador
  que nunca tocou na capela — adicionado em `apps/game/test/marriage-farm-auction.test.ts`.
  `vendor/DDTank41/Game.Server/Packets/Client/MarryStateHandler.cs`.
- ~~**41-novato-progresso** — 258 NOVICEACTIVITY~~ **feito** (`feature/41-partial-c`, 2026-10-20): contador
  real por `ActivityType` portado (`app."NoviceActivityProgress"`, migração additive `0025`,
  `apps/game/src/game/novice-activity.ts`), substituindo a elegibilidade simplificada (comparava o ÍNDICE do
  `SubActivityType` direto contra `Grade` — nem lia `Event_Reward_Info.Condition` de verdade; pras faixas de
  USE_MONEY, Condition 10000-200000, isso não tinha sentido nenhum). Gatilhos reais ligados: GRADE_UP (1,
  `GamePlayer.addGP` + backfill no login, `GamePlayer.cs:775,2969`), STRENGTHEN_WEAPON (2,
  `forja/fortalecer.ts`, só armas CategoryID 7, `ItemStrengthenHandler.cs:145-147`), USE_MONEY/_OFWEEK (3/5,
  `GamePlayer.removeMoney`, toda cobrança — `GamePlayer.cs:4017-4050`), UPGRADE_VIP (8, `loja/vip.ts` +
  `bolsa/usar-carta.ts`, `GamePlayer.cs:3728-3730,3752-3754`). Sequência anti-skip do original replicada
  (`NoviceActivityGetAward.cs:22-58`): o `SubActivityType` que o cliente manda só importa como "é o 1 ou
  não" — o tier real avança sozinho pela sequência `AwardGot` (1,3,7,15,31...), então um cliente nunca pula
  pra um tier que ainda não alcançou. RECHANGE_MONEY/_OFWEEK (4/6) e UPDATE_FIGHTPOWER (9) ficam sem gatilho
  DE PROPÓSITO: o 1º depende de um webhook de recarga/Pix que `apps/game` ainda não tem (mesma lacuna
  documentada em `handlers/eventos/primeira-recarga.ts`), o 2º é código morto no próprio original
  (`GamePlayer.cs:5234`, chamada comentada — nunca dispara lá também). Desvio documentado: o original tem 2
  call-sites de `RemoveMoney` com um opt-out (`isNoviceActive`) que este port não replica (conta TODA
  cobrança) — efeito pequeno e sempre a favor do jogador (progresso um pouco mais fácil de alcançar, nunca
  mais difícil). `vendor/DDTank41/Game.Server/Packets/Client/NoviceActivityGetAward.cs`,
  `Game.Server/GameUtils/PlayerExtra.cs`.
- ~~**41-captcha-anti-bot** — 200 CHECK_CODE~~ **feito** (`feature/41-partial-c`, 2026-10-24): lado que
  EMITE o desafio anti-bot portado (`game/anti-bot.ts` `isPassCheckCode`/`showCheckCode`,
  `GamePlayer.cs:1198-1237`), imagem PNG real desenhada à mão (`game/check-code-image.ts`, 7-segmentos +
  ruído em vez do GDI+ original — cliente só decodifica, nunca re-deriva a resposta dos pixels, sem efeito
  de jogo). 3 gatilhos reais ligados: dissolver sociedade (`ConsortiaDisband.cs:22-26`), `GAME_START`
  ranqueado com `AvgLevel>14` (`GameStart.cs:44-50`), mover item pro Store/ferreiro
  (`UserChangeItemPlaceHandler.cs:49-55`). Desligado por padrão (`game."Server_Config"
  AntiBotCheckCodeEnabled`, chave nova — o original não tinha toggle nenhum; adicionada aqui porque o
  desafio é intrusivo pro jogador real e o servidor padrão deve continuar como está hoje). Desvio
  documentado NÃO portado: o kick automático do autosave do original (`GamePlayer.cs:4485-4489`) tem
  condição que parece invertida (kickaria quase todo desafiado em 20 min) — replicar tornaria a feature
  hostil, ficou de fora de propósito. `CheckCode` em si fica só em memória (nunca persiste no original —
  setter não marca `_isDirty`); só `CheckError` (persiste de verdade, nunca reseta) ganhou coluna nova
  (migração `0026`). Teste: `apps/game/test/anti-bot.test.ts`. Manual: `docs/features/login-conta.md`.
  `vendor/DDTank41/Game.Server/Packets/Client/CheckCodeHandler.cs`, `Bussiness/CheckCode.cs`.
- ~~**41-chick-activation** — 84 ACTIVITY_PACKAGE family 2 (`ChickActivationType.CHICKACTIVATION`, subs
  QUERY/OPENKEY/GETAWARD)~~ **falso gap, matriz defasada** (`feature/41-partial-d`, 2026-10-26): a nota
  original dizia "sistema de código de ativação não portado, falta `UserChickActiveInfo`/handler/UI admin,
  feature grande, orçamento próprio" — isso já estava **100% errado** antes mesmo desta rodada começar: o
  sistema inteiro (QUERY/OPENKEY/GETAWARD, estado persistido em `Sys_Active_System_Data.ChickActiveData`,
  pool/códigos configuráveis via `app."ScheduledEvents"` kind `chickactivation`) foi portado na tarefa
  `m4-passe-classico` (commit `6319a2de`, antes de `feature/41-partial-c`/`-d` existirem), com testes
  próprios (`test/activities.test.ts` "84 ACTIVITY_PACKAGE ChickActivation") e doc (`docs/features/
  eventos.md` §5) — só `docs/MIGRATION-GAP.md`/`qa-matrix.json` nunca foram atualizados pra refletir isso, e
  a nota desatualizada acabou promovida a item "prioritário" da lista abaixo por engano. Reauditado nesta
  rodada contra `ActivityPackageHandler.cs` + `apps/game/src/handlers/eventos/ativacao-pintinho.ts`: sem gap
  real, matriz corrigida (`84 ACTIVITY_PACKAGE`, 3 linhas, `partial` → `ok`).
  `vendor/DDTank41/Game.Server/Packets/Client/ActivityPackageHandler.cs` (linhas ~135-250).
- ~~**41-chickenbox-persistencia** — 87 NEWCHICKENBOX_SYS (10 subs, chicken box + lucky star)~~ **feito**
  (`feature/41-partial-d`, 2026-10-26): o board de 18 cartas do Baú da Galinha (`NewChickenBoxItemInfo.cs`,
  `PlayerBussiness.cs:7905-8045` `SP_GetSingleNewChickenBox`/`SP_NewChickenBox_Add`/`SP_UpdateNewChickenBox`)
  agora persiste de verdade em `player."New_ChickenBox_Data"`, e os contadores (`canOpenCounts`/
  `canEagleEyeCounts`/`isShowAll`/`lastFlushTime`, `PlayerActives.cs:357-368/489-501`) em
  `player."Sys_Active_System_Data"` — mesma linha por `UserID` que `ativacao-pintinho.ts` já usava pra
  `ChickActiveData` (84 ACTIVITY_PACKAGE), cada subsistema só tocando as próprias colunas. Nenhuma migração
  nova precisou: as duas tabelas já existiam no schema/migrações do `@ddt/db` (capturadas do `.bak`
  original) — ninguém nunca tinha lido/escrito nelas. A Estrela da Sorte não ganhou persistência do próprio
  board (14 cartas) de propósito: o original também não persiste (`PlayerActives.SetupLuckyStart`/
  `m_LuckyStartRewards`, recriado a cada `ENTER_GAME`) — só as moedas acumuladas (`LuckystarCoins`, mesma
  linha compartilhada) persistem agora, fechando o único desvio real que existia aí. Testes:
  `apps/game/test/chickenbox-persist.test.ts`. `vendor/DDTank41/Game.Server/Packets/Client/
  ChickenBoxHandler.cs`.
- **41-lanternriddles** — 145 ACTIVITY_SYSTEM subs 37-45 (`LANTERNRIDDLES_ANSWER=40`,
  `LANTERNRIDDLES_SKILL=41`, QUESTION, RANKINFO): subsistema inteiro sem fonte C# real em nenhum vendor
  (`ActiveSystemHandler.cs` só monta um pacote pro sub 8 e nunca chama `SendTCP` — todo o resto cai no
  `default`). Candidato a feature nova tipo "Semana da Sociedade"/"Caminho da Luz" (145 subs 7-13/64-66,
  ambas implementadas nesta mesma área sem fonte C#). `vendor/DDTank41/Game.Server/Packets/Client/ActiveSystemHandler.cs`.

## Protocolo Playwright (vale pra cada item)

1. Branch `feature/qa-<area>` a partir de `develop`. Servidor local + cliente harness.
2. Pra cada item: executa a ação no cliente de verdade (cada botão, cada feature),
   confere efeito no servidor (DB/pacote), tira evidência (screenshot ou log).
3. Marca no `qa-matrix.json`: `verified:"yes"`, `notes` curto, `evidence` path.
   Se falhar: `verified:"no"`, `notes` com sintoma + abre issue linkada.
4. PR pra `develop` com a matriz atualizada. Review roda o mesmo teste no servidor de teste.
5. `verified:yes` em `develop` + jogatina real = pode ir pra `main`.

## Backup (pré-requisito da live, não da abertura do repo)

- `scripts/backup-db.sh` (criar): `pg_dump --format=custom` diário, retenção 30d, restore 1x/mês.
- `.env` prod só em cofre. Restore = dump + env + tag `main`.
- Sem backup testado, sem live pública.
