# Testes — vitest (unitário) e Playwright (cliente real)

**Como verificado**: o padrão de `loggedIn()`/`FakeClient` descrito aqui foi usado de
verdade várias vezes nesta tarefa (item novo, pacote novo, handler novo) — todos passaram.

## Unitário — vitest

```bash
pnpm test                       # raiz roda tudo
pnpm --filter game test         # só apps/game
pnpm --filter game test -- test/formulas.test.ts   # um arquivo só
```

`apps/game/vitest.config.ts` já roda com `fileParallelism: false` (um arquivo de teste por
vez) pra não estourar memória com vários `GameServer`/Postgres embutido ao mesmo tempo — não
precisa passar `--maxWorkers` na mão.

### O harness (`apps/game/test/helpers.ts`)

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GameServer } from "../src/server.js";
import { loggedIn, startServer } from "./helpers.js";

let server: GameServer;
beforeAll(async () => { server = await startServer(); });
afterAll(async () => { await server.stop(); });

it("...", async () => {
  const { c, ch, player } = await loggedIn(server, { gold: 50000, grade: 20 });
  const p = player();           // GamePlayer em memória, já logado
  c.out(44, (pkg) => { pkg.writeInt(1); /* ... */ }); // manda um pacote
  const r = await c.code(44);   // espera a resposta desse código
  r.pkt.readInt();              // lê o corpo (offset já posicionado depois do header)
});
```

- `startServer(over?, opts?)` — `GameServer` real em portas efêmeras, Postgres = **PGlite
  em memória** (`sharedDb()`, migrado + semeado do zero), nunca toca no Postgres de
  desenvolvimento do dono.
- `loggedIn(server, { gold?, money?, weapon?, grade?, client? })` — cria conta + personagem
  + faz login completo (espera o fim do burst de login).
- `c.out(code, fill?)` — monta e manda um `PacketOut`.
- `c.code(code, sub?, from?)` — espera o próximo pacote com esse código (lança com a lista
  de códigos recebidos no timeout — ótimo pra descobrir o que o servidor respondeu de
  verdade).
- `createCharacter(db, opts)` — mais controle (sem login), pra testes que só precisam da
  linha no banco.
- `FakeClient.tcp(port)`/`.ws(url)` — mesma API, mas por socket de rede de verdade (uso
  raro; a maioria dos testes usa `FakeClient.memory(server)` via `loggedIn`, sem rede).

### Registrar um handler só pro teste (sem editar arquivo nenhum)

```ts
server.handlers.player(498, "TMP", (ctx, p, pkt) => { /* ... */ }); // depois de startServer()
```

Útil pra verificar um pacote/handler ANTES de decidir onde ele mora de verdade (foi assim
que verifiquei as receitas deste guia) — **nunca comite** um handler assim; é só pra
rascunho local.

### Limite real do protocolo (achado nesta tarefa)

Código de pacote **`>= 512` é dropado silenciosamente** pelo servidor
(`apps/game/src/session/client.ts:84`) — se seu teste trava esperando uma resposta que
nunca chega, confira isso primeiro.

## Matriz QA (`docs/qa-matrix.json`, 361 itens)

Status de cada funcionalidade por 2 eixos: `server` (estado do código: ok/partial/stub/
missing) e `verified` (estado em jogo: no/partial/yes). Ao implementar algo, atualize
`server`+`notes`; ao testar em jogo, atualize `verified`+`evidence`. Resumo legível:
`docs/QA-MATRIX.md`.

## Playwright — cliente real

```bash
cd apps/client && node scripts/smoke.mjs "http://localhost:5180/?user=X&key=auto&debug=true" 60 print.png
```

Abre num Chromium invisível (`chromium.launch()`, nunca MCP/perfil real — regra do
projeto), espera, mostra erros do console, tira print. Roteiro de cliques (`SMOKE_CLICKS`)
e variáveis completas: [`docs/client-pixi/COMO-RODAR.md`](../../client-pixi/COMO-RODAR.md).

Cliente Flash legado (Ruffle): `apps/client-harness/` — mesma ideia, outro runtime.

## Regra de ouro

Handler novo = teste novo no mesmo PR. Sem teste, sem merge (`apps/game/HANDLERS.md`,
cabeçalho). Prefira testar pela CAMADA mais baixa que exercita o bug de verdade: lógica
pura (função isolada) > handler via `FakeClient` > cliente real via Playwright — nessa
ordem de custo.
