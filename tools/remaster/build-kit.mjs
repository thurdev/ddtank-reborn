// Builds the manual AI-remaster kit at remaster/: one folder per category with inputs/ (original images),
// prompts/ (one .txt per image, same basename) and outputs/ (where the user pastes the generated image, same basename).
// Usage: node tools/remaster/build-kit.mjs
// Re-import of outputs into the game: tools/remaster/import-outputs.mjs (later) reads remaster/manifest.csv.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const EXPORT_DIR =
  process.env.FFDEC_EXPORT ??
  "C:/Users/T/AppData/Local/Temp/claude/C--Users-T-Documents-Projects-DDTank/c048f152-a1c9-45a2-b674-36b413e8f4d9/scratchpad/i18n/ffdec_out";
const OUT = "remaster";
const inv = JSON.parse(readFileSync("research/i18n/image-inventory.json", "utf8")).rows;

const CATS = {
  1: "01-loading",
  2: "02-lobby-hall",
  3: "03-janelas",
  4: "04-botoes-titulos",
  5: "05-icones",
  6: "06-combate-outros",
};

// Text images that really contain UI text (not OCR noise), plus every big background of loading/hall.
const picked = new Map();
for (const r of inv) {
  if (r.status !== "skipped-low-confidence" || r.priority <= 2) picked.set(r.path, r);
}
for (const swf of ["hall.swf", "hall_old.swf", "DDT_Loading.swf", "Loading.swf"]) {
  const dir = join(EXPORT_DIR, swf);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) {
    if (!/\.(png|jpe?g)$/i.test(f)) continue;
    const path = `${swf}::${f}`;
    if (picked.has(path)) continue;
    if (statSync(join(dir, f)).size < 60_000) continue; // only large backgrounds
    picked.set(path, { swf, file: f, path, w: 0, h: 0, priority: swf.includes("all") ? 2 : 1, ptBrSuggestion: null, ocrText: "" });
  }
}

// PNG alpha detection: color type 4/6 (gray/rgb + alpha) or a tRNS chunk.
function hasAlpha(file) {
  if (!/\.png$/i.test(file)) return false;
  const b = readFileSync(file);
  if (b.length < 33) return false;
  const colorType = b[25];
  return colorType === 4 || colorType === 6 || b.includes(Buffer.from("tRNS"));
}

// Closest aspect ratio Soul 2.0 / most image models accept.
const RATIOS = [["1:1", 1], ["4:3", 4 / 3], ["3:4", 3 / 4], ["3:2", 1.5], ["2:3", 2 / 3], ["16:9", 16 / 9], ["9:16", 9 / 16]];
function nearestRatio(w, h) {
  if (!w || !h) return "same as reference";
  const r = w / h;
  return RATIOS.reduce((a, b) => (Math.abs(Math.log(b[1] / r)) < Math.abs(Math.log(a[1] / r)) ? b : a))[0];
}

const KIND = {
  "01-loading": "a full-screen LOADING SCREEN illustration (keep the progress bar frame exactly where it is)",
  "02-lobby-hall": "a piece of the town LOBBY/hall (background, building, building caption or decoration)",
  "03-janelas": "a UI WINDOW / PANEL piece (frame, background, tab, title plate)",
  "04-botoes-titulos": "a UI BUTTON or TITLE plate",
  "05-icones": "a small game ICON",
  "06-combate-outros": "an in-battle / misc UI asset",
};

function prompt(r, cat, src) {
  const alpha = hasAlpha(src);
  const size = r.w && r.h ? `${r.w}x${r.h}px` : "same as the reference";
  const pt = r.ptBrSuggestion && String(r.ptBrSuggestion).trim();
  const noisyOcr = !pt && r.ocrText && r.ocrText.trim() && (r.ocrConfidence ?? 0) >= 50;
  const lines = [
    `REMASTER of the attached reference image: ${KIND[cat] ?? "a UI asset"} from the 2D cartoon game DDTank. Reproduce THE SAME asset, only better rendered — this is not a new design.`,
    "LAYOUT (strict): same framing, same shape and silhouette, same proportions, every element in the same place and size. Do NOT add, remove, move, zoom, crop, rotate or change perspective. No new characters, objects, logos or emblems.",
    "STYLE: same hand-painted cartoon casual-game art (DDTank/Gunny), same palette family, cleaner lines, sharper details, higher resolution, polished modern game art. NOT photorealistic, NOT 3D render, NOT a diorama.",
    "DARK MODE: shift light/cream/beige UI surfaces to deep navy/charcoal with the same gold/colored trims and accents; keep icons and characters in their original colors; everything stays readable.",
  ];
  if (pt) {
    lines.push(`TEXT (strict): the ONLY text in the image is exactly "${pt}" (Brazilian Portuguese), written once, in the same place, same font style (chunky cartoon game lettering), same colors, outline, gradient and shadow as the original text. No other letters, numbers or words.`);
  } else if (noisyOcr) {
    lines.push(`TEXT (strict): translate the visible text to Brazilian Portuguese, same place, same lettering style and effects (original text, OCR may be noisy: "${r.ocrText.replace(/\s+/g, " ").trim().slice(0, 80)}"). No extra words or numbers.`);
  } else {
    lines.push("TEXT: if the original has text, keep it in the same place but write it in Brazilian Portuguese with the same lettering style; never invent new text, numbers or labels.");
  }
  lines.push(
    alpha
      ? "BACKGROUND (strict): wherever the original is transparent, use plain flat pure green #00FF00 (chroma key) — no gradient, no shadow, no scenery. Clean sharp edges."
      : "BACKGROUND: same as the original (no new scenery around it).",
    `FORMAT: aspect ratio ${nearestRatio(r.w, r.h)} (original ${size}); generate at high resolution, it will be downscaled to the exact size.`,
  );
  const ratio = r.w && r.h ? r.w / r.h : 1;
  if (ratio > 2.2 || ratio < 0.45) {
    lines.push(
      `THIN ASSET: the original is a very ${ratio > 1 ? "wide horizontal" : "tall vertical"} strip (${size}). Draw it as a single ${ratio > 1 ? "horizontal" : "vertical"} strip centered in the canvas, keeping its exact ${ratio > 1 ? "width-to-height" : "height-to-width"} proportion (${ratio > 1 ? (ratio).toFixed(1) + ":1" : "1:" + (1 / ratio).toFixed(1)}), with plain flat #00FF00 green filling the rest of the canvas — it will be cropped.`,
    );
  }
  return lines.join("\n");
}

// Hand-written prompts that must never be overwritten by the generator.
const CUSTOM = (p) => existsSync(p) && /^(Remaster of the attached reference image — the town lobby|New loading screen)/.test(readFileSync(p, "utf8"));

mkdirSync(OUT, { recursive: true });
const manifest = ["category,file,source_swf,source_file,width,height,pt_br"];
let n = 0;
for (const r of picked.values()) {
  const src = join(EXPORT_DIR, r.swf, r.file);
  if (!existsSync(src)) continue;
  const cat = CATS[r.priority] ?? CATS[6];
  for (const sub of ["inputs", "prompts", "outputs"]) mkdirSync(join(OUT, cat, sub), { recursive: true });
  const base = `${r.swf.replace(/\.swf$/i, "")}__${r.file.replace(/\.(png|jpe?g)$/i, "")}`.replace(/[^\w.-]+/g, "_");
  const ext = r.file.match(/\.(png|jpe?g)$/i)[0].toLowerCase();
  copyFileSync(src, join(OUT, cat, "inputs", base + ext));
  const pf = join(OUT, cat, "prompts", base + ".txt");
  if (!CUSTOM(pf)) writeFileSync(pf, prompt(r, cat, src) + "\n");
  manifest.push([cat, base + ext, r.swf, r.file, r.w || "", r.h || "", JSON.stringify(r.ptBrSuggestion ?? "")].join(","));
  n++;
}
writeFileSync(join(OUT, "manifest.csv"), manifest.join("\n") + "\n");
const counts = Object.values(CATS).map((c) => `${c}: ${existsSync(join(OUT, c, "inputs")) ? readdirSync(join(OUT, c, "inputs")).length : 0}`);
console.log(`remaster kit: ${n} images\n${counts.join("\n")}`);
