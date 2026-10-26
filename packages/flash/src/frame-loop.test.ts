/**
 * Ordem dos eventos de uma frame lógica, exatamente como a Adobe documenta
 * em `flash.events.Event.FRAME_CONSTRUCTED`:
 *
 *   enterFrame → tags do frame executam (timeline avança) → frameConstructed
 *   → frame scripts (`addFrameScript`) → exitFrame.
 *
 * Bug que este teste pega: se a timeline avançar ANTES de `ENTER_FRAME`
 * (como estava antes do fix em `player.ts`), qualquer listener de
 * `ENTER_FRAME` do jogo vê o frame já adiantado em 1 — toda animação
 * guiada por `ENTER_FRAME` (muito comum no código convertido do AS3) fica
 * um frame fora de sincronia com o Flash original.
 */
import { describe, expect, it, afterEach } from "vitest";
import { Event } from "./events/Event";
import { MovieClip, playingClips } from "./display/MovieClip";
import type { TimelineT } from "./swf/library-types";
import { runLogicFrame } from "./frame-loop";

function fakeTimeline(frames: number): TimelineT {
  return { n: frames, f: Array.from({ length: frames }, () => []), labels: {} } as TimelineT;
}

describe("runLogicFrame (ordem enterFrame → tags → frameConstructed → frame scripts → exitFrame)", () => {
  afterEach(() => playingClips.clear());

  it("ENTER_FRAME ve o frame ANTES da timeline avancar", () => {
    const mc = new MovieClip();
    mc.$tl = fakeTimeline(3);
    mc.$frame = 1;
    mc.$playing = true;
    playingClips.add(mc);

    const seen: number[] = [];
    mc.addEventListener(Event.ENTER_FRAME, () => seen.push(mc.currentFrame));

    runLogicFrame(() => {});

    expect(seen).toEqual([1]); // ainda no frame 1 quando ENTER_FRAME disparou
    expect(mc.currentFrame).toBe(2); // só avança depois do enterFrame
  });

  it("FRAME_CONSTRUCTED ve o frame DEPOIS da timeline avancar, antes do frame script", () => {
    const mc = new MovieClip();
    mc.$tl = fakeTimeline(3);
    mc.$frame = 1;
    mc.$playing = true;
    playingClips.add(mc);

    const order: string[] = [];
    mc.addEventListener(Event.FRAME_CONSTRUCTED, () => order.push(`frameConstructed@${mc.currentFrame}`));
    mc.addFrameScript(1, () => order.push(`frameScript@${mc.currentFrame}`)); // frame 2 (0-based: 1)
    mc.addEventListener(Event.EXIT_FRAME, () => order.push(`exitFrame@${mc.currentFrame}`));

    runLogicFrame(() => {});

    expect(order).toEqual(["frameConstructed@2", "frameScript@2", "exitFrame@2"]);
  });

  it("varias timelines avancam de forma independente (clipes aninhados)", () => {
    const parent = new MovieClip();
    parent.$tl = fakeTimeline(2);
    parent.$frame = 1;
    parent.$playing = true;
    const child = new MovieClip();
    child.$tl = fakeTimeline(5);
    child.$frame = 1;
    child.$playing = true;
    playingClips.add(parent);
    playingClips.add(child);

    runLogicFrame(() => {});

    expect(parent.currentFrame).toBe(2);
    expect(child.currentFrame).toBe(2);
    runLogicFrame(() => {});
    // parent com 2 frames da loop de volta pro 1; child (5 frames) segue pro 3
    expect(parent.currentFrame).toBe(1);
    expect(child.currentFrame).toBe(3);
  });
});
