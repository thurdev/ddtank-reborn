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
import { renderText, analyse } from "./render-text.mjs";
import { composeOnErased } from "./compose-text.mjs";
import { colorMatch } from "./color-match.mjs";
import { createWorker } from "tesseract.js";
import { copyFileSync, renameSync, unlinkSync } from "node:fs";

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
const VN_ONLY = /[ùìòỳăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
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
    // single channels: white text on orange/red is invisible in luminance but strong in the blue channel
    ...(await Promise.all([0, 1, 2].map((c) => sharp(dark).extractChannel(c).normalise().negate().png().toBuffer()))),
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

// Split a text into n lines with balanced lengths (word boundaries; minimises the longest line).
function splitLines(text, n) {
  if (text.includes("\n")) return text.split("\n").map((s) => s.trim()).filter(Boolean);
  const w = text.split(/\s+/).filter(Boolean);
  if (n <= 1 || w.length <= 1) return [w.join(" ")];
  n = Math.min(n, w.length);
  const len = (a, b) => w.slice(a, b).join(" ").length;
  // dp[k][i] = best max-line-length splitting the first i words into k lines
  const dp = Array.from({ length: n + 1 }, () => Array(w.length + 1).fill(Infinity));
  const cut = Array.from({ length: n + 1 }, () => Array(w.length + 1).fill(0));
  dp[0][0] = 0;
  for (let k = 1; k <= n; k++) for (let i = 1; i <= w.length; i++) for (let s = k - 1; s < i; s++) {
    const v = Math.max(dp[k - 1][s], len(s, i));
    if (v < dp[k][i]) { dp[k][i] = v; cut[k][i] = s; }
  }
  const out = [];
  for (let k = n, i = w.length; k > 0; k--) { const s = cut[k][i]; out.unshift(w.slice(s, i).join(" ")); i = s; }
  return out;
}

// Seedream editing prompts work best short: one quoted "change X to Y" instruction (each line quoted separately so
// the model follows the line breaks and spelling exactly), then an explicit list of what stays unchanged.
// (fuser.studio / atlascloud / pixeldojo Seedream 5 guides: quote literal text, one instruction, list fixed elements,
// long prompts scatter the model's attention.)
const PROMPT_V = 3; // 2 = short quoted per-line prompt; 3 = + HD remaster clause (2026-10-06)
// The model botches Portuguese diacritics ("Istáncia"): the target text goes WITHOUT accents (Instancia, ç->c, ão->ao).
// Accents can be restored later in the final art if needed; SVG-rendered assets keep them (exact by construction).
const noAcc = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").normalize("NFC");
// in hand-written custom prompts: strip accents only inside quoted strings that are not Vietnamese
const noAccQuoted = (p) => p.replace(/"([^"]*)"/g, (m, q) => (VN_ONLY.test(q) || /[đơưă]/i.test(q) ? m : `"${noAcc(q)}"`));
const srcOf = (j) => j.src ?? join(ROOT, "remaster", j.category, "inputs", j.file);
function editPrompt(vn, pt, nLines, weight, fidelity) {
  const lines = splitLines(pt, nLines || 1).map(noAcc);
  const target = lines.length === 1
    ? `"${lines[0]}" (one single line)`
    : `${lines.length} lines: ${lines.map((l, i) => `line ${i + 1} "${l}"`).join(", ")}`;
  return [
    `Change the text "${vn}" to ${target}. Write it exactly as quoted (plain letters, no accents).`,
    `Keep the font, ${weight ? weight + " " : ""}font weight, text color, text effects, text size, alignment and position unchanged; the new text is never bigger than the original.`,
    fidelity ? FIDELITY : REMASTER,
    "Do not add any other text or elements.",
  ].join(" ");
}
// PROMPT_V 3: the source assets are low-resolution 2010 Flash bitmaps; ask for an HD redraw of the same design
// (the user: "é remaster... como se tivesse refazendo numa engine nova"). Only for generations from now on.
// PROMPT_V 4 (review round 1, 2026-10-07): the HD redraw changed fonts, colours and art ("nada igual ao original").
// Redo jobs (spec.fidelity) ask for a pure text edit: every pixel except the letters stays as in the input.
const FIDELITY = "This is a pure text edit: change ONLY the letters. Every other pixel stays identical to the input image: same background, frame, border, icons, symbols, textures, colors and size. The new text copies the original text style exactly: same font family, weight, size, letter height, color, gradient, outline, drop shadow and glow, same alignment and position. Do not redraw, restyle, recolor or resize anything.";
const REMASTER = "This is an HD remaster of a low-resolution game asset: redraw the whole image at high quality, as if re-rendered in a modern engine — crisp clean edges, smooth gradients, refined detail, materials and lighting, no blur, pixelation or compression artifacts — while keeping exactly the same design, shapes, colors, proportions and layout.";

const stateFile = join(AUTO, "state.json");
const state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, "utf8")) : { jobs: {} };
// atomic: a full disk once truncated state.json to 0 bytes mid-write; write a temp file, then rename over
const save = () => { try { writeFileSync(stateFile + ".tmp", JSON.stringify(state, null, 1)); renameSync(stateFile + ".tmp", stateFile); } catch (e) { console.log("state save failed:", e.message); } };

// Jobs: UI categories, known PT-BR translation, OCR text present, not already produced.
const ORDER = ["02-lobby-hall", "03-janelas", "04-botoes-titulos", "05-icones", "06-combate-outros"];
const TR = existsSync(join(AUTO, "translations.json")) ? JSON.parse(readFileSync(join(AUTO, "translations.json"), "utf8")) : {};
const VN = /[ùìòỳăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
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
  jobs.push({ id, ...m, vn: vn.slice(0, 120), pt: clean, ocrLines: lines.length, out, prio: ORDER.indexOf(m.category) });
}
// Audit round (2026-10-08): images the first OCR never read (empty pt_br in manifest.csv) enter the queue straight
// from a hand-written spec in specs.json with "add": true ({ vn, pt, lines?, prompt? }).
{
  const SP0 = existsSync(join(AUTO, "specs.json")) ? JSON.parse(readFileSync(join(AUTO, "specs.json"), "utf8")) : {};
  const have = new Set(jobs.map((j) => j.id));
  for (const m of manifest) {
    const id = m.file.replace(/\.(png|jpe?g)$/i, "");
    const sp = SP0[id];
    if (!sp?.add || have.has(id) || !sp.pt) continue;
    jobs.push({ id, ...m, vn: sp.vn ?? "", pt: sp.pt, ocrLines: sp.lines ?? sp.pt.split("\n").length, out: join(ROOT, "remaster", m.category, "outputs", id + ".png"), prio: ORDER.indexOf(m.category) });
  }
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
// Big multi-text windows: the model garbles every element -> deferred to the end phase (AI erases the text, each
// PT-BR element is then rendered in SVG at its original box)
for (const j of jobs) {
  const r = byPath.get(`${j.swf}::${j.srcFile}`);
  const nl = (r?.ocrText ?? "").split(/\n+/).filter((t) => t.trim()).length;
  j.window = j.w * j.h >= 60000 && nl >= 2;
}
// Hand-written specs (made by looking at each original): exact visible text, correct PT-BR, line count, optional
// full custom prompt. They override the OCR-derived vn/pt, which carried junk like "[ Thường" (a button edge read
// as "[") straight into the prompt.
const SPECS = existsSync(join(AUTO, "specs.json")) ? JSON.parse(readFileSync(join(AUTO, "specs.json"), "utf8")) : {};
for (const j of jobs) {
  const sp = SPECS[j.id];
  if (!sp) continue;
  if (sp.vn) j.vn = sp.vn;
  if (sp.pt) j.pt = sp.pt;
  if (sp.lines) j.ocrLines = sp.lines, j.pxLines = sp.lines;
  j.custom = sp.prompt || undefined; // a spec without its own prompt replaces the old complex-prompts.json one
  if (sp.skip) j.window = true; // not translatable / needs another method
  if (sp.eraseOnly) j.window = true;
  if (sp.noWindow) j.window = false; // review redo: a single fidelity text edit, even on big panels // window phase: AI erase only, blocks composed by compose-blocks.mjs
}
// Long multi-line text (dialog windows like the church ones): GPT ignores size/colour and overflows; Seedream garbles
// long text -> erase + SVG phase too (unless it is plain text the SVG renderer already handled).
for (const j of jobs) if (!j.window && !SPECS[j.id]?.noWindow && norm(j.pt).length > 40 && (j.ocrLines ?? 1) >= 2) j.window = true;
// Crop jobs (review round 1): long multi-text windows garble in one edit, so every text block of spec.crops
// ([{box:[x0,y0,x1,y1], vn, pt, lines?}]) becomes its own short AI job on a crop of the original; the edited crops are
// pasted back by tools/remaster/stitch-crops.mjs. The parent job itself is never queued.
for (const j of [...jobs]) {
  const cr = SPECS[j.id]?.crops;
  if (!cr) continue;
  j.window = true; j.cropParent = true;
  mkdirSync(join(AUTO, "crops"), { recursive: true }); mkdirSync(join(AUTO, "crops-out"), { recursive: true });
  for (const [k, c] of cr.entries()) {
    const id = j.id + "~c" + k, src = join(AUTO, "crops", id + ".png");
    if (!existsSync(src)) { const [x0, y0, x1, y1] = c.box; await sharp(join(ROOT, "remaster", j.category, "inputs", j.file)).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }).png().toFile(src); }
    jobs.push({ ...j, id, src, file: id + ".png", w: c.box[2] - c.box[0] + 1, h: c.box[3] - c.box[1] + 1, vn: c.vn, pt: c.pt, ocrLines: c.lines ?? c.pt.split("\n").length, pxLines: c.lines ?? c.pt.split("\n").length, window: false, cropParent: false, custom: undefined, out: join(AUTO, "crops-out", id + ".png"), noHd: true, prio: j.prio - 0.1 });
    SPECS[id] = { fidelity: true, engine: "seedream", noWindow: true, ...(c.key ? { key: c.key } : {}) };
  }
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
// GPT Image (Higgsfield "ChatGPT", 1:1 / 1024x1024) gets a square canvas; Seedream keeps the 8-aspect fit.
function padGeom(w0, h0, engine = "seedream") {
  if (engine === "gpt") {
    const k = Math.max(1, Math.floor(1024 / Math.max(w0, h0)));
    const W = w0 * k, H = h0 * k, c = Math.max(W, H);
    return { k, W, H, cw: c, ch: c, aspect: "1:1", x: Math.floor((c - W) / 2), y: Math.floor((c - H) / 2) };
  }
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

// Assets that contain green art (green balls, glows) would be keyed out by the chroma green: use magenta for them.
// The pipeline stays the green one: inverting RGB maps magenta exactly onto green and keeps the compositing linear
// (255-obs = a*(255-C) + (1-a)*(255-key)), so raw output + reference are inverted, processed, and inverted back.
async function keyFor(j) {
  if (j.key) return j.key;
  if (SPECS[j.id]?.key) return (j.key = SPECS[j.id].key); // review: brown art keyed green came back greenish
  const src = srcOf(j);
  const { data } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let op = 0, gr = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 128) { op++; if (data[i + 1] > data[i] + 40 && data[i + 1] > data[i + 2] + 40) gr++; }
  return (j.key = op && gr / op > 0.005 ? "magenta" : "green");
}

async function prepare(j) {
  const src = srcOf(j);
  const keyHex = (await keyFor(j)) === "magenta" ? "#ff00ff" : "#00ff00";
  const up = join(AUTO, "up", j.id + ".png");
  const meta = await sharp(src).metadata();
  const g = padGeom(meta.width, meta.height, state.jobs[j.id]?.engine);
  j.alpha = meta.hasAlpha ? await opaqueFraction(src) : 1;
  // Transparent areas + padding -> flat chroma green so the model sees the real contrast and keeps a keyable background.
  const scaled = await sharp(src).resize(g.W, g.H, { kernel: "lanczos3" }).flatten({ background: keyHex }).png().toBuffer();
  await sharp({ create: { width: g.cw, height: g.ch, channels: 3, background: keyHex } }).composite([{ input: scaled, left: g.x, top: g.y }]).png().toFile(up);
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
    weight = stroke < 0.13 ? "regular (thin, not bold)" : "bold";
    j.pxLines = SPECS[j.id]?.lines ?? lines; // hand spec wins over the pixel band count
  }
  const green = j.alpha < 0.999 ? (j.key === "magenta" ? " Keep the flat pure magenta #FF00FF background unchanged." : " Keep the flat pure green #00FF00 background unchanged.") : "";
  if (await isErase(j)) return { id: j.id, upload: up.replace(/\\/g, "/"), prompt: ERASE_PROMPT + green };
  return { id: j.id, upload: up.replace(/\\/g, "/"), prompt: (j.custom ? noAccQuoted(j.custom).replace(/exact spelling and accents as quoted/g, "exact spelling as quoted, plain letters without accents") + " " + (SPECS[j.id]?.fidelity ? FIDELITY : REMASTER) : editPrompt(j.vn, j.pt, j.pxLines || j.ocrLines, weight, SPECS[j.id]?.fidelity)) + green };
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
// Works on `area` = the output already mapped back onto the original geometry (upscaled by gm.k), so the model's
// vignette/noise in the padding never counts; text is searched only around the original text box.
// `canvas` = the output scaled to the padded canvas; the text may spill into the padding (e.g. one extra line), so it
// is searched on the whole canvas and shrunk back into the original box when it does not fit inside the area.
async function finishTextOnly(canvas, src, meta, out, gm) {
  const o = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const ob = bbox(o.data, o.info.width, o.info.height) ?? { x: 0, y: 0, w: meta.width, h: meta.height };
  const g = await sharp(canvas).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const CW = g.info.width, CH = g.info.height, K = gm.k, W = gm.W, H = gm.H, ox = gm.x, oy = gm.y;
  chromaKey(g.data, 4);
  // bbox from fully-keyed (solid) pixels only: the model's dark-teal vignette in the corners keys to partial alpha
  // and must not count; then pad by ~1 original pixel to keep the antialiased edges
  // the darkest vignette at the very canvas edges keys as solid: drop a 3% canvas-edge band (only outside the area)
  const bx = Math.round(CW * 0.03), by = Math.round(CH * 0.03);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const inA = x >= ox && x < ox + W && y >= oy && y < oy + H;
    if (!inA && (x < bx || x >= CW - bx || y < by || y >= CH - by)) g.data[(y * CW + x) * 4 + 3] = 0;
  }
  const core = bbox(g.data, CW, CH, 250);
  if (!core) throw new Error("no text found in output");
  const pad = Math.ceil(K);
  const gb = { x: Math.max(0, core.x - pad), y: Math.max(0, core.y - pad) };
  gb.w = Math.min(CW, core.x + core.w + pad) - gb.x; gb.h = Math.min(CH, core.y + core.h + pad) - gb.y;
  // keep the mapped size/position when it fits the original box (8% tolerance); otherwise shrink into it
  const obk = { x: ox + ob.x * K, y: oy + ob.y * K, w: ob.w * K, h: ob.h * K };
  const inArea = gb.x >= ox && gb.y >= oy && gb.x + gb.w <= ox + W && gb.y + gb.h <= oy + H;
  const fits = inArea && gb.w <= obk.w * 1.08 && gb.h <= obk.h * 1.08;
  const k = fits ? 1 : Math.min(obk.w / gb.w, obk.h / gb.h);
  const tw = Math.max(1, Math.round(gb.w * k)), th = Math.max(1, Math.round(gb.h * k));
  const text = await sharp(g.data, { raw: { width: CW, height: CH, channels: 4 } })
    .extract({ left: gb.x, top: gb.y, width: gb.w, height: gb.h }).resize(tw, th, { kernel: "lanczos3" }).raw().toBuffer();
  // original text colour statistics (opaque pixels only)
  let n = 0, sr = 0, sg = 0, sb = 0, vr = 0;
  for (let i = 0; i < o.data.length; i += 4) if (o.data[i + 3] > 200) { n++; sr += o.data[i]; sg += o.data[i + 1]; sb += o.data[i + 2]; }
  const mr = sr / n, mg = sg / n, mb = sb / n;
  for (let i = 0; i < o.data.length; i += 4) if (o.data[i + 3] > 200) vr += (o.data[i] - mr) ** 2 + (o.data[i + 1] - mg) ** 2 + (o.data[i + 2] - mb) ** 2;
  const flat = n > 0 && Math.sqrt(vr / n / 3) < 28;
  if (flat) for (let i = 0; i < text.length; i += 4) { text[i] = mr; text[i + 1] = mg; text[i + 2] = mb; }
  // area coordinates; shrunk text is left-aligned at the original box start, vertically centred in it
  const left = Math.max(0, Math.min(W - tw, Math.round((fits ? gb.x : obk.x) - ox)));
  const top = Math.max(0, Math.min(H - th, Math.round((fits ? gb.y : obk.y + (obk.h - th) / 2) - oy)));
  const big = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: text, raw: { width: tw, height: th, channels: 4 }, left, top }]).png().toBuffer();
  return sharp(big).resize(meta.width, meta.height, { fit: "fill", kernel: "lanczos3" }).png().toFile(out);
}

async function finish(j, hf) {
  // one raw file per generation, so a best-of fallback can be reprocessed from the generation that was actually kept
  const rawHf = hf ?? state.jobs[j.id]?.rawHf;
  const raw = rawHf && (hf || existsSync(join(AUTO, "raw", `${j.id}.${rawHf}.png`))) ? join(AUTO, "raw", `${j.id}.${rawHf}.png`) : join(AUTO, "raw", j.id + ".png");
  if (hf) {
    let res = await fetch(`${CDN}/${hf}.png`);
    if (!res.ok) res = await fetch(`${CDN}/${hf}.jpeg`); // GPT Image results are JPEG
    if (!res.ok) throw new Error(`download ${res.status}`);
    writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
  }
  const srcPath = srcOf(j);
  const magenta = (await keyFor(j)) === "magenta";
  const inv = (x) => sharp(x).negate({ alpha: false }).png().toBuffer();
  const src = magenta ? await inv(srcPath) : srcPath;
  const meta0 = await sharp(srcPath).metadata();
  const g = padGeom(meta0.width, meta0.height, state.jobs[j.id]?.engine);
  // exact inverse of prepare(): scale the output to the padded canvas, crop the original area, scale to the original size
  // sharp applies only one resize per pipeline -> do it in separate steps
  const canvas = await sharp(magenta ? await inv(raw) : raw).resize(g.cw, g.ch, { fit: "fill", kernel: "lanczos3" }).png().toBuffer();
  const area = await sharp(canvas).extract({ left: g.x, top: g.y, width: g.W, height: g.H }).png().toBuffer();
  const textOnly = (j.alpha ?? (await opaqueFraction(srcPath))) < 0.6;
  // the text-only fit (shrink into the original text box + flat recolour) is only for real single-colour text;
  // icons/art with a transparent surround keep the exact geometry (it shrank the "Caça ao Tesouro" icon)
  const plainText = textOnly && (await analyse(srcPath).catch(() => null)) !== null;
  // scale 1 = drop-in replacement (exact original size); scale s>1 = HD remaster copy in outputs-hd/ (the original
  // asset upscaled s times is the reference for alpha/matting), for an HD repack later
  const render = async (s, out) => {
    const meta = { ...meta0, width: meta0.width * s, height: meta0.height * s };
    const ref = s === 1 ? src : await sharp(src).resize(meta.width, meta.height, { kernel: "lanczos3" }).png().toBuffer();
    const back = await sharp(area).resize(meta.width, meta.height, { fit: "fill", kernel: "lanczos3" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const data = back.data;
    if (!meta0.hasAlpha) return sharp(data, { raw: { width: meta.width, height: meta.height, channels: 4 } }).removeAlpha().png().toFile(out);
    const o = await sharp(ref).ensureAlpha().raw().toBuffer();
    let semi = 0;
    for (let i = 3; i < o.length; i += 4) if (o[i] > 30 && o[i] < 230) semi++;
    const semiFrac = semi / (meta.width * meta.height);
    // pure text on transparency: fit the new text into the ORIGINAL text box (never overflow), recoloured to the original colour
    if (plainText && semiFrac < 0.15) return finishTextOnly(canvas, ref, meta, out, { ...g, k: g.k / s });
    unComposite(data, o, textOnly);
    return sharp(data, { raw: { width: meta.width, height: meta.height, channels: 4 } }).png().toFile(out);
  };
  const unInv = async (out) => { if (magenta) writeFileSync(out, await inv(readFileSync(out))); };
  await render(1, j.out); await unInv(j.out);
  const hd = Math.min(4, Math.floor(g.k));
  if (hd >= 2 && !j.noHd) {
    const dir = join(ROOT, "remaster", j.category, "outputs-hd");
    mkdirSync(dir, { recursive: true });
    await render(hd, join(dir, j.id + ".png")).then(() => unInv(join(dir, j.id + ".png"))).catch((e) => console.log("hd", j.id, e.message));
  }
}

// The model saw the original composited over #00FF00, so translucent areas (glass button interiors, dark pills behind
// labels) come back green-tinted. Matting with a known foreground: obs = a*C + (1-a)*green, with C = the original pixel
// colour (or, where the old text was / outside the original, the mean colour of the original translucent areas), so
// a = projection of (obs - green) on (C - green), then C = (obs - (1-a)*green) / a.
// Non-green pixels are new content (text) -> opaque. allowOutside: new pixels may appear where the original was fully
// transparent (text-on-backdrop assets); otherwise the original silhouette clips everything.
function unComposite(data, o, allowOutside) {
  let n = 0, mr = 0, mg = 0, mb = 0;
  for (let i = 0; i < o.length; i += 4) if (o[i + 3] > 30 && o[i + 3] < 230) { n++; mr += o[i]; mg += o[i + 1]; mb += o[i + 2]; }
  const mean = n > (o.length / 4) * 0.05 ? [mr / n, mg / n, mb / n] : null;
  const c = (v) => Math.max(0, Math.min(255, Math.round(v)));
  // the model's "green" is never exactly #00FF00 (~ 15,230,12 + noise): estimate it from the strongly green pixels
  let kn = 0, k0 = 0, k1 = 0, k2 = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i + 1] - Math.max(data[i], data[i + 2]) > 120) { kn++; k0 += data[i]; k1 += data[i + 1]; k2 += data[i + 2]; }
  const G = kn ? [k0 / kn, k1 / kn, k2 / kn] : [0, 255, 0];
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], ao = o[i + 3];
    const inside = ao > 0 || allowOutside;
    const d = g - Math.max(r, b);
    if (!inside) { data[i + 3] = 0; continue; }
    if (d <= 15) { data[i + 3] = ao > 0 ? Math.max(ao, 255) : 255; continue; } // new/kept opaque content
    if (ao >= 230 && d <= 60) {
      // opaque in the original + mild green: either an opaque edge with spill, or an old-text spot that is now the
      // translucent background (bubble/glass) -> matting when "mean colour over green" explains the pixel well
      let matte = false;
      if (mean) {
        const u0 = mean[0] - G[0], u1 = mean[1] - G[1], u2 = mean[2] - G[2], uu = u0 * u0 + u1 * u1 + u2 * u2;
        const v0 = r - G[0], v1 = g - G[1], v2 = b - G[2];
        const a0 = uu > 900 ? Math.max(0, Math.min(1, (v0 * u0 + v1 * u1 + v2 * u2) / uu)) : 1;
        matte = Math.hypot(v0 - a0 * u0, v1 - a0 * u1, v2 - a0 * u2) < 25;
      }
      if (!matte) { data[i + 1] = Math.max(r, b); data[i + 3] = ao; continue; }
    }
    // own colour only for genuine background pixels; antialiased old-text edges (dark, semi-alpha) use the mean
    const own = ao > 30 && ao < 230 && (!mean || Math.abs(o[i] - mean[0]) + Math.abs(o[i + 1] - mean[1]) + Math.abs(o[i + 2] - mean[2]) < 90);
    const C = own ? [o[i], o[i + 1], o[i + 2]] : mean;
    let a;
    if (C) {
      const u0 = C[0] - G[0], u1 = C[1] - G[1], u2 = C[2] - G[2], uu = u0 * u0 + u1 * u1 + u2 * u2;
      a = uu > 900 ? ((r - G[0]) * u0 + (g - G[1]) * u1 + (b - G[2]) * u2) / uu : 0;
    } else a = d > 60 ? 0 : 1 - (d - 15) / 45; // no translucent reference: plain soft chroma key
    a = Math.max(0, Math.min(1, a));
    const kd = Math.abs(r - G[0]) + Math.abs(g - G[1]) + Math.abs(b - G[2]);
    if (a < 0.08 || kd < 45) { data[i + 3] = 0; continue; } // (near) key green: background noise, not a haze
    data[i] = c((r - (1 - a) * G[0]) / a); data[i + 1] = c((g - (1 - a) * G[1]) / a); data[i + 2] = c((b - (1 - a) * G[2]) / a); data[i + 3] = Math.round(a * 255);
    if (data[i + 1] > Math.max(data[i], data[i + 2]) + 10 && !(C && C[1] > Math.max(C[0], C[2]))) data[i + 1] = Math.max(data[i], data[i + 2]);
    // text antialias mixed with a matted area gets its green over-subtracted -> magenta fringe; pull G back to neutral
    if (data[i + 1] < Math.min(data[i], data[i + 2]) && !(C && C[1] < Math.min(C[0], C[2]))) data[i + 1] = Math.min(data[i], data[i + 2]);
  }
  // final despill: no visible pixel may be clearly greener than the original had it (left-over key specks)
  for (let i = 0; i < data.length; i += 4) {
    if (!data[i + 3]) continue;
    const og = o[i + 3] ? o[i + 1] - Math.max(o[i], o[i + 2]) : 0;
    if (data[i + 1] - Math.max(data[i], data[i + 2]) > Math.max(20, og + 20)) data[i + 1] = Math.max(data[i], data[i + 2]) + Math.max(0, og);
  }
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

// node tools/remaster/hf-queue.mjs --reprocess [outDir] : re-run post-processing of every approved job from its saved raw
// output (no download, no OCR). Writes into outDir (default: the real outputs).
// Which image model a job goes to: plain single-colour text on transparency -> Seedream 5.0 Lite (respects width and
// line breaks); everything with art (buttons, icons, panels) -> GPT Image, whose HD remaster is better (user's test).
// Already-generated jobs keep the engine recorded in their state (their raw outputs depend on its canvas geometry).
async function engineFor(j) {
  if (state.jobs[j.id]?.engine) return state.jobs[j.id].engine;
  if (j.engine) return j.engine;
  // GPT Image: great on buttons/icons, but on text-only strips (text on transparency) it ignores the box and wraps /
  // overflows ("Nivel da sala" huge on 2 lines) -> those go to Seedream; everything with art goes to GPT.
  const src = srcOf(j);
  const textOnly = (await opaqueFraction(src)) < 0.6;
  // ...and GPT also wraps/overflows long text on banners ("Espere a planta dar frutos" on 2 cut lines): only short
  if (SPECS[j.id]?.engine) return (j.engine = SPECS[j.id].engine);
  if (j.window) return (j.engine = "seedream");
  // labels on art go to GPT
  return (j.engine = !textOnly && norm(j.pt).length <= 16 ? "gpt" : "seedream");
}

// Erase + SVG: long single-block text on a background (banners): the models misspell long text, so the AI only
// erases the text and the exact string is rendered in the original style (compose-text.mjs). Spec "erase": true forces it.
const ERASE_PROMPT = "Remove all the text from this image. Keep everything else exactly identical: same background, bar, frame, colors, gradients, lighting and layout, just with the text area cleanly filled with the surrounding background. Do not add anything.";
async function isErase(j) {
  if (j.erase !== undefined) return j.erase;
  if (SPECS[j.id]?.erase !== undefined) return (j.erase = !!SPECS[j.id].erase); // explicit spec wins (false = AI text edit)
  if (j.window) return (j.erase = !SPECS[j.id]?.skip); // window phase: the AI only erases, blocks are composed offline
  if (j.complex || j.custom) return (j.erase = false);
  const src = srcOf(j);
  const textOnly = (await opaqueFraction(src)) < 0.6;
  return (j.erase = !textOnly && norm(j.pt).length > 16);
}

// Plain long text on transparency -> deterministic SVG render (exact spelling) instead of the AI.
async function trySvg(j) {
  if (SPECS[j.id]?.fidelity) return false; // review redo: AI text edit only
  if (j.complex || norm(j.pt).length < 16) return false;
  const src = srcOf(j);
  const meta = await sharp(src).metadata();
  if (!meta.hasAlpha) return false;
  const o = await sharp(src).ensureAlpha().raw().toBuffer();
  let semi = 0;
  for (let i = 3; i < o.length; i += 4) if (o[i] > 30 && o[i] < 230) semi++;
  if ((await opaqueFraction(src)) >= 0.6 || semi / (meta.width * meta.height) >= 0.15) return false;
  const ok = await renderText(src, j.out, j.pt, j.ocrLines || 0, splitLines).catch((e) => { console.log("svg", j.id, e.message); return false; });
  state.jobs[j.id] = ok ? { ok: true, method: "svg", score: 1, at: Date.now() } : { ...(state.jobs[j.id] ?? {}), svgTried: true };
  save();
  if (ok) console.log("svg", j.id);
  return ok;
}

// node tools/remaster/hf-queue.mjs --svg : SVG-render every eligible job now (AI outputs backed up to _auto/ai-backup)
if (process.argv[2] === "--svg") {
  mkdirSync(join(AUTO, "ai-backup"), { recursive: true });
  let n = 0;
  for (const j of jobs) {
    const isSvg = state.jobs[j.id]?.method === "svg";
    if (isSvg) delete state.jobs[j.id].svgTried;
    else if (existsSync(j.out) && !existsSync(join(AUTO, "ai-backup", j.id + ".png"))) copyFileSync(j.out, join(AUTO, "ai-backup", j.id + ".png"));
    const had = existsSync(j.out), prev = state.jobs[j.id];
    if (await trySvg(j)) n++;
    else if (had) state.jobs[j.id] = prev; // keep the AI result untouched
  }
  save();
  console.log("svg rendered", n);
  process.exit(0);
}

// node tools/remaster/hf-queue.mjs --rescore : failed jobs -> re-run post-processing + OCR on every saved raw attempt
// (OCR false negatives, e.g. white on orange); the best passing attempt is accepted without regenerating.
if (process.argv[2] === "--rescore") {
  const { readdirSync } = await import("node:fs");
  const raws = readdirSync(join(AUTO, "raw"));
  let n = 0;
  for (const j of jobs) {
    const st = state.jobs[j.id];
    if (!st || st.ok || (st.fails ?? 0) < 3 || existsSync(j.out)) continue;
    const realOut = j.out;
    for (const f of raws.filter((f) => f.startsWith(j.id + ".hf_"))) {
      const hf = f.slice(j.id.length + 1, -4);
      j.out = realOut.replace(/\.png$/, ".rescore.png");
      state.jobs[j.id] = { ...st, rawHf: hf };
      try { await finish(j, null); } catch { continue; } finally { j.out = realOut; }
      const tmp = realOut.replace(/\.png$/, ".rescore.png");
      let { score, text } = await ocrScore(tmp, j.pt);
      const ow = text.split(/\s+/).map(norm).filter(Boolean);
      const bad = j.pt.split(/\s+/).map(norm).filter((w) => w.length >= 5).filter((w) => !ow.some((x) => similarity(x, w) > 0.88 || x.includes(w)));
      if (norm(j.pt).length <= 4) score = 1;
      if (await hasVietnamese(tmp)) score = 0;
      if (score >= 0.95 && !bad.length) { renameSync(tmp, realOut); state.jobs[j.id] = { hf, rawHf: hf, ok: true, score, method: "rescore", at: Date.now() }; n++; console.log("rescued", j.id, score.toFixed(2)); break; }
      state.jobs[j.id] = st;
    }
  }
  save();
  console.log(`rescued ${n}`);
  process.exit(0);
}

// node tools/remaster/hf-queue.mjs --audit : OCR word check over every approved output -> remaster/_auto/audit.json
// node tools/remaster/hf-queue.mjs --suspects : approved jobs flagged by OCR and not yet reviewed -> _auto/suspects.json
if (process.argv[2] === "--suspects") {
  const rows = jobs.filter((j) => state.jobs[j.id]?.ok && state.jobs[j.id]?.suspect && !state.jobs[j.id]?.reviewed).map((j) => j.id);
  writeFileSync(join(AUTO, "suspects.json"), JSON.stringify(rows, null, 1));
  console.log(`suspects ${rows.length}`);
  process.exit(0);
}

// node tools/remaster/hf-queue.mjs --pending : pending jobs (not approved, not deferred windows) -> _auto/pending.json
if (process.argv[2] === "--pending") {
  const rows = jobs.filter((j) => !existsSync(j.out) && !j.window && state.jobs[j.id]?.method !== "svg")
    .map((j) => ({ id: j.id, category: j.category, file: j.file, w: j.w, h: j.h, vn: j.vn, pt: j.pt, lines: j.ocrLines, fails: state.jobs[j.id]?.fails ?? 0, spec: !!SPECS[j.id] }));
  writeFileSync(join(AUTO, "pending.json"), JSON.stringify(rows, null, 1));
  console.log(`pending ${rows.length}`);
  process.exit(0);
}

// node tools/remaster/hf-queue.mjs --windows : deferred window jobs still without output -> _auto/windows.json
if (process.argv[2] === "--windows") {
  const rows = jobs.filter((j) => j.window && !existsSync(j.out))
    .map((j) => ({ id: j.id, category: j.category, file: j.file, w: j.w, h: j.h, vn: j.vn, pt: j.pt, lines: j.ocrLines, skip: !!SPECS[j.id]?.skip }));
  writeFileSync(join(AUTO, "windows.json"), JSON.stringify(rows, null, 1));
  console.log(`windows ${rows.length}`);
  process.exit(0);
}

if (process.argv[2] === "--audit") {
  const rows = [];
  for (const j of jobs) {
    if (!state.jobs[j.id]?.ok || !existsSync(j.out) || j.complex) continue;
    const { score, text } = await ocrScore(j.out, j.pt);
    const ow = text.split(/\s+/).map(norm).filter(Boolean);
    const bad = j.pt.split(/\s+/).map(norm).filter((w) => w.length >= 5).filter((w) => !ow.some((x) => similarity(x, w) > 0.88 || x.includes(w)));
    if (bad.length) rows.push({ id: j.id, pt: j.pt, ocr: text, bad, score: +score.toFixed(2) });
  }
  writeFileSync(join(AUTO, "audit.json"), JSON.stringify(rows, null, 1));
  console.log(`audit: ${rows.length} with word mismatches`);
  process.exit(0);
}

if (process.argv[2] === "--reprocess") {
  const dir = process.argv[3];
  if (dir) mkdirSync(dir, { recursive: true });
  let n = 0;
  for (const j of jobs) {
    const st0 = state.jobs[j.id];
    if (!st0?.ok || st0.method === "svg" || !(existsSync(join(AUTO, "raw", j.id + ".png")) || (st0.rawHf && existsSync(join(AUTO, "raw", `${j.id}.${st0.rawHf}.png`))))) continue;
    const realOut = j.out;
    if (dir) j.out = join(dir, j.id + ".png");
    try { await finish(j, null); n++; } catch (e) { console.log(j.id, e.message); } finally { j.out = realOut; }
  }
  console.log(`reprocessed ${n}`);
  process.exit(0);
}

createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  const send = (code, obj) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
  try {
    if (u.pathname === "/next") {
      let j;
      for (;;) {
        // (svgTried only means "the SVG renderer could not do it" - the job still goes to the AI)
        const want = u.searchParams.get("engine");
        j = null;
        for (const c of jobs) {
          if (c.cropParent || existsSync(c.out) || (state.jobs[c.id]?.fails ?? 0) >= 3 || (c.window && (SPECS[c.id]?.skip || existsSync(join(AUTO, "erased", c.id + ".png")))) || (state.jobs[c.id]?.busy && Date.now() - (state.jobs[c.id]?.at ?? 0) < 600000)) continue;
          if (want && (await engineFor(c)) !== want) continue;
          j = c; break;
        }
        if (!j || state.jobs[j.id]?.svgTried || !(await trySvg(j))) break; // plain long text: rendered locally, take the next job
      }
      if (!j) return send(200, { done: true });
      state.jobs[j.id] = { ...(state.jobs[j.id] ?? {}), busy: true, at: Date.now(), engine: await engineFor(j) };
      save();
      return send(200, { ...(await prepare(j)), engine: state.jobs[j.id].engine });
    }
    if (u.pathname === "/done") {
      const j = jobs.find((x) => x.id === u.searchParams.get("id"));
      const tmp = j.out.replace(/\.png$/, ".candidate.png");
      const realOut = j.out;
      j.out = tmp;
      if (await isErase(j)) {
        // erase + SVG: the AI output is the text-free image; the exact PT-BR text is composed on it
        const erased = join(AUTO, "erased", j.id + ".png");
        mkdirSync(join(AUTO, "erased"), { recursive: true });
        j.out = erased; j.noHd = true;
        try { await finish(j, u.searchParams.get("hf")); } finally { j.out = realOut; j.noHd = false; }
        if (j.window) { state.jobs[j.id] = { ...(state.jobs[j.id] ?? {}), busy: false, erasedHf: u.searchParams.get("hf"), at: Date.now() }; save(); return send(200, { ok: true, score: 1 }); }
        const src = srcOf(j);
        const ok = await composeOnErased(src, erased, j.pt, j.ocrLines || 0, tmp, splitLines);
        if (!ok) { state.jobs[j.id] = { ...(state.jobs[j.id] ?? {}), busy: false, fails: (state.jobs[j.id]?.fails ?? 0) + 1, why: "compose failed (no text mask / analyse rejected)" }; save(); return send(200, { ok: false, error: "compose failed" }); }
        renameSync(tmp, realOut);
        state.jobs[j.id] = { engine: state.jobs[j.id]?.engine, method: "erase+svg", hf: u.searchParams.get("hf"), rawHf: u.searchParams.get("hf"), ok: true, suspect: "erase+svg: check", at: Date.now() };
        save();
        return send(200, { ok: true, score: 1 });
      }
      try { await finish(j, u.searchParams.get("hf")); } finally { j.out = realOut; }
      // tint drift (red/brown buttons came back olive or green): when the mean colour moved, transfer the original's
      // per-channel mean/std back onto the output (tools/remaster/color-match.mjs)
      try {
        const cm = await colorMatch(srcOf(j), tmp, tmp + ".cm.png");
        if (cm.from.some((v, c) => Math.abs(+v - +cm.to[c]) > 6)) renameSync(tmp + ".cm.png", tmp);
        else unlinkSync(tmp + ".cm.png");
      } catch (e) { console.log("color-match skipped:", j.id, e.message); }
      let { score, text } = await ocrScore(tmp, j.pt);
      // whole-string similarity lets 2 typos through on long texts ("segientes"): every expected word of 5+ letters must
      // also match some OCR word at >= 0.8 (OCR noise is ~1 char per word; a model typo usually costs 2)
      const ow = text.split(/\s+/).map(norm).filter(Boolean);
      const bad = j.pt.split(/\s+/).map(norm).filter((w) => w.length >= 5).filter((w) => !ow.some((x) => similarity(x, w) > 0.88 || x.includes(w)));
      if (!j.complex && bad.length) { score = Math.min(score, 0.8); text = "WORD MISMATCH " + bad.join(",") + ": " + text; }
      if (j.complex) score = score >= 0.8 ? 1 : score; // multi-element: looser text match
      if (norm(j.pt).length <= 4) score = 1; // OCR is unreliable on 1-4 letter labels ("Ok"): rely on the Vietnamese-left check
      if (await hasVietnamese(tmp)) { score = Math.min(score, 0.5); text = "VIETNAMESE LEFT: " + text; }
      const prev = state.jobs[j.id] ?? {};
      const best = Math.max(prev.best ?? 0, score);
      const hfNow = u.searchParams.get("hf");
      const bestHf = score >= (prev.best ?? 0) ? hfNow : prev.bestHf;
      if (score >= (prev.best ?? 0)) copyFileSync(tmp, j.out.replace(/\.png$/, ".best.png"));
      const fails = (prev.fails ?? 0) + (score >= 0.95 ? 0 : 1);
      // OCR misreads correct images ("fi" in Confirmar, red on light) and the auto-retries wasted generations: accept the
      // first result; a low OCR score only flags it as "suspect" for the visual review (--suspects contact sheet).
      if (true) {
        renameSync(tmp, j.out);
        state.jobs[j.id] = { engine: prev.engine, hf: hfNow, rawHf: hfNow, ok: true, score, suspect: score < 0.95 ? text.slice(0, 80) : undefined, tries: (prev.fails ?? 0) + 1, prompt: PROMPT_V, at: Date.now() };
        save();
        // disk is tight: the upload copy is regenerated by prepare() if ever needed
        try { unlinkSync(join(AUTO, "up", j.id + ".png")); } catch {}
        return send(200, { ok: true, score: +score.toFixed(2) });
      }
      state.jobs[j.id] = { engine: prev.engine, fails, best, bestHf, why: `ocr ${score.toFixed(2)}: ${text.slice(0, 60)}` };
      save();
      return send(200, { ok: false, error: `ocr ${score.toFixed(2)} (retry ${fails}/3)` });
    }
    if (u.pathname === "/fail") {
      const id = u.searchParams.get("id");
      const s = state.jobs[id] ?? {};
      // browser/UI hiccups (locator timeouts, dialog not opening) say nothing about the job: don't burn its 3 tries
      const why = u.searchParams.get("why") ?? "";
      const ui = /locator\.|Timeout \d+ms|upload dialog|upload tile|attached refs/i.test(why);
      state.jobs[id] = { ...s, busy: false, fails: (s.fails ?? 0) + (ui ? (((s.uiFails ?? 0) + 1) % 4 === 0 ? 1 : 0) : 1), uiFails: (s.uiFails ?? 0) + (ui ? 1 : 0), why };
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
