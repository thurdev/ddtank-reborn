/**
 * Filtros do Flash (dados) → filtros do Pixi (shaders).
 *
 * Os números não batem 1:1 (o blur do Flash é box-blur em passes; o do Pixi é
 * gaussiano), então os fatores abaixo foram escolhidos pra ficar visualmente
 * parecido. Se algum efeito ficar diferente do Flash, é aqui que ajusta.
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

export function toPixiFilter(f: unknown): Filter | null {
  if (f instanceof ColorMatrixFilter) {
    const m = f.matrix ?? [];
    const out = new PColorMatrix();
    // Flash: offsets (coluna 5) em 0..255; Pixi: 0..1
    out.matrix = [
      m[0]!, m[1]!, m[2]!, m[3]!, m[4]! / 255,
      m[5]!, m[6]!, m[7]!, m[8]!, m[9]! / 255,
      m[10]!, m[11]!, m[12]!, m[13]!, m[14]! / 255,
      m[15]!, m[16]!, m[17]!, m[18]!, m[19]! / 255,
    ] as any;
    return out;
  }
  if (f instanceof GlowFilter) {
    const d = clampDist(Math.max(f.blurX, f.blurY));
    return new PGlow({
      distance: d,
      outerStrength: f.inner ? 0 : f.strength,
      innerStrength: f.inner ? f.strength : 0,
      color: f.color,
      alpha: f.alpha,
      quality: 0.2,
      knockout: f.knockout,
    });
  }
  if (f instanceof GradientGlowFilter) {
    const color = f.colors?.[f.colors.length - 1] ?? 0xffffff;
    return new PGlow({ distance: clampDist(Math.max(f.blurX, f.blurY)), outerStrength: f.strength, color, alpha: f.alphas?.[f.alphas.length - 1] ?? 1, quality: 0.2 });
  }
  if (f instanceof DropShadowFilter) {
    const rad = (f.angle * Math.PI) / 180;
    return new PDropShadow({
      offset: { x: Math.cos(rad) * f.distance, y: Math.sin(rad) * f.distance },
      color: f.color,
      alpha: Math.min(1, f.alpha * f.strength),
      blur: Math.max(f.blurX, f.blurY) / 4,
      quality: 3,
      shadowOnly: f.hideObject,
    });
  }
  if (f instanceof BevelFilter) {
    return new PBevel({
      rotation: f.angle,
      thickness: f.distance / 2,
      lightColor: f.highlightColor,
      lightAlpha: f.highlightAlpha,
      shadowColor: f.shadowColor,
      shadowAlpha: f.shadowAlpha,
    });
  }
  if (f instanceof BlurFilter) {
    const b = new PBlur({ strengthX: f.blurX / 2, strengthY: f.blurY / 2, quality: Math.max(1, f.quality) });
    return b;
  }
  return null;
}

export function toPixiFilters(list: unknown[]): Filter[] {
  const out: Filter[] = [];
  for (const f of list) {
    const p = toPixiFilter(f);
    if (p) out.push(p);
  }
  return out;
}
