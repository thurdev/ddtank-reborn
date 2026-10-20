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

## Canais (vários servidores, `ch-tabela`/`ch-admin`/`ch-processo`/`ch-bus`)
Desenho completo: [MIGRACAO-6600.md — Requisito futuro](./plan/MIGRACAO-6600.md#requisito-futuro-vários-canais-decisão-do-dono-2026-10-17).
Hoje já dá pra rodar vários canais = vários processos `apps/game` reais no mesmo Postgres (`ch-processo`) com
um barramento Redis opcional entre eles (`ch-bus`, §"ch-bus" abaixo) pra login único, chat mundial/sussurro e
presença de amigo/sociedade em tempo real — o que ainda falta (eventos globais, trocar de canal sem relogar)
está em "O que ainda não funciona com 2+ canais" no fim desta seção.

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

### `ch-bus`: barramento entre canais (login único, chat mundial/sussurro, presença)

Pub/sub mínimo entre processos `apps/game` ("canais"), em `apps/game/src/bus/`:

- **`Bus`** (`bus/index.ts`): `publish(topic, msg)` / `subscribe(topic, fn)`. `createBus(cfg, log)` escolhe a
  implementação: `REDIS_URL` setado (`apps/game/.env`, ver `.env.example`) -> `createRedisBus` (`bus/redis.ts`,
  `ioredis`, 2 conexões PUB/SUB, JSON por tópico); vazio (padrão) -> `createNoopBus` — `publish` não faz nada,
  `subscribe` nunca dispara, e **o comportamento de um canal sozinho continua idêntico a antes desta tarefa**
  (nada atravessa processo). Uma 3ª implementação só de teste, `createMemoryBus` (`bus/memory.ts`), liga 2+
  `GameServer` em processo no mesmo "hub" sem precisar de Redis de verdade.
- **Coordenação** (`bus/cross-channel.ts` `wireCrossChannel(ctx)`, 1x por `GameServer.start()` — `ctx.bus` /
  `ctx.crossChannel`):
  1. **Login único entre canais** — login valida a sessão localmente (igual sempre); depois disso,
     `session/login.ts handleLogin` chama `ctx.crossChannel.kick(userId)`: publica um pedido, qualquer OUTRO
     canal que tenha esse `userId` no seu `World` manda o mesmo `Game.Server.LoginNext` + `quitPlayer` (salva
     e remove) e responde um ack; o novo login espera até 5 s por esse ack antes de seguir (mesma janela que
     o kick local já usava) — sem bus real (NoopBus) isso resolve na hora, zero atraso extra no login.
  2. **Sussurro (160/51 ONE_ON_ONE_TALK)** — quando o alvo não está neste canal, `chat-privado.ts` pergunta
     `ctx.crossChannel.whisper(...)` pros outros canais (até 1.5 s); "jogador offline"
     (`FriendAddHandler.Ofline`) só quando NINGUÉM em canal nenhum entregou.
  3. **Chat mundial/alto-falante (19 SCENE_CHAT, lobby sem sala)** — `scene-chat.ts` repassa o MESMO pacote
     (bytes crus via `GSPacket.encode()`/`GSPacket.parse()`, já que o layout não depende de `clientKind`) pros
     outros canais reenviarem aos seus jogadores locais fora de sala (bloqueio por amigo é checado em cada
     canal, é relação da conta que recebe). Chat de clã/termas/capela/sala continua só local (igual o C#
     original só relaying SCENE_CHAT/sussurro pelo Crosszone, nunca esses).
  4. **Presença de amigo/sociedade (160/165 FRIEND_STATE)** — a LISTA em si (`IMListLoad.ashx`/
     `ConsortiaUsersList.ashx` em `apps/api`) já lê `State` direto do Postgres compartilhado — já estava
     correta entre canais desde `ch-processo`, nada mudou aí. O que faltava era o PING em tempo real pra quem
     já está com a tela de amigos aberta: login/logout (`session/login.ts`) e troca manual de status
     (`status-amigo.ts`) agora também chamam `ctx.crossChannel.friendState(...)`, que avisa os outros canais
     pra notificarem localmente quem tem esse jogador como amigo/é da mesma sociedade.
- Testado em `apps/game/test/ch-bus.test.ts` (2 `GameServer` em processo com `createMemoryBus` ligando os
  dois — mesmo padrão de `ch-processo.test.ts`, só que com o barramento também "ligado" entre eles): kick
  cross-canal, sussurro entregue/offline, chat mundial cross-canal, aviso de amigo online cross-canal. Testes
  de 1 canal só (resto da suíte) continuam passando sem mudança — NoopBus por padrão.
- `docker-compose.yml` tem um serviço `redis` (imagem `redis:7-alpine`, sem persistência — é só coordenação,
  não dado) **opcional**: só é usado se `REDIS_URL` estiver setado em `apps/game/.env`. Todo serviço `game`/
  `game-<ID>` (gerado por `scripts/channels-compose.mjs`) usa o MESMO `env_file: apps/game/.env`, então setar
  `REDIS_URL=redis://redis:6379` uma vez já liga todos os canais ao mesmo barramento — nada por canal pra
  configurar. Dev local (`scripts/dev.mjs CHANNELS=...`): os processos extras herdam `process.env`, então um
  `REDIS_URL` no `.env` carregado pelo processo principal também propaga.

### `ch-eventos`: boss mundial compartilhado + liga/eventos agendados + aviso de admin entre canais

Em cima do `ch-bus` acima, falta coordenar o que o `Center.Crosszone.Server` original fazia como
`ActiveEvent`/`SystemNotice`/broadcast administrativo (`research/6600/crosszone.md`) — mas só onde existe
estado MUTÁVEL de verdade compartilhado entre canais; onde não existe, cada canal já resolve sozinho sem
precisar de líder nenhum:

- **Boss mundial (HP/ranking compartilhado)** — o único sistema desta tarefa com um contador mutável que
  TODOS os canais precisam ver igual (HP restante, ranking de dano). `bus/leader.ts` (`wireLeaderElection`)
  elege uma autoridade por gossip ("hello" a cada canal anuncia o próprio `SERVER_ID`; quem recebe um hello
  novo responde na hora, convergindo em 1-2 saltos do barramento): **líder = menor `SERVER_ID` entre os
  canais vistos vivos nos últimos 15s** — a opção simples que o dono pediu em vez de lock distribuído no
  Postgres, porque `claimOnce` (`game/events.ts`, chave única no Postgres) já garante que o prêmio/kill nunca
  duplica mesmo que por um instante 2 canais se considerem líder ao mesmo tempo; esta eleição só precisa ser
  "boa o suficiente", não um consenso rígido.
  - Só o LÍDER decrementa `blood`/atualiza `rank` de verdade (`handlers/eventos/boss-mundial.ts
    applyBossDamage`, chamado por `worldBossDamage` quando `ctx.leader.isLeader()`); um canal SEGUIDOR nunca
    decrementa o próprio HP — `worldBossDamage` só repassa o dano pro líder via barramento
    (`ctx.crossChannel.bossDamage`, `ch:boss:damage`) e espera o líder replicar o novo estado de volta
    (`ctx.crossChannel.bossSync`, `ch:boss:sync` → `mirrorBossSync`).
  - `handlers/eventos/agendador.ts` (`EventsRuntime.onStart`/`onEnd`, kind `worldboss`) só executa a abertura
    (HP cheio, limpa ranking) e o fechamento (paga ranking, uma vez — `finishWorldBoss`) de verdade quando
    `ctx.leader.isLeader()`; um seguidor pula esse bloco (o próprio `EventScheduler` dele continua tickando a
    MESMA janela, computada do mesmo `app."ScheduledEvents"` + relógio, só que o corpo do hook não faz nada) e
    espelha via `ch:boss:open`/`ch:boss:close` (`mirrorBossOpen`/`mirrorBossClose`) quando a mensagem do líder
    chegar.
  - **Prêmio pro ganhador que está logado num canal diferente do líder**: `finishWorldBoss` tenta
    `ctx.world.get(userId)` local primeiro (igual sempre); se não achar, tenta
    `ctx.crossChannel.deliverReward(userId, rewards, title)` (mesmo padrão do `whisper` — pergunta pros outros
    canais, espera um ack curto) antes de cair no fallback só-moeda direto no banco (`offlineCurrency`, pra
    quando o jogador não está online em canal nenhum).
  - Teste: `test/ch-eventos.test.ts` ("boss mundial compartilhado entre canais") — dano em AMBOS os canais
    reduz o MESMO HP, e o ranking só paga uma vez mesmo com o 1º lugar logado no canal seguidor.
- **Liga / outros eventos agendados sem contador mutável (double exp/gold, elite, weekly_reset)** — **não
  precisam de líder**: cada canal continua tickando o PRÓPRIO `EventScheduler` contra o mesmo
  `app."ScheduledEvents"` + o mesmo relógio (sem mudança nesta tarefa), então todos abrem a MESMA janela (mesma
  chave determinística `<eventId>@<startISO>`) e notificam os PRÓPRIOS jogadores locais ao mesmo tempo — é
  assim que "um evento só" já aparecia pro jogador antes desta tarefa. O que precisa ser "uma vez só" por
  jogador (ex. `weekly_reset`: zera semana da sociedade/liga) já era garantido por `claimOnce`
  (Postgres compartilhado) mesmo com N canais tickando ao mesmo tempo — testado em `events.test.ts` (1 canal)
  — **excessão parcial (m3-elite-brackets, 2026-10-19)**: a janela `elite_champion` (fase de campeão,
  `handlers/eventos/liga-elite.ts`) monta um bracket por CANAL a partir do `EliteScore` global (Postgres), mas
  o avanço de rodada/pareamento em si fica só na memória daquele canal — mesmo "fica por canal" já aceito pra
  `m3-consortia-battle`/`m3-ringstation` (ver tabela de pacotes). Jogadores de canais diferentes podem acabar
  em brackets DIFERENTES do mesmo grupo de nível simultaneamente; não replicado via `ctx.crossChannel`
  (follow-up se vier a ser pedido, mesma categoria do `m3-consortia-battle-2`).
  e de novo entre 2 canais em `test/ch-eventos.test.ts` ("evento agendado comum (liga)"). Forçar isto por um
  líder também traria uma regressão real: `expRate()`/`scheduler.rate()` são lidos LOCALMENTE em todo fight
  (XP/ouro em dobro) — um seguidor sem o próprio scheduler tickando perderia o bônus x2 pros jogadores dele.
- **Aviso de admin (`POST /broadcast` no canal interno, `admin/http.ts`)** — o canal que recebeu o POST já
  manda local (igual sempre) e agora também replica pros outros via `ctx.crossChannel.systemNotice`
  (`ch:system-notice`, no-op sem barramento ativo). `apps/api` ganhou `POST /api/admin/broadcast`
  (`apps/api/src/routes/admin.ts`) que só precisa falar com o canal LOCAL (`GAME_INTERNAL_URL`) — alcançar os
  outros é responsabilidade do `apps/game`, não do `apps/api` (diferente de `events/start`/`events/stop`/
  `reload-templates` puros, que ainda só atingem o canal local — gap não resolvido por esta tarefa). Teste:
  `test/ch-eventos.test.ts` ("aviso de admin").
- **41-hot-update** (`POST /hot-update`, `admin/http.ts`) — ferramenta NOVA e deliberada pra fechar o gap
  acima sem mudar o comportamento (silencioso, cache-only) do `/reload-templates` automático que todo CRUD do
  admin já dispara: reloada igual `/reload-templates` E empurra pros jogadores já conectados os pacotes que o
  cliente 4.1/6600 sabe processar sem relogar (stats/propriedades, progresso de missão, ícones de evento, aviso
  opcional — mapa completo em `docs/features/hot-update.md`), replicando pros OUTROS canais via
  `ctx.crossChannel.hotUpdate` (`ch:hot-update`, mesmo padrão do `systemNotice` acima). Chamado pelo botão
  "Aplicar agora" do painel (`ServerConfig.tsx`), não pelo CRUD genérico. Teste: `test/hot-update.test.ts`.
- **Failover do líder do boss mundial**: se o canal líder cair, os outros só reclassificam depois de ~15s sem
  ver o "hello" dele (`bus/leader.ts`) — até lá, dano repassado por um seguidor fica sem resposta (sem travar
  nada, só sem efeito) até o timeout da eleição. Quando o novo líder assume, ele usa o estado que já tinha
  espelhado (`rt.boss` populado pelo último `ch:boss:sync`/`ch:boss:open` do líder antigo) como ponto de
  partida — pode ficar levemente desatualizado no instante da troca, mas converge no próximo dano/sync.

### `ch-troca`: trocar de canal sem relogar no site

Desenho completo + citações de arquivo:linha do cliente: `research/client/channel-switch.md`. Resumo: o
cliente (4.1 e 6600, mesmo mecanismo nos dois) troca de canal pelo dropdown do hall
(`ServerDropList`/`ServerManager.connentServer`) **fechando o socket atual e abrindo um novo** pro host:porta
do canal escolhido, reenviando o pacote LOGIN com a MESMA conta + `tempPwd` (GameKey) já usada no primeiro
login — nenhum `.ashx` novo, nenhum pacote de "troca" dedicado, é um login comum só que pro canal 2.

Isso já funciona sem nenhum código novo, porque as 3 peças que ele precisa já existiam antes desta tarefa:

1. **Ticket reutilizável** — `validateGameLogin` (`packages/auth/src/index.ts`) só confere
   `GameKeyExpiresAt > now`, nunca apaga nem marca o GameKey como "já usado". TTL padrão 24h
   (`GAME_KEY_TTL_MIN`), então o mesmo `user,tempPwd` emitido no 1º login é aceito de novo por QUALQUER
   canal dentro da janela.
2. **Canal antigo salva e libera sem brigar com o login novo** — `handleLogin` já chama
   `ctx.crossChannel.kick(ch.UserID)` (`ch-bus`) em todo login, que derruba a sessão do mesmo usuário em
   outro canal (kitoff + `quitPlayer`, salva + `World.remove`) antes de responder o ack; o cliente também já
   fecha o próprio socket antigo ao reconectar, então o `c.onClosed` local chega no mesmo `quitPlayer`
   (idempotente, `p.quitting ??= doQuit(...)` — não importa qual caminho chega primeiro).
3. **Ruffle sabe abrir socket pra qualquer canal** — `channelSocketProxies` (`apps/api/src/routes/auth.ts`)
   já manda 1 entrada de `socketProxy` por canal habilitado em `playConfig`, servido 1x no load da página
   (todos os canais já mapeados antes de o jogador escolher qualquer um).

Testado em `apps/game/test/ch-troca.test.ts` (2 `GameServer` em processo com `createMemoryBus`, igual
`ch-bus.test.ts`): troca 4→5 com o MESMO ticket (sem reemitir webKey/GameKey), dado mutado em memória no
canal de origem persistido no Postgres antes da troca completar, online só no canal de destino, `clientKind`
sobrevive à troca, e 3 trocas seguidas (4→5→4→5) sem loop de kick nem jogador duplicado.

### O que ainda não funciona com 2+ canais (depois de `ch-bus`/`ch-eventos`/`ch-troca`)

- **King Division / GvG entre canais** — fora de escopo (decisão em `research/6600/crosszone.md`: matchmaking
  local normal quando chegar a vez, M3/M4), não é "boss mundial" nem precisa do líder de `ch-eventos`.
- **WebSocket dos canais extras sem TLS/Caddy** — o canal local continua `wss://` via Caddy; o `WsUrl` que
  `scripts/channels-compose.mjs` gera pros canais extras é `ws://` direto na porta publicada (sem proxy
  reverso/TLS) — funciona, mas é uma regressão de polish até alguém estender o Caddyfile pra rotear `/ws`
  por canal (fora do escopo de `ch-bus`, item de deploy).
- **Chat de clã (sociedade) entre canais** — por desenho desta tarefa, só chat mundial/sussurro atravessam
  canal (ver acima); membros de uma sociedade espalhados em canais diferentes não recebem o chat do clã um do
  outro ainda (o C# original fazia isso via Crosszone `CONSORTIA_CHAT`) — se vier a ser pedido, é o mesmo
  padrão do chat mundial (`ctx.crossChannel`), só um tópico novo.
