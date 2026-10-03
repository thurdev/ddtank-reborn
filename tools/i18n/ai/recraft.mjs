// Recraft image-to-image tooling for the painted-art PT-BR/dark-mode batch (needs-ai.md,
// needs-ai-batch2.md, ROADMAP "Reborn visual" items 1/2/4).
//
// Not wired to a live Recraft connector in this environment — this repo has no Recraft MCP/connector,
// and this session's Higgsfield allowance was unavailable (unlim trial inactive, see docs/BACKLOG.md
// "Lote visual dark/night" entry), so nothing here has been exercised against the real API. Written so
// whoever has a RECRAFT_API_KEY can run the batch without re-deriving the plumbing:
//   RECRAFT_API_KEY=sk-... node tools/i18n/ai/recraft.mjs <target-id-from-needs-ai.md> [--dry-run]
//
// Recraft API docs: https://www.recraft.ai/docs — relevant endpoints:
//   POST https://external.api.recraft.ai/v1/images/imageToImage   (image-to-image, strength param controls
//     how much the source is preserved — use HIGH strength ~0.4-0.6 for these assets: we want the same
//     composition/silhouette/anchors, just redrawn/recolored, never a fresh unrelated image)
//   POST https://external.api.recraft.ai/v1/images/inpaint        (mask-guided inpaint — use for swapping
//     just the VN text region in a painted background, e.g. the needs-ai.md "art-integrated text" rows)
// Both take multipart/form-data: image (file), optionally mask (file, white=edit/black=keep), prompt,
// strength, n, response_format=url|b64_json.
//
// This script deliberately does NOT hardcode which images to send — see TARGETS below, populated from
// research/i18n/needs-ai.md + needs-ai-batch2.md. Add an entry, run once per id. Output lands in
// research/i18n/ai-out/<id>/ alongside a copy of the original for before/after comparison; nothing is
// auto-repacked — review each result against size/anchors before running tools/i18n/images/pack.sh.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = "C:/Users/T/Documents/Projects/DDTank";
const OUT_DIR = join(ROOT, "research/i18n/ai-out");
const API_BASE = "https://external.api.recraft.ai/v1/images";

// One entry per needs-ai.md / needs-ai-batch2.md row that's ready to attempt. Keep `sourcePath` pointing
// at the FFDec-exported original (export-all.sh output), never a previously-AI-edited file, so re-runs
// always start from vendor pixels.
const TARGETS = {
  "ddt-loading-splash": {
    swf: "DDT_Loading.swf",
    file: "25.png",
    note: '3-color stacked title lettering over painted ribbon+mascots. Prompt: redraw the same ribbon/mascot composition, same 461x200 canvas, with "Edição Memórias" / "GUNNY" / "LENDA" in matching green/red/blue bevelled lettering, same placement as the VN original.',
    mode: "imageToImage",
    strength: 0.5,
  },
  "hall-battlelabs-comic": {
    swf: "hall.swf",
    file: "4_asset.hall.battleLABS.png",
    note: "4-panel hand-painted tutorial comic (492x1616), lettering integrated into art per panel. See research/i18n/images-with-text.md for the panel-by-panel PT-BR transcript.",
    mode: "imageToImage",
    strength: 0.45,
  },
  "roomlist-dungeon-banner": {
    swf: "roomlist.swf",
    file: "72_asset.DungeonList.DungeonListBG.jpg",
    note: '"Ải viễn chinh" ribbon + "Danh sách phòng" tab baked into one JPEG background.',
    mode: "inpaint",
  },
  "wonderfulactivity-banner": {
    swf: "wonderfulactivity.swf",
    file: "84_wonderful.accumulative.title.png",
    note: 'Decorative event banner, title wraps around ornamental icons/coins: "Recarga Acumulada: Receba Já Seu Prêmio".',
    mode: "inpaint",
  },
  "awardsystem-roulette-bg": {
    swf: "awardsystem.swf",
    file: "59_asset.awardSystem.roulette.RouletteBG.png",
    note: "Roulette-wheel art with 4 labels baked at different points around the wheel (see needs-ai.md for each label's PT-BR).",
    mode: "inpaint",
  },
};

const EXPORT_ROOT =
  "C:/Users/T/AppData/Local/Temp/claude/C--Users-T-Documents-Projects-DDTank/c048f152-a1c9-45a2-b674-36b413e8f4d9/scratchpad/i18n/ffdec_out";

async function callRecraft(apiKey, { mode, imagePath, maskPath, prompt, strength }) {
  const endpoint = mode === "inpaint" ? `${API_BASE}/inpaint` : `${API_BASE}/imageToImage`;
  const form = new FormData();
  form.append("image", new Blob([readFileSync(imagePath)]), "image.png");
  if (maskPath) form.append("mask", new Blob([readFileSync(maskPath)]), "mask.png");
  form.append("prompt", prompt);
  if (strength != null) form.append("strength", String(strength));
  form.append("n", "1");
  form.append("response_format", "url");

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Recraft API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  const id = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");
  if (!id || !TARGETS[id]) {
    console.error(`Usage: node recraft.mjs <id> [--dry-run]\nKnown ids: ${Object.keys(TARGETS).join(", ")}`);
    process.exit(1);
  }
  const t = TARGETS[id];
  const imagePath = join(EXPORT_ROOT, t.swf, t.file);
  if (!existsSync(imagePath)) {
    console.error(`Source not found: ${imagePath}\nRun tools/i18n/images/export-all.sh first (it's cached/resumable).`);
    process.exit(1);
  }
  const destDir = join(OUT_DIR, id);
  mkdirSync(destDir, { recursive: true });

  console.log(`[${id}] ${t.swf}::${t.file} — ${t.note}`);
  if (dryRun) {
    console.log("[dry-run] would call Recraft", t.mode, "with strength", t.strength ?? "(n/a for inpaint)");
    return;
  }
  const apiKey = process.env.RECRAFT_API_KEY;
  if (!apiKey) {
    console.error("Set RECRAFT_API_KEY to run for real. (No connector is configured in this environment —");
    console.error("this is why the AI visual batch could not run here; get a key from recraft.ai/docs and export it.)");
    process.exit(1);
  }
  const result = await callRecraft(apiKey, {
    mode: t.mode,
    imagePath,
    maskPath: t.maskPath ? join(EXPORT_ROOT, t.swf, t.maskPath) : undefined,
    prompt: t.note,
    strength: t.strength,
  });
  writeFileSync(join(destDir, "recraft-response.json"), JSON.stringify(result, null, 2));
  console.log(`Saved response to ${destDir}/recraft-response.json — download the URL(s) inside, verify`);
  console.log(`dimensions match the original (${t.file}) exactly, then stage into tools/i18n/images/pack.sh's`);
  console.log(`STAGE dir under the same filename before repacking.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
