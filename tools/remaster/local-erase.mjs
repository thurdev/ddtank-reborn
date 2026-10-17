// Local, art-safe text erase for panels where the AI eraser damaged the art itself (destroyed icons, wiped alpha,
// or repainted borders). Starts from the CURRENT remaster/_auto/erased/<id>.png (so already-good regions are kept),
// then for each configured region: (1) "restore" copies that box verbatim from the ORIGINAL (undoes AI damage to
// art/alpha), (2) within "erase" (a sub-box of restore, or the same box) the actual text pixels are detected and
// diffusion-filled from their neighbours, exactly like compose-blocks.mjs's own inpaint step but run ahead of time
// and baked into the erased PNG so compose-blocks' normal b.style path can draw fresh text on top of it.
//   node tools/remaster/local-erase.mjs <id>              (uses the CONFIGS entry below)
import sharp from "sharp";
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const AUTO = join(ROOT, "remaster", "_auto");

// region: { restore:[x0,y0,x1,y1], erase?:[x0,y0,x1,y1] (defaults to restore), copyOnly?:true (no text-detect,
//   just clones the original pixels - for pure art damage like a mis-coloured border strip),
//   bg?: "bright"|"dark"|"both", lumMin?, lumMax?, radius?, thresh?, grow? }
const CONFIGS = {
  "wonderfulactivity__11_wonderfulactivity.luck.backgroud": [
    // the whole canvas is undamaged apart from the two text blocks (the AI run also fringed all 4 edges hot-pink
    // and tinted/seamed the top strip) - simplest and safest is to start the entire image fresh from the original
    { restore: [0, 0, 495, 479], copyOnly: true },
    // title (3 lines) over the starry magic bg: the gold glyphs (fill+stroke) read warm, the sky background cool
    { restore: [0, 0, 495, 135], erase: [10, 10, 440, 112], bg: "warm", warmT: 18, grow: 1, blurSigma: 6 },
    { restore: [0, 410, 260, 479], erase: [14, 423, 205, 470], bg: "warm", warmT: 18, grow: 1 },
  ],
  "wonderfulactivity__7_wonderfulactivity.hero.back": [
    // ribbon banner was fully erased by the AI (art gone); rebuild it from the original and remove just the title.
    // text and ribbon are both warm-hued so R-B can't separate them; instead mask the bright cream fill tightly
    // and grow it enough to swallow the thin dark stroke that hugs each glyph
    { restore: [90, 0, 408, 55], erase: [99, 6, 399, 52], bg: "bright", lumMin: 195, grow: 3 },
  ],
  "oldTrainer__1_asset.trainer.Welcome.Background": [
    // the translucent panel behind the body text lost its alpha entirely (fully transparent) in the AI erase;
    // restore it from the original (ribbon above y=38 is untouched - already erased cleanly, left alone). Each
    // text line is then erased in its own tight box (a full-panel restore per block would undo earlier blocks).
    { restore: [0, 38, 485, 290], copyOnly: true },
    { restore: [10, 90, 465, 132], erase: [10, 90, 465, 132], bg: "dark", lumMax: 115, grow: 2 },
    { restore: [10, 146, 345, 212], erase: [10, 146, 345, 212], bg: "dark", lumMax: 130, grow: 2 },
  ],
  "latentenergy__3_asset.latentEnergyFrame.bg": [
    // both icon buttons were destroyed (garbled fill / hollow outline); rebuild each from the original, then
    // remove only the embossed label text inside its face
    { restore: [27, 13, 142, 129], copyOnly: true },
    { restore: [219, 29, 301, 111], copyOnly: true },
    { restore: [35, 48, 135, 115], erase: [35, 48, 135, 115], bg: "bright", lumMin: 175, grow: 2 },
    { restore: [212, 48, 310, 115], erase: [212, 48, 310, 115], bg: "opaque", alphaMin: 190, grow: 2 },
    // stat panels: border/pills survived but got bleached where labels were; rebuild clean from the original, then
    // erase each label in its own tight box (restoring the whole panel per-row would undo earlier rows)
    { restore: [2, 131, 189, 260], copyOnly: true },
    { restore: [189, 131, 327, 260], copyOnly: true },
    // headers sit directly on the transparent canvas (no panel behind them) - detect by alpha, not luminance
    { restore: [2, 131, 195, 162], erase: [2, 131, 195, 162], bg: "opaque", alphaMin: 60, grow: 1 },
    { restore: [217, 131, 348, 162], erase: [217, 131, 348, 162], bg: "opaque", alphaMin: 200, grow: 1 },
    // row labels sit on the opaque grey panel; both panel and text are mid-luminance so lum doesn't separate them,
    // but the text is green-hued and the panel is desaturated grey
    { restore: [2, 160, 178, 182], erase: [2, 160, 178, 182], bg: "green", greenT: 10, alphaMin: 120, grow: 2 },
    { restore: [2, 183, 178, 207], erase: [2, 183, 178, 207], bg: "green", greenT: 10, alphaMin: 120, grow: 2 },
    { restore: [2, 208, 178, 232], erase: [2, 208, 178, 232], bg: "green", greenT: 10, alphaMin: 120, grow: 2 },
    { restore: [2, 233, 178, 257], erase: [2, 233, 178, 257], bg: "green", greenT: 10, alphaMin: 120, grow: 2 },
  ],
};

function findInput(id) {
  const cats = readdirSync(join(ROOT, "remaster")).filter((c) => /^\d\d-/.test(c));
  for (const c of cats) {
    const dir = join(ROOT, "remaster", c, "inputs");
    const f = readdirSync(dir).find((x) => x.startsWith(id + "."));
    if (f) return join(dir, f);
  }
  throw new Error("input not found for " + id);
}

async function eraseRegion(cur, W, H, box, opts) {
  const [bx0, by0, bx1, by1] = box.map(Math.round);
  const r = { left: Math.max(0, bx0), top: Math.max(0, by0), width: Math.min(W, bx1 + 1) - Math.max(0, bx0), height: Math.min(H, by1 + 1) - Math.max(0, by0) };
  const at = (x, y) => ((y + r.top) * W + x + r.left) * 4;
  const R = opts.radius ?? 6;
  const lum = new Float32Array(r.width * r.height);
  for (let y = 0; y < r.height; y++) for (let x = 0; x < r.width; x++) {
    const d = at(x, y); const al = cur[d + 3] / 255;
    lum[y * r.width + x] = al * (0.3 * cur[d] + 0.59 * cur[d + 1] + 0.11 * cur[d + 2]) + (1 - al) * 128;
  }
  const mask = new Uint8Array(r.width * r.height);
  for (let y = 0; y < r.height; y++) for (let x = 0; x < r.width; x++) {
    const l = lum[y * r.width + x];
    if (opts.bg === "warm") { // text is a warm (gold/brown) hue over a cool (blue/teal) bg: R-B separates them
      const d = at(x, y); if (cur[d] - cur[d + 2] > (opts.warmT ?? 20)) mask[y * r.width + x] = 1; continue;
    }
    if (opts.bg === "opaque") { // background is fully TRANSPARENT canvas; any real alpha is the text itself
      const d = at(x, y); if (cur[d + 3] > (opts.alphaMin ?? 60)) mask[y * r.width + x] = 1; continue;
    }
    if (opts.bg === "green") { // green text (fill + dark outline) over a desaturated panel: either the G channel
      // stands out from R/B (the bright fill), or the pixel is simply much more opaque than the panel (the outline)
      const d = at(x, y);
      if (cur[d + 1] - Math.max(cur[d], cur[d + 2]) > (opts.greenT ?? 15) || cur[d + 3] > (opts.alphaMin ?? 140)) mask[y * r.width + x] = 1;
      continue;
    }
    if (opts.bg === "bright") { if (l > (opts.lumMin ?? 170)) mask[y * r.width + x] = 1; continue; }
    if (opts.bg === "dark") { if (l < (opts.lumMax ?? 100)) mask[y * r.width + x] = 1; continue; }
    if (opts.bg === "both") { if (l > (opts.lumMin ?? 200) || l < (opts.lumMax ?? 75)) mask[y * r.width + x] = 1; continue; }
    const win = [];
    for (let yy = Math.max(0, y - R); yy <= Math.min(r.height - 1, y + R); yy += 2)
      for (let xx = Math.max(0, x - R); xx <= Math.min(r.width - 1, x + R); xx += 2) win.push(lum[yy * r.width + xx]);
    win.sort((p, q) => p - q);
    if (Math.abs(l - win[win.length >> 1]) > (opts.thresh ?? 12)) mask[y * r.width + x] = 1;
  }
  const G = opts.grow ?? 1, todo = mask.slice();
  for (let y = 0; y < r.height; y++) for (let x = 0; x < r.width; x++) if (mask[y * r.width + x])
    for (let dy = -G; dy <= G; dy++) for (let dx = -G; dx <= G; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < r.height && xx >= 0 && xx < r.width) todo[yy * r.width + xx] = 1; }
  // seed: nearest-neighbour BFS fill first (fast, gives every todo pixel a reasonable starting colour)
  for (let pass = 0, left = 1; pass < 400 && left; pass++) {
    left = 0; const fill = [];
    for (let y = 0; y < r.height; y++) for (let x = 0; x < r.width; x++) {
      if (!todo[y * r.width + x]) continue;
      let n = 0; const acc = [0, 0, 0, 0];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= r.width || yy >= r.height || todo[yy * r.width + xx]) continue;
        const d = at(xx, yy); for (let c = 0; c < 4; c++) acc[c] += cur[d + c]; n++;
      }
      if (n) fill.push([x, y, acc.map((v) => Math.round(v / n))]); else left++;
    }
    for (const [x, y, c] of fill) { const d = at(x, y); for (let k = 0; k < 4; k++) cur[d + k] = c[k]; todo[y * r.width + x] = 0; }
    if (!fill.length) break;
  }
  // blur-fill: a gaussian blur of the whole (now BFS-seeded) box is much more forgiving on busy/gradient
  // backgrounds than hard diffusion - no directional pinwheel seams, texture/gradient trend is preserved locally
  if (opts.blur !== false) {
    const boxBuf = Buffer.alloc(r.width * r.height * 4);
    for (let y = 0; y < r.height; y++) for (let x = 0; x < r.width; x++) {
      const d = at(x, y), s = (y * r.width + x) * 4;
      for (let c = 0; c < 4; c++) boxBuf[s + c] = cur[d + c];
    }
    const blurred = await sharp(boxBuf, { raw: { width: r.width, height: r.height, channels: 4 } })
      .blur(opts.blurSigma ?? 5).raw().toBuffer();
    for (let y = 0; y < r.height; y++) for (let x = 0; x < r.width; x++) {
      if (!todo[y * r.width + x]) continue;
      const d = at(x, y), s = (y * r.width + x) * 4;
      for (let c = 0; c < 4; c++) cur[d + c] = blurred[s + c];
    }
  }
}

async function run(id) {
  const regions = CONFIGS[id];
  if (!regions) throw new Error("no CONFIGS entry for " + id);
  const src = findInput(id);
  const o = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = o.info.width, H = o.info.height;
  const erasedPath = join(AUTO, "erased", id + ".png");
  const base = existsSync(erasedPath)
    ? await sharp(erasedPath).resize(W, H, { fit: "fill" }).ensureAlpha().raw().toBuffer()
    : Buffer.from(o.data);
  const cur = Buffer.from(base);
  for (const reg of regions) {
    const [rx0, ry0, rx1, ry1] = reg.restore.map(Math.round);
    const left = Math.max(0, rx0), top = Math.max(0, ry0);
    const width = Math.min(W, rx1 + 1) - left, height = Math.min(H, ry1 + 1) - top;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const d = ((y + top) * W + x + left) * 4;
      for (let c = 0; c < 4; c++) cur[d + c] = o.data[d + c];
    }
    if (!reg.copyOnly) await eraseRegion(cur, W, H, reg.erase ?? reg.restore, reg);
  }
  mkdirSync(dirname(erasedPath), { recursive: true });
  await sharp(cur, { raw: { width: W, height: H, channels: 4 } }).png().toFile(erasedPath);
  console.log("wrote", erasedPath);
}

const id = process.argv[2];
if (!id) { console.error("usage: node local-erase.mjs <id>"); process.exit(1); }
await run(id);
