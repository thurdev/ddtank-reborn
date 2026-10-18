import { createRootRouteWithContext, createRoute, createRouter, notFound, Outlet, redirect, useParams, useSearch } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { EmptyState } from "@ddtank/ui";
import { meQuery } from "@/lib/api";
import { AdminLayout } from "@/layout/AdminLayout";
import { LoginPage } from "@/pages/Login";
import { DashboardPage } from "@/pages/Dashboard";
import { ServerConfigPage } from "@/pages/ServerConfig";
import { EventsPage } from "@/pages/Events";
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
const eventsRoute = createRoute({ getParentRoute: () => authedRoute, path: "/events", component: EventsPage });
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
  authedRoute.addChildren([dashboardRoute, configRoute, eventsRoute, assetsRoute, mailRoute, donationsRoute, resourceRoute]),
]);

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({ routeTree, context: { queryClient }, defaultPreload: "intent" });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
