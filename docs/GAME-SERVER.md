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

## Canais (vários servidores, `ch-tabela`/`ch-admin`)
Desenho completo: [MIGRACAO-6600.md — Requisito futuro](./plan/MIGRACAO-6600.md#requisito-futuro-vários-canais-decisão-do-dono-2026-10-17).
Hoje só existe 1 canal (`player."Server_List"` ID 4 "Reborn"), mas o modelo já nasceu pra vários:

- **1 canal = 1 linha** de `player."Server_List"` (editável no admin, página "Canais") **+ 1 processo
  `apps/game`** com `SERVER_ID` apontando pra essa linha (`Room`/`Total`/`ZoneId`/`ZoneName` vêm dela no boot
  e em todo `/reload-templates`; `Online` é gravado nela a cada heartbeat — `src/db/templates.ts`).
- `apps/api` também tem um `SERVER_ID` (mesmo valor do `apps/game` que serve o mesmo canal) — é o que
  `ServerList.ashx` usa pra saber de qual canal mostrar o `Online` em tempo real (`GAME_INTERNAL_URL`, o
  `/status` do seu próprio `apps/game`) em vez do valor gravado na linha (único jeito de saber de um canal que
  roda noutro processo, já que não existe barramento entre canais ainda — `ch-bus`).
- `IP`/`Port` de cada linha são o que o cliente recebe (`IP` direto; `Port` real — o cliente 4.1 soma 69, o
  6600 usa direto). Linha sem `IP`/`Port` (como o seed "Reborn") cai no fallback `GAME_HOST`/`GAME_PORT` do
  `apps/api` que está respondendo — é assim que o dev local continua funcionando sem configurar nada.
  `Enabled = false` tira o canal da lista pra todo mundo.

**Pra subir um 2º canal hoje** (sem `ch-processo`/`ch-bus`, cada canal isolado — sem chat/guilda/amigos entre
eles, sem impedir login simultâneo nos dois):
1. Admin → Canais → criar uma linha nova (ex. ID 5 "Canal 2"), porta pública própria, `Enabled = true`.
2. Copiar `apps/game/.env` pra outro processo, trocar `SERVER_ID=5`, `GAME_PORT`/`WS_PORT`/`POLICY_PORT`/
   `ADMIN_PORT` pra portas livres (não pode colidir com o canal 1 na mesma máquina).
3. Esse 2º `apps/game` escreve seu próprio `Online` na linha ID 5; o `apps/api` do canal 1 (`SERVER_ID=4`)
   mostra esse valor "estático" pro canal 2 (não é tempo real, porque não é o canal que ele serve).
4. `ch-processo` (fila) é o que automatiza passo 2 (1 serviço Docker por canal, gerado da tabela) e
   `ch-bus` é o barramento (Redis pub/sub) pra login único entre canais, chat mundial e presença de
   amigos/sociedade cross-canal — nenhum dos dois existe ainda.
