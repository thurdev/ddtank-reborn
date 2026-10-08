# API HTTP — `apps/api` (Fastify)

Substitui `Tank.Request` (.ashx). Regra nº 1: **byte-compatível** — mesmas URLs,
mesmo XML, mesmo zlib. Cliente Flash não muda. Catálogo completo gerado do C#:
[`spec/request/00a-endpoint-catalog.md`](./spec/request/00a-endpoint-catalog.md)
(resumo em `00-endpoints.md`).

## Mapa
| Rota | Código | Origem C# |
|---|---|---|
| `Request/*` (.ashx: login, serverlist, nickname…) | `src/request/endpoints/*.ts` + `registry.ts` + `routes/request.ts` | `Tank.Request/*.ashx` |
| Auth site (register/login/sessão) | `src/routes/auth.ts` | novo (site React) |
| Público (serverlist pro site) | `src/routes/public.ts` | novo |
| Admin REST | `src/routes/admin.ts`, `admin-resources.ts` | `GameAdmin` (parcial) |
| Rank | `src/rank.ts` | `Road.Service` (ver gap) |
| Estáticos/flash | `src/routes/static.ts`, `assets/flash/` | compilados originais |
| Players/helpers XML | `src/request/players.ts`, `lib/`, `templates/` | `Bussiness/*` managers |

## Adicionar endpoint .ashx
1. Acha o `.ashx` em `vendor/DDTank41` + entrada no `00a-endpoint-catalog.md`.
2. Cria `src/request/endpoints/<Nome>.ts`, registra em `registry.ts`.
3. Resposta em XML idêntico (compara byte com original em teste).
4. Teste em `apps/api` (ver [TESTING.md](./TESTING.md)).

## Config
`src/app.ts` (boot), `src/config.ts`, `src/context.ts`. `.env` via `.env.example`.
Segredos nunca no código. Dev: `pnpm --filter api dev`.
