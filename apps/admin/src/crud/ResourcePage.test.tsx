import { describe, expect, test } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderAt } from "@/test/render";

/**
 * Component tests for `ResourcePage` (admin-ux-2): column picker + persistence, per-column filters, saved
 * views, and the row-click-opens-edit behavior that a prior sticky-header attempt broke
 * (`docs/plan/TASKS.md` admin-ux-2). Uses the `bots` resource (`/bots`) — no `ref` columns, one `boolean`
 * inline-toggle column and one row-action-free list, so interactions aren't muddied by ref chips/pickers.
 * Mock data: `apps/admin/src/mocks/db.ts` seeds 6 bots, levels 5/14/23/32/41/50 (deterministic, seeded PRNG).
 */
describe("ResourcePage", () => {
  test("Colunas: hides a column and remembers the choice across remounts", async () => {
    const first = await renderAt("/bots");
    await screen.findByText("Robô Rabugento");
    expect(screen.getByText("Nível")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Colunas" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Nível" }));
    fireEvent.click(screen.getByRole("button", { name: "Concluído" }));
    expect(screen.queryByText("Nível")).not.toBeInTheDocument();

    first.unmount();
    await renderAt("/bots");
    await screen.findByText("Robô Rabugento");
    expect(screen.queryByText("Nível")).not.toBeInTheDocument();
  });

  test("Filtros: a text column filter narrows the list to matching rows (server-side contains)", async () => {
    await renderAt("/bots");
    await screen.findByText("Robô Rabugento");

    fireEvent.click(screen.getByRole("button", { name: /Filtros/ }));
    const nameFilter = screen.getByRole("textbox", { name: "Nome exibido" });
    fireEvent.change(nameFilter, { target: { value: "Pólvora" } });

    await waitFor(() => expect(screen.queryByText("Robô Rabugento")).not.toBeInTheDocument());
    expect(screen.getByText("Capitão Pólvora")).toBeInTheDocument();
  });

  test("Visões: saves the current filter as a named view and re-applies it later", async () => {
    await renderAt("/bots");
    await screen.findByText("Robô Rabugento"); // level 5

    fireEvent.click(screen.getByRole("button", { name: /Filtros/ }));
    const min = screen.getByRole("spinbutton", { name: "Nível mín." });
    fireEvent.change(min, { target: { value: "10" } });
    await waitFor(() => expect(screen.queryByText("Robô Rabugento")).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Visões/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "Nome da visão" }), { target: { value: "Nível alto" } });
    fireEvent.click(screen.getByRole("button", { name: /Salvar visão atual/ }));
    fireEvent.click(screen.getByRole("button", { name: "Concluído" }));

    // Clear the filter directly: the level-5 bot comes back.
    fireEvent.change(screen.getByRole("spinbutton", { name: "Nível mín." }), { target: { value: "" } });
    await waitFor(() => expect(screen.getByText("Robô Rabugento")).toBeInTheDocument());

    // Re-apply the saved view from the toolbar select: the filter (and the hidden bot) comes back.
    const viewSelect = screen.getByRole("combobox", { name: "Visão salva" });
    const option = within(viewSelect).getByText("Nível alto") as HTMLOptionElement;
    fireEvent.change(viewSelect, { target: { value: option.value } });
    await waitFor(() => expect(screen.queryByText("Robô Rabugento")).not.toBeInTheDocument());
  });

  test("row click (sticky header) opens the edit dialog; the bulk checkbox and the inline switch don't", async () => {
    await renderAt("/bots");
    await screen.findByText("Robô Rabugento");

    // Sticky header: every column header carries the sticky classes (admin-ux-2).
    const headers = screen.getAllByRole("columnheader");
    expect(headers.length).toBeGreaterThan(0);
    for (const h of headers) expect(h.className).toMatch(/sticky/);

    // Clicking a plain cell opens the edit dialog (dialog title is an <h2> — role "heading" skips the
    // sr-only <Description> that `DialogContent` renders with the same text when no description is given).
    fireEvent.click(screen.getByText("Robô Rabugento"));
    await screen.findByRole("heading", { name: "Editar Robô Rabugento" });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Editar Robô Rabugento" })).not.toBeInTheDocument());

    // Clicking the row's bulk-select checkbox toggles selection, not the edit dialog.
    fireEvent.click(screen.getByRole("checkbox", { name: "Selecionar Robô Rabugento" }));
    expect(screen.queryByRole("heading", { name: "Editar Robô Rabugento" })).not.toBeInTheDocument();
    expect(screen.getByText("1 selecionado(s)")).toBeInTheDocument();

    // Clicking the row's inline-toggle switch flips it, not the edit dialog.
    fireEvent.click(screen.getAllByRole("switch", { name: "Ativo" })[0]!);
    expect(screen.queryByRole("heading", { name: "Editar Robô Rabugento" })).not.toBeInTheDocument();
  });
});
