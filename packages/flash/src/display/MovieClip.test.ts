/**
 * Frame scripts da própria classe do símbolo (`tl.fs`, extraídos pelo
 * exportador do ABC embutido no SWF de asset — ver
 * tools/swf-export/src/swf-classes.ts).
 *
 * Bug que isso corrige: um personagem/monstro (`road.game.resource.ActionMovie`
 * e subclasses geradas por `SwfLibrary.$makeClass`) tem uma timeline com
 * segmentos "stand"/"walk"/"attack"/"die" e, no SWF original, cada segmento
 * termina com um frame script (`stop()` ou `gotoAndPlay("stand")`) compilado
 * dentro da própria classe do caractere (não é código do jogo). Sem isso, o
 * MovieClip nunca para: `$advance()` sempre avança pro próximo frame e volta
 * pro 1 no fim — a timeline entra, livre, em todos os segmentos em sequência
 * pra sempre (walk → attack → die → stand → walk...), mesmo o personagem
 * parado. `tl.fs` é a extração desses scripts; este teste verifica que
 * `$initSymbol` os liga em `$scripts` e que rodam na hora certa (frame
 * scripts: depois de FRAME_CONSTRUCTED, ver `frame-loop.ts`).
 */
import { describe, expect, it, afterEach } from "vitest";
import { MovieClip, playingClips } from "./MovieClip";
import type { TimelineT } from "../swf/library-types";
import { runLogicFrame } from "../frame-loop";

/** cria um MovieClip já com símbolo (pula o Loader de verdade) */
function withSymbolTimeline(tl: TimelineT): MovieClip {
  const mc = new MovieClip();
  mc.$initSymbol({ create: () => null, key: "test" }, tl);
  return mc;
}

describe("tl.fs (frame scripts do próprio caractere)", () => {
  afterEach(() => playingClips.clear());

  it("stop() no fim de um segmento trava a timeline (não entra livre no próximo segmento)", () => {
    // timeline de 10 frames: "stand" 1-5 (frame script no frame 5 = stop()), "walk" 6-10
    const tl: TimelineT = {
      n: 10,
      f: Array.from({ length: 10 }, () => []),
      labels: { stand: 1, walk: 6 },
      fs: { 4: [{ op: "stop" }] }, // 0-based frame 4 = frame 5 (1-based)
    };
    const mc = withSymbolTimeline(tl);
    mc.$playing = true;
    playingClips.add(mc);

    // avança frame a frame até o 5: o script de stop() deve rodar e travar ali
    for (let i = 0; i < 20; i++) runLogicFrame(() => {});

    expect(mc.currentFrame).toBe(5); // parou no frame do stop(), não "vazou" pro walk
    expect(mc.isPlaying).toBe(false);
  });

  it("gotoAndPlay(label) no fim do segmento faz a timeline voltar e repetir SÓ aquele segmento (loop de idle)", () => {
    const tl: TimelineT = {
      n: 10,
      f: Array.from({ length: 10 }, () => []),
      labels: { stand: 1, walk: 6 },
      fs: { 4: [{ op: "goto", to: "stand", play: true }] }, // frame 5 → volta pra "stand" (frame 1)
    };
    const mc = withSymbolTimeline(tl);
    mc.$playing = true;
    playingClips.add(mc);

    const seen: number[] = [];
    for (let i = 0; i < 12; i++) {
      runLogicFrame(() => {});
      seen.push(mc.currentFrame);
    }
    // nunca deveria passar do frame 5 (segmento "walk", frames 6-10) — sempre 1..5 em loop
    expect(Math.max(...seen)).toBeLessThanOrEqual(5);
    expect(mc.isPlaying).toBe(true); // continua "vivo", só não vaza pro próximo segmento
  });

  it("sem tl.fs, o comportamento antigo se mantem (free-run por toda a timeline, sem travar)", () => {
    const tl: TimelineT = { n: 4, f: Array.from({ length: 4 }, () => []) };
    const mc = withSymbolTimeline(tl);
    mc.$playing = true;
    playingClips.add(mc);
    for (let i = 0; i < 4; i++) runLogicFrame(() => {});
    expect(mc.currentFrame).toBe(1); // deu a volta inteira e repetiu, sem parar em lugar nenhum
    expect(mc.isPlaying).toBe(true);
  });
});
