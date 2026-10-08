// Erase + SVG: put exact PT-BR text on an image whose original text was erased by the AI.
// The text style is measured from the ORIGINAL: the pixels that differ between original and erased image are the text
// (fill + outline + antialiasing), so that difference becomes a text-only RGBA image that render-text.mjs analyses and
// re-renders with the new string; the result is composited over the erased image.
//   composeOnErased(originalPath, erasedPath, pt, nLines, outPath, splitLines) -> true | false (no usable text mask)
import sharp from "sharp";
import { renderText } from "./render-text.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";

// Text region of the ORIGINAL from OCR word boxes (Vietnamese model): the AI erase also touches art (an icon vanished,
// a mascot changed), so the original-vs-erased difference alone is not the text. Only inside this region is the
// erased image used and the text mask taken; outside it the original pixels stay untouched.
import { createWorker } from "tesseract.js";
import { fileURLToPath } from "node:url";
let vie = null;
async function textRegion(origPath, W, H) {
  vie ??= await createWorker("vie", 1, { langPath: fileURLToPath(new URL("../i18n/images/", import.meta.url)), gzip: false });
  const K = 4;
  const base = await sharp(origPath).resize(W * K).flatten({ background: "#808080" }).png().toBuffer();
  // several variants: coloured text on textured bars reads badly in plain luminance (red on grey: only part of the
  // words were found and the rest of the Vietnamese stayed) -> union of the word boxes over all variants
  const variants = [base]; void [base, await sharp(base).negate({ alpha: false }).png().toBuffer(),
    ...(await Promise.all([0, 1, 2].map((c) => sharp(base).extractChannel(c).normalise().png().toBuffer()))),
    ...(await Promise.all([0, 1, 2].map((c) => sharp(base).extractChannel(c).normalise().negate().png().toBuffer())))];
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (const v of variants) {
    const { data } = await vie.recognize(v, {}, { blocks: true });
    for (const b of data.blocks ?? []) for (const p of b.paragraphs) for (const l of p.lines) for (const w of l.words) {
      if (w.confidence < 60 || !/\p{L}{2,}|\d/u.test(w.text)) continue;
      x0 = Math.min(x0, w.bbox.x0 / K); y0 = Math.min(y0, w.bbox.y0 / K); x1 = Math.max(x1, w.bbox.x1 / K); y1 = Math.max(y1, w.bbox.y1 / K);
    }
  }
  if (x1 < 0) return null;
  const pad = 2;
  return { x0: Math.max(0, Math.floor(x0) - pad), y0: Math.max(0, Math.floor(y0) - pad), x1: Math.min(W - 1, Math.ceil(x1) + pad), y1: Math.min(H - 1, Math.ceil(y1) + pad) };
}

export async function composeOnErased(origPath, erasedPath, pt, nLines, outPath, splitLines) {
  const o = await sharp(origPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = o.info.width, H = o.info.height;
  const e0 = await sharp(erasedPath).resize(W, H, { fit: "fill" }).ensureAlpha().raw().toBuffer();
  // OCR region; fallback to the bbox of the strong original-vs-erased difference when OCR misses the text (bold
  // outlined text reads badly) or finds only a fragment of it
  // wide banners (text spans the bar): the full difference area; buttons/icons with art: OCR words (keeps the art)
  let reg = W / H > 6 ? null : await textRegion(origPath, W, H);
  let dx0 = W, dy0 = H, dx1 = -1, dy1 = -1;
  for (let i = 0; i < o.data.length; i += 4) {
    const d = Math.abs(o.data[i] - e0[i]) + Math.abs(o.data[i + 1] - e0[i + 1]) + Math.abs(o.data[i + 2] - e0[i + 2]);
    if (d > 100 && o.data[i + 3] > 128) { const p = i / 4, x = p % W, y = (p / W) | 0; if (x < dx0) dx0 = x; if (x > dx1) dx1 = x; if (y < dy0) dy0 = y; if (y > dy1) dy1 = y; }
  }
  const area = (r) => (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1);
  const diff = dx1 >= 0 ? { x0: dx0, y0: dy0, x1: dx1, y1: dy1 } : null;
  if (!reg || (diff && area(reg) < 0.25 * area(diff))) reg = diff;
  // OCR often misses the first/last glyph ("T" of "Thay" stayed as residue): when the difference is not much bigger
  // than the words (no art change around), take the union
  else if (diff && area(diff) <= 2 * area(reg)) reg = { x0: Math.min(reg.x0, diff.x0), y0: Math.min(reg.y0, diff.y0), x1: Math.max(reg.x1, diff.x1), y1: Math.max(reg.y1, diff.y1) };
  if (process.env.COMPOSE_FULL) reg = { x0: 0, y0: 0, x1: W - 1, y1: H - 1 }; // manual fixes: erased image over the whole (cropped) area
  if (!reg) return false;
  const inReg = (i) => { const p = i / 4, x = p % W, y = (p / W) | 0; return x >= reg.x0 && x <= reg.x1 && y >= reg.y0 && y <= reg.y1; };
  // erased pixels only inside the text region (soft 2px edge), original everywhere else
  const e = Buffer.from(o.data);
  // (only opaque erased pixels: where the erased output was keyed background - green edges - keep the original)
  for (let i = 0; i < e.length; i += 4) if (inReg(i) && e0[i + 3] > 128) { e[i] = e0[i]; e[i + 1] = e0[i + 1]; e[i + 2] = e0[i + 2]; }
  // text floating on transparency (label next to an icon): the erased text became transparent, so where the original is
  // opaque and the erased output is clear, the original pixel is text and the base becomes transparent there
  let opq = 0, clr = 0;
  for (let i = 0; i < e.length; i += 4) if (inReg(i) && o.data[i + 3] > 128) { opq++; if (e0[i + 3] <= 128) clr++; }
  const floating = opq > 0 && clr > 0.5 * opq;
  const cleared = new Uint8Array(W * H);
  if (floating) for (let i = 0; i < e.length; i += 4) if (inReg(i) && e0[i + 3] <= 128 && o.data[i + 3] > 0) { cleared[i / 4] = 1; e[i + 3] = 0; }
  // text mask: colour distance original vs erased (soft ramp), only where the original is visible
  const t = Buffer.from(o.data);
  let on = 0;
  const dist = (i) => Math.abs(o.data[i] - e[i]) + Math.abs(o.data[i + 1] - e[i + 1]) + Math.abs(o.data[i + 2] - e[i + 2]);
  // the AI repaints the background a bit (smoother gradient, other tint): most of the region is background, so its
  // typical difference is noise and the ramp starts above it (else the whole button face became "text")
  const ds = [];
  for (let i = 0; i < o.data.length; i += 4) if (inReg(i) && o.data[i + 3] > 128) ds.push(dist(i));
  ds.sort((a, b) => a - b);
  const lo = Math.max(45, (ds[Math.floor(ds.length * 0.5)] ?? 0) + 35), hi = lo + 75;
  for (let i = 0; i < o.data.length; i += 4) {
    const d = dist(i);
    const a = !inReg(i) ? 0 : cleared[i / 4] ? 255 : d < lo ? 0 : d > hi ? 255 : Math.round(((d - lo) / (hi - lo)) * 255);
    t[i + 3] = Math.min(o.data[i + 3], a);
    if (t[i + 3] > 128) on++;
  }
  // despeckle: the AI repaints textured faces (wood, stone) slightly differently, which scatters 1-5 px specks over the
  // mask; analyse() then sees a 2 px median glyph and rejects the real letters as "art blobs". Drop every connected
  // component (alpha > 64, 8-neighbour) smaller than a glyph dot.
  {
    const seen = new Uint8Array(W * H), stack = [];
    for (let s = 0; s < W * H; s++) {
      if (seen[s] || t[s * 4 + 3] <= 64) continue;
      const comp = [];
      seen[s] = 1; stack.push(s);
      while (stack.length) {
        const p = stack.pop(); comp.push(p);
        const x = p % W, y = (p / W) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy, q = ny * W + nx;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[q] || t[q * 4 + 3] <= 64) continue;
          seen[q] = 1; stack.push(q);
        }
      }
      if (comp.length < 8) for (const p of comp) { if (t[p * 4 + 3] > 128) on--; t[p * 4 + 3] = 0; }
    }
  }
  if (process.env.COMPOSE_DEBUG) console.error("compose: reg", JSON.stringify(reg), "on", on, "lo", lo, "floating", floating);
  if (on < 20) return false;
  const dir = join(tmpdir(), "ddt-compose");
  mkdirSync(dir, { recursive: true });
  const textSrc = join(dir, "text-" + process.pid + ".png"), textOut = join(dir, "new-" + process.pid + ".png");
  await sharp(t, { raw: { width: W, height: H, channels: 4 } }).png().toFile(textSrc);
  const ok = await renderText(textSrc, textOut, pt, nLines || 0, splitLines, process.env.COMPOSE_FULL ? {} : { box: reg }).catch(() => false);
  if (!ok && process.env.COMPOSE_DEBUG) console.error("compose: renderText failed");
  if (!ok) return false;
  mkdirSync(dirname(outPath), { recursive: true });
  // erased image keeps the original silhouette/alpha; new text on top
  const base = await sharp(e, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
  const withAlpha = Buffer.from(e);
  // (COMPOSE_FULL: translucent plates - the old text had its own alpha, so the erased alpha is kept or it shows as a ghost)
  for (let i = 3; i < withAlpha.length; i += 4) withAlpha[i] = cleared[(i - 3) / 4] ? 0 : process.env.COMPOSE_FULL ? e0[i] : o.data[i];
  await sharp(withAlpha, { raw: { width: W, height: H, channels: 4 } }).composite([{ input: textOut }]).png().toFile(outPath);
  return base.length > 0;
}
