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
- [ ] **m3-king-bless-deed** — `142 KING_BLESS_MAIN` (`sendOpenKingBless`/`sendOpenDeed`) e
  `143 KING_BLESS_USE_ITEM` (`sendUseItemKingBless`/`sendUseItemDeed`) — "Juramento do Rei"
  (`kingbless.swf`, `src/kingBless/`) + sistema "Deed"/escritura. Hoje só existe o stub fechado
  (`Out.kingBlessClosed()`, M1 Round 2) — esta tarefa é a feature de verdade (abrir/usar item).
- [ ] **m3-magic-stone-monster** — `284 MAGIC_STONE_MONSTER_INFO` (`sendCheckMagicStoneNumber`) — consulta
  de monstro/Relíquias (`magicstone.swf`, `src/magicStone/`), parte do sistema maior de Relíquias (M4) mas
  esta ação é uma consulta simples isolada.
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
- [ ] **m3-trusteeship** — `140 TRUSTEESHIP` (`sendTrusteeshipStart`/`Cancel`/`SpeedUp`/`BuySpirit`/
  `UseSpiritItem`) — modo automático/curadoria de personagem (sistema novo do 6600, sem equivalente 4.1).
- [ ] **m3-dice-system** — `134 DICE_SYSTEM` (`sendDiceRefreshData`/`sendStartDiceInfo`/
  `sendRequestEnterDiceSystem`, `GameInSocketOut.as`) — Sistema de Dados (`dice.swf`, `src/Dice/`).
- [ ] **m3-campbattle** — `146 CAMPBATTLE` (`CampbattleEnterFight`/`RoleMove`/`changeMap`/`outCampBatttle`/
  `captureMap`/`requestPRankList`/`requestCRankList`/`enterPTPFight`/`returnToPve`/`resurrect`) — Batalha de
  Acampamento (`campbattle.swf`). Sistema maior, 10 sub-ações.
- [ ] **m3-group-purchase** — `144 GROUP_PURCHASE` (`sendGroupPurchaseRefreshData`/`RefreshRankData`/`Buy`) —
  Compra em Grupo (`grouppurchase.swf`). O `.cs` original (`teambuyactiveawardinfo.cs`, já portado no
  `m3-ashx`) é sempre `value=false` — confirmar se este pacote de socket também é feature inacabada no
  original antes de implementar lógica de verdade (não inventar comportamento).
- [ ] **m3-seven-double** — `148 SEVEN_DOUBLE` (`sendSevenDoubleCallCar`/`StartGame`/`CancelGame`/`Ready`/
  `Move`/`UseSkill`/`CanEnter`/`EnterOrLeaveScene`) — minijogo "Sete Dobrado" (`src/sevenDouble/`, SWF não
  identificado por nome — ver `research/6600/swf-inventory.md`, candidato `church.swf`).
- [ ] **m3-ringstation** — `404 RING_STATION` (`sendRingStationGetInfo`/`sendBuyBattleCountOrTime`/
  `sendRingStationChallenge`/`sendRingStationArmory`/`sendRingStationBattleField`/`sendRingStationFightFlag`/
  `sendSignMsg`/`receiveLandersAward`) — Arena Ranqueada (`ringstation.swf`). Sistema "bem mais elaborado"
  que a 4.1 (`MIGRACAO-6600.md` §2.1, 4 pastas C#: `RingStation`/`.Battle`/`.RoomGamePkg`/
  `.RoomGamePkg.TankHandle`) — maior tarefa única da lista; considerar quebrar em sub-tarefas (inscrição/
  matchmaking, batalha, recompensa) quando for pegar.
- [ ] **m3-oldplayer-regress** — `149 OLDPLAYER_REGRESS` (`sendRegressPkg`/`RegressGetAwardPkg`/
  `RegressCheckPlayer`/`RegressApplyEnable`/`RegressApllyPacks`/`RegressCall`/`RegressRecvPacks`/
  `RegressTicketInfo`/`RegressTicket`/`UpdateIntegral`/`BuyRegressIntegralGoods`) — sistema "jogador que
  voltou" (retenção), 11 sub-ações, sistema novo do 6600.
- [ ] **m3-wonderful-activity** — `159 WONDERFUL_ACTIVITY`, `373 WONDERFUL_GETREWARD`,
  `405 WONDERFUL_ACTIVITY_INIT` — evento genérico (nome a confirmar jogando — não achei SWF nem
  `*PackageType.as` dedicado pelo grep, procurar manualmente antes de implementar lógica).
- [x] **m3-accumulative-login** (2026-10-18) — `238 ACCUMULATIVELOGIN_AWARD` (`sendAccumulativeLoginAward`,
  6600 — era `338` na 4.1, `ePackageType.as` 6600:592 vs `Game.Server/Packets/ePackageType.cs` 4.1:248).
  Achado: a lógica já existia em `handlers/eventos/presenca.ts` (`accumulativeLogin`), idêntica ao
  `AccumulAtiveLoginAwardHandler.cs` decompilado — o bug era o código de saída e o registro ficarem fixos em
  338, que um cliente 6600 nunca manda (ele manda 238). `238` no 4.1 é `MARRYINFO_DELETE` (nunca
  implementado dos dois lados — sem risco de corromper outra feature). Corrigido: resposta no MESMO código
  da requisição (238 ou 338, por `clientKind`), registro novo de 238 em `eventos/index.ts` restrito a
  `clientKind === "6600"`. Sem migração (colunas `accumulativeLoginDays`/`accumulativeAwardDays` já
  existiam).
- [ ] **m3-launcher-login** — `208 LAUNCHER_LOGIN` (`sendDeskTopLogin`) — login alternativo vindo do
  launcher desktop (`apps/launcher`). **Cuidado de valor**: `208` colide com `CARDS_SOUL` no próprio enum
  6600 (`MIGRACAO-6600.md` §1.1/§1.4) — decidir manualmente qual mapear, não gerar dos dois automaticamente.

**Sweep (vários códigos pequenos, investigar um a um na mesma tarefa):**
- [ ] **m3-misc-sweep** — códigos pequenos restantes do relatório; confirmar se é feature morta no C#
  original antes de implementar (igual `m3-group-purchase` acima): `101 BATTLE_COMPANION_GIVE`,
  `147 FIND_BACK_INCOME`, `152 FIGHTFOOTBALLTIMETAKEOUT`, `156 TRANSNATIONAL_BUYGOODS`, `157 RECHARGE`
  (`getspree`), `164 UPDATE_PLAYER_PROPERTY`, `207 REQUEST_FRIENDS_PAY`, `327 FAST_AUCTION_SMALL_BUGLE`,
  `360 GET_CSM_BOX`. Ver `research/6600/coverage-m3.md` pra função cliente + arquivo exatos de cada um.
- [ ] **m3-partial-sweep** — os 22 códigos com status `partial` no relatório (handler existe mas marcado
  incompleto): revisar campo a campo 6600 vs 4.1, mesma metodologia dos Rounds 1-3 de
  `research/6600/packets-m1.md` (ler o reader AS3 das duas versões, comparar byte a byte, `offset===length`
  no teste). Lista completa em `research/6600/coverage-m3.md` (coluna "Status servidor" = `partial`).

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
  `MissionEnergyPrice.xml`, `SearchGoodsPayMoney.xml`, `WarriorFamRankList.xml`, `GoodsCollect.xml`,
  `HelpGameReward.xml`. Detalhe de cada um (por que não tem tabela, candidatos descartados) em
  `research/6600/ashx-missing.md` §Pendências.
- [ ] **m3-endpoints-sem-fonte** — `GetFightReport`, `ConsortiaMatchHistory`, `DragonBoatFriendInfos`,
  `LoginRemoveSmallAccount`, `ProxyVIP`, `RecordSysInfo`, `RecordUserVersion`, `ResetPassword4399`: sem
  `.cs` em nenhum vendor — só revisitar se aparecer outro dump do 6600; não implementar comportamento
  adivinhado (regra do projeto: comportamento bate com o C# original, nunca chute).

### M4 — features novas da referência DDClássico
Ordem de confiança do mapa (`MIGRACAO-6600.md` §4): nome bate exato com a feature pedida primeiro, "a
confirmar jogando" depois. Cada uma depende do pacote/sistema M3 correspondente quando citado.
- [ ] **m4-coleta** — Coleta (`collectiontask.swf`, `261 COLLECTION_TASK` — já listado em M3 como pacote
  faltante; esta tarefa é o polish de UI/remaster + ligar ao backend). Nome bate exato, baixo risco.
- [ ] **m4-resgate** — Resgate (`rescue.swf`, `277 RESCUE`). Nome bate exato, baixo risco.
- [ ] **m4-catchbeast** — Capturar Nian (`catchbeast.swf`, `src/catchbeast/date/CatchBeastPackageType.as`).
  **Código de dispatch top-level não encontrado** em `ePackageType.cs` nem no scan de client-sends desta
  tarefa — confirmar se usa um código existente (ex. dentro de `ACTIVE_SYSTEM`) antes de implementar.
- [ ] **m4-passe-classico** — Passe Clássico / battle pass (`growthpackage.swf`,
  `src/growthPackage/GrowthPackageType.as` — valores a extrair). Maior esforço de design (progressão +
  loja de pontos), mas nome bate com o pedido do dono.
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
- [ ] **m4-montaria** — Montaria (`horse.swf` 2.1 MB, maior SWF novo + `horseRace.swf`). Feature grande,
  tabelas já existem desde `m1-schema` (`Mount_Data`, `Mount_Template`, etc.).
- [ ] **m4-ringstation-ui** — ligar a UI (`ringstation.swf`) ao backend de `m3-ringstation` quando pronto
  (trabalho client-side/wiring, não lógica de servidor nova).

### M5 — remaster HD + PT-BR (contínuo, em paralelo com M3/M4)
- [ ] **m5-remaster-telas-novas** — toda tela 100% nova portada em M3/M4 (sem equivalente 4.1 pra reusar
  remaster) precisa do pipeline completo `tools/remaster/*` (igual M1 `m1-bitmap-text`/`m1-swf-text`) antes
  de ir pro ar — não é uma tarefa só, é um passo final de cada tarefa M3/M4 que adicionar SWF novo.
- [ ] **m5-i18n-telas-novas** — `tools/i18n/skelleton-match.mjs` contra `language.txt` das telas novas
  (mesmo método de `m1-lang-ptbr`, dado de entrada novo por tela).
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
