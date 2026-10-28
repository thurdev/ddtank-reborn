# 1. Subir o jogo, logar, debugar

## Subir tudo de uma vez

```bash
pnpm install
pnpm dev:all     # scripts/dev.mjs — sobe api (8080), game (TCP 9200/WS 9300/admin 9400), client (5180), web (5173), admin (5174)
```

`pnpm dev:all CHANNELS=5,6` sobe canais extras (ver `docs/GAME-SERVER.md` "Canais") — não
precisa disso pra desenvolvimento normal.

Se preferir subir peça por peça (ex. só quer o cliente e já tem api/game rodando):

```bash
pnpm --filter @ddt/api dev      # Fastify, porta 8080
pnpm --filter game dev          # tsx watch, TCP 9200 + WS 9300 + admin interno 9400
pnpm --filter @ddt/client dev   # Vite, porta 5180
pnpm --filter web dev           # site do jogador, 5173
pnpm --filter admin dev         # painel admin, 5174
```

**Cuidado**: se subir `api`/`game` à mão sem `DATABASE_URL` no ambiente, cada um abre seu
próprio PGlite isolado — login funciona mas o socket do jogo nunca bate a chave (cliente
cai com "sua sessão expirou"). Exporte
`DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/ddtank` antes dos dois
(`pnpm --filter @ddt/db db:pg` sobe esse Postgres local). `pnpm dev:all` já faz isso.

Código do cliente (até o congelamento, ver `docs/client-pixi/TRANSPILADOR.md`) é gerado, não
commitado — gere antes de abrir o cliente pela primeira vez (ou depois de puxar mudanças no
`vendor/DDTank41/Source Flash`):

```bash
npx tsx tools/as3-to-ts/src/main.ts
```

Arte (`apps/client/public/assets`) também não vai pro git — ou já existe (junction/симlink
pra uma pasta compartilhada) ou precisa exportar uma vez (`docs/client-pixi/ASSETS.md`).

`apps/client/package.json` também tem `dev:avatar` (`vite build -c vite.avatar.config.ts
--watch`) — um build dedicado só pro carrossel de avatar do site (`avatar.html`), que evita
~2800 requests ESM individuais no dev server normal. Só precisa disso se estiver trabalhando
na tela de criação de personagem/carrossel do site; pro resto do jogo, `dev` normal basta.

## Entrar no jogo

Pelo site: `http://localhost:5173` → registrar/logar → **Jogar**. A página abre o cliente
PixiJS num iframe com `user`/`key`/`api` (ver `PIXI_CLIENT_URL` em `apps/api/.env`).

Direto no cliente (pula o site):

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"username":"pixitest","password":"pixitest123"}' \
  http://127.0.0.1:8080/api/auth/login
# -> play.flashvars.key
```

```
http://localhost:5180/?user=<conta>&key=<chave>&debug=true
```

A `key` é de uso único (vem do login). Detalhes/parâmetros opcionais:
`docs/client-pixi/COMO-RODAR.md`.

## `?debug=true` — a ferramenta que você vai usar o tempo todo

Com esse parâmetro na URL, F12 → Console mostra, pra cada clique, pacote, carregamento e
erro: o **arquivo TS**, o **AS3 original**, a **arte** (SWF/símbolo/PNG) e a posição.
Detalhe completo: [`docs/client-pixi/DEBUG.md`](../client-pixi/DEBUG.md) — comece por lá
pra qualquer "onde fica isso no código".

Ferramentas no console (`ddtDebug`): `ddtDebug.under()` (o que está sob o mouse agora),
`ddtDebug.find("nome")`, `ddtDebug.outline(true)` (desenha a caixa do objeto sob o mouse).

## `PACKET_TRACE=true` — ver pacotes no servidor

```bash
PACKET_TRACE=true pnpm --filter game dev
```

Loga todo pacote enviado/recebido no `apps/game` (`apps/game/src/session/client.ts:11`) —
útil quando o bug está do lado do servidor e você não tem (ou não confia n)o log do
cliente. Combine com `?debug=true` no cliente pra ver os dois lados do mesmo pacote.

## Painel admin

`http://localhost:5174` (ou a porta do seu `apps/admin`). Fala com `apps/api`
(`routes/admin.ts`/`admin-resources.ts`) por um token bearer interno (`apps/api/.env`). CRUD
genérico pra toda tabela de template (Itens, NPCs, Masmorras PvE, Fases PvE, Eventos
agendados, Textos/traduções, Canais, Servidor…), com overlay de arquivos/imagens
(ver [trocar-icone-imagem.md](./04-receitas/trocar-icone-imagem.md)). Depois de editar
qualquer coisa que o servidor cacheia em memória, o admin já dispara
`POST /reload-templates` no `apps/game` sozinho (`admin.ts:876`); se precisar forçar,
botão **Servidor → Recarregar templates**.

## Onde ficam os logs

- `apps/api`/`apps/game`: stdout do processo (`pnpm dev:all` mostra tudo junto, prefixado
  por pacote). `LOG_LEVEL` no `.env` controla verbosidade.
- Cliente: console do navegador (com `?debug=true`, bem mais detalhado).
- Teste automático do cliente (`apps/client/scripts/smoke.mjs`): imprime os últimos logs do
  console + tira print; útil quando não quer abrir navegador de verdade.

## Hot reload

- `apps/game`/`apps/api`: `tsx watch` — salvar um `.ts` reinicia o processo (perde conexões
  ativas; reconecte o cliente). Scripts de PvE (`packages/fight/src/pve/scripts/manual/`)
  também — reinicia junto.
- `apps/client`: Vite normal (HMR). **Excecão**: `public/assets` não é vigiado (dezenas de
  milhares de arquivos) — depois de exportar arte nova, reinicie o dev server ou salve
  `apps/client/vite.config.ts` (ver `docs/client-pixi/ASSETS.md`).
- `apps/admin`/`apps/web`: Vite normal.

## Resetar uma conta de teste com segurança

**Nunca** `pnpm --filter @ddt/db db:seed` contra o Postgres de desenvolvimento do dono — isso
reseta edições feitas no admin. Pra testar do zero:

- Crie uma conta nova pelo site (registro normal) — mais simples e nunca afeta outra conta.
- Ou use o helper de teste automatizado: `pnpm --filter @ddt/db db:dev-account` (cria/reseta
  **uma** conta de dev isolada, não toca nas outras).
- Se precisar mexer direto no banco, use `drizzle-kit studio` (`pnpm --filter @ddt/db
  db:studio`) e edite só a linha da SUA conta de teste (`player."Sys_Users_Detail"` por
  `UserName`).
- Testes automatizados (vitest) nunca tocam o Postgres do dono: usam PGlite em memória
  (`apps/game/test/helpers.ts` `sharedDb()`), migrado + semeado do zero a cada run.

Veja também: [testes.md](./04-receitas/testes.md) (vitest/Playwright) e
[debug.md](./04-receitas/debug.md) (roteiro de "achei um bug, e agora?").
