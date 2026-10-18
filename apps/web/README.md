# Site jogador — `apps/web` (React + Vite, porta 5173)

Cadastro/login, home, ranking, conta, Apoiar/Transparência, página Jogar (Ruffle embarcado).
Stack: React 19, TanStack Router + Query, Hook Form + Zod, Tailwind 4, Framer Motion, MSW (`public/`) pra mocks.

- Rotas: `src/router.tsx` (toda página exceto Home é `lazyRouteComponent`, code-split por rota) ·
  Páginas: `src/pages/` · API: `src/lib/`
- i18n PT-BR: `src/i18n.ts` · UI compartilhada: `packages/ui/` (tokens "night sky artillery" em
  `packages/ui/src/styles.css`: navy/indigo + neon sun/coral/mint/sky, botões 3D "toy" com `shadow-toy`)
- Motion: `src/lib/motion.ts` (variants fade/stagger compartilhados; `MotionConfig reducedMotion="user"`
  em `SiteLayout` já desliga tudo isso quando o SO pede menos animação — nenhuma página precisa checar
  `prefers-reduced-motion` na mão)
- SEO: `src/lib/seo.ts` (`useSeo` — title + meta description/og/twitter por página, sem lib de head)
- Testes: `pnpm --filter web test` (vitest + jsdom + Testing Library, mocks via MSW/node reaproveitando
  `src/mocks/handlers.ts`; helper `src/test/render.tsx` monta o router real em memória)
- Fala com: `apps/api` (`routes/auth.ts`, `routes/public.ts`)

```bash
pnpm --filter web dev      # vite :5173
pnpm --filter web build    # tsc + build
pnpm --filter web test     # vitest run
```

## Arte pendente

O redesign (`feature/site-design`) reaproveitou arte existente em vez de gerar peças novas (fora do
escopo do agente de design): o hero da Home usa `public/play/bg-2560.{webp,avif}` (cena noturna já
usada na página Jogar) e `public/play/logo.webp` (logo "DD Reborn"). Nada quebra sem arte nova — os
slots abaixo são só para quando o dono gerar peças dedicadas (Higgsfield/Recraft, ver `docs/ROADMAP.md`):

- `public/art/hero-bg.webp` (+ `.avif`, ~2560×1200) — ilustração dedicada do hero da Home, hoje reusando
  o fundo da página Jogar. Trocar a referência em `src/pages/Home.tsx` (`HeroArt`) quando existir.
- `public/art/og-cover.jpg` (1200×630) — card de compartilhamento dedicado (hoje o `og:image` cai no
  `logo.webp`, que é um PNG com fundo transparente, não ideal pra redes sociais). Trocar o `image`
  default em `src/lib/seo.ts`.
