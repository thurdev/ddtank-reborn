/**
 * Render por software (Canvas2D) de uma árvore de display — usado por
 * `BitmapData.draw()`. O jogo usa draw pra: cavar cratera no terreno
 * (blendMode "erase"), gerar miniaturas, efeitos que viram bitmap.
 * Não usa a GPU, então o resultado já fica nos pixels do BitmapData.
 */
import { Matrix } from "../geom/Matrix";

const COMPOSITE: Record<string, GlobalCompositeOperation> = {
  erase: "destination-out", add: "lighter", multiply: "multiply", screen: "screen", overlay: "overlay",
  darken: "darken", lighten: "lighten", difference: "difference", hardlight: "hard-light", alpha: "destination-in",
};

export function renderToCanvas(ctx: CanvasRenderingContext2D, source: any, m: Matrix, isRoot = false): void {
  if (!source) return;
  // BitmapData direto
  if (typeof source.$canvasSource === "function" && typeof source.$pixels === "function") {
    const s = source.$canvasSource();
    if (!s) return;
    ctx.save();
    ctx.setTransform(m.a, m.b, m.c, m.d, m.tx, m.ty);
    ctx.drawImage(s, 0, 0);
    ctx.restore();
    return;
  }
  if (!isRoot && source.$visible === false) return;
  if (source.$maskOf && !isRoot) return;
  ctx.save();
  if (!isRoot) {
    ctx.globalAlpha *= source.$alpha ?? 1;
    const op = COMPOSITE[source.$blendMode];
    if (op) ctx.globalCompositeOperation = op;
  }
  ctx.setTransform(m.a, m.b, m.c, m.d, m.tx, m.ty);
  // conteúdo próprio
  if (source.$graphics) source.$graphics.$drawCanvas(ctx);
  if (source.$img && source.$imgRect) {
    const tex = source.$img.texture;
    const img = tex?.source?.resource;
    if (img) {
      const r = source.$imgRect;
      try { ctx.drawImage(img, r.x, r.y, r.width, r.height); } catch { /* imagem ainda não carregou */ }
    }
  }
  if (source.$bitmapData) {
    const s = source.$bitmapData.$canvasSource?.();
    if (s) ctx.drawImage(s, 0, 0);
  }
  if (typeof source.$drawText === "function") source.$drawText(ctx);
  // filhos
  const kids: any[] | undefined = source.$children;
  if (kids) {
    for (const c of kids) {
      const cm = c.$m.clone();
      cm.concat(m);
      renderToCanvas(ctx, c, cm, false);
    }
  }
  ctx.restore();
}
