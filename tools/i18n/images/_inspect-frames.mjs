import sharp from "sharp";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pixelStats } from "./night-grade.mjs";

const SP = "C:/Users/T/AppData/Local/Temp/claude/C--Users-T-Documents-Projects-DDTank/c048f152-a1c9-45a2-b674-36b413e8f4d9/scratchpad";
const EXPORT_ROOT = `${SP}/i18n/ffdec_out`;
const STAGE_ROOT = `${SP}/i18n/staged`;

const SWFS = process.argv.slice(2);

async function inspect(swf) {
  const dir = join(EXPORT_ROOT, swf);
  if (!existsSync(dir)) { console.log(`(no export dir for ${swf})`); return; }
  const files = readdirSync(dir).filter((f) => /\.(png|jpg|jpeg)$/i.test(f));
  const rows = [];
  for (const f of files) {
    const p = join(dir, f);
    const img = sharp(p).ensureAlpha();
    const meta = await img.metadata();
    const area = (meta.width || 0) * (meta.height || 0);
    rows.push({ f, w: meta.width, h: meta.height, area });
  }
  rows.sort((a, b) => b.area - a.area);
  console.log(`\n=== ${swf} (top 18 by area, of ${files.length}) ===`);
  for (const r of rows.slice(0, 18)) console.log(`${r.f.padEnd(55)} ${r.w}x${r.h}`);
}

for (const swf of SWFS) await inspect(swf);
