// Splits every distinct DB source string (data/i18n/_work/db/*.jsonl) into chunks for hand/LLM translation and
// assembles the results back into data/i18n/pt-BR/db/*.jsonl (consumed by db:texts:import).
//   node tools/i18n/llm-chunks.mjs split   -> data/i18n/_work/llm/in-NNN.json  [{ "i": id, "vi": text }]
//   node tools/i18n/llm-chunks.mjs build   <- data/i18n/_work/llm/out-NNN.json { "<id>": "pt text" }
// Priority order = player visibility (names before long descriptions).
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
const ROOT = join(import.meta.dirname, "..", "..");
const W = join(ROOT, "data", "i18n", "_work", "db"), L = join(ROOT, "data", "i18n", "_work", "llm"), O = join(ROOT, "data", "i18n", "pt-BR", "db");
const ORDER = ["Shop_Goods.Name", "Quest.Title", "NPC_Info.Name", "Game_Map.Name", "Pve_Info.Name", "Mission_Info.Name", "Mission_Info.Title", "Achievement.Title", "Pet_Template_Info.Name", "Pet_Skill_Info.Name", "Pet_Skill_Element_Info.Name", "SuitTemplateInfo.SuitName", "Card_Info.Name", "Consortia_BuffTemp.name", "Rune_Template.Name", "Quest.Detail", "Mission_Info.Description", "Achievement.Detail", "Pve_Info.Description", "Game_Map.Description", "Pet_Template_Info.Description", "Pet_Skill_Info.Description", "Pet_Skill_Element_Info.Description", "Shop_Goods.Description"];
const files = readdirSync(W).filter((f) => f.endsWith(".jsonl")).map((f) => f.replace(".jsonl", ""));
const rank = (f) => { const i = ORDER.indexOf(f); return i < 0 ? 99 : i; };
files.sort((a, b) => rank(a) - rank(b));
const rows = (f) => readFileSync(join(W, f + ".jsonl"), "utf8").trim().split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const mode = process.argv[2];
const VN = /[ăắằẳẵặấầẩẫậđếềểễệốồổỗộơớờởỡợưứừửữựạảẹẻẽịỉọỏụủỳỵỷỹđ]/i;
if (mode === "split") {
  const seen = new Map(); const list = [];
  for (const f of files) for (const r of rows(f)) if (!seen.has(r.text)) { seen.set(r.text, list.length); list.push(r.text); }
  mkdirSync(L, { recursive: true });
  const size = +(process.argv[3] ?? 250);
  let n = 0;
  for (let i = 0; i < list.length; i += size) {
    const chunk = list.slice(i, i + size).map((vi, k) => ({ i: i + k, vi }));
    writeFileSync(join(L, `in-${String(n).padStart(3, "0")}.json`), JSON.stringify(chunk, null, 0).replace(/\},\{/g, "},\n{"));
    n++;
  }
  writeFileSync(join(L, "index.json"), JSON.stringify(list));
  console.log(`${list.length} distinct strings -> ${n} chunks of ${size}`);
} else if (mode === "build") {
  const list = JSON.parse(readFileSync(join(L, "index.json"), "utf8"));
  const tr = new Map();
  for (const f of readdirSync(L).filter((f) => /^out-\d+\.json$/.test(f))) for (const [i, pt] of Object.entries(JSON.parse(readFileSync(join(L, f), "utf8")))) if (typeof pt === "string" && pt.trim()) tr.set(list[+i], pt);
  mkdirSync(O, { recursive: true });
  let total = 0, done = 0;
  for (const f of files) {
    const prev = existsSync(join(O, f + ".jsonl")) ? new Map(readFileSync(join(O, f + ".jsonl"), "utf8").trim().split(/\r?\n/).filter(Boolean).map((l) => { const j = JSON.parse(l); return [j.rowId, j.text]; })) : new Map();
    const out = [];
    for (const r of rows(f)) { total++; const t = tr.get(r.text) ?? (!VN.test(r.text) ? null : null) ?? prev.get(r.rowId); if (t) { out.push(JSON.stringify({ rowId: r.rowId, text: t })); done++; } }
    writeFileSync(join(O, f + ".jsonl"), out.join("\n") + (out.length ? "\n" : ""));
  }
  console.log(`translated distinct ${tr.size}/${list.length}; rows ${done}/${total}`);
}
