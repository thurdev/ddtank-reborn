# Admin — `apps/admin` (React + Vite, porta 5174)

Painel: itens, mapas, NPCs, missões, textos PT-BR, overlay de assets, joins
(mostra nomes, não IDs). Mesma stack do site (Router + Query + Tailwind + MSW).

- Rotas: `src/router.tsx` · CRUD: `src/crud/` · Recursos: `src/resources/`, `src/pages/`
- Layout: `src/layout/` · i18n: `src/i18n.ts`
- Fala com: `apps/api` (`routes/admin.ts`, `admin-resources.ts`) + token bearer interno

```bash
pnpm --filter admin dev     # vite :5174
pnpm --filter admin build   # tsc + build
```
Reorganização das tabelas/joins pós jogo 100% (ver `docs/ROADMAP.md`).
