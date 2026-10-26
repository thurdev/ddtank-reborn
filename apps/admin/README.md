# Admin — `apps/admin` (React + Vite, porta 5174)

Painel: itens, mapas, NPCs, missões, textos PT-BR, overlay de assets, joins
(mostra nomes, não IDs). Mesma stack do site (Router + Query + Tailwind + MSW).

- Rotas: `src/router.tsx` · CRUD: `src/crud/` · Recursos: `src/resources/`, `src/pages/`
- Layout: `src/layout/` · i18n: `src/i18n.ts`
- Fala com: `apps/api` (`routes/admin.ts`, `admin-resources.ts`) + token bearer interno

```bash
pnpm --filter admin dev     # vite :5174
pnpm --filter admin build   # tsc + build
pnpm --filter admin test    # vitest (vitest.config.ts, src/test/setup.ts + render.tsx)
```
Reorganização das tabelas/joins pós jogo 100% (ver `docs/ROADMAP.md`).

## Lista genérica (`ResourcePage`): colunas, filtros, visões salvas (admin-ux-2)

- **Colunas**: botão "Colunas" abre um diálogo com um checkbox por campo `list: true` do recurso. Escolha
  persistida em `localStorage` por recurso (`crud/viewPrefs.ts` `loadVisibleCols`/`saveVisibleCols`,
  chave `ddtank.admin.cols.<resource>`), por viewer/navegador só — nunca sincroniza entre pessoas nem vai pro
  servidor. Sempre fica pelo menos 1 coluna visível.
- **Filtros por coluna** (botão "Filtros", `crud/ColumnFilters.tsx`): um controle por campo filtrável —
  texto/textarea (contém), número (faixa mín./máx.), boolean (qualquer/sim/não), `select` (valor exato) e
  `ref` (busca por nome com popup, igual o picker do formulário, reaproveitando `searchRef`). Os valores viram
  query params `cf_<campo>` / `cf_<campo>_min` / `cf_<campo>_max`, resolvidos **no servidor**: bloco genérico em
  `apps/api/src/routes/admin.ts` (rota de listagem, logo antes da busca livre `?q=`) que olha o tipo Drizzle da
  coluna (`boolean` → igualdade, `number` → igualdade ou faixa, resto → `LIKE` sem acento, mesmo helper
  `colSemAcento` da busca livre) — documentado no topo de `apps/api/src/routes/admin-resources.ts`. O mock
  (`src/mocks/handlers.ts` `applyColFilters`) espelha a mesma convenção usando o `FieldDef.type` do recurso
  (não tem coluna de banco pra inspecionar no mock).
- **Visões salvas** (botão "Visões"): nome + conjunto de colunas + filtros + ordenação atuais, por recurso,
  também só em `localStorage` (`crud/viewPrefs.ts` `loadViews`/`saveViews`, chave `ddtank.admin.views.<resource>`).
  Um `<select>` no topo da lista troca de visão instantaneamente; o diálogo "Visões" também lista/exclui as
  salvas.
- **Header fixo + clique na linha**: o `<thead>` dos campos ganhou `sticky top-14` (ancorado sob a barra
  `h-14` do `AdminLayout`) — `sticky` em cada `<Th>`, não no `<thead>`, pra funcionar em qualquer navegador.
  Clicar numa linha abre o registro, igual clicar no lápis — exceto quando o clique cai num controle
  interativo da própria linha (checkbox de seleção em massa, switch inline, chip `ref`, botão de ação): o
  handler usa `event.target.closest('button, input, select, textarea, a, [role="button"]')` pra não interceptar
  esses cliques, em vez de `stopPropagation()` espalhado por célula — é o ponto que uma tentativa anterior de
  header fixo quebrou (ver `docs/plan/TASKS.md` `admin-ux-2`), agora cobre por teste de componente.
- **`/events?edit=<ActiveID>`**: abre direto na aba "Tabela" com o diálogo de edição daquele evento aberto
  (mesmo contrato de deep-link que qualquer outro recurso genérico via `?edit=`, usado pelos chips `ref`).

Testes de componente (`vitest` + `@testing-library/react`, mocks via MSW `src/mocks/handlers.ts`):
`src/crud/ColumnFilters.test.ts` (função pura `buildColFilterParams`), `src/crud/ResourcePage.test.tsx`
(colunas/persistência, filtro de texto, visão salva + reaplicar, clique na linha com header fixo não quebra
checkbox/switch) e `src/pages/Events.test.tsx` (`?edit=`).
