# Servidor jogo — `apps/game` (Node/TS)

Substitui `Center.Server` + `Game.Server` (+ Road/Fighting). Single-process:
sem center cross-server (chat pessoal = jogadores locais). Boot: `src/index.ts` →
`src/server.ts` (TCP + WS no mesmo protocolo, policy server 843).

## Mapa
| Parte | Código | Spec C# |
|---|---|---|
| Handlers de pacote (registro + status) | `src/handlers/` → índice em [HANDLERS.md](../apps/game/HANDLERS.md), roteador `handlers/registry.ts` | `spec/server/01-packet-handlers.md` |
| Saída (construtores de pacote) | `src/packets/out.ts` | `01-packet-handlers.md` |
| Núcleo (player, bolsa, quests, pets, VIP…) | `src/game/*.ts` (14 módulos) | `spec/server/02-systems.md` |
| Login/sessão/conexão | `src/session/` (`login.ts`, `client.ts`, `context.ts`) | `Game.Server/GamePlayer.cs` |
| Rede (TCP+WS, transports) | `src/net/transports.ts` | `00-architecture.md` |
| Salas PvP/PvE | `src/rooms/` (`room.ts`, `room-mgr.ts`) | `02-systems.md` |
| Bots | `src/bots/` (`bot.ts`, `provider.ts`) | `spec/combat/02-bots.md` |
| Combate (ponte p/ fight engine) | `src/fight/ddt.ts`, `stub.ts`, `types.ts` | `spec/combat/00-fight-engine.md`, `00a-tankcmd-table.md` |
| Admin channel interno | `src/admin/` | `GameAdmin` |
| DB local do game | `src/db/` → delega em `packages/db` | `spec/server/03-bussiness-procs.md` |

## Protocolo
`packages/protocol/` ([README](../packages/protocol/README.md)): `packet.ts` (pacote),
`framer.ts` (framing TCP/WS), `cipher.ts` + `rsa*.ts` (crypto), `byte-buffer.ts`,
`compress.ts` (zlib), `codes/` (tabelas). Comportamento espelha o cliente fixo —
em dúvida, o C# manda (`vendor/…:linha`).

## Banco
`packages/db/` ([README](../packages/db/README.md)): Drizzle ORM, migrações + seed.
Prod = Neon (URL pooled + `?sslmode=require`), dev = PGlite/local.
Toda mudança de schema vai em migração com rollback descrito no PR.

## Adicionar handler de pacote
1. Acha handler/manager em `vendor/DDTank41` + `01-packet-handlers.md`.
2. Implementa em `src/handlers/<sistema>.ts`, registra no `registry.ts`.
3. Teste `test/helpers.ts` (`loggedIn()`/`FakeClient`), atualiza HANDLERS.md.
4. Marca item correspondente em `docs/qa-matrix.json` (`server`, `notes`).

## Canais (vários servidores, `ch-tabela`/`ch-admin`/`ch-processo`)
Desenho completo: [MIGRACAO-6600.md — Requisito futuro](./plan/MIGRACAO-6600.md#requisito-futuro-vários-canais-decisão-do-dono-2026-10-17).
Hoje já dá pra rodar vários canais = vários processos `apps/game` reais no mesmo Postgres (`ch-processo`);
só falta o barramento entre eles (`ch-bus`, login único/chat mundial/presença cross-canal — ver "O que ainda
não funciona" no fim desta seção).

- **1 canal = 1 linha** de `player."Server_List"` (editável no admin, página "Canais") **+ 1 processo
  `apps/game`** com `SERVER_ID` apontando pra essa linha (`Room`/`Total`/`ZoneId`/`ZoneName` vêm dela no boot
  e em todo `/reload-templates`; `Online` é gravado nela a cada heartbeat — `src/db/templates.ts`).
- `apps/api` também tem um `SERVER_ID` (mesmo valor do `apps/game` que serve o mesmo canal) — é o que
  `ServerList.ashx` usa pra saber de qual canal mostrar o `Online` em tempo real (`GAME_INTERNAL_URL`, o
  `/status` do seu próprio `apps/game`) em vez do valor gravado na linha. Pros OUTROS canais (rodando noutro
  processo `apps/game`), `ServerList.ashx` consulta o `/status` do `InternalUrl` da própria linha (cacheado
  ~5s, `apps/api/src/routes/public.ts` `fetchRemoteStatus`) e só cai no `Online` gravado na linha se esse
  outro processo não responder (ou a linha não tiver `InternalUrl` ainda).
- `IP`/`Port` de cada linha são o que o cliente recebe (`IP` direto; `Port` real — o cliente 4.1 soma 69, o
  6600 usa direto). Linha sem `IP`/`Port` (como o seed "Reborn") cai no fallback `GAME_HOST`/`GAME_PORT` do
  `apps/api` que está respondendo — é assim que o dev local continua funcionando sem configurar nada.
  `Enabled = false` tira o canal da lista pra todo mundo.
- `WsUrl` (migração `0015_blue_frog_thor.sql`) é a URL WebSocket do canal, usada por `apps/api/src/routes/
  auth.ts` (`playConfig`/`channelSocketProxies`) pra montar o `socketProxy` do Ruffle com uma entrada POR
  CANAL habilitado — o navegador consegue abrir socket pra qualquer canal que o jogador escolher no seletor,
  não só o canal que este `apps/api` serve localmente. Vazio = cai no `GAME_WS_URL` de quem está respondendo
  (mesma convenção de `IP`/`Port`/`InternalUrl`).

### Produção: 1 serviço Docker por canal (`ch-processo`)

O `docker-compose.yml` base continua exatamente como antes (1 serviço `game` = canal local, `SERVER_ID` do
`apps/game/.env`). Canais extras ganham 1 serviço `game-<ID>` cada, gerados por `scripts/channels-compose.mjs`
a partir das linhas de `player."Server_List"`:

1. Admin → Canais → criar a linha nova (Nome, Estado "Aberto", `Enabled` = true). Não precisa calcular porta
   nem preencher `InternalUrl`/`WsUrl` — o gerador faz isso.
2. Gerar o override (dentro do container `api`, que já tem `@ddt/db`/`tsx` instalados e `DATABASE_URL`
   apontando pro `postgres` do compose):
   ```sh
   docker compose run --rm -v "$(pwd)/scripts:/repo/scripts:ro" --entrypoint "" api \
     sh -c "pnpm exec tsx /repo/scripts/channels-compose.mjs" > docker-compose.channels.yml
   ```
3. `docker compose -f docker-compose.yml -f docker-compose.channels.yml up -d --build`

O gerador grava de volta na linha (`Port`/`InternalUrl`/`WsUrl`) as portas que escolheu (convenção: N-ésimo
canal extra → `GAME_PORT` 9200+10N / `WS_PORT` 9300+10N / `ADMIN_PORT` 9400+10N; `POLICY_ENABLED=false` nos
extras — só o canal local responde o crossdomain policy em 843, o conteúdo não depende de canal) — rodar de
novo é idempotente, só preenche o que ainda está vazio. Ver o cabeçalho de `scripts/channels-compose.mjs` pra
mais detalhes e o comando equivalente pra dev local (`pnpm channels:compose`).

### Dev local: `CHANNELS=` / `--channels` no `scripts/dev.mjs`

`pnpm dev:all CHANNELS=5,6` (ou `node scripts/dev.mjs --channels 5,6`) sobe, além do canal padrão (`SERVER_ID`
4, inalterado), mais um processo `apps/game` local por id extra, cada um em portas livres escaneadas a partir
de 9500/9600/9700 (tcp/ws/admin) — nunca reusa nem mata as portas fixas do dono (3000/5173/5174/5432/8080/
9200/9300/9400/7788/843). Sem `CHANNELS`, o comportamento é idêntico a antes desta tarefa. Crie a linha do
canal no admin antes (mesmo fluxo de produção) pra ele ter `Room`/`Total`/`ZoneId`/`ZoneName` próprios —
sem linha ele ainda sobe, só com os defaults do `cfg`.

### Isolamento entre processos no mesmo Postgres (`apps/game/src/db/characters.ts`)

Dois processos `apps/game` com `SERVER_ID` diferentes compartilhando o mesmo Postgres não podem "lutar" pelo
mesmo dado. O que já era seguro (cada processo tem seu próprio `World` em memória, seu próprio heartbeat —
`UPDATE ... WHERE "id" = ${serverId}`) e o que foi corrigido nesta tarefa:

- **`resetAllOnline`** (boot de `GameServer.start()`, recuperação de crash: zera `State=1` travado por um
  shutdown sujo) fazia `UPDATE ... SET "State"=0 WHERE "State"=1` **sem filtro de canal** — reiniciar o canal 2
  zerava o "online" de jogadores DE VERDADE conectados no canal 1 no mesmo Postgres. Corrigido com a coluna
  `player."Sys_Users_Detail"."OnlineServerID"` (migração `0015_blue_frog_thor.sql`, gravada por
  `setOnlineState(db, userId, 1, cfg.SERVER_ID)` no login) — `resetAllOnline(db, serverId)` agora só zera linhas
  do próprio canal (linhas antigas, de antes desta migração, com `OnlineServerID` NULL, continuam sendo do
  canal 4 — o único que existia antes do `ch-processo`). Teste: `apps/game/test/ch-processo.test.ts`.
- Login/mundo em memória, `app."Servers"` e `player."Server_List"."Online"` já eram escritos só com `WHERE id =
  <SERVER_ID deste processo>` — nenhuma mudança necessária, só documentado.

### O que ainda não funciona com 2+ canais (fila: `ch-bus`)

- **Login simultâneo na mesma conta em 2 canais** — cada canal valida a sessão (`app."LoginSessions"`)
  independente; não existe "derrubar a sessão no outro canal" (`Center.Server`/`LoginMgr` do C# original)
  sem um barramento entre processos.
- **Chat mundial / sussurro entre canais** — cada canal só vê os jogadores no seu próprio `World` em memória.
- **Amigos/sociedade online "em qualquer canal"** — `WorldMgr.OnPlayerOnline`/`friendState` (session/login.ts)
  só notifica jogadores no MESMO processo; um amigo em outro canal aparece sempre offline pro canal que não é
  o dele.
- **Eventos globais coordenados (boss mundial, liga, King Division entre canais)** — cada canal roda seu
  próprio `EventScheduler`/`EventsRuntime` independente.
- **Trocar de canal sem relogar** — cada canal é uma conexão TCP/WS separada; hoje é sempre reconectar.
- **WebSocket dos canais extras sem TLS/Caddy** — o canal local continua `wss://` via Caddy; o `WsUrl` que
  `scripts/channels-compose.mjs` gera pros canais extras é `ws://` direto na porta publicada (sem proxy
  reverso/TLS) — funciona, mas é uma regressão de polish até alguém estender o Caddyfile pra rotear `/ws`
  por canal (fora do escopo desta tarefa).

Todos resolvidos por `ch-bus` (barramento Redis pub/sub entre processos) exceto o último (polish de deploy).
