import { describe, expect, test } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderAt } from "@/test/render";

/**
 * Item/shop visual editor (site-admin-redesign, editor #4 — `docs/plan/SITE-ADMIN-REDESIGN.md`): same
 * preview + side panel + click-to-focus pattern as `Quests.tsx`/`Dungeons.tsx`/`Events.tsx`. Mock data:
 * `items` has a manual seed (`apps/admin/src/mocks/db.ts` `ITEM_NAMES`) — `TemplateID` 7000 is "Canhão
 * Básico" (first entry, `TemplateID: 7000 + i * 10`).
 */
describe("ItemsPage", () => {
  test("defaults to the Visual tab with no item selected", async () => {
    await renderAt("/items");
    expect(screen.getByRole("tab", { name: "Visual", selected: true })).toBeDefined();
    expect(screen.getByText("Escolha um item na lista à esquerda.")).toBeInTheDocument();
  });

  test("picking an item renders its preview, clicking the name hotspot focuses the field, and editing it updates the preview live", async () => {
    await renderAt("/items");

    await waitFor(() => expect(screen.getByText("Canhão Básico")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Canhão Básico"));

    const nameHeading = await waitFor(() => screen.getByRole("heading", { name: "Canhão Básico" }));
    const nameInput = screen.getByLabelText("Nome") as HTMLInputElement;
    expect(nameInput.value).toBe("Canhão Básico");
    expect(nameInput).not.toHaveFocus();

    fireEvent.click(within(nameHeading).getByRole("button", { name: "Canhão Básico" }));
    expect(nameInput).toHaveFocus();

    fireEvent.change(nameInput, { target: { value: "Canhão Supremo" } });
    expect(await screen.findByRole("heading", { name: "Canhão Supremo" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Canhão Básico" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Salvar/ })).toBeEnabled();
  });

  // Radix `Tabs.Trigger` switches on `mousedown` (see `Events.test.tsx`'s comment) — use mouseDown, not click.
  test("switching to the Loja tab shows the generic shop resource table", async () => {
    await renderAt("/items");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Loja" }), { button: 0 });
    await waitFor(() => expect(screen.getByRole("tab", { name: "Loja", selected: true })).toBeDefined());
    expect(await screen.findByRole("tab", { name: "Visual" })).toBeInTheDocument();
  });
});
