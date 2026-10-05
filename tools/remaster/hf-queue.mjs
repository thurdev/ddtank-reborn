// Local job queue for the Higgsfield web automation (Seedream 4.5, unlimited toggle, driven via Playwright).
//   node tools/remaster/hf-queue.mjs            -> serves http://127.0.0.1:7788
//   GET  /next                -> next job {id, upload, prompt} (upload = absolute path of the upscaled input)
//   POST /done?id=..&hf=..    -> downloads https://d8j0ntlcm91z4.cloudfront.net/<user>/<hf>.png, post-processes to
//                               the exact original size (center-crop to aspect, lanczos, original alpha re-applied)
//                               and writes remaster/<category>/outputs/<name>.png
//   POST /fail?id=..&why=..   -> marks job failed (retried up to 2 more times)
//   GET  /status
// State persists in remaster/_auto/state.json, so it can be stopped and resumed.
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { createWorker } from "tesseract.js";
import { copyFileSync, renameSync } from "node:fs";

// OCR validator: the generated text must match the expected PT-BR (catches duplicated lines, typos, missing words).
const ocr = await createWorker("por", 1, { langPath: new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), gzip: true });
const norm = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
function similarity(a, b) {
  a = norm(a); b = norm(b);
  if (!a.length || !b.length) return 0;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 1 - d[a.length][b.length] / Math.max(a.length, b.length);
}
const ocrVi = await createWorker("vie", 1, { langPath: new URL("../i18n/images/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), gzip: false });
const VN_ONLY = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
async function hasVietnamese(file) {
  const buf = await sharp(file).resize({ width: 1400 }).flatten({ background: "#ffffff" }).png().toBuffer();
  const { data } = await ocrVi.recognize(buf);
  return (data.text.match(new RegExp(VN_ONLY.source, "gi")) ?? []).length >= 2;
}
async function ocrVariants(file) {
  const base = sharp(file).resize({ height: 160, withoutEnlargement: false }).extend({ top: 40, bottom: 40, left: 40, right: 40, background: { r: 0, g: 0, b: 0, alpha: 0 } });
  const light = await base.clone().flatten({ background: "#ffffff" }).png().toBuffer();
  const dark = await base.clone().flatten({ background: "#000000" }).png().toBuffer();
  const g = (b) => sharp(b).grayscale().normalise();
  return [
    light, dark,
    await g(dark).negate().png().toBuffer(),          // light text on dark/textured bg -> dark text on light
    await g(light).threshold(150).png().toBuffer(),
    await g(dark).negate().threshold(150).png().toBuffer(),
  ];
}
async function ocrScore(file, expected) {
  let best = { score: 0, text: "" };
  for (const buf of await ocrVariants(file)) {
    const r = await ocrOne(buf, expected);
    if (r.score > best.score) best = r;
    if (best.score >= 0.98) break;
  }
  return best;
}
async function ocrOne(buf, expected) {
  const { data } = await ocr.recognize(buf);
  // partial match: the expected text must appear somewhere in the OCR output (decorations add extra "text")
  const o = norm(data.text), e = norm(expected);
  let best = similarity(data.text, expected);
  if (o.length > e.length) for (let i = 0; i + e.length <= o.length; i += Math.max(1, Math.floor(e.length / 8))) {
    best = Math.max(best, similarity(o.slice(i, i + e.length), e));
    if (best >= 0.99) break;
  }
  return { score: best, text: data.text.replace(/\s+/g, " ").trim() };
}

const ROOT = resolve(".");
const AUTO = join(ROOT, "remaster/_auto");
const CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_3GTAcG8wB8hMi4zVVUC51azi0GB";
mkdirSync(join(AUTO, "up"), { recursive: true });
mkdirSync(join(AUTO, "raw"), { recursive: true });

const inv = JSON.parse(readFileSync("research/i18n/image-inventory.json", "utf8")).rows;
const byPath = new Map(inv.map((r) => [r.path, r]));
const manifest = readFileSync("remaster/manifest.csv", "utf8").trim().split("\n").slice(1).map((l) => {
  const [category, file, swf, srcFile, w, h] = l.split(",");
  return { category, file, swf, srcFile, w: +w, h: +h };
});

const ffprobe = (f) => execFileSync("ffprobe", ["-v", "error", "-select_streams", "v", "-show_entries", "stream=width,height,pix_fmt", "-of", "csv=p=0", f]).toString().trim().split(",");

function hasAlpha(f) {
  return /a|pal/.test(ffprobe(f)[2] ?? "");
}

function editPrompt(vn, pt) {
  return [
    `Edit this image: replace the text "${vn}" with "${pt}" (Brazilian Portuguese, spelled exactly like that).`,
    "Copy the original text style EXACTLY: same font family, same font weight (if the original is thin/regular keep it thin/regular, if bold keep bold), same text size, same text color(s), and only the same effects the original already has (do not add outline, shadow, glow or gradient if the original has none).",
    "Keep the same number of lines, line breaks, alignment and margins; the text must fit fully inside the image with the same empty space around it — make the text smaller if needed, never bigger.",
    "Keep every non-text pixel identical to the original. Do not add any background, border, frame, ornaments or new elements. Output the same image only.",
  ].join(" ");
}

const stateFile = join(AUTO, "state.json");
const state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, "utf8")) : { jobs: {} };
const save = () => writeFileSync(stateFile, JSON.stringify(state, null, 1));

// Jobs: UI categories, known PT-BR translation, OCR text present, not already produced.
const ORDER = ["02-lobby-hall", "03-janelas", "04-botoes-titulos", "05-icones", "06-combate-outros"];
const TR = existsSync(join(AUTO, "translations.json")) ? JSON.parse(readFileSync(join(AUTO, "translations.json"), "utf8")) : {};
const VN = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
const jobs = [];
const complex = [];
for (const m of manifest) {
  if (!ORDER.includes(m.category)) continue;
  const r = byPath.get(`${m.swf}::${m.srcFile}`);
  const pt = r?.ptBrSuggestion && String(r.ptBrSuggestion).trim();
  const vn = r?.ocrText && r.ocrText.replace(/\s+/g, " ").trim();
  if (!pt || !vn || (r.ocrConfidence ?? 0) < 55) continue;
  const id = m.file.replace(/\.(png|jpe?g)$/i, "");
  const out = join(ROOT, "remaster", m.category, "outputs", id + ".png");
  const clean = TR[id];
  if (!clean || VN.test(clean)) continue; // only jobs with a validated PT-BR translation
  // Complex images (several separate texts / noisy OCR) need a per-element prompt: defer them to a later pass.
  const lines = (r.ocrText ?? "").split(/\n+/).map((t) => t.trim()).filter(Boolean);
  const noisy = /[#»«_=€¬|©®{}<>\\~^]/.test(r.ocrText ?? "");
  if (noisy || lines.length > 4 || vn.length > 110) { complex.push({ id, category: m.category, file: m.file, ocr: r.ocrText, pt: clean }); continue; }
  jobs.push({ id, ...m, vn: vn.slice(0, 120), pt: clean, out, prio: ORDER.indexOf(m.category) });
}
const CP = existsSync(join(AUTO, "complex-prompts.json")) ? JSON.parse(readFileSync(join(AUTO, "complex-prompts.json"), "utf8")) : {};
for (const c of complex) {
  const spec = CP[c.id];
  if (!spec || spec.skip || !spec.prompt) continue;
  const m = manifest.find((x) => x.file === c.file && x.category === c.category);
  if (!m) continue;
  const pt = spec.elements.map((e) => e.pt).join(" ");
  jobs.push({ id: c.id, ...m, vn: "", pt, custom: spec.prompt, complex: true, out: join(ROOT, "remaster", m.category, "outputs", c.id + ".png"), prio: ORDER.indexOf(m.category) + 0.5 });
}
jobs.sort((a, b) => a.prio - b.prio || b.w * b.h - a.w * a.h);
writeFileSync(join(AUTO, "complex.json"), JSON.stringify(complex, null, 1));

// Fraction of opaque pixels: < 0.6 means "text/shape on transparency" (alpha must come from the new output).
async function opaqueFraction(src) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let n = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 200) n++;
  return n / (info.width * info.height);
}

// Upscale factor + green padding to a standard aspect ratio (Seedream "Auto" then returns that exact aspect and keeps the
// layout), so mapping the output back is a pure scale + crop — no guessing where the object went.
const ASPECTS = [[1, 1], [4, 3], [3, 4], [16, 9], [9, 16], [3, 2], [2, 3], [21, 9]];
function padGeom(w0, h0) {
  // Seedream 5.0 Lite rejects small inputs: shortest side >= 1024 (longest side capped at 4096)
  const k = Math.max(1, Math.min(Math.ceil(1024 / Math.min(w0, h0)), Math.floor(4096 / Math.max(w0, h0))));
  const W = w0 * k, H = h0 * k;
  let best = null;
  for (const [a, b] of ASPECTS) {
    const r = a / b;
    const cw = W / H >= r ? W : Math.round(H * r);
    const ch = W / H >= r ? Math.round(W / r) : H;
    if (!best || cw * ch < best.cw * best.ch) best = { cw, ch, aspect: `${a}:${b}` };
  }
  return { k, W, H, ...best, x: Math.floor((best.cw - W) / 2), y: Math.floor((best.ch - H) / 2) };
}

async function prepare(j) {
  const src = join(ROOT, "remaster", j.category, "inputs", j.file);
  const up = join(AUTO, "up", j.id + ".png");
  const meta = await sharp(src).metadata();
  const g = padGeom(meta.width, meta.height);
  j.alpha = meta.hasAlpha ? await opaqueFraction(src) : 1;
  // Transparent areas + padding -> flat chroma green so the model sees the real contrast and keeps a keyable background.
  const scaled = await sharp(src).resize(g.W, g.H, { kernel: "lanczos3" }).flatten({ background: "#00ff00" }).png().toBuffer();
  await sharp({ create: { width: g.cw, height: g.ch, channels: 3, background: "#00ff00" } }).composite([{ input: scaled, left: g.x, top: g.y }]).png().toFile(up);
  let weight = "";
  if (j.alpha < 0.6) {
    const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const b = bbox(data, info.width, info.height);
    let on = 0; if (b) for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) if (data[(y * info.width + x) * 4 + 3] > 128) on++;
    const dens = b ? on / (b.w * b.h) : 0;
    // stroke thickness: mean horizontal run length of opaque pixels relative to the text height
    let runs = 0, runLen = 0;
    if (b) for (let y = b.y; y < b.y + b.h; y++) { let r = 0; for (let x = b.x; x <= b.x + b.w; x++) { const on = x < b.x + b.w && data[(y * info.width + x) * 4 + 3] > 128; if (on) r++; else if (r) { runs++; runLen += r; r = 0; } } }
    // line count: bands of rows containing ink separated by empty rows
    let lines = 0, inBand = false;
    if (b) for (let y = b.y; y < b.y + b.h; y++) { let ink = 0; for (let x = b.x; x < b.x + b.w; x++) if (data[(y * info.width + x) * 4 + 3] > 128) ink++; const has = ink > 0; if (has && !inBand) lines++; inBand = has; }
    const lineH = b && lines ? b.h / lines : 1;
    const stroke = runs ? runLen / runs / lineH : 0;
    weight = (stroke < 0.13 ? " The original font weight is REGULAR (thin strokes) — do NOT make it bold." : " The original font weight is BOLD — keep it bold.")
      + ` The text must be written on exactly ${lines || 1} line${lines === 1 ? " (one single line, do not wrap)" : "s"}, using the full width like the original, same text height.`;
  }
  const green = j.alpha < 0.999 ? " The flat pure green #00FF00 background must stay exactly flat pure green." : "";
  return { id: j.id, upload: up.replace(/\\/g, "/"), prompt: (j.custom ?? editPrompt(j.vn, j.pt)) + weight + green };
}

// Key out the chroma green (#00FF00-ish) with soft edges + despill.
// Dominant colour of the image border (the model sometimes returns black/white instead of the green we sent).
function borderColor(data, w, h) {
  const m = new Map();
  const add = (x, y) => { const i = (y * w + x) * 4; const k = (data[i] >> 4) + "," + (data[i + 1] >> 4) + "," + (data[i + 2] >> 4); m.set(k, (m.get(k) ?? 0) + 1); };
  for (let x = 0; x < w; x++) { add(x, 0); add(x, h - 1); }
  for (let y = 0; y < h; y++) { add(0, y); add(w - 1, y); }
  const [k] = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
  return k.split(",").map((v) => +v * 16 + 8);
}
function keyColor(data, ch, [kr, kg, kb]) {
  for (let i = 0; i < data.length; i += ch) {
    const d = Math.abs(data[i] - kr) + Math.abs(data[i + 1] - kg) + Math.abs(data[i + 2] - kb);
    const a = d < 40 ? 0 : d < 110 ? Math.round(255 * (d - 40) / 70) : 255;
    data[i + 3] = Math.min(data[i + 3], a);
  }
}
function chromaKey(data, ch) {
  for (let i = 0; i < data.length; i += ch) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const d = g - Math.max(r, b);
    let a = d > 60 ? 0 : d > 15 ? Math.round(255 * (1 - (d - 15) / 45)) : 255;
    if (g > Math.max(r, b)) data[i + 1] = Math.max(r, b); // despill every pixel
    data[i + 3] = Math.min(data[i + 3], a);
  }
  return data;
}


// bbox of pixels with alpha > t
function bbox(data, w, h, t = 24) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > t) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// Text-only asset: key the new text out, fit it (keep aspect) into the ORIGINAL text box, and if the original text is
// a flat colour, recolour the new text with it (antialiasing preserved through alpha).
async function finishTextOnly(raw, src, meta, out) {
  const o = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const ob = bbox(o.data, o.info.width, o.info.height) ?? { x: 0, y: 0, w: meta.width, h: meta.height };
  const g = await sharp(raw).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bc = borderColor(g.data, g.info.width, g.info.height);
  if (bc[1] > bc[0] + 60 && bc[1] > bc[2] + 60) chromaKey(g.data, 4); else keyColor(g.data, 4, bc);
  const gb = bbox(g.data, g.info.width, g.info.height);
  if (!gb) throw new Error("no text found in output");
  const k = Math.min(ob.w / gb.w, ob.h / gb.h);
  const tw = Math.max(1, Math.round(gb.w * k)), th = Math.max(1, Math.round(gb.h * k));
  const text = await sharp(g.data, { raw: { width: g.info.width, height: g.info.height, channels: 4 } })
    .extract({ left: gb.x, top: gb.y, width: gb.w, height: gb.h }).resize(tw, th, { kernel: "lanczos3" }).raw().toBuffer();
  // original text colour statistics (opaque pixels only)
  let n = 0, sr = 0, sg = 0, sb = 0, vr = 0;
  for (let i = 0; i < o.data.length; i += 4) if (o.data[i + 3] > 200) { n++; sr += o.data[i]; sg += o.data[i + 1]; sb += o.data[i + 2]; }
  const mr = sr / n, mg = sg / n, mb = sb / n;
  for (let i = 0; i < o.data.length; i += 4) if (o.data[i + 3] > 200) vr += (o.data[i] - mr) ** 2 + (o.data[i + 1] - mg) ** 2 + (o.data[i + 2] - mb) ** 2;
  const flat = n > 0 && Math.sqrt(vr / n / 3) < 28;
  if (flat) for (let i = 0; i < text.length; i += 4) { text[i] = mr; text[i + 1] = mg; text[i + 2] = mb; }
  const left = ob.x + Math.round((ob.w - tw) * 0); // left-aligned like the original box start
  const top = ob.y + Math.round((ob.h - th) / 2);
  return sharp({ create: { width: meta.width, height: meta.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: text, raw: { width: tw, height: th, channels: 4 }, left, top }]).png().toFile(out);
}

async function finish(j, hf) {
  const raw = join(AUTO, "raw", j.id + ".png");
  const res = await fetch(`${CDN}/${hf}.png`);
  if (!res.ok) throw new Error(`download ${res.status}`);
  writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
  const src = join(ROOT, "remaster", j.category, "inputs", j.file);
  const meta = await sharp(src).metadata();
  const g = padGeom(meta.width, meta.height);
  // exact inverse of prepare(): scale the output to the padded canvas, crop the original area, scale to the original size
  // sharp applies only one resize per pipeline -> do it in three separate steps
  const canvas = await sharp(raw).resize(g.cw, g.ch, { fit: "fill", kernel: "lanczos3" }).png().toBuffer();
  const area = await sharp(canvas).extract({ left: g.x, top: g.y, width: g.W, height: g.H }).png().toBuffer();
  const back = await sharp(area).resize(meta.width, meta.height, { fit: "fill", kernel: "lanczos3" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const data = back.data;
  if (!meta.hasAlpha) return sharp(data, { raw: { width: meta.width, height: meta.height, channels: 4 } }).removeAlpha().png().toFile(j.out);
  const o = await sharp(src).ensureAlpha().raw().toBuffer();
  // text-only assets: fit the new text into the ORIGINAL text box (never overflow), recoloured to the original colour
  if ((j.alpha ?? (await opaqueFraction(src))) < 0.6) return finishTextOnly(raw, src, meta, j.out);
  chromaKey(data, 4);
  if (true) {
    for (let i = 3; i < data.length; i += 4) data[i] = Math.min(data[i], o[i]); // solid: original silhouette
  } else {
    // text-only: recolour to the original text colour when it is a flat colour
    let n = 0, sr = 0, sg = 0, sb = 0, v = 0;
    for (let i = 0; i < o.length; i += 4) if (o[i + 3] > 200) { n++; sr += o[i]; sg += o[i + 1]; sb += o[i + 2]; }
    const mr = sr / n, mg = sg / n, mb = sb / n;
    for (let i = 0; i < o.length; i += 4) if (o[i + 3] > 200) v += (o[i] - mr) ** 2 + (o[i + 1] - mg) ** 2 + (o[i + 2] - mb) ** 2;
    if (n && Math.sqrt(v / n / 3) < 28) for (let i = 0; i < data.length; i += 4) if (data[i + 3]) { data[i] = mr; data[i + 1] = mg; data[i + 2] = mb; }
  }
  return sharp(data, { raw: { width: meta.width, height: meta.height, channels: 4 } }).png().toFile(j.out);
}

// Solid asset with transparency (button/panel/frame): register the generated object onto the ORIGINAL object's box,
// so it can never come out bigger/shifted than the original (which could overlap other UI), then apply the original
// silhouette. Falls back to the plain cover-fit when no object can be found in the output.
async function finishSolid(raw, src, meta, out, fallback) {
  const o = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const ob = bbox(o.data, o.info.width, o.info.height, 128);
  const g = await sharp(raw).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bc = borderColor(g.data, g.info.width, g.info.height);
  if (bc[1] > bc[0] + 60 && bc[1] > bc[2] + 60) chromaKey(g.data, 4); else keyColor(g.data, 4, bc);
  const gb = bbox(g.data, g.info.width, g.info.height, 128);
  let data;
  if (ob && gb && gb.w > 8 && gb.h > 8) {
    const obj = await sharp(g.data, { raw: { width: g.info.width, height: g.info.height, channels: 4 } })
      .extract({ left: gb.x, top: gb.y, width: gb.w, height: gb.h }).resize(ob.w, ob.h, { fit: "fill", kernel: "lanczos3" }).png().toBuffer();
    data = await sharp({ create: { width: meta.width, height: meta.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: obj, left: ob.x, top: ob.y }]).raw().toBuffer();
  } else {
    data = fallback.data;
    chromaKey(data, 4);
  }
  for (let i = 3; i < data.length; i += 4) data[i] = Math.min(data[i], o.data[i]);
  return sharp(data, { raw: { width: meta.width, height: meta.height, channels: 4 } }).png().toFile(out);
}

createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  const send = (code, obj) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
  try {
    if (u.pathname === "/next") {
      const j = jobs.find((j) => !existsSync(j.out) && (state.jobs[j.id]?.fails ?? 0) < 3 && !(state.jobs[j.id]?.busy && Date.now() - (state.jobs[j.id]?.at ?? 0) < 600000));
      if (!j) return send(200, { done: true });
      state.jobs[j.id] = { ...(state.jobs[j.id] ?? {}), busy: true, at: Date.now() };
      save();
      return send(200, await prepare(j));
    }
    if (u.pathname === "/done") {
      const j = jobs.find((x) => x.id === u.searchParams.get("id"));
      const tmp = j.out.replace(/\.png$/, ".candidate.png");
      const realOut = j.out;
      j.out = tmp;
      try { await finish(j, u.searchParams.get("hf")); } finally { j.out = realOut; }
      let { score, text } = await ocrScore(tmp, j.pt);
      if (j.complex) score = score >= 0.8 ? 1 : score; // multi-element: looser text match
      if (await hasVietnamese(tmp)) { score = Math.min(score, 0.5); text = "VIETNAMESE LEFT: " + text; }
      const prev = state.jobs[j.id] ?? {};
      const best = Math.max(prev.best ?? 0, score);
      if (score >= (prev.best ?? 0)) copyFileSync(tmp, j.out.replace(/\.png$/, ".best.png"));
      const fails = (prev.fails ?? 0) + (score >= 0.95 ? 0 : 1);
      if (score >= 0.95 || (fails >= 3 && best >= 0.85)) {
        renameSync(score >= 0.95 ? tmp : j.out.replace(/\.png$/, ".best.png"), j.out);
        state.jobs[j.id] = { hf: u.searchParams.get("hf"), ok: true, score: Math.max(score, best) };
        save();
        return send(200, { ok: true, score: +score.toFixed(2) });
      }
      state.jobs[j.id] = { fails, best, why: `ocr ${score.toFixed(2)}: ${text.slice(0, 60)}` };
      save();
      return send(200, { ok: false, error: `ocr ${score.toFixed(2)} (retry ${fails}/3)` });
    }
    if (u.pathname === "/fail") {
      const id = u.searchParams.get("id");
      const s = state.jobs[id] ?? {};
      state.jobs[id] = { fails: (s.fails ?? 0) + 1, why: u.searchParams.get("why") };
      save();
      return send(200, { ok: true });
    }
    if (u.pathname === "/status") {
      const ok = jobs.filter((j) => existsSync(j.out)).length;
      return send(200, { total: jobs.length, ok, failed: Object.values(state.jobs).filter((s) => (s.fails ?? 0) >= 3).length });
    }
    send(404, {});
  } catch (e) {
    send(500, { error: String(e.message ?? e) });
  }
}).listen(7788, "127.0.0.1", () => console.log(`hf-queue on :7788 — ${jobs.length} jobs`));
