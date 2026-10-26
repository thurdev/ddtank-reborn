/**
 * Suavidade a 60 fps com a lógica a 25 fps.
 *
 * O jogo original roda a 25 quadros por segundo: timeline, física da bala,
 * tweens e câmera andam "de 40 em 40 ms". Acelerar a lógica quebraria tudo, então
 * a lógica continua a 25 e só o DESENHO fica suave: depois de cada quadro de
 * lógica guardamos posição/escala/alfa de cada nó do Pixi; na hora de desenhar
 * (60+ vezes por segundo) misturamos o estado anterior com o atual conforme o
 * tempo que passou, desenhamos, e devolvemos os valores reais (o código do jogo
 * nunca vê os valores interpolados).
 *
 * - Pulos grandes (> 150 px, troca de sinal da escala) não são interpolados
 *   (objeto reposicionado/teleportado). Rotação/skew sempre interpolam pelo
 *   caminho mais curto (mod 360°) — sem isso, qualquer timeline/tween que
 *   gire um objeto (bala, explosão, roleta...) fica suave em x/y/escala/alfa
 *   mas "travando" a 25fps na rotação, inconsistência bem visível.
 * - Nó que não existia no quadro anterior aparece direto no lugar atual.
 * - Desliga com `?interp=0`.
 */
import type { Container } from "pixi.js";

const params = typeof location !== "undefined" ? new URLSearchParams(location.search) : new URLSearchParams();
export const INTERP_ON = params.get("interp") !== "0";

const MAX_JUMP = 150;
const TAU = Math.PI * 2;

/** menor diferença angular de `a` pra `b`, em (-PI, PI] */
function angleDelta(a: number, b: number): number {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  else if (d < -Math.PI) d += TAU;
  return d;
}

interface Rec {
  frame: number;
  px: number; py: number; psx: number; psy: number; pa: number; prot: number; pskx: number; psky: number;
  cx: number; cy: number; csx: number; csy: number; ca: number; crot: number; cskx: number; csky: number;
}

const recs = new WeakMap<Container, Rec>();
let frame = 0;

function walk(n: Container, f: (n: Container) => void): void {
  f(n);
  const kids = n.children;
  for (let i = 0; i < kids.length; i++) walk(kids[i] as Container, f);
}

/** depois de cada quadro de lógica (e do flush do render-queue) */
export function snapshot(root: Container): void {
  if (!INTERP_ON) return;
  frame++;
  walk(root, (n) => {
    const x = n.position.x, y = n.position.y, sx = n.scale.x, sy = n.scale.y, a = n.alpha;
    const rot = n.rotation, skx = n.skew.x, sky = n.skew.y;
    let r = recs.get(n);
    if (!r) {
      recs.set(n, {
        frame, px: x, py: y, psx: sx, psy: sy, pa: a, prot: rot, pskx: skx, psky: sky,
        cx: x, cy: y, csx: sx, csy: sy, ca: a, crot: rot, cskx: skx, csky: sky,
      });
      return;
    }
    if (r.frame === frame - 1) {
      r.px = r.cx; r.py = r.cy; r.psx = r.csx; r.psy = r.csy; r.pa = r.ca;
      r.prot = r.crot; r.pskx = r.cskx; r.psky = r.csky;
    } else {
      r.px = x; r.py = y; r.psx = sx; r.psy = sy; r.pa = a;
      r.prot = rot; r.pskx = skx; r.psky = sky;
    }
    r.cx = x; r.cy = y; r.csx = sx; r.csy = sy; r.ca = a;
    r.crot = rot; r.cskx = skx; r.csky = sky;
    r.frame = frame;
  });
}

const touched: { n: Container; r: Rec }[] = [];

/** antes de desenhar: t = fração do próximo quadro de lógica já passada (0..1) */
export function applyInterp(root: Container, t: number): void {
  if (!INTERP_ON || t <= 0) return;
  // mostramos o estado entre o quadro anterior e o atual (atraso de até 1 quadro, como todo motor com interpolação)
  const k = t;
  walk(root, (n) => {
    const r = recs.get(n);
    if (!r || r.frame !== frame) return;
    // o jogo mexeu no nó depois do snapshot (ex.: mouse): não interpola
    if (
      n.position.x !== r.cx || n.position.y !== r.cy || n.scale.x !== r.csx || n.scale.y !== r.csy ||
      n.alpha !== r.ca || n.rotation !== r.crot || n.skew.x !== r.cskx || n.skew.y !== r.csky
    ) return;
    const dx = r.cx - r.px, dy = r.cy - r.py;
    const drot = angleDelta(r.prot, r.crot), dskx = angleDelta(r.pskx, r.cskx), dsky = angleDelta(r.psky, r.csky);
    const moved = dx !== 0 || dy !== 0, scaled = r.csx !== r.psx || r.csy !== r.psy, faded = r.ca !== r.pa;
    const rotated = drot !== 0, skewed = dskx !== 0 || dsky !== 0;
    if (!moved && !scaled && !faded && !rotated && !skewed) return;
    if (Math.abs(dx) > MAX_JUMP || Math.abs(dy) > MAX_JUMP) return;
    if (Math.sign(r.csx) !== Math.sign(r.psx) || Math.sign(r.csy) !== Math.sign(r.psy)) return;
    if (moved) n.position.set(r.px + dx * k, r.py + dy * k);
    if (scaled) n.scale.set(r.psx + (r.csx - r.psx) * k, r.psy + (r.csy - r.psy) * k);
    if (faded) n.alpha = r.pa + (r.ca - r.pa) * k;
    if (rotated) n.rotation = r.prot + drot * k;
    if (skewed) n.skew.set(r.pskx + dskx * k, r.psky + dsky * k);
    touched.push({ n, r });
  });
}

/** depois de desenhar: devolve os valores reais */
export function restoreInterp(): void {
  for (const { n, r } of touched) {
    n.position.set(r.cx, r.cy);
    n.scale.set(r.csx, r.csy);
    n.alpha = r.ca;
    n.rotation = r.crot;
    n.skew.set(r.cskx, r.csky);
  }
  touched.length = 0;
}
