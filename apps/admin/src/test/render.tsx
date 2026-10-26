import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { render, waitFor } from "@testing-library/react";
import { expect } from "vitest";
import { I18nProvider } from "@/i18n";
import { api } from "@/lib/api";
import { createAppRouter } from "@/router";

/** Logs in as the mock `admin` account (role `admin`, see `src/mocks/handlers.ts`) without going through the
 *  login page — every `renderAt` call needs this since every route but `/login` sits behind `authedRoute`'s
 *  `role === "admin"` guard (`router.tsx`). */
export function loginAsAdmin() {
  api.setToken("mock-admin");
}

/** Renders the real app router at `path`, with mocked data (MSW, see src/test/setup.ts) wired up
 *  through react-query exactly like production. Used for page-level component tests. */
export async function renderAt(path: string) {
  loginAsAdmin();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const history = createMemoryHistory({ initialEntries: [path] });
  const router = createAppRouter(queryClient, { history });

  const view = render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </I18nProvider>,
  );

  await waitFor(() => expect(router.state.status).toBe("idle"));
  return { ...view, router, queryClient };
}
