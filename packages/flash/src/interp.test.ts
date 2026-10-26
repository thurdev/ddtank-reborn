/**
 * Interpolação de desenho (lógica a 25 fps, desenho a 60+): cobre a rotação,
 * que até esta correção não era interpolada (só x/y/escala/alfa) — um nó
 * que só gira (bala/roleta/explosão) ficava suave em posição mas "travando"
 * a 25fps na rotação, inconsistência visível.
 */
import { describe, expect, it, beforeEach } from "vitest";
import { Container } from "pixi.js";
import { applyInterp, restoreInterp, snapshot } from "./interp";

describe("interp (rotação)", () => {
  let root: Container;
  let child: Container;

  beforeEach(() => {
    root = new Container();
    child = new Container();
    root.addChild(child);
  });

  it("interpola rotação pelo caminho mais curto entre dois quadros de lógica", () => {
    child.rotation = 0;
    snapshot(root); // frame 1: sem histórico anterior, nada a interpolar ainda
    child.rotation = Math.PI / 2; // 90°, avançou 1 quadro de lógica
    snapshot(root); // frame 2

    applyInterp(root, 0.5); // metade do caminho até o próximo quadro de lógica
    expect(child.rotation).toBeCloseTo(Math.PI / 4, 5);
    restoreInterp();
    expect(child.rotation).toBeCloseTo(Math.PI / 2, 5); // valor real de volta após desenhar
  });

  it("atravessa o wrap de -PI/PI pelo caminho mais curto (não o longo)", () => {
    child.rotation = Math.PI - 0.1; // perto de 180°
    snapshot(root);
    child.rotation = -Math.PI + 0.1; // perto de -180° (girou só 0.2 rad, atravessando o wrap)
    snapshot(root);

    applyInterp(root, 0.5);
    // caminho curto: deveria estar perto de +/-PI, não em 0 (que seria o caminho longo)
    expect(Math.abs(child.rotation)).toBeGreaterThan(Math.PI - 0.2);
    restoreInterp();
  });

  it("nao interpola se o jogo mudou a rotacao depois do snapshot (ex.: clique)", () => {
    child.rotation = 0;
    snapshot(root);
    child.rotation = Math.PI / 2;
    snapshot(root);
    child.rotation = 1.23; // código do jogo mudou direto, fora do fluxo de lógica
    applyInterp(root, 0.5);
    expect(child.rotation).toBe(1.23); // não foi tocado
  });
});
