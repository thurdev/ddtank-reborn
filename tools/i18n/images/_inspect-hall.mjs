import sharp from "sharp";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pixelStats } from "./night-grade.mjs";

const SP = "C:/Users/T/AppData/Local/Temp/claude/C--Users-T-Documents-Projects-DDTank/c048f152-a1c9-45a2-b674-36b413e8f4d9/scratchpad";
const EXPORT_ROOT = `${SP}/i18n/ffdec_out`;
const STAGE_ROOT = `${SP}/i18n/staged`;

async function inspect(swf) {
  const dir = join(EXPORT_ROOT, swf);
  const files = readdirSync(dir).filter((f) => /\.(png|jpg|jpeg)$/i.test(f));
  console.log(`\n=== ${swf} (${files.length} files) ===`);
  const rows = [];
  for (const f of files) {
    const stagedPath = join(STAGE_ROOT, swf, f);
    const p = existsSync(stagedPath) ? stagedPath : join(dir, f);
    const img = sharp(p).ensureAlpha();
    const meta = await img.metadata();
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    const st = pixelStats(data, info);
    rows.push({ f, w: meta.width, h: meta.height, staged: p === stagedPath, L: st.lightness.toFixed(2), S: st.sat.toFixed(2), stdL: st.stdL.toFixed(2), blueBias: st.blueBias.toFixed(1), n: st.n });
  }
  rows.sort((a, b) => b.w * b.h - a.w * a.h);
  for (const r of rows) console.log(`${r.f.padEnd(45)} ${String(r.w).padStart(4)}x${String(r.h).padEnd(4)} staged=${r.staged ? "Y" : "n"} L=${r.L} S=${r.S} stdL=${r.stdL} blueBias=${r.blueBias}`);
}

await inspect("hall.swf");
await inspect("hall_old.swf");
