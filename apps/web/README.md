# Site jogador — `apps/web` (React + Vite, porta 5173)

Cadastro/login, página Jogar (Ruffle embarcado), serverlist. Stack: React 19,
TanStack Router + Query, Hook Form + Zod, Tailwind 4, MSW (`public/`) pra mocks.

- Rotas: `src/router.tsx` · Páginas: `src/pages/` · API: `src/lib/`
- i18n PT-BR: `src/i18n.ts` · UI compartilhada: `packages/ui/`
- Fala com: `apps/api` (`routes/auth.ts`, `routes/public.ts`)

```bash
pnpm --filter web dev      # vite :5173
pnpm --filter web build    # tsc + build
```
Redesign premium só após jogo 100% (ver `docs/ROADMAP.md`).
