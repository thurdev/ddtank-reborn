# Admin (painel + API)

## 1. O que é no jogo
Não é uma tela do jogo em si, é o painel separado (`apps/admin`, React, roda em
`:5174`) que a equipe usa pra editar os dados do jogo sem tocar em SQL: itens,
loja, missões, eventos, guildas, bots (IA de PvP), jogadores (banir/desbanir,
dar item), correio em massa, config do servidor, ícones de item (gerador por IA),
calendário de eventos. Pedido do dono: o admin deve "espelhar o jogo 1:1" — cada
tela do jogo com uma tabela editável tem (ou devia ter) um recurso aqui, com os
mesmos nomes/ícones que aparecem no jogo (ex. o picker de item mostra ícone, não
só o TemplateID cru).

## 2. Onde fica no código
| Camada | Pasta/arquivo | O que tem |
|---|---|---|
| Painel (React) | `apps/admin/src/resources/*.ts` | Um `defineResource(...)` por tabela editável: campos, labels PT-BR, filtros, ações de linha. Arquivos: `content.ts` (itens/loja/missões/eventos — maior, 19K), `event-systems.ts` (eventos agendados, prêmios, calendário), `guilds.ts` (sociedade), `items.ts` (definição central do recurso **items** + filtros), `players.ts` (jogadores, ban/unban/dar-item), `system.tsx` (config do servidor, stats, admin-users). |
| CRUD genérico (React) | `apps/admin/src/crud/*.tsx` | `ResourcePage.tsx` (lista+paginação+busca+form, por recurso), `SchemaForm.tsx`/`FieldInput.tsx`/`Cell.tsx` (renderizam cada `FieldDef` — inclui os tipos especiais `item-picker`/`item-picker-multi`/`item-list` com busca por nome+ícone, não por ID cru), `api.ts` (chama `/api/admin/<resource>`), `schema.ts`/`types.ts` (tipos `ResourceDef`/`FieldDef`). |
| API REST | `apps/api/src/routes/admin.ts` (762 linhas) | Rotas: CRUD genérico (`GET/POST/PATCH/DELETE /api/admin/:resource[/:id]`, linha 697-780) + rotas especiais (stats, server-config, uploads/assets, templates/rebuild, mail/broadcast, players/:id/:action [ban/unban/give-item], admin-users, item-icons/map-icons, items/:id/add-to-shop). |
| Whitelist de recursos | `apps/api/src/routes/admin-resources.ts` | `RESOURCES: Record<string, ResourceDef>` — só os nomes aqui respondem em `/api/admin/<nome>`. Cada entrada mapeia pra uma tabela Drizzle real + PK (`pk: [...]`, chave composta junta com `~` na URL) + flags `readOnly`/`noCreate`/`noDelete`/`hidden` (colunas nunca retornadas, ex. senha). |
| Tabelas do banco | `packages/db/src/schema/*.ts` | O recurso aponta direto pra uma tabela Drizzle (`game.*`, `player.*`, `app.*`, `member.Accounts`) — não existe tabela própria do admin. |

### Mapa de recursos já registrados (não exaustivo — ver `admin-resources.ts` pra lista completa)
| Área (como aparece no jogo) | Recurso (`RESOURCES["..."]`) | Tabela |
|---|---|---|
| Jogadores | `players` | `player.Sys_Users_Detail` (somente editar/ban; sem criar/deletar) |
| Itens de jogador | `player-items` | `player.Sys_Users_Goods` |
| Correio de jogador | `player-mail` | `player.User_Messages` |
| Contas de login | `accounts` | `member.Accounts` (senha oculta) |
| Bots (IA de PvP) | `bots` | `app.Bots` |
| Guildas/sociedade | `guilds`, `guild-members`, `guild-duties`, `guild-applications`, `guild-events`, `guild-tasks`, `guild-levels` | `player.Consortia*` |
| Itens/loja | `items`, `shop`, `shop-show`, `item-box` | `game.Shop_Goods`, `game.Shop`, `game.ShopGoodsShowList`, `game.Shop_Goods_Box` |
| Missões | `quests`, `quest-conditions`, `quest-goods` | `game.Quest*` |
| Eventos | `events`, `scheduled-events`, `event-claims`, `event-codes`, `login-award`, `time-box`, `event-awards`, `event-reward-info`, `event-reward-goods`, `activity-items` | `game.Active*`, `app.ScheduledEvents`, `app.EventClaims`, `player.Active_Number`, `game.Login_Award_Item_Template`, `game.LoadUserBox` |

Ver [eventos.md](./eventos.md) seção 2/4 e [forja.md](./forja.md) seção 4 pra exemplos
de qual recurso controla qual regra de jogo.

## 3. Fluxo passo a passo (editar uma linha)
1. Jogador-admin abre uma página de recurso no painel (`ResourcePage.tsx`), que
   busca `GET /api/admin/<resource>?q=&page=&pageSize=&sort=` (lista com busca e
   paginação — `listQuery` em `crud/api.ts:7`).
2. Edita um campo no formulário (`SchemaForm.tsx`, gerado a partir dos `fields:
   FieldDef[]` do `defineResource`) e salva → `PATCH /api/admin/<resource>/<id>`
   (`api.ts` → `useResourceMutations().update`, `admin.ts:750`).
3. `admin.ts` resolve o recurso na whitelist `RESOURCES` (`admin-resources.ts`),
   confere a PK, roda o `UPDATE` via Drizzle na tabela real.
4. **Pós-escrita (`afterWrite`, `admin.ts` perto da linha 697)**: invalida o
   cache de arquivo estático daquela tabela (`ctx.cache.invalidate`) e, se a
   tabela é `game.*` ou `app."ScheduledEvents"`, chama
   `gameInternalPost(ctx, "/reload-templates")` — um POST interno pro processo
   `apps/game` recarregar o cache de templates em memória (ver
   `COMO-FUNCIONA.md` seção 2, "`Templates` (runtime cache)") **automaticamente**,
   sem precisar reiniciar o servidor de jogo à mão. Também grava uma linha de
   auditoria (`audit()`, `admin.ts:155`). Isto só atualiza o CACHE do servidor
   (silencioso, sem pacote pro cliente) — pra empurrar de verdade pros jogadores
   já conectados (41-hot-update), o admin usa o botão dedicado "Aplicar agora" na
   página de Configuração do servidor, ver [hot-update.md](./hot-update.md).
5. Alguns recursos têm atalhos de criação a partir de outro (ex. botão "Adicionar
   à loja" na página de Itens → `POST /api/admin/items/:templateId/add-to-shop`,
   `admin.ts` perto da linha 740 — cria uma linha em `game."Shop"` reaproveitando
   `insertRow()`).
6. Ações sobre jogador (não é CRUD de tabela, é ação): `POST
   /api/admin/players/:id/:action` com `action` = `ban`/`unban`/`give-item`
   (`admin.ts:371-452`). `give-item` com `viaMail=false` tenta entregar na bolsa
   do jogador ONLINE via `fetch(GAME_INTERNAL_URL + "/give-item")` (o game server
   em memória); se falhar ou o jogador estiver offline, insere direto na tabela
   (`player."Sys_Users_Goods"`, slot livre 31-49) e, se nem isso der, cai pro
   correio (`sendMail`) — nunca perde o item.

## 4. Quero mudar…
- **Adicionar um recurso novo** (uma tabela que ainda não aparece no admin):
  1. Adicione uma entrada em `RESOURCES` (`apps/api/src/routes/admin-resources.ts`)
     apontando pra tabela Drizzle (`table:`) e a PK (`pk: [...]`, 1 ou mais
     colunas). Copie uma entrada simples existente como `shop: { table:
     game.Shop, pk: ["ID"] }` como modelo.
  2. Crie (ou acrescente a um arquivo existente de área parecida) um
     `defineResource({...})` em `apps/admin/src/resources/*.ts` com `name` IGUAL
     à chave usada em `RESOURCES`, `table` (string só decorativa pro label),
     `label` PT-BR/EN e a lista de `fields` (cada `FieldDef`: `name`, `label`,
     `type`, `list`/`form` pra mostrar ou não em cada tela). Exemplo pequeno pra
     copiar: `dailyAward` em `event-systems.ts:72-100`.
  3. Registre o resource no índice do painel (`apps/admin/src/resources/index.ts`)
     se ele exigir um registro manual — confira o padrão dos recursos existentes
     nesse arquivo.
  4. Se a tabela nova guarda item por `TemplateID`, use `type: "item-picker"` (ou
     `item-picker-multi`/`item-list` pra array) em vez de `number` cru — o picker
     busca por nome em PT e mostra ícone (ver `apps/admin/src/resources/items.ts`
     e `ItemIconGenerator.tsx` pra como o ícone é gerado/cacheado).
- **Dar item pra um jogador fora do painel padrão**: já existe o botão dedicado
  (ação `give-item` na página Jogadores) — não precisa de recurso novo.
- **Mudar o que o admin considera "tabela de jogo que precisa recarregar cache
  no `apps/game`"**: lista de prefixos em `afterWrite()` (`admin.ts`, condição
  `key.startsWith("game.") || key === "app.ScheduledEvents"`).

## 5. Testes + status
- `apps/api/test/api.test.ts` → `describe("admin CRUD")` (linha 183): cobre
  autenticação (`401`/`403` sem token admin), listar/buscar/ordenar
  (`?q=&sort=`), editar um item e confirmar que o XML servido pro cliente
  (`/request/templatealllist.xml`) reflete a mudança (prova que o reload de
  cache funciona), criar/ler/deletar um recurso de chave composta
  (`quest-conditions`, PK `QuestID~CondictionID`), criar notícia e ver refletido
  em `/api/public/news`, e round-trip de `server-config` (`PUT` muda a porta/host
  e `/request/ServerList.ashx` reflete).
- Não há teste automatizado para o React do painel (`apps/admin`) nem para as
  ações de jogador (`ban`/`unban`/`give-item`) ou upload de assets/ícones —
  verificação é manual (abrir `:5174` no browser, idealmente via Playwright).
- **Status conhecido em aberto** (ver `docs/AI-HANDOFF.md` histórico): o dono
  reportou que depois de uma rodada de mudanças (picker com ícone, bots na
  tabela real, calendário salvando) "nada mudou" no admin ao testar — suspeita
  de cache do browser ou de rodar contra um build antigo (o Vite de
  desenvolvimento em `:5174` é o que vale; a API não serve o `dist` do admin).
  Se isso se repetir: confirme que `apps/api` e o Vite do admin foram
  reiniciados com o código atual antes de desconfiar do código.
