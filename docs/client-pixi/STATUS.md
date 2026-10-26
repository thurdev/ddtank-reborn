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
  minigames, loteria, mascote, cartas, totem continuam sem teste de UI (não
  deu tempo nesta sessão depois da varredura do hall).
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
