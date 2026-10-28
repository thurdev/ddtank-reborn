# Salas — criar, entrar, configurar, começar, bots

Toda partida (PvP ou PvE) é uma `BaseRoom` gerenciada por `RoomMgr`
(`apps/game/src/rooms/room-mgr.ts`/`room.ts`). Rooms são criadas sob demanda a partir de um
pool fixo (não cresce dinamicamente).

**Como verificado**: lido/confirmado contra o código real (assinaturas abaixo, copiadas
direto de `room-mgr.ts`); não exercitado ao vivo nesta tarefa — já há suíte própria que
cobre isso (`apps/game/test/*room*.test.ts`/`bots.test.ts`).

## Tipos de sala e dificuldade (`room.ts:20-22`)

```ts
export const RoomType = { Match: 0, Freedom: 1, Boss: 3, Dungeon: 4, FightLab: 5,
  Freshman: 10, Academy: 11, EliteGameScore: 12, EliteGameChampion: 13, WordBossFight: 14,
  Labyrinth: 15, ConsortiaBattle: 19, RingStation: 24, CatchBeast: 26, Rescue: 70 } as const;

export const HardLevel = { Easy: 0, Normal: 1, Hard: 2, Terror: 3, Epic: 4, Simple: 5 } as const;
```

## Fluxo normal (criar → entrar → configurar → começar)

| Passo | Método | Assinatura |
|---|---|---|
| Criar | `RoomMgr.createRoom` | `(p, name, password, roomType, timeType): void` |
| Entrar | `RoomMgr.enterRoom` | `(p, roomId, pwd, hallType): void` |
| Configurar | `RoomMgr.setupChange` | `(room, { mapId, roomType, password, name, timeMode, hardLevel, levelLimits, isCrosszone, isOpenBoss, currentFloor? }): void` |
| Começar | `RoomMgr.startGame` | `(room): void` — cria a partida real (`PvpGame`/`PveGame`, ver [`03-api-referencia.md`](../03-api-referencia.md)) |
| Trocar time | `switchTeam` | `(p): void` |
| Mudar estado (pronto/não) | `updatePlayerState` | `(p, state): void` |
| Expulsar | `kickPlayer` | `(room, place): void` |
| Saída | `exitRoom` | `(room, p): void` |

`createRoom` já pega o primeiro slot livre do pool (sorteio + fallback de varredura); se não
houver sala livre, manda `CreateRoomAction.MaxRoom` (texto de erro) pro cliente. Toda ação
passa por `addAction` — a sala processa uma fila interna, então não precisa se preocupar
com duas ações colidindo na mesma sala.

## Salas especiais (matchmaking automático)

| Método | Quando usar |
|---|---|
| `createConsortiaBattleRoom(a, b)` | GvG entre 2 jogadores/times já pareados. |
| `createRingStationBattle(challenger, bot, onNoRoom?)` | Arena ranqueada vs. bot. |
| `createEliteChampionRoom(a, b)` | Fase de campeão da liga elite. |
| `createRescueRoom(p, pveId, onNoRoom?)` | Resgate (PvE cooperativo com matchmaking). |
| `createCatchBeastRoom(p, onNoRoom?)` | Caça à fera. |

Essas chamam `startGame` internamente — não precisa chamar na mão.

## Bots

Sala de PvP esperando sozinha por tempo demais recebe um bot automaticamente (ver
`docs/features` da área de PvP/arena e `apps/game/src/bots/` — `DbBotProvider` monta o bot a
partir das linhas de `app."Bots"`, com `Attack`/`Defence`/`Style`/`Colors` configurados no
admin, usando o MESMO `game/stats.ts computeStats()` dos jogadores reais). Testado e
confirmado em `apps/game/test/bots.test.ts`.

## PvE — sala tipo `Dungeon`

`createRoom` com `roomType = RoomType.Dungeon` já seta `HardLevel=1`/`LevelLimits` a partir
do nível do criador e `maxViewerCnt=1`. O resto da configuração (qual masmorra, qual
dificuldade) é via `setupChange` (`mapId` = `Pve_Info.ID`, `hardLevel`) — detalhe completo
da cadeia masmorra→fase→NPC em [instancias.md](./instancias.md).

## Como testar

```ts
const { c: a, player: pa } = await loggedIn(server);
const { c: b, player: pb } = await loggedIn(server);
a.out(/* código de criar sala */, (p) => { /* nome/senha/tipo */ });
// ... ver apps/game/test/*room*.test.ts pros códigos de pacote exatos (CREATE_ROOM, ENTER_ROOM...)
```

Detalhe completo do padrão: [testes.md](./testes.md).
