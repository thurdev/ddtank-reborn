import { describe, expect, test } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderAt } from "@/test/render";

/**
 * Dungeon visual editor (site-admin-redesign, editor #2 — `docs/plan/SITE-ADMIN-REDESIGN.md`): same
 * preview + side panel + click-to-focus pattern as `Quests.tsx`, plus a mission-chain diagnostics strip per
 * difficulty fed by `GET /api/admin/dungeons/:id/diagnostics` (mocked in `mocks/handlers.ts` — the real
 * engine isn't available to the mock, see that handler's doc comment). Mock data: `dungeons` has a manual
 * seed (`apps/admin/src/mocks/db.ts`, not the generic auto-generator) — ID 1 is "Ninho dos Formigões", ID 2
 * is "Castelo do Rei Galo", both level-gated and with all 4 difficulties scripted.
 */
describe("DungeonsPage", () => {
  test("defaults to the Visual tab with no dungeon selected", async () => {
    await renderAt("/dungeons");
    expect(screen.getByRole("tab", { name: "Visual", selected: true })).toBeDefined();
    expect(screen.getByText("Escolha uma masmorra na lista à esquerda.")).toBeInTheDocument();
  });

  test("picking a dungeon renders its preview, clicking a preview hotspot focuses the matching field, and editing it updates the preview live", async () => {
    await renderAt("/dungeons");

    await waitFor(() => expect(screen.getByText("Ninho dos Formigões")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Ninho dos Formigões"));

    const nameHeading = await waitFor(() => screen.getByRole("heading", { name: "Ninho dos Formigões" }));
    const nameInput = screen.getByLabelText("Nome") as HTMLInputElement;
    expect(nameInput.value).toBe("Ninho dos Formigões");
    expect(nameInput).not.toHaveFocus();

    fireEvent.click(within(nameHeading).getByRole("button", { name: "Ninho dos Formigões" }));
    expect(nameInput).toHaveFocus();

    fireEvent.change(nameInput, { target: { value: "Castelo do Bugão" } });
    expect(await screen.findByRole("heading", { name: "Castelo do Bugão" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Ninho dos Formigões" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Salvar/ })).toBeEnabled();
  });

  test("a difficulty lane renders its mission chain once diagnostics load", async () => {
    await renderAt("/dungeons");
    await waitFor(() => expect(screen.getByText("Ninho dos Formigões")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Ninho dos Formigões"));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Ninho dos Formigões" })).toBeInTheDocument());

    // The seed row (mocks/db.ts) has all 4 difficulties scripted, so one "Cadeia de fases" lane renders per
    // difficulty once the diagnostics query resolves.
    await waitFor(() => expect(screen.getAllByText("Cadeia de fases").length).toBe(4));
  });
});
