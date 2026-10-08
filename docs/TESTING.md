# Testes — unitário + Playwright + matriz QA

## Unitário (vitest, rápido, sem cliente)
- `pnpm test` (raiz roda tudo) ou por pacote: `pnpm --filter game test`.
- Game server: `apps/game/test/` — `helpers.ts` dá `loggedIn()`/`FakeClient`.
  Padrão: `handlers.test.ts`, `fight.test.ts`, `formulas.test.ts` etc.
- Novo handler/sistema = novo teste junto no mesmo PR. Sem teste, sem merge.

## Playwright (cliente de verdade, botão por botão)
- Harness: `apps/client-harness/` ([README](../apps/client-harness/README.md)).
  Sobe servidor local + cliente e executa ações reais no Flash/Ruffle.
- Gestos Flash são `startDrag` nativo (click-move-click), não press-and-hold —
  detalhe documentado em `apps/game/HANDLERS.md` (caso `BreakGoodsView`).
- Roteiro botão-por-botão: [MIGRATION-GAP.md](./MIGRATION-GAP.md#protocolo-playwright-botão-por-botão).

## Matriz QA (`qa-matrix.json` — 361 itens)
Campos: `key, area, func, code, name, files (AS3), server (ok/partial/stub/missing),
verified (no/partial/yes), notes, evidence`.
- `server`: estado do código. `verified`: estado em jogo. Só `verified:yes` + evidência conta.
- Ao implementar: atualiza `server` + `notes`. Ao testar em jogo: `verified` + `evidence`.
- Resumo legível: [QA-MATRIX.md](./QA-MATRIX.md). Dívida atual: [MIGRATION-GAP.md](./MIGRATION-GAP.md).
