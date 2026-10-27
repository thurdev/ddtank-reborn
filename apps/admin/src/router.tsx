import { createRootRouteWithContext, createRoute, createRouter, notFound, Outlet, redirect, useParams, useSearch } from "@tanstack/react-router";
import type { RouterHistory } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { EmptyState } from "@ddtank/ui";
import { meQuery } from "@/lib/api";
import { AdminLayout } from "@/layout/AdminLayout";
import { LoginPage } from "@/pages/Login";
import { DashboardPage } from "@/pages/Dashboard";
import { ServerConfigPage } from "@/pages/ServerConfig";
import { EventsPage } from "@/pages/Events";
import { QuestsPage } from "@/pages/Quests";
import { DungeonsPage } from "@/pages/Dungeons";
import { ItemsPage } from "@/pages/Items";
import { AssetsPage } from "@/pages/Assets";
import { MailPage } from "@/pages/Mail";
import { DonationsPage } from "@/pages/Donations";
import { ResourcePage } from "@/crud/ResourcePage";
import { resourceByName } from "@/resources";

interface RouterContext {
  queryClient: QueryClient;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  notFoundComponent: () => (
    <EmptyState title="Página não encontrada" className="m-8">
      404
    </EmptyState>
  ),
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: (s: Record<string, unknown>): { redirect?: string; denied?: boolean } => ({
    ...(typeof s.redirect === "string" ? { redirect: s.redirect } : {}),
    ...(s.denied ? { denied: true } : {}),
  }),
  component: LoginPage,
});

/** Auth guard: only users with role 'admin' get past this layout. */
const authedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "authed",
  beforeLoad: async ({ context, location }) => {
    const me = await context.queryClient.ensureQueryData(meQuery);
    if (!me) throw redirect({ to: "/login", search: { redirect: location.href } });
    if (me.role !== "admin") throw redirect({ to: "/login", search: { denied: true } });
    return { me };
  },
  component: AdminLayout,
});

const dashboardRoute = createRoute({ getParentRoute: () => authedRoute, path: "/", component: DashboardPage });
const configRoute = createRoute({ getParentRoute: () => authedRoute, path: "/config", component: ServerConfigPage });
/** `?edit=<ActiveID>` jumps straight to that event's edit dialog in the "Tabela" tab (same deep-link contract as
 *  the generic `resourceRoute` below, used by `ref` cells pointing at `events`). */
const eventsRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: "/events",
  validateSearch: (s: Record<string, unknown>): { edit?: string } => (typeof s.edit === "string" ? { edit: s.edit } : {}),
  component: EventsPage,
});
/**
 * Static route (wins over the generic `$resource` catch-all below, same trick as `/events`): `quests` is a
 * visual editor (site-admin-redesign), not a plain `ResourcePage` — see `pages/Quests.tsx`. The `quests`
 * `ResourceDef` is still registered (nav entry, `ref` targets from `quest-conditions`/`quest-goods` keep
 * resolving by name) and its "Tabela" tab is the same generic `ResourcePage` as before.
 */
const questsRoute = createRoute({ getParentRoute: () => authedRoute, path: "/quests", component: QuestsPage });
/** Same static-route trick for `dungeons` (Instâncias, editor #2) — see `pages/Dungeons.tsx`. */
const dungeonsRoute = createRoute({ getParentRoute: () => authedRoute, path: "/dungeons", component: DungeonsPage });
/** Same static-route trick for `items` (Itens/Loja, editor #4) — see `pages/Items.tsx`. */
const itemsRoute = createRoute({ getParentRoute: () => authedRoute, path: "/items", component: ItemsPage });
const assetsRoute = createRoute({ getParentRoute: () => authedRoute, path: "/assets", component: AssetsPage });
const mailRoute = createRoute({ getParentRoute: () => authedRoute, path: "/mail", component: MailPage });
const donationsRoute = createRoute({ getParentRoute: () => authedRoute, path: "/donations", component: DonationsPage });

function GenericResource() {
  const { resource } = useParams({ from: "/authed/$resource" });
  const { edit } = useSearch({ from: "/authed/$resource" });
  const def = resourceByName.get(resource)!;
  return <ResourcePage def={def} initialEditId={edit} />;
}

/** Any registered resource: /items, /bots, /texts ... (static routes above win). `?edit=<id>` opens that row's
 *  edit dialog on load — used by `ref` cells (crud/Cell.tsx) to jump to the related record. */
const resourceRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: "$resource",
  validateSearch: (s: Record<string, unknown>): { edit?: string } => (typeof s.edit === "string" ? { edit: s.edit } : {}),
  beforeLoad: ({ params }) => {
    if (!resourceByName.has(params.resource)) throw notFound();
  },
  component: GenericResource,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  authedRoute.addChildren([dashboardRoute, configRoute, eventsRoute, questsRoute, dungeonsRoute, itemsRoute, assetsRoute, mailRoute, donationsRoute, resourceRoute]),
]);

/** `history` is only ever overridden in tests (memory history instead of the real browser URL). */
export function createAppRouter(queryClient: QueryClient, opts?: { history?: RouterHistory }) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
    ...(opts?.history ? { history: opts.history } : {}),
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
