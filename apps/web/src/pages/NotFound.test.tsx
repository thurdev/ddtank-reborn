import { describe, expect, test } from "vitest";
import { screen } from "@testing-library/react";
import { renderAt } from "@/test/render";

describe("NotFoundPage", () => {
  test("renders a styled 404 (with site nav/footer) for an unknown route", async () => {
    await renderAt("/isso-nao-existe");
    expect(await screen.findByText("Essa sala não existe no mapa")).toBeInTheDocument();
    // SiteLayout's nav should still be present — the 404 is a child of `siteRoute`, not a bare fallback.
    expect(screen.getAllByRole("link", { name: /início/i }).length).toBeGreaterThan(0);
  });
});
