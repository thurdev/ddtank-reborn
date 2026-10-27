# Site jogador — `apps/web` (React + Vite, porta 5173)

Cadastro/login, home, ranking, conta, Apoiar/Transparência, página Jogar (seletor de canal → abre o cliente
PixiJS quando `PIXI_CLIENT_URL` está definido — padrão em dev; senão Ruffle embarcado).
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

## Jogar (`src/pages/Play.tsx`): carrossel de personagem + seletor de canal

Task `multi-char`: um jogador autenticado vê primeiro um **carrossel de personagens**
(`GET /api/me/characters` → `CharacterCarousel`, `src/components/character/`) — cada
conta pode ter até `maxCharactersPerAccount` (admin) personagens. O card focado ganha
um render real em PixiJS (`CharacterStage`, ícones de equipamento em camadas + aura de
reforço/douração + balanço de idle leve); os cards ao lado usam um `<img>` estático bem
mais barato (`CharacterThumb`) — só existe UM canvas WebGL por vez. Teclado (setas +
Enter/Espaço), mouse e swipe escolhem; confirmar chama `onConfirm(slot)`, que refaz
`GET /api/public/config?slot=N` (`configQueryFor`) pra pegar um ticket daquele
personagem antes de mostrar o seletor de canal de sempre. Uma conta zerada (só o slot 1
pendente, nunca criado) pula o carrossel direto pro seletor de canal — ver
`docs/features/multi-personagem.md` pro fluxo completo e o gap de fidelidade do
renderer (não é o `ShowCharacter` real do cliente transpilado, que ainda não existe em
`main`).

Antes de abrir o cliente, a página busca `GET /api/public/channels` (mesma fonte/filtro do
`ServerList.ashx`, ver `apps/api/src/routes/public.ts` `channelList`/`ChannelInfo`: canais com `Enabled`
e sem `State = -1`, ordenados por `SortOrder`) e mostra um cartão por canal — nome, online/capacidade,
estado (`manutenção`/`aberto`/`quase cheio`/`cheio`, desabilita seleção nos dois primeiros), badges "Só
PvP"/"Canal novato"/faixa de nível. Escolher um canal é o que revela o `GameFrame`:

- **Cliente PixiJS** (`pixiUrl`): o `ws` do canal escolhido vai pro iframe como `?ws=` (parâmetro já
  documentado em `docs/client-pixi/COMO-RODAR.md`), então o jogo abre direto conectado nesse canal.
- **Ruffle (cliente clássico)**: o canal inicial continua sendo o que o próprio SWF resolve via
  `ServerList.ashx` internamente (não há flashvar de canal — ver `research/client/01-client-map.md`); o
  seletor dentro do hall já lista os mesmos canais e troca sem relogar (`research/client/
  channel-switch.md`, `ch-troca`). A página mostra um aviso nesse caso (`play.channel.ruffleHint`)
  explicando isso, em vez de fingir que forçou o canal.

Nenhum canal cadastrado (banco novo, sem seed) pula o seletor — mesmo fallback de canal único que
`channelSocketProxies` (`apps/api/src/routes/auth.ts`) já usa no servidor.

O toggle de cliente 4.1/6600 (`ClientToggle`, de `site-design`) continua no código (`?client=6600` na URL
funciona) mas fica escondido por padrão (`SHOW_6600_TOGGLE = false` em `Play.tsx`) — 6600 está em
stand-by (`docs/plan/TASKS.md`).

O botão "Baixar launcher" na barra da página Jogar reaproveita o mesmo `launcherUrl` (`GET
/api/public/config`) que a Home já usa — some sozinho se `LAUNCHER_DOWNLOAD_URL` não estiver configurado
no `apps/api`, sem link falso.

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
