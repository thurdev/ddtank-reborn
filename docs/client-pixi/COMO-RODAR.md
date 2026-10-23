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

Variáveis: `SMOKE_CHROME` (caminho do chrome.exe), `SMOKE_EVAL` (expressão JS
pra avaliar na página, ex.: `ddtDebug.find("okBtn").length`), `SMOKE_ALL=1`
(todos os logs), `SMOKE_CLICKS="500,300;wait:5;key:Space:1200"` (clica, espera
5 s, segura Espaço 1,2 s — atirar). Se a
página travar (loop infinito), ele pausa o JS e mostra a pilha de onde travou.

### Roteiro até a batalha (conta nova, sem tutorial)

```bash
SMOKE_CLICKS="590,373;wait:3;480,300;wait:25;695,495;wait:5;380,476;wait:20;950,480;wait:70;500,300;key:ArrowUp:500;key:Space:1300;wait:8"   node scripts/smoke.mjs "http://localhost:5180/?user=pixitest&key=auto&debug=true" 80 batalha.png
```

Fecha o aviso do torneio → Salão de jogos → Criar sala → Confirmar → Começar
(depois de ~25 s sozinho na fila o servidor coloca um bot) → mira e atira.
