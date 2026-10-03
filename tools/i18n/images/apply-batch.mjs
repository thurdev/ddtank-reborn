// Applies targets.json: for each {swf, file, viText}, looks up PT-BR (curated-captions.json primarily),
// renders the replacement via replace.mjs, and stages it under <stageRoot>/<swf>/<file> (same filename as the
// FFDec export, ready for `ffdec -importImages`).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { replaceImageText, closeWorker } from "./replace.mjs";
import { buildTranslator } from "./lookup.mjs";

const SP = "C:/Users/T/AppData/Local/Temp/claude/C--Users-T-Documents-Projects-DDTank/c048f152-a1c9-45a2-b674-36b413e8f4d9/scratchpad";
const EXPORT_ROOT = `${SP}/i18n/ffdec_out`;
const STAGE_ROOT = `${SP}/i18n/staged`;

const targets = JSON.parse(readFileSync(new URL("./targets.json", import.meta.url), "utf8"));
const translate = buildTranslator();

const report = [];
for (const [swf, files] of Object.entries(targets)) {
  for (const [file, viText] of Object.entries(files)) {
    const src = join(EXPORT_ROOT, swf, file);
    const dst = join(STAGE_ROOT, swf, file);
    const { pt, source } = translate(viText);
    if (!pt) {
      console.error(`[SKIP] no PT-BR for "${viText}" (${swf}::${file})`);
      report.push({ swf, file, viText, pt: null, ok: false, reason: "no-translation" });
      continue;
    }
    try {
      const res = await replaceImageText(src, dst, pt);
      console.log(`[OK] ${swf}::${file}  "${viText}" -> "${pt}"  (${res.fontSize}px, ${res.flat ? "flat" : "gradient"}, ${res.lines.length}L)`);
      report.push({ swf, file, viText, pt, ptSource: source, ok: true, ...res });
    } catch (e) {
      console.error(`[FAIL] ${swf}::${file}: ${e.message}`);
      report.push({ swf, file, viText, pt, ok: false, reason: String(e.message) });
    }
  }
}
await closeWorker();
mkdirSync(STAGE_ROOT, { recursive: true });
writeFileSync(join(STAGE_ROOT, "_report.json"), JSON.stringify(report, null, 2));
const ok = report.filter((r) => r.ok).length;
console.log(`\n${ok}/${report.length} images rendered. Staged under ${STAGE_ROOT}`);
