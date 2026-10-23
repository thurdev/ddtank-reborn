/**
 * Filtros do Flash (dados) → filtros do Pixi (shaders).
 *
 * Os números não batem 1:1 (o blur do Flash é box-blur em passes; o do Pixi é
 * gaussiano), então os fatores abaixo foram escolhidos pra ficar visualmente
 * parecido. Se algum efeito ficar diferente do Flash, é aqui que ajusta.
 *
 * IMPORTANTE: timelines animam filtros (brilho pulsando) mudando-os todo
 * frame. Criar filtro Pixi novo a cada frame enche a GPU e derruba a aba —
 * por isso `toPixiFilters` REAPROVEITA as instâncias anteriores (mesmo tipo
 * na mesma posição) e só atualiza os valores.
 */
import { BlurFilter as PBlur, ColorMatrixFilter as PColorMatrix, type Filter } from "pixi.js";
import { BevelFilter as PBevel, DropShadowFilter as PDropShadow, GlowFilter as PGlow } from "pixi-filters";
import { BevelFilter } from "./BevelFilter";
import { BlurFilter } from "./BlurFilter";
import { ColorMatrixFilter } from "./ColorMatrixFilter";
import { DropShadowFilter } from "./DropShadowFilter";
import { GlowFilter } from "./GlowFilter";
import { GradientGlowFilter } from "./GradientGlowFilter";

const clampDist = (b: number) => Math.max(1, Math.min(20, Math.round(b / 2)));
/** filtros criados pelo XML do pickgliss trazem números como string ("0x0", "4"): o Flash converte */
const n = (v: unknown, d = 0): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : d;
  if (typeof v === "string" && /^\s*0x/i.test(v)) return parseInt(v, 16) || 0;
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
};

/** matriz 4x5 do Flash (offsets 0..255) → Pixi (offsets 0..1) */
function pixiMatrix(m: number[]): any {
  return [
    m[0]!, m[1]!, m[2]!, m[3]!, m[4]! / 255,
    m[5]!, m[6]!, m[7]!, m[8]!, m[9]! / 255,
    m[10]!, m[11]!, m[12]!, m[13]!, m[14]! / 255,
    m[15]!, m[16]!, m[17]!, m[18]!, m[19]! / 255,
  ];
}

/** cria um filtro Pixi novo, ou atualiza `prev` se for do mesmo tipo */
export function toPixiFilter(f: unknown, prev?: Filter): Filter | null {
  if (f instanceof ColorMatrixFilter) {
    const out = prev instanceof PColorMatrix ? prev : new PColorMatrix();
    out.matrix = pixiMatrix((f.matrix ?? []).map((v: unknown) => n(v)));
    return out;
  }
  if (f instanceof GlowFilter || f instanceof GradientGlowFilter) {
    const isG = f instanceof GradientGlowFilter;
    const color = n(isG ? f.colors?.[f.colors.length - 1] ?? 0xffffff : (f as GlowFilter).color);
    const alpha = n(isG ? f.alphas?.[f.alphas.length - 1] ?? 1 : (f as GlowFilter).alpha, 1);
    const inner = !isG && !!(f as GlowFilter).inner && String((f as GlowFilter).inner) !== "false";
    const strength = n(f.strength, 1);
    const d = clampDist(Math.max(n(f.blurX), n(f.blurY)));
    if (prev instanceof PGlow) {
      prev.distance = d;
      prev.outerStrength = inner ? 0 : strength;
      prev.innerStrength = inner ? strength : 0;
      prev.color = color;
      prev.alpha = alpha;
      return prev;
    }
    return new PGlow({ distance: d, outerStrength: inner ? 0 : strength, innerStrength: inner ? strength : 0, color, alpha, quality: 0.2, knockout: !isG && !!(f as GlowFilter).knockout && String((f as GlowFilter).knockout) !== "false" });
  }
  if (f instanceof DropShadowFilter) {
    const rad = (n(f.angle, 45) * Math.PI) / 180;
    const dist = n(f.distance, 4);
    const offset = { x: Math.cos(rad) * dist, y: Math.sin(rad) * dist };
    const alpha = Math.min(1, n(f.alpha, 1) * n(f.strength, 1));
    const blur = Math.max(n(f.blurX), n(f.blurY)) / 4;
    const color = n(f.color);
    if (prev instanceof PDropShadow) {
      prev.offset = offset;
      prev.color = color;
      prev.alpha = alpha;
      prev.blur = blur;
      return prev;
    }
    return new PDropShadow({ offset, color, alpha, blur, quality: 3, shadowOnly: !!f.hideObject && String(f.hideObject) !== "false" });
  }
  if (f instanceof BevelFilter) {
    if (prev instanceof PBevel) return prev;
    return new PBevel({ rotation: n(f.angle, 45), thickness: n(f.distance, 4) / 2, lightColor: n(f.highlightColor, 0xffffff), lightAlpha: n(f.highlightAlpha, 1), shadowColor: n(f.shadowColor), shadowAlpha: n(f.shadowAlpha, 1) });
  }
  if (f instanceof BlurFilter) {
    if (prev instanceof PBlur) {
      prev.strengthX = n(f.blurX, 4) / 2;
      prev.strengthY = n(f.blurY, 4) / 2;
      return prev;
    }
    return new PBlur({ strengthX: n(f.blurX, 4) / 2, strengthY: n(f.blurY, 4) / 2, quality: Math.max(1, n(f.quality, 1)) });
  }
  return null;
}

/**
 * Converte a lista inteira reaproveitando `prev` (filtros Pixi atuais do
 * objeto). Os que sobrarem sem uso são destruídos (libera a GPU).
 */
export function toPixiFilters(list: unknown[], prev: Filter[] = []): Filter[] {
  const out: Filter[] = [];
  const used = new Set<Filter>();
  list.forEach((f, i) => {
    const old = prev[i];
    const p = toPixiFilter(f, old && !used.has(old) ? old : undefined);
    if (p) { out.push(p); used.add(p); }
  });
  for (const old of prev) if (!used.has(old)) old.destroy();
  return out;
}
