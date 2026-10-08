// Window phase: big panels with several text blocks. The AI erased all text (_auto/erased/<id>.png); every block of the
// hand spec ("blocks": [{ box: [x0, y0, x1, y1], pt, lines? }], boxes in original pixels around one original text block)
// is re-rendered in its original style with compose-text.mjs on a crop, then pasted into the erased panel.
//   node tools/remaster/compose-blocks.mjs <id> [out.png]   (default out: remaster/<cat>/outputs/<id>.png)
import sharp from "sharp";
import { readFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { composeOnErased } from "./compose-text.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const AUTO = join(ROOT, "remaster", "_auto");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// style: { size, color, bold?, lh? (line pitch px), align? left|center|right, font?, stroke?, strokeW?, shadow? }
// first line's cap top sits at the box top; the font shrinks until every line fits the box width.
async function styledText(pt, st, w, h) {
  const lines = pt.split("\n");
  for (let size = st.size; size >= 6; size -= 0.5) {
    const lh = (st.lh ?? st.size * 1.2) * (size / st.size);
    const anchor = st.align === "center" ? "middle" : st.align === "right" ? "end" : "start";
    const off = st.align === "center" ? w / 2 : st.align === "right" ? w : 0; // overflow room inside a 2w canvas
    const x = off + (st.align === "center" ? w / 2 : st.align === "right" ? w - 1 : 1);
    const font = `font-family="${st.font ?? "Arial, Helvetica, sans-serif"}" font-size="${size}" font-weight="${st.bold ? "bold" : "normal"}"${st.italic ? " font-style=\"italic\"" : ""}`;
    const stroke = st.stroke ? `stroke="${st.stroke}" stroke-width="${st.strokeW ?? 2}" stroke-linejoin="round" paint-order="stroke"` : "";
    const texts = lines.map((l, i) => {
      const y = Math.round(size * 0.78 + i * lh);
      const gl = st.glow ? `<text x="${x}" y="${y}" text-anchor="${anchor}" ${font} fill="${st.glow}" stroke="${st.glow}" stroke-width="${st.glowW ?? 4}" stroke-linejoin="round" filter="url(#glow)">${esc(l).replace(/[[]]/g, "")}</text>` : "";
      const sh = st.shadow ? `<text x="${x + 1}" y="${y + 1}" text-anchor="${anchor}" ${font} fill="${st.shadow}">${esc(l).replace(/[[\]]/g, "")}</text>` : "";
      return gl + sh + `<text x="${x}" y="${y}" text-anchor="${anchor}" ${font} fill="${st.grad ? "url(#g)" : st.color}" ${stroke}>${esc(l).replace(/\[(.*?)\]/g, (m, t) => `<tspan fill="${st.hl ?? "#ff1010"}">${t}</tspan>`)}</text>`; // [word] = highlight colour
    }).join("");
    const W2 = w * 2; // render wider to measure overflow
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W2}" height="${h}">${st.glow ? `<defs><filter id="glow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="${st.glowBlur ?? 2}"/></filter></defs>` : ""}${st.grad ? `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${st.grad[0]}"/><stop offset="1" stop-color="${st.grad[1]}"/></linearGradient></defs>` : ""}${texts}</svg>`;
    const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let x0 = W2, x1 = -1;
    for (let y = 0; y < info.height; y++) for (let xx = 0; xx < info.width; xx++) if (data[(y * info.width + xx) * 4 + 3] > 20) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; }
    if (x1 - x0 + 1 <= w || size <= 6) return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).extract({ left: Math.round(off), top: 0, width: w, height: h }).png().toBuffer();
  }
}

export async function composeBlocks(id, outPath) {
  const spec = JSON.parse(readFileSync(join(AUTO, "specs.json"), "utf8"))[id];
  if (!spec?.blocks?.length) throw new Error("no blocks in spec for " + id);
  const cat = readdirSync(join(ROOT, "remaster")).filter((c) => /^\d\d-/.test(c)).find((c) => readdirSync(join(ROOT, "remaster", c, "inputs")).some((f) => f.startsWith(id + ".")));
  const file = readdirSync(join(ROOT, "remaster", cat, "inputs")).find((f) => f.startsWith(id + "."));
  const src = join(ROOT, "remaster", cat, "inputs", file);
  const erasedPath = spec.baseFile ? join(ROOT, spec.baseFile) : spec.base === "original" ? src : join(AUTO, "erased", id + ".png");
  if (!existsSync(erasedPath)) throw new Error("not erased yet: " + id);
  const o = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = o.info.width, H = o.info.height;
  let base = await sharp(erasedPath).resize(W, H, { fit: "fill" }).ensureAlpha().png().toBuffer();
  // blocks whose box is marked "keep": the original pixels stay (numbers, names drawn by the game, art)
  const dir = join(tmpdir(), "ddt-blocks");
  mkdirSync(dir, { recursive: true });
  const prev = process.env.COMPOSE_FULL;
  process.env.COMPOSE_FULL = "1"; // inside a tight block box the erased image replaces everything
  try {
    for (const [k, b] of spec.blocks.entries()) {
      const [x0, y0, x1, y1] = b.box.map(Math.round);
      const r = { left: Math.max(0, x0), top: Math.max(0, y0), width: Math.min(W, x1 + 1) - Math.max(0, x0), height: Math.min(H, y1 + 1) - Math.max(0, y0) };
      if (b.keep) { base = await sharp(base).composite([{ input: await sharp(src).extract(r).png().toBuffer(), left: r.left, top: r.top }]).png().toBuffer(); continue; }
      // inpaint: text on a flat/gradient panel (the AI erase shifted the panel colour) -> each row of the box is
      // interpolated between its left and right edge pixels, then the text is drawn
      if (b.erasedPatch) { // take this box from the AI-erased image (text-free background) onto the current base
        const er = await sharp(join(AUTO, "erased", id + ".png")).resize(W, H, { fit: "fill" }).ensureAlpha().extract(r).raw().toBuffer();
        const cur = await sharp(base).ensureAlpha().raw().toBuffer();
        for (let y = 0; y < r.height; y++) er.copy(cur, ((y + r.top) * W + r.left) * 4, y * r.width * 4, (y + 1) * r.width * 4);
        base = await sharp(cur, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
        if (!b.style) continue;
      }
      if (b.clear) { // text on transparency: the old text is simply removed
        const cur = await sharp(base).ensureAlpha().raw().toBuffer();
        // fillColor [r,g,b,a]: flat plates (rule panels) are refilled with their own colour instead of cleared
        const fc = b.fillColor ?? [0, 0, 0, 0];
        for (let y = r.top; y < r.top + r.height; y++) for (let x = r.left; x < r.left + r.width; x++) for (let c = 0; c < 4; c++) cur[(y * W + x) * 4 + c] = fc[c];
        base = await sharp(cur, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
        if (!b.style) continue;
      }
      if (b.inpaint) {
        // panel colour = most common colour of the box; text + its soft shadow = pixels farther than inpaintT from it
        // (grown by "grow" px); masked pixels are filled by diffusion from the known neighbours (no streaks)
        const cur = await sharp(base).ensureAlpha().raw().toBuffer();
        const at = (x, y) => ((y + r.top) * W + x + r.left) * 4;
        // reference = local median luminance (radius R, larger than a stroke): follows panel gradients, ignores text
        const R = b.radius ?? 6, lum = new Float32Array(r.width * r.height);
        for (let y = 0; y < r.height; y++) for (let x = 0; x < r.width; x++) { const d = at(x, y); const al = cur[d + 3] / 255; lum[y * r.width + x] = al * (0.3 * cur[d] + 0.59 * cur[d + 1] + 0.11 * cur[d + 2]) + (1 - al) * 128; }
        const mask = new Uint8Array(r.width * r.height), mode = "local-median";
        for (let y = 0; y < r.height; y++) for (let x = 0; x < r.width; x++) {
          const win = [];
          for (let yy = Math.max(0, y - R); yy <= Math.min(r.height - 1, y + R); yy += 2) for (let xx = Math.max(0, x - R); xx <= Math.min(r.width - 1, x + R); xx += 2) win.push(lum[yy * r.width + xx]);
          win.sort((p, q) => p - q);
          if (b.bg === "both") { const l = lum[y * r.width + x]; if (l > (b.lumMin ?? 200) || l < (b.lumMax ?? 75)) mask[y * r.width + x] = 1; continue; }
          if (b.bg === "bright" || b.bg === "dark") { // text much lighter (or darker) than its plate
            const l = lum[y * r.width + x];
            if (b.bg === "bright" ? l > (b.lumMin ?? 170) : l < (b.lumMax ?? 100)) mask[y * r.width + x] = 1;
            continue;
          }
          if (b.bg === "grey") { // neutral plate (silver bars): anything saturated or dark is text/outline
            const d = at(x, y), mx = Math.max(cur[d], cur[d + 1], cur[d + 2]), mn = Math.min(cur[d], cur[d + 1], cur[d + 2]);
            if (cur[d + 3] > 20 && (mx - mn > (b.satMin ?? 28) || mx < (b.lumMax ?? 150))) mask[y * r.width + x] = 1;
            continue;
          }
          if (b.bg === "plate") { // known plate colour: everything farther than tol from it is text
            const d = at(x, y), pc = b.plate;
            if (Math.abs(cur[d] - pc[0]) + Math.abs(cur[d + 1] - pc[1]) + Math.abs(cur[d + 2] - pc[2]) > (b.tol ?? 60)) mask[y * r.width + x] = 1;
            continue;
          }
          if (b.bg === "row") { // vertical-gradient plank: reference = median of this row over the whole box
            if (!b._rowMed) b._rowMed = [];
            if (b._rowMed[y] === undefined) { const row = []; for (let xx = 0; xx < r.width; xx++) row.push(lum[y * r.width + xx]); row.sort((p, q) => p - q); b._rowMed[y] = row[row.length >> 1]; }
            if (Math.abs(lum[y * r.width + x] - b._rowMed[y]) > (b.inpaintT ?? 25)) mask[y * r.width + x] = 1;
            continue;
          }
          if (b.bg === "purple") { // coloured plate: everything that is not the plate hue (and is opaque) is text
            const d = at(x, y); if (cur[d + 3] > 128 && !(cur[d + 2] > cur[d + 1] + 40 && cur[d] > cur[d + 1] + 15)) mask[y * r.width + x] = 1;
            continue;
          }
          if (Math.abs(lum[y * r.width + x] - win[win.length >> 1]) > (b.inpaintT ?? 12)) mask[y * r.width + x] = 1;
        }
        if (process.env.BLOCKS_DEBUG) console.log("inpaint", b.pt.slice(0, 12), "mode", mode, "masked", mask.reduce((p, q) => p + q, 0), "of", mask.length);
        const G = b.grow ?? 1, todo = mask.slice();
        for (let y = 0; y < r.height; y++) for (let x = 0; x < r.width; x++) if (mask[y * r.width + x]) for (let dy = -G; dy <= G; dy++) for (let dx = -G; dx <= G; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < r.height && xx >= 0 && xx < r.width) todo[yy * r.width + xx] = 1; }
        // masked pixels that were not fully opaque (glow/outline over the transparent outside of a plate) become
        // transparent instead of being filled (filling would grow the plate)
        if (b.bg) for (let y = 0; y < r.height; y++) for (let x = 0; x < r.width; x++) { const d = at(x, y); if (todo[y * r.width + x] && cur[d + 3] < (b.alphaKeep ?? 230)) { cur[d] = cur[d + 1] = cur[d + 2] = cur[d + 3] = 0; todo[y * r.width + x] = 0; } }
        let stuck = false; // directional fill first; rows/columns fully covered by text fall back to 4-neighbour fill
        for (let pass = 0, left = 1; pass < 400 && left; pass++) {
          left = 0;
          const fill = [];
          for (let y = 0; y < r.height; y++) for (let x = 0; x < r.width; x++) {
            if (!todo[y * r.width + x]) continue;
            let n = 0; const acc = [0, 0, 0, 0];
            for (const [dx, dy] of (b.fill === "h" && !stuck) ? [[1, 0], [-1, 0]] : (b.fill === "v" && !stuck) ? [[0, 1], [0, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= r.width || yy >= r.height || todo[yy * r.width + xx]) continue; if (b.bg && cur[at(xx, yy) + 3] < (b.knownAlpha ?? 128)) continue; const d = at(xx, yy); for (let c = 0; c < 4; c++) acc[c] += cur[d + c]; n++; }
            if (n) fill.push([x, y, acc.map((v) => Math.round(v / n))]); else left++;
          }
          for (const [x, y, c] of fill) { const d = at(x, y); for (let k = 0; k < 4; k++) cur[d + k] = c[k]; todo[y * r.width + x] = 0; }
          if (!fill.length) { if (stuck || !b.fill) break; stuck = true; }
        }
        base = await sharp(cur, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
      }
      // explicit style (long paragraphs: the inferred style drifts) -> plain SVG text at the measured size/colour
      if (b.inpaint && !b.style) continue; // erase-only block
      if (b.style && process.env.BLOCKS_NOTEXT) continue;
      if (b.style) { base = await sharp(base).composite([{ input: await styledText(b.pt, b.style, r.width, r.height), left: r.left, top: r.top }]).png().toBuffer(); continue; }
      const co = join(dir, `${id}.${k}.o.png`), ce = join(dir, `${id}.${k}.e.png`), cn = join(dir, `${id}.${k}.n.png`);
      await sharp(src).extract(r).png().toFile(co);
      await sharp(base).extract(r).png().toFile(ce);
      const ok = await composeOnErased(co, ce, b.pt, b.lines ?? b.pt.split("\n").length, cn, (s) => s.split("\n"));
      if (!ok) throw new Error(`block ${k} (${b.pt.slice(0, 30)}) failed`);
      // replace the box (not alpha-over: translucent plates would show the old text through)
      const patch = await sharp(cn).ensureAlpha().raw().toBuffer();
      const cur = await sharp(base).raw().toBuffer();
      for (let y = 0; y < r.height; y++) for (let x = 0; x < r.width; x++) {
        const s = (y * r.width + x) * 4, d = ((y + r.top) * W + x + r.left) * 4;
        for (let c = 0; c < 4; c++) cur[d + c] = patch[s + c];
      }
      base = await sharp(cur, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
    }
  } finally { if (prev === undefined) delete process.env.COMPOSE_FULL; else process.env.COMPOSE_FULL = prev; }
  // the panel keeps the original silhouette
  const cur = await sharp(base).raw().toBuffer();
  // alpha: base alpha (inpainted plates are translucent - restoring the original alpha would leave the old letters
  // as opaque ghosts); fully transparent outside the original silhouette
  // (no alpha restore: new text may extend over pixels that were transparent in the original)
  const out = outPath ?? join(ROOT, "remaster", cat, "outputs", id + ".png");
  mkdirSync(dirname(out), { recursive: true });
  await sharp(cur, { raw: { width: W, height: H, channels: 4 } }).png().toFile(out);
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = await composeBlocks(process.argv[2], process.argv[3]);
  console.log(out);
  process.exit(0);
}
