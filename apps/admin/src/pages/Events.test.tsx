import { describe, expect, test } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
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

  // site-admin-redesign (editor #3): purely additive "Visual" tab — same preview + side panel + click-to-
  // focus pattern as Quests.tsx/Dungeons.tsx. Doesn't touch the Calendário/Tabela behavior asserted above.
  test("Visual tab: picking an event renders its preview, clicking the title hotspot focuses the field, editing updates the preview live", async () => {
    await renderAt("/events");
    // Radix's `Tabs.Trigger` switches on `mousedown`, not `click` (`@radix-ui/react-tabs`) — `fireEvent.click`
    // alone never fires it in jsdom (no real browser event sequence), unlike `userEvent.click` which this repo
    // doesn't depend on. Every other tab assertion in this file only reads the *initial* tab (set via
    // `useState`, no click needed), so this is the first test here to actually switch tabs.
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Visual" }), { button: 0 });
    await waitFor(() => expect(screen.getByRole("tab", { name: "Visual", selected: true })).toBeDefined());

    await waitFor(() => expect(screen.getByText("EXP em dobro de fim de semana")).toBeInTheDocument());
    fireEvent.click(screen.getByText("EXP em dobro de fim de semana"));

    const titleHeading = await waitFor(() => screen.getByRole("heading", { name: "EXP em dobro de fim de semana" }));
    const titleInput = screen.getByLabelText("Título") as HTMLInputElement;
    expect(titleInput.value).toBe("EXP em dobro de fim de semana");
    expect(titleInput).not.toHaveFocus();

    fireEvent.click(within(titleHeading).getByRole("button", { name: "EXP em dobro de fim de semana" }));
    expect(titleInput).toHaveFocus();

    fireEvent.change(titleInput, { target: { value: "EXP x2 de fim de semana" } });
    expect(await screen.findByRole("heading", { name: "EXP x2 de fim de semana" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Salvar/ })).toBeEnabled();
  });
});
