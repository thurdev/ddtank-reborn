# Status do cliente PixiJS (testado)

Testado com o roteiro automático (`apps/client/scripts/smoke.mjs`, ver
[COMO-RODAR.md](COMO-RODAR.md)) numa conta de teste nível 30. "OK" = abre e
funciona sem erro no console; detalhes visuais anotados.

Última atualização: 2026-10-26.

## Fluxo principal

| Tela / fluxo | Status | Observação |
|---|---|---|
| Carregamento + minigame do hamster | OK | |
| Login (HTTP + WebSocket) | OK | |
| Hall (prédios, tooltips, ícones) | OK | |
| Lista de salas PvP / criar sala / sala | OK | |
| Fila automática → batalha PvP contra bot | OK | turnos, tiro, vento, minimapa, balões de fala; ver bug corrigido em 2026-10-24 abaixo |
| Expedição (lista, criar sala, escolher instância) | OK | |
| Batalha PvE + tela de derrota (LOSE) | OK | balões de fala dos monstros |
| Chat (digitar, enviar, cores por canal, acentos) | OK | |
| Loja: comprar item | OK | moeda desconta na hora |
| Bolsa: item comprado, menu (Abrir/Mover), tooltip, abrir pacote | OK | |
| Equipar (duplo clique) e trocar arrastando (clica pega, clica solta) | OK | atributos e avatar atualizam |

## Prédios e janelas do hall

| Tela | Status | Observação |
|---|---|---|
| Loja | OK | |
| Bolsa / informações | OK | aba "Thú cưng" é arte em VN |
| Correio | OK | |
| Tarefas | OK | |
| Amigos (Contato Social) | OK | |
| Configurações | OK | |
| Menu "Pular" | OK | |
| Forja (Ferreiro) | OK | aba "Gia Công" é arte em VN |
| Hall da Fama | OK | |
| Spa (Termas) | OK | |
| Sociedade | OK | |
| Igreja (casamento) | OK | |
| Leilão | OK | |
| Academia (Escola) | OK | botão "Aceitar Discípulo": o próprio PNG traduzido (`academy/shapes/46.png`) tem o meio claro — arte |
| Centro de Namoro (Amizades) | OK | |
| Laboratório de Combate (Campo de Treino) | OK | alguns nomes de curso se sobrepõem (texto longo do `language.txt`) |
| Fazenda | ABRE (testar em jogo) | pacotes 81 corrigidos no servidor; célula de "matar praga" corrigida no transpilador |
| Ícones do hall: EVENT (presentes do servidor, explicação, roleta da sorte, código) | OK | "Caixa da galinha" quebra se o servidor não manda a lista do evento (igual ao Flash) |
| Ícones do hall: Destaques (Guerra das Galinhas, Guerra do Deus Dragão) | OK | |
| Calendário / recompensas por cadastro, 1ª recarga, área de sugestões | OK | |

## Achados da sessão 2026-10-24 (regeneração + "até a vitória")

- **Bug corrigido — prédios do hall não clicavam** (`packages/flash/src/display/alpha-hit.ts`):
  vários ícones do hall (ex. "Sala de Jogos"/`roomList_mc`) são, no AS3 original,
  um `Shape` com preenchimento 100% transparente posicionado por cima da arte de
  fundo — só a área de clique, sem desenho próprio (técnica comum do Flash). O
  exportador rasteriza esse preenchimento como está (PNG 100% transparente) e o
  hit-test do shim testa o alfa do pixel exportado — então esses botões nunca
  registravam clique (em qualquer ponto, não só em coordenada errada). Corrigido:
  quando o PNG rasterizado sai inteiramente transparente, o hit-test agora usa o
  retângulo inteiro da forma em vez do alfa do pixel. Confirmado com
  `apps/client/scripts/smoke.mjs`: antes do fix, clicar em "Sala de Jogos" sempre
  resolvia pro fundo (`hallMainViewAsset`); depois, abre `RoomListView` normalmente.
  Esse mesmo padrão pode existir em outros prédios/ícones do hall — vale reteste.
- **Batalha até o fim**: com o fix acima, a fila/sala/batalha PvP completa roda e o
  cliente chega a receber `GAME_CMD/GAME_OVER`. A troca de tela pós-batalha (próximo
  mapa/revanche) travou numa sessão de teste com `Cannot read properties of null
  (reading 'bitmapData')` em `MapView.ts` (`param2.backBmp` nulo) — mas isso bateu
  exatamente com o набор `resource` ainda no meio da reexportação (ver abaixo); os
  SWFs de bala/explosão (`resource/image/bomb/bullet/...`, `blastout/...`) ainda não
  exportados fazem a API servir o `.swf` cru, que o `Loader` do shim tenta decodificar
  como imagem e falha. **Não confirmado se é só isso ou se há bug real na troca de
  tela** — reteste depois que `resource` terminar de exportar.
  A tela de cartas/prêmios (`ExpView`, acionada por `GameOverAction`/`MissionOverAction`
  → `GameView.showExpView`) não foi confirmada visualmente nesta sessão por causa
  desse travamento; o código existe e parece estruturalmente certo (lida vitória vs.
  derrota, aciona `ExpView`/estado de mundo/masmorra conforme o tipo de sala).
- **Ferramenta de debug mais robusta**: `ddtDebug.find()` e o `symbolsInside` usado em
  `ddtDebug.under()`/clique podiam lançar `RangeError #2006` em containers cujo
  `numChildren` não bate com `getChildAt` (ex. `HallIconBox`, que também é assim no
  AS3 original — redireciona `addChild` pra um Sprite interno sem sobrescrever
  `getChildAt`). Agora ignora esses "buracos" em vez de quebrar a árvore inteira.
- Regeneração completa nesta sessão: `src/game` (transpilador, 2643 arquivos, 13
  avisos pré-existentes), assets `ui` (121 SWFs, 0 falhas), sons (156 MP3, 0 falhas).
  `resource` (3017 SWFs) ainda rodando em background no fim da sessão — ver
  `tools/swf-export/resource-export.log`; algumas falhas isoladas por nome de
  arquivo corrompido/duplicado no vendor (ex. caracteres cirílicos) são esperadas
  e não bloqueiam o resto do set.

## Achados da sessão 2026-10-26 (resource completo + "até a vitória" + varredura do hall)

- **Varredura de todos os 12 ícones de prédio do hall** (`church_mc`, `shop_mc`,
  `dungeon_mc`, `roomList_mc`, `auction_mc`, `active_mc`, `civil_mc`, `store_mc`,
  `campaignLab_mc`, `tofflist_mc`, `hotWell_mc`, `consortia_mc`): todos OK depois
  do fix de hit-test de forma transparente (2026-10-24) — nenhum tem mais o bug.
  Varredura genérica de todo objeto `*Button` visível também rodada; só 2 achados
  (`SelectedButton` em `ChatOutputView` 355,407 e `BaseButton` 454,578, ambos de
  rolagem/UI do chat) não respondem no centro do próprio bounds — baixo risco
  (prov. coberto por outro elemento ali, não testado a fundo; reteste se notar
  chat sem rolar).
- **Resource (3017 SWFs) terminou**: 2946 ok, 71 falhas (nome de arquivo
  corrompido/duplicado no vendor, ex. caracteres cirílicos/CJK — `apps/client/public/assets/EXPORT-REPORT.txt`).
  Todo o set de assets agora completo (ui + resource + sons).
- **Batalha PvP confirmada de ponta a ponta com o resource completo**: fila →
  sala → bot entra → batalha roda com pacotes reais (`DIRECTION`, `FIRE_TAG`,
  `FIRE`, `SYNC_LIFETIME`, `TURN`, `DANDER`) e o personagem **subiu de nível
  de verdade** durante o combate ("Parabéns, você aumentou de nível!" no chat).
  Não foi possível fechar um KO completo com o roteiro automático (mirar/atirar
  às cegas contra um bot real é pouco confiável pra vencer de propósito em N
  tentativas de teste) — a tela de cartas/prêmios (`ExpView`) continua **não
  confirmada visualmente**, mas o caminho até ela (`GameOverAction` → vitória →
  `GameView.showExpView`) é o mesmo código que já roda pra derrota (confirmado
  antes) e não há mais nenhum bloqueio técnico conhecido na cadeia.
- **Achado operacional (não é bug do jogo)**: subir `apps/api`/`apps/game` à
  mão sem `DATABASE_URL` no ambiente faz cada processo abrir seu próprio
  PGlite embutido isolado (ver nota em [COMO-RODAR.md](COMO-RODAR.md)) — o
  socket do jogo nunca valida a chave e o cliente cai pra "sua sessão
  expirou". Consumiu boa parte desta sessão até identificar; documentado pra
  não repetir.
- **Bug novo achado, não corrigido** (`ddt/view/common/GradeContainer.ts:36`):
  `this._grade["lv_mc"]["lv_mc_init"]["video"].clear()` lança
  `TypeError: Cannot read properties of undefined (reading 'clear')` ~6s depois
  de mostrar a animação de "subiu de nível" (`playerGrade()`/`setGrade()`), no
  timer que devia limpar a animação. `lv_mc.lv_mc_init.video` deu `undefined`
  nessa instância — não investigado a fundo (pode ser nome de instância que só
  existe em certas variações da arte, ou timing de carregamento). Não trava o
  jogo (o erro é só logado, não interrompe o fluxo), mas a animação de level-up
  pode ficar presa na tela sem o timer de limpeza funcionando. Vale revisitar.
- `pnpm typecheck`: 763 → 119 erros nesta sessão (ver commits `5fe8449a`,
  `4c6b608d`, `814a5509`, `7407a302`, `59922ca4`, `6659ca62`, `dca6b2e3` em
  `packages/flash` e `tools/as3-to-ts`) — camada de compatibilidade
  Date/Array do AS3, `MovieClip`/`URLVariables`/`dynamic class` como
  assinatura de índice, `IDisplayObject extends IEventDispatcher` (o
  transpilador tirava `extends` de interface nativa), comparação E4X
  `XMLList == string` vira `.toString()`, `addEventListener` aceita
  `Function` (não só `(e:any)=>void`), coerção XML→int/uint em argumento
  de construtor. Os 119 restantes são heterogêneos (sem padrão único óbvio
  que valha a pena generalizar) — ver `grep "error TS" <log do typecheck>`
  pra lista atual.

## Achados da sessão 2026-10-26 parte 2 (GradeContainer + DEV_BOT_HP + hall sweep)

- **Bug corrigido — `GradeContainer.ts:36` crash no timer de limpeza do level-up**
  (`TypeError: Cannot read properties of undefined (reading 'clear')`). Causa raiz
  rastreada até `SwfLibrary.create(id)`: o caractere id 371 (child nomeado "video"
  da timeline de `lv_mc_init`, dentro de `asset.core.playerLevelUpFaileAsset`) não
  existe em `library.json` — falta entre os ids 370 e 372, característico de um
  `DefineVideoStream` (vídeo embutido no SWF original) que o exportador não tem
  como rasterizar (sem desenho vetorial/bitmap pra virar PNG). `create()` devolvia
  `null`; `MovieClip.$place` (e `SimpleButton`/`Sprite`, mesmo padrão) abortava a
  colocação sem nunca setar a instância nomeada — qualquer código que depois
  chamasse um método nela quebrava. Corrigido genericamente (`packages/flash/src/swf/SwfLibrary.ts`):
  caractere ausente agora vira um `MovieClip` vazio envolto num `Proxy` (método
  que não existir nele vira no-op em vez de `TypeError`); cobre qualquer SWF com
  esse mesmo problema, não só este.
- **Segundo bug achado e corrigido em batalha**: `RoomCharacter.initLoader` quebrava
  com `Cannot read properties of null (reading 'createLoader')` quando
  `__propertyChange` (listener de `PlayerPropertyEvent.PROPERTY_CHANGE`) rodava
  num personagem já descartado (`_factory` zerado por `dispose()`) — o AS3 original
  confia só no `removeEventListener` de `dispose()`, mas no shim um evento
  disparado bem na hora da troca de sala/fim de batalha ainda pode chegar antes da
  remoção surtir efeito. Patch em `tools/as3-to-ts/patches/ddt/view/character/BaseCharacter.ts.json`
  guarda com `_disposed` (campo que já existia, só não era checado nesse método).
- **`DEV_BOT_HP` (dev-only, `apps/game/src/bots/view.ts`)**: nova env var que,
  quando setada (ex. `DEV_BOT_HP=1`), sobrescreve o hp computado de **todo** bot
  de PvP — ausente (padrão) não muda nada. Pedido pra tornar a tela de vitória
  testável sem precisar vencer um bot com hp real: os bots de PvP têm o nível
  deliberadamente igualado ao do jogador humano pra ser justo
  (`apps/game/src/bots/provider.ts acquire()`: `level: Math.max(1, level)`), então
  `level`/`difficulty` de `app."Bots"` **não** servem pra criar um alvo fácil —
  por isso a env var em vez de editar dado existente.
  - Rastreado por leitura de código até `packages/fight/src/game/living.ts:452`
    (`this.maxBlood = s.hp`) — o caminho parece correto.
  - **Não confirmado empiricamente** dentro do timebox desta sessão: rodei a
    batalha PvP completa várias vezes com `DEV_BOT_HP=1` e o servidor de jogo
    reiniciado com a env var; turnos/pacotes `FIRE`/`DIRECTION`/`TURN` trocam
    normalmente e "Parabéns, você aumentou de nível!" aparece no chat (sinal de
    dano reconhecido), mas não fechei um `GAME_OVER` pra confirmar visualmente o
    `ExpView`. Tentei inspecionar `blood`/`maxBlood` ao vivo varrendo a *display
    list* (`ddtDebug.stage`) por um objeto com essas propriedades — não achei
    nenhum: `GameLiving`/`GamePlayer` (o que fica na tela) parece ser só a parte
    visual; o modelo com `_blood`/`_maxBlood` (`game/model/Living.ts`) não é um
    `DisplayObject` e não aparece nessa varredura, então não dá pra confirmar o
    valor em runtime por esse caminho.
  - **Causa provável do "não fechei o KO"**: mirar às cegas com `ArrowUp`/`Space`
    em tempos fixos depende de acertar a janela real do próprio turno (contador
    "sua vez" do servidor); mesmo com hp=1 no bot, um tiro só mata se **acertar**,
    e nem todo tiro do roteiro conecta. Não é um problema do hp override em si.
  - **Próximo passo sugerido**: achar o caminho certo pra ler `blood`/`maxBlood`
    em runtime (provavelmente via o modelo em `GameManager.Instance.Current.livings`,
    que não é global — precisa expor via `ddtDebug` ou importar o módulo no eval
    de outra forma) pra confirmar o valor ANTES de gastar tempo em mais tentativas
    de tiro; ou simplesmente deixar um roteiro de vários tiros rodar mais tempo e
    checar screenshots periódicos até pegar a tela de vitória.
- Varredura de todos os 12 ícones de prédio do hall já tinha sido feita na parte 1
  desta sessão (todos OK) — não refeita aqui por falta de tempo após o
  investigação de HP/vitória.

## Achados da sessão 2026-10-26 (pixi-net: latência de rede)

Tarefa: investigar reclamação do dono de que pacotes demoram muito ("ações
parecem travadas"). Medido ponta a ponta com um 2º processo `apps/game`
isolado (canal próprio, mesmo Postgres) + `PACKET_TRACE=true` no servidor +
o painel `rede` do cliente (`?fps=1`, já existente em `packages/flash/src/stats.ts`
— mede o tempo entre mandar um pacote e receber a resposta do mesmo código)
+ Playwright pra automatizar login/chat.

**Instrumentação usada (não é nova — já existia, só não documentada):**
- Cliente: `?debug=true` já loga cada pacote ↑/↓; `?fps=1` mostra "rede N ms"
  (RTT por código casado) no canto superior esquerdo e expõe
  `window.ddtStats.rtt` no console.
- Servidor: `PACKET_TRACE=true` (env, já existia em `session/client.ts`) loga
  `[pkt] <- código` / `[pkt] -> código` com timestamp — dá pra ver exatamente
  onde o servidor gasta tempo entre receber e responder.

**O que NÃO era o problema** (descartado por leitura de código + medição):
- Transporte: TCP já usa `setNoDelay(true)` (`apps/game/src/net/transports.ts`),
  WS já desliga `perMessageDeflate` dos dois lados — sem Nagle, sem compressão.
- Cliente: `Socket.ts`/`ByteSocket.ts` processam cada frame **no mesmo tick**
  do evento `message` do WebSocket (sem `setTimeout`/fila por frame); o
  `EventDispatcher` do shim (`packages/flash/src/events/EventDispatcher.ts`)
  despacha tudo síncrono, sem microtask/macrotask no meio.
  `flush()` manda na hora (`Socket.send` não espera nenhum timer).
  `ByteArray` não tem cópia desnecessária perceptível pro tamanho de pacote
  deste jogo (até ~800 bytes no burst de login).
- Servidor, pacotes do dia a dia (chat, `QUEST_CHECK`, `QUEST_ADD`, `SCENE_LOGIN`):
  medidos **< 5ms** entre receber e responder no `PACKET_TRACE` (ex.:
  `QUEST_ADD` → `178` em 0–1ms). Não há handler lento no caminho comum de
  jogo — bate com o código (nenhum handler de `rooms/`, `salas/comando-de-jogo.ts`
  ou combate faz `await` de DB por pacote).

**O que ERA o problema — `LOGIN` (código 1) faz uma cadeia de ~9-11 round
trips sequenciais ao Postgres antes do 1º pacote de resposta:**
`apps/game/src/session/login.ts` fazia, um atrás do outro: validar o
ticket, achar o personagem, achar o `clientKind`, carregar `PlayerInfo`,
*depois* (só então) um `Promise.all` de 4 queries, `setOnlineState`, outro
`Promise.all` de 4 queries, `eventsOnLogin`, `consortiaOnLogin`,
`inviteLoginPacket`. Cada round trip ao Postgres local (mesma máquina, mas
com a stack inteira do dono + esta sessão rodando em paralelo) custou na
prática **~20-25ms** — não é o Postgres em si (é nativo, não Docker), é o
preço de um round trip TCP/loopback do Windows + overhead do driver
(`postgres.js`)/Drizzle sob a carga de todos os processos Node do dev stack
disputando CPU. Resultado: `LOGIN` sozinho respondia em **~225-260ms** antes
do 1º pacote (medido 2x com o canal isolado, log abaixo), o que o painel
`rede` do cliente mostrava como RTT de 120-220ms durante o boot/entrada no
hall (ações de jogo propriamente ditas, após logado, continuam rápidas).

**Fix** (`apps/game/src/session/login.ts`, sem mudar nenhum pacote/ordem
visível ao cliente — só a ORDEM em que o servidor busca os dados no banco):
1. `ctx.tickets.validate`, `findCharacterByUserName` e `clientKindFor` não
   dependem um do outro (todos só precisam do `user`) — viram 1
   `Promise.all` em vez de 3 `await` em sequência.
2. `loadPlayerInfo` não dependia de nada que `loadMatchInfo`/`loadUserItems`/
   `loadFriends`/`loadProgress` também precisassem — entrou no mesmo
   `Promise.all` que já existia pra esses 4.
3. `setOnlineState` (escrita, resultado não lido) não precisa terminar antes
   do bloco de `loadUserCardBag`/`loadUserPets`/`loadEatPets`/
   `loadAvatarCollection` — entrou nesse `Promise.all` em vez de ter sua
   própria rodada.
   Trade-off documentado no código: um login com ticket inválido agora paga
   por `findCharacterByUserName`/`clientKindFor` também (antes falhava rápido
   só com `validate`) — aceitável, não é o caminho quente e já tem rate limit.

**Antes / depois** (mesmo processo `apps/game` isolado, canal próprio,
`PACKET_TRACE=true`, tempo entre `<- 1 LOGIN` e o 1º `-> 64`):

| Medição | Antes | Depois |
|---|---|---|
| Login 1 (pool frio) | 261ms | — |
| Login 2 (pool quente) | 225ms | — |
| Login 3 | — | 184ms |
| Login 4 | — | 216ms |
| **Média** | **~243ms** | **~200ms** (-18%) |

Redução real mas parcial (~40-75ms por login) — o resto do tempo ainda é
`eventsOnLogin`/`consortiaOnLogin`/`inviteLoginPacket` (não paralelizados
nesta sessão: cada um mexe em estado do `GamePlayer` já construído e manda
pacotes, então juntar os 3 exigiria olhar o que cada um lê do banco vs.
escreve/envia — mais arriscado pro tempo disponível) e a variância inerente
de rodar Postgres + ~8 processos Node na mesma máquina Windows ao mesmo
tempo (ver run 3 vs. run 4 acima — mesma sessão, mesmo fix, 32ms de
diferença só por contenção de CPU).

`tsx watch` vs. build: não comparado empiricamente (buildar só
`apps/game` falha por import ESM — `packages/db`/`auth`/`fight`/`protocol`
também precisariam estar buildados; fora do orçamento desta sessão).
Descartado por análise: a transformação do `tsx` acontece 1x na importação
do módulo, não por pacote — os <5ms medidos por pacote comum (QUEST_ADD etc.)
já rodam sob `tsx` e não mostram overhead por chamada.

**Testes**: `pnpm --filter @ddt/game exec vitest run test/session.test.ts
test/all-open.test.ts test/client-6600.test.ts test/persist-all.test.ts
test/elite-brackets.test.ts --maxWorkers=2` — 44/44 passando (cobre sessão
única, login/kick de sessão velha, cliente 6600, que são os testes que mais
mexem em `session/login.ts`).

**Commit**: `perf(game): pixi-net - paraleliza round trips de DB no LOGIN`.

## Pendências conhecidas

- **Arte com texto em vietnamita** (botão "Bắt đầu", abas, nomes das
  instâncias): são imagens. Agora é só editar o PNG em
  `apps/client/public/assets/...` (ver [ASSETS.md](ASSETS.md)).
- **Textos do servidor em VN** (descrição das instâncias, nomes de mapa):
  vêm do banco/XML do `apps/api`, não do cliente.
- Fonte padrão serifada quando o XML de layout não diz a fonte: é o mesmo
  comportamento do Flash (Times New Roman).
- Ainda não confirmada visualmente: a tela de cartas/prêmios de vitória
  (`ExpView`) — ver achados da sessão 2026-10-26 acima (batalha roda até o
  fim com o resource completo, só não fechei um KO roteirizado). PvE até a
  vitória também não testado (só a derrota, já confirmada). Sociedade/guerra
  de sociedade (ver abaixo — não existe tela no 4.1), chefe mundial,
  minigames, mascote, cartas, totem continuam sem teste de UI (não deu tempo
  nesta sessão depois da investigação de HP/vitória).
- **"Loteria" (ícone `lottery_mc` do hall) é código morto no próprio AS3
  original, não bug de porte**: `HallStateView.setLotteryIcon()` (visibilidade +
  `addEventListener(MouseEvent.CLICK, ...)` do ícone) nunca é chamado em lugar
  nenhum — nem no `vendor/DDTank41/Source Flash/src/hall/HallStateView.as:1512`
  original, nem no gerado. Cliquei no ícone (visível, hit-test ok) e nada abre;
  é o esperado, o 4.1 nunca ligou esse botão (`LotteryContorller`/
  `CardLotteryContorller` ficam inacessíveis por essa via). Não mexi — fiel ao
  original. Se existir outro caminho de entrada pra loteria (`StateType.LOTTERY_HALL`/`LOTTERY_CARD`),
  não achei nesta sessão.
- **Chefe mundial**: ícone (`HallStateView.setWorldBossIcon()`, instanciado
  dinamicamente como `assets.hallIcon.worldBossEntrance_<id>`, não tem `name`
  fixo pra achar com `ddtDebug.find()`) não apareceu na varredura por classe
  feita nesta sessão (`ddtDebug.stage` procurando `worldBossEntrance` no
  `$fqn`) apesar do evento "worldboss #1"/"#2" estar ativo no log do
  `apps/game` no momento do teste — não investigado a fundo (pode ser que
  `setWorldBossIcon()` só rode depois de algum pacote específico que esse
  teste não chegou a receber). Não testado.
- **Totem, pets/mascote (além da aba "Thú cưng" da Bolsa, já OK), minigames**:
  não achei o ponto de entrada pelo hall nesta sessão (não é um dos 12 ícones
  de prédio nem `lottery_mc`/ícone de evento já mapeados) — não testado.
- Não existe tela de "guerra de sociedade" (GvG) no cliente 4.1: não há nenhuma
  classe `*War*`/`*GVG*` em `src/game` — é recurso só do servidor/versões
  posteriores (handler `apps/game/src/handlers/sociedade/guerra-gvg.ts`). Nada
  a testar no cliente até existir tela AS3 correspondente.
- `typecheck` (`pnpm typecheck`): 119 erros heterogêneos em `apps/client/src/game`
  (ver achados da sessão 2026-10-26 acima pro que já foi corrigido — era
  763 no início desta sessão). `@ddt/flash` typecheca limpo. Não bloqueia a
  execução (o jogo roda via Vite/esbuild sem checar tipos), mas fica como
  dívida técnica.
- `GET /flash/weekly/weeklyinfo.xml` sempre 404 (visto em toda sessão de
  smoke) — não investigado a fundo; não impediu nenhum fluxo testado.
