import { describe, expect, test } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderAt } from "@/test/render";

/**
 * Quest visual editor (site-admin-redesign, editor #1 — `docs/plan/SITE-ADMIN-REDESIGN.md`): preview +
 * side panel, clicking a preview element focuses the matching field, editing updates the preview live.
 * Mock data: `apps/admin/src/mocks/db.ts` auto-generates 25 quests, `Title` = "Título {ID}" (generic
 * generator, field label "Título" + 1-based index) — quest #1 is "Título 1", deterministic across runs.
 */
describe("QuestsPage", () => {
  test("defaults to the Visual tab with no quest selected", async () => {
    await renderAt("/quests");
    expect(screen.getByRole("tab", { name: "Visual", selected: true })).toBeDefined();
    expect(screen.getByText("Escolha uma missão na lista à esquerda.")).toBeInTheDocument();
  });

  test("picking a quest renders its preview, clicking a preview hotspot focuses the matching field, and editing it updates the preview live", async () => {
    await renderAt("/quests");

    // Pick quest #1 from the list.
    await waitFor(() => expect(screen.getByText("Título 1")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Título 1"));

    // Preview renders the title inside a clickable hotspot, and the side panel field for it.
    const titleHeading = await waitFor(() => screen.getByRole("heading", { name: "Título 1" }));
    const titleInput = screen.getByLabelText("Título") as HTMLInputElement;
    expect(titleInput.value).toBe("Título 1");
    expect(titleInput).not.toHaveFocus();

    // Click the preview hotspot wrapping the title (its accessible name is the title itself, not an
    // "edit" label — see `Hotspot`'s doc comment) -> focuses the side-panel field for it.
    fireEvent.click(within(titleHeading).getByRole("button", { name: "Título 1" }));
    expect(titleInput).toHaveFocus();

    // Editing the field updates the preview live (no save needed).
    fireEvent.change(titleInput, { target: { value: "Resgate no Castelo" } });
    expect(await screen.findByRole("heading", { name: "Resgate no Castelo" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Título 1" })).not.toBeInTheDocument();

    // Save is now enabled (form is dirty).
    expect(screen.getByRole("button", { name: /Salvar/ })).toBeEnabled();
  });

  test("switching quest updates the preview and side panel to the newly picked one", async () => {
    await renderAt("/quests");
    await waitFor(() => expect(screen.getByText("Título 1")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Título 1"));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Título 1" })).toBeInTheDocument());

    fireEvent.click(screen.getByText("Título 2"));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Título 2" })).toBeInTheDocument());
    expect(screen.queryByRole("heading", { name: "Título 1" })).not.toBeInTheDocument();
  });
});
