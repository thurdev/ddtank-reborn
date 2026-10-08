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
