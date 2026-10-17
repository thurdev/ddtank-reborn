# Como funciona — arquitetura pra quem tá começando

> Pra achar ONDE mexer numa feature específica, use o índice: [README.md](./README.md).
> Este doc é o "por baixo do capô": como um clique no cliente Flash chega a virar uma
> mudança salva no banco. Os números de linha citados aqui **mudam** conforme outros
> agentes editam o código — prefira achar pela **função/export citado** no arquivo; a
> linha é só uma dica de ponto de partida.

## 1. O caminho de um clique

```
Cliente (AS3/Ruffle)  →  pacote binário (TCP/WebSocket)  →  handler TS  →  muda o jogador/bolsa
      ↑                                                                          ↓
      └──────────────────── pacote de resposta (packets/out.ts) ────────────────┘
```

1. **Cliente manda o pacote.** Toda ação do jogador (clicar comprar, arrastar item,
   apertar fortalecer) chama um método de
   `vendor/DDTank41/Source Flash/src/ddt/manager/GameSocketOut.as`
   (ex.: `sendBuyGoods`, `sendItemStrength`). Esse método monta um pacote binário com um
   **código numérico fixo** (ex. `44 BUY_GOODS`, `59 ITEM_STRENGTHEN`) e os bytes do
   pedido, e manda pro servidor. `docs/MAPA-DO-JOGO.md` lista, pra cada tela do jogo,
   qual função do cliente manda qual pacote.

2. **O servidor recebe e despacha pelo código.** `apps/game/src/handlers/registry.ts`
   define `HandlerRegistry`: um mapa `código → handler`. Cada arquivo em
   `apps/game/src/handlers/*.ts` tem uma função `registerX(r)` que chama
   `r.player(código, "NOME", funçãoQueTrata)` pra cada pacote que esse arquivo cobre.
   Tudo é somado em `apps/game/src/handlers/index.ts` (`createRegistry()`), chamado uma
   vez quando o servidor sobe.
   - Alguns pacotes (ex. `94 GAME_ROOM`, `129 CONSORTIA_CMD`, `160 IM_CMD`, `68 PET`,
     `216 CARDS_DATA`, `249 MARRY_CMD`) são "guarda-chuva": o handler lê um sub-código
     (byte ou int) e despacha de novo com `SubRouter` (também em `registry.ts`).
   - `r.player(...)` só chama a função se o cliente já tiver feito login
     (`client.player` existe); senão o pacote é ignorado.

3. **O handler lê os bytes, valida e muda o estado.** Um handler típico (ex.
   `apps/game/src/handlers/forja/fortalecer.ts` função `strengthen`) recebe `(ctx, player, pkt,
   client)`: `pkt.readInt()/readByte()/readString()` lê os campos na mesma ordem que o
   cliente escreveu, confere regra de negócio (nível, ouro, item na bolsa certa, bolsa
   trancada por senha, etc.) e só então aplica a mudança.

4. **A mudança acontece na bolsa/jogador em memória**, não direto no banco:
   - `apps/game/src/game/item.ts` — `ItemInfo` (uma unidade de item que o jogador tem:
     `TemplateID`, `Place` = slot, `StrengthenLevel`, `Property1..N`, `IsBinds`...) e
     `ItemTemplate` (dados fixos do item, carregados das tabelas `game.*`).
   - `apps/game/src/game/inventory.ts` — `PlayerInventory`: uma bolsa (array de slots).
     Toda mudança de slot passa por `beginChanges()/commitChanges()`, que agrupa várias
     alterações num só pacote de resposta `64 GRID_GOODS` pro cliente (em vez de um
     pacote por slot).
   - `apps/game/src/game/player.ts` — `GamePlayer`: o jogador logado. Tem `info`
     (campos de `player."Sys_Users_Detail"`, ver `player-info.ts`), e uma bolsa por
     `BagType` (equipamento, prop, farm, cartas, forja/`Store`, banco...).

5. **O servidor responde com um pacote de saída.** `apps/game/src/packets/out.ts` tem um
   builder por tipo de resposta (ex. `Out.inventorySlots(...)`, `Out.message(...)`), que
   monta um `PacketOut` com o código e os bytes esperados pelo cliente (o cliente lê na
   mesma ordem — ver a classe `.as` correspondente se precisar confirmar o formato).

6. **Em algum momento isso é salvo no banco.** O servidor **não salva a cada ação** —
   ele guarda tudo em memória (no objeto `GamePlayer`) e só grava:
   - a cada ~10 min (`apps/game/src/game/scheduler.ts` tem o scheduler de eventos
     temporizados; o autosave periódico do jogador roda à parte, ver chamadas de
     `saveIntoDatabase`);
   - quando o jogador desloga;
   - quando o cliente manda `172 SAVE_DB` manualmente (ex. ao sair da forja).

   `GamePlayer.saveIntoDatabase(db)` (`apps/game/src/game/player.ts:396`) roda em
   **passos independentes** (um erro num passo não cancela os outros, mas é relançado no
   fim pra logar): salva `info` (ver `SAVED_DETAIL_COLUMNS` abaixo), depois **todo** item
   de cada bolsa marcada `saveToDb` (não só os sujos — várias rotinas de forja mudam
   campo do item sem marcar dirty), depois missões, pets, cartas, buffs e records.

## 2. Glossário DDTank (termos que aparecem em todo handler)

| Termo | O que é |
|---|---|
| **`TemplateID`** | ID do *tipo* de item/equipamento (o "molde"). Fica na tabela `game."Shop_Goods"` (= `ItemTemplateInfo` no C#). Dois jogadores com a mesma arma têm `TemplateID` igual mas `ItemID`/linha diferente. |
| **`ItemID`** | ID da *instância* do item que um jogador específico tem (linha em `player."Sys_Users_Goods"`). |
| **`Place`** | Número do slot dentro da bolsa (posição onde o item está guardado/equipado). |
| **`BagType`** | Qual bolsa (`apps/game/src/game/item.ts` exporta a const `BagType`): `EquipBag=0` (equipado), `PropBag=1`, `TaskBag=2`, `FightBag=3`, `TempBag=4`, `CaddyBag=5` (caça-níquel), `Consortia=11` (banco da guilda), **`Store=12`** (bancada da forja), `FarmBag=13`, `Vegetable=14`, `Card=15`, `BeadBag=21`, `Food=34`, `PetEgg=35`, `BankBag=51`. |
| **`CategoryID`** | Categoria do item-molde (arma, pedra, pergaminho...). `templateBagType()` em `item.ts:30` decide em qual bolsa um item *novo* cai a partir do `CategoryID`. |
| **`Property1..PropertyN`** | Atributos genéricos do item-molde, cujo significado depende do `CategoryID` (ex. pra pedra de força, `Property1` guarda o tipo da pedra). Sempre ler o handler que usa aquele `CategoryID` pra saber o que cada `Property` significa naquele contexto — não é universal. |
| **`StrengthenLevel`** | Nível de fortalecimento atual do item (sobe no Ferreiro). |
| **`IsBinds`** | Se o item está vinculado ao jogador (não pode ir pro leilão/comércio). |
| **`StoreBag`** | A bolsa `BagType.Store` (12): a "bancada" onde o jogador arrasta itens pra fortalecer/compor/fundir/incrustar na Forja. Compartilhada entre as abas Ferraria e Forno. |
| **`GamePlayer.info`** | Objeto com os campos "de personagem" (nome, nível, ouro, cupom, sexo...) — ver `apps/game/src/game/player-info.ts`. Union desses campos com o que é persistido: `SAVED_DETAIL_COLUMNS` (mesmo arquivo, linha ~104) lista **só** as colunas de `info` que `saveIntoDatabase` grava em `player."Sys_Users_Detail"`; adicionar um campo novo em `info` sem adicioná-lo aqui faz ele nunca ser salvo. |
| **`PlayerInventory` / `PlayerEquipInventory`** | Classe que modela uma bolsa (`apps/game/src/game/inventory.ts`), com `beginChanges/commitChanges` pra agrupar pacotes de atualização de slot. |
| **Handler "implemented/partial/stub"** | Status declarado em cada `r.player(code, name, fn, status)`. `partial` = parte da lógica do C# ainda falta; `stub` = só responde pra não travar o cliente, sem lógica real. Ver `research/qa/packet-coverage.tsv` pro status de cada pacote. |
| **Template (seed)** | Tabelas `game.*` (ex. `Item_Strengthen`, `Item_Fusion`, `Shop_Goods`, `Quest_Info`...) são dados fixos de design, carregados de `packages/db/seed/game/*.json.gz` pela migração/seed. Mudar uma regra de jogo (chance, preço, drop) quase sempre é mudar uma linha dessas tabelas — via admin quando o recurso existe (`apps/admin/src/resources/*.ts`), ou via SQL direto quando não existe recurso admin pra aquela tabela ainda. |
| **`Templates` (runtime cache)** | `apps/game/src/db/templates.ts`: carrega as tabelas `game.*` relevantes pra UMA área (ex. forja: `Item_Strengthen`, `Item_Strengthen_Goods`, `Item_Fusion`) em memória no boot do servidor pra não bater no banco em cada pacote. **Se você editar uma linha de template direto no banco com o servidor já rodando, reinicie o processo do jogo (`apps/game`) pra ele recarregar o cache.** |

## 3. Onde cada camada mora

| Camada | Pasta | O que tem |
|---|---|---|
| Protocolo binário (framing, crypto, `GSPacket`/`PacketOut`) | `packages/protocol/` | Codec que os handlers usam pra ler/escrever campo a campo. |
| Handlers de pacote (lógica de cada feature) | `apps/game/src/handlers/<area>/` | Uma pasta por área, um arquivo por ação dentro dela (`forja/`, `bolsa/`, `mascote/`, `casamento/`, `sociedade/`, `leilao/`, `correio/`, `chat/`, `basico/`...). `registry.ts`/`index.ts` ligam tudo. |
| Estado do jogador em memória | `apps/game/src/game/*.ts` | `player.ts` (GamePlayer), `inventory.ts`, `item.ts`, `pets.ts`, `cards.ts`, `consortia-mgr.ts`, `quests.ts`, `stats.ts`, `scheduler.ts`. |
| Acesso a banco (bolsa/personagem) | `apps/game/src/db/*.ts` | Lê/grava `player.*` (dados de jogador) e `game.*` (templates) via Drizzle. |
| Construtores de pacote de saída | `apps/game/src/packets/out.ts` | Um `export function` por tipo de pacote que o servidor manda pro cliente. |
| Esquema do banco (Drizzle) | `packages/db/src/schema/*.ts` | `game.ts` (templates, schema `game`), `player.ts` (dados de jogador, schema `player`), `app.ts` (config do site/admin: `Settings`, `Bots`, `Texts`, `ScheduledEvents`, `News`, `Logs`, `MailBroadcasts`...), `member.ts` (contas de login). |
| Seeds dos templates | `packages/db/seed/game/*.json.gz` | Dump das tabelas `game.*` (design do jogo original: fortalecer, fusão, loja, missões, drops...). |
| API HTTP pro cliente (`.ashx` originais) | `apps/api/src/routes/request.ts` + `apps/api/src/request/registry.ts` | Replica byte-a-byte as URLs/XML/zlib que o cliente Flash espera de `Tank.Request`. |
| API pública (site/launcher) | `apps/api/src/routes/public.ts` | Status do servidor, ranking, config, manifest do launcher. |
| API do admin | `apps/api/src/routes/admin.ts` + `admin-resources.ts` | CRUD genérico sobre a whitelist `RESOURCES` (cada tabela editável vira `/api/admin/<nome>`), mais rotas especiais (templates, assets, mail, server-config). |
| Painel admin (React) | `apps/admin/src/resources/*.ts` | Define, por recurso, os campos/labels em PT-BR mostrados no CRUD (`defineResource`). Se uma tabela não tem arquivo aqui, ela não aparece no admin ainda — edição é só via SQL/seed. |

## 4. "Quero mudar uma regra do jogo" — por onde começar

1. Ache a tela no `docs/README.md` (índice de features) ou em `docs/MAPA-DO-JOGO.md`
   (tabela tela → pacote → arquivo:linha do servidor).
2. Abra o doc da feature em `docs/features/<feature>.md` — a seção **4. Quero mudar…**
   tem a receita direta (constante no código, linha da tabela, ou recurso do admin).
3. Se for **número de jogo** (chance, preço, dano, recompensa): quase sempre é uma
   constante no topo do handler (ex. `STRENGTHEN_RATE_ITEMS` em `forja/fortalecer.ts:20`) **ou**
   uma linha de tabela `game.*` (editável pelo admin se o recurso existir, senão via
   SQL/seed — depois reiniciar `apps/game` pra recarregar o cache de templates).
4. Se for **comportamento** (o que acontece, mensagens, condições): é código no handler
   mesmo — leia o JSDoc da função (a maioria tem "Como lê esse código" explicando cada
   variável e cita o arquivo/linha do C# original em `vendor/DDTank41/...`).
5. Depois de mudar, roda o teste da área (`pnpm --filter @ddt/game test <arquivo>`, ver
   seção 5 de cada doc de feature) antes de subir.

## 5. Testes

`apps/game/test/*.test.ts` — um arquivo por área, geralmente nomeado como a feature
(`forge-advanced.test.ts`, `marriage-farm-auction.test.ts`, `pets-cards-vip.test.ts`...).
Rodar: `pnpm --filter @ddt/game test` (tudo) ou `pnpm --filter @ddt/game test <nome>`
(um arquivo). `helpers.ts` monta um `GamePlayer`/`ServerContext` fake pros testes não
precisarem de banco real. Ver `docs/TESTING.md` pra detalhe (vitest + Playwright).
