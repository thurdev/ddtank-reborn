import { createRootRouteWithContext, createRoute, createRouter, lazyRouteComponent, Outlet, redirect } from "@tanstack/react-router";
import type { RouterHistory } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { SiteLayout } from "@/components/SiteLayout";
import { HomePage } from "@/pages/Home";
import { meQuery } from "@/lib/api";

// Code-split every page but Home: it's the critical-path bundle (first paint for most visits), the
// rest loads on navigation/hover (`defaultPreload: "intent"` below prefetches on link hover/focus).
const LoginPage = lazyRouteComponent(() => import("@/pages/Auth"), "LoginPage");
const RegisterPage = lazyRouteComponent(() => import("@/pages/Auth"), "RegisterPage");
const RankingPage = lazyRouteComponent(() => import("@/pages/Ranking"), "RankingPage");
const AccountPage = lazyRouteComponent(() => import("@/pages/Account"), "AccountPage");
const ApoiarPage = lazyRouteComponent(() => import("@/pages/Apoiar"), "ApoiarPage");
const ApoiarPixPage = lazyRouteComponent(() => import("@/pages/Apoiar"), "ApoiarPixPage");
const TransparenciaPage = lazyRouteComponent(() => import("@/pages/Transparencia"), "TransparenciaPage");
const PlayPage = lazyRouteComponent(() => import("@/pages/Play"), "PlayPage");

interface RouterContext {
  queryClient: QueryClient;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({ component: Outlet });

/** Requires a logged-in player; otherwise sends to /login?redirect=... */
async function requireAuth({ context, location }: { context: RouterContext; location: { href: string } }) {
  const me = await context.queryClient.ensureQueryData(meQuery);
  if (!me) throw redirect({ to: "/login", search: { redirect: location.href } });
}

const siteRoute = createRoute({ getParentRoute: () => rootRoute, id: "site", component: SiteLayout });

const homeRoute = createRoute({ getParentRoute: () => siteRoute, path: "/", component: HomePage });
const loginRoute = createRoute({
  getParentRoute: () => siteRoute,
  path: "/login",
  validateSearch: (s: Record<string, unknown>): { redirect?: string } =>
    typeof s.redirect === "string" ? { redirect: s.redirect } : {},
  component: LoginPage,
});
const registerRoute = createRoute({ getParentRoute: () => siteRoute, path: "/register", component: RegisterPage });
const rankingRoute = createRoute({ getParentRoute: () => siteRoute, path: "/ranking", component: RankingPage });
const apoiarRoute = createRoute({ getParentRoute: () => siteRoute, path: "/apoiar", component: ApoiarPage });
/** site-admin-redesign: self-host Pix tool, moved out of the main "Apoiar" flow — see `pages/Apoiar.tsx`
 *  `ApoiarPixPage`'s doc comment. */
const apoiarPixRoute = createRoute({ getParentRoute: () => siteRoute, path: "/apoiar/pix", component: ApoiarPixPage });
const transparenciaRoute = createRoute({ getParentRoute: () => siteRoute, path: "/transparencia", component: TransparenciaPage });
const accountRoute = createRoute({
  getParentRoute: () => siteRoute,
  path: "/account",
  beforeLoad: requireAuth,
  component: AccountPage,
});

// Play lives outside the site chrome: full-screen.
const playRoute = createRoute({ getParentRoute: () => rootRoute, path: "/play", beforeLoad: requireAuth, component: PlayPage });

const routeTree = rootRoute.addChildren([
  siteRoute.addChildren([homeRoute, loginRoute, registerRoute, rankingRoute, apoiarRoute, apoiarPixRoute, transparenciaRoute, accountRoute]),
  playRoute,
]);

/** `history` is only ever overridden in tests (memory history instead of the real browser URL). */
export function createAppRouter(queryClient: QueryClient, opts?: { history?: RouterHistory }) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
    scrollRestoration: true,
    ...(opts?.history ? { history: opts.history } : {}),
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
