# Docs — índice mestre

> Começa aqui. Cada seção: **o quê** → **doc** → **código** → **spec**.
> Regras de trabalho: [CONTRIBUTING.md](../CONTRIBUTING.md) + [BRANCH-FLOW.md](./BRANCH-FLOW.md).
> Contexto IA: [AGENTS.md](../AGENTS.md).

## Trabalhar no repo
| Preciso… | Lê |
|---|---|
| Subir branch, PR, review, deploy | [BRANCH-FLOW.md](./BRANCH-FLOW.md) |
| Checklist de PR, licença, conduta | [CONTRIBUTING.md](../CONTRIBUTING.md) |
| O que falta migrar do C# (ordem) | [MIGRATION-GAP.md](./MIGRATION-GAP.md) |
| Matriz de testes (361 itens, status) | [qa-matrix.json](./qa-matrix.json) + [QA-MATRIX.md](./QA-MATRIX.md) |
| Testar (vitest + Playwright) | [TESTING.md](./TESTING.md) |
| Roadmap fases | [ROADMAP.md](./ROADMAP.md) |
| Backlog/feedback jogando | [BACKLOG.md](./BACKLOG.md), [REVISIT.md](./REVISIT.md) |
| Segurança / conduta / licença | [SECURITY.md](../SECURITY.md), [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md), [LICENSE](../LICENSE) |

## Por área do jogo
| Área | Guia | Código | Spec gerada do C# |
|---|---|---|---|
| API HTTP (.ashx → TS) | [API.md](./API.md) | `apps/api/src/` ([README](../apps/api/README.md)) | `spec/request/00-endpoints.md`, `00a-endpoint-catalog.md` |
| Servidor jogo (handlers, salas, bots) | [GAME-SERVER.md](./GAME-SERVER.md) | `apps/game/src/` ([HANDLERS](../apps/game/HANDLERS.md)) | `spec/server/00-architecture.md`, `01-packet-handlers.md`, `02-systems.md`, `03-bussiness-procs.md` |
| Combate / PvE / bots | [guides/pve.md](./guides/pve.md) | `packages/fight/`, `apps/game/src/fight/` | `spec/combat/00-fight-engine.md`, `00a-tankcmd-table.md`, `01-pve.md`, `01a-script-inventory.md`, `02-bots.md` |
| Protocolo binário/crypto | [GAME-SERVER.md](./GAME-SERVER.md#protocolo) | `packages/protocol/` ([README](../packages/protocol/README.md)) | `spec/server/01-packet-handlers.md` |
| Banco (Drizzle/Postgres) | [GAME-SERVER.md](./GAME-SERVER.md#banco) | `packages/db/` ([README](../packages/db/README.md)) | `research/db/00-summary.md`, `research/db/HOWTO-restore.md` |
| Site jogador | [apps/web](../apps/web/README.md) | `apps/web/src/` (React Router + Query + MSW) | — |
| Admin | [apps/admin](../apps/admin/README.md) | `apps/admin/src/` (CRUD + resources) | — |
| Cliente Flash/Ruffle/launcher | [CLIENT.md](./CLIENT.md) | `apps/launcher/`, `apps/client-harness/` | `research/client/01-client-map.md`, `02-ruffle-report.md`, `research/launcher/` |
| Assets / remaster IA / PT-BR texto | [CLIENT.md](./CLIENT.md#assets) | `tools/remaster/`, `tools/i18n/` | `research/i18n/`, `research/assets/00-assets.md` |
| Deploy / infra | [deploy/README](./deploy/README.md) | `docker/`, `docker-compose.yml` | `research/03-hosting.md`, `deploy/tailscale.md` |

## Origem C# (somente leitura, nunca editar)
`vendor/` — `DDTank41` (base), `DDTank4.1` (scripts PvE), `DDT-6600` (referência).
Ao portar comportamento, cita `vendor/…:linha` no código/PR. Pesquisa: `research/01-sources.md`,
`02-client-runtime.md`, `04-protocol-and-rewrites.md`.
