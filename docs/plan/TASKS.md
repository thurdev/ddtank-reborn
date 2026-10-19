# Tarefas — fila de trabalho (ordem do dono, 2026-10-17)

> Ordem: **1. Migração 6600 → 2. Canais → 3. Pix (doação) → 4. Site + admin premium.**
> Cada tarefa é pequena, tem branch própria (`feature/<id>`), critério de pronto e vira PR pra `develop`.
> Até 2 agentes em paralelo, cada um na sua branch/worktree. Status: `[ ]` fila, `[~]` andando, `[x]` feito.
> Plano detalhado da migração: [MIGRACAO-6600.md](./MIGRACAO-6600.md).

## 1. Migração 6600

### M1 — cliente 6600 até o lobby
- [x] **m1-serve** — servir o pack 6600 em `/flash6600/` em paralelo (4.1 continua padrão), `?client=6600` na
  página `/play`, `config.xml` reescrito, fallback de `/request/*.xml` pro snapshot do vendor.
  Resultado: login + criar personagem funcionam; carregamento trava em 6/13.
- [x] **m1-xml-compat** — ferramenta `tools/qa/xml-diff-6600.mjs` (nosso XML × snapshot 6600, só o que o
  analisador AS3 lê) + completar geradores (`QuestList` `<Rate>`, `TemplateAllList`, `ShopItemList`…).
  Pronto quando: carregamento passa de 13/13 sem erro AVM2; testes da API verdes.
- [x] **m1-lang-ptbr** — `language.txt` PT-BR pro pack 6600 (`tools/i18n/lang-6600.mjs`): reaproveita as chaves
  iguais da 4.1, traduz as novas, troca a marca "Bombom". Pronto quando: 0 chaves em turco.
- [x] **m1-socket** — cliente identificado no login (Login.ashx → LoginSessions.Client), layouts 6600 dos pacotes do burst de login/hall (LOGIN, 38, 67, 64 GRID_GOODS, 142 KING_BLESS, 216 CARDS, 178 QUEST, 259, 102, 137), API zlib por cliente. **Lobby 6600 abre** (2026-10-18). Ver `research/6600/packets-m1.md`.
- [ ] **m1-stage** — lobby 6600 ocupa a moldura certinho; só a tela de criar personagem sai menor (barra preta à direita/embaixo). Baixa prioridade.
- [x] **m1-pacotes-acao** — 74 ITEM_EQUIP, 18 SCENE_ADD_USER, 94/4 sala, 160 amigo, colisão 121; broadcasts montados por tipo de cliente de quem recebe (`research/6600/packets-m1.md` Round 3). Falta: sistema de runas/BEAD_HOLE_INFO (não portado), resto da sociedade.
- [~] **m1-bitmap-text** — rodada 1 feita (2026-10-18): 146 imagens importadas no overlay 6600 (106 reuso 4.1 + Seedream 4.5 + render local `icon-caption --in/--out/--text` / `title-text --manifest`). Rodada 2 feita (2026-10-18, branch `feature/m1-bitmap-r2`): 22 imagens novas, todas render local (sem IA) —
  8 placas do salão em `ddthallmain.swf` (bitmap puro, 0 `DefineText` nesse swf — achado varrendo manualmente,
  não pelo OCR da rodada 1): "Oyun Salonu"→Salão de Jogos, "Birlik kulübü"→Clube da Sociedade, "Demirci
  Atölyesi"→Forja, "Açık Artırma Alanı"→Casa de Leilões, "Keşif Rıhtımı"→Cais de Exploração, "savaşçının gizli
  yeri"→esconderijo do guerreiro, "Çiftlik"→Fazenda, "Ring Savaşı"→Batalha no Ringue (as 3 com ícone colado no
  bitmap usam `tools/remaster/hallsign-icon-text.mjs`, que recorta ícone/texto, só redesenha o texto e
  recompõe — ícone intocado); 8 abas/legendas da janela `dayactivity.swf` que a rodada 1 não pegou
  (`tools/remaster/badge-text.mjs`, novo — placa com fundo sólido, detecta a cor por moda de pixel opaco,
  apaga só o texto e redesenha, pro caso "ícone redondo"/"tira fina transparente" dos scripts existentes não
  servir); os 6 rejeitados da IA da rodada 1 (`tools/remaster/prompts/win45-6600/*.txt.local`, agora deletados):
  "Buraya tıkla"→Clique aqui, "Tıklayarak işleme devam edin"→Clique para continuar, "Başarısız" (2ª ocorrência,
  gameiii chid 225)→Falhou, e as 3 instruções do gameover (sobrevivência/pontuação/caixa de cupons) — multi-linha
  via `tools/remaster/title-text-ml.mjs` (novo, variante do title-text.mjs com `\n`). **Savaşma Gücü/VIP
  aç/abas de missão (Ana/Ek/Günlük/Etkinlik)/"...altın" do painel já estavam certos**: são chaves de
  `language.txt` (`tank.menu.FightPower`, `tank.memberList.fightPowerText.text`,
  `CryptBossMainFrame.NOvipNumberTxtLG`, `tank.view.quest.bubble.{TankLink,BranchLine,Daily,Act}`) já traduzidas
  e confirmadas no zip servido (`apps/api/assets/flash6600/ui/turkey/language.png`) — o print do dono que gerou
  a tarefa é de antes do `m1-lang-ptbr`/`m1-swf-text` fecharem no mesmo dia; nada a fazer aqui. OCR estendido pro
  P2 (`node tools/remaster/ocr-turkish-6600.mjs --sample=4`, precisa `tur.traineddata` baixado em
  `tools/remaster/_lang/`, não versionado): 2957 imagens escaneadas, 705 com turco
  (P0 350, P1 92, P2 263 novos) em `research/6600/bitmap-turkish.tsv` — P2 só catalogado, não corrigido
  (fora do escopo desta rodada; destaques: `chatii.swf`/`chatball.swf`/`churchroom.swf` com falas de casamento
  e chat, `chickactivation.swf`). Sheet antes/depois: `research/6600/bitmap-r2-review.jpg`.
- [x] **m1-loading-brand** — tela de carregamento/logo sem "Bombom"/"DEVELOP BY ASUNA" (overlay de imagem em
  `apps/api/assets/flash6600`), logo DDTank Reborn.
- [x] **m1-swf-text** — textos estáticos (DefineText/DefineEditText) em turco dentro dos SWFs de UI do 6600
  (`ui/turkey/swf/*.swf` + SWFs da raiz do pack) traduzidos pra PT-BR, reaproveitando o pipeline
  `tools/qa/swf-text-audit.sh` + `tools/qa/swf-text-merge.mjs` + `runSwfTextStep` do 4.1 (ver `docs/I18N-AUDIT.md`).
  Pronto quando: 0 textos estáticos em turco nos SWFs servidos (fora bitmap, catalogado no relatório).
- [ ] **m1-bitmap-semitrans** — 7 imagens semitransparentes/finas que o Seedream estraga (fundo verde vaza no vidro/prata; tiras finas quebram em 2 linhas): abas selecionadas da atividade diária, "Clique aqui", "Clique para continuar", 2º "Falhou", "Status do evento". Prompts em `tools/remaster/prompts/win45-6600/*.txt.semitrans`; testar upload com fundo neutro (cinza médio) em vez de verde ou render local com borda/brilho copiados do original.
- [ ] **m1-brand-polish** — `ui/turkey/swf/loading.swf` (chid 18 e 34): sobra um fantasma do "Bombom II" atrás do logo; refazer o fundo com inpaint (IA unlimited ou local) em vez de blur. Ver `research/6600/brand-review.jpg`.
- [ ] **m1-ruffle-report** — refazer `research/client/02-ruffle-report.md` pro 6600 (o que quebra no Ruffle).
- [x] **m1-regressao** — 4.1 em `/play` abre o lobby HD PT-BR normal depois de todo o M1 (2026-10-18). Pendente antigo: `/flash/weekly/weeklyinfo.xml` 404.
- [x] **m1-schema** (migration 0013, 48 tabelas + 51 colunas, seed de 23 tabelas) — tabelas novas do 6600 (Montaria, Treino, Casa Mágica, RingStation, Tesouro, Relíquias,
  Dados…) em Drizzle + migration incremental (`research/6600/db-diff.md`); colunas novas nas tabelas existentes.

### M2 — loop central no 6600
- [x] **m2-newhall** (P0, bloqueia ir pras salas no navegador) — causa raiz confirmada: `_sceneScene`/
  **Testado ao vivo 2026-10-18:** hall → Salão de Jogos → criar sala → partida contra bot no 6600 (tiros, turnos, vento), sem erro de cliente.
  `_selfPlayer` só nascem dentro do handler do `262/0 PLAYERINFO` (`HallPlayerView.__onFriendPlayerInfo`),
  que nunca disparava sem o servidor responder; `setSelfPlayerPos` acessa `_sceneScene` (null) ->
  `TypeError #1009`. Portado `262 NEW_HALL` inteiro (`game/new-hall.ts` `NewHallRoom`, registro global —
  igual ao `WorldMgr.NewHallRooms` estático do C#): 0 PLAYERINFO (spawn 1560/500, `GamePlayer.cs`
  ctor:1926-1927), 1 OTHERPLAYERINFO, 2 PLAYEREXIT, 3 PLAYERMOVE, 4 ADDPLAYE, 5 MODIFYDRESS, 7 PLAYERHID,
  8 PLAYERSHOW, 9 UPDATEPETS nos dois sentidos. 6/10/99 confirmados mortos no C# original (não portados).
  GAP do original (não desta tarefa): `HideAllFriend` default `true` em todo login — ninguém se vê até
  clicar o olho. Ver `research/6600/packets-m1.md` "M2 newhall".
- [x] **m2-bolsa** — bolsa/equipar/vestir + família MARRY_* pro 6600. Colisão de código 237
  (`MARRYINFO_UPDATE` 4.1 vs `PLAYER_DRESS` 6600) resolvida por `clientKind` sem corromper o mural;
  `PLAYER_DRESS` (figurino, feature nova sem equivalente 4.1) documentado como gap pra M3. 119
  `LINKREQUEST_GOODS`, 63 `ITEM_OPENUP` e 99 `TEXP` corrigidos (dano mágico por item / request com `count`
  novo). Achado um bug real pré-existente (não só do 6600): broadcast de 67 `UPDATE_PLAYER_INFO` numa sala
  mista usava um buffer só no layout de quem mudou de equipamento — corrigido com `sendToAllByKind`.
  Resto da bolsa (mover/organizar/reciclar/desacorrentar/ocultar/senha/cartões/presentes/conquistas) e o
  resto da família MARRY_* verificados campo a campo e já estavam idênticos. Ver
  `research/6600/packets-m1.md` "M2 bolsa".
- [x] **m2-loja** — loja + correio pro 6600. 44 BUY_GOODS (+goodsType/isBand por linha; loja barata/desconto
  via `Shop_Cheap_Items`, nunca lida até agora) e 116 SEND_MAIL (6600: 1 anexo só, com corte de pilha, não 4
  inteiros) corrigidos; `shopcheapitemlist.ashx` com fonte de dados por `rc.client`. Resto (presentear, sell/
  renovar/VIP/baú, listas de correio) verificado campo a campo e já estava idêntico. Ver
  `research/6600/packets-m1.md` "M2 loja/correio".
- [x] **m2-salas** — criar/entrar sala, pronto, começar (até a tela de carregamento da batalha) 6600-correto
  nos dois sentidos (`94/0`/`94/4` corrigidos, `91/101 GAME_CREATE`/`91/103 GAME_LOAD` corrigidos e
  broadcast por clientKind, Pesadelo/`eHardLevel.Nightmare` ligado ao `Pve_Info.NightmareGameScript`).
  Ver `research/6600/packets-m1.md` "M2 salas".
- [x] **m2-batalha** — 91/2 FIRE, 91/6 TURN, 91/99 START_GAME, 91/100 GAME_OVER, 91/115 ALL_MISSION_OVER com layout 6600; todos os eventos de luta montados por tipo de quem recebe (partida mista 4.1×6600 ok); dano mágico do 6600 no motor (inerte até itens terem MagicAttack/Defence). Lacunas: somar stats mágicos dos itens no PlayerSpec, PvE ao vivo até MISSION_OVER.
- [x] **m2-forja** — fortalecer (59, sistema determinístico sem sorteio do 6600 + nível máx. 12),
  transferir (61, +4 int de bagType/place, `MustTransferGold` configurável) e fundir (78, layout de
  receita novo do 6600 lido sem crash) 6600-corretos; compor/incrustar/dourar/evolução/energia
  latente/colar verificados campo a campo e já estavam idênticos; `EQUIP_BRING_UP`/`ITEM_CELL_IS_LOCKED`/
  `EQUIP_GHOST`/`STORE_FINE_SUIT` confirmados ausentes do enum 6600 (N/A). Gap pra M3: sistema de fusão
  por receita do 6600 (`FusionNewVo`/`FusionID`) não portado, sem tabela/XML equivalente ainda. Ver
  `research/6600/packets-m1.md` "M2 forja".
- [ ] **m2-cutover** — 6600 vira o padrão em `/play`; 4.1 fica em `?client=41` até ser removido.

### M3 — resto dos handlers + endpoints novos
Ver [MIGRACAO-6600.md §5](./MIGRACAO-6600.md#5-plano-por-fases). Inventário completo (pacotes por área +
endpoints nativo/snapshot/vazio) em **`research/6600/coverage-m3.md`**, gerado por
`node tools/qa/packet-coverage-6600.mjs` (reexecutar sempre que handlers/endpoints novos entrarem — é o
termômetro de progresso citado no critério de saída do M3). Tarefas abaixo ordenadas por valor pra um
servidor jogável: bolsa/loja/missões primeiro, sistemas maiores depois. Cada uma é ~1 família de handler
(1 agente). C# a espelhar sempre em `vendor/DDT-6600/Source/Game.Server/Game.Server.*` (código 6600) +
`vendor/DDT-6600/Flash_Project/DDT660/src` (cliente AS3, pra achar o `*SocketOut.as` que envia o pacote).

- [x] **m3-figurino** (2026-10-18) — `PLAYER_DRESS` (237, 6600 "figurino"/dress room, GAP deixado pelo
  `m2-bolsa`): salvar/trocar/travar preset (sub 1/2/7) + mesclar validade de itens duplicados (sub 6)
  implementados por completo (`handlers/bolsa/vestir-6600.ts`), persistidos em `player."Sys_Users_Extra"`
  (`DressModelArr`/`CurentDressModel`, migration 0013 já tinha as colunas — nenhuma migração nova). Sem
  "renomear" preset (não existe no protocolo real, só 3 modelos de rótulo fixo) nem bag "Relíquias"/
  "AvatarBag" separada (presets vivem em `p.equipBag`). Dano mágico por item (`MagicAttack`/`MagicDefence`,
  inerte desde `m2-batalha`) ligado de verdade: `game/stats.ts computeStats()` soma os itens equipados ->
  `GamePlayer.magicAttack`/`magicDefence` -> `fight/ddt.ts specOf()` -> `PlayerSpec` (fonte é a EquipBag
  normal, não a bag de Relíquias real do 6600 — ainda não portada, M4+) -> exposto em `67
  UPDATE_PLAYER_INFO`/`74 ITEM_EQUIP` (eram stub `0`/`0`). 4.1 inalterado (nunca manda 237 no login, nunca
  ganha os campos de magic). Ver `research/6600/packets-m1.md` "M3 figurino". **Correção (commit
  `f9e563b`):** o bug "FOLD_DRESS não remove o item de destino" era um exploit de duplicação de item —
  corrigido depois (não deixado como estava).
- [x] **m3-ashx** — 35 endpoints `.ashx`/`.xml` do 6600 portados de verdade (boot/hall) em vez de
  stub/snapshot: 7 `.ashx` novos + 3 stubs promovidos (`AdvanceQuestTime`/`VoteSubmit`/`LogTime`) +
  `SearchGoodsTemp` reaproveitado + 19 `.xml` novos (`templates/defs.ts`) + `ConsortiaBossConfigLoad`.
  Detalhe completo, inclusive os 26 que ficaram de fora (precisam schema novo ou não têm fonte C# no
  vendor) em `research/6600/ashx-missing.md`. Commit `36f75ec`.
- [x] **m3-fusao** — fusão por receita do 6600 (`78 ITEM_FUSION`, `store/newFusion/*`,
  `GameSocketOut.sendItemFusion`), substituindo a bancada de 4 pedras idênticas da 4.1 só pro
  `clientKind==="6600"`. Tabela nova `game."Item_Fusion_New"` (nome 6600 colide com a `Item_Fusion` 4.1 já
  existente, shape incompatível — renomeada via `RENAME_6600`), 206 receitas reais seedadas,
  `FusionInfoLoad.xml` gerado do banco em vez do snapshot. Commit `011a1ee`.
- [x] **m3-coverage** (esta tarefa) — `tools/qa/packet-coverage-6600.mjs` (pacotes: todo
  `new PackageOut(ePackageType.X)` do AS3 6600 vs `ePackageType.cs` 6600 vs o registro vivo de
  `apps/game/src/handlers`; endpoints: árvore real de `vendor/DDT-6600/Request` — 356 arquivos distintos,
  não os "263+184+35" de `MIGRACAO-6600.md` §1.3, que conta duplicado de `obj/`/publish — vs
  `apps/api/src/request/registry.ts` + `templates/defs.ts`) → `research/6600/coverage-m3.md` (tabelas por
  área + totais: pacotes 213 códigos enviados pelo cliente, 131 implemented/22 partial/8 stub/52 MISSING;
  endpoints 145 native/19 native-rebuild/44 snapshot/33+66+32 vazio por motivo/15+2 não roteado). Achado
  notável: `48 SEll_GOODS` (vender item) é **MISSING tanto na 4.1 quanto no 6600** (único código ausente
  no relatório da 4.1 também, `research/qa/packet-coverage.tsv`) — gap pré-existente, não específico do
  6600, listado abaixo (`m3-sell-goods`). Pesquisa de "cheap win" de endpoint feita até o fim: nenhum
  endpoint novo portado nesta tarefa — os candidatos óbvios da árvore completa (`nicknamerandom.ashx`,
  `DropItemForNewRegister.ashx`, `SavePlayerAction.ashx`) não são chamados pelo cliente 6600 (grep vazio em
  `vendor/DDT-6600/Flash_Project`, só existem no 4.1/ferramenta admin), e `CelebByTotalPrestige`/
  `ActivitySystemItemsRate` são código morto no próprio C# 6600 original (lógica comentada / loader sem
  `analyzer`) — registrado aqui pra não reabrir: o barato já tinha sido feito no `m3-ashx`.

**Bolsa/Loja/Missões (core, maior valor — todo jogador passa por aqui):**
- [x] **m3-sell-goods** (2026-10-18) — `48 SEll_GOODS` (`sendSellGoods`, `ddt/manager/GameSocketOut.as`):
  achado o dispatch original — NÃO EXISTE (`BaglockedHandle.cs` foi checado por engano no pedido original;
  o real é que nenhum `[PacketHandler(ePackageType.SEll_GOODS)]` existe em `vendor/DDTank41`/`vendor/DDT-6600`
  nenhum, e `sendSellGoods` nunca é chamado por NENHUMA view AS3 nos 4 vendors — 100% código morto nos dois
  lados, mesma categoria do `110/111 ITEM_REFINERY`). `handlers/bolsa/vender-item.ts` (design próprio): vende
  a pilha toda da `PropBag` (único bag endereçável pelo único int do pacote — equipamentos ficam
  estruturalmente inalcançáveis, "nunca vender equipado" sai de graça) usando
  `ItemTemplateInfo.ReclaimValue`/`ReclaimType` (mesma fonte do `127 REClAIM_GOODS`). Recusa `ReclaimType===3`,
  item `cellLocked`, bolsa com BAGLOCK ativo. Exploit evitado: nenhum campo `count` no pacote (vende sempre
  `item.Count` real) — dupe por count manipulado é impossível por construção.
- [x] **m3-item-refinery** (2026-10-18) — `210 ITEM_REFINERY` no 6600 (era `110` na 4.1 — valor trocado
  confirmado: 6600 reaproveita `110` pra `GAME_CAPTAIN_CHOICE`/`SEPARATE_ACTIVITY`; `111
  ITEM_REFINERY_PREVIEW` não mudou). `handlers/forja/refinaria.ts` ganhou um `outCode` opcional;
  `handlers/forja/index.ts` registra `210` só pra `clientKind==="6600"` (e `110` só pra `!=="6600"`, defesa
  simétrica) chamando a MESMA `refinery()`/`refineryPreview()` já existente — sem duplicar lógica. Confirmado
  de novo que o sistema é código morto nos dois clientes (nenhuma view chama `sendItemLianhua`), inclusive o
  layout mais elaborado que o `sendItemLianhua` do 6600 escreve (`operation/count/matieria[]/...`) — mantido
  o formato simples `[bagType, place]` de sempre, documentado por que não tentamos honrar o layout morto.
- [x] **m3-baglock-recovery** (2026-10-18) — `403 BAGLOCK_PWD` sub-ações `getBackLockPwdByPhone`(1)/
  `getBackLockPwdByQuestion`(2)/`deletePwdQuestion`(3)/`deletePwdByPhone`(4)/`checkPhoneBind`(5).
  `handlers/bolsa/recuperar-senha.ts`: original (`BaglockedHandle.cs`) só implementa o sub-caso 5
  (hardcoded `true`, sem checagem real) — os outros 4 nunca funcionaram no jogo original (dependiam de SMS
  do portal 4399 chinês, que não temos). Portado de verdade: sub 2 (recuperar por pergunta secreta), 100%
  viável com os dados que `25 BAG_LOCKED` já grava (`q1/a1/q2/a2`/`count`) — SEM migração nova. Valida as 2
  respostas exatas, rate-limit de 3s por conexão + `count` com chão em 0 (nunca negativo, diferente do
  original), sucesso só LIMPA a senha (mesma ação que o tipo 4 de BAG_LOCKED já fazia) — nunca enfraquece,
  nunca define senha nova, nunca revela a resposta salva. Sub 1/3/4 (telefone) e sub 5: sem dado de telefone
  nenhum no banco (nunca existiu) — recusa honesta (`flag=false`) em vez de chutar um fluxo de SMS que nunca
  existiu; sub 5 corrige o `true` hardcoded do original (mentira inofensiva lá, relevante aqui porque a UI
  usa o flag). Nenhuma migração Drizzle precisou ser criada.
- [x] **m3-everyday-active** (2026-10-18) — `155 EVERYDAY_ACTIVEPOINT` (`addSpeed`/`sendGetGoods`/`enterDayActivity`/
  `sendExpBlessedData`, `GameSocketOut.as`) — aba "Sist. Treino" da bolsa nova (`MIGRACAO-6600.md` §4).
  `EverydayActivePointHandler.cs` decompilado é um stub (só sub 8); motor de pontos/ação/recompensa novo
  seguindo o contrato AS3, lendo `game.Every_Day_Active_*` (0 linhas na origem) + progresso diário em
  `app."EveryDayActiveProgress"` (migração 0018); tiers 1-4 (30/60/80/100, hardcoded no cliente) com claim
  único por dia (`claimOnce`). `apps/game/src/handlers/bolsa/treino-diario.ts`.
- [x] **m3-mystery-shop** (2026-10-18) — `278 MYSTERY_SHOP` (`sendGypsyBuy`/`sendGypsyRefreshItemList`/
  `sendGypsyManualRefreshItemList`/`sendGypsyRefreshRareList`/`sendRequestGypsyNPCState`,
  `GameInSocketOut.as`) — Loja Cigana (`gypsyshop.swf`, `src/gypsyShop/`). Sistema novo do 6600, C# real
  (`GypsyShopBuy.cs`/`GypsyShopPlayerInfo.cs`/`GypsyShopRateItemInfo.cs`/`GypsyShopRefresh.cs`,
  `GypsyShopMgr.cs` sorteio ponderado) — tabela fonte não está nos catalog.json extraídos, então
  `app."MysteryShopTemplate"`/`app."GypsyShopState"` aditivas (migração 0018). Cobra antes de dar o item
  (Money ou Honor), sem duplo-buy (CanBuy zera e persiste antes do próximo pacote). Reset grátis diário
  (simplificação do reset por hora do original) + refresh manual pago em Honor.
  `apps/game/src/handlers/loja/loja-cigana.ts`.
- [x] **m3-shop-buylimited** (2026-10-18) — `288 SHOP_BUYLIMITEDCOUNT` (`sendGetShopBuyLimitedCount`) — limite
  diário de compra por item na loja. `ShopBuyLimitedCountHandler.cs` original nunca lia `Shop.LimitCount`
  (sempre respondia 0); contador por jogador+item+dia em `app."ShopBuyLimited"` (migração 0018), enforced
  em `44 BUY_GOODS` (6600 only) — linha que passaria do limite é descartada (`continue`), incremento só
  após cobrança confirmada. `apps/game/src/handlers/loja/compra-limitada.ts` +
  `apps/game/src/handlers/loja/comprar.ts`.
- [x] **m3-caddy-loteria** (2026-10-18) — `97 LUCKSTONE_RANK_LIMIT`, `165 LUCKSTONE_CONFIG`,
  `211 CADDY_EXCHANGE_ALL`, `215 CADDY_CONVERTED_ALL` (`GameSocketOut.as`) — família "Pedra da Sorte"
  (distinta da `137 LEFT_GUN_ROULETTE`, já portada no M1). Achado: a feature é permanentemente FECHADA no
  servidor 6600 decompilado — `AbstractPacketLib.SendLuckStoneEnable` sempre manda `isOpen=false`, e `97`/
  `211` não têm `PacketHandler` nenhum (confirmado por grep; `165` tem `LuckStoneEnableHandler.cs`, `215` tem
  `CaddyConvertedHandler.cs` que só lê e descarta). Nenhuma tabela de moeda "LuckStone" existe no `.bak` nem
  no schema — portar "de verdade" seria inventar uma economia nova. Os 4 códigos respondem exatamente como o
  original responderia (165/97 fechados/vazios, 211/215 sem resposta, igual ao C#), sem inventar taxa de
  câmbio nem abrir superfície de exploit. `apps/game/src/handlers/eventos/roleta.ts` (funções
  `luckStoneConfig`/`luckStoneRankLimit`/`caddyExchangeAll`/`caddyConvertedAll`) +
  `apps/game/src/packets/out.ts` (`luckStoneConfigClosed`/`luckStoneRankLimitClosed`). Sem migração.
- [x] **m3-cards-slot** (2026-10-18) — `170 CARDS_SLOT` (`sendUpdateSLOT`/`sendResetCardSoul`) — sub 0 sobe o
  nível do "soul slot" de uma carta equipada gastando `CardSoul` pela curva `Card_Groove_Update` (custo
  limitado ao teto do nível máximo, nunca desperdiça), sub 1 reseta os 5 slots equipados devolvendo o
  `CardGP` acumulado como `CardSoul` (cobra 300 de Money antes, igual `CardSlotHandler.cs`). `CardSoul`
  (coluna já existia desde `m1-schema`, só não estava persistida — adicionada a `SAVED_DETAIL_COLUMNS`).
  Migração aditiva nova: `packages/db/drizzle/0019_cards-slot-type.sql` (`player."Sys_Users_Card"."Type"`,
  default 0 — `UsersCardInfo.Type` do 6600, que escolhe a curva; a origem decompilada não mostra onde um
  cartão novo ganharia `Type=1` em vez de `0`, gap documentado em `game/cards.ts`, não um palpite). Sem
  equivalente no enum 4.1 (confirmado, código nunca existiu lá). `apps/game/src/handlers/mascote/
  cartas-slot.ts`.
- [x] **m3-achievement-update** (2026-10-18) — `229 ACHIEVEMENT_UPDATE` (`sendModifyInfo`). Achado: isto NÃO
  é progresso de conquista — `sendModifyInfo` (`CivilRegisterFrame.as:274`) é a mesma ação de EDITAR o
  próprio pedido do mural de casamento que o 4.1 manda em `237 MARRYINFO_UPDATE` (já portada em
  `casamento/mural.ts`); o 6600 reaproveita o código 229 porque 237 virou `PLAYER_DRESS` (figurino) nessa
  versão (confirmado lendo `GameSocketOut.as` dos dois clientes: mesmo payload bool+UTF, nomes de enum
  diferentes). `229` "de verdade" (push de progresso) é só servidor→cliente (`pushRecords`); nenhum cliente
  pede isso. `228`/`231` (lista/dados) já implementados, intocados. Dispatch por `clientKind` igual ao
  padrão já usado pro 237 em `casamento/index.ts`. Sem migração.

**Sistemas médios (guilda/GvG, eventos, automação):**
- [x] **m3-king-bless-deed** (2026-10-18) — `142 KING_BLESS_MAIN` (`sendOpenKingBless`/`sendOpenDeed`,
  confirmados chamados em `KingBlessMainFrame.as:257/268`/`DeedIcon.as:101`) e `143 KING_BLESS_USE_ITEM`
  (`sendUseItemKingBless`, `BagView.as:2669`). `sendUseItemDeed` (`BagView.as:2673`) é um `else if` cuja
  condição é subconjunto do `else if` anterior no MESMO encadeamento — **morto por construção no cliente
  real**, confirmado por leitura; não implementado (só o caminho King Bless do 143 é real). `KingBlessHandler.
  cs` cobre 142 (type 10 = Escritura, 1-3 = Bênção do Rei por nível/dias); 143 não tem `[PacketHandler]` em
  nenhum vendor — design Reborn a partir do contrato (item consumido = pagamento). Preços de
  `GameProperties.DanDanBuffPrice`/`KingBuffPrice` via `Server_Config`/`cfgInt`. Downgrade (presentear nível
  menor que o ativo) recusado sem cobrar. **Fixed vs o original**: `SendDeedMain` usa `KingBlessIndex>0`
  (não `DeedIndex`) pra decidir se escreve o dicionário de efeitos — bug de copy-paste que desincronizaria a
  leitura do cliente real quando só a Escritura está ativa; corrigido aqui (gate pelo índice certo).
  **Não portado** (documentado): `AddExpVip`/`CreateSaveLifeBuff` (bônus colateral) e o dicionário de
  efeitos por-atributo (`STRENGTH_ENCHANCE`/`PET_STAR`/...) — nunca consumido por `game/stats.ts`, sempre 0
  entradas (mesma categoria de lacuna que os efeitos de combate não portados, HANDLERS.md linha 91); o ícone
  do buff + contagem regressiva funcionam. `apps/game/src/handlers/progressao/juramento-do-rei.ts`. Migração
  aditiva 0020 (`Sys_Users_Extra.NormalFightNum`/`HardFightNum`, ver próxima tarefa — reaproveitada aqui só
  pra ler `Server_Config`, sem coluna nova específica desta). Testes:
  `apps/game/test/client-6600-m3-king-bless-deed.test.ts` (8).
- [x] **m3-magic-stone-monster** (2026-10-18) — `284 MAGIC_STONE_MONSTER_INFO` (`sendCheckMagicStoneNumber`,
  confirmado chamado em `MagicStoneInfoView.as:607`) — consulta pura de `NormalFightNum`/`HardFightNum`
  (`MagicStoneMonsterInfoHandler.cs:6-16`). Colunas não existiam em `player."Sys_Users_Extra"` (gap do
  m1-schema, `PlayerExtra.CreateUsersExtra` default ambas 1) — adicionadas via migração aditiva 0020
  (`EXTRA_COLUMNS["player.Sys_Users_Extra"]` em `packages/db/scripts/gen-schema.ts`, default 1/1). 6600 only.
  `apps/game/src/handlers/progressao/reliquias-monstro-info.ts`. Teste:
  `apps/game/test/client-6600-m3-magic-stone-monster.test.ts` (3). O sistema maior de Relíquias (board de
  exploração, M4) continua fora de escopo — só esta consulta isolada.
- [x] **m3-consortia-battle** (2026-10-19) — `153 CONSORTIA_BATTLE` entrar/elenco/andar/desafiar/confirmar:
  entrada real (94 GAME_ROOM sub 18 SINGLE_ROOM_BEGIN num=4, confirmado alcançável — botão do hall
  `ConsortiaBattleEntryBtn.as:113`/`HallRightIconView.as:463` ligados a `sendSingleRoomBegin(4)`), elenco
  (153/3 ADD_PLAYER, 153/21 CONFIRM_ENTER), andar (153/4 PLAYER_MOVE, broadcast pra todos igual ao original),
  sair (153/5 DELETE_PLAYER) e desafiar (153/6 CHALLENGE → luta real, `rooms/room-mgr.ts
  createConsortiaBattleRoom` → `FightEngine.startPvp`, igual todo outro 1v1 — sem resultado inventado pelo
  cliente). Janela aberta/fechada por `app."ScheduledEvents"` kind `consortia_battle` (153/1 START_OR_CLOSE
  nunca teve um remetente de verdade no C# vazado — mesma lacuna que boss mundial/liga/elite tinham antes do
  scheduler; sem essa janela o botão do hall nunca habilita). Corrigido (não replicado): `BaseConsBatRoom.cs`
  envia 10 campos no elenco/status mas o leitor AS3 lê 4 a mais (PetsID/Sex/Style/Colors pra desenhar o
  sprite do outro jogador) — builders em `packets/out.ts` escrevem o corpo completo; `Challenge` original
  deixa o alvo travado em "lutando" se o desafiante falhar a própria checagem depois — corrigido validando
  os dois lados antes de mutar qualquer um. Cross-channel: fora de escopo por desenho (`docs/GAME-SERVER.md`
  "O que ainda não funciona com 2+ canais" — King Division/GvG = M3/M4), fica por canal. Sem migração (estado
  só em memória, como `NewHallRoom`). Resultado/pontuação/recompensa (`BattleWin`/`BattleLost`, 16
  UPDATE_SCORE, 17 CONSUME — todos `Console.WriteLine` no C# original também) ficam pro follow-up abaixo.
- [ ] **m3-consortia-battle-2** — resultado/pontuação/recompensa da arena GvG (`153 CONSORTIA_BATTLE`):
  ligar o fim de uma luta `RoomType.ConsortiaBattle` (hook `onGameOver`, igual `handlers/sociedade/guerra-
  gvg.ts`) em `BaseConsBatRoom.BattleWin`/`BattleLost` (:189-258 — fórmulas de pontuação por sequência de
  vitórias já existem no C#, só nunca são chamadas de lugar nenhum; citar ao portar) + 153/9
  UPDATE_SCENE_INFO (refresh do HUD próprio) + 153/7 PLAYER_STATUS pro resto da cena; 153/16 UPDATE_SCORE e
  153/17 CONSUME (loja de pontos — dobro de pontuação / full-power, `isDoubleScoreUsed`/`isPowerFullUsed` já
  rastreados em `game/consortia-battle.ts` mas sem efeito de combate ainda, camada de efeito que também não
  existe no motor de luta — ver nota "fight-time effect layer" em `apps/game/HANDLERS.md`); claim-once se
  as recompensas forem persistidas (ex. ranking semanal) — confirmar se o C# original tem UMA recompensa real
  aqui ou se, como `m3-group-purchase`, é outra feature inacabada antes de inventar comportamento.
- [x] **m3-trusteeship** (2026-10-18) — `140 TRUSTEESHIP` (`sendTrusteeshipStart`/`Cancel`/`SpeedUp`/
  `BuySpirit`/`UseSpiritItem`, confirmados chamados em `TrusteeshipView.as`/`TrusteeshipManager.as`/
  `QuickUseFrame.as:127`) — "curadoria"/auto-piloto de missão. **Sem handler C# em nenhum vendor**
  (`GameTrusteeshipCommand.cs` é outro código de pacote, stub puro; sem entidade de banco também) —
  implementado 100% a partir do contrato do cliente. Paga energia espiritual (`Sys_Users_Extra.
  TrusteeshipSpirit`, migração 0020) + `Quest.CollocationCost`/`CollocationColdTime` (colunas novas na mesma
  migração, defaults 20/60) pra deixar uma missão se completando sozinha em N minutos;
  "acelerar" paga Xu/minuto restante (GRÁTIS com uma Bênção do Rei ativa — efeito real confirmado em
  `TrusteeshipView.as:225-229`, `KingBlessManager.openType>0` — é o único "efeito" do 142 que esta tarefa
  conseguiu conectar de verdade). `EndTime` sempre `ctx.now()+minutos` (nunca lido do cliente); sem timer
  por-jogador (igual Labirinto) — o prazo é varrido (`sweep`) na próxima ação 140 do jogador, que entrega a
  recompensa reaproveitando `QuestInventory.finish` (nova `forceCompleteConditions`, `game/quests.ts`, zera
  os contadores 0-3 pra simular o playthrough). Preços/limites sem default documentado em nenhum vendor
  (escolhidos nesta tarefa, admin ajusta via `Server_Config`). Nova tabela (sem equivalente em NENHUM
  vendor) `player."Sys_Users_Trusteeship"` — hand-added em `src/schema/player.ts` (não vem do
  `gen-schema.ts`, ver comentário no próprio arquivo). `apps/game/src/handlers/missoes/curadoria.ts`. Teste:
  `apps/game/test/client-6600-m3-trusteeship.test.ts` (4).
- [x] **m3-dice-system** (2026-10-18) — `134 DICE_SYSTEM` (`sendDiceRefreshData`/`sendStartDiceInfo`/
  `sendRequestEnterDiceSystem`, confirmados chamados em `Dice/DiceManager.as:66`/`DiceSystemPanel.as:208`/
  `DiceToolBar.as:217`) — Sistema de Dados. `DiceHandler.cs` — único dos 4 sistemas desta tarefa com lógica
  C# real (sem stub); preços/pontos espelhados exatamente (`DiceRefreshPrice`=40000, `CommonDicePrice`=30000,
  `DoubleDicePrice`=40000, `BigDicePrice`=50000, `SmallDicePrice`=60000, `IntegralPoint`=[100,300,700,1500,
  3100], `MAX_LEVEL`=5). Persistência **já existia** desde `m1-schema` sem nenhum writer (`player."Dice_
  Data"`, 37 linhas reais na origem) — sem migração nova; nível usa `game."Dice_Level_Award"` (5 linhas
  reais seedadas). Board de 19 casas (`EventAwardMgr.GetDiceAward`) usa a tabela genérica `Event_Reward_
  Goods`, 0 linhas pro tipo DICE na origem — admin-configurável via `app."ScheduledEvents"` kind "dice"
  (mesmo padrão do Baú da Galinha/Estrela da Sorte), default embutido. Bug do original replicado de
  propósito (cosmético): `LuckIntegralLevel` é re-grampeado pra 3 ao passar do nível 4, mesmo já tendo
  ganhado o prêmio do nível 5. `apps/game/src/handlers/eventos/dados.ts`. Sem migração nova. Teste:
  `apps/game/test/client-6600-m3-dice-system.test.ts` (5).
- [x] **m3-campbattle** (2026-10-19, "código morto") — `146 CAMPBATTLE` (`CampbattleEnterFight`/`RoleMove`/
  `changeMap`/`outCampBatttle`/`captureMap`/`requestPRankList`/`requestCRankList`/`enterPTPFight`/
  `returnToPve`/`resurrect`) — Batalha de Acampamento (`campbattle.swf`, 6600). Confirmado **morto no
  servidor original — 3 elos independentes, cada um sozinho já bastaria**: (1) o ícone do hall
  (`HallIconType.CAMP`) só aparece com `ACTION_ISOPEN=true`, enviado por `SendCampBattleOpenClose` — a
  implementação real usada em produção, `ConsolePacketLib.SendCampBattleOpenClose`
  (`Game.Server.Packets.Server/ConsolePacketLib.cs:167`), é `throw new NotImplementedException();`, igual
  ao `SendSevenDoubleOpenClose` 3 linhas abaixo (mesma categoria do `148 SEVEN_DOUBLE`/`m3-seven-double`);
  (2) mesmo ignorando (1), **nenhum código em `vendor/DDT-6600/Source` chama `SendCampBattleOpenClose(`**
  (grep vazio) — nenhum scheduler/comando de admin jamais abre o ícone; (3) mesmo ignorando (1)-(2), o
  clique (`CampBattleManager.onCampBtnHander`) manda `sendSingleRoomBegin(RoomManager.CAMP_BATTLE_ROOM)` —
  `CAMP_BATTLE_ROOM = 5` (`room/RoomManager.as:74`, confirmado o único valor que os 6 call-sites do
  cliente usam) — mas o switch de `SingleRoomBegin.cs` (`Game.Server.GameRoom.Handle/
  SingleRoomBegin.cs:23-97`) não tem `case 5` (só um `case 17` morto, que nada no cliente manda), caindo
  no `default: Console.WriteLine(...)`. As classes de sala/cena (`BaseCampBattleRoom.cs` — sala global,
  cena hardcoded com 1 monstro fixo "Tà Linh Kate"/`Living225` independente do `monsterCount=18` que
  escreve, boss fight sempre na mission 60018 ignorando o `id` do cliente) e o `CampBattleHandler.cs`
  (`[PacketHandler(146)]`, só sub 2/3/5/6/21 têm `case`; 9/16/17/18/20 caem no `default` mesmo dentro da
  cena) são código real, mas 100% inalcançável — mesma categoria de `144 GROUP_PURCHASE`/
  `148 SEVEN_DOUBLE`. Registrado como no-op puro (lê o sub-byte + os campos fixos de cada sub-ação,
  descarta, sem resposta) — sem inventar captura-de-mapa/PvP/ressurreição que nunca existiu em produção.
  `apps/game/src/handlers/eventos/campbattle.ts`. Sem migração. Teste:
  `apps/game/test/client-6600-m3-campbattle.test.ts` (8).
- [x] **m3-group-purchase** (2026-10-18, "código morto") — `144 GROUP_PURCHASE`
  (`sendGroupPurchaseRefreshData`/`RefreshRankData`/`Buy`) — Compra em Grupo (`grouppurchase.swf`).
  Confirmado: feature 100% inacabada no servidor original, não só o `.ashx` companheiro
  (`teambuyactiveawardinfo.cs`, sempre `value=false`, já portado no `m3-ashx`). Nenhuma classe
  `[PacketHandler(144)]`/`ePackageType.GROUP_PURCHASE` existe no `Game.Server.Packets.Client` decompilado
  (grep vazio) E nenhum código do servidor jamais envia o sub-pacote `START_OR_END` que abriria o ícone do
  hall (`GroupPurchaseManager.as openOrClose` → `HallIconManager.updateSwitchHandler(GROUPPURCHASE, true)`,
  só chamado dentro desse handler de entrada que nunca dispara) — o jogador nunca consegue abrir a tela pra
  disparar `REFRESH_DATA`/`REFRESH_RANK_DATA`/`BUY` em primeiro lugar. Registrado como no-op puro (lê e
  descarta, sem resposta), mesma categoria de `211 CADDY_EXCHANGE_ALL`/`215 CADDY_CONVERTED_ALL`
  (`handlers/eventos/roleta.ts`, m3-caddy-loteria) — sem inventar uma economia de desconto em grupo que
  nunca existiu em produção. `apps/game/src/handlers/eventos/compra-em-grupo.ts`.
- [x] **m3-seven-double** (2026-10-19, "código morto") — `148 SEVEN_DOUBLE` (`sendSevenDoubleCallCar`/
  `StartGame`/`CancelGame`/`Ready`/`Move`/`UseSkill`/`CanEnter`/`EnterOrLeaveScene`) — minijogo "Sete
  Dobrado" (cliente real e completo: `src/sevenDouble/*`, `SevenDoubleManager.as` + várias views).
  Confirmado morto no servidor original, mesma categoria do `144 GROUP_PURCHASE`: a tela só abre quando o
  cliente recebe o sub-pacote `START_OR_END=1` (`SevenDoubleManager.pkgHandler` → `openOrCloseHandler` →
  `this.open()`), e o envio desse sub-pacote (`SendSevenDoubleOpenClose`) só existe como assinatura em
  `IPacketLib`/`AbstractPacketLib` — a única implementação, `ConsolePacketLib.SendSevenDoubleOpenClose`
  (`Game.Server.Packets.Server/ConsolePacketLib.cs:172`), é `throw new NotImplementedException();`, e
  **nenhum código em `vendor/DDT-6600/Source` chama esse método** (grep vazio). `SevenDoubleHandler.cs`
  (`[PacketHandler(148)]`) existe e responde trivialmente a 3 CALL/6 START_GAME/9 READY/35 IS_CAN_ENTER,
  mas como a tela nunca abre o jogador nunca dispara nada; `RoomMgr.SevenDoubleRoom`/`BaseSevenDoubleRoom`
  (engine de sala/monstros) ficam alocados no boot mas nunca são atribuídos a nenhum
  `GamePlayer.CurrentSevenDoubleRoom`. Registrado como no-op puro (lê o sub-byte e os campos simples de
  CALL, descarta o resto), sem inventar uma corrida/aposta que nunca existiu em produção.
  `apps/game/src/handlers/eventos/sete-dobrado.ts`. Teste:
  `apps/game/test/client-6600-m3-misc-sweep.test.ts`.
- [x] **m3-ringstation** (2026-10-19) — `404 RING_STATION` sub 1-7 (`sendRingStationGetInfo`/
  `sendBuyBattleCountOrTime`/`sendRingStationChallenge`/`sendRingStationArmory`/
  `sendRingStationBattleField`/`sendRingStationFightFlag`/`sendSignMsg`) — Arena Ranqueada (`ringstation.swf`).
  `apps/game/src/handlers/arena-ranqueada/*`, `game/ringstation.ts`, `db/ringstation.ts`. Achado principal:
  o sistema "bem mais elaborado" (4 pastas C#: `RingStation`/`.Battle`/`.RoomGamePkg`/
  `.RoomGamePkg.TankHandle`) é quase todo infraestrutura de relay pra um SEGUNDO servidor TCP separado
  (`RingStationBattleServer`/`Fighting.Server ProxyRoomMgr.StartWithNpcUnsafe`) que não existe mais aqui — o
  motor de combate em si (`eRoomType.RingStation`/`eGameType.RingStation`, `ArenaPK()`/`GameOverArenaMode`)
  é o MESMO motor normal de PvP 1v1, só com o oponente sendo um snapshot real (stats/equipamento cacheados
  do próprio adversário, `RingStationBot`/`resolveChallengeTarget`) em vez de um humano — reaproveitado via
  `rooms/room-mgr.ts createRingStationBattle` -> `FightEngine.startPvp`, igual o fallback de bot da fila de
  Match e `createConsortiaBattleRoom`. Sem migração nova: as 3 tabelas (`Sys_User_RingStation`,
  `Ringstation_Battle_Field`, `game."Ringstation_Config"`) já existiam desde a migração 0013 (m1-schema),
  só sem nenhum escritor até agora.
  Exploit CORRIGIDO: `RingStationBuyBattleCountOrTime.cs` cobra `buyPrice` ANTES de checar o limite diário
  `buyCount` no ramo "comprar desafio extra" — um jogador já no limite é cobrado mesmo assim, sem receber
  nada (só a mensagem "Limit"); agora só cobra quando ainda há saldo de compras do dia.
  Exploit EVITADO (novo, não existe no original): nada no C# original impede disparar `CHALLENGE` repetidas
  vezes antes da primeira luta terminar (`ChallengeNum`/cooldown só mudam no FIM da luta, em
  `UpdateRingBattleFields`) — um `pending` em memória (`ctx.ringStation`) agora recusa um segundo desafio
  do mesmo jogador enquanto o primeiro ainda não resolveu, sem mudar quando a recompensa/contagem realmente
  muda (ainda no fim da luta, byte a byte igual ao original). `onFightOver` roda tanto no `onPlayerGameOver`
  quanto no `onPlayerFlee` do motor de luta (fugir não pode deixar o `pending`/o lock `OnFight` do
  adversário travados pra sempre).
  Nota (não é exploit, é bug do original replicado de propósito): `UserRingStationInfo.CanChallenge` faz 3
  divisões inteiras em cascata (`(600000-decorridoMs)/10/60/1000 <= 0`) em vez de uma só por 600000 — o
  truncamento em cascata faz o "cooldown de 10 minutos" valer de verdade só pro mesmo milissegundo exato do
  último `ChallengeTime`; qualquer `decorridoMs >= 1` já libera. Replicado literal (ver comentário em
  `game/ringstation.ts`) — quem trava a taxa de desafios de verdade é o `pending` acima, não essa conta.
  Gap compartilhado com `m3-consortia-battle` (mesma `ArenaPK()`/`GameOverArenaMode` no C# original): nosso
  motor de luta (`fight/ddt.ts applyRewards`) sempre dá GP/Offer/Money normais de PvP, mesmo pra
  RingStation/ConsortiaBattle (que no original NÃO dão — só `AddPrestige`/`RingstationResult`/
  `BattleWin`/`BattleLost`); mesma decisão do agente de `m3-consortia-battle` (ver nota em
  `game/consortia-battle.ts`): não tocar em `packages/fight`/`fight/ddt.ts` por uma feature só, registrado
  aqui pra quando alguém for arrumar as duas de uma vez.
  Deixado pro `m3-ringstation-2` abaixo: Landers Award e a mala de recompensa periódica por ranking.
  Teste: `apps/game/test/ringstation.test.ts` (8).
- [ ] **m3-ringstation-2** — resto do `404 RING_STATION`: (1) Landers Award (sub 48 `LANDERSAWARD_RECEIVE`/
  49 `LANDERSAWARD_GET`/64 `DUNGEON_UPDATEEXP`) — confirmar antes de implementar: grep em
  `Game.Server.RingStation.Handle` não acha NENHUM handler C# pra esses sub-códigos (só o enum existe,
  `RingStationPackageType.cs`), e o cliente (`LandersAwardManager.as`) só manda `receiveLandersAward` quando
  `LANDERS_AWARD_4399`/`LANDERS_AWARD_OFFICIAL` E `DesktopManager.Instance.isDesktop` — parece ser recompensa
  de "baixar o launcher desktop" de uma plataforma específica (4399/oficial), não ranking da Arena; se for
  mesmo código morto (como `m3-group-purchase`), registrar como no-op e não inventar uma economia que nunca
  existiu. (2) a mala de recompensa periódica por ranking de verdade: `RingStationMgr.StatusScan` (timer de
  60s no original) faz 2 coisas que `m3-ringstation` deixou de fora por serem "scheduled", não packet —
  recalcular `ChampionText` (hoje lido on-the-fly do rank #1 em `onFightOver`/`ver-info.ts`, então já
  funciona sem o timer) e, a cada ciclo de `Ringstation_Config.AwardTime` (3 dias por padrão), mandar por
  correio `AwardNumByRank(rank)` de um item fixo (`ItemTemplate -1000`) pra TODO jogador ranqueado (não é
  "claim" — automático e incondicional no original) + avançar `AwardTime` +3 dias. Portar via
  `app."ScheduledEvents"` (mesmo padrão de boss mundial/liga/dobro de exp — `docs/GAME-SERVER.md`), kind
  novo tipo "ringstation-award". Confirmar se `IsFirstUpdateRank` (bootstrap de rank em massa só relevante
  pra base de dados LEGADA com jogadores sem rank) se aplica aqui — provavelmente não, nosso banco já nasce
  vazio e `onFightOver` já assinala rank na primeira vitória de cada jogador.
- [x] **m3-oldplayer-regress** (2026-10-18) — `149 OLDPLAYER_REGRESS` (botão "Jogador antigo" no hall,
  `PlayerTool.as` `_oldPlayerBtn`/`_selfInfo.isOld`), 11 sub-ações. `OldPlayerRegressHandler.cs` original é
  um no-op TOTAL pra qualquer sub-ação (só `packet.ReadByte()`, sem switch, sem resposta) — portado do
  contrato AS3 (igual `m3-everyday-active`). Achado principal: `isOld`/`Sys_Users_Detail.IsOldPlayer` (coluna
  real, já em `SAVED_DETAIL_COLUMNS`) estava stub `false` em 4 pacotes já existentes (`packets/out.ts`: 1
  LOGIN, 18 SCENE_ADD_USER, 94/4, 160/160) com um comentário ERRADO ("card-soul system") de uma tarefa
  anterior — corrigido pra ler o valor real; `LastDate` também nunca era regravado pra "agora" em lugar
  nenhum do servidor TS (congelado desde a criação do personagem) — agora `applyOldPlayerLogin`
  (`handlers/eventos/jogador-antigo.ts`, chamado no login antes de `Out.loginSuccess`) mede a inatividade
  REAL = agora − `LastDate` de ANTES deste login, vira `IsOldPlayer=true` se >= `inactiveDays` (admin,
  `app."ScheduledEvents"` kind `oldplayer-regress`, default 15 dias — duração configurável, sem data fixa),
  e regrava `LastDate=agora`. Nunca aceita elegibilidade declarada pelo cliente.
  Sub-ações implementadas de verdade, sem item/moeda nenhum (ver exploit evitado abaixo): 6 APPLY_ENABLE/3
  APPLYPACKS (opt-in puro, `claimOnce` 1x por conta), 2 CHECK/4 CALL (1 chamada por conta pra sempre, alvo
  precisa ser amigo aceito E `IsOldPlayer`; a notificação de verdade pro outro jogador é um `.ashx` externo
  disparado pelo PRÓPRIO cliente, fora deste pacote), 5 REVCPACKS (mesmo cálculo, decide se mostra o botão).
  0 PACKS/1 GETPACKS (calendário de 15 "dias" com bundle de item por dia, `PacksView.as`): envelope
  byte-a-byte correto, mas SEM nenhum item configurado — `Old_Player_Award_Info` (27 linhas, existe no
  banco) NUNCA é referenciada em nenhum `.cs` do vendor nem em nenhum catalog.json extraído, então usá-la
  seria inventar uma correspondência dia→recompensa que não existe em lugar nenhum. 7/8/9/10 (ticket "volta"/
  loja de pontos "Integral"): sem NENHUMA tabela de moeda/preço em todo o catálogo (grep vazio por
  `Ticket`/`Integral`) e a UI consumidora também nunca lista nada real — no-op, igual ao original.
  **Exploit evitado**: nenhuma das 11 sub-ações concede item/moeda/XP — zero superfície de dupe/bypass de
  custo, mesmo com o eligibility flag real. Sem migração (`IsOldPlayer`/`LastDate` já existiam, só não eram
  usados). `apps/game/src/handlers/eventos/jogador-antigo.ts`. Teste:
  `apps/game/test/client-6600-m3-oldplayer-regress.test.ts`.
- [x] **m3-wonderful-activity** (2026-10-18) — `159 WONDERFUL_ACTIVITY`, `373 WONDERFUL_GETREWARD`,
  `405 WONDERFUL_ACTIVITY_INIT` — achado: é o sistema "GM Activity" (`wonderfulactivity.swf`,
  `wonderfulActivity/`), vitrine de campanhas promocionais configuradas pelo admin (recarga acumulada,
  consumo, "Carnaval" com ~10 subtipos, montaria, presente diário, VIP geral...). `WonderfulActivityHandler.cs`
  (159) e `WonderfulActivityInitHandler.cs` (405) são stubs no C# original — 405 devolve 1 "ato" FIXO com
  GUIDs chumbados (`4ac24166-...`/`03ff7e54-...`) idênticos pra qualquer jogador/requisição. A fonte REAL das
  campanhas (`activityData`, XML `GmActivityInfo` — o MESMO endpoint listado em `m3-endpoints-schema`/
  `m3-endpoints-aninhados` como SEM schema ainda) nunca passa por este socket; sem aquele endpoint, nenhuma
  campanha real pode existir no cliente, e a entrada fake de 405 fica inerte (nunca casa com uma campanha
  real em `activityData`). 159/405 portados BYTE A BYTE iguais ao C# original (determinístico, inofensivo,
  sem item/moeda). 373 (sem `[PacketHandler(373)]` nenhum no original E inalcançável sem `activityData`
  real) é no-op puro, mesma categoria de `211 CADDY_EXCHANGE_ALL` (m3-caddy-loteria). Sem migração.
  `apps/game/src/handlers/eventos/atividade-maravilhosa.ts`. Teste:
  `apps/game/test/client-6600-m3-oldplayer-regress.test.ts` (describe "GM Activity").
- [x] **m3-accumulative-login** (2026-10-18) — `238 ACCUMULATIVELOGIN_AWARD` (`sendAccumulativeLoginAward`,
  6600 — era `338` na 4.1, `ePackageType.as` 6600:592 vs `Game.Server/Packets/ePackageType.cs` 4.1:248).
  Achado: a lógica já existia em `handlers/eventos/presenca.ts` (`accumulativeLogin`), idêntica ao
  `AccumulAtiveLoginAwardHandler.cs` decompilado — o bug era o código de saída e o registro ficarem fixos em
  338, que um cliente 6600 nunca manda (ele manda 238). `238` no 4.1 é `MARRYINFO_DELETE` (nunca
  implementado dos dois lados — sem risco de corromper outra feature). Corrigido: resposta no MESMO código
  da requisição (238 ou 338, por `clientKind`), registro novo de 238 em `eventos/index.ts` restrito a
  `clientKind === "6600"`. Sem migração (colunas `accumulativeLoginDays`/`accumulativeAwardDays` já
  existiam).
- [x] **m3-launcher-login** (2026-10-19) — `208 LAUNCHER_LOGIN` (`sendDeskTopLogin`, `DesktopManager.
  deskTopLogin()`) — NÃO é um "login alternativo vindo do launcher"; é um aviso opcional pós-login ("estou
  rodando dentro do launcher desktop original"), decidido por um flag 100% client-side
  (`flash.external.ExternalInterface.call("IsDesktop")`/callback `SetIsDesktop` — o PROCESSO NATIVO que
  hospeda o SWF responde, nunca o servidor). O servidor 6600 original **descarta esse pacote**: nenhuma
  classe `[PacketHandler(208)]` existe pra nenhum dos dois significados colididos no enum
  (`LAUNCHER_LOGIN=208` vs `CARDS_SOUL=208`, `ePackageType.cs:215`/`:258` — colisão do PRÓPRIO jogo
  original, confirmada também no enum do cliente, não um erro desta porta); o lado `CARDS_SOUL`
  (servidor→cliente) também nunca é enviado por nenhum código do servidor (grep vazio por `CardsSoul`).
  Nosso `apps/launcher` (runner Ruffle/Flash Projector) nem implementa a ponte `ExternalInterface`
  `IsDesktop`/`SetIsDesktop` do launcher original, então o flag nunca fica true pra disparar o envio de
  qualquer forma. Decisão (regra do projeto: nunca recompensa por flag de cliente): registrado como no-op
  puro (lê e descarta, sem resposta), idêntico ao comportamento do original; nenhuma recompensa
  implementada por falta de uma verificação real do lado do servidor (ex. token de sessão do launcher via
  `apps/api`, não existente hoje). `apps/game/src/handlers/eventos/launcher-login.ts`. Teste:
  `apps/game/test/client-6600-m3-misc-sweep.test.ts`.

**Sweep (vários códigos pequenos, investigar um a um na mesma tarefa):**
- [x] **m3-misc-sweep** (2026-10-19) — códigos pequenos restantes do relatório, cada um investigado contra
  o C# original (grep de `[PacketHandler(code...)]` em `Game.Server.Packets.Client`) antes de decidir,
  igual `m3-group-purchase`. Todos registrados como no-op (`apps/game/src/handlers/eventos/
  sweep-diversos.ts`), nenhum concede item/moeda/XP. Tabela código → decisão:

  | Código | Nome | Achado | Decisão |
  |---|---|---|---|
  | 101 | BATTLE_COMPANION_GIVE | Nenhuma classe `[PacketHandler(101)]` em todo o vendor — 100% morto. | No-op (3 int descartados). |
  | 147 | FIND_BACK_INCOME | Nenhuma classe `[PacketHandler(147)]` — 100% morto. | No-op (int+bool+bool descartados). |
  | 152 | FIGHTFOOTBALLTIMETAKEOUT | `FightFootballTimeTakeoutHandler.cs` é REAL (minigame sazonal "futebol", `src/fightFootballTime/*`), mas depende de `EventAwardMgr.GetFightFootballTimeAward` + campos `GamePlayer.Card`/`takeoutCount`/`CardsTakeOut` inexistentes nesta porta — sistema grande (mesma categoria de 404 ringstation/146 campbattle), não "pequeno". | Stub fiel (lê `place` byte, descarta); fora de escopo desta varredura, candidato a tarefa própria. |
  | 156 | TRANSNATIONAL_BUYGOODS | `BuyTransnationalGoodsHandler.cs` é REAL (compra com pontos de `Actives.Pyramid`, sistema "Guerra das Nações" com room type próprio, `room/transnational/*`), subsistema inteiro não portado. | Stub fiel (lê `id` int, descarta); mesma categoria de 152. |
  | 157 | RECHARGE (`getspree`) | Nenhuma classe `[PacketHandler(157)]`; nenhum `SendTCP`/`GSPacketIn(157,...)` em lugar nenhum — 100% morto nos dois sentidos. | No-op (5 int descartados). |
  | 164 | UPDATE_PLAYER_PROPERTY | Nenhuma classe `[PacketHandler(164)]` — 100% morto. | No-op (sem corpo). |
  | 207 | REQUEST_FRIENDS_PAY | `RequestPayHander.cs` EXISTE e está registrado, mas só `packet.ReadByte()` + variável local não usada + `return 0` — nunca olha pro resto do pacote (friendsID/goodsIds/auctionID/nome/msg) nem chama `SendTCP`. Funcionalmente idêntico a um morto. | No-op fiel (lê 1 byte, descarta o resto sem parsear — igual ao original). |
  | 327 | FAST_AUCTION_SMALL_BUGLE | Alcançável pelo cliente de verdade (`AuctionSellView.as` → `ChatManager.sendFastAuctionBugle` → `SocketManager.Instance.out.sendFastAuctionBugle`), mas nenhuma classe `[PacketHandler(327)]` — o `SmallBugleHandler.cs` existente está em `[PacketHandler(71)]` (megafone normal, já implementado), não em 327. 100% morto no servidor. | No-op (1 int `auctionId` descartado). |
  | 360 | GET_CSM_BOX | Nenhuma classe `[PacketHandler(360)]` — 100% morto. | No-op (sem corpo). |

  `apps/game/src/handlers/eventos/sweep-diversos.ts`. Teste: `apps/game/test/client-6600-m3-misc-sweep.test.ts`.
- [x] **m3-partial-sweep** (2026-10-19) — os 24 códigos com status `partial` do relatório (o relatório em
  si estava stale — vários já tinham sido corrigidos por tarefas anteriores sem o status do registro ser
  atualizado), revisados campo a campo contra 6600/4.1. 6 tinham bug real (achado lendo o reader AS3 real,
  não só "melhor esforço") e foram corrigidos + flipped `implemented`; 6 já estavam corretos (status nunca
  atualizado — 4 só desvio documentado, 1 porque uma tarefa concorrente já tinha fechado o gap de verdade
  antes do `git fetch` final, ver 131 abaixo) e só precisaram do flip; 1 (249) teve 1 sub corrigido mas
  continua `partial` (os outros subs não foram reauditados); 1 (258) teve um bug de segurança (colisão de
  enum) corrigido mas continua `partial` (feature de verdade fora de escopo); 3 precisam de subsistema
  inteiro novo e foram desmembrados em tarefas próprias (abaixo); 1 (153) já tinha desmembramento
  (`m3-consortia-battle-2`); 1 (145) tem o gap já coberto por tarefas M4/HANDLERS.md existentes, sem split
  novo; 5 ficaram documentados sem mudança (gap real mas não-reachable/fora de orçamento).

  | Código | O que faltava | O que foi feito |
  |---|---|---|
  | 233 MARRY_SCENE_CHANGE | Só avisava quem ficou no mapa antigo (244); nunca avisava quem já estava no mapa novo (243) — trocar de cenário na capela deixava o jogador invisível pra quem já estava lá. Faltavam guardas (`MarryMap!=0`, no-op se mesmo mapa). | Troca de presença 243 completa + guardas, igual `Class20.cs`. **implemented**. |
  | 241 MARRY_ROOM_CREATE | Mandava 242 (layout "você entrou nesta sala") pra quem só navega a LISTA, e um 2º pacote 242 TRUNCADO (só 1 bool) sobrescrevia `ChurchManager.currentRoom` do criador com lixo. | Broadcast 241 certo (`chapelRoomScenePacket`) pra `chapelBrowsers`; removido o 2º pacote malformado. **implemented**. |
  | 251 SCENE_STATE | Ignorava o sub-byte, só reenviava 242. Sub 0 (resync de presença na capela) e sub 1 (sair pra sala de espera do hall — usado por loja/consórcio/lista de salas/etc, não só casamento) nunca faziam nada. | Sub 0 = troca de presença 243 igual 233; sub 1 = `ctx.rooms.enterWaitingRoom` (mesmo caminho do 21 SCENE_REMOVE_USER). **implemented**. |
  | 253 MARRY_ROOM_INFO_UPDATE | Broadcast pra `ChapelRoom.members` (242) em vez de pra `chapelBrowsers` (255) — quem edita a sala avisava as pessoas DENTRO da sala, não quem vê a LISTA de fora. | Broadcast 255 certo pra `chapelBrowsers`. **implemented**. |
  | 240 MARRY_SCENE_LOGIN | (não tinha status próprio, mas alimentava o mesmo bug): listava salas existentes com o layout 242 errado. | Lista com `chapelRoomScenePacket(241, ...)`; registra o jogador em `chapelBrowsers`. |
  | 249 MARRY_CMD (sub 3 CONTINUATION) | Preço dividido 50/50 com o cônjuge (original cobra só de quem pede); resposta 242 pra sala toda (original: `SendContinuation`, 249/3 + horas, só pro pedinte + cônjuge). | Cobrança single-payer + resposta/audiência corrigidas. **249 continua partial** (subs 1/4/5/6/7/8/10/11 não reauditados). |
  | 149 OLDPLAYER_REGRESS | Nada reachable — `m3-oldplayer-regress` (2026-10-18) já tinha portado as 11 sub-ações honestamente (0-6 reais, 7-10 no-op IGUAL ao `OldPlayerRegressHandler.cs` original, que nunca fez nada pra nenhuma sub-ação); status só nunca foi atualizado. | Flip `implemented`. |
  | 58 ITEM_COMPOSE | Nada — reauditado contra `ItemComposeHandler.cs` (6600 e 4.1, mesmo arquivo), só desvios já documentados (pedra sempre validada, mais seguro que o original). | Flip `implemented`. |
  | 59 ITEM_STRENGTHEN | Nada — `strengthen6600` já cobre a reescrita determinística do 6600; `openHole` não chamado no caminho 6600 é esperado (6600 não usa furos 5/6 aqui). | Flip `implemented`. |
  | 222 EQUIP_RECYCLE_ITEM | Nada — já fiel a `EquipRetrieveHandler.cs` (6600 e 4.1). | Flip `implemented`. |
  | 196 CARD_RESET | Nada — `sendCardReset`(mode 0)/`sendReplaceCardProp`(mode 1) do 6600 são a mesma ação que o `if/else` já cobre. | Flip `implemented`. |
  | 128 LEFT_GUN_ROULETTE_SOCKET | Bug real: depois do 1º prêmio ganho, toda rodada PERDIDA seguinte reportava errado (`SendLeftRouleteResult` lê `LeftRoutteRate` DEPOIS da mutação — perdas não zeram esse campo, igual ao original, mas o porte usava `result` da rodada atual pros dois campos da resposta). | Resposta agora lê o campo persistido como o original. **implemented**. |
  | 31 GOODS_EXCHANGE | 6600 manda um layout diferente (`activeId, multiplier, itemsLen, itens..., tierIndex`) do 4.1 (`activeId, itemsLen, itens...`); sem branch por `clientKind`, TODO pacote 6600 real falhava a checagem estrita de tamanho — feature 100% inutilizável nesse cliente. | Parse por `clientKind` + multiplicador escala custo/prêmio (tier index só framed, receita única por `activeId` como já era). **implemented**. |
  | 258 NOVICEACTIVITY/MAGIC_STONE | Colisão de enum (258 = NOVICEACTIVITY na 4.1, MAGIC_STONE no 6600, board de Relíquias) sem guard — um 6600 real caía no `noviceActivityHandler` (2 ints), com risco de casar por acidente numa recompensa de novato indevida (bypass de `claimOnce` por código errado). | Guard por `clientKind` + `magicStoneNoOp` (lê os 8 sub-tipos corretos, sem responder). Feature de verdade (board de Relíquias) continua fora de escopo (`m4-vestir-encanto-reliquias`). **Continua partial** (bug de segurança fechado, feature não portada). |
  | 49 CHANGE_PLACE_GOODS | Store-bag captcha (depende do 200 CHECK_CODE, anti-bot nunca portado) + "temp_place restore" (4.1, não achado no 6600) + gesto de split-drag não confirmado ao vivo (não é bug de servidor). | Nenhuma mudança — gaps documentados, nenhum reachável/barato de fechar. Continua `partial`. |
  | 168 GOODS_COUNT | Desvio JÁ aceito no projeto (mesmo desvio do 44 BUY_GOODS: limite por jogador, não estoque global compartilhado `WorldMgr.GetAllShopFreeCount`). Retrofit pro pool global mudaria um desenho já decidido, não é "sub-ação faltando". | Nenhuma mudança — continua `partial`, documentado. |
  | 200 CHECK_CODE | Lado que EMITE o desafio anti-bot nunca foi portado (sistema CAPTCHA inteiro, fora de escopo). | Nenhuma mudança — continua `partial`, documentado (já listado em HANDLERS.md "Missing"). |
  | 87 NEWCHICKENBOX_SYS | Board só em memória (não persiste em `New_ChickenBox_Data` através de restart do processo) — desvio documentado, não sub-ação faltando (todas as 15 sub-ações funcionam). | Nenhuma mudança — continua `partial`, documentado. |
  | 81 FARM | 3 sub-ações reais não portadas: poultry (subs 20-25/33), compose-food (5), gift packs (20) — mesma categoria da lista "missing" pré-existente, não uma regressão. | Nenhuma mudança — continua `partial`; poultry é grande o suficiente pra cogitar tarefa própria no futuro, não desmembrado aqui por orçamento. |
  | 153 CONSORTIA_BATTLE | Resultado/pontuação/recompensa da arena GvG (`BattleWin`/`BattleLost`, 153/16/17) — já desmembrado. | Nenhuma mudança — já tem `m3-consortia-battle-2` abaixo. |
  | 145 ACTIVITY_SYSTEM | Dezenas de subsistemas de evento sazonal (pyramid/godsroads/superwinner/christmas/catchbeast/treasurelost/newyearrice/boguadventure/halloween/insect/cake...) sem fonte real ou não portados. | Nenhuma mudança — gap já coberto por `m4-eventos-sazonais`/`m4-catchbeast`/`m4-passe-classico`/Tesouro (já implementado), sem split novo. |
  | 84 ACTIVITY_PACKAGE | "Chick activation" (`ActivityPackageHandler.cs`, 668 linhas) não portado — já listado em HANDLERS.md "Missing". | Desmembrado em `m3-chick-activation` (abaixo). |
  | 131 LABYRINTH | `myProgress` nunca avançava — não existia sala PvE do tipo Labirinto nesta porta (admin/economia já portados). Fechado por uma tarefa concorrente ANTES deste `git fetch`/merge final (migração `0011_labirinto_pve_seed.sql` + `handlers/eventos/labirinto.ts` já com a luta real via `@ddt/fight`, `updateLabyrinthFloor`/`outLabyrinth`) — só o status do registro ficou stale. | Flip `implemented` (trabalho de outra tarefa, só o flip foi feito aqui). |
  | 162 ELITEGAME | Chaveamento/torneio real (brackets) não existe — só status/entrada/rank/score. | Desmembrado em `m3-elite-brackets` (abaixo). |
  | 102 WORLDBOSS_CMD | Script de missão do dragão (`ACDragon`) não existe em `@ddt/fight` — mapa abre sem o chefe. | Desmembrado em `m3-worldboss-dragon` (abaixo). |

  Exploits evitados: 258's guard fecha um bypass real de `claimOnce` (código 258 misparseado podia casar
  com uma recompensa de novato por acidente); 31's fix não abre superfície nova (multiplicador escala os
  DOIS lados simétricamente, validado contra overflow). Sem migração nova. Testes: `apps/game/test/
  marriage-farm-auction.test.ts` (+7), `apps/game/test/economy-validation.test.ts` (+3) —
  `pnpm --filter @ddt/game test` (68 arquivos/458 testes) e `pnpm --filter @ddt/api test` (3/101) verdes
  antes do `git fetch`+merge final de `origin/develop` (trouxe `m3-ringstation`/`m3-campbattle`, sem
  conflito de migração — nenhuma migração nova nesta tarefa) e depois dele. `research/6600/coverage-m3.md`
  reexecutado: 24 → 13 `partial` (404 RING_STATION, de `m3-ringstation`, não é desta tarefa — sem ele, 12).

- [x] **m3-worldboss-dragon** (2026-10-19) — `102 WORLDBOSS_CMD`: a descrição desta tarefa estava
  desatualizada — **já estava feito**, antes mesmo dela ser escrita. `ACDragon`/`AC1243`/`WorldAcientDragon`
  (`packages/fight/src/pve/scripts/manual/worldboss.ts`) foram portados byte a byte contra
  `vendor/DDT-6600/Source/Game.Server/Game.Server.Script/{Game/WorldAncientDragon.cs,Messions/AC1243.cs,
  NPC/WorldAcientDragon.cs}` no commit `6308998` (2026-10-02), registrados em `MANUAL_SCRIPTS`
  (`packages/fight/src/pve/scripts/manual/index.ts`), com a semente já no banco (`Pve_Info` 1243 "BOSS Rồng"
  → `GameScript`="GameServerScript.AI.Game.ACDragon"; `NPC_Info`/`NPC_Info2` 1243 "Boss Rồng" →
  `Script`="GameServerScript.AI.NPC.WorldAcientDragon", em `packages/db/seed/game/{Pve_Info,NPC_Info,
  NPC_Info2}.json.gz`) e um teste de ponta a ponta já cobrindo isso
  (`packages/fight/test/pve.test.ts` "world boss dragon (Pve 1243, ACDragon/AC1243/WorldAcientDragon): the
  boss spawns, attacks and takes damage" — roda e passa). O chefe aparece, ataca e recebe dano; só a nota
  stale em `apps/game/HANDLERS.md` (linha do 102) foi corrigida nesta tarefa (flip pra `implemented` +
  explicação). Nenhum código mudou. Sem migração. Sem exploit (nada tocado).
- [x] **m3-elite-brackets** (2026-10-19) — `162 ELITEGAME`: motor de chaveamento real implementado.
  Achado primeiro: a geração de pareamento/avanço de fase do original NUNCA esteve em nenhum vendor —
  `Game.Logic/ExerciseMgr.cs` só guarda o estado (`AddEliteRound`/`UpdateEliteGameChapionPlayerList`), e todo
  escritor real (`HandlerEliteGameRoundAdd`/`HandlerEliteGameSynPlayers`/`HandlerEliteGameStatusUpdate`,
  `Game.Server/LoginServerConnector.cs:1386-1452`) só RECEBE de um processo "Center"/login-server externo que
  não está em nenhum dump que temos (mesma categoria de decisão já tomada pra King Division/Crosszone em
  `research/6600/crosszone.md` — motor local em vez de cross-server). Confirmado pelo cliente real
  (`eliteGame/EliteGameController.as`): fase de pontuação usa sala normal `94 GAME_ROOM` roomType
  `eRoomType.EliteGameScore`=12 (`joinEliteGame` → `sendCreateRoom("",12,3)`, SEM passar pelo 162); fase de
  campeão manda `162/2` (`sendEliteGameStart`) + `sendCreateRoom("",13,3)` (`eRoomType.EliteGameChampion`=13).
  Implementado: `RoomType.EliteGameScore`(12)/`EliteGameChampion`(13) + `GameType` espelhos em
  `rooms/room.ts`; fase de pontuação = sala PvP normal (`criar-sala.ts`, bloqueada se o bit de pontuação do
  bracket de nível do jogador — 30-40 ou 41-50 — não estiver aberto) cujo `onGameOver`
  (`fight/ddt.ts`/`rooms/room-mgr.ts`) agora ajusta `EliteScore` (vitória soma, derrota não desce do piso 0,
  igual ao padrão de ladder já usado pro 132 BATTLEGROUND); fase de campeão = chaveamento eliminatório real
  top-16 por grupo de nível (nome bate com `EliteGameTopSixteenInfo`/`topSixteen30_40`/`paarungRound30_40`
  do cliente — forte confirmação do desenho), gerado quando a janela admin (`app."ScheduledEvents"` kind novo
  `elite_champion`, back-to-back com `elite`, mesmo padrão aditivo de boss mundial/liga) abre; `162/2` libera
  a sala de verdade quando o adversário do round também está online (pareamento imediato, igual
  `createConsortiaBattleRoom`: sem passo de "pronto"/lobby); adversário OFFLINE no momento do clique é W.O.
  (walkover) imediato pro lado presente — decisão nossa, documentada (sem motor de bot-snapshot construído
  pra esta reconstrução, ao contrário do `m3-ringstation`); vencedor avança, luta real via
  `room-mgr.ts createEliteChampionRoom` →
  `FightEngine.startPvp` (mesmo padrão de `createConsortiaBattleRoom`/`createRingStationBattle` — luta de
  verdade, sem resultado inventado pelo cliente); `162/4` (lista de campeões) devolve o layout real que o
  AS3 lê (`EliteGameController.__detailHandler`: id/nome/rank/roundsReached/eliminated por jogador). Prêmios
  por colocação final via `claimOnce` (chave por janela, 1× por jogador, mesmo padrão de `finishWorldBoss`).
  Nenhuma migração nova (estado do bracket em memória, como `NewHallRoom`/boss mundial). Sem exploit novo:
  nenhuma recompensa sai antes do `claimOnce`, nenhum round pode ser disparado 2x pelo mesmo jogador
  (`pending` em memória, mesmo padrão do `m3-ringstation`). `apps/game/src/handlers/eventos/liga-elite.ts`,
  `apps/game/src/rooms/room-mgr.ts`. Teste: `apps/game/test/elite-brackets.test.ts`.
- [x] **m3-chick-activation** (2026-10-19) — `84 ACTIVITY_PACKAGE` "chick activation": a descrição desta
  tarefa também estava desatualizada — **já estava feito** desde o commit `14a63a1` (bem antes dela ser
  escrita). `apps/game/src/handlers/eventos/ativacao-pintinho.ts` já tem os 4 tiers (diário/fim-de-semana
  `onThreeDay`/semanal-sábado/10 marcos de nível), código de 14 chars com `claimOnce` global (sem reuso
  entre contas) + item 201316 (`activateChickItem`, ligado em `handlers/loja/usar-prop.ts` 66 PROP_USE) como
  caminho alternativo de ativação, recompensa sempre por correio (nunca bolsa, igual ao original). Testes já
  existentes (`apps/game/test/activities.test.ts` describe "84 ACTIVITY_PACKAGE ChickActivation") cobriam
  código errado/reuso de código; esta tarefa endureceu a cobertura pro que faltava claramente no pedido
  ("claim-once, no reuse"): +1 teste de reivindicação dupla do tier diário no MESMO dia UTC (2ª tentativa
  cai em `NotFoundAward`, sem 2º e-mail) e +1 teste do caminho do item 201316 (consome exatamente 1 unidade,
  reuso recusado sem consumir a 2ª). Tiers de fim-de-semana/semanal/nível não ganharam teste dedicado (sem
  injeção de relógio no `ServerContext` — `now: () => new Date()` fixo em `server.ts` — testar
  determinística o dia-da-semana exigiria tocar um arquivo compartilhado por uma tarefa só; documentado aqui
  em vez de arriscar). Nenhum código de produção mudou (já estava correto); nenhuma migração. Sem exploit
  (claimOnce já cobria tudo). `apps/game/test/activities.test.ts` (+2 testes).

**Endpoints (.ashx/.xml) — resto do `research/6600/ashx-missing.md`, não feito no `m3-ashx`:**
- [ ] **m3-endpoints-aninhados** — `CommunalActive.xml` (3 tabelas: `game.Communal_Active` + `_Award` +
  `_Exp`) e `GmActivityInfo.xml` (4 tabelas: `game.GM_Activity`/`GM_Gift`/`GM_Active_Reward`/
  `GM_Active_Condition`) — as tabelas já existem (`packages/db/src/schema/game.ts`), só falta ler o
  analyzer AS3 certo (`ddt/loader/LoaderCreate.as`) pra montar o XML aninhado certo (mesmo padrão do builder
  `achievementlist` em `apps/api/src/templates/defs.ts`, que já aninha `Item_Condiction`/`Item_Reward`).
  Não é falta de schema, é complexidade de builder — por isso ficou de fora do `m3-ashx`.
- [ ] **m3-endpoints-schema** — endpoints que precisam de tabela nova: `ButtonConfig.xml`,
  `ChargeSpendRewardTemplateInfoList.xml`, `FoodComposeList.xml`, `ItemStrengthenData.xml`,
  `LoadAllQuestions.xml`, `LoadChargeActiveTemplate.xml`, `LotteryShowTemplate.xml`, `MagicItemTemp.xml`,
  `MissionEnergyPrice.xml`, `SearchGoodsPayMoney.xml`, `WarriorFamRankList.xml`, `GoodsCollect.xml`.
  `HelpGameReward.xml` SAIU desta lista: feito no `m4-resgate` sem tabela nova (servido de
  `app."ScheduledEvents"`, ver abaixo). Detalhe de cada um (por que não tem tabela, candidatos descartados)
  em `research/6600/ashx-missing.md` §Pendências.
- [ ] **m3-endpoints-sem-fonte** — `GetFightReport`, `ConsortiaMatchHistory`, `DragonBoatFriendInfos`,
  `LoginRemoveSmallAccount`, `ProxyVIP`, `RecordSysInfo`, `RecordUserVersion`, `ResetPassword4399`: sem
  `.cs` em nenhum vendor — só revisitar se aparecer outro dump do 6600; não implementar comportamento
  adivinhado (regra do projeto: comportamento bate com o C# original, nunca chute).

### M4 — features novas da referência DDClássico
Ordem de confiança do mapa (`MIGRACAO-6600.md` §4): nome bate exato com a feature pedida primeiro, "a
confirmar jogando" depois. Cada uma depende do pacote/sistema M3 correspondente quando citado.
- [x] **m4-coleta** (2026-10-19) — Coleta (`collectiontask.swf`, `261 COLLECTION_TASK`). **Alcançável**:
  sim, mas sem ícone de hall próprio — só pelo botão "ir até o local" de uma missão ativa cuja 1ª condição
  seja `CondictionType===64` (`quest/TaskMainFrame.as:953-956`/`hall/tasktrack/HallTaskTrackListCell.as:389-391`).
  C# original tem lógica real de verdade (`Game.Server.CollectionTask.*`, sala global + `CollectionTaskCondition`
  nas Quests) — portado fielmente: sala global (`apps/game/src/game/collection-task.ts`, mirror de
  `CollectionTaskRoom.cs`) pros sub-códigos 2 WALK/4 QUIT/5 INIT_PLAYERS, mais a condição de missão 64
  (`apps/game/src/game/quests.ts onCollectionTaskCollect`, conta PRA CIMA até Para2 — oposto do padrão
  countdown do resto do arquivo) pro 3 COLLECT. Handler: `apps/game/src/handlers/eventos/coleta.ts`.
  **Fixed vs original**: WALK broadcast só escrevia 3 campos mas o leitor AS3 espera 4 (id/x/y/path) — todo
  andar remoto de outro jogador quebrava (ponto NaN) no servidor real; aqui manda um path de 1 ponto real.
  **Exploit evitado (não existe no original)**: COLLECT confiava no `collectedId` do cliente sem limite de
  frequência — span = terminar a missão instantaneamente sem jogar o minigame; cooldown de 4s por jogador
  (replica os ~117 frames reais da animação de progresso) fecha isso sem afetar um cliente real. Gap mantido
  (documentado, não corrigido): `ADD_ONE_PLAYER` nunca é emitido no original (sem caller) — um jogador que
  entra depois nunca é anunciado pros que já estavam lá; replicado como está. Admin gate novo (pedido pela
  tarefa, sem equivalente no original): `isOpen(ctx,"collection_task")` via `app."ScheduledEvents"`. Sem
  migração (progresso vive em `QuestData.ConditionN`, mecanismo já existente). Testes:
  `apps/game/test/client-6600-m4-coleta.test.ts` (6).
- [x] **m4-resgate** (2026-10-19) — Resgate (`rescue.swf`, `277 RESCUE`). **Alcançável**: a tela abre
  (`RescueManager.show()`, limite Grade>=20), mas o ÍCONE do hall só aparece com `IS_OPEN=true`
  (`createRescueBtn`) e **zero C# em qualquer vendor** implementa/envia isso (confirmado por grep completo:
  nenhum `PacketHandler(277`, nenhum hit de `RESCUE`/`Rescue` fora do enum `ePackageType.RESCUE=277`) — o
  ícone nunca aparece em produção original. Desenhado 100% do contrato AS3 (mesma categoria do
  `m3-trusteeship`): `apps/game/src/game/rescue.ts` (lógica + persistência) + `apps/game/src/handlers/
  eventos/resgate.ts` (pacote). 6 cenas fixas (sceneId 1-6), cada uma uma missão PvE REAL reaproveitando o
  `Pve_Info` clássico (id 7 = "Resgate do Pintinho", achado temático bom), configurável por cena via
  `Server_Config`. CHALLENGE(3) passa pelo motor de PvE de verdade (`RoomMgr.createRescueRoom` → novo método,
  mesmo padrão de `createRingStationBattle` → `FightEngine.startPve`; novo `RoomType.Rescue=70`, fora do
  range real do enum `eRoomType`/`eGameType` mas ainda dentro de 1 byte — todo pacote de sala escreve
  RoomType/GameType como `writeByte`, achado testando: `900` dava overflow silencioso igual ao original faria,
  mas corrompia o valor lido de volta no teste); score/estrela vêm do kill count real da luta
  (`onPlayerGameOver` em `server.ts`), nunca de um pacote do cliente. GET_PRIZE(8) é claim-once (status de
  2 bits por tier, 3 tiers, persistido); CLEAN_CD(5)/BUY_ITEM(4) cobram de EXATAMENTE um pool de moeda (bound
  OU livre, nunca os dois — replica o `isBand` do `RescueMainFrame.as`) ANTES de aplicar qualquer efeito.
  Admin on/off: `app."ScheduledEvents"` kind "rescue" (mesmo padrão `consortia_battle` — a janela é quem
  torna o ícone alcançável, já que o original nunca ligou isso). Migração aditiva
  `packages/db/drizzle/0021_messy_warlock.sql` (`player."Sys_Users_Rescue"`, hand-added, sem equivalente em
  nenhum vendor — ver cabeçalho em `packages/db/src/schema/player.ts`). `HelpGameReward.xml` (lista de
  recompensa que a TELA também carrega, antes em `m3-endpoints-schema` como "precisa schema novo") servido
  nativamente de `apps/api/src/templates/defs.ts`, lendo o MESMO `app."ScheduledEvents"` que o grant real usa
  — display do cliente e recompensa do servidor nunca desincronizam, sem tabela nova (achado: `SqlDataProvider.
  Data/HelpGameRewardInfo.cs` + `Bussiness/Managers/HelpGameRewardMgr.cs` existem no vendor, mas sem SP/linha
  real — mesma categoria "0 linhas na origem" do baú da galinha/dados). Testes:
  `apps/game/test/client-6600-m4-resgate.test.ts` (11), `apps/api/test/api.test.ts` (+2).
- [x] **m4-catchbeast** (2026-10-19) — Capturar Nian (`catchbeast.swf`, `CatchBeastPackageType`). **Dispatch
  confirmado**: sub-códigos 32 BEGIN/33 VIEWINFO/34 CHALLENGE/35 BUYBUFF/36 GETAWARD do `CatchBeastPackageType`
  são o MESMO enum (`ActiveSystemPackageType`) do `145 ACTIVITY_SYSTEM` já roteado — despachados por
  `caminho-da-luz.ts activitySystemRouter` (`eventos/captura-nian.ts`), sem código novo no registro de 145.
  **Alcançável**: sim — real sender existe (`GamePlayer.cs:3714-3716`, `Out.SendCatchBeastOpen` no login, só
  trocado o gate de uma data hardcoded de 2014 pro admin `app."ScheduledEvents"` kind "catchbeast", igual
  todo outro item M4). **REAL lógica C#** (diferente de `m4-coleta`/`m4-resgate`, que não tinham ou tinham
  design próprio): `Game.Server.ActiveSystem.Handle.Catchbeast{ViewInfo,Challenge,Buybuff,GetAward}.cs`
  portados fielmente em `apps/game/src/game/catchbeast.ts` + `handlers/eventos/captura-nian.ts`. Luta REAL
  via o motor de PvE de verdade (`RoomMgr.createCatchBeastRoom` → `FightEngine.startPve`, `eRoomType.
  CatchBeast=26`/`eMap.CatchBeast=1347` — valores REAIS do enum, diferente do `RoomType.Rescue=70`
  fabricado): NPC 73000 "Nian" já existia nos dois snapshots de seed (`NPC_Info`/`NPC_Info2`,
  `Script: GameServerScript.AI.NPC.YearMonster`, `Blood=3000000` batendo com `YearMonsterHP`) — só faltavam
  as linhas `Pve_Info`/`Mission_Info` ligando ele a uma sessão jogável (mesma categoria do gap do Labirinto,
  migração 0011). Script transpilado a mão (`packages/fight/src/pve/scripts/manual/catchbeast.ts`, sem
  `generated/` equivalente pra esse caminho do donor): `Game/YearMonster.cs` + `Messions/YearMonster1347.cs`
  + `NPC/YearMonster.cs` (4 padrões de ataque A/B/C/D do Nian). Dano total vira o hook `onCatchBeastHurt`
  (`fight/ddt.ts`, 2 linhas — mesmo formato de `onWorldBossHurt`, `GAME_ALL_MISSION_OVER.totalHurt`,
  incondicional vencer/perder igual o `UpdatePveResult("yearmonter",...)` original). **Exploit evitado (bug
  real do original)**: `CatchbeastGetAward.cs` só confere o threshold de dano (`method_0`) antes de conceder
  — NUNCA confere se o tier já está "3" (claimed), então reenviar `GETAWARD` com o mesmo índice reclamava a
  recompensa de novo pra sempre; `tierStatus !== 2` (claimable, nunca já reclamado) é o guard adicionado.
  **Gap documentado, não corrigido (fora do escopo)**: `CatchbeastBuybuff.cs` aplica `BufferList.
  CreatePayBuffer(400/406,...)` (`FightBuffs` genéricos) além de cobrar Xu — nenhum mecanismo de "buff de
  stat temporário" existe em `packages/fight`/`apps/game` ainda, nem pro Boss Mundial usar o MESMO buff na
  entrada da sala dele (`GameRoomCreate.cs:46-47`, também não portado) — comprar cobra o ouro certo mas não
  concede bônus na luta (mesmo gap do Boss Mundial, tocaria código compartilhado, fora desta tarefa). Prêmios
  dos 5 tiers de dano (templateIds 112370-112374, `GameProperties.YearMonsterBoxInfo`) não têm dado de
  loot-table em nenhum vendor — `rewardsFor` dá um prêmio próprio (ouro, documentado, admin-configurável),
  mesma categoria do `game/rescue.ts`. Migração: `packages/db/drizzle/0022_bright_rogue.sql` (tabela nova
  `player."Sys_Users_CatchBeast"`, hand-added — `ActiveSystemInfo` do C# é 1 linha com ~25 colunas de
  eventos não relacionados, só as 5 colunas do Capturar Nian foram portadas — + as linhas `Pve_Info`/
  `Mission_Info` ID 1347, idempotentes). `git fetch` antes de gerar: develop ainda em 0021 (outro agente não
  tomou 0022 ainda). Testes: `apps/game/test/client-6600-m4-catchbeast.test.ts` (8) — `pnpm --filter @ddt/game
  test` e `pnpm --filter @ddt/api test` verdes antes e depois. `research/6600/coverage-m3.md` reexecutado.
  Trabalho PT-BR/arte pendente (tela nova, sem remaster/i18n ainda): ver `m5-remaster-telas-novas`/
  `m5-i18n-telas-novas` abaixo (`catchbeast.swf` acrescentado às duas listas — nenhuma task nova precisa, o
  padrão já é "toda tela 100% nova entra nessas duas").
- [ ] **m4-catchbeast-buff** — camada de "buff pago dentro da luta" (`CreatePayBuffer`, ids 400/406) no
  `packages/fight`: hoje o BuyBuff da Captura do Nian (145/35) e do boss mundial (102/38) RECUSAM sem cobrar
  (2026-10-19), porque cobrar sem efeito seria vender vento. Ao portar o efeito, voltar a cobrar (preço de
  `YearMonsterBuffMoney`/30 Money) e só depois aplicar. Pensar no anti-P2W: buff comprado com Money (cupom) é
  vantagem paga — considerar ouro/moeda de evento no servidor oficial, configurável no admin.
- [x] **m4-passe-classico** (2026-10-19) — Passe Clássico / battle pass (`growthpackage.swf`,
  `GrowthPackageType.as`). **C# real**: `ActivityPackageHandler.cs` case `GROWTHPACKAGE` existe nas duas
  versões, mas só está ligado na 6600 (`vendor/DDT-6600/.../ActivityPackageHandler.cs:23-117`) — no 4.1
  (`vendor/DDTank41/.../ActivityPackageHandler.cs:31-134`) o case inteiro está dentro de um `#region`
  comentado, nunca rodou em produção. **Alcançável**: NÃO no cliente 4.1 (dispatch também comentado em
  `SocketManager.as:1032-1035`, sem pasta `growthPackage`/`growthpackage.swf` em `vendor/DDTank41` nem em
  `apps/api/assets/flash` — dead dos dois lados); SIM no cliente 6600 (`?client=6600`,
  `GrowthPackageManager.instance.setup()` no boot + ícone real no hall), servido pelo fallback genérico
  `/flash6600/*` sem precisar copiar nada (sem overlay próprio ainda, texto turco original — remaster/PT-BR
  listado como `m5-growthpackage` abaixo). 9 marcos por NÍVEL (Grade >= 10/20/30/40/45/50/55/60/65, mesmos
  números do `GrowthPackageModel.gradeList`), recompensa real (`game."Activity_System_Item"`
  `ActivityType=20`, 58 linhas reais na origem, já servidas ao cliente por `/activitysystemitems.ashx` sem
  trabalho novo — só precisou ler server-side, `ctx.templates.growthPackage(tier)` em `db/templates.ts`).
  **Design sem pay-to-win** (pedido do dono, `README.md`): o original debita Money (cupom/real) no 1º
  marco; aqui debita **Gold** (ganhável jogando — escolhido sobre Honra/`myHonor` porque Honra é só
  PvP/ranqueado e excluiria quem joga só PvE), preço default **0** (free-by-level), configurável via
  `Server_Config` `PromotePackagePrice` (mesma chave do original, só reinterpretada em Gold) +
  `IsPromotePackageOpen` (liga/desliga, default fechado igual ao C#). Do 2º marco em diante nunca cobra
  nada, igual ao design original (só o 1º resgate paga). **Bug corrigido** (dano ao jogador, não exploit
  que beneficia — AGENTS.md "nunca replicar"): original debitava a moeda ANTES de checar o nível, perdendo
  a moeda do jogador sem entregar nada se o nível não batesse; aqui checa nível e saldo ANTES de debitar.
  **Limitação conhecida** (documentada, não corrigida — exigiria remendar o AS3, fora de escopo): o cliente
  6600 compara `Self.Money` (não Gold) antes de mandar o pacote de compra — com preço `0` (default) isso
  nunca trava ninguém; se o admin configurar preço > 0 em Gold, jogadores com Money baixo (quase todo
  mundo, servidor sem pay-to-win) caem na tela de recarga sem mandar o pacote, mesmo tendo Gold de sobra.
  Migração aditiva `packages/db/drizzle/0022_third_queen_noir.sql` → **renumerada pra
  `0023_<nome>.sql` no merge final** (0022 já foi usado por `m4-catchbeast` em paralelo — ver nota do
  orquestrador): 1 coluna nova em `player."Sys_Active_System_Data"` (`AvailTime`, sem equivalente na nossa
  captura de schema 4.1 — 6600 nunca teve o player DB dumpado — mesma categoria "additive, no vendor DDL"
  do `Sys_Users_Rescue` de `m4-resgate`). Implementado: `apps/game/src/handlers/eventos/passe-classico.ts`
  (packet 84 ACTIVITY_PACKAGE sub-cmd 1, despachado em `eventos/index.ts` ANTES de `ativacao-pintinho.ts`,
  que só recebe sub-cmd 2 agora — assinatura ajustada pra receber o 1º int já lido, sem reler), 2 builders
  novos em `packets/out.ts` (`growthPackageIsOpen`/`growthPackageState`), 1 campo novo em `GamePlayer`
  (`lastGrowthPackageClaim`, espelha `LastOpenGrowthPackage`, em memória, não persiste — igual ao original),
  hook de login em `session/login.ts` (6600 only). Testes:
  `apps/game/test/client-6600-m4-passe-classico.test.ts` (6). Doc: `docs/features/passe-classico.md`.
- [ ] **m4-vestir-encanto-reliquias** — Vestir com Encanto (`enchant.swf` + `playerdress.swf`,
  `280 ITEM_ENCHANT`, listado em M3 "Bolsa/Itens") + Relíquias de verdade (`magicstone.swf`, bag separada —
  hoje o dano mágico usa a EquipBag normal, nota do `m3-figurino`). "A confirmar jogando"
  (`MIGRACAO-6600.md` §4) antes de desenhar a UI.
- [ ] **m4-liga-exploradores** — Liga dos Exploradores (`kingdivision.swf`, `328 KING_DIVISION`). Depende
  de cross-server — decisão já tomada em `research/6600/crosszone.md` (**não** portar Crosszone de
  verdade; implementar como matchmaking local).
- [ ] **m4-eventos-sazonais** — escolher 1-2 de `christmas.swf`/`halloween.swf`/`newyearrice.swf`/
  `worshipTheMoon.swf`/`dragonboat.swf`/`magpiebridge.swf`/`cryptBoss.swf`/`bombking.swf` (não os ~8 de
  uma vez, `MIGRACAO-6600.md` §5 M4) — pedir ordem ao dono antes de começar.
- [x] **m4-montaria** (2026-10-19, parte 1) — Montaria (`horse.swf` 2.1 MB, maior SWF novo), `260 HORSE`
  (`HorsePackageType.cs`/`horse/HorseManager.as`): posse/trocar/equipar (sub 2), subir de nível/alimentar
  (sub 3), subir skill (sub 5), equipar/desequipar skill (sub 6), ativar montaria "especial"/cherish (sub 7)
  + os 2 pushes só-servidor (sub 1 GET_ALL_DATA, sub 8 HORSE_PICCHERISH_INFO, no login). Bônus de stat
  aplicado de verdade: `Mount_Template` (nível, `curUseHorse>0`) + TODO `Mount_Draw_Template` já desbloqueado
  (soma incondicional, não só o "ativo" — confirmado lendo `PlayerHorse.GetPicCherishs`) entram em
  `game/stats.ts computeStats`/`getBaseAttack`/`getBaseDefence` (igual `m3-figurino` fez pro dano mágico).
  Tabelas já existiam desde `m1-schema` (`Mount_Data`, `Mount_Template`, `Mount_Draw_Template`,
  `Mount_Skill_Template`, `Mount_SKill_Get_Template`) e já estavam seedadas — **achado**: os ITENS reais do
  sistema (`Shop_Goods` TemplateID 11164/11165 "pílula"/"esfera" de melhoria + os 15 TemplateId de
  `Mount_Draw_Template`) estavam faltando no `packages/db/seed/game/Shop_Goods.json.gz` curado (achado
  rodando os testes: `findItem` voltava `undefined`) — adicionadas as 17 linhas reais faltantes a partir do
  dump bruto `vendor/_dbexport/Project_Game6600/data/Shop_Goods.json` (não é migração, é dado estático; sem
  tocar schema). **Fixed vs o original**: `GamePlayer.GetBaseDefence` (6600, decompilado) reusa
  `mountTemplate.AddDamage` em vez de `.AddGuard` (bug de copy-paste que soma o Dano da montaria na Armadura
  e deixa `AddGuard` morto) — corrigido pra ler `AddGuard`; `ActiveHorsePicCherish.cs` nunca recomputa stats
  na borda desmontado->montado quando o "cherish" já era dono antigo (só a adição de um NOVO reconhece) —
  sempre recomputa aqui (mesma régua do `docs/features/passe-classico.md` §5: nunca repetir um comportamento
  ruim do original, só exploit real ou não). Anti-P2W: o custo é 100% item (nunca Money/Gold direto no
  handler), itens `CanDrop=true` na origem (ganháveis por drop, não só comprados); a única linha viva de
  `game."Shop"` que vende o item 11164 por Money (`ShopID=1`, loja principal) é dado em massa do dump
  original, não introduzido por esta tarefa — fora de escopo re-precificar uma tabela grande e compartilhada
  por isso só (análise completa em `docs/features/montaria.md` §5). Não portado (gap documentado): a
  "Escritura" (Deed) dar 2-3 usos grátis de feed/skill-up (`UseDeed(12/13)`) — mesma categoria do gap já
  registrado em `m3-king-bless-deed` (dicionário de efeito por-atributo nunca ligado); sincronizar
  `MountsType`/visual da montaria pros OUTROS jogadores no hall (sem coluna `Sys_Users_Detail.MountsType`
  portada, mesmo gap já citado em `game/player.ts hallPetsId`) — só o próprio jogador vê/sente o bônus real
  hoje. `apps/game/src/handlers/montaria/montaria.ts`, `game/montaria.ts`, `db/montaria.ts`. Testes:
  `apps/game/test/client-6600-m4-montaria.test.ts` (12). Sem migração nova (tabelas já existiam; seed de
  item é dado estático). Deixado pro `m4-montaria-2`: Corrida de Montaria (`horseRace.swf`, `282 HORSERACE`).
- [ ] **m4-montaria-2** — Corrida de Montaria (`horseRace.swf`, `282 HORSERACE` — `sendHorseRaceItemUse`/
  `sendHorseRaceItemUse2`/`sendHorseRaceEnd`/`buyHorseRaceCount`, `horseRace/data/HorseRacePackageType.as`).
  C#: `Game.Server.Rooms/BaseHorseRaceRoom.cs`/`CreateHorseRaceRoomAction.cs`/`eStepHorseRace.cs`,
  `Game.Server.BuffHorseRace/*` (buffs de corrida), `Game.Server.Packets.Client/HorseRaceHandler.cs`. Ainda
  não investigado a fundo por esta tarefa (fora do tempo da parte 1) — confirmar reachability (ícone do hall
  aberto por algum `SendXxxOpenClose` de verdade ou morto, igual várias features do M3) antes de portar
  lógica. `Mount_Data.horseracecanracetime` (`Sys_Users_Detail`, achado em `research/6600/db-diff.md` §2.2)
  é o gate de "pode correr"; conferir se existe de verdade no nosso schema antes de usar.
- [ ] **m4-ringstation-ui** — ligar a UI (`ringstation.swf`) ao backend de `m3-ringstation` quando pronto
  (trabalho client-side/wiring, não lógica de servidor nova).

### M5 — remaster HD + PT-BR (contínuo, em paralelo com M3/M4)
- [ ] **m5-remaster-telas-novas** — toda tela 100% nova portada em M3/M4 (sem equivalente 4.1 pra reusar
  remaster) precisa do pipeline completo `tools/remaster/*` (igual M1 `m1-bitmap-text`/`m1-swf-text`) antes
  de ir pro ar — não é uma tarefa só, é um passo final de cada tarefa M3/M4 que adicionar SWF novo. Inclui
  agora `collectiontask.swf` (m4-coleta), `rescue.swf` (m4-resgate), `catchbeast.swf` (m4-catchbeast) e
  `horse.swf`/`horseRace.swf` (m4-montaria, parte 1 — só o backend/pacotes; a UI de Montaria continua 100%
  turca, sem overlay) — nenhum texto/imagem revisado ainda (fora do escopo das tarefas de backend, só
  pacote/persistência/motor de PvE).
- [ ] **m5-i18n-telas-novas** — `tools/i18n/skelleton-match.mjs` contra `language.txt` das telas novas
  (mesmo método de `m1-lang-ptbr`, dado de entrada novo por tela).
- [ ] **m5-growthpackage** (`growthpackage.swf`, m4-passe-classico): (a) remendar
  `growthPackage/GrowthPackageManager.as:173-192` pra comparar Gold em vez de Money antes de mandar
  `sendGrowthPackageOpen` (hoje, com preço > 0 configurado, jogadores com Money baixo caem na tela de
  recarga mesmo tendo Gold de sobra — ver `docs/features/passe-classico.md` §7, sem impacto com o preço
  default `0`); (b) remaster HD + tradução PT-BR do SWF (hoje serve o original em turco, sem overlay —
  mesma pendência de `m5-remaster-telas-novas`/`m5-i18n-telas-novas` acima, só que esta tela nem estava
  listada ainda porque não tinha SWF nenhum portado antes desta tarefa).
- Critério de saída do M5 igual ao descrito em `MIGRACAO-6600.md` §5: telas novas com texto PT-BR e visual
  remasterizado, sem arte/branding do DDClássico.

## 2. Canais (Canal 1, 2, 3…)
Desenho em [MIGRACAO-6600.md — Requisito futuro](./MIGRACAO-6600.md#requisito-futuro-vários-canais-decisão-do-dono-2026-10-17).
Como rodar um 2º canal hoje (sem `ch-processo`/`ch-bus`): [GAME-SERVER.md §Canais](../GAME-SERVER.md#canais-vários-servidores-ch-tabelach-admin).
- [x] **ch-tabela** (2026-10-18) — 4 colunas novas em `player."Server_List"` (migração `0014_sad_cardiac.sql`,
  additive, rollback em `packages/db/README.md`): `Enabled`, `SortOrder`, `InternalUrl`, `PvpOnly`.
  `ServerList.ashx` (`apps/api/src/request/endpoints/ServerList.ts`) agora lista toda linha `Enabled`, na ordem
  `SortOrder, ID`, com `IP`/`Port` da própria linha (fallback `GAME_HOST`/`GAME_PORT` quando a linha não tem —
  o canal seed "Reborn" continua assim, seed exportado de novo com `IP`/`Port` nulos) e `Port` certo por
  cliente (4.1 soma 69 fora, 6600 direto) nos dois casos. `Online`: canal local (`cfg.SERVER_ID`) em tempo
  real via `GAME_INTERNAL_URL`; outros canais mostram o valor da própria linha, que `apps/game` grava a cada
  heartbeat (`src/db/templates.ts heartbeat`, além do `app."Servers"` de sempre). `apps/game`/`apps/api` já
  tinham `SERVER_ID` (default 4) selecionando o canal em tudo que precisa (templates/boot, login,
  `upsertServer`/heartbeat) — não precisou renomear pra `CHANNEL_ID`, só documentar + usar no `apps/api`.
- [x] **ch-admin** (2026-10-18) — página "Canais" (`apps/admin/src/resources/channels.ts`, resource
  `server-list`, já existia no whitelist `apps/api/src/routes/admin-resources.ts`): nome, host/porta pública,
  estado (select PT-BR do enum original: manutenção/aberto/quase cheio/cheio), ordem, capacidade, nível
  mín./máx., flags (canal novato, só PvP), URL interna (metadado pra `ch-processo`). CRUD genérico de
  `routes/admin.ts` reusado sem mudança; escrever na tabela agora dispara `/reload-templates` no canal local
  (`Room`/`Total`/`ZoneId`/`ZoneName` recarregam sem reiniciar o `apps/game`).
- [x] **ch-processo** (2026-10-18) — produção: `scripts/channels-compose.mjs` lê `player."Server_List"` e gera
  `docker-compose.channels.yml` com 1 serviço `game-<ID>` por canal habilitado (além do local, inalterado no
  `docker-compose.yml` base), grava de volta `Port`/`InternalUrl`/`WsUrl` escolhidos (idempotente). Dev:
  `scripts/dev.mjs CHANNELS=5,6` / `--channels 5,6` sobe processos locais extras em portas livres (9500+),
  sem tocar no canal/portas padrão. `ServerList.ashx` agora consulta `/status` do `InternalUrl` de cada canal
  remoto (cacheado ~5s) em vez de só mostrar o `Online` gravado; `auth.ts playConfig` monta 1 entrada de
  `socketProxy` por canal (`WsUrl`, migração `0015_blue_frog_thor.sql`) pro Ruffle conectar em qualquer canal.
  Bug real corrigido em `apps/game`: `resetAllOnline` no boot zerava o `State` online de TODO jogador no
  Postgres, de qualquer canal — agora escopado por `OnlineServerID` (mesma migração). Teste de integração
  `apps/game/test/ch-processo.test.ts` (2 `GameServer` em processo, `SERVER_ID` 4/5, mesmo PGlite). O que ainda
  falta (`ch-bus`): login único entre canais, chat mundial, presença de amigos/sociedade cross-canal, eventos
  globais coordenados, trocar de canal sem relogar, TLS no WS dos canais extras — ver
  `docs/GAME-SERVER.md` "Canais" §"O que ainda não funciona com 2+ canais".
- [x] **ch-bus** (2026-10-18) — barramento entre canais em `apps/game/src/bus/` (`Bus` pub/sub: `createRedisBus`
  via `ioredis` quando `REDIS_URL` setado, `createNoopBus` padrão — canal único idêntico a antes desta tarefa —
  e `createMemoryBus` só de teste) + coordenação em `bus/cross-channel.ts` (`wireCrossChannel`, 1x por
  `GameServer.start()`): login único entre canais (`session/login.ts` pede kick cross-canal, espera até 5 s
  por ack, igual o kick local já fazia), sussurro (160/51) entregue em outro canal antes de responder
  "offline", chat mundial/alto-falante (19 SCENE_CHAT, lobby sem sala) repassado pros outros canais (chat de
  clã/termas/capela/sala continua só local, por desenho), presença de amigo/sociedade (160/165 FRIEND_STATE)
  em tempo real entre canais (a lista em si, `IMListLoad.ashx`/`ConsortiaUsersList.ashx`, já lia o Postgres
  compartilhado desde `ch-processo` — isto só adiciona o ping imediato pra quem já tem a tela aberta).
  `docker-compose.yml` ganhou um serviço `redis` opcional (`apps/game/.env` `REDIS_URL`, compartilhado por
  todo `game`/`game-<ID>` via `env_file`). Teste `apps/game/test/ch-bus.test.ts` (2 `GameServer` em processo
  ligados por `createMemoryBus`). `ch-eventos` e `ch-troca` (abaixo) fecharam o resto da lista; falta só TLS
  no WS dos canais extras (polish de deploy) e chat de clã cross-canal (fora do escopo pedido — mesmo padrão
  de `ctx.crossChannel`, só um tópico novo, se vier a ser pedido). Ver `docs/GAME-SERVER.md` "Canais" §"ch-bus".
- [x] **ch-eventos** (2026-10-18) — boss mundial com HP/ranking COMPARTILHADO entre canais: líder = menor
  `SERVER_ID` entre os canais vistos vivos (`apps/game/src/bus/leader.ts wireLeaderElection`, gossip por
  "hello", sem lock no Postgres — `claimOnce` já cobre o split-brain curto); só o líder decrementa `blood`/
  ranking de verdade (`handlers/eventos/boss-mundial.ts applyBossDamage`), um seguidor repassa o dano
  (`ctx.crossChannel.bossDamage`) e espelha o estado que o líder replica (`bossSync`/`bossOpen`/`bossClose`);
  prêmio pro ganhador logado num canal diferente do líder atravessa canal (`ctx.crossChannel.deliverReward`,
  mesmo padrão do `whisper` do `ch-bus`). Liga/elite/double exp-gold/weekly_reset NÃO precisam de líder — cada
  canal já tickava o próprio `EventScheduler` contra o mesmo `app."ScheduledEvents"` + relógio (mesma janela,
  mesma chave) e `claimOnce` já garantia "uma vez por jogador"; forçar um líder ali regrediria o x2 local
  (`scheduler.rate()` lido por fight em cada canal). Aviso de admin (`POST /broadcast`) agora replica pros
  outros canais (`ctx.crossChannel.systemNotice`) + `apps/api` ganhou `POST /api/admin/broadcast`. Teste:
  `apps/game/test/ch-eventos.test.ts` (2 `GameServer` em processo com `createMemoryBus`, igual `ch-bus.test.ts`):
  dano nos dois canais reduz o MESMO HP e paga uma vez só mesmo com o ganhador no seguidor; liga abre a mesma
  janela nos dois; aviso de admin chega nos dois. Testes de 1 canal só continuam iguais (NoopBus = sempre
  líder, caminho síncrono de antes). Ver `docs/GAME-SERVER.md` "Canais" § `ch-eventos`.
- [x] **ch-troca** (2026-10-18) — trocar de canal sem relogar. O cliente (4.1 e 6600, mesmo mecanismo) já
  faz isso pelo dropdown do hall fechando o socket atual e reabrindo um novo pro canal escolhido, reenviando
  LOGIN com a MESMA conta+tempPwd do 1º login (sem `.ashx` novo) — `research/client/channel-switch.md`
  (file:line do AS3 nos dois clientes). As 3 peças que esse fluxo precisa já existiam: ticket reutilizável
  dentro do TTL (`validateGameLogin`, não invalida GameKey), canal antigo salva/libera sem brigar com o login
  novo (`ch-bus` kick cross-canal, mesmo `quitPlayer` idempotente do close local do cliente) e Ruffle com 1
  `socketProxy` por canal (`ch-processo`). Nenhum código de produção mudou; o que faltava era nomear/testar o
  cenário explicitamente — `apps/game/test/ch-troca.test.ts` (troca 4→5 com o mesmo ticket, dado salvo antes
  da troca completar, online só no destino, `clientKind` sobrevive, 3 trocas seguidas sem loop de kick).

## 3. Pix (doação, sem pay-to-win)
- [x] **pix-provedor** — provider-agnostic (`apps/api/src/pix/`, interface `PixProvider`): `fake` (dev/teste,
  default), `static` (Pix estático, BR Code EMV gerado localmente, sem PSP/webhook) e `mercadopago` (PSP real,
  escolhido entre Efí/Mercado Pago/Asaas — ver trade-offs em `docs/features/doacao-pix.md`). Chaves só em `.env`
  (`apps/api/.env.example`), nunca chamado em teste.
- [x] **pix-api** — `app."Donations"` (migration `0017_yummy_shriek.sql`); `POST /api/donations` (rate limit),
  `GET /api/donations/:id` (polling), `GET /api/donations/summary` (público), `POST /api/pix/webhook`
  (assinatura verificada por provedor, idempotente). BR Code + CRC16-CCITT com testes de vetor conhecido
  (`apps/api/test/pix-brcode.test.ts`); fluxo completo testado com o provedor fake
  (`apps/api/test/donations.test.ts`).
- [x] **pix-site** — página `/apoiar` (`apps/web/src/pages/Apoiar.tsx`): explica não-P2W/sem fins lucrativos,
  escolhe valor, mostra QR + copia-e-cola, faz polling do status, tela de agradecimento, meta do mês e lista
  de apoiadores opt-in. Link no menu do site.
- [x] **pix-admin** — página "Doações" (`apps/admin/src/pages/Donations.tsx`): settings (meta/min/max/enabled),
  lista com filtro por status/provedor (`apps/admin/src/resources/donations.tsx`), "Marcar como pago"
  (fake/static só), exportar CSV.
- [x] **pix-transparencia** — página pública `/transparencia` (`apps/web/src/pages/Transparencia.tsx`): custo
  mensal do servidor (campo opcional novo em donation-settings, admin) × total doado no mês; link no rodapé do
  site. Sem custo preenchido, mostra um aviso em vez do comparativo (não força o dono a divulgar um número).

## 4. Site + admin premium
- [x] **site-design** (2026-10-18) — hero parallax, features, pódio no ranking, motion (framer-motion,
  respeita reduced-motion), SEO por página (`lib/seo.ts`), code-split por rota, testes vitest no `apps/web`.
  Arte pendente (slots em `apps/web/README.md`): `public/art/hero-bg.webp`, `public/art/og-cover.jpg`.
- [ ] **site-play** — página de jogo com seleção de canal e launcher (toggle 4.1/6600 beta já feito no `site-design`).
- [x] **admin-ux** (2026-10-18) — campo `ref`/`ref-multi` no CRUD (nome/ícone no lugar do id, picker com
  busca, clique abre o registro; lookup em lote `GET /api/admin/<res>?ids=`), Ctrl+K (recursos, recentes,
  busca jogador/item/guilda), seleção + edição/exclusão em massa. Bug corrigido: `keepPreviousData` vazava
  linhas entre recursos.
- [ ] **admin-ux-2** — escolher colunas, visões salvas, filtro por coluna, header fixo (a tentativa quebrou o
  clique na linha), `/events` lendo `?edit=`, testes de componente no admin.
- [x] **admin-config** (2026-10-18) — `expRate`/`goldRate` agora valem de verdade (`templates.rates`,
  multiplica o x2 do evento, recarrega ao salvar). `dropRate`/`offerRate` ainda não ligados (aviso no admin).
