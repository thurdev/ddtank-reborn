# Status do cliente PixiJS (testado)

Testado com o roteiro automático (`apps/client/scripts/smoke.mjs`, ver
[COMO-RODAR.md](COMO-RODAR.md)) numa conta de teste nível 30. "OK" = abre e
funciona sem erro no console; detalhes visuais anotados.

Última atualização: 2026-10-24.

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

## Pendências conhecidas

- **Arte com texto em vietnamita** (botão "Bắt đầu", abas, nomes das
  instâncias): são imagens. Agora é só editar o PNG em
  `apps/client/public/assets/...` (ver [ASSETS.md](ASSETS.md)).
- **Textos do servidor em VN** (descrição das instâncias, nomes de mapa):
  vêm do banco/XML do `apps/api`, não do cliente.
- Fonte padrão serifada quando o XML de layout não diz a fonte: é o mesmo
  comportamento do Flash (Times New Roman).
- Ainda não testados a fundo: batalha até a vitória (tela de cartas/prêmios —
  bloqueado nesta sessão pela reexportação incompleta do set `resource`, ver
  achados acima), sociedade/guerra de sociedade, chefe mundial, minigames,
  loteria, mascote, cartas, totem.
- Não existe tela de "guerra de sociedade" (GvG) no cliente 4.1: não há nenhuma
  classe `*War*`/`*GVG*` em `src/game` — é recurso só do servidor/versões
  posteriores (handler `apps/game/src/handlers/sociedade/guerra-gvg.ts`). Nada
  a testar no cliente até existir tela AS3 correspondente.
- `typecheck` (`pnpm typecheck`) tem ~140 erros pré-existentes em `apps/client/src/game`
  (não introduzidos nesta sessão), sobretudo getters de `Date` ao estilo AS3
  (`.fullYear`/`.month`/`.date`/`.minutes`...) que não existem no `Date` do JS,
  e alguns `XMLList`/`any[]` mal tipados. `@ddt/flash` typecheca limpo. Não
  bloqueia a execução (o jogo roda via Vite/esbuild sem checar tipos), mas fica
  como dívida técnica — ver se vale um `Date` shim AS3-compatível antes do
  congelamento.
- `GET /flash/weekly/weeklyinfo.xml` sempre 404 (visto em toda sessão de
  smoke) — não investigado a fundo; não impediu nenhum fluxo testado.
