# Como rodar o cliente PixiJS

## Pré-requisitos

- Servidores do projeto rodando: `apps/api` (porta 8080) e `apps/game`
  (TCP 9200 + WebSocket 9300 `/ws`). Ver `docs/GAME-SERVER.md` / `pnpm dev:all`.
  **Se subir `apps/api`/`apps/game` à mão (`pnpm --filter @ddt/api dev` etc.,
  não `pnpm dev:all`) sem `DATABASE_URL` no ambiente, cada um abre seu próprio
  PGlite embutido isolado em vez do Postgres — login funciona (cada um grava
  na própria base) mas o socket do jogo nunca bate a chave, e o cliente cai
  pra tela de login com "sua sessão expirou". Exporte `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/ddtank`
  (mesma URL que `pnpm --filter @ddt/db db:pg` sobe) antes dos dois.**
- Arte exportada em `apps/client/public/assets` (não vai pro git — gere com o
  `tools/swf-export`, ver [ASSETS.md](ASSETS.md)).
- Código do jogo gerado em `apps/client/src/game` (até o congelamento):
  `npx tsx tools/as3-to-ts/src/main.ts`.

## Subir

```bash
pnpm install
pnpm --filter @ddt/client dev        # http://localhost:5180
```

> O Vite **não vigia** `public/assets` (são dezenas de milhares de arquivos).
> Depois de exportar arte nova, reinicie o dev server (ou salve
> `apps/client/vite.config.ts`), senão os arquivos novos voltam como HTML.

## Entrar no jogo

O cliente lê os mesmos parâmetros que a página do Flash recebia:

```
http://localhost:5180/?user=<conta>&key=<chave>&debug=true
```

A `key` é de **uso único** e vem do login do site:

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"username":"pixitest","password":"pixitest123"}' \
  http://127.0.0.1:8080/api/auth/login
# → play.flashvars.key
```

Parâmetros opcionais: `api=<url da API>` (padrão: mesmo host, porta 8080),
`ws=<url websocket>` (padrão: `ws://<ip do servidor>:<porta+100>/ws`),
`config=<config.xml>`, `debug=true`.

## Pelo site (página Jogar)

Defina no `apps/api/.env` a URL do cliente:

```
PIXI_CLIENT_URL=http://localhost:5180/
```

Com isso a página **Jogar** do `apps/web` abre o cliente PixiJS num iframe
(passando `user`, `key` e `api`; `?debug=true` na página do site também passa
pro jogo). Sem a variável continua o Ruffle.

## Build de produção

```bash
pnpm --filter @ddt/client build      # apps/client/dist (copie junto public/assets)
```

## Teste automático (fumaça)

Abre o jogo num Chromium invisível, espera, mostra erros do console e tira print:

```bash
cd apps/client
node scripts/smoke.mjs "http://localhost:5180/?user=pixitest&key=auto&debug=true" 60 print.png
```

`key=auto` faz login na API (`SMOKE_USER`/`SMOKE_PASS`, padrão `pixitest`) e usa
uma chave nova a cada execução.

Variáveis:

| Variável | Para quê |
|---|---|
| `SMOKE_CHROME` | caminho do Chrome/Chromium (senão usa o do Playwright) |
| `SMOKE_CLICKS` | roteiro, passos separados por `;` (tabela abaixo) |
| `SMOKE_EVAL` | expressão JS avaliada no fim (ex.: `ddtDebug.find("okBtn").length`) |
| `SMOKE_EVAL_<nome>` | expressão usada pelo passo `eval:<nome>` no meio do roteiro |
| `SMOKE_WAIT_FOR` | espera essa expressão JS ficar verdadeira antes do roteiro |
| `SMOKE_TRACE_URL` | regex: mostra a pilha JS de quem pediu cada URL que bate (acha 404) |
| `SMOKE_ALL=1` | mostra todos os logs (não só os últimos) |
| `SMOKE_PAUSE_MS` / `SMOKE_SAMPLE_S` | pausa/amostra a pilha depois de cada clique (acha travamento) |
| `SMOKE_USER` / `SMOKE_PASS` | conta usada no `key=auto` |

Passos do roteiro (`SMOKE_CLICKS`):

| Passo | Faz |
|---|---|
| `x,y` | clique (coordenadas do jogo 1000×600) |
| `dbl:x,y` | duplo clique (equipar item) |
| `drag:x1,y1,x2,y2` | arrasta com o botão apertado |
| `wait:N` | espera N segundos |
| `key:Tecla:ms` | segura a tecla (ex.: `key:Space:1200` = atirar com 1,2 s de força) |
| `type:texto` | digita no campo com foco (chat, nome...) |
| `shot:arquivo.png` | print nesse ponto |
| `eval:nome` | avalia `SMOKE_EVAL_nome` nesse ponto |

Se a página travar (loop infinito), ele pausa o JS e mostra a pilha de onde travou.

### Roteiro até a batalha (conta nova, sem tutorial)

```bash
SMOKE_CLICKS="590,373;wait:3;480,300;wait:25;695,495;wait:5;380,476;wait:20;950,480;wait:70;500,300;key:ArrowUp:500;key:Space:1300;wait:8"   node scripts/smoke.mjs "http://localhost:5180/?user=pixitest&key=auto&debug=true" 80 batalha.png
```

Fecha o aviso do torneio → Salão de jogos → Criar sala → Confirmar → Começar
(depois de ~25 s sozinho na fila o servidor coloca um bot) → mira e atira.
