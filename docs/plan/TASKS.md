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
- [ ] **m1-bitmap-text** — textos turcos que são imagem no 6600 ("Savaşma Gücü", "VIP aç", aba "Etkinlik", "Harika oyun", "Her Gün Yapılmalı", "Ana görevler", popup "Bugünkü Lig Maçı…", tela de criar personagem "Karakter seçin"/"Oyuna girin"/"Ad:") — pipeline de remaster (Seedream 4.5 unlimited / render local) com manifesto do pack 6600.
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
- [~] **m2-forja** — forja (fundir, compor, `ITEM_REFINERY`).
- [ ] **m2-cutover** — 6600 vira o padrão em `/play`; 4.1 fica em `?client=41` até ser removido.

### M3 / M4 / M5
Ver [MIGRACAO-6600.md §5](./MIGRACAO-6600.md#5-plano-por-fases): endpoints novos, sistemas novos, features da
referência (Coleta, Resgate, Nian, Passe Clássico…), remaster HD/PT-BR das telas novas. Quebrar em tarefas
aqui quando o M2 fechar.

## 2. Canais (Canal 1, 2, 3…)
Desenho em [MIGRACAO-6600.md — Requisito futuro](./MIGRACAO-6600.md#requisito-futuro-vários-canais-decisão-do-dono-2026-10-17).
- [ ] **ch-tabela** — tabela de canais (nome, host/porta, capacidade, estado, ordem, flags) + `ServerList.ashx` lendo dela.
- [ ] **ch-admin** — CRUD de canais no admin.
- [ ] **ch-processo** — `apps/game` sobe como canal N (`SERVER_ID`/porta via env); compose com 1 serviço por canal.
- [ ] **ch-bus** — barramento entre canais (Redis pub/sub): login único, chat mundial/sussurro, presença de amigos/sociedade.
- [ ] **ch-troca** — trocar de canal sem relogar.
- [ ] **ch-eventos** — eventos globais (boss mundial, liga) coordenados entre canais.

## 3. Pix (doação, sem pay-to-win)
- [ ] **pix-provedor** — escolher provedor (Pix direto via PSP com webhook) e documentar; chaves só em `.env`.
- [ ] **pix-api** — criar cobrança (QR + copia-e-cola), webhook de confirmação, registro da doação.
- [ ] **pix-site** — página "Apoiar" no site com QR; agradecimento/selo cosmético opcional, nunca vantagem de jogo.
- [ ] **pix-admin** — lista de doações e conciliação no admin.
- [ ] **pix-transparencia** — página pública opcional com custo do servidor × doações do mês.

## 4. Site + admin premium
- [ ] **site-design** — visual "Reborn" high-tech mantendo os botões 3D (ver memória do dono), home, ranking, notícias.
- [ ] **site-play** — página de jogo com seleção de canal e launcher.
- [ ] **admin-ux** — revisão geral do admin (navegação, busca, edição em massa).
- [ ] **admin-config** — tudo configurável pelo admin (eventos, canais, taxas), sem editar arquivo.
