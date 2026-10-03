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

function prompt(r) {
  const size = r.w && r.h ? `${r.w}x${r.h}px` : "same size as the reference";
  const text = r.ptBrSuggestion
    ? `Replace ALL visible text with this Brazilian Portuguese text, same position, same font style, same colors, outline and effects: "${r.ptBrSuggestion}".`
    : r.ocrText && r.ocrText.trim()
      ? `Translate ALL visible text (Vietnamese/Chinese) to Brazilian Portuguese, same position, same font style, colors, outline and effects. Original text (OCR, may be noisy): "${r.ocrText.replace(/\s+/g, " ").trim().slice(0, 120)}".`
      : "If there is any text, translate it to Brazilian Portuguese keeping the same font style, position and effects; otherwise no text.";
  return [
    "IMAGE EDIT / REMASTER of the attached reference image. This is a UI asset from the 2D cartoon game DDTank.",
    "STRICT: keep the EXACT same composition, framing, camera angle, layout and silhouette. Every element stays in the same position, same size, same shape, same proportions. Do NOT add, remove or move anything. Do NOT zoom, crop, rotate or change perspective. Output must overlay the original pixel-for-pixel in layout.",
    "Remaster only the rendering quality: same hand-painted cartoon game art style, same colors and palette, cleaner lines, sharper details, higher resolution, modern polished game art. Not photorealistic, not 3D render, not a new scene.",
    "Dark mode: shift the UI to a dark theme (deep navy/charcoal backgrounds, keep accents and readability). If it is the town lobby, make it NIGHT time: dark blue starry sky, warm lit windows, lanterns.",
    text,
    `Keep transparent background if the reference has transparency. Final asset size: ${size} (generate at higher resolution with the same aspect ratio; we downscale).`,
  ].join("\n");
}

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
  writeFileSync(join(OUT, cat, "prompts", base + ".txt"), prompt(r) + "\n");
  manifest.push([cat, base + ext, r.swf, r.file, r.w || "", r.h || "", JSON.stringify(r.ptBrSuggestion ?? "")].join(","));
  n++;
}
writeFileSync(join(OUT, "manifest.csv"), manifest.join("\n") + "\n");
const counts = Object.values(CATS).map((c) => `${c}: ${existsSync(join(OUT, c, "inputs")) ? readdirSync(join(OUT, c, "inputs")).length : 0}`);
console.log(`remaster kit: ${n} images\n${counts.join("\n")}`);
