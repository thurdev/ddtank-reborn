// Scratch script for the "erase + render PT-BR by code" quality test (research/i18n/code-text-test.html).
// Boxes/colors below come from pixel measurement (_code-test-measure.mjs), not OCR — deliberately, since
// OCR noise was the #1 complaint about the old images/replace.mjs pipeline on these 4 hand-picked samples.
// Two font families are used, chosen by matching the ORIGINAL rendering technique, not just by eye:
//   - fonts/extracted/core/242_Arial.ttf — the actual Arial TTF FFDec exported from core.swf's DefineFont3.
//     Used for the two "plain black sans" samples (AgreeProposeAsset tooltip, hall guild caption): these were
//     originally set in a plain system-ish font, so the extracted font is an exact-family match, not a guess.
//   - Lilita One (already bundled at images/fonts/LilitaOne.ttf, OFL) — used for the two chunky
//     gradient+outline+shadow samples (title, button), matching the rounded condensed display-font look that
//     Vietnamese DDTank chrome uses for emphasis text. No embedded TTF exists for these: they're baked into the
//     bitmap art directly (not an SWF text field), so there is nothing to extract for them.
import sharp from "sharp";
import { GlobalFonts, createCanvas } from "@napi-rs/canvas";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = "C:/Users/T/Documents/Projects/DDTank";
const FONT_DIR = join(ROOT, "tools/i18n/images/fonts");
const EXTRACTED_DIR = join(ROOT, "tools/i18n/fonts/extracted");

GlobalFonts.registerFromPath(join(FONT_DIR, "LilitaOne.ttf"), "Lilita One");
// 2026-10-04 finding: the FFDec-extracted core.swf Arial (fonts/extracted/core/242_Arial.ttf) is a GLYPH-SUBSET
// TTF — it only contains the specific characters the original Vietnamese string used, not the full Latin set.
// Rendering new PT-BR text with it produces .notdef tofu boxes for every glyph outside that subset (confirmed
// by a first render pass: see research/i18n/code-text-test.html note). Extraction correctly identifies the
// *family* (Arial) but the exported file itself is unusable for free-form translated text; what you actually
// want is the real, fully-covered Arial, which Windows + @napi-rs/canvas already expose as a system family —
// no registerFromPath needed, just reference "Arial" by name.

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rgbaStr = (c, a = 1) => `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${a})`;

const ringCache = new Map();
function offsetRing(n) {
  let r = ringCache.get(n);
  if (!r) {
    r = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      r.push([Math.cos(a), Math.sin(a)]);
    }
    ringCache.set(n, r);
  }
  return r;
}

// Whole-string faux-outline fill, same rationale as images/replace.mjs's drawOutlinedText: ctx.strokeText()
// on this canvas backend drops dots/accents on isolated sub-paths, so the "stroke" is built from repeated
// fillText() passes on a ring of offsets instead of a real stroke.
function drawOutlinedText(ctx, text, x, y, strokeW, strokeColor, fillStyle, shadowColor) {
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
}

// "\n" in newText is a forced paragraph break (used where the original art already splits the string into
// distinct phrases/lines); each paragraph is then greedily word-wrapped to maxWidthPx on its own.
function wrapLines(ctx, text, maxWidthPx) {
  const paragraphs = text.split("\n");
  const lines = [];
  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    let cur = "";
    for (const w of words) {
      const next = cur ? cur + " " + w : w;
      if (ctx.measureText(next).width > maxWidthPx && cur) {
        lines.push(cur);
        cur = w;
      } else cur = next;
    }
    if (cur) lines.push(cur);
  }
  return lines;
}

async function renderOne(cfg) {
  const { srcPath, outPath, box, pad, align, font, flat, fill, outline, newText, maxLines, backdropOpaque, gradTop, gradBot } = cfg;
  const raw = await sharp(srcPath).ensureAlpha().toBuffer();
  const meta = await sharp(raw).metadata();
  const W = meta.width, H = meta.height;

  const bx0 = clamp(box.x0 - pad, 0, W - 1);
  const by0 = clamp(box.y0 - pad, 0, H - 1);
  const bx1 = clamp(box.x1 + pad, 1, W);
  const by1 = clamp(box.y1 + pad, 1, H);
  const bw = bx1 - bx0, bh = by1 - by0;

  // erase: alpha-subtract an opaque mask over the padded box (plain over-compositing can't remove
  // existing opaque pixels), then optionally refill with a sampled vertical gradient for opaque backdrops.
  const eraseMaskBuf = await sharp({ create: { width: bw, height: bh, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } }).png().toBuffer();
  let fillPatchBuf = null;
  if (backdropOpaque) {
    const svg = `<svg width="${bw}" height="${bh}" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="p" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${rgbaStr(gradTop, 1)}"/>
        <stop offset="1" stop-color="${rgbaStr(gradBot, 1)}"/>
      </linearGradient></defs>
      <rect width="${bw}" height="${bh}" fill="url(#p)"/>
    </svg>`;
    fillPatchBuf = await sharp(Buffer.from(svg)).png().toBuffer();
  }

  // text layer
  const SS = 3;
  const measureCanvas = createCanvas(W, H);
  const mctx = measureCanvas.getContext("2d");
  let fontSize = Math.floor((bh / maxLines) * 0.82);
  fontSize = clamp(fontSize, 7, Math.floor(bh * 0.9));
  let lines, lineHeight, totalH, strokeW;
  for (;;) {
    mctx.font = `700 ${fontSize}px "${font}"`;
    lines = wrapLines(mctx, newText, bw * 0.98);
    lineHeight = fontSize * 1.14;
    totalH = lines.length * lineHeight;
    strokeW = flat ? 0 : Math.max(1.3, fontSize * 0.12);
    const widest = Math.max(...lines.map((l) => mctx.measureText(l).width));
    if ((totalH <= bh * 1.08 && widest <= bw) || fontSize <= 6) break;
    fontSize -= 1;
  }

  const ssCanvas = createCanvas(W * SS, H * SS);
  const sctx = ssCanvas.getContext("2d");
  sctx.font = `700 ${fontSize * SS}px "${font}"`;
  sctx.textAlign = align === "left" ? "left" : align === "right" ? "right" : "center";
  sctx.textBaseline = "alphabetic";
  const startY = by0 + (bh - totalH) / 2 + fontSize * 0.82;
  const anchorX = align === "left" ? bx0 : align === "right" ? bx1 : (bx0 + bx1) / 2;

  for (let i = 0; i < lines.length; i++) {
    const y = (startY + i * lineHeight) * SS;
    let fillStyle;
    if (!flat) {
      const grad = sctx.createLinearGradient(0, y - fontSize * SS * 0.8, 0, y + fontSize * SS * 0.25);
      grad.addColorStop(0, rgbaStr(fill.top ?? fill, 1));
      grad.addColorStop(1, rgbaStr(fill.bottom ?? fill, 1));
      fillStyle = grad;
    } else {
      fillStyle = rgbaStr(fill, 1);
    }
    sctx.shadowBlur = flat ? 0 : Math.max(1, fontSize * 0.08) * SS;
    sctx.shadowOffsetY = flat ? 0 : Math.max(1, fontSize * 0.08) * SS;
    drawOutlinedText(sctx, lines[i], anchorX * SS, y, strokeW * SS, rgbaStr(outline, 1), fillStyle, flat ? "transparent" : "rgba(0,0,0,0.5)");
  }
  const textBuf = await sharp(ssCanvas.toBuffer("image/png")).resize(W, H, { kernel: "lanczos3" }).png().toBuffer();

  const composites = [{ input: eraseMaskBuf, left: bx0, top: by0, blend: "dest-out" }];
  if (fillPatchBuf) composites.push({ input: fillPatchBuf, left: bx0, top: by0, blend: "over" });
  composites.push({ input: textBuf, left: 0, top: 0, blend: "over" });

  const out = await sharp(raw).ensureAlpha().composite(composites).png().toBuffer();
  mkdirSync(dirname(outPath), { recursive: true });
  await sharp(out).toFile(outPath);
  console.log("wrote", outPath, { fontSize, lines });
  return { fontSize, lines };
}

const jobs = [
  {
    srcPath: `${ROOT}/remaster/04-botoes-titulos/inputs/corei__52_asset.church.AgreeProposeAsset.png`,
    outPath: `${ROOT}/remaster/04-botoes-titulos/outputs/corei__52_asset.church.AgreeProposeAsset.code-test.png`,
    box: { x0: 30, y0: 90, x1: 412, y1: 150 },
    pad: 6,
    align: "right",
    font: "Arial",
    flat: true,
    fill: { r: 25, g: 20, b: 20 },
    outline: { r: 0, g: 0, b: 0 },
    newText: "Felicidades e longa vida!\nRealize o casamento para provar seu amor",
    maxLines: 2,
    backdropOpaque: true,
    gradTop: { r: 253, g: 190, b: 206 },
    gradBot: { r: 252, g: 197, b: 211 },
  },
  {
    srcPath: `${ROOT}/remaster/03-janelas/inputs/gameover__29_asset.takeoutCard.TitleBitmap.png`,
    outPath: `${ROOT}/remaster/03-janelas/outputs/gameover__29_asset.takeoutCard.TitleBitmap.code-test.png`,
    box: { x0: 2, y0: 2, x1: 301, y1: 42 },
    pad: 4,
    align: "center",
    font: "Lilita One",
    flat: false,
    fill: { top: { r: 250, g: 195, b: 145 }, bottom: { r: 222, g: 105, b: 15 } },
    outline: { r: 85, g: 32, b: 6 },
    newText: "Tabela de recompensas",
    maxLines: 1,
    backdropOpaque: false,
  },
  {
    srcPath: `${ROOT}/remaster/04-botoes-titulos/inputs/corei__187_cityWide.addFriendBt.png`,
    outPath: `${ROOT}/remaster/04-botoes-titulos/outputs/corei__187_cityWide.addFriendBt.code-test.png`,
    box: { x0: 8, y0: 8, x1: 142, y1: 46 },
    pad: 2,
    align: "center",
    font: "Lilita One",
    flat: false,
    fill: { top: { r: 250, g: 235, b: 205 }, bottom: { r: 235, g: 205, b: 160 } },
    outline: { r: 90, g: 25, b: 0 },
    newText: "Adicionar amigo",
    maxLines: 1,
    backdropOpaque: true,
    gradTop: { r: 70, g: 35, b: 18 },
    gradBot: { r: 40, g: 20, b: 10 },
  },
  {
    srcPath: `${ROOT}/remaster/02-lobby-hall/inputs/hall__243.png`,
    outPath: `${ROOT}/remaster/02-lobby-hall/outputs/hall__243.code-test.png`,
    box: { x0: 5, y0: 10, x1: 139, y1: 80 },
    pad: 2,
    align: "left",
    font: "Arial",
    flat: true,
    fill: { r: 10, g: 10, b: 10 },
    outline: { r: 0, g: 0, b: 0 },
    newText: "Um por todos, todos por um. Venha se juntar a um Clã!",
    maxLines: 4,
    backdropOpaque: false,
  },
];

for (const j of jobs) await renderOne(j);
