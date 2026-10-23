# Como rodar o cliente PixiJS

## Pré-requisitos

- Servidores do projeto rodando: `apps/api` (porta 8080) e `apps/game`
  (TCP 9200 + WebSocket 9300 `/ws`). Ver `docs/GAME-SERVER.md` / `pnpm dev:all`.
- Arte exportada em `apps/client/public/assets` (não vai pro git — gere com o
  `tools/swf-export`, ver [ASSETS.md](ASSETS.md)).
- Código do jogo gerado em `apps/client/src/game` (até o congelamento):
  `npx tsx tools/as3-to-ts/src/main.ts`.

## Subir

```bash
pnpm install
pnpm --filter @ddt/client dev        # http://localhost:5180
```

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

## Build de produção

```bash
pnpm --filter @ddt/client build      # apps/client/dist (copie junto public/assets)
```

## Teste automático (fumaça)

Abre o jogo num Chromium invisível, espera, mostra erros do console e tira print:

```bash
cd apps/client
node scripts/smoke.mjs "http://localhost:5180/?user=x&key=y&debug=true" 60 print.png
```

Variáveis: `SMOKE_CHROME` (caminho do chrome.exe), `SMOKE_EVAL` (expressão JS
pra avaliar na página, ex.: `ddtDebug.find("okBtn").length`), `SMOKE_ALL=1`
(todos os logs), `SMOKE_CLICKS="500,300;100,50"` (clica nesses pontos). Se a
página travar (loop infinito), ele pausa o JS e mostra a pilha de onde travou.
