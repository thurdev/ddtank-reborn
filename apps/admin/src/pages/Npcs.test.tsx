import { describe, expect, test } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderAt } from "@/test/render";

/**
 * NPC/boss visual editor (site-admin-redesign, editor #5 — `docs/plan/SITE-ADMIN-REDESIGN.md`): same
 * preview + side panel + click-to-focus pattern as the previous editors. Mock data: `npcs` has no manual
 * seed (`apps/admin/src/mocks/db.ts`) — falls back to the generic auto-generator, `Name` = "Nome {ID}"
 * (field label "Nome" + 1-based index), same as `Dungeons.test.tsx` documented for an un-seeded resource.
 */
describe("NpcsPage", () => {
  test("defaults to the Visual tab with no NPC selected", async () => {
    await renderAt("/npcs");
    expect(screen.getByRole("tab", { name: "Visual", selected: true })).toBeDefined();
    expect(screen.getByText("Escolha um NPC na lista à esquerda.")).toBeInTheDocument();
  });

  test("picking an NPC renders its preview, clicking the name hotspot focuses the field, and editing it updates the preview live", async () => {
    await renderAt("/npcs");

    await waitFor(() => expect(screen.getByText("Nome 1")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Nome 1"));

    const nameHeading = await waitFor(() => screen.getByRole("heading", { name: "Nome 1" }));
    const nameInput = screen.getByLabelText("Nome") as HTMLInputElement;
    expect(nameInput.value).toBe("Nome 1");
    expect(nameInput).not.toHaveFocus();

    fireEvent.click(within(nameHeading).getByRole("button", { name: "Nome 1" }));
    expect(nameInput).toHaveFocus();

    fireEvent.change(nameInput, { target: { value: "Baroff" } });
    expect(await screen.findByRole("heading", { name: "Baroff" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Nome 1" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Salvar/ })).toBeEnabled();
  });
});
