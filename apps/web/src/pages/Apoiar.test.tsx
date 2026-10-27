import { describe, expect, test } from "vitest";
import { screen } from "@testing-library/react";
import { renderAt } from "@/test/render";
import { BUY_ME_A_COFFEE_URL } from "./Apoiar";

/**
 * site-admin-redesign: `/apoiar` is now the official donation page (Buy Me a Coffee), the previous Pix flow
 * moved to `/apoiar/pix` as a self-host tool — see `Apoiar.tsx`'s doc comments for why.
 */
describe("ApoiarPage", () => {
  test("links to Buy Me a Coffee as the official donation channel", async () => {
    await renderAt("/apoiar");
    const cta = await screen.findByRole("link", { name: /Buy Me a Coffee/i });
    expect(cta).toHaveAttribute("href", BUY_ME_A_COFFEE_URL);
    expect(cta).toHaveAttribute("target", "_blank");
  });

  test("links out to the self-host Pix tool instead of embedding it", async () => {
    await renderAt("/apoiar");
    expect(await screen.findByRole("link", { name: /Pix/i })).toHaveAttribute("href", "/apoiar/pix");
    expect(screen.queryByText("Gerar Pix")).not.toBeInTheDocument();
  });
});

describe("ApoiarPixPage", () => {
  test("renders the self-host Pix donation form at /apoiar/pix", async () => {
    await renderAt("/apoiar/pix");
    expect(await screen.findByText("Gerar Pix")).toBeInTheDocument();
  });
});
