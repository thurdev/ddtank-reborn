import sharp from "sharp";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { pixelStats } from "./night-grade.mjs";

const SP = "C:/Users/T/AppData/Local/Temp/claude/C--Users-T-Documents-Projects-DDTank/c048f152-a1c9-45a2-b674-36b413e8f4d9/scratchpad";
const EXPORT_ROOT = `${SP}/i18n/ffdec_out`;

async function inspect(swf) {
  const dir = join(EXPORT_ROOT, swf);
  const files = readdirSync(dir).filter((f) => /\.(png|jpg|jpeg)$/i.test(f));
  console.log(`\n=== ${swf} ===`);
  for (const f of files) {
    const p = join(dir, f);
    const img = sharp(p).ensureAlpha();
    const meta = await img.metadata();
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    const st = pixelStats(data, info);
    console.log(`${f.padEnd(10)} ${meta.width}x${meta.height} L=${st.lightness.toFixed(2)} S=${st.sat.toFixed(2)} stdL=${st.stdL.toFixed(2)} blueBias=${st.blueBias.toFixed(1)} n=${st.n}`);
  }
}
await inspect("Loading.swf");
await inspect("DDT_Loading.swf");
