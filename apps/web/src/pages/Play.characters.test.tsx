import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { renderAt } from "@/test/render";
import { server } from "@/test/setup";
import { api, type Channel, type CreatedCharacterSlot, type MyCharacters, type PublicConfig } from "@/lib/api";

/** task multi-char: the character carousel the Play page shows before the channel picker. */

function mockChannels(channels: Channel[] = [{ id: 1, name: "Canal 1", state: 2, online: 1, capacity: 100, mustLevel: 0, lowestLevel: 0, pvpOnly: false, newerServer: false, wsUrl: "ws://canal1/ws" }]) {
  server.use(http.get("/api/public/channels", () => HttpResponse.json(channels)));
}

function mockCharacters(body: MyCharacters) {
  server.use(http.get("/api/me/characters", () => HttpResponse.json(body)));
}

const CREATED: CreatedCharacterSlot = {
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
  style: ",,3135|hair35,,5139|cloth39,6119|face18,1109|head8,,,",
  colors: ",,,,,,,,,",
  skin: "",
  equip: [{ place: 6, categoryId: 7, strengthenLevel: 9, isGold: false, iconRel: "image/arm/mockarm/1/icon.png", templateId: 70001, pic: "mockarm", needSex: 1, property1: 0, property8: 0, level: 1 }],
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

    // task multi-char (round 2): the big page heading is dropped in pixi mode — the choicefigure backdrop
    // already has its own baked title plate, showing both read as two stacked titles. The listbox itself
    // still carries the name for accessibility.
    expect(await screen.findByRole("listbox", { name: "Escolha seu personagem" })).toBeInTheDocument();
    // Nickname and the "create" card's label still reach the DOM as `sr-only` text (role=option hit boxes
    // carry no other visible content once a real AvatarStage iframe is drawing everyone — see
    // CharacterCarousel.tsx) — canCreate: true -> a trailing "create" card is offered.
    expect(screen.getByText("Canhoneiro")).toBeInTheDocument();
    expect(screen.getByText("Novo personagem")).toBeInTheDocument();
    // VIP/level/guild are drawn INSIDE the Pixi nameplate now (coordinator ask, round 2), not as DOM text —
    // assert them off the single AvatarStage iframe's `chars` payload instead.
    const iframe = document.querySelector(".avatar-stage__iframe") as HTMLIFrameElement;
    const chars = JSON.parse(new URL(iframe.src).searchParams.get("chars") ?? "[]");
    expect(chars[0]).toMatchObject({ nickname: "Canhoneiro", grade: "34", vipLevel: "2", consortiaName: "Artilharia BR" });
  });

  test("a fresh account (single not-yet-created slot) skips the carousel entirely", async () => {
    mockCharacters({ characters: [{ slot: 1, gameUserName: "jogador", created: false }], maxCharacters: 3, canCreate: true });
    await renderAt("/play");

    await screen.findByText("Canal 1"); // went straight to the channel picker
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
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

    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
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
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(posts).toBe(0);
  });

  test("renders the real character (single AvatarStage iframe, every card) when the server has a PixiJS client configured", async () => {
    mockCharacters({ characters: [CREATED], maxCharacters: 3, canCreate: true });
    server.use(
      http.get("/api/public/config", () => {
        const body: PublicConfig = {
          serverName: "DDTank Reborn · S1",
          launcherUrl: null,
          game: {
            rufflePath: "/ruffle/ruffle.js",
            swfUrl: "/client/Loading.swf",
            flashvars: { user: "jogador", key: "k", config: "http://localhost:8080/client/config.xml" },
            socketProxy: [],
            pixiUrl: "http://localhost:5180/",
            resourceUrl: "http://localhost:8080/resource/",
          },
        };
        return HttpResponse.json(body);
      }),
    );
    await renderAt("/play");

    await screen.findByText("Canhoneiro");
    // task multi-char (round 2): ONE stage for the whole carousel (not one iframe per card) — the roster
    // (both cards: the real character + the trailing "create" slot) travels in `chars`, not per-card query
    // params; which one is centered is pure `postMessage`, never part of the iframe `src`.
    const iframe = document.querySelector(".avatar-stage__iframe") as HTMLIFrameElement;
    expect(iframe).toBeTruthy();
    expect(document.querySelectorAll(".avatar-stage__iframe")).toHaveLength(1);
    const src = new URL(iframe.src);
    expect(src.origin + src.pathname).toBe("http://localhost:5180/avatar.html");
    expect(src.searchParams.get("api")).toBe("http://localhost:8080");
    const chars = JSON.parse(src.searchParams.get("chars") ?? "[]");
    expect(chars).toHaveLength(2); // the one real character + the trailing "create" slot
    expect(chars[0].kind).toBe("character");
    expect(chars[0].nickname).toBe("Canhoneiro");
    expect(chars[0].style).toBe(CREATED.style);
    expect(chars[0].sex).toBe("1");
    expect(chars[1].kind).toBe("create");
    // falls back to the icon-stack renderer, never both at once
    expect(document.querySelector(".character-stage")).toBeNull();
  });

  test("the limit is reached: no 'create' card is offered", async () => {
    const chars: CreatedCharacterSlot[] = [1, 2, 3].map((slot) => ({ ...CREATED, slot, gameUserName: slot === 1 ? "jogador" : `jogador~${slot}`, nickname: `Char${slot}` }));
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

    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    fireEvent.click(await screen.findByRole("button", { name: /Canal 1/ }));

    await waitFor(() => expect(document.querySelector("iframe")).not.toBeNull());
    const iframe = document.querySelector("iframe") as HTMLIFrameElement;
    expect(new URL(iframe.src).searchParams.get("user")).toBe("jogador~2");
  });
});
