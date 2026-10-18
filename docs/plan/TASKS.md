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

### M3 / M4 / M5
Ver [MIGRACAO-6600.md §5](./MIGRACAO-6600.md#5-plano-por-fases): endpoints novos, sistemas novos, features da
referência (Coleta, Resgate, Nian, Passe Clássico…), remaster HD/PT-BR das telas novas. Quebrar em tarefas
aqui quando o M2 fechar.

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
  ligados por `createMemoryBus`). Falta: `ch-eventos` (boss mundial/liga cross-canal), `ch-troca` (mudar de
  canal sem relogar), TLS no WS dos canais extras (polish de deploy), chat de clã cross-canal (fora do escopo
  pedido — mesmo padrão de `ctx.crossChannel`, só um tópico novo, se vier a ser pedido). Ver
  `docs/GAME-SERVER.md` "Canais" §"ch-bus".
- [ ] **ch-troca** — trocar de canal sem relogar.
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
  líder, caminho síncrono de antes). Ver `docs/GAME-SERVER.md` "Canais" § `ch-eventos`. Falta: `ch-troca`.

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
- [ ] **site-design** — visual "Reborn" high-tech mantendo os botões 3D (ver memória do dono), home, ranking, notícias.
- [ ] **site-play** — página de jogo com seleção de canal e launcher.
- [ ] **admin-ux** — revisão geral do admin (navegação, busca, edição em massa).
- [ ] **admin-config** — tudo configurável pelo admin (eventos, canais, taxas), sem editar arquivo.
