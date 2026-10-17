# Boss mundial

## 1. O que é no jogo
Evento agendado (abre em horários fixos da semana): um ícone no lobby acende quando o
boss está ativo. O jogador entra numa **sala especial** (não é uma sala PvP normal),
vê o boss com uma barra de vida compartilhada por todo mundo que entrar, bate nele
junto com outros jogadores, pode comprar um buff de dano com Xu (moeda premium), pode
reviver/recomeçar a luta pagando Xu se "morrer", e no fim da janela (ou quando a vida
zera) o servidor fecha a sala e manda prêmio por **ranking de dano causado** (top 10
aparecem na tela, recompensa vai por e-mail pros melhores).

Telas do cliente AS3: `worldboss/WorldBossManager.as` (controla entrar/sair),
`worldboss/view/WorldBossScneneMap.as` (cria a sala de luta), `worldboss/view/
WorldBossFightRoomState.as` (estado dentro da sala), `WorldBossRankingView.as`
(ranking), `WorldBossBuyBuffFrame.as` (comprar buff), `WorldBossResurrectView.as`
(reviver), `worldboss/view/AwardGoodItem.as` (loja de recompensa).

## 2. Onde fica no código
A feature é dividida em **dois pacotes**, porque a luta em si acontece dentro de uma
sala de jogo normal (igual PvP/PvE), e só a parte "lobby do boss" (entrar na sala
especial, barra de vida, ranking, comprar buff, reviver) é um pacote próprio:

| Ação | Cliente AS3 | Pacote | Servidor TS | C# original |
|---|---|---|---|---|
| Entrar/criar a sala de luta do boss | `enterUserGuide`/`createUserGuide` (`WorldBossFightRoomState.as`, `WorldBossScneneMap.as`) | 94 GAME_ROOM | [`rr`](../../apps/game/src/handlers/rooms.ts#L151) `rooms.ts:151` | `GameRoomHandler.cs` |
| Comprar item de recompensa (loja do boss) | `sendBuyGoods` (`worldboss/view/AwardGoodItem.as`) | 44 BUY_GOODS | mesmo fluxo da [loja.md](./loja.md) | — |
| Entrar na sala-lobby do boss (antes da luta) | `WorldBossManager.enterRoom` | 102 WORLDBOSS_CMD sub 32 | [`worldBossCmd`](../../apps/game/src/handlers/eventos/boss-mundial.ts#L141) caso `32` | `WorldBossHandler.cs` → `WorldBoss/Handle/EnterRoom.cs` |
| Ficar visível na sala (posição inicial) | `sendAddPlayer` | 102 sub 34 ADDPLAYERS | `worldBossCmd` caso `34` | `WorldBoss/Handle/AddPlayer.cs` |
| Sair da sala do boss | `sendLeaveBossRoom` | 102 sub 33 LEAVE_ROOM | `worldBossCmd` caso `33` | `WorldBoss/Handle/LeaveRoom.cs` |
| Mover dentro da sala | `sendWorldBossRoomMove` | 102 sub 35 MOVE | `worldBossCmd` caso `35` | `WorldBoss/Handle/Move.cs` |
| Trocar estado (ex. voltar da luta) | `sendWorldBossRoomStauts` | 102 sub 36 STAUTS | `worldBossCmd` caso `36` | `WorldBoss/Handle/Status.cs` |
| Reviver/recomeçar após "morrer" | `requestRevive` | 102 sub 37 REQUEST_REVIVE | `worldBossCmd` caso `37` | `WorldBoss/Handle/*` (Revive/ReFight) |
| Comprar buff de dano | `sendBuyWorldBossBuff` | 102 sub 38 BUFF_BUY | `worldBossCmd` caso `38` | `Game.Server.Buffer.WorldBossAttrackBuffer`/`WorldBossAttrack_MoneyBuffBuffer` |

Registro do pacote 102: `r.player(102, "WORLDBOSS_CMD", (ctx, p, pkt) =>
worldBossCmd(ctx, p, pkt), "partial")` em [`eventos/index.ts:81`](../../apps/game/src/handlers/eventos/index.ts#L81); a função
[`worldBossCmd`](../../apps/game/src/handlers/eventos/boss-mundial.ts#L141) (`boss-mundial.ts:141-220`) lê um `byte` e despacha pelos subs da
tabela acima — igual ao padrão de `SubRouter`, mas escrito à mão com `switch`.

Outras peças do mesmo arquivo (`apps/game/src/handlers/eventos/boss-mundial.ts`):
- [`WorldBossState`](../../apps/game/src/handlers/eventos/boss-mundial.ts#L23) (interface, `:23`) — o estado em memória da sala do boss
  (vida atual/máxima, jogadores dentro, ranking de dano).
- [`worldBossOpen`](../../apps/game/src/handlers/eventos/boss-mundial.ts#L37) (`:37`) — monta o pacote `102` sub `0` (equivalente a
  `AbstractPacketLib.SendOpenWorldBoss` no C#) que o cliente usa pra desenhar o ícone
  do lobby aceso/apagado e os dados do boss atual.
- [`worldBossDamage`](../../apps/game/src/handlers/eventos/boss-mundial.ts#L74) (`:74`) — **não** é chamada pelo pacote `102`; é chamada
  pela camada de luta (`apps/game/src/fight/*`) quando um jogador acerta o boss dentro
  da sala PvE. Espelha `BaseWorldBossRoom.ReduceBlood` + `UpdateRank` do C#
  ([`BaseWorldBossRoom.cs:80`](../../vendor/DDTank41/Game.Server/Rooms/BaseWorldBossRoom.cs) e `:163`).
- [`worldBossRanking`](../../apps/game/src/handlers/eventos/boss-mundial.ts#L61) (`:61`) — monta o pacote `102` sub `10` com o top 10 de
  dano (função interna, não exportada).
- [`finishWorldBoss`](../../apps/game/src/handlers/eventos/boss-mundial.ts#L95) (`:95`) — chamada pelo `EventScheduler` quando a janela
  do evento termina: dá os prêmios de ranking (por e-mail/offline ou direto se online)
  e manda `102` sub `1` (fechar) pra todo mundo que estava na sala.
- O motor do agendador em si (`EventsRuntime`, `onStart`/`onEnd`, helpers de config)
  foi movido pra `apps/game/src/handlers/eventos/agendador.ts` (sem tela própria).

C# original: `vendor/DDTank41/Game.Server/Packets/Client/WorldBossHandler.cs` (só
repassa pro roteador `client.Player.WorldBoss.ProcessData`), `vendor/DDTank41/
Game.Server/WorldBoss/Handle/*.cs` (um arquivo por sub-ação, registrados por atributo
`WorldBossHandleAttribute` em `WorldBossHandleMgr.cs` — o equivalente ao `SubRouter`),
`vendor/DDTank41/Game.Server/Rooms/BaseWorldBossRoom.cs` (vida, ranking), `vendor/
DDTank41/Game.Server/Buffer/WorldBoss*Buffer.cs` (buffs de dano/vida/dinheiro).

**Tabelas**: não existe uma tabela `game.*` dedicada ao boss mundial (sem "HP base"/
"recompensa" fixos em linha de banco). Em vez disso, cada **janela do evento** é uma
linha de `app."ScheduledEvents"` (schema em `packages/db/src/schema/app.ts:186-198`)
com `kind = "worldboss"`: `params` (JSON) guarda `name`, `resourceId`, `pveId`,
`bossHp`, `notice` e `rankAwards` (lista `{rank, giftToken?, gold?, items?}`) — é
daí que `onStart`/`finishWorldBoss` leem tudo. Editável pelo admin em **Eventos**
(`apps/admin/src/resources/event-systems.ts:19` `scheduledEvents`, opção "Boss
mundial" no seletor de `kind`, `:8`). Os itens da **loja de recompensa** (botão
comprar) são `game."Shop_Goods"` igual qualquer outra loja.

## 3. Fluxo passo a passo — a divisão lobby vs. luta
É importante entender que **a luta de verdade não acontece dentro do `worldBossCmd`**:

1. **Abertura agendada**: `EventScheduler` (ver `apps/game/src/game/scheduler.ts`)
   dispara `onStart(w)` quando chega o horário de uma linha `ScheduledEvents` com
   `kind="worldboss"` — preenche `rt.boss` (vida, nome, `pveId` configurado) e manda
   `worldBossOpen` pra todo mundo online (ícone acende no lobby).
2. **Entrar na sala-lobby do boss**: jogador clica no ícone → cliente manda `102` sub
   `32` → servidor responde `102` sub `2` confirmando que a janela está aberta. Isso
   só coloca o jogador "visitando" o boss (barra de vida, outros jogadores andando) —
   ainda **não é a luta**.
3. **Entrar visível / se mover**: subs `34`/`35`/`36` atualizam posição e estado dentro
   dessa sala-lobby e replicam pros outros jogadores dentro dela (`toRoom(...)`
   em `boss-mundial.ts:145`).
4. **Ir pra luta de fato**: o cliente, ao escolher lutar, usa o fluxo **normal de
   sala** — `94 GAME_ROOM` sub `0 GAME_ROOM_CREATE`/`1 GAME_ROOM_LOGIN` (tratado por
   [`rr`](../../apps/game/src/handlers/rooms.ts#L151) em `rooms.ts:151`, igual qualquer outra sala PvP/PvE), só que com
   `RoomType = 14` (`WordBossFight`, constante em `apps/game/src/rooms/room.ts:10`) e
   `MapId`/`pveId` = o `pveId` configurado no evento (`b.pveId`, lido de
   `ScheduledEvents.params.pveId`, padrão `1243`). O cliente manda isso com
   `enterUserGuide(WorldBossManager.Instance.currentPVE_ID, 14)` — mesma função que
   qualquer sala, só muda o número do tipo.
5. **Dano real**: enquanto a luta roda (motor de fight, `apps/game/src/fight/*`), toda
   vez que um jogador acerta o boss a camada de luta chama
   [`worldBossDamage(ctx, player, dano)`](../../apps/game/src/handlers/eventos/boss-mundial.ts#L74) — isso sim é o "ReduceBlood +
   UpdateRank" do C#: abate da vida compartilhada (`rt.boss.blood`), soma no ranking
   por jogador, e manda `102` sub `5` (vida atualizada) pra todo mundo que está na
   sala-lobby (não só quem está lutando). Se a vida zerar, manda `102` sub `8`
   (boss derrotado) pra todo o servidor.
6. **Morrer na luta**: ao voltar derrotado, o cliente manda `102` sub `36 STAUTS`
   com estado `3`; se quiser continuar, manda `102` sub `37 REQUEST_REVIVE` (custa
   1000 Xu reviver / 1200 Xu recomeçar, `boss-mundial.ts:200-209`).
7. **Fim da janela**: `EventScheduler` chama `onEnd(w)` → [`finishWorldBoss`](../../apps/game/src/handlers/eventos/boss-mundial.ts#L95):
   pega o ranking final, aplica `rankAwards` por posição (via `claimOnce`, pra nunca
   premiar duas vezes a mesma janela), manda o prêmio por e-mail se o jogador estiver
   offline ou direto se estiver online, manda o ranking final (`102` sub `10`) e
   fecha a sala pra quem estava dentro (`102` sub `1`).

## 4. Quero mudar…
- **Quando o boss abre, nome, HP, qual mapa de luta (`pveId`), aviso e prêmios por
  posição**: tudo é uma linha de `app."ScheduledEvents"` com `kind="worldboss"` —
  editar pelo admin (**Eventos** → linha "Boss mundial") ou SQL direto. Campo
  `params` (JSON): `{"bossHp":20000000,"name":"Dragão Divino","resourceId":"1",
  "pveId":1243,"notice":"...","rankAwards":[{"rank":1,"giftToken":500}]}`. Padrões
  caso o campo falte: nome "Dragão Divino", `bossHp` 20 000 000, `pveId` 1243 — ver
  `EventsRuntime.onStart` caso `"worldboss"` em
  [`agendador.ts:83`](../../apps/game/src/handlers/eventos/agendador.ts#L83).
- **Custo de reviver/recomeçar**: constantes `1000`/`1200` (Xu) em
  [`boss-mundial.ts:202`](../../apps/game/src/handlers/eventos/boss-mundial.ts#L202) (`cost = type === 2 ? 1200 : 1000`).
- **Custo do buff de dano**: constante `30` (Xu) em [`boss-mundial.ts:212`](../../apps/game/src/handlers/eventos/boss-mundial.ts#L212) — comentário no
  código já avisa: "charged once (the original charged twice)", ou seja, aqui é mais
  barato que o C# de propósito (bug conhecido do original não replicado).
- **O que a loja de recompensa vende**: `game."Shop_Goods"` — mesma receita de
  [loja.md](./loja.md) seção 4 (achar a linha pelo `TemplateID` usado nos botões do
  `AwardGoodItem.as`).
- **Tipo de sala da luta (RoomType 14)**: constante `WordBossFight: 14` em
  `apps/game/src/rooms/room.ts:10` — não mudar sem também mudar o cliente AS3, que
  manda esse número fixo.
- **Comportamento dentro da sala-lobby** (entrar, mover, sair, status): editar o
  `switch` em [`worldBossCmd`](../../apps/game/src/handlers/eventos/boss-mundial.ts#L141) (`boss-mundial.ts:141-220`) — cada `case` tem o
  comentário do `.cs` original ao lado.

## 5. Testes e status
- `apps/game/test/events.test.ts`: `describe("...")` com o cenário completo — agenda
  uma janela `worldboss` com `bossHp: 1000` e um prêmio `{rank:1, giftToken:50}`
  (linha 176), força a abertura (`rt.scheduler.force("worldboss", 5)`), chama
  [`worldBossDamage`](../../apps/game/src/handlers/eventos/boss-mundial.ts#L74) direto (sem passar pelo pacote `102`) e confere
  `rt.boss.blood` abatendo (linhas 169-187); também cobre que o log de
  start/end (`"start worldboss"`/`"end worldboss"`) dispara uma vez por janela
  (linha 51).
- **Não há teste batendo diretamente nos subs `32-38` de `102 WORLDBOSS_CMD`** (entrar
  na sala-lobby, mover, comprar buff, reviver) nem no fluxo de criar a sala de luta
  tipo 14 via `94 GAME_ROOM` — só a parte de dano/ranking/prêmio é exercitada.
- `research/qa/packet-coverage.tsv` marca as ações `sendAddPlayer`/`sendBuyWorldBossBuff`/
  `enterWorldBossRoom`/`sendLeaveBossRoom`/`sendWorldBossRoomMove`/
  `sendWorldBossRoomStauts`/`requestRevive` (pacote `102`) como **`partial`** — isso
  bate com o código: o próprio `r.player(102, ...)` em `eventos/index.ts:81` já declara
  status `"partial"`. O que falta pro "completo": nenhum teste automatizado dos subs
  do lobby, e o buff de dano comprado (`38`) nunca é checado/aplicado em nenhum lugar
  do motor de luta (`fight/*`) — ele só responde "comprado" pro cliente, mas não
  parece existir um efeito de "+dano" lido de volta na hora de calcular o golpe.
- **Status real**: **OK** abertura/fechamento agendados, dano/ranking/prêmios por
  posição (com `claimOnce` evitando prêmio duplicado), entrar na sala de luta tipo 14
  via o fluxo normal de `94 GAME_ROOM`. **Parcial**: ações dentro da sala-lobby do
  boss (`102` subs 32-38) funcionam mas sem teste dedicado, e o efeito do buff de dano
  comprado não foi confirmado sendo aplicado no dano real.
