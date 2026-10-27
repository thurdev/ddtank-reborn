# multi-char — múltiplos personagens por conta + carrossel de seleção

Branch `feature/multi-char` (worktree `.claude/worktrees/multi-char`), a partir de `main`.

## Decisão de dados (confirmada lendo o código)

O login original é 1 conta = 1 personagem por **nome**: `member."Accounts".UserName` é usado
*literalmente* como `player."Sys_Users_Detail".UserName` (ver `apps/api/src/request/players.ts`
`activePlayer`/`registerPlayer`, chamado por `Login.ashx`/`VisualizeRegister.ashx`). O servidor de
jogo (`apps/game/src/db/characters.ts` `findCharacterByUserName`) só faz
`lower(UserName) = lower(ticketUser)` — não sabe nada sobre "conta". Isso significa que o **client
e o game server não precisam de nenhuma mudança**: basta dar a cada personagem extra da mesma conta
um `gameUserName` interno diferente (`conta`, `conta~2`, `conta~3`, ...) e usar esse nome em todo o
lugar que hoje usa `acc.UserName` pra emitir o ticket (`flashvars.user`, `Login.ashx`'s `name`). O
separador `~` nunca aparece num `UserName` de conta válido (regra `NAME_RE` em
`apps/api/src/routes/auth.ts`: `^[A-Za-z0-9_.]{3,32}$`), então não há colisão.

Nova tabela `app."AccountCharacters"` (accountId, slot, gameUserName, createdAt) mapeia conta → slot
→ `gameUserName`. Slot 1 = personagem já existente pra contas atuais (backfill idempotente na
migração: `INSERT ... SELECT "ID", 1, lower("UserName") FROM member."Accounts" ON CONFLICT DO
NOTHING`).

Criar personagem = **só reservar o slot** (inserir a linha). A linha `Sys_Users_Detail` do
`gameUserName` novo é criada do jeito que *sempre* foi criada pra conta nova: lazy, por
`activePlayer` dentro de `Login.ashx`, na primeira vez que o ticket daquele `gameUserName` loga.
O fluxo "Novato" (nick/sexo) do client, inalterado, roda exatamente como roda hoje pra uma conta
zerada.

## Checklist

- [x] Fase 1 — DB: schema `app.AccountCharacters` + migração (DDL + backfill) + helpers
- [x] Fase 2 — `@ddt/auth`: `deriveGameUserName`/`parseGameUserName` (puro, sem DB)
- [x] Fase 3 — API: limite em `server-config`, `lib/characters.ts`, rotas `GET/POST /api/me/characters`,
      ticket (`playConfig`) e `/api/public/config`/`/api/play/config` cientes de slot,
      `/api/account/me` usando a nova tabela
- [x] Fase 4 — game: teste de login confirmando que `~2` funciona sem mudança de código
- [x] Fase 5 — web: carrossel old-school (PixiJS) com renderer leve de equipamentos + placar VIP/título,
      integrado antes do seletor de canal
- [x] Fase 6 — admin: campo `maxCharactersPerAccount` na página Server Config
- [x] Fase 7 — testes (db/api/web/game), docs, TASKS.md

## Fidelidade do renderer (gap documentado)

O pedido preferia reusar `ShowCharacter`/`RoomCharacter`/`BaseCharacter` (cliente transpilado,
`apps/client/src/game/ddt/view/character/*`). Esses arquivos **não existem nesta worktree**: são
saída gerada do transpilador AS3→TS (gitignored, ver memória "Pixi generated files") e só existem na
branch em andamento `feature/pixi-ligar` (ainda não mergeada em `main`, que é de onde este worktree
partiu). Reusar essas classes exigiria depender de uma branch não mesclada e de todo o runtime
`@ddt/flash` + `ComponentFactory` (carregamento de `.swf` convertido, animação por frame,
`CharacterLoaderFactory`) — fora do escopo de uma task isolada em `apps/web`.

Caminho escolhido: renderer leve próprio (`apps/web/src/components/character`), usando os MESMOS
assets do pacote de recursos original (`/resource/image/equip/...`), resolvidos pelas MESMAS funções
já existentes e testadas em produção (`apps/api/src/lib/item-icon.ts` `itemIconRel`, usada hoje pelo
admin pra preview de ícone de item). A API devolve, por personagem, a lista de itens equipados
(categoria/pic/sexo/nível de reforço) e o componente web empilha os ícones (base/corpo, cabelo,
rosto, roupa, arma, asas) em camadas CSS/PixiJS, com idle bob leve, moldura/placar de nome
(VIP/título/guild) e aura dourada quando `StrengthenLevel` é alto — igual ao estilo da plaquinha de
nome do lobby, mas SEM a animação de frame-a-frame real do corpo (ela é só "stand" estático). Gap
documentado para fechar quando `apps/client` (ShowCharacter real) chegar em `main`.

## Comandos de verificação

- `pnpm --filter @ddt/db exec vitest run --maxWorkers=2`
- `pnpm --filter @ddt/auth exec vitest run --maxWorkers=2` (se houver suíte própria)
- `pnpm --filter @ddt/api exec vitest run --maxWorkers=2`
- `pnpm --filter web exec vitest run --maxWorkers=2`
- `cd apps/game && npx vitest run --maxWorkers=3` (suíte completa, uma vez no fim)
- `pnpm typecheck` nos pacotes tocados

## Migrações para o dono aplicar (`db:migrate`)

- `00XX_*.sql` — `app."AccountCharacters"` (ver nome exato no commit da Fase 1)
