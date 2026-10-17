# Salas e batalha (PvP)

## 1. O que é no jogo
A tela **Sala** (criar/entrar, escolher mapa, trocar time, comprar prop de luta,
apertar "Pronto" e "Iniciar") e a **Lista de salas** (lobby do PvP, filtro por sala
livre/em partida) — depois disso, a **Batalha** propriamente (o campo de tiro, escolher
arma, usar avião, arma auxiliar, habilidade de pet). O **Campo de treino** (boneco de
treino, `FightLib`) e o tutorial do **trainer** (`WeakGuildManager`/`TrainerGameView`)
usam exatamente o mesmo pipeline de sala/pacotes — são tratados aqui como um submodo,
não como feature separada.

Isso é só o PvP "normal" (`Match`/`Freedom`). PvE em masmorra é
[pve-masmorras.md](./pve-masmorras.md) e o Labirinto é [labirinto.md](./labirinto.md) —
ambos reaproveitam a mesma sala/motor de luta descritos aqui, mas com regras de mapa
diferentes; veja aqueles docs para o que é específico de PvE.

## 2. Onde fica no código
| Ação | Pacote | Servidor TS | C# original | Tabelas |
|---|---|---|---|---|
| Criar sala | 94 GAME_ROOM sub 0 | [`criarSala`](../../apps/game/src/handlers/salas/criar-sala.ts#L20) `salas/criar-sala.ts:20` → [`RoomMgr.createRoom`](../../apps/game/src/rooms/room-mgr.ts#L164) `room-mgr.ts:164` | `CreateRoomAction.cs` (via `GameRoomHandler.cs`) | — (salas são 100% em memória) |
| Entrar na sala | 94 GAME_ROOM sub 1 | [`entrarSala`](../../apps/game/src/handlers/salas/entrar-sala.ts#L20) `salas/entrar-sala.ts:20` → [`RoomMgr.enterRoom`](../../apps/game/src/rooms/room-mgr.ts#L197) `room-mgr.ts:197` | `EnterRoomAction.cs` | — |
| Trocar setup (mapa, nome, senha, modo tempo, dificuldade, nível) | 94 GAME_ROOM sub 2 | [`configurarSala`](../../apps/game/src/handlers/salas/configurar-sala.ts#L24) `salas/configurar-sala.ts:24`, status **partial** | `RoomSetupChangeAction.cs` | — |
| Expulsar jogador | 94 GAME_ROOM sub 3 | [`expulsarJogador`](../../apps/game/src/handlers/salas/expulsar.ts#L12) `salas/expulsar.ts:12` → `RoomMgr.kickPlayer` | `KickPlayerAction.cs` | — |
| Sair da sala | 94 GAME_ROOM sub 5 | [`sairDaSala`](../../apps/game/src/handlers/salas/sair-sala.ts#L10) `salas/sair-sala.ts:10` → `RoomMgr.exitRoom` | `ExitRoomAction.cs` | — |
| Trocar de time | 94 GAME_ROOM sub 6 | [`trocarTime`](../../apps/game/src/handlers/salas/trocar-time.ts#L12) `salas/trocar-time.ts:12` → `RoomMgr.switchTeam` | `SwitchTeamAction.cs` | — |
| Iniciar partida (anfitrião) | 94 GAME_ROOM sub 7 | [`iniciarPartida`](../../apps/game/src/handlers/salas/iniciar-partida.ts#L19) `salas/iniciar-partida.ts:19`, status **partial** → `RoomMgr.startGame` | `StartGameAction.cs` | — |
| Listar salas (lobby) | 94 GAME_ROOM sub 9 | [`listarSalas`](../../apps/game/src/handlers/salas/lista-de-salas.ts#L20) `salas/lista-de-salas.ts:20` → `RoomMgr.getAllMatchRooms`/`getAllPveRooms` | `RoomMgr.cs` | — |
| Trocar posição/abrir vaga pra bot | 94 GAME_ROOM sub 10 | [`trocarLugar`](../../apps/game/src/handlers/salas/trocar-lugar.ts#L17) `salas/trocar-lugar.ts:17`, status **partial** | `UpdatePlacesAction.cs` | — |
| Cancelar/escolher estilo de pickup | 94 GAME_ROOM sub 11/12 | [`cancelarPickup`/`escolherEstiloDePickup`](../../apps/game/src/handlers/salas/trocar-lugar.ts#L31) `salas/trocar-lugar.ts:31,36` | — | — |
| Ficar pronto/não pronto | 94 GAME_ROOM sub 15 | [`ficarPronto`](../../apps/game/src/handlers/salas/ficar-pronto.ts#L12) `salas/ficar-pronto.ts:12` → `RoomMgr.updatePlayerState` | `GamePlayerStateChange.cs` | — |
| Comando dentro da luta (atirar, mover, trocar arma, avião, arma auxiliar, skill de pet...) | 91 GAME_CMD | [`comandoDeJogo`](../../apps/game/src/handlers/salas/comando-de-jogo.ts#L17) `salas/comando-de-jogo.ts:17` → [`FightSession.processData`](../../apps/game/src/fight/ddt.ts#L261) `fight/ddt.ts:261` → [`parseCommand`](../../apps/game/src/fight/ddt.ts#L663) `fight/ddt.ts:663` | `Game.Logic/Cmd/*.cs` (um arquivo por sub, via `CommandMgr`) | — |
| Convidar jogador pra sala | 70 GAME_INVITE | [`convidarJogador`](../../apps/game/src/handlers/salas/convidar.ts#L12) `salas/convidar.ts:12` | `GameInviteHandler.cs` | — |
| Destravar próximo andar do FightLab (botão "Iniciar" do `MissionRoomView`) | 82 GAME_MISSION_START | [`destravarAndarFightLab`](../../apps/game/src/handlers/salas/iniciar-partida.ts#L41) `salas/iniciar-partida.ts:41` → `game.missionStart()` | `GameUserStartHandler.cs` | — |
| Atalho "iniciar" do anfitrião | 86 (sem nome oficial, reaproveita o código de `QUEST_ONE_KEY_FINISH`) | [`atalhoIniciarAnfitriao`](../../apps/game/src/handlers/salas/iniciar-partida.ts#L47) `salas/iniciar-partida.ts:47` → `RoomMgr.startGame` | — | — |
| Comprar prop de luta (granada/escudo/etc. pro FightBag) | 54 PROP_BUY | [`PROP_BUY`](../../apps/game/src/handlers/shop-prop.ts#L95) `shop-prop.ts:95` | `PropBuyHandler.cs` | `game."Shop_Goods"` |
| Vender prop de volta | 55 PROP_SELL | [`PROP_SELL`](../../apps/game/src/handlers/shop-prop.ts#L121) `shop-prop.ts:121` | `PropSellHandler.cs` | `game."Shop_Goods"` |
| Estado/dados da sala em memória | — | [`BaseRoom`](../../apps/game/src/rooms/room.ts) `rooms/room.ts`, [`RoomMgr`](../../apps/game/src/rooms/room-mgr.ts) `rooms/room-mgr.ts` | `BaseRoom.cs`, `RoomMgr.cs` em `vendor/DDTank41/Game.Server/Rooms` | — |
| Motor de luta (turnos, física do tiro, dano) | — | [`FightSession`](../../apps/game/src/fight/ddt.ts) `fight/ddt.ts`, `packages/fight/src/game/game.ts` | `Game.Logic/*` | — |

> `docs/MAPA-DO-JOGO.md` tem as seções `## Sala`, `## Lista de salas`, `## Batalha`,
> `## Campo de treino` e `## trainer` com a visão "tela do cliente AS3 → pacote".

## 3. Fluxo passo a passo

### Criar e entrar numa sala
1. Cliente clica **Criar sala** → manda `94` sub `0` com `roomType`, `timeType`, `name`,
   `password`. O handler exige arma principal equipada (`p.hasMainWeapon`) antes de
   deixar criar — sem isso manda a mensagem "Sem arma equipada" e não cria nada.
2. `RoomMgr.createRoom` (`room-mgr.ts:164`) monta um `BaseRoom` novo em memória (nenhuma
   tabela de banco envolvida — a sala só existe enquanto o processo roda) e coloca o
   criador como `host` na posição 0.
3. Outro jogador vê a sala na lista (`94` sub `9`, `ROOMLIST_UPDATE` — o cliente manda
   `hall` 1 pra PvP ou 2 pra PvE e recebe `roomList(...)` com todas as salas daquele tipo)
   e clica **Entrar** → `94` sub `1` com `roomId`/`password` (ou `sel` quando é
   "entrada rápida", sem escolher sala específica) → `RoomMgr.enterRoom`.
4. Dentro da sala, qualquer jogador comum pode **Trocar de time** (`94` sub `6`, só em
   salas `Freedom` — em `Match` o time é fixo pela posição) e apertar **Pronto**
   (`94` sub `15`, também exige arma equipada).
5. O anfitrião pode mudar mapa/senha/nome/dificuldade (`94` sub `2`), trocar posição
   de vaga — inclusive abrir vaga pra bot (`94` sub `10`) — e expulsar (`94` sub `3`).

### Iniciar a partida
1. Anfitrião clica **Iniciar** → `94` sub `7`. O handler confere **todo** membro da
   sala (incluindo espectadores) tem arma principal; se faltar alguém, manda aviso e
   cancela o estado de "pickup" (`room.sendCancelPickUp()`) em vez de começar.
2. Passou a checagem → `RoomMgr.startGame` (`room-mgr.ts:288`) cria a partida
   (`FightSession`, `fight/ddt.ts`), que monta os times (vermelho/azul),
   bots entram via `BotRunner`, e cada pet equipado perde um pouco de fome
   (`GameStart.cs:88`).
3. **FightLab** (campo de treino, `RoomType.FightLab`) usa um caminho diferente pra
   "iniciar": o `MissionRoomView` do cliente manda `82 GAME_MISSION_START` (não `94`
   sub `7`) — o handler chama `game.missionStart()` **sem checar se quem mandou é o
   anfitrião** (mesmo comportamento do `GameUserStartHandler.cs` original), que marca
   todo jogador como pronto e libera o próximo andar.

### Durante a luta (91 GAME_CMD)
1. Cada ação do jogador na luta (atirar, mover a mira, trocar arma, usar avião, usar
   arma auxiliar, ativar skill do pet, usar prop...) é um sub-código dentro de `91
   GAME_CMD`, roteado por `FightSession.processData` (`fight/ddt.ts:261`).
2. Se a sala é PvE, tenta primeiro `parsePveCommand` (comandos exclusivos de missão);
   senão cai em `parseCommand` (`fight/ddt.ts:663`), que tem os subs comuns de PvP:
   `2 FIRE` (tiro), `7 DIRECTION`, `9 MOVESTART`, `12 SKIPNEXT`, `15 STUNT`, `16 LOAD`,
   `32 PROP` (usar prop do FightBag), `40 AIRPLANE`, `49 PICK` (carta de recompensa),
   `54 GHOST_TARGET`, `84 USE_DEPUTY_WEAPON`, `96 FIRE_TAG`, `144 PET_SKILL`.
3. O comando resultante (`FightCommand`) é passado pro motor de luta
   (`this.game.handle(from.id, cmd, now)`), que devolve uma lista de `FightEvent`
   (dano, morte, troca de turno...) — `dispatch()` converte cada evento no pacote de
   saída certo e manda pra sala.
4. Alguns subs são **confirmadamente mortos no C# original** (o `Game.Logic.Cmd`
   correspondente nunca existiu/nunca fazia nada): `3 BLAST`, `10 MOVESTOP`,
   `19 CHANGEBALL`, `21 KILLSELF`, `22 BEAT`, `97 WANNA_LEADER` — o servidor só loga e
   ignora, igual ao original (comentário em `fight/ddt.ts:289-298`). Isso **não é um
   gap de porte**: é dead code preservado como dead code.
5. Fim de partida → evento `GAME_OVER`/`GAME_MISSION_OVER` dispara recompensas
   (`applyRewards`) e também chama `QuestInventory.onGameOver`/`onMissionOver`
   (ver [missoes.md](./missoes.md) seção 3) pra progredir missões de "ganhar N
   partidas", etc.

### Comprar/vender prop de luta (dentro da sala)
1. Jogador clica num slot do `RoomPropCell` → `54 PROP_BUY` com o id da linha de
   `Shop_Goods`. O handler (`shop-prop.ts:95`) só aceita templates da lista fixa
   `PROP_FIGHT_BAG` (10001-10022, `PropItemMgr.PropFightBag`) com `CategoryID === 10`;
   cobra a combinação de moedas da `ShopMgr.SetItemType` (tabela de preço **diferente**
   da usada em `items.ts` — ver comentário no topo de `shop-prop.ts`) e coloca 1
   unidade no `FightBag`. Se a bolsa estiver cheia, nada é cobrado.
2. `55 PROP_SELL` devolve ouro: exige que o `id` de loja mandado pelo cliente bata com
   o `TemplateID` do item realmente no slot (serve pra não vender um item barato pelo
   preço de outro).

## 4. Quero mudar…
- **Quais templates podem ir pro FightBag (props de luta)**: `const PROP_FIGHT_BAG`
  em `shop-prop.ts:24` (hoje fixo em `10001..10022`, espelha
  `Game.Logic/PropItemMgr.cs:46-68`).
- **Preço de comprar/vender prop de luta**: tabela `game."Shop_Goods"` (colunas
  `APrice1..3`/`AValue1..3`/`Beat`, lidas por `shopTierA`/`shopItemPrice` em
  `shop-prop.ts:36-59` — é uma tabela de código de preço diferente da usada pela loja
  normal, ver comentário no topo do arquivo).
- **Quais `RoomType`/`GameType` existem**: `apps/game/src/rooms/room.ts:10` —
  `RoomType = { Match: 0, Freedom: 1, Boss: 3, Dungeon: 4, FightLab: 5, Freshman: 10,
  Academy: 11, WordBossFight: 14 }`, `GameType` na linha seguinte.
- **Adicionar um novo comando de luta (`GAME_CMD` sub)**: adicionar o `case` em
  `parseCommand` (`fight/ddt.ts:663`), mapear pra um `FightCommand`, e tratar esse
  `cmd` no motor (`packages/fight/src/game/game.ts` / `handle()`).
- **Regra de "precisa de arma pra começar/ficar pronto"**: mensagem
  `NO_WEAPON` (`salas/criar-sala.ts:11`) e a checagem `Game.Server.SceneGames.NoEquip`
  (sub `15`, `salas/ficar-pronto.ts:13`); a checagem em `94` sub `7` está em
  `salas/iniciar-partida.ts:19-28`.
- **Regra de dano/física/turnos**: isso é o motor de luta (`packages/fight/src/game/
  game.ts` e os scripts PvE gerados em `packages/fight/src/pve/scripts/generated/`),
  fora do escopo deste doc — procurar a condição específica lá.
- **Modos sem porte completo**: `94` sub `2` (setup change — captcha/permissão
  PvE/tickets do original não migrados), sub `7` (start — idem) e sub `10` (posição —
  troca de visualização do não-anfitrião não migrada) estão marcados `"partial"` em
  `r.player(...)`/`.on(...)` — ler o corpo da função pra ver exatamente o que falta
  (comentários citam o `.cs` linha a linha).

## 5. Testes
- `apps/game/test/fight.test.ts` — `describe("@ddt/fight adapter")`: 1v1 PvP do início
  ao fim com recompensas, 1v1 contra bot, `GAME_CMD 114 PAYMENT_TAKE_CARD`,
  `82 GAME_MISSION_START`, e os subs confirmadamente mortos (`3/10/19/21/22/97`) não
  travam nem respondem.
- `apps/game/test/fightlab.test.ts` — `describe("fight lab permissions
  (GamePlayer.SetFightLabPermission)")`: libera dificuldade normal/ângulos extras ao
  vencer o nível anterior do Campo de treino, drop de condição-14.
- `apps/game/test/session.test.ts` cobre **login**/sessão única por conta, não sala —
  não é sobre esta feature (apesar do nome parecido).
- Status: **OK** criar/entrar/listar/trocar time/pronto/iniciar partida, comando de
  luta (`GAME_CMD`), comprar/vender prop de luta, FightLab (campo de treino) e
  liberação de dificuldade. **Parcial**: `94` subs `2`/`7`/`10` (ver seção 4).
  `research/qa/port-plan.md` bloco E ainda lista `GAME_CMD stubs (6)` e `FIGHT_NPC 50`
  como pendência — na prática esses 6 subs são dead code confirmado (ver seção 3) e
  `50 FIGHT_NPC` é um pacote que o cliente real nunca envia (`MatchRoomView.
  MATCH_NPC_ENABLE` fixo em `false`, comentário em `missoes/stubs.ts`); a lista do
  plano está desatualizada em relação ao código, que é a fonte confiável.
