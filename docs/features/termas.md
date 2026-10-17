# Termas (Fonte Termal)

## 1. O que é no jogo
A **Fonte Termal** (menu "Termas" do hall): uma lista de salas-spa onde o
personagem fica parado relaxando e ganha experiência (GP), honra, Cupom
vinculado e ouro a cada minuto, até acabar o tempo diário grátis. Botões da
tela de lista: **Entrar rápido** (sala aleatória não cheia, grátis) e **Criar
sala** (aluga uma sala privada por ouro — ver seção 3). Dentro da sala dá pra
**andar**, **convidar amigo** e **sair**. Tem também sala "VIP" paga (10000 de
ouro pra entrar) e uma opção de **renovar** o tempo diário pagando Cupom.

## 2. Onde fica no código
`apps/game/src/handlers/termas/` com 1 arquivo por ação do jogo (nome = o que o
jogador vê na tela): `mgr.ts` (sem tela própria, infra: `HotSpringMgr`/`SpaRoom`),
`entrar.ts`, `mover-convidar.ts`, `salas-privadas.ts`, `cupom-tempo.ts`, `index.ts`.

| Ação (cliente AS3) | Pacote | Servidor TS | C# original | Tabelas |
|---|---|---|---|---|
| `sendHotSpringEnter` — abrir a lista de salas | 187 HOTSPRING_ENTER | [`hotSpringEnter`](../../apps/game/src/handlers/termas/entrar.ts#L20) `entrar.ts:20` | `HotSpringEnterHandler.cs` | `game."HotSpringRoom"` |
| `sendHotSpringRoomQuickEnter` — Entrar rápido | 190 HOTSPRING_ROOM_QUICK_ENTER | [`hotSpringRoomQuickEnter`](../../apps/game/src/handlers/termas/entrar.ts#L44) `entrar.ts:44` | `HotSpringRoomQuickEnterHandler.cs` | — |
| `sendHotSpringRoomEnter` — entrar numa sala específica (10000 ouro) | 202 HOTSPRING_ROOM_ENTER | [`hotSpringRoomEnter`](../../apps/game/src/handlers/termas/entrar.ts#L27) `entrar.ts:27` | `HotSpringRoomEnterHandler.cs` | `player."Sys_Users_Detail"` (ouro) |
| `sendHotSpringRoomEnterConfirm` | 212 HOTSPRING_ROOM_ENTER_CONFIRM | [`hotSpringRoomEnterConfirm`](../../apps/game/src/handlers/termas/entrar.ts#L54) `entrar.ts:54` | `HotSpringEnterConfirmHandler.cs` | — |
| `sendHotSpringRoomEnterView` — ver quem está na sala | 201 HOTSPRING_ROOM_ENTER_VIEW | [`hotSpringRoomEnterView`](../../apps/game/src/handlers/termas/entrar.ts#L65) `entrar.ts:65` | `HotSpringRoomEnterViewHandler.cs` | — |
| `sendHotSpringRoomPlayerRemove` — sair da sala | 169 HOTSPRING_ROOM_PLAYER_REMOVE | [`hotSpringRoomPlayerRemove`](../../apps/game/src/handlers/termas/entrar.ts#L73) `entrar.ts:73` | `HotSpringRoomPlayerRemoveHandler.cs` | — |
| `sendHotAddTime` — renovar tempo diário pagando Cupom | 12 HOTSPRING_CMD_B sub 11 | [`hotSpringCmdB`](../../apps/game/src/handlers/termas/cupom-tempo.ts#L13) `cupom-tempo.ts:13` | `HotSpringRoomTimeAdded.cs` | `player."Sys_Users_Extra"` |
| `sendHotSpringRoomCreate` — Criar sala privada (paga) | 175 HOTSPRING_ROOM_CREATE | [`hotSpringRoomCreate`](../../apps/game/src/handlers/termas/salas-privadas.ts#L32) `salas-privadas.ts:32` | sem handler C# dedicado — feature nova, ver seção 3 | `game."HotSpringRoom"` (`roomType=1`) |
| `sendHotSpringRoomPlayerTargetPoint` — andar na sala | 191 HOTSPRING_CMD sub 1 TARGET_POINT | [`targetPoint`](../../apps/game/src/handlers/termas/mover-convidar.ts#L16) `mover-convidar.ts:16` | `HotSpringCmdDataHandler.cs` | — |
| `sendHotSpringRoomInvite` — convidar amigo | 191 HOTSPRING_CMD sub 4 HOTSPRING_ROOM_INVITE | [`hotSpringRoomInvite`](../../apps/game/src/handlers/termas/mover-convidar.ts#L40) `mover-convidar.ts:40` | idem | — |
| `sendHotSpringRoomRenewalFee` — pagar pra renovar a sala privada | 191 HOTSPRING_CMD sub 3 | [`hotSpringRoomRenewalFee`](../../apps/game/src/handlers/termas/salas-privadas.ts#L51) `salas-privadas.ts:51` | sem handler C# — feature nova | `game."HotSpringRoom"` |
| `sendHotSpringRoomEdit` — editar nome/senha/descrição da sala privada | 191 HOTSPRING_CMD sub 6 | [`hotSpringRoomEdit`](../../apps/game/src/handlers/termas/salas-privadas.ts#L59) `salas-privadas.ts:59` (só o dono pode) | sem handler C# — feature nova | `game."HotSpringRoom"` |
| `sendHotSpringRoomAdminRemovePlayer` — dono expulsa 1 jogador | 191 HOTSPRING_CMD sub 9 | [`hotSpringRoomAdminRemovePlayer`](../../apps/game/src/handlers/termas/salas-privadas.ts#L69) `salas-privadas.ts:69` | sem handler C# — feature nova | — |
| `sendHotSpringRoomPlayerContinue` — "ainda aqui" (o cliente nunca lê a resposta) | 191 HOTSPRING_CMD sub 10 | [`hotSpringRoomPlayerContinue`](../../apps/game/src/handlers/termas/salas-privadas.ts#L77) `salas-privadas.ts:77` | sem handler C# — feature nova | — |
| Tick de experiência (sem pacote de entrada — roda num timer de 60s por jogador na sala) | saída `191` byte `7` | [`HotSpringMgr.tick`](../../apps/game/src/handlers/termas/mgr.ts#L283) `mgr.ts:283` | `GameUtils/PlayerExtra.HotSpringCheck` | `player."Sys_Users_Extra"` |

`175 HOTSPRING_ROOM_CREATE` e os subcódigos `3/6/9/10` de `191 HOTSPRING_CMD`
**não existiam no C# original** (nem em `vendor/DDTank41` nem em
`vendor/DDT-6600` — grepado, zero handler/classe pra eles), mas o cliente 4.1
sempre teve a UI completa pronta pra isso (`HotSpringRoomListController`,
`HotSpringRoomController`, `RoomMenuView`). Por decisão do dono, foram
**implementados como feature nova** (não um porte): salas privadas (`roomType=1`,
diferente das salas públicas fixas `roomType=2`) que o próprio jogador aluga,
renova, edita e administra. Ver `research/qa/port-D.md` ("Pass 2") pro
levantamento completo e a decisão documentada, e o cabeçalho de
`salas-privadas.ts` pros detalhes.

## 3. Fluxo passo a passo

### Abrir a lista e entrar numa sala
1. Jogador abre o ícone **Termas** no hall → cliente manda `187
   HOTSPRING_ENTER`.
2. `hotSpringEnter` (`entrar.ts:20`) adiciona o jogador a
   `HotSpringMgr.scene` (o conjunto de quem está vendo a lista) e responde
   com `roomList()`: todas as salas carregadas de `game."HotSpringRoom"` no
   boot do servidor (`HotSpringMgr.load`, `mgr.ts:48`).
3. **Entrar rápido** (`190`): filtra salas não cheias, sorteia uma entre as 4
   primeiras (`entrar.ts:48`) e chama `add()` — grátis.
4. **Entrar numa sala da lista** (`202`): confere se o jogador já não está em
   outra sala, se a sala existe e se o jogador tem `10000` de ouro
   (`ctx.lang.t("HotSpringRoomEnterDataHandler.NotEmoughtGold")` se não tiver);
   só então chama `m.add(p, room)` e **depois** desconta o ouro
   (`p.removeGold(need)`, `entrar.ts:35`) — nessa ordem, pra não cobrar se
   a sala lotou entre a checagem e o `add()`.
5. `HotSpringMgr.add()` (`mgr.ts:234`) empurra o jogador pra
   `room.players`, marca a posição padrão (`DEFAULT_POS` = x480,y560,dir3),
   tira o jogador de `scene`, inicia o timer de tick (`startTimer`,
   `mgr.ts:265`) e avisa os outros da sala (`playerInfo`, pacote `198`).

### Andar dentro da sala (TARGET_POINT)
1. Cliente manda `191 HOTSPRING_CMD` sub `1` com o id do jogador que deveria
   mover + o caminho (string `"x1,y1,x2,..."`).
2. `sanitizePath()` (`mgr.ts:328`) descarta coordenadas quebradas, corta
   em até 100 pontos e fixa cada ponto dentro de `SCENE` (0..2000 x, 0..1200
   y, `mgr.ts:19`).
3. **Correção de segurança** (ver cabeçalho de `mover-convidar.ts`): o id de
   jogador que o cliente manda é **ignorado** — só o próprio remetente se
   move, nunca quem o pacote afirma mover. O original (`TargetPointCmd.cs`)
   confiava no id do pacote e deixava um jogador "mover" outro.
4. Resposta `191`/byte `1` é retransmitida pra sala (exceto o remetente).

### Tick de experiência (todo minuto)
1. `startTimer()` arma um `setInterval` de 60s (`tickMs`) por jogador na sala.
2. `HotSpringMgr.tick()` (`mgr.ts:283`): se `min <= 0` expulsa o
   jogador (mensagem "Seu tempo nas Termas acabou."); senão desconta 1 minuto,
   calcula `gp = HotSpringExp[Grade]/10`, multiplica por `1/2/3/4` conforme
   VIP (`< 3` / `3-5` / `6-7` / `>= 8`), e dá `+50` de honra, `+10` de Cupom
   vinculado (giftToken) e `+50` de ouro fixos — **não configuráveis por
   tabela**, são literais no código.
3. Manda pacote `191` byte `7` com `min` restante e `gp` ganho; chama
   `saveExtra()` que grava `MinHotSpring`/`LastTimeHotSpring` em
   `player."Sys_Users_Extra"` a cada tick (não espera o autosave geral).

### Sair da sala
1. `169 HOTSPRING_ROOM_PLAYER_REMOVE` → `HotSpringMgr.remove()`
   (`mgr.ts:252`): tira da sala, para o timer, avisa a sala e o próprio
   jogador (pacote `199`), volta a posição padrão e salva `Sys_Users_Extra`.
2. Ao desconectar sem sair explicitamente: `hotSpringOnQuit()`
   (`mgr.ts:340`) é chamado pelo fluxo de logout/desconexão e faz o
   mesmo `remove()` + tira da `scene`.

### Criar/administrar sala privada (feature nova, não existia no C#)
1. `175 HOTSPRING_ROOM_CREATE` com nome/senha/descrição/capacidade: cobra
   `HotSpringRoomCreateGold` ouro (padrão `20000`, `mgr.ts:75`), recusa
   se o jogador já tem outra sala própria. Cria uma linha `game."HotSpringRoom"`
   com `roomType=1` (as 13 salas públicas seedadas são sempre `roomType=2`) e
   `playerID` = dono — ela entra na mesma lista/broadcast das salas públicas.
2. A sala própria tem um **cronômetro independente** (`effectiveTime`,
   `HotSpringRoomInitialMinutes` = 60 min iniciais, `mgr.ts:81`) que
   desconta sozinho a cada minuto, esteja ocupada ou não — ao chegar a 0,
   todos são expulsos e a sala é apagada (broadcast `174
   HOTSPRING_ROOM_REMOVE`). Esse timer é retomado ao reiniciar o servidor
   (fecha de cara se já tinha expirado enquanto o servidor estava fora).
3. `191/3 RENEWAL_FEE`: só o dono, de dentro da própria sala, paga
   `HotSpringRoomRenewalGold` (padrão `3000`, `mgr.ts:96`) por
   `HotSpringRoomRenewalMinutes` (padrão `30`) minutos extra.
4. `191/6 EDIT`: só o dono renomeia/reseta senha/descrição.
5. `191/9 ADMIN_REMOVE_PLAYER`: só o dono expulsa 1 jogador nomeado (reusa o
   mesmo fluxo de saída voluntária, pacote `199`).
6. `191/10 PLAYER_CONTINUE`: o cliente nunca lê uma resposta pra isso — é só
   um "ainda aqui" (`true`) ou equivalente a sair (`false`, igual ao `169`).
7. Correção junto com a feature: **o dono não paga mais os 10000 de ouro de
   entrada normal ao entrar na própria sala** (`202`) — ele já pagou pra
   alugá-la; um visitante continua pagando em cheio.

### Reset diário do tempo grátis
`MinHotSpring` (60 minutos grátis por dia) é resetado **lazy**, não por job
agendado: na primeira vez que o jogador usa a Fonte Termal depois da meia-noite
UTC, `HotSpringMgr.st()` (`mgr.ts:167`) compara
`LastFreeTimeHotSpring` (salvo) com a data de hoje e zera pra `60` se mudou de
dia (comentário no código cita `GamePlayer.CheckNewDay` do original, que fazia
isso num scheduler — aqui é refeito na entrada).

## 4. Quero mudar…
- **Preço de entrar numa sala da lista**: constante `need = 10000` (ouro),
  dentro do handler `202 HOTSPRING_ROOM_ENTER` (`entrar.ts:32`).
- **Preço/tempo de renovar o spa com Cupom**: configs do servidor
  `SpaAddictionMoneyNeeded` (padrão `1299`) e `SpaPriRoomContinueTime` (padrão
  `30` minutos), lidas por `ctx.templates.cfgInt(...)` dentro do handler `12
  HOTSPRING_CMD_B` (`cupom-tempo.ts:15-17`) — editar via tabela
  `game."Server_Config"` (SQL direto; sem recurso admin dedicado ainda).
- **Experiência por nível (Grade)**: config `HotSpringExp` em
  `game."Server_Config"` — string `"valor1,valor2,..."` por nível, carregada
  em `HotSpringMgr.load()` (`mgr.ts:48`) pra `expTable`; `expWithLevel()`
  (`mgr.ts:181`) indexa por `Grade - 1`.
- **Multiplicador de experiência por VIP**: hardcoded em `tick()`
  (`mgr.ts:295`): `vip >= 8 → x4`, `> 5 → x3`, `>= 3 → x2`, resto `x1`.
  Não é config — é mudança de código.
- **Honra/Cupom/ouro ganhos por minuto**: literais `honor = 50`, `giftToken =
  10`, `gold = 50` dentro de `tick()` (`mgr.ts:297`).
- **Minutos grátis por dia**: literal `60` em `st()` (`mgr.ts:171` e `:174`,
  `s.min = 60`).
- **Quais/quantas salas existem, nome, tipo, capacidade**: tabela
  `game."HotSpringRoom"` (colunas `roomID`, `roomNumber`, `roomName`,
  `roomPassword`, `maxCount`, `roomType`...), carregada uma vez no boot
  (`HotSpringMgr.load()`); depois de editar via SQL, reinicie `apps/game` pra
  recarregar (a lista fica em memória, não há cache automático de reload).
- **Preço/duração de alugar sala privada**: configs `HotSpringRoomCreateGold`
  (padrão `20000`) e `HotSpringRoomInitialMinutes` (padrão `60`),
  `mgr.ts:75,81` — `game."Server_Config"`.
- **Preço/duração de renovar sala privada**: `HotSpringRoomRenewalGold`
  (padrão `3000`) e `HotSpringRoomRenewalMinutes` (padrão `30`),
  `mgr.ts:96,99`.
- **`roomType=1` identifica sala privada** (vs `2` = pública fixa da seed) —
  útil se for criar um recurso admin pra gerenciar salas privadas existentes.

## 5. Testes
- `apps/game/test/hotspring.test.ts`:
  - `describe("hot spring path sanitizing")` — `sanitizePath()` corta
    coordenadas quebradas e fixa dentro da cena.
  - `describe("hot spring rooms")` — fluxo completo: listar (`187`→`197`),
    entrar pagando 10000 ouro (`202`), ver o outro jogador entrar (`198`),
    mover-se com id falsificado por outro jogador e confirmar que só quem
    mandou o pacote se move (server-authoritative), um tick de experiência
    (`HotSpringMgr.tick`), sair (`169`→`199` pro resto da sala).
- `apps/game/test/farm-compose-hotspring-rooms.test.ts` — fluxo completo da
  sala privada ponta a ponta (criar → dono entra de graça / visitante paga
  10000 → RENEWAL_FEE estende → EDIT renomeia (e confirma que não-dono não
  consegue) → ADMIN_REMOVE_PLAYER expulsa → PLAYER_CONTINUE(false) sai);
  confirma também que um 2º aluguel pro mesmo dono é recusado.
- Status: **OK** — listar/entrar (lista e rápida)/ver jogadores/mover-se (com
  a correção de segurança)/convidar/tick de experiência/sair/renovar tempo com
  Cupom/criar e administrar sala privada. Nada pendente nesta feature.
- Ver também [casamento.md](./casamento.md) e [leilao.md](./leilao.md): não
  compartilham arquivo de teste com Termas, mas são as outras features
  "sociais" do mesmo bloco D do port-plan.

## 6. Minigame "Đại chiến Hút Gà" (captura de bichinhos, pacote 166)

### O que é
Ícone **Especial** do hall abre um mundo à parte (mapa próprio, nada a ver com
as salas relax da seção 1-5): bichinhos "bogu" (pequeno/médio/grande/gigante)
nascem espalhados pelo mapa; o jogador clica num pra "inalar" (capturar) —
pequeno/médio sozinho, grande/gigante precisa de um grupo de vários jogadores
clicando no mesmo bichinho antes de completar a captura. Ao reportar a pontuação
final, o bichinho some do mapa e o jogador ganha pontos (`Score`, o mesmo campo
usado por outras features de ranking — sem recompensa de item, é fiel ao
original: lá também é só pontuação).

### Onde fica no código
`apps/game/src/handlers/minigame-termas/` (pasta própria, **não** dentro de
`termas/`): `mgr.ts` (sem tela própria — `Bogu`, `LittleGameMgr`, leitura do
mapa, config, timers), `entrar-sair.ts`, `mover.ts`, `capturar.ts`, `index.ts`.
Classe de jogo em `mgr.ts` (não tem uma pasta `game/little-game/` separada —
coube tudo dentro do handler por ser um mundo pequeno e auto-contido).

| Ação (cliente AS3) | Pacote | Servidor TS | C# original |
|---|---|---|---|
| `enterWorld` | 166 sub 2 ENTER_WORLD | [`enterWorld`](../../apps/game/src/handlers/minigame-termas/entrar-sair.ts#L16) | `LittleGame/Handle/EnterWorld.cs` |
| `loadComplete` | 166 sub 3 LOAD_COMPLETED | [`loadCompleted`](../../apps/game/src/handlers/minigame-termas/entrar-sair.ts#L26) | `LoadCompleted.cs` → `SendLoadComplete` |
| `leave` | 166 sub 4 LEAVE_WORLD | [`leaveWorld`](../../apps/game/src/handlers/minigame-termas/entrar-sair.ts#L32) | `LeaveWorld.cs` |
| `selfMoveTo` | 166 sub 32 MOVE | [`move`](../../apps/game/src/handlers/minigame-termas/mover.ts#L15) | `Move.cs` |
| `synchronousLivingPos` | 166 sub 33 POS_SYNC | [`posSync`](../../apps/game/src/handlers/minigame-termas/mover.ts#L30) | `PosSync.cs` (no-op no original, mantido) |
| `livingClick` | 166 sub 65 CLICK | [`click`](../../apps/game/src/handlers/minigame-termas/capturar.ts#L17) | `Click.cs` + `Bogu.cs` (`Сaught` setter) |
| `cancelInhaled` | 166 sub 66 CANCEL_CLICK | [`cancelClick`](../../apps/game/src/handlers/minigame-termas/capturar.ts#L54) | `CancelClick.cs` |
| `sendScore` | 166 sub 64 REPORT_SCORE | [`reportScore`](../../apps/game/src/handlers/minigame-termas/capturar.ts#L79) | `ReportScore.cs` |

Nível mínimo **20** pra entrar (`EnterWorld.cs`, literal no código, não é
config). Mapa: `apps/game/data/littlegame-map.data` — cópia byte-a-byte de
`Road.Service/Datas/LittleGame/map.data` (zlib), carregada uma vez em
`mgr.ts` (`loadMapPoints`) só pra sortear posições válidas (o A* de verdade é
100% client-side, `Source Flash/src/littleGame/data/AStar.as`).

### Bugs do original preservados de propósito
- `BoguGenerator`: sorteio de modelo usa `Random.Next(min,max)` do .NET
  (`max` **exclusivo**). Pros bichinhos pequenos, `NextStatic(1,3)` só devolve
  `1` ou `2` → **"bogu3" nunca nasce**. Pros médios, `NextStatic(0,2)` num
  array de 3 só devolve índice `0`/`1` → **"bogu8" nunca nasce** (sempre
  "bogu4"). Também o sorteio de ponto do mapa (`NextStatic(points.Count-1)`)
  nunca sorteia o ÚLTIMO ponto da lista. Tudo isso é assim no C# original —
  preservado tal e qual, não é bug da porta.
- Quem calcula a pontuação final é o **cliente** (`REPORT_SCORE` manda o
  valor já pronto, `ReportScore.cs`/`GamePlayer.AddScore` só soma sem validar
  contra HP/tempo de clique) — design do minigame original, não uma falha de
  segurança desta porta.

### Pendências (ver `research/qa/pendencias-sem-fonte.md`)
- **Agendamento por horário**: o original abre/fecha automaticamente por
  `GameProperties.LittleGameStartHourse`/`LittleGameTimeSpendingHours`
  (`GameServer.cs`) — não existe agendador C#→TS genérico ainda sendo editado
  nesta sessão (outra IA trabalha em `eventos/agendador.ts`/`session/login.ts`),
  então por ora o minigame fica **sempre aberto** desde que o servidor sobe
  (`LittleGameMgr.open()` chamado direto no construtor). `open()`/`close()`
  já existem prontos pra quem for ligar o controle por horário depois.
- **Assets client-side** (`image/tilemap/1/map.bin`, `image/world/map/1/scene.swf`,
  `image/world/object/other.swf`, `image/world/monster/bogu*.png`): servidos
  pela rota `/resource/*` genérica (`apps/api/src/routes/static.ts`) se
  existirem no pacote de recursos original; se faltar algum, cai no
  placeholder — não verificado byte-a-byte nesta sessão (fora do escopo de
  lógica de servidor).

### Testes
`apps/game/test/littlegame.test.ts`: bloqueio por level, entrar → snapshot
completo → outro jogador vê o ADD_SPRITE → mover (server-authoritative,
excluindo o remetente do broadcast) → clicar num bichinho pequeno/médio
(sozinho) → HUD "normalbogu" → reportar pontuação (soma `Score`, remove o
bichinho, broadcast de remoção) → sair; mais um teste de cancelar o clique no
meio (`CANCEL_CLICK`) sem pontuar.
