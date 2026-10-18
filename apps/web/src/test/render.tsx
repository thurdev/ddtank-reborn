import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { render, waitFor } from "@testing-library/react";
import { expect } from "vitest";
import { I18nProvider } from "@/i18n";
import { createAppRouter } from "@/router";

/** Renders the real app router at `path`, with mocked data (MSW, see src/test/setup.ts) wired up
 *  through react-query exactly like production. Used for page-level smoke tests. */
export async function renderAt(path: string) {
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
