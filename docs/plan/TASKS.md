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
- [~] **m1-lang-ptbr** — `language.txt` PT-BR pro pack 6600 (`tools/i18n/lang-6600.mjs`): reaproveita as chaves
  iguais da 4.1, traduz as novas, troca a marca "Bombom". Pronto quando: 0 chaves em turco.
- [~] **m1-socket** (cliente já conecta e passa do login; faltam formatos de pacote: LOGIN reply, UPDATE_PLAYER_INFO/PRIVATE_INFO, boss mundial, roleta, ranking de consumo) — — cliente 6600 conecta no `apps/game` (handshake igual à 4.1) e entra no hall: logar os pacotes
  recebidos/enviados (`PACKET_TRACE`), corrigir os que mudaram de formato no login/hall (`LOGIN`, info do
  jogador, bolsa inicial). Pronto quando: lobby 6600 aparece com o personagem.
- [ ] **m1-loading-brand** — tela de carregamento/logo sem "Bombom"/"DEVELOP BY ASUNA" (overlay de imagem em
  `apps/api/assets/flash6600`), logo DDTank Reborn.
- [ ] **m1-ruffle-report** — refazer `research/client/02-ruffle-report.md` pro 6600 (o que quebra no Ruffle).
- [ ] **m1-regressao** — garantir que o 4.1 segue igual (`/play` sem parâmetro), checklist das telas principais.
- [ ] **m1-schema** — tabelas novas do 6600 (Montaria, Treino, Casa Mágica, RingStation, Tesouro, Relíquias,
  Dados…) em Drizzle + migration incremental (`research/6600/db-diff.md`); colunas novas nas tabelas existentes.

### M2 — loop central no 6600
- [ ] **m2-bolsa** — bolsa/equipar/vestir (`PLAYER_DRESS`, mudanças de valor do §1.1).
- [ ] **m2-loja** — loja + correio.
- [ ] **m2-salas** — criar/entrar sala, pronto, começar.
- [ ] **m2-batalha** — partida PvP completa, pacotes novos de `eFightPackageType`, dano mágico por item.
- [ ] **m2-forja** — forja (fundir, compor, `ITEM_REFINERY`).
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
