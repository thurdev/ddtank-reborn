import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { renderAt } from "@/test/render";
import { server } from "@/test/setup";
import { api, type Channel, type PublicConfig } from "@/lib/api";

/** site-play: channel picker gates the Play page before the client (Ruffle or PixiJS) mounts. These tests log
 *  in as the seeded mock user (`src/mocks/handlers.ts`) so `/play`'s `requireAuth` beforeLoad doesn't redirect. */
const CHANNELS: Channel[] = [
  { id: 1, name: "Canal 1", state: 2, online: 10, capacity: 1000, mustLevel: 0, lowestLevel: 0, pvpOnly: false, newerServer: false, wsUrl: "ws://canal1/ws" },
  { id: 2, name: "Canal PvP", state: 2, online: 4, capacity: 300, mustLevel: 0, lowestLevel: 20, pvpOnly: true, newerServer: false, wsUrl: "ws://canal2/ws" },
  { id: 3, name: "Canal cheio", state: 5, online: 300, capacity: 300, mustLevel: 0, lowestLevel: 0, pvpOnly: false, newerServer: false, wsUrl: "ws://canal3/ws" },
];

function mockChannels(channels: Channel[]) {
  server.use(http.get("/api/public/channels", () => HttpResponse.json(channels)));
}

/** task multi-char: "jogador" (the seeded mock user) has one finished character, so the carousel always
 *  shows before the channel picker — confirm it once so the rest of these channel-picker tests see the
 *  exact same flow they did before this task. */
async function confirmCharacter() {
  const confirm = await screen.findByRole("button", { name: "Entrar com este personagem" });
  fireEvent.click(confirm);
  // `role="listbox"` (not the "Escolha seu personagem" heading text — round 2 drops that in pixi mode, see
  // CharacterCarousel.tsx) is what both the pixi and fallback carousel render, so this reliably detects the
  // carousel unmounting either way. Default RTL waitFor timeout (1000ms) can be tight when this file shares
  // a vitest worker with other Play*.test.tsx files (`isolate: false`, more queued async work) — more headroom.
  await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument(), { timeout: 5000 });
}

/** Pixi path (no Ruffle script loading needed in jsdom) so `GameFrame` just renders an iframe we can inspect. */
function mockPixiConfig() {
  server.use(
    http.get("/api/public/config", () => {
      const body: PublicConfig = {
        serverName: "DDTank Reborn · S1",
        launcherUrl: "/downloads/launcher.exe",
        game: {
          rufflePath: "/ruffle/ruffle.js",
          swfUrl: "/client/Loading.swf",
          flashvars: { user: "jogador", key: "mock-session-key", config: "http://localhost:8080/client/config.xml" },
          socketProxy: [],
          pixiUrl: "http://localhost:5180/",
          resourceUrl: "/resource/",
        },
      };
      return HttpResponse.json(body);
    }),
  );
}

describe("PlayPage channel picker", () => {
  beforeEach(() => {
    api.setToken("mock-jogador");
  });
  afterEach(() => {
    api.setToken(null);
  });

  test("lists channels from the API with online count and PvP/full state", async () => {
    mockChannels(CHANNELS);
    await renderAt("/play");
    await confirmCharacter();

    expect(await screen.findByText("Canal 1")).toBeInTheDocument();
    expect(screen.getByText("Canal PvP")).toBeInTheDocument();
    expect(screen.getByText("Canal cheio")).toBeInTheDocument();
    expect(screen.getByText("10/1000 online")).toBeInTheDocument();
    expect(screen.getByText("Só PvP")).toBeInTheDocument();
    expect(screen.getByText("Cheio")).toBeInTheDocument();
  });

  test("a full channel can't be selected (disabled)", async () => {
    mockChannels(CHANNELS);
    await renderAt("/play");
    await confirmCharacter();

    await screen.findByText("Canal cheio");
    const full = screen.getByRole("button", { name: /Canal cheio/ });
    expect(full).toBeDisabled();
  });

  test("picking a channel opens the game targeting that channel's websocket (PixiJS)", async () => {
    mockChannels(CHANNELS);
    mockPixiConfig();
    await renderAt("/play");
    await confirmCharacter();

    const pvpChannel = await screen.findByRole("button", { name: /Canal PvP/ });
    fireEvent.click(pvpChannel);

    await waitFor(() => expect(document.querySelector("iframe")).not.toBeNull());
    const iframe = document.querySelector("iframe") as HTMLIFrameElement;
    const src = new URL(iframe.src);
    expect(src.origin + src.pathname).toBe("http://localhost:5180/");
    expect(src.searchParams.get("ws")).toBe("ws://canal2/ws");
    expect(src.searchParams.get("user")).toBe("jogador");

    // The top bar now shows the chosen channel and lets the player go back to the picker.
    expect(screen.getByText("Canal PvP")).toBeInTheDocument();
  });

  test("clicking the channel name in the top bar returns to the picker", async () => {
    mockChannels(CHANNELS);
    mockPixiConfig();
    await renderAt("/play");
    await confirmCharacter();

    fireEvent.click(await screen.findByRole("button", { name: /Canal 1/ }));
    await waitFor(() => expect(document.querySelector("iframe")).not.toBeNull());

    fireEvent.click(screen.getByRole("button", { name: /Canal 1/ }));
    expect(await screen.findByText("Escolha um canal")).toBeInTheDocument();
  });

  test("skips the picker entirely when no channel is configured (fresh/unseeded DB)", async () => {
    mockChannels([]);
    mockPixiConfig();
    await renderAt("/play");
    await confirmCharacter();

    await waitFor(() => expect(document.querySelector("iframe")).not.toBeNull());
    expect(screen.queryByText("Escolha um canal")).not.toBeInTheDocument();
  });

  test("the 4.1/6600 client toggle is hidden (6600 on hold)", async () => {
    mockChannels(CHANNELS);
    mockPixiConfig();
    await renderAt("/play");
    await confirmCharacter();

    fireEvent.click(await screen.findByRole("button", { name: /Canal 1/ }));
    await waitFor(() => expect(document.querySelector("iframe")).not.toBeNull());
    expect(screen.queryByText("6600")).not.toBeInTheDocument();
  });
});
