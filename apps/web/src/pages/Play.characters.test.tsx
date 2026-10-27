import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { renderAt } from "@/test/render";
import { server } from "@/test/setup";
import { api, type Channel, type CharacterSlot, type MyCharacters, type PublicConfig } from "@/lib/api";

/** task multi-char: the character carousel the Play page shows before the channel picker. */

function mockChannels(channels: Channel[] = [{ id: 1, name: "Canal 1", state: 2, online: 1, capacity: 100, mustLevel: 0, lowestLevel: 0, pvpOnly: false, newerServer: false, wsUrl: "ws://canal1/ws" }]) {
  server.use(http.get("/api/public/channels", () => HttpResponse.json(channels)));
}

function mockCharacters(body: MyCharacters) {
  server.use(http.get("/api/me/characters", () => HttpResponse.json(body)));
}

const CREATED: CharacterSlot = {
  slot: 1,
  gameUserName: "jogador",
  created: true,
  id: 10,
  nickname: "Canhoneiro",
  level: 34,
  sex: "m",
  guild: "Artilharia BR",
  title: null,
  vip: { type: 1, level: 2 },
  nimbus: 203,
  equip: [{ place: 6, categoryId: 7, strengthenLevel: 9, isGold: false, iconRel: "image/arm/mockarm/1/icon.png" }],
};

describe("PlayPage character carousel", () => {
  beforeEach(() => {
    api.setToken("mock-jogador");
    mockChannels();
  });
  afterEach(() => {
    api.setToken(null);
  });

  test("shows the carousel before the channel picker when the account has a character", async () => {
    mockCharacters({ characters: [CREATED], maxCharacters: 3, canCreate: true });
    await renderAt("/play");

    expect(await screen.findByText("Escolha seu personagem")).toBeInTheDocument();
    expect(screen.getByText("Canhoneiro")).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.textContent?.replace(/\s+/g, " ").trim() === "VIP 2")).toBeInTheDocument();
    expect(screen.getByText("Nv. 34")).toBeInTheDocument();
    expect(screen.getByText("Artilharia BR")).toBeInTheDocument();
    // canCreate: true -> a trailing "create" card is offered
    expect(screen.getByText("Novo personagem")).toBeInTheDocument();
  });

  test("a fresh account (single not-yet-created slot) skips the carousel entirely", async () => {
    mockCharacters({ characters: [{ slot: 1, gameUserName: "jogador", created: false }], maxCharacters: 3, canCreate: true });
    await renderAt("/play");

    await screen.findByText("Canal 1"); // went straight to the channel picker
    expect(screen.queryByText("Escolha seu personagem")).not.toBeInTheDocument();
  });

  test("arrow keys move focus between cards; clicking the focused card's confirm button enters that character", async () => {
    mockCharacters({ characters: [CREATED], maxCharacters: 3, canCreate: true });
    await renderAt("/play");

    const track = await screen.findByRole("listbox", { name: "Escolha seu personagem" });
    const screenEl = track.parentElement!;
    screenEl.focus();
    fireEvent.keyDown(screenEl, { key: "ArrowRight" });
    await waitFor(() => expect(screen.getByRole("option", { selected: true })).toHaveTextContent("Novo personagem"));

    fireEvent.keyDown(screenEl, { key: "ArrowLeft" });
    await waitFor(() => expect(screen.getByRole("option", { selected: true })).toHaveTextContent("Canhoneiro"));
    const confirm = screen.getByRole("button", { name: "Entrar com este personagem" });
    fireEvent.click(confirm);

    await waitFor(() => expect(screen.queryByText("Escolha seu personagem")).not.toBeInTheDocument());
    await screen.findByText("Canal 1");
  });

  test("clicking a non-focused card only focuses it (does not confirm/create immediately)", async () => {
    let posts = 0;
    server.use(http.post("/api/me/characters", () => { posts++; return HttpResponse.json({ slot: 2, gameUserName: "jogador~2", created: false }, { status: 201 }); }));
    mockCharacters({ characters: [CREATED], maxCharacters: 3, canCreate: true });
    await renderAt("/play");

    await screen.findByText("Canhoneiro");
    fireEvent.click(screen.getByRole("option", { name: /./, selected: false }));
    // still on the carousel, nothing created yet
    expect(screen.getByText("Escolha seu personagem")).toBeInTheDocument();
    expect(posts).toBe(0);
  });

  test("the limit is reached: no 'create' card is offered", async () => {
    const chars: CharacterSlot[] = [1, 2, 3].map((slot) => ({ ...CREATED, slot, gameUserName: slot === 1 ? "jogador" : `jogador~${slot}`, nickname: `Char${slot}` }));
    mockCharacters({ characters: chars, maxCharacters: 3, canCreate: false });
    await renderAt("/play");

    await screen.findByText("Char1");
    expect(screen.queryByText("Novo personagem")).not.toBeInTheDocument();
  });

  test("creating a character from the carousel issues a ticket for the new slot's gameUserName", async () => {
    mockCharacters({ characters: [CREATED], maxCharacters: 3, canCreate: true });
    server.use(
      http.get("/api/public/config", ({ request }) => {
        const slot = new URL(request.url).searchParams.get("slot");
        const body: PublicConfig = {
          serverName: "DDTank Reborn · S1",
          launcherUrl: null,
          game: {
            rufflePath: "/ruffle/ruffle.js",
            swfUrl: "/client/Loading.swf",
            flashvars: { user: slot === "2" ? "jogador~2" : "jogador", key: "k", config: "http://localhost:8080/client/config.xml" },
            socketProxy: [],
            pixiUrl: "http://localhost:5180/",
            resourceUrl: "/resource/",
          },
        };
        return HttpResponse.json(body);
      }),
    );
    await renderAt("/play");

    await screen.findByText("Canhoneiro");
    fireEvent.click(await screen.findByRole("button", { name: "Próximo personagem" }));
    fireEvent.click(await screen.findByRole("button", { name: "Novo personagem" }));

    await waitFor(() => expect(screen.queryByText("Escolha seu personagem")).not.toBeInTheDocument());
    fireEvent.click(await screen.findByRole("button", { name: /Canal 1/ }));

    await waitFor(() => expect(document.querySelector("iframe")).not.toBeNull());
    const iframe = document.querySelector("iframe") as HTMLIFrameElement;
    expect(new URL(iframe.src).searchParams.get("user")).toBe("jogador~2");
  });
});
