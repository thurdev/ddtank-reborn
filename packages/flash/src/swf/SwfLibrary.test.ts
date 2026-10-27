/**
 * perf-cliente: `SwfLibrary.$preload` hands newly-decoded images to PixiJS's `renderer.prepare` system as
 * soon as they load (`$prepareTextures`, see that file's comment for the measured stall this avoids —
 * real battle play showed multi-second main-thread stalls the first time a library with many shapes
 * finished loading, landing inside PixiJS's own `render()` GPU-upload step). This test only checks the
 * WIRING (the right textures reach `renderer.prepare.upload` once a library loads) — the actual upload
 * scheduling across frames is PixiJS's own `PrepareSystem`, not ours to re-test.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LibraryT } from "./library-types";

const uploadMock = vi.fn().mockResolvedValue(undefined);
vi.mock("../player", () => ({ currentRenderer: () => ({ prepare: { upload: uploadMock } }) }));

/** `<img>` stand-in: `loadImageOnce` (SwfLibrary.ts) sets `.src` and awaits `.onload`. */
class FakeImage {
  width = 10;
  height = 10;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_v: string) {
    queueMicrotask(() => this.onload?.());
  }
}

const LIBRARY: LibraryT = {
  version: 1,
  swf: "flash/ui/test/sample",
  frameRate: 25,
  width: 100,
  height: 100,
  chars: {
    1: { k: "shape", img: "shapes/1.png", r: [0, 0, 10, 10] },
    2: { k: "shape", img: "shapes/2.png", r: [0, 0, 10, 10] },
  },
  classes: {},
  main: { n: 1, f: [[]] },
};

describe("SwfLibrary $prepareTextures (perf-cliente)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    uploadMock.mockClear();
    vi.resetModules();
  });

  it("hands every newly-loaded character's texture to renderer.prepare.upload once the library loads", async () => {
    vi.stubGlobal("Image", FakeImage as unknown as typeof Image);
    // SwfLibrary.texture() does `im instanceof HTMLImageElement` to pick the premultiply mode — not
    // defined at all in vitest's plain node environment (no DOM), so the fake image class doubles as it.
    vi.stubGlobal("HTMLImageElement", FakeImage);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(String(url)).toContain("library.json");
        return { ok: true, json: async () => LIBRARY } as Response;
      }),
    );

    const { SwfLibrary } = await import("./SwfLibrary");
    await SwfLibrary.load("flash/ui/test/sample-unique-1");

    expect(uploadMock).toHaveBeenCalledTimes(1);
    const uploaded = uploadMock.mock.calls[0]![0] as unknown[];
    expect(uploaded).toHaveLength(2);
  });

  it("does nothing (no throw) when the active renderer has no prepare system yet", async () => {
    vi.doMock("../player", () => ({ currentRenderer: () => null }));
    vi.stubGlobal("Image", FakeImage as unknown as typeof Image);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => LIBRARY }) as Response),
    );

    const { SwfLibrary } = await import("./SwfLibrary");
    await expect(SwfLibrary.load("flash/ui/test/sample-unique-2")).resolves.toBeTruthy();
    expect(uploadMock).not.toHaveBeenCalled();
  });
});
