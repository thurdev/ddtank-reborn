# PvE / Masmorras (dungeons) e Campo de treino

## 1. O que é no jogo
Telas de jogador-contra-NPC (sem outro jogador do lado oposto):
- **Lista de masmorras** (botão "Masmorra"/Dungeon na lista de salas,
  `roomList/pveRoomList/DungeonListController.as`): escolhe uma missão PvE
  (`Pve_Info`), dificuldade (Simples/Normal/Difícil/Terror) e sobe andares
  lutando contra NPCs controlados pelo servidor.
- **Campo de treino / Fight Lab** (`fightLib/FightLibState.as`,
  `trainer/view/TrainerGameView.as`): sala especial (`RoomType.FightLab = 5`)
  com 5 "cópias" fixas (`Pve_Info` id 1000-1004) e um sistema de permissão por
  jogador que destrava a próxima dificuldade só depois de vencer a anterior.
  Documentado aqui porque usa o mesmo motor de luta PvE, não a lista de
  masmorras normal.

Não confundir com **Labirinto** ([labirinto.md](./labirinto.md), minigame de
andares diferente) nem com **salas PvP** ([salas-batalha.md](./salas-batalha.md),
jogador contra jogador).

## 2. Onde fica no código
| Ação | Cliente (AS3) | Pacote | Servidor TS | C# original | Tabelas |
|---|---|---|---|---|---|
| Listar/escolher masmorra | `roomList/pveRoomList/DungeonListController.as`/`DungeonListBGView.as` | 94 GAME_ROOM (criar/entrar), 16 SCENE_LOGIN (entrar na tela) | [`createRoom`/`enterRoom`](../../apps/game/src/rooms/room-mgr.ts#L164) `room-mgr.ts:164,197`, roteador em [`roomRouter`](../../apps/game/src/handlers/salas/index.ts#L44) `handlers/salas/index.ts:44` | `GameRoomHandler.cs`, `UserEnterSceneHandler.cs` | `game."Pve_Info"` (missão/andar), `game."Mission_Info"` (recompensa/tentativas) |
| Iniciar a luta PvE (anfitrião aperta jogar) | `room/view/states/...` → `sendGameStart`/mission views | 94 GAME_ROOM sub 7 (GAME_START) | [`launchPve`](../../apps/game/src/rooms/room-mgr.ts#L353) `room-mgr.ts:353` → [`DdtFightEngine.startPve`](../../apps/game/src/fight/ddt.ts#L96) `fight/ddt.ts:96` | `StartGameAction.cs` (`GameMgr.StartPVEGame`) | `game."Pve_Info"`, `game."NPC_Info"` |
| Avançar andar / repetir missão sem saber da sala (Fight Lab) | `game/view/...` `sendGamePick`/mission flow envia `82` (GAME_MISSION_START) | 82 (não listado por nome no mapa) | [`destravarAndarFightLab`](../../apps/game/src/handlers/salas/iniciar-partida.ts#L41) `handlers/salas/iniciar-partida.ts:41` → `room.game?.missionStart?.()` | `GameUserStartHandler.cs` | — |
| Lógica de cada andar/NPC durante a luta (dano, drop, fim de jogo) | cliente só renderiza o que o `91 GAME_CMD` manda | 91 GAME_CMD (vários sub-códigos) | [`PveGame`](../../packages/fight/src/pve/game.ts#L58) (pacote `@ddt/fight`), chamado por `DdtFightEngine.startPve` | `Games/PVEGame.cs` | `game."Pve_Info"`, `game."NPC_Info"`, `game."Drop_Item"`/`"Drop_Condiction"` |
| Permissão/andar do Campo de treino (Fight Lab) | — (regra de servidor) | (dentro do fluxo PvE acima, `roomType=5`) | [`isFightLabPermission`/`setFightLabPermission`](../../apps/game/src/game/fightlab.ts#L22) `game/fightlab.ts:22,35` | `GamePlayer.cs:3093-3216` (`SetFightLabPermission`) | `player."Sys_Users_Detail"` (string de permissão, 1 char liberado + 1 char recompensado por cópia) |
| `50 FIGHT_NPC` (botão existe no cliente mas nunca é chamado de fato) | `sendBeginFightNpc` (código morto no AS3: `MATCH_NPC_ENABLE` é sempre `false`) | 50 FIGHT_NPC | [stub intencional](../../apps/game/src/handlers/missoes/stubs.ts) `handlers/missoes/stubs.ts` ("read-and-dropped") | — | — |

## 3. Fluxo passo a passo
1. Jogador abre a lista de salas PvE → cliente manda `16 SCENE_LOGIN` (entra na
   tela) e pede a lista com `94 GAME_ROOM`.
2. Cria ou entra numa sala tipo `RoomType.Dungeon` (4) ou `RoomType.FightLab`
   (5) — `room-mgr.ts` `createRoom`/`enterRoom`: confere nível mínimo
   (`room.LevelLimits`, só pra Dungeon) e senha.
3. Anfitrião aperta jogar → sala manda `94` sub `7` (ou, no Fight Lab, pacote
   `82`) → `room-mgr.ts` chama `launchPve(room, players)` (`:353`).
4. `launchPve` busca a missão (`Templates.pveByType(roomType, levelLimits)`,
   `db/templates.ts:358`, lê `game."Pve_Info"` filtrando por `Type` e
   `LevelLimits`) e chama `DdtFightEngine.startPve` (`fight/ddt.ts:96`), que
   cria um `PveGame` (pacote `@ddt/fight`) com os NPCs da missão.
5. O `PveGame` roda a 40ms por tick (mesmo loop do PvP) e manda eventos de
   luta por `91 GAME_CMD` pro cliente; ao matar NPC ou terminar andar, calcula
   drop (`Templates.pveDrop`, `db/templates.ts`, lê `game."Drop_Condiction"`+
   `"Drop_Item"`) e chama os hooks (`giveItems`, `onMissionOver`, `onGameOver`).
6. Terminando a masmorra: se `RoomType.Dungeon`, a sala volta pro estado
   "escolher masmorra" (`room-mgr.ts:360-368`, zera `MapId`/`currentFloor`).
   Se Fight Lab, `setFightLabPermission` atualiza a string de permissão do
   jogador e dá recompensa de primeira-vez (`fightlab.ts:30`).
7. Recompensas/exp entram direto no jogador em memória; salvas no próximo
   `saveIntoDatabase` (ver [COMO-FUNCIONA.md](./COMO-FUNCIONA.md) seção 1.6).

## 4. Quero mudar…
- **Qual NPC/dificuldade cada missão tem**: tabela `game."Pve_Info"` — colunas
  `SimpleTemplateIds`/`NormalTemplateIds`/`HardTemplateIds`/`TerrorTemplateIds`
  (lista de `NPC_Info.ID` por dificuldade) e `SimpleGameScript`/... (script da
  fase). `LevelLimits` decide qual masmorra aparece pro nível do jogador
  (`pveByType`, `db/templates.ts:358`).
- **Atributos/drop de um NPC**: tabela `game."NPC_Info"` (vida `Blood`, dano
  `BaseDamage`, `DropRate`, `Experience`) + `game."Drop_Condiction"`/`"Drop_Item"`
  pro item exato que cai.
- **Recompensa/tentativas de uma missão (Mission)**: tabela
  `game."Mission_Info"` — `TotalCount`/`TotalTurn` (quantas rodadas),
  `TryAgain`/`TryAgainCost` (permite continuar pagando).
- **Preço de "jogar de novo" no Labirinto/Fight Lab**: não é aqui — isso é só
  no Labirinto, ver [labirinto.md](./labirinto.md) seção 4.
- **Nível mínimo pra desbloquear a próxima dificuldade do Campo de treino**:
  lógica fixa em `setFightLabPermission` (`game/fightlab.ts:35-47`), não é
  dado de tabela — mudar exige editar essa função (e citar o C#
  `GamePlayer.cs:3110-3213` que ela espelha).
- Nenhum recurso dedicado no admin pra `Pve_Info`/`NPC_Info`/`Mission_Info`
  ainda — editar via SQL direto nas tabelas `game.*` ou criar um `ResourceDef`
  novo em `apps/admin/src/resources/`. Depois de editar, reinicie `apps/game`
  pra recarregar o cache de templates (`Templates`, ver COMO-FUNCIONA.md).

## 5. Testes + status
- `apps/game/test/fightlab.test.ts` (`describe("fight lab permissions
  (GamePlayer.SetFightLabPermission)")`) — cobre a permissão/desbloqueio do
  Campo de treino.
- `apps/game/test/fight.test.ts` (`describe("@ddt/fight adapter")`) — cobre
  PvP e os sub-códigos de `GAME_CMD`, mas **não** testa uma masmorra PvE real
  entrando/terminando pelo lado de `apps/game` (room-mgr → startPve).
- `packages/fight/test/pve.test.ts` (`describe("PvE engine")`,
  `describe("transpiled donor missions (smoke)")`) e
  `packages/fight/test/pve-cards.test.ts` (`describe("PvE dungeon reward
  cards (PVEGame.GameOver / GameOverAllSession / Stop)")` — cobrem a lógica de
  luta/recompensa do `PveGame` em si (pacote `@ddt/fight`, fora de
  `apps/game`).
- Status: **OK** o motor de luta PvE (NPC, dano, drop, recompensa) via
  `@ddt/fight`; **OK** criar/entrar em sala PvE e disparar `startPve`; **sem
  teste de integração** cobrindo `apps/game` ponta-a-ponta (sala → `startPve`
  → fim de jogo → save) especificamente para `RoomType.Dungeon` — só pra Fight
  Lab (`fightlab.test.ts`) e PvP (`fight.test.ts`). `50 FIGHT_NPC` é stub
  **intencional** (código morto no cliente original, não é um gap).
