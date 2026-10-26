import { describe, expect, test } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderAt } from "@/test/render";

/**
 * `/events?edit=<ActiveID>` (admin-ux-2): jumps straight to the "Tabela" tab with that event's edit dialog
 * open, same deep-link contract as a `ref` cell on another resource pointing at `events` (`crud/Cell.tsx`).
 * `ActiveID` 1 is the mock's first manually-seeded event (`apps/admin/src/mocks/db.ts` `events:` array, order
 * -> `ActiveID: i + 1`): "EXP em dobro de fim de semana".
 */
describe("EventsPage", () => {
  test("?edit=1 opens ActiveID 1's edit dialog on the Tabela tab", async () => {
    await renderAt("/events?edit=1");

    await waitFor(() => expect(screen.getByRole("heading", { name: "Editar EXP em dobro de fim de semana" })).toBeInTheDocument());
    // `hidden: true`: the open dialog's Radix overlay marks the rest of the page `aria-hidden`, so the tab
    // list is otherwise excluded from the accessibility tree even though it's still visually/structurally there.
    expect(screen.getByRole("tab", { name: "Tabela", selected: true, hidden: true })).toBeDefined();
  });

  test("without ?edit, opens on the Calendário tab and no dialog", async () => {
    await renderAt("/events");

    expect(screen.getByRole("tab", { name: "Calendário", selected: true })).toBeDefined();
    expect(screen.queryByRole("heading", { name: /^Editar /i })).not.toBeInTheDocument();
  });
});
