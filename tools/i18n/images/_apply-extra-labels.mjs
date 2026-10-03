// One-off: apply the 8 hall/chat labels found this session that OCR's vi-only heuristic skipped (English
// source text with no Vietnamese diacritics: "Guild"/"Shop", or OCR missed them: "Đấu giá"), plus the
// "Hiện tại" chat tab (found via asset name, not bitmap OCR, since it lives in chat.swf/chat1.swf not hall).
// Reuses replace.mjs directly (bypasses targets.json/lookup.mjs since translations are already known exactly).
import { replaceImageText, closeWorker } from "./replace.mjs";
import { join } from "node:path";

const SP = "C:/Users/T/AppData/Local/Temp/claude/C--Users-T-Documents-Projects-DDTank/c048f152-a1c9-45a2-b674-36b413e8f4d9/scratchpad";
const EXPORT_ROOT = `${SP}/i18n/ffdec_out`;
const STAGE_ROOT = `${SP}/i18n/staged`;

const JOBS = [
  ["hall.swf", "18.png", "Guild", "Sociedade"],
  ["hall.swf", "42.png", "Đấu giá", "Leilão"],
  ["hall.swf", "45.png", "Shop", "Loja"],
  ["hall_old.swf", "110.png", "Guild", "Sociedade"],
  ["hall_old.swf", "134.png", "Đấu giá", "Leilão"],
  ["hall_old.swf", "137.png", "Shop", "Loja"],
  ["chat.swf", "60_asset.chat.ChannelState_Current.png", "Hiện tại", "Atual"],
  ["chat1.swf", "19_asset.chat.ChannelState_Current.png", "Hiện tại", "Atual"],
];

for (const [swf, file, vi, pt] of JOBS) {
  const src = join(EXPORT_ROOT, swf, file);
  const dst = join(STAGE_ROOT, swf, file);
  const res = await replaceImageText(src, dst, pt);
  console.log(`[OK] ${swf}::${file}  "${vi}" -> "${pt}"  (${res.fontSize}px, ${res.flat ? "flat" : "gradient"})`);
}
await closeWorker();
