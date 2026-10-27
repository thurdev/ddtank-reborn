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

## Renderer: correção do coordenador (resolvido)

Primeira tentativa: achei que reusar `ShowCharacter`/`RoomCharacter` era inviável porque
`apps/client/src/game/ddt/view/character/*` "não existia nesta worktree". **Errado** — esse código é
saída GERADA do transpilador AS3→TS, gitignored em TODO checkout (não só nesta worktree), e
`npx tsx tools/as3-to-ts/src/main.ts` regenera em ~10-20s. O coordenador corrigiu isso. O cliente
PixiJS também já é servido separado (dev `http://localhost:5180`, prod `PIXI_CLIENT_URL`) —
exatamente o mecanismo que `AvatarFrame` usa.

Caminho final: segunda entrada leve do `apps/client` — `avatar.html` + `src/avatar.ts` — que sobe só o
necessário (stage `@ddt/flash`, `ConfigParaser.paras` pro `PathManager`, os 2 loaders de referência de
item que `ItemManager`/`BaseCharacterLoader` precisam, nada de socket/login/hall) e cria um
`ShowCharacter` de verdade via `CharactoryFactory.createCharacter(info, SHOW)` a partir de query params
(os mesmos campos que `GET /api/me/characters` já devolve: `style`/`colors`/`skin`/sexo/VIP/guilda/
título/aura). `apps/web`'s `CharacterCarousel` embute isso num iframe (`AvatarFrame.tsx`) pro card
focado, com `CharacterStage` (pilha de ícones) como fallback só quando `PIXI_CLIENT_URL` não está
configurado. Verificado ao vivo contra o stack rodando (conta de teste própria + leitura do próprio
personagem do dono, só leitura) via Playwright headless — personagem real renderizado com
equipamento/asas/aura, screenshot conferido.

Dois bugs reais achados e corrigidos nessa verificação: `ConfigParaser.paras` precisa do nó `<config>`
(não `<root>`) do config.xml, e `ShowCharacter` carrega um placeholder cosmético do pacote de UI
completo que esta entrada leve pula de propósito (`asset.core.character.FigureBgAsset`, registrado
como um stub inofensivo via `$class`).

**Gap residual, pequeno e documentado**: `avatar.ts` só carrega os loaders de item/categoria
(`StartupResourceLoader.creatItemTempleteLoader`/`creatGoodCategoryLoader`), não os de conjunto/traje
(`creatSuitTempleteLoader`/`creatEquipSuitTempleteLoader`) — um personagem com bônus visual de
"conjunto completo" pode não mostrar esse efeito extra na prévia (o equipamento em si renderiza certo).
Fechar se algum dia isso importar pra seleção de personagem.

## Comandos de verificação

- `pnpm --filter @ddt/db exec vitest run --maxWorkers=2`
- `pnpm --filter @ddt/auth exec vitest run --maxWorkers=2` (se houver suíte própria)
- `pnpm --filter @ddt/api exec vitest run --maxWorkers=2`
- `pnpm --filter web exec vitest run --maxWorkers=2`
- `cd apps/game && npx vitest run --maxWorkers=3` (suíte completa, uma vez no fim)
- `pnpm typecheck` nos pacotes tocados

## Migrações para o dono aplicar (`db:migrate`)

- `packages/db/drizzle/0029_multi-char-account-characters.sql` — cria `app."AccountCharacters"`
  (accountId, slot, gameUserName, createdAt; índices únicos em (accountId, slot) e em gameUserName) e
  faz o backfill idempotente do slot 1 de toda conta já existente (`lower("UserName")`). Rode
  `pnpm --filter @ddt/db exec drizzle-kit migrate` ou o `db:migrate` normal do projeto.
