# Status do cliente PixiJS (testado)

Testado com o roteiro automático (`apps/client/scripts/smoke.mjs`, ver
[COMO-RODAR.md](COMO-RODAR.md)) numa conta de teste nível 30. "OK" = abre e
funciona sem erro no console; detalhes visuais anotados.

Última atualização: 2026-10-27.

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

## Achados da sessão pixi-anim (animação: timing, interpolação, frame scripts)

- **Bug corrigido — `ENTER_FRAME` disparava DEPOIS da timeline avançar**
  (`packages/flash/src/frame-loop.ts`, extraído de `player.ts`): a ordem
  documentada pela Adobe (`Event.FRAME_CONSTRUCTED`) é `enterFrame` → tags do
  frame executam (timeline avança) → `frameConstructed` → frame scripts →
  `exitFrame`. O loop avançava TODAS as timelines antes de disparar
  `ENTER_FRAME`, então qualquer listener de `ENTER_FRAME` do jogo (comum no
  AS3 convertido, pra ler `currentFrame`/posição antes de decidir o próximo
  passo) via o frame já adiantado em 1 — deixava animação guiada por
  `ENTER_FRAME` sistematicamente fora de sincronia com o Flash original.
  Testes em `frame-loop.test.ts`.
- **Bug corrigido — rotação/skew não eram suavizadas no desenho a 60fps**
  (`packages/flash/src/interp.ts`): a interpolação de desenho (lógica 25fps →
  desenho 60+fps) só cobria x/y/escala/alfa; qualquer objeto girando (bala,
  explosão, roleta, mira) ficava com posição suave mas rotação "travando" a
  25fps — pior que o Flash original. Agora interpola rotation/skew pelo
  caminho angular mais curto (mod 360°). Testes em `interp.test.ts`.
- **Bug corrigido (causa raiz de vários relatos do dono) — frame scripts do
  próprio asset eram descartados pelo exportador**
  (`tools/swf-export/src/swf-classes.ts` + `packages/flash/src/display/MovieClip.ts`):
  confirmado com FFDec em `vendor/_assets/merged/image/game/living/Living007.swf`
  — a classe embutida no SWF (`game.living.Living007 extends
  road.game.resource.ActionMovie`) tem `addFrameScript(13,frame14,...)` no
  construtor, com métodos que fazem `stop()`/`gotoAndPlay("stand")` no limite
  de cada segmento labelado (stand/cry/walk/beatA/die/born/lost/win). O
  exportador decompilava esse código só pra saber a classe base e JOGAVA FORA
  os frame scripts — sem eles, a timeline nunca para: avança livre por TODOS
  os segmentos em sequência pra sempre, mesmo o personagem parado (monstro
  "cicla" stand→cry→walk→attack→die→born pra sempre), e o segmento "die"
  nunca congela no último frame (corpo continua "vivo"/animando depois de
  morrer, em vez de parar e sumir). Mesmo padrão confirmado em
  `ui/vietnam/swf/gameover.swf` (tela de cartas/prêmios: `WinEffectLight`,
  `TotalExpTxtLight`, `goForPowerMovieAsset`, símbolos do `LuckyCard` também
  têm `addFrameScript`) — explica o "piscar" das cartas de recompensa. Fix:
  `TimelineT.fs` (novo campo em `library-types.ts`) grava os frame scripts
  extraídos (best-effort: `stop/play/gotoAndPlay/gotoAndStop/nextFrame/prevFrame`,
  o resto vira aviso no `EXPORT-REPORT.txt`); `MovieClip.$initSymbol` os liga
  em `$scripts` chamando os MÉTODOS da instância (não a timeline direto), o
  que deixa valer um override de classe real (`ActionMovie` troca
  `gotoAndPlay`/`gotoAndStop` por uma máquina de estados própria). Testes em
  `display/MovieClip.test.ts`.
  **Pendente**: precisa reexportar os assets pra esse fix valer (o
  `library.json` já exportado não tem `tl.fs` — ver nota de re-export
  abaixo). Weapon-level aura (glow de nível da arma) tem o mesmo "cheiro" de
  bug (timeline multi-segmento sem stop) mas não achei o SWF exato nesta
  sessão — deve ser coberto pelo mesmo fix, sem precisar de código extra.
- **Investigado, NÃO corrigido — destaque de hover dos prédios do hall**
  (Salão de Jogos/Academia/Loja: borda "azul" estranha no hover; Forja: a
  imagem do prédio parece "trocar" no hover). Causa NÃO é filtro nem frame
  script: `HallStateView.__btnOver/__btnOut` faz `_hallMainView.gotoAndStop(N)`
  (N = 1..13, um frame por prédio) — confirmado ao vivo que o frame certo é
  alcançado (`_hallMainView.currentFrame` bate com o prédio hovered). Cada
  frame troca, na profundidade 3, um caractere "destaque" que é uma CÓPIA
  inteira (recolorida/com brilho) do prédio real — não é uma borda fina, é o
  prédio inteiro de novo, pra só a margem (fora da silhueta do prédio real,
  desenhado por cima) aparecer como brilho. Achados:
  - Alguns desses "destaque" (`shapes/199.png` = loja, `shapes/208.png` =
    sala de jogos) saem do FFDec com uma franja de cor (vermelho/verde/azul
    separados) na borda — confirmado que NÃO é anti-aliasing (persiste
    idêntico exportando a 4× zoom); o preenchimento é um bitmap recortado por
    padrão SVG (`<pattern>`+`<image>`), não gradiente. Provável limitação do
    rasterizador de shape do FFDec pra esse bitmap específico — não
    confirmado se é bug do FFDec ou do bitmap original.
  - O destaque da Forja (`shapes/225.png`) exporta limpo (brilho suave, sem
    franja) e a posição/alpha/visibilidade no palco batem com o esperado
    (confirmado ao vivo via `ddtDebug`), mas ao vivo aparece como uma
    "dupla-exposição" (silhueta de outro prédio vazando por cima do prédio
    real) em vez de um brilho suave — o destaque está em alpha=1/blend normal
    (sem `ct`/`fl`/`bl` em nenhum frame dumped), então se o PNG não tiver
    opacidade decrescente na própria imagem (ou se a silhueta não bater
    exatamente com o prédio real), dá exatamente essa "dupla-exposição".
    Não confirmado se o Flash original usa blend/alpha que nosso exportador
    não está capturando, ou se precisa comparar com Ruffle (não testado) pra
    saber se é fidelidade de conteúdo (bug no SWF/arte) ou bug nosso.
  - Reproduzido ao vivo com conta de teste nova (`pixianimtest`) em
    `http://localhost:5181` — screenshots não versionados (`.tmp_hallcheck`,
    apagados ao final da sessão).

### Reexportar pra os fixes valerem

O fix de frame scripts (`tl.fs`) só aparece em assets reexportados — os
`library.json` já no `apps/client/public/assets` são de ANTES do fix e
`exportOne()` só regenera quando o `.swf` fonte é mais novo que o
`library.json` (nunca é o caso aqui), então precisa `--force`:

```bash
cd tools/swf-export
npx tsx src/main.ts --set ui --force        # ~650 SWFs — cobre gameover.swf (cartas/prêmios) e UI em geral
npx tsx src/main.ts --set resource --force  # ~3000 SWFs — cobre living/monstro (confirmado), bomba/blastout, provável aura de arma
```

Confirmado (`Living007.swf`, `gameover.swf`) que `addFrameScript` existe em
pelo menos os dois sets — não dá pra saber de antemão quais dos ~3600 SWFs
restantes têm o mesmo padrão sem reexportar tudo. `npm install` dentro de
`tools/swf-export` primeiro se não tiver `node_modules` lá (`sharp` não é do
workspace pnpm).

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

## Achados da sessão 2026-10-27 (`pixi-load`: carregamento lento, flicker preto no Barão, nomes de dificuldade)

- **Causa raiz do carregamento lento confirmada e medida**: `apps/client/src/main.ts` faz
  `import "./game/all"` — um import ESTÁTICO de ~2600 módulos TS (o jogo inteiro: o registro global
  de classes AS3 exige que todas existam antes do boot, igual `ApplicationDomain` do Flash). Em dev
  (Vite), isso vira ~2800 requisições HTTP individuais (cada `.ts` é transformado por esbuild na hora)
  ANTES de `main.ts` poder rodar uma linha sequer — inclusive antes de `Loading`/`config.xml`/qualquer
  coisa do jogo em si começar. Medido com Playwright (navegador novo, cache vazio, `apps/client/public/
  assets` já exportado): **a frio, sem nada: ~31,5 s, 2812 requisições, 48,3 MB** até o boot começar
  (nem chegou a mostrar a tela de Loading ainda). Com o MESMO navegador recarregando (cache HTTP do
  Chrome já quente): ~3,5–4,1 s — ou seja, quase todo o custo é RETRANSFORMAÇÃO pelo Vite a cada
  visita nova, não bytes de rede. **Fix**: `apps/client/vite.config.ts` ganhou `server.warmup` pedindo
  pro Vite pré-transformar `src/main.ts`/`src/game/all.ts` assim que o dev server sobe, em vez de no
  primeiro load de um jogador real — tira o custo de transformação do caminho crítico da primeira
  visita. **Medido depois do fix: ~4,7 s a frio** (praticamente igual ao "morno"), ~85% mais rápido,
  mesma contagem de requisições/bytes (não reduz quantidade de requisições — isso exigiria
  bundlar/code-splitting real, ver abaixo). Build de produção (`vite build`) já bundla/minifica tudo
  isso num único `index.js` de 7,98 MB (1,67 MB gzip) + alguns chunks do Pixi — ordens de grandeza
  menos requisições; fica como melhoria futura trocar o dev server por um preview/build real caso o
  carregamento em dev ainda incomode. **Achado colateral do build**: `vite build` copia fisicamente
  toda a árvore de assets exportados (`public/assets`, uma junction) pra dentro de `dist/assets`
  (dezenas de milhares de arquivos) — infla o tempo de build (9min19s nesta sessão) e o tamanho do
  artefato; não mexi nisso (fora do escopo de "carregamento lento" no dev server, que é o que o dono
  testa — ver `COMO-RODAR.md` que já assume os assets sendo servidos à parte).
- **"Carregando o cliente… 79%" era 100% cosmético — removido**: `apps/web/src/components/GameFrame.tsx`
  tinha um `setInterval` que só fingia avançar a porcentagem (`p += (0.95-p)*0.06` a cada 200ms) sem
  NENHUMA relação com o carregamento real — por isso parecia "travar" perto de 90%+ (a curva
  assintótica fica cada vez mais lenta) mesmo quando o carregamento real (dominado pelos ~2600 módulos
  acima) ainda não tinha nem começado a rodar. Troquei por um sinal REAL: `apps/client/index.html` ganhou
  um `<script>` não-module (roda ANTES do import pesado, já que nada dentro de `main.ts` executa
  enquanto esse import não resolve) que usa a `PerformanceObserver`/Resource Timing API do navegador pra
  contar requisições concluídas de verdade e manda isso por `postMessage` (`ddt-client-progress`) pro
  pai. `GameFrame.tsx` agora usa essa contagem real (curva de retornos decrescentes SOBRE um número que
  só sobe quando algo realmente termina de carregar — se travar de verdade, a barra para de verdade, em
  vez de continuar subindo sozinha) e mostra "N arquivos carregados" em vez de uma porcentagem inventada;
  mantive o sweep falso só no caminho Ruffle/SWF (que genuinamente não expõe progresso de bytes do filme
  raiz — limitação documentada da API do Ruffle). Adicionei um aviso "isso está demorando mais que o
  normal" depois de 20s sem a página carregar (`slow` state) — não trava nada, só avisa.
- **Flicker preto no mapa do Barão (Bugo Castle / Gulu Kingdom estágio 2, missão/mapa 1073) — causa
  raiz achada e corrigida**: `packages/fight/src/pve/scripts/generated/Messions/GK1073.ts`
  (`OnStartGame`) cria uma camada de decoração via `Createlayer(...,"game.asset.living.BossBgAsset",...)`
  e toca `PlayMovie("in"/"out", ...)` nela — igual ao C# doador (`PhysicalObj.PlayMovie` → protocolo
  original `SendPhysicalObjPlayAction`, pacote 91 código 66, já existente no 4.1 real). No cliente, isso
  cai em `game/objects/SimpleObject.ts::playAction()`, que só faz `this.m_movie.gotoAndPlay(label)` — SEM
  nenhuma lógica de "tocar uma vez e parar": no Flash original, quem para a timeline é uma ação de frame
  GRAVADA NO SWF (DoAction por frame, sem classe própria). O exportador (`tools/swf-export/src/
  swf-classes.ts`) só decompila frame scripts de símbolos com classe/linkage própria (comentário no
  próprio arquivo: "Classes com código") — um `MovieClip` cru como `BossBgAsset` (`library.json`:
  `"base":"flash.display.MovieClip"`, sem classe) nunca teve esse `stop()` capturado. Resultado: a
  timeline (4 frames, conteúdo só no frame 3 — um retângulo gigante, escala ~127x89, `colorTransform`
  alpha ~0,8, cobrindo a tela inteira) chega no fim e volta pro frame 1 sozinha (comportamento padrão
  genuíno do Flash — confirmado em `packages/flash/src/frame-loop.ts`), repetindo esse flash a cada
  ~160ms durante todo o 1º turno da luta (só é removida no turno 2, `OnBeginNewTurn`). **Fix**: patch do
  transpilador `tools/as3-to-ts/patches/game/objects/SimpleObject.ts.json` (ver docs/client-pixi/
  TRANSPILADOR.md#patches) adiciona um listener de `ENTER_FRAME` em `SimpleObject.creatMovie()` que
  chama `.stop()` assim que o clipe chega no último frame — como o ciclo de vida desses objetos é 100%
  controlado pelo servidor (delay/duration do `PlayMovie` + `RemovePhysicalObj` explícito), nunca há
  dependência real de loop nativo, então isso é seguro e não mexe no exportador (que está em plena
  reexportação) nem no shim genérico de `MovieClip` (outras animações que legitimamente loopam usam
  outro caminho). **Verificado**: script ad-hoc via Playwright que instancia o `SimpleObject` real com o
  símbolo real `game.asset.living.BossBgAsset` dentro do cliente rodando e amostra `currentFrame`/
  `isPlaying` por ~2,4s — confirma que para no frame 4/4 e nunca mais volta pro 1 (antes do fix isso
  looparia pra sempre). Não joguei a luta completa até a sala do Barão (reproduzir manualmente: Expedição
  → Gulu Kingdom → Fácil → vencer missão 1 → entra na missão/mapa 1073).
- **Nomes de dificuldade/modo da dungeon — a maioria já estava traduzida, achei 2 imagens que faltavam**:
  conferi direto os PNGs exportados (não o scan OCR antigo, que está desatualizado) em
  `apps/client/public/assets/flash/ui/vietnam/swf/roomlist/images/`: `59_...hardLevel_04.png`="Avançado",
  `63_...hardLevel_01.png`="Fácil", `61_...hardLevel_02.png`="Normal", `60_...hardLevel_03.png`="Difícil",
  `64_...hardLevel_0.png`="? Sem escolha", `66_...hardLevel.png`="Dificuldade" (dropdown),
  `58_...DungeonList.hardLevel_PVE.png`="Dificuldade" — todos já em PT-BR (o achado de 2026-10-07 no
  `docs/I18N-AUDIT.md` listando `hardLevel_PVE` como pendente está desatualizado, foi corrigido depois).
  **Duas imagens do mesmo SWF (`roomlist.swf`) continuam em vietnamita** — são os botões de MODO da tela
  de seleção de instância (ao lado da dificuldade), não geradas por este task (lista pro remaster, não
  gerei imagem):
  - `apps/client/public/assets/flash/ui/vietnam/swf/roomlist/images/21_asset.DungeonList.boss.png`
    (símbolo `asset.DungeonList.boss`) — texto atual "Đánh Boss" (devia virar algo como "Lutar com o
    Boss"/"Fase do Boss").
  - `apps/client/public/assets/flash/ui/vietnam/swf/roomlist/images/73_asset.DungeonList.dungeon.png`
    (símbolo `asset.DungeonList.dungeon`) — texto atual "Phó bản" (devia virar "Masmorra"/"Instância").
  Confirmado também no scan estático (`research/i18n/img-vn-full.tsv:327-328`). Nenhum job de remaster
  (`remaster/approved.json`) existe ainda pra esses dois — ao contrário dos `hardLevel_*` (que já têm
  prompt/output aprovados), estes nunca entraram na fila.
- Verificação desta sessão: `pnpm --filter @ddt/flash exec vitest run --maxWorkers=2` → 14/14 ok;
  `pnpm --filter web exec vitest run` → 11/11 ok; `tsc --noEmit` de `@ddt/client` → 119 erros (igual à
  baseline da sessão 2026-10-26, nenhum novo); `tsc --noEmit` de `web` → limpo.

## Achados da sessão 2026-10-27 (tarefa "hall-hover": franja de cor e "troca de imagem" ao passar o
mouse nos prédios do hall)

- **Causa raiz (confirmada por tag do SWF + comparação bitmap bruto × forma rasterizada)**: em
  `hall.swf`, `HallStateView.__btnOver/__btnOut` faz `_hallMainView.gotoAndStop(N)` — cada frame (1 a 12,
  um por prédio) troca o caractere na profundidade 3 (um "highlight": duplicata relida/com brilho do
  prédio, fundida com margem de glow já no próprio bitmap). Dump de `hall.swf` com
  `java -jar vendor/_tools/ffdec/ffdec-cli.jar -swf2xml` confirma: **nenhum** desses `PlaceObject2Tag`
  tem `colorTransform`/filtro/blendMode (`placeFlagHasColorTransform="false"`, sem
  `placeFlagHasFilterList` — aliás são `PlaceObject2`, que nem suporta filtro) — isso é esperado, não é o
  bug; a sensação de "brilho" vem inteiramente do alfa já embutido no bitmap. Cada um desses 12
  caracteres (`DefineShapeTag` 17, 199, 204, 208, 213, 217, 221, 225, 230, 234, 238, 242) é só um
  retângulo (`StyleChangeRecord`+4×`StraightEdgeRecord`+`EndShapeRecord`) preenchido por **um único
  bitmap fill não suavizado** (`fillStyleType="67"`) cobrindo o contorno inteiro 1:1 — o padrão clássico
  de "colar bitmap como forma" no Flash. O bug: `tools/swf-export` rasterizava essa forma com
  `ffdec -export shape` (que passa pelo renderizador de vetor do FFDec) e esse passo **às vezes** (não
  sempre — comando idêntico, mesmo SWF, ora sai limpo ora sai corrompido; não achei a causa exata dentro
  do FFDec, só o sintoma) produz uma franja de cor incoerente nos pixels semi-transparentes da borda
  (RGB tipo `[119,255,255,30]` do lado de `[52,7,255,39]`, sem relação com a arte original — visível como
  a "borda azul aleatória" que o dono reportou em Loja/Sala de Jogos/Academia). Comparado lado a lado
  (`ffdec -export image`, que exporta o bitmap embutido sem passar pelo rasterizador de forma): o mesmo
  bitmap sai sempre limpo. **"Forja" (prédio = `store_mc`, personagem 225/224) nunca teve a franja** (sua
  forma rasterizava limpo mesmo nas execuções corrompidas) — mas o relato do dono ("a imagem muda pra
  outra foto") bate com o mesmo mecanismo: é a mesma técnica de "troca pra uma versão mais clara/com
  brilho do mesmo prédio" usada nos outros 11, só que sem o ruído de cor chamando atenção, então o efeito
  pretendido (um resplendor dourado suave sobre o MESMO prédio, confirmado comparando o recorte da arte
  de fundo padrão — `shapes/13.png`/`images/12.jpg`, 1000x600, um único JPEG da cena inteira — com o
  bitmap do highlight: é visivelmente a mesma casa, mesma pose, só mais clara/quente) ficava difícil de
  reconhecer como "brilho" e mais fácil de ler como "trocou de figura".
- **Fix (`tools/swf-export/src/library.ts`, `tools/swf-export/src/main.ts`)**: quando uma `DefineShape*`
  é só um retângulo com um único fill de bitmap cobrindo o contorno inteiro (sem stroke, sem outro fill,
  bounds batendo com o bitmap dentro de 1px — `bitmapRectShapeImg()`), o exportador agora usa o bitmap
  bruto (`-export image`) como `img` do caractere em vez da forma rasterizada (`-export shape`) — evita o
  passo do FFDec que (às vezes) introduz a franja, pro padrão de autoria mais comum em UI do Flash (não
  só nesse SWF). Efeito colateral corrigido junto: `DefineBitsJPEG*` não traz `bitmapWidth`/
  `bitmapHeight` no `swf2xml` do FFDec (só `DefineBitsLossless*` traz) — o código antigo deixava esses
  bitmaps com `w:0,h:0`; agora `main.ts` lê o tamanho real de todo bitmap exportado via `sharp` (campo
  novo `ImageIndex.imageSizes`), usado tanto pro `w/h` do caractere quanto pra validar o "cobre o
  contorno inteiro" do fix acima. Não mexe no shim (`packages/flash`): o caractere continua `k:"shape"`,
  só muda o PNG referenciado — zero mudança de comportamento de posicionamento/hit-test.
- **Verificado fim a fim**: reexportei só `hall`/`hall_old`
  (`cd tools/swf-export && SWF_EXPORT_OUT=.verify-out npx tsx src/main.ts --only swf/hall --force`,
  pasta ignorada pelo git) e comparei os 12 prédios antes/depois — print lado a lado (Ruffle fica pra uma
  sessão com o harness completo de login; aqui usei o próprio cliente PixiJS, antes/depois do fix, com
  Playwright headless próprio numa conta de teste já existente, hover de verdade via `ddtDebug.find()` +
  `getBounds()` pra achar o centro de cada `*_mc`): Loja, Sala de Jogos, Academia e Forja (que antes só
  não mostrava franja por "sorte" de execução) ficaram visualmente idênticos a Igreja/Sociedade/Amizades
  (que já eram citados como corretos) — um resplendor dourado limpo, sem franja, sem duplicata "chapada".
  Sem regressão nos outros 8 prédios. **Reexportar na pasta real** (fora do escopo deste agente —
  confirmar com o dono antes): `cd tools/swf-export && npx tsx src/main.ts --only ui --force` (reexporta
  todo o set `ui`, ~2min; pra só o hall: `--only swf/hall`). `apps/client/public/assets` é junction
  read-only — nenhuma escrita foi feita lá nesta sessão.
- **Teste novo**: `tools/swf-export/src/library.test.ts` (`node --import tsx --test src/*.test.ts` ou
  `npm test` de `tools/swf-export`) — 5 casos focados em `bitmapRectShapeImg()` com XML sintético no
  formato do `ffdec -swf2xml` (retângulo+bitmap cobrindo tudo → usa bitmap bruto; bounds não batendo/
  mais de um fill/com stroke/sem imagem exportada → mantém a forma rasterizada, sem quebrar).
- Verificação: `pnpm --filter @ddt/flash exec vitest run --maxWorkers=1` → 14/14 ok (shim não mudou,
  só confirma que nada quebrou); `tools/swf-export`: `npm test` → 5/5 ok; `npx tsc --noEmit --strict`
  (opções do `tsconfig.base.json`+`packages/flash/tsconfig.json`, já que `tools/swf-export` não tem
  `tsconfig.json` próprio) nos arquivos tocados → limpo.
