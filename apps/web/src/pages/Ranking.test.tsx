import { describe, expect, test } from "vitest";
import { screen } from "@testing-library/react";
import { renderAt } from "@/test/render";

describe("RankingPage", () => {
  test("renders a top-3 podium and the full table", async () => {
    await renderAt("/ranking");
    // mock handler always returns "Canhoneiro" as rank #1 (src/mocks/handlers.ts)
    expect(await screen.findAllByText("Canhoneiro")).not.toHaveLength(0);
    // table + podium both render the #1 nickname, so there should be at least 2 occurrences
    expect(screen.getAllByText("Canhoneiro").length).toBeGreaterThanOrEqual(2);
  });
});
