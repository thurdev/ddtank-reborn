// Deterministic PT-BR text renderer for plain text-on-transparency assets (flat fill colour + optional outline, no
// stylised lettering). The AI model misspells long texts ("abaao", "recèveu"); here the spelling is exact by
// construction. Everything is measured from the ORIGINAL pixels: line bands, fill/outline colours, weight, alignment.
//   node tools/remaster/render-text.mjs <input.png> <out.png> "<pt text>" [--lines N]
//   import { analyse, renderText } from "./render-text.mjs"
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const BOLD_T = +(process.env.BOLD_T ?? 0.2);
const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Analyse the original text image. Returns null when it is not a plain single-colour text (-> leave it to the AI).
export async function analyse(src, nExpected) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, A = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : data[(y * W + x) * 4 + 3]);
  const lines = lineSpans(data, W, H, nExpected);
  if (!lines.length) { if (process.env.RT_DEBUG) console.log("reject no lines"); return null; }
  // art next to the text (a heart, an icon): a connected ink blob taller than ~1.5 text lines is not a glyph/word ->
  // not plain text, leave it to the AI (SVG would drop the art)
  {
    const blobs = [];
    const seen = new Uint8Array(W * H);
    for (let s0 = 0; s0 < W * H; s0++) {
      if (seen[s0] || data[s0 * 4 + 3] <= 128) continue;
      let y0 = H, y1 = -1, x0 = W, x1 = -1;
      const st = [s0]; seen[s0] = 1;
      while (st.length) {
        const p = st.pop(), x = p % W, y = (p / W) | 0;
        if (y < y0) y0 = y; if (y > y1) y1 = y; if (x < x0) x0 = x; if (x > x1) x1 = x;
        for (const q of [p - 1, p + 1, p - W, p + W]) if (q >= 0 && q < W * H && !seen[q] && data[q * 4 + 3] > 128 && Math.abs((q % W) - x) <= 1) { seen[q] = 1; st.push(q); }
      }
      blobs.push({ w: x1 - x0 + 1, h: y1 - y0 + 1, n: 0 });
    }
    // pixel counts (second pass is cheap enough: recount by bbox is not needed, use area as proxy)
    for (const b of blobs) b.n = b.w * b.h;
    const top = blobs.sort((a, b) => b.n - a.n).slice(0, 12);
    if (top.length >= 3) {
      const med = (k) => { const s = top.slice(1).map((b) => b[k]).sort((x, y) => x - y); return s[s.length >> 1]; };
      const big = top[0];
      if (big.h >= 1.8 * med("h") && big.n >= 2.5 * med("n") && big.w / big.h < 1.8) { if (process.env.RT_DEBUG) console.log("reject art blob", big, "median h", med("h")); return null; }
    }
  }
  for (const l of lines) {
    let x0 = W, x1 = -1;
    for (let y = l.y0; y <= l.y1; y++) for (let x = 0; x < W; x++) if (A(x, y) > 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
    Object.assign(l, { x0, x1 });
  }
  // distance (in px) of each opaque pixel to the nearest transparent one: outline = distance 1, fill = the deepest
  const dist = new Int16Array(W * H).fill(0);
  let q = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (A(x, y) > 128 && (A(x - 1, y) <= 128 || A(x + 1, y) <= 128 || A(x, y - 1) <= 128 || A(x, y + 1) <= 128)) { dist[y * W + x] = 1; q.push(y * W + x); }
  for (let d = 2; q.length; d++) {
    const nq = [];
    for (const p of q) { const x = p % W, y = (p / W) | 0; for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) { if (A(nx, ny) > 128 && !dist[ny * W + nx]) { dist[ny * W + nx] = d; nq.push(ny * W + nx); } } }
    q = nq;
  }
  const maxD = Math.max(...dist);
  const pick = (pred) => { const c = [[], [], []]; for (let p = 0; p < W * H; p++) if (pred(dist[p])) { c[0].push(data[p * 4]); c[1].push(data[p * 4 + 1]); c[2].push(data[p * 4 + 2]); } return c; };
  const rim = pick((d) => d === 1);
  if (!rim[0].length) return null;
  const ec = rim.map(median);
  const cdist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
  // outline = the rim colour; fill = the first distance layer whose colour clearly differs from it (thick outlines
  // merge between glyphs, so "the deepest pixels" can be outline blobs, not the fill)
  let outlineW = 0, fillD = 0;
  for (let d = 2; d <= Math.min(maxD, 8); d++) { const c = pick((x) => x === d).map(median); if (cdist(c, ec) > 150) { outlineW = d - 1; fillD = d; break; } }
  const outlined = fillD > 0;
  let deep;
  if (outlined) {
    // fill pixels selected by COLOUR (inside the outline, clearly different from the rim colour)
    deep = [[], [], []];
    for (let p = 0; p < W * H; p++) if (dist[p] >= 2) { const c = [data[p * 4], data[p * 4 + 1], data[p * 4 + 2]]; if (cdist(c, ec) > 200) { deep[0].push(c[0]); deep[1].push(c[1]); deep[2].push(c[2]); } }
  } else deep = pick((d) => d >= Math.max(2, maxD - 1));
  const fc = (deep[0].length > 10 ? deep : rim).map(median);
  // single fill colour? deep pixels far from the fill median must be rare (multi-colour texts go to the AI)
  let far = 0;
  // pixels on the fill<->outline blend (antialiased edges, e.g. pink between red fill and white outline) are not a
  // second colour: measure the distance to the fill-outline segment instead of to the fill alone
  const segD = (c) => {
    const u = [ec[0] - fc[0], ec[1] - fc[1], ec[2] - fc[2]], v = [c[0] - fc[0], c[1] - fc[1], c[2] - fc[2]];
    const uu = u[0] * u[0] + u[1] * u[1] + u[2] * u[2] || 1, t = Math.max(0, Math.min(1, (v[0] * u[0] + v[1] * u[1] + v[2] * u[2]) / uu));
    return Math.abs(v[0] - t * u[0]) + Math.abs(v[1] - t * u[1]) + Math.abs(v[2] - t * u[2]);
  };
  for (let k = 0; k < deep[0].length; k++) {
    const c = [deep[0][k], deep[1][k], deep[2][k]];
    if ((outlined ? segD(c) : Math.abs(c[0] - fc[0]) + Math.abs(c[1] - fc[1]) + Math.abs(c[2] - fc[2])) > 120) far++;
  }
  if (deep[0].length > 10 && far / deep[0].length > (outlined ? +(process.env.RT_FAR_O || 0.35) : 0.15)) { if (process.env.RT_DEBUG) console.log("reject far", (far / deep[0].length).toFixed(2), "outlined", outlined, "fill", fc, "rim", ec); return null; }
  // fill flatness (std of the deep pixels): gradients / textured lettering are better left to the AI
  const sd = (arr, m) => Math.sqrt(arr.reduce((t, v) => t + (v - m) ** 2, 0) / Math.max(1, arr.length));
  const fillStd = deep[0].length > 10 ? (sd(deep[0], fc[0]) + sd(deep[1], fc[1]) + sd(deep[2], fc[2])) / 3 : 0;
  // stroke thickness relative to the core height -> bold? (the glyph strokes without the outline)
  let runs = 0, runLen = 0;
  for (const l of lines) for (let y = l.y0; y <= l.y1; y++) { let r = 0; for (let x = 0; x <= W; x++) { if (x < W && A(x, y) > 128) r++; else if (r) { runs++; runLen += r; r = 0; } } }
  const coreH = median(lines.map((l) => l.h));
  const ds = []; for (let p = 0; p < W * H; p++) if (dist[p]) ds.push(dist[p]); ds.sort((x, y) => x - y);
  const strokeRatio = (2 * Math.max(0, ds[Math.floor(ds.length * 0.9)] - outlineW) - 1) / coreH; // full glyph stroke / core height
  const bold = process.env.RT_BOLD ? process.env.RT_BOLD === "1" : strokeRatio >= BOLD_T; // RT_BOLD=0/1 forces it (manual fixes)
  const lineH = coreH;
  // alignment from the line extents
  const lm = median(lines.map((l) => l.x0)), rm = median(lines.map((l) => W - 1 - l.x1));
  const align = lines.length > 1
    ? (Math.max(...lines.map((l) => l.x0)) - Math.min(...lines.map((l) => l.x0)) <= 2 ? "left" : "center")
    : Math.abs(lm - rm) <= Math.max(2, W * 0.05) ? "center" : lm < rm ? "left" : "right";
  return { W, H, lines, fill: fc, outline: outlined ? ec : null, outlineW: outlined ? Math.max(1, outlineW) : 0, bold, align, fillStd: +fillStd.toFixed(1), coreH: lineH, strokeRatio: +strokeRatio.toFixed(3), box: { x0: Math.min(...lines.map((l) => l.x0)), x1: Math.max(...lines.map((l) => l.x1)) } };
}

// Text lines. With a known count n (from the OCR) the block is split at the emptiest row near each 1/n pitch
// (diacritics bridge lines, so "empty row" splitting is unreliable); otherwise lines are separated by empty rows.
// Each line's span h = first..last row whose ink >= 10% of that line's densest row (ignores stray diacritic rows);
// the same measure is applied to our render so the sizes are comparable.
function lineSpans(data, W, H, n) {
  const ink = Array.from({ length: H }, (_, y) => { let c = 0; for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > 128) c++; return c; });
  let y0 = ink.findIndex((v) => v > 0), y1 = H - 1 - [...ink].reverse().findIndex((v) => v > 0);
  if (y0 < 0) return [];
  let segs = [];
  if (n === 1) segs.push({ a: y0, b: y1 });
  else if (n && n > 1) {
    const pitch = (y1 - y0 + 1) / n, cuts = [y0];
    for (let i = 1; i < n; i++) {
      const g = Math.round(y0 + i * pitch), r = Math.round(pitch * 0.35);
      let best = g;
      for (let y = Math.max(y0, g - r); y <= Math.min(y1, g + r); y++) if (ink[y] < ink[best] || (ink[y] === ink[best] && Math.abs(y - g) < Math.abs(best - g))) best = y;
      cuts.push(best);
    }
    cuts.push(y1 + 1);
    for (let i = 0; i < n; i++) segs.push({ a: cuts[i], b: cuts[i + 1] - 1 });
  } else {
    for (let y = y0; y <= y1; y++) if (ink[y]) { const l = segs[segs.length - 1]; if (l && y - l.b <= 1) l.b = y; else segs.push({ a: y, b: y }); }
  }
  const out = [];
  for (const sg of segs) {
    let m = 0; for (let y = sg.a; y <= sg.b; y++) m = Math.max(m, ink[y]);
    if (!m) continue;
    let c0 = -1, c1 = -1;
    for (let y = sg.a; y <= sg.b; y++) if (ink[y] >= m * 0.1) { if (c0 < 0) c0 = y; c1 = y; }
    if (c1 - c0 >= 2) out.push({ y0: c0, y1: c1, h: c1 - c0 + 1 });
  }
  return out;
}

// Render one line at scale S (supersampled), return the trimmed RGBA buffer + size.
async function renderLine(text, a, S, fontPx) {
  const rgb = (c) => `rgb(${c.map((v) => Math.round(v)).join(",")})`;
  const sw = a.outline ? a.outlineW * S * 2 : 0; // stroke is centred on the glyph edge -> double it
  const w = Math.ceil(fontPx * text.length * 0.8 + 40 * S), h = Math.ceil(fontPx * 1.8 + 40 * S);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><text x="${20 * S}" y="${Math.round(h * 0.68)}" font-family="Arial, Liberation Sans, sans-serif" font-size="${fontPx}" font-weight="${a.bold ? 700 : 400}" fill="${rgb(a.fill)}"${a.outline ? ` stroke="${rgb(a.outline)}" stroke-width="${sw}" stroke-linejoin="round" paint-order="stroke"` : ""}>${esc(text)}</text></svg>`;
  const { data, info } = await sharp(Buffer.from(svg)).trim({ threshold: 1 }).raw().toBuffer({ resolveWithObject: true }).catch(() => ({ data: null, info: null }));
  if (!data) return null;
  const core = lineSpans(data, info.width, info.height, 1);
  const c0 = core.length ? core[0].y0 : 0, c1 = core.length ? core[0].y1 : info.height - 1;
  return { buf: await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer(), w: info.width, h: info.height, coreH: c1 - c0 + 1, coreMid: (c0 + c1 + 1) / 2 };
}

// Render `pt` in the original layout. Line count = original line count unless `nLines` is given.
// opts.box {x0,x1}: layout area (text placed and centred inside it, never wider) - used when composing on a background
export async function renderText(src, out, pt, nLines, splitLines, opts = {}) {
  const a = await analyse(src, nLines);
  if (!a) { if (process.env.COMPOSE_DEBUG) console.error("renderText: analyse null"); return false; }
  const S = 4; // supersampling
  const n = nLines || a.lines.length;
  const texts = splitLines(pt, n);
  // bands to use: the original ones when the count matches, otherwise spread evenly over the original block
  let bands = a.lines;
  if (texts.length !== a.lines.length) {
    const y0 = a.lines[0].y0, y1 = a.lines[a.lines.length - 1].y1, lh = (y1 - y0 + 1) / texts.length;
    bands = texts.map((_, i) => ({ y0: Math.round(y0 + i * lh), y1: Math.round(y0 + (i + 1) * lh) - 1, h: Math.round(lh) }));
  }
  const lay = opts.box ? { x0: opts.box.x0, x1: opts.box.x1 } : null;
  const maxW = lay ? lay.x1 - lay.x0 + 1 : a.align === "center" ? a.W - 2 * Math.max(1, Math.min(a.box.x0, a.W - 1 - a.box.x1)) : a.W - a.box.x0 - 1;
  // pass 1 (no outline): one common scale so the line cores match the original core height, shrunk if the widest
  // line does not fit; pass 2: render at that exact size with the exact outline width
  const plain = { ...a, outline: null };
  const probe = await Promise.all(texts.map((t) => renderLine(t, plain, S, 100 * S)));
  if (probe.some((p) => !p)) { if (process.env.COMPOSE_DEBUG) console.error("renderText: probe failed", JSON.stringify({ font: a.font, bold: a.bold })); return false; }
  const coreH = median(bands.map((b) => b.h));
  let k = coreH / (median(probe.map((p) => p.coreH)) / S); // original px per probe px/S
  const widest = Math.max(...probe.map((p) => p.w / S)) + 2 * a.outlineW / k;
  if (widest * k > maxW) k = maxW / widest;
  // lines must not overlap: full rendered height (accents + descenders) <= line pitch; whole block <= image height
  const fullH = Math.max(...probe.map((p) => p.h / S)) + 2 * a.outlineW / k;
  if (bands.length > 1) {
    const pitch = (bands[bands.length - 1].y0 - bands[0].y0) / (bands.length - 1);
    if (fullH * k > pitch * 1.02) k = (pitch * 1.02) / fullH;
  }
  if (fullH * k > a.H) k = a.H / fullH;
  const comp = [];
  for (let i = 0; i < texts.length; i++) {
    const p = await renderLine(texts[i], a, S, 100 * S * k);
    if (!p) return false;
    if (p.w > a.W * S || p.h > a.H * S) { // stroke/rounding overflow: shrink into the canvas
      const f = Math.min((a.W * S) / p.w, (a.H * S) / p.h);
      p.w = Math.floor(p.w * f); p.h = Math.floor(p.h * f); p.coreMid *= f;
      p.buf = await sharp(p.buf).resize(p.w, p.h, { fit: "fill" }).png().toBuffer();
    }
    const b = bands[i];
    const cy = ((b.y0 + b.y1 + 1) / 2) * S; // place the rendered core centre on the original core centre
    const left = lay ? Math.round(((lay.x0 + lay.x1 + 1) / 2) * S - p.w / 2) : a.align === "center" ? Math.round((a.W * S - p.w) / 2) : a.align === "right" ? Math.round((a.box.x1 + 1) * S - p.w) : Math.round(a.box.x0 * S);
    comp.push({ input: p.buf, left: Math.max(0, Math.min(a.W * S - p.w, left)), top: Math.max(0, Math.min(a.H * S - p.h, Math.round(cy - p.coreMid))) });
  }
  const big = await sharp({ create: { width: a.W * S, height: a.H * S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comp).png().toBuffer();
  await sharp(big).resize(a.W, a.H, { kernel: "lanczos3" }).png().toFile(out);
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [src, out, pt] = process.argv.slice(2);
  const li = process.argv.indexOf("--lines");
  const simple = (t, n) => {
    const w = t.split(/\s+/); if (n <= 1) return [t];
    const per = Math.ceil(t.length / n), res = []; let cur = "";
    for (const x of w) { if (cur && (cur + " " + x).length > per && res.length < n - 1) { res.push(cur); cur = x; } else cur = cur ? cur + " " + x : x; }
    res.push(cur); return res;
  };
  console.log(JSON.stringify(await analyse(src), (k, v) => (k === "lines" ? v.length : v)));
  console.log(await renderText(src, out, pt, li > 0 ? +process.argv[li + 1] : 0, simple));
}
