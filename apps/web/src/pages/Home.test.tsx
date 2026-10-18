import { describe, expect, test } from "vitest";
import { screen } from "@testing-library/react";
import { renderAt } from "@/test/render";

describe("HomePage", () => {
  test("renders the hero and the CTA to play", async () => {
    await renderAt("/");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Mire. Sinta o vento. Dispare.");
    expect(screen.getAllByRole("link", { name: /jogar agora/i }).length).toBeGreaterThan(0);
  });

  test("renders the four feature cards", async () => {
    await renderAt("/");
    expect(await screen.findByText("Sem pay-to-win")).toBeInTheDocument();
    expect(screen.getByText("Código aberto")).toBeInTheDocument();
  });

  test("sets the page title", async () => {
    await renderAt("/");
    expect(document.title).toContain("DDTank Reborn");
  });
});
