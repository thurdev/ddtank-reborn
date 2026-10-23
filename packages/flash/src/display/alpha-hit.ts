/**
 * Hit-test por transparência de imagem: as formas vetoriais do Flash viram
 * PNG no exportador; pra clicar só onde tem desenho (como no vetor original)
 * consultamos o alfa do pixel. O alfa é lido uma vez (lazy) por imagem.
 */
export interface AlphaSource {
  /** imagem carregada */
  image: CanvasImageSource & { width: number; height: number };
  /** cache do canal alfa (w*h) */
  data?: Uint8Array;
  w?: number;
  h?: number;
}

/** alfa (0..255) na posição normalizada (u, v) em 0..1 */
export function alphaAt(src: AlphaSource, u: number, v: number): number {
  if (!src.data) {
    const w = src.image.width, h = src.image.height;
    try {
      const c = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(w, h) : Object.assign(document.createElement("canvas"), { width: w, height: h });
      const ctx = c.getContext("2d") as CanvasRenderingContext2D;
      ctx.drawImage(src.image, 0, 0);
      const px = ctx.getImageData(0, 0, w, h).data;
      const a = new Uint8Array(w * h);
      for (let i = 0; i < a.length; i++) a[i] = px[i * 4 + 3]!;
      src.data = a;
      src.w = w;
      src.h = h;
    } catch {
      return 255;
    }
  }
  const x = Math.min(src.w! - 1, Math.max(0, Math.floor(u * src.w!)));
  const y = Math.min(src.h! - 1, Math.max(0, Math.floor(v * src.h!)));
  return src.data![y * src.w! + x]!;
}
