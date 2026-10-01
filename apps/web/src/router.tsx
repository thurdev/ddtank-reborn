import { createRootRouteWithContext, createRoute, createRouter, Outlet, redirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { SiteLayout } from "@/components/SiteLayout";
import { HomePage } from "@/pages/Home";
import { LoginPage, RegisterPage } from "@/pages/Auth";
import { RankingPage } from "@/pages/Ranking";
import { AccountPage } from "@/pages/Account";
import { PlayPage } from "@/pages/Play";
import { meQuery } from "@/lib/api";

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
const accountRoute = createRoute({
  getParentRoute: () => siteRoute,
  path: "/account",
  beforeLoad: requireAuth,
  component: AccountPage,
});

// Play lives outside the site chrome: full-screen.
const playRoute = createRoute({ getParentRoute: () => rootRoute, path: "/play", beforeLoad: requireAuth, component: PlayPage });

const routeTree = rootRoute.addChildren([
  siteRoute.addChildren([homeRoute, loginRoute, registerRoute, rankingRoute, accountRoute]),
  playRoute,
]);

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({ routeTree, context: { queryClient }, defaultPreload: "intent", scrollRestoration: true });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
