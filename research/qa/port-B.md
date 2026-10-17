# Bloco B — Progressão (TOTEM / HONOR_UP / AVATAR_COLLECTION / cartas / loteria)

Dono de: `apps/game/src/handlers/progression.ts`, `apps/game/src/game/cards.ts`, `apps/game/src/db/avatar-collection.ts`
+ `apps/game/test/progression.test.ts` (novo) e a seção "Progressão gravada pelo protocolo" de
`apps/game/test/persist-all.test.ts` (compartilhado com o bloco Persistência — só acrescentei testes, não toquei
no resto do arquivo).

## Estado ao retomar

Os três arquivos principais (`progression.ts`, `avatar-collection.ts`, `cards.ts`) já existiam de uma passada
anterior, completos e registrados em `handlers/index.ts`. `node tools/qa/packet-coverage.mjs` confirma: nenhum dos
códigos deste bloco aparece em MISSING nem em STUB "de verdade" (136 TOTEM, 96 HONOR_UP_COUNT, 402 AVATAR_COLLECTION,
18 GET_PLAYER_CARD não aparecem na lista; 104/105/239/11 aparecem como STUB só porque foram registrados
`"stub"` de propósito — ver seção abaixo). O que faltava era **teste** (só havia 1 `it()` de TOTEM) e este arquivo.

## O que foi adicionado nesta passada

- `apps/game/test/progression.test.ts` (novo, 8 testes): 18 GET_PLAYER_CARD (alvo online via `cardBag` em
  memória, alvo offline via `loadPlayerInfo`/`loadUserCardBag`, alvo inexistente = sem resposta, igual ao C#
  original que faz `return` sem mandar pacote quando `playerInfo` é null), 402/4 AVATAR_COLLECTION renew (stub,
  só manda SYS_MESSAGE), e os 4 códigos sem handler C# (239/104/105/11, ver abaixo).
- `apps/game/test/persist-all.test.ts`: 2 testes novos na describe "Progressão gravada pelo protocolo" (que já
  tinha o teste de 136 TOTEM): 96 HONOR_UP_COUNT tipo 2 (persiste MaxBuyHonor/myHonor/Money) e 402/3
  AVATAR_COLLECTION ACTIVE (desconta Gold, grava a linha em `Sys_Users_AvatarCollection`, confere `IsActive` virar
  true quando a 1ª peça de um conjunto de 2 já bate a metade).
- `npx tsc --noEmit -p apps/game`: limpo. Suite completa de `apps/game` (vitest): 30 arquivos / 210 testes, todos
  verdes (inclui os 24 novos deste bloco).

Nenhuma migration nova foi necessária — `Totem_Info`, `Totem_Honor_Template`, `ClothGroupTemplateInfo`,
`ClothPropertyTemplateInfo` e `Sys_Users_AvatarCollection` já existiam no schema. `SAVED_DETAIL_COLUMNS`
(`game/player-info.ts`) já incluía `totemId`, `myHonor`, `MaxBuyHonor`.

## API: XMLs que o cliente carrega pra totem/honra/avatar (StartupResourceLoader.as:1259-1293)

O cliente Flash carrega 4 arquivos estáticos via `PathManager.solveRequestPath("<Nome>.xml")` (texto comprimido,
não é POST em `.ashx` dinâmico por sessão — é o arquivo gerado uma vez e cacheado):

| Arquivo pedido pelo cliente | Tabela | `apps/api/src/templates/defs.ts` |
|---|---|---|
| `TotemInfo.xml` | `Totem_Info` | linha ~560, `flat({ files: [z("toteminfo")], table: "Totem_Info", ... })` |
| `TotemHonorTemplate.xml` | `Totem_Honor_Template` | linha ~489, endpoint `/totemhonortemplate.ashx` |
| `ClothGroupTemplateInfo.xml` | `ClothGroupTemplateInfo` | linha ~547 |
| `ClothPropertyTemplateInfo.xml` | `ClothPropertyTemplateInfo` | linha ~548 |

**Confirmado: os 4 já estão registrados** em `apps/api/src/templates/defs.ts` e são servidos pelo mecanismo
genérico `TemplateCache` + `apps/api/src/routes/request.ts` (o mesmo que serve `ItemInfo.xml` etc.) — nada para
reportar como faltante aqui. `totemhonortemplate.ashx` em si (`vendor/DDTank41/Tank.Request/totemhonortemplate.ashx.cs`)
é só a ferramenta admin que *gera* o XML a partir do banco (`csFunction.ValidAdminIP` — só admin pode chamar); o
cliente nunca bate nesse endpoint, só pede o `.xml` estático, que é exatamente o que `defs.ts`/`request.ts` já
imita.

## CARD_LOTTERY (104) / LUCK_LOTTERY (105) / GOTO_CARD_LOTTERY (239) / ACTIVE_PULLDOWN (11) — sem handler C#

Confirmado por grep em **toda** a árvore `vendor/DDTank41/Game.Server` (nomes de handler + o enum `ePackageType`)
e também em `vendor/DDT-6600` (referência extra pedida pela tarefa): nenhum dos dois servidores jamais teve um
`PacketHandler` registrado para esses 4 códigos. Eles só existem do lado do cliente:

- `Source Flash/src/ddt/manager/GameSocketOut.as:649-654,2031-2054` — monta e manda os 4 pacotes.
- `Source Flash/src/ddt/manager/SocketManager.as:637-680` — lê as respostas (93 CAN_CARD_LOTTERY, 251
  LOTTERY_AWARD, 11 ACTIVE_PULLDOWN) e decide o que a tela de loteria/cartão-platina mostra.
- `Source Flash/src/totem/`, `AvatarCollection/` e as views de `cardSystem`/`lottery` (não há pasta `lottery/`
  separada no 4.1 — a tela de loteria de cartas vive dentro de `ddt.view.friend`/`LotteryContorller`, achado via
  o grep de `SocketManager.as`) mostram a tela, mas não há tabela de prêmios nem de custo no banco de origem (nem
  em `Project_Game34`, nem em `vendor/DDT-6600`'s equivalente) — isto é uma feature que o DDTank41 nunca terminou
  do lado servidor, não uma lacuna da migração.

Decisão tomada (documentada em comentário no topo de `handlers/progression.ts` e nos JSDoc de
`canCardLottery`/`luckLotteryAward`/`activePullDownResult` em `packets/out.ts`): os 4 handlers ficam registrados
como `"stub"` — consomem o pacote do cliente corretamente (byte-exato) e respondem o suficiente pra não travar o
diálogo (`239` sempre libera a tela de escolha de cartas; `104` não cobra nem dá nada, só avisa que está
indisponível; `105` sempre responde "code 3" mensagem, nunca um prêmio de verdade; `11` sempre nega o código de
cartão platina). Nenhuma economia foi inventada. Se o dono quiser uma loteria de cartas de verdade, isso é uma
decisão de design nova (precisa de uma tabela de prêmios/custos) — sugestão: tratar junto do bloco C
(eventos/`ActiveEvents`), já que `ACTIVE_PULLDOWN` também faria mais sentido ali (o código digitado é validado
contra uma tabela de eventos ativos que esse bloco já teria de carregar).

## Bug original preservado de propósito

`OpenOneTotemHandler.cs:49` (136 TOTEM): `if (client.Player.MoneyDirect(...)) ;` — o `;` solto faz o corpo do
`if` rodar sempre, não só quando `MoneyDirect` retorna true. Na prática: o totem sobe e a Honra é gasta mesmo que
o jogador não tenha Money suficiente (só não desconta o Money, mas manda a msg de erro). Reproduzido tal e qual em
`totemOpenOne` (`progression.ts:60-82`), com o comentário grande explicando o porquê. Teste de persistência (136
em `persist-all.test.ts`) cobre o caminho feliz (Money e Honra suficientes); não escrevi um teste separado pro
caminho do bug porque ele já está documentado inline e o dono pode decidir corrigi-lo a qualquer momento trocando
uma linha (indicada no comentário).
