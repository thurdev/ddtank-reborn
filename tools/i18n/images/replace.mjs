// Inpaint the VN text region of a FFDec-exported image and redraw it in PT-BR, same canvas size/anchors.
//
// Approach (per task spec: "sample surrounding colors / blur fill" + "chunky font + gradient + outline + shadow
// matching the original, estimated from text pixels"):
//   1. OCR the source once more with word-level bboxes to find the text region precisely.
//   2. Sample the backdrop just outside that region (thin strips above/below, spanning the text's x-range only,
//      so pill/badge rounded corners outside the text's own width are never touched) to rebuild a 2-stop
//      vertical gradient patch composited over the old text (the "inpaint").
//   3. Sample the original text's own pixels to estimate fill color (brightest cluster) and outline/shadow color
//      (darkest saturated cluster) so new glyphs read the same (gradient fill + stroke + drop shadow for chunky
//      button captions; flat single color for plain tooltip text where the two clusters are close).
//   4. Draw the PT-BR string with @napi-rs/canvas (bundled OFL fonts registered by family name — avoids relying
//      on system fontconfig for custom fonts), auto-fit/word-wrapped into the same bbox, then composite via sharp.
//      Canvas size never changes.
import sharp from "sharp";
import { createWorker } from "tesseract.js";
import { GlobalFonts, createCanvas } from "@napi-rs/canvas";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const FONT_DIR = join(dirname(fileURLToPath(import.meta.url)), "fonts");
if (!GlobalFonts.has("Lilita One")) GlobalFonts.registerFromPath(join(FONT_DIR, "LilitaOne.ttf"), "Lilita One");
if (!GlobalFonts.has("Baloo 2")) GlobalFonts.registerFromPath(join(FONT_DIR, "Baloo2-Bold.ttf"), "Baloo 2");

const FONT_CHUNKY = "Lilita One"; // caption/button style (matches the original rounded condensed look)
const FONT_PLAIN = "Baloo 2"; // tooltip/paragraph style

let sharedWorker = null;
async function getWorker() {
  if (!sharedWorker) sharedWorker = await createWorker("vie");
  return sharedWorker;
}
export async function closeWorker() {
  if (sharedWorker) await sharedWorker.terminate();
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

async function ocrBBox(buf) {
  const worker = await getWorker();
  // Upscale small source images before OCR — tesseract's word bboxes are unreliable below ~30px glyph height,
  // which silently drops whole lines from the union box (seen on 145x88 tooltip plates). Scale back down after.
  const meta = await sharp(buf).metadata();
  const longest = Math.max(meta.width || 1, meta.height || 1);
  const scale = longest < 400 ? 3 : 1;
  const pre = await sharp(buf)
    .ensureAlpha()
    .flatten({ background: "#ffffff" })
    .grayscale()
    .resize({ width: Math.round((meta.width || 1) * scale), height: Math.round((meta.height || 1) * scale) })
    .png()
    .toBuffer();
  const res = await worker.recognize(pre);
  const words = (res.data.words || []).filter((w) => w.text && w.text.trim());
  if (!words.length) return null;
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  const lineYs = [];
  for (const w of words) {
    const b = w.bbox;
    x0 = Math.min(x0, b.x0);
    y0 = Math.min(y0, b.y0);
    x1 = Math.max(x1, b.x1);
    y1 = Math.max(y1, b.y1);
    lineYs.push((b.y0 + b.y1) / 2);
  }
  // cluster line centers (anything within ~60% of median word-height counts as the same line)
  const wordH = words.reduce((s, w) => s + (w.bbox.y1 - w.bbox.y0), 0) / words.length;
  lineYs.sort((a, b) => a - b);
  let lineCount = 1;
  for (let i = 1; i < lineYs.length; i++) if (lineYs[i] - lineYs[i - 1] > wordH * 0.6) lineCount++;
  return { x0: x0 / scale, y0: y0 / scale, x1: x1 / scale, y1: y1 / scale, lineCount };
}

async function sampleStats(image, left, top, width, height) {
  if (width <= 0 || height <= 0) return null;
  try {
    const { data, info } = await image.clone().extract({ left, top, width, height }).raw().toBuffer({ resolveWithObject: true });
    const ch = info.channels;
    let r = 0,
      g = 0,
      b = 0,
      a = 0,
      n = 0;
    for (let i = 0; i < data.length; i += ch) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      a += ch >= 4 ? data[i + 3] : 255;
      n++;
    }
    if (!n) return null;
    return { r: r / n, g: g / n, b: b / n, a: a / n };
  } catch {
    return null;
  }
}

const rgbaStr = (c, alphaOverride) => `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${(alphaOverride ?? c.a / 255).toFixed(3)})`;
const luminance = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

async function textColorStats(image, box) {
  const { data, info } = await image
    .clone()
    .extract({ left: box.x0, top: box.y0, width: box.x1 - box.x0, height: box.y1 - box.y0 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const px = [];
  for (let i = 0; i < data.length; i += ch) {
    const a = ch >= 4 ? data[i + 3] : 255;
    if (a < 80) continue;
    px.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
  }
  if (!px.length) return { fill: { r: 255, g: 255, b: 255 }, stroke: { r: 90, g: 50, b: 10 }, flat: true };
  px.sort((a, b) => luminance(a) - luminance(b));
  const dark = px.slice(0, Math.max(1, Math.floor(px.length * 0.25)));
  const light = px.slice(-Math.max(1, Math.floor(px.length * 0.25)));
  const avg = (arr) => ({ r: arr.reduce((s, p) => s + p.r, 0) / arr.length, g: arr.reduce((s, p) => s + p.g, 0) / arr.length, b: arr.reduce((s, p) => s + p.b, 0) / arr.length });
  const fill = avg(light);
  const stroke = avg(dark);
  const flat = Math.abs(luminance(fill) - luminance(stroke)) < 45;
  return { fill, stroke, flat };
}

function wrapLines(ctx, text, maxWidthPx, targetLineCount) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? cur + " " + w : w;
    if (ctx.measureText(next).width > maxWidthPx && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// Ring of unit offset vectors used by the "faux stroke" fill in drawOutlinedText below.
const _ringCache = new Map();
function offsetRing(n) {
  let r = _ringCache.get(n);
  if (!r) {
    r = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      r.push([Math.cos(a), Math.sin(a)]);
    }
    _ringCache.set(n, r);
  }
  return r;
}

// Draw `text` as one whole-string layout (natural font advances/kerning — ctx.textAlign must already be set
// by the caller), with a faux outline + single drop shadow.
//
// 2026-10-03 investigation: the original code did a single ctx.strokeText() call over the whole string for
// the chunky-caption outline. That was found to silently drop the dot on "i" entirely when a neighboring
// glyph is a tall stroke (e.g. "Leilão" -> "Lellão", hall.swf::42.png / hall_old.swf::134.png, reported by
// the user) — not a resolution/overlap artifact (reproduced identically at 3x supersampling and down to the
// minimum stroke width), but something in how this canvas backend converts a glyph to a *stroked path*: a
// tiny disconnected sub-path (the dot) degenerates during stroking and never rasterizes, while plain
// ctx.fillText() on the same glyph renders the dot correctly. Two things were tried and ruled out before
// landing on this:
//   - Manual per-character positioning (draw each glyph separately, spaced out by hand): this changed the
//     bug rather than fixing it — isolating "i" from its neighbors in its own fillText() call altered its
//     hinting/rounding enough that the per-character x bookkeeping (measureText-based) could still place the
//     dot under a neighboring glyph's ink. Whole-string layout (this function) sidesteps that: the font's own
//     shaping decides every glyph's position, consistently with how the dot was confirmed to render correctly
//     in isolation.
//   - Casting the shadow once per ring sample (24 shadowed fillText calls per glyph): also found to erase the
//     dot even with correct per-character positioning. Casting the shadow exactly once per line (one shadowed
//     fillText of the whole string, no offset) before the unshadowed outline/fill passes avoids that entirely
//     and still reads as the same drop shadow.
// Net effect: build the "stroke" as a faux outline out of repeated ctx.fillText() calls offset around 2
// concentric rings (plus center), instead of calling ctx.strokeText() at all — every pass is a plain fill, so
// dots/accents/holes always rasterize the same way they do for the real glyph.
function drawOutlinedText(ctx, text, x, y, strokeW, strokeColor, fillStyle, shadowColor) {
  const prevFill = ctx.fillStyle;
  if (strokeW) {
    const r = strokeW / 2;
    const ring = offsetRing(12);
    ctx.fillStyle = strokeColor;
    ctx.shadowColor = shadowColor;
    ctx.fillText(text, x, y);
    ctx.shadowColor = "transparent";
    for (const radius of [r, r * 0.5]) for (const [dx, dy] of ring) ctx.fillText(text, x + dx * radius, y + dy * radius);
  }
  ctx.shadowColor = "transparent";
  ctx.fillStyle = fillStyle;
  ctx.fillText(text, x, y);
  ctx.fillStyle = prevFill;
}

/**
 * @param {string} srcPath   source PNG/JPG exported by FFDec
 * @param {string} outPath   destination PNG (always PNG so alpha survives for SWF re-import)
 * @param {string} newText   PT-BR replacement text
 * @param {object} [opts]    { box?: {x0,y0,x1,y1,lineCount} } to skip the extra OCR pass
 */
export async function replaceImageText(srcPath, outPath, newText, opts = {}) {
  const raw = readFileSync(srcPath);
  const base = sharp(raw).ensureAlpha();
  const meta = await base.metadata();
  const W = meta.width,
    H = meta.height;

  const box = opts.box || (await ocrBBox(raw)) || { x0: Math.round(W * 0.06), y0: Math.round(H * 0.12), x1: Math.round(W * 0.94), y1: Math.round(H * 0.88), lineCount: 1 };
  const pad = Math.max(3, Math.round((box.y1 - box.y0) * 0.22 * (opts.padScale || 1)));
  const bx0 = Math.floor(clamp(box.x0 - pad, 0, W - 1));
  const by0 = Math.floor(clamp(box.y0 - pad, 0, H - 1));
  const bx1 = Math.ceil(clamp(box.x1 + pad, 1, W));
  const by1 = Math.ceil(clamp(box.y1 + pad, 1, H));
  const bw = bx1 - bx0,
    bh = by1 - by0;

  const { fill, stroke, flat } = await textColorStats(base, { x0: bx0, y0: by0, x1: bx1, y1: by1 });

  const stripH = Math.max(2, Math.round(bh * 0.18));
  const top = (await sampleStats(base, bx0, clamp(by0 - stripH, 0, H - 1), bw, Math.min(stripH, by0))) || (await sampleStats(base, bx0, 0, bw, 1)) || { r: 255, g: 255, b: 255, a: 0 };
  const bot = (await sampleStats(base, bx0, clamp(by1, 0, H - 1), bw, Math.min(stripH, H - by1))) || (await sampleStats(base, bx0, H - 1, bw, 1)) || top;
  // A near-transparent backdrop (plain floating text, e.g. tooltip plates with no bitmap behind the glyphs) needs
  // no fill patch at all — just erasing the old glyph pixels is correct. An opaque backdrop (button/pill bitmaps)
  // needs the erased region repainted with the sampled gradient so the shape doesn't get a see-through hole.
  const backdropOpaque = (top.a + bot.a) / 2 > 40;

  // --- erase the old glyphs: alpha-subtract (dest-out) an opaque mask over the padded box. Plain alpha-over
  // compositing cannot remove existing opaque pixels (source-over keeps the destination showing through any
  // semi/fully-transparent source), so the erase has to be a real alpha-channel subtraction first. ---
  const eraseMaskBuf = await sharp({ create: { width: bw, height: bh, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } })
    .png()
    .toBuffer();

  let fillPatchBuf = null;
  if (backdropOpaque) {
    const patchSvg = `<svg width="${bw}" height="${bh}" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="p" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${rgbaStr(top, 1)}"/>
        <stop offset="1" stop-color="${rgbaStr(bot, 1)}"/>
      </linearGradient></defs>
      <rect width="${bw}" height="${bh}" fill="url(#p)"/>
    </svg>`;
    fillPatchBuf = await sharp(Buffer.from(patchSvg)).png().toBuffer();
  }

  // --- new text layer via canvas (reliable custom-font rendering, independent of system fontconfig) ---
  const fontFamily = flat ? FONT_PLAIN : FONT_CHUNKY;
  const lineCountHint = Math.max(1, box.lineCount || 1);
  // SS = supersampling factor for the actual glyph draw (see below). Measurement/fit below still happens in
  // logical (1x) units on a throwaway canvas — only the final render is supersampled.
  const SS = 3;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  let fontSize = Math.floor((bh / lineCountHint) * 0.8 * (opts.fontScale || 1));
  fontSize = clamp(fontSize, 8, Math.floor(bh * 0.88));
  let lines, lineHeight, totalH, strokeW;
  for (;;) {
    ctx.font = `700 ${fontSize}px "${fontFamily}"`;
    lines = wrapLines(ctx, newText, bw * 0.96, lineCountHint);
    lineHeight = fontSize * 1.14;
    totalH = lines.length * lineHeight;
    strokeW = flat ? 0 : Math.max(1.4, fontSize * 0.11);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if ((totalH <= bh * 1.06 && widest <= bw * 0.98) || fontSize <= 7) break;
    fontSize -= 1;
  }
  const cx = (bx0 + bx1) / 2;
  const startY = by0 + (bh - totalH) / 2 + fontSize * 0.82;

  // Draw on a supersampled canvas (SSx linear size), then downscale to W,H below — gives the outline-fill
  // passes (drawOutlinedText) clean sub-pixel positioning before the final lanczos3 downsample.
  const ssCanvas = createCanvas(W * SS, H * SS);
  const sctx = ssCanvas.getContext("2d");
  sctx.font = `700 ${fontSize * SS}px "${fontFamily}"`;
  sctx.textAlign = "center";
  sctx.textBaseline = "alphabetic";
  for (let i = 0; i < lines.length; i++) {
    const y = (startY + i * lineHeight) * SS;
    sctx.save();
    let fillStyle;
    if (!flat) {
      const grad = sctx.createLinearGradient(0, y - fontSize * SS * 0.8, 0, y + fontSize * SS * 0.25);
      grad.addColorStop(0, rgbaStr(fill, 1));
      grad.addColorStop(1, rgbaStr({ r: clamp(fill.r - 35, 0, 255), g: clamp(fill.g - 35, 0, 255), b: clamp(fill.b - 35, 0, 255) }, 1));
      fillStyle = grad;
    } else {
      fillStyle = rgbaStr(fill, 1);
    }
    sctx.shadowBlur = flat ? 0 : Math.max(1, fontSize * 0.08) * SS;
    sctx.shadowOffsetY = flat ? 0 : Math.max(1, fontSize * 0.07) * SS;
    drawOutlinedText(sctx, lines[i], cx * SS, y, strokeW * SS, rgbaStr(stroke, 1), fillStyle, flat ? "transparent" : "rgba(0,0,0,0.55)");
    sctx.restore();
  }
  const textBuf = await sharp(ssCanvas.toBuffer("image/png")).resize(W, H, { kernel: "lanczos3" }).png().toBuffer();

  const composites = [{ input: eraseMaskBuf, left: bx0, top: by0, blend: "dest-out" }];
  if (fillPatchBuf) composites.push({ input: fillPatchBuf, left: bx0, top: by0, blend: "over" });
  composites.push({ input: textBuf, left: 0, top: 0, blend: "over" });

  const out = await sharp(raw).ensureAlpha().composite(composites).png().toBuffer();

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, out);
  return { W, H, box, fontSize, lines, flat };
}
