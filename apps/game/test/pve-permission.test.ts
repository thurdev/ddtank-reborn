// PvePermission (GamePlayer.SetPvePermission, GamePlayer.cs:5009) — o que o cliente 4.1 lê pra liberar as
// dificuldades (PVEMapPermissionManager.getPermission). Regressão: vencer a masmorra no Fácil não liberava o Normal.
import { describe, expect, it } from "vitest";
import { GamePlayer } from "../src/game/player.js";

/** Cópia da regra do cliente (`ddt/manager/PVEMapPermissionManager.as` getPermission). */
function clientAllows(pveId: number, hard: number, perm: string): boolean {
  const c = perm.substr(pveId - 1, 1).toUpperCase();
  if (c === "") return false;
  if (hard === 0) return true;
  if (hard === 1) return c !== "1";
  if (hard === 2) return c === "F" || c === "7";
  if (hard === 3) return c === "F";
  return false;
}

function fakePlayer(perm = ""): GamePlayer {
  const p = Object.create(GamePlayer.prototype) as GamePlayer;
  (p as unknown as { info: { PvePermission: string } }).info = { PvePermission: perm };
  return p;
}

describe("setPvePermission", () => {
  it("vencer Fácil libera Normal (e só ele)", () => {
    const p = fakePlayer();
    expect(p.setPvePermission(1, 1, false)).toBe(true);
    expect(clientAllows(1, 1, p.info.PvePermission!)).toBe(true);
    expect(clientAllows(1, 2, p.info.PvePermission!)).toBe(false);
    expect(clientAllows(2, 1, p.info.PvePermission!)).toBe(false); // outra masmorra continua travada
  });

  it("sobe um nível por vez, como o original (não pula Normal → Terror)", () => {
    const p = fakePlayer();
    expect(p.setPvePermission(3, 3, false)).toBe(false);
    expect(p.setPvePermission(3, 1, false)).toBe(true);
    expect(p.setPvePermission(3, 2, false)).toBe(true);
    expect(p.setPvePermission(3, 3, false)).toBe(true);
    expect(p.info.PvePermission![2]).toBe("F");
    expect(p.setPvePermission(3, 3, false)).toBe(false); // já no máximo
  });

  it("ignora id fora da faixa e dificuldade inválida", () => {
    const p = fakePlayer();
    expect(p.setPvePermission(0, 1, false)).toBe(false);
    expect(p.setPvePermission(51, 1, false)).toBe(false);
    expect(p.setPvePermission(1, 4, false)).toBe(false);
  });
});
