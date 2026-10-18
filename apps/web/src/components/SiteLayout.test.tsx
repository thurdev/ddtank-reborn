import { describe, expect, test } from "vitest";
import { screen } from "@testing-library/react";
import { renderAt } from "@/test/render";

describe("SiteLayout", () => {
  test("renders nav links and the skip-to-content link", async () => {
    await renderAt("/");
    expect(screen.getByText("Pular para o conteúdo")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Ranking" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Apoiar" }).length).toBeGreaterThan(0);
  });
});
