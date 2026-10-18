// Lote Seedream 4.5 pro pack 6600 (texto turco em bitmap → PT-BR), mesmo fluxo do v45-batch.mjs:
//   prepare <n>  → próximos n ids de tools/remaster/prompts/win45-6600/ sem saída; gera uploads (verde se tiver
//                  transparência) e .playwright-mcp/v45-run.js (rodar com browser_run_code_unsafe; devolve
//                  "RESULT <id> <hf>")
//   finish       → lê .playwright-mcp/v45-results.txt, baixa cada resultado, ajusta (fit-green/fit-ai) em
//                  remaster/<cat>/outputs/<id>.png e registra em remaster/approved-6600.json (review:"v45")
// Depois: node tools/i18n/build-client-art.mjs --only-approved-6600 (importa nos SWF do overlay flash6600).
// Como lê esse código (cada variável): man linhas do remaster/manifest-6600.csv; where() acha categoria/swf/arquivo
// de um id; inputOf() acha o PNG exportado em remaster/_6600/inputs/<caminho-do-swf-com-__>/; jobs uploads+prompt.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

const ROOT = resolve(import.meta.dirname, "..", "..");
const R = (...p) => join(ROOT, ...p);
const CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_3GTAcG8wB8hMi4zVVUC51azi0GB";
const PROMPTS = R("tools/remaster/prompts/win45-6600");
const INPUTS = R("remaster/_6600/inputs");
const APPROVED = R("remaster/approved-6600.json");
const man = readFileSync(R("remaster/manifest-6600.csv"), "utf8").split(/\r?\n/).slice(1).filter(Boolean);
const where = (id) => {
  const l = man.find((x) => x.split(",")[1]?.replace(/\.(png|jpe?g)$/i, "") === id);
  if (!l) return null;
  const [cat, file, swf, src, w, h] = l.split(",");
  return { cat, file, swf, src, w: +w, h: +h };
};
// pasta de export: caminho do SWF com "/" trocado por "__" (ex.: ui__turkey__swf__boguadventure.swf)
const dirs = existsSync(INPUTS) ? readdirSync(INPUTS) : [];
const inputOf = (w) => {
  for (const d of dirs.filter((d) => d.toLowerCase().endsWith(w.swf.toLowerCase()))) {
    const f = join(INPUTS, d, w.src);
    if (existsSync(f)) return { file: f, swfPath: d.split("__").join("\\") };
  }
  return null;
};
const ids = readdirSync(PROMPTS).filter((f) => f.endsWith(".txt")).map((f) => f.slice(0, -4));
const cmd = process.argv[2];
mkdirSync(R("remaster/_hd/v45-6600"), { recursive: true });

if (cmd === "prepare") {
  const n = Math.min(8, Number(process.argv[3] ?? 8)); // ~2 min cada; o MCP corta em 30 min
  const todo = ids.filter((id) => { const w = where(id); return w && inputOf(w) && !existsSync(R("remaster", w.cat, "outputs", id + ".png")); }).slice(0, n);
  const missing = ids.filter((id) => !where(id) || !inputOf(where(id)));
  if (missing.length) console.log(`sem manifesto/entrada: ${missing.join(" ")}`);
  const jobs = [];
  for (const id of todo) {
    const w = where(id);
    const inp = inputOf(w).file;
    const st = await sharp(inp).stats();
    const alpha = !st.isOpaque;
    const up = R("remaster/_hd/v45-6600", id + (alpha ? ".green.png" : ".up.png"));
    const m = await sharp(inp).metadata();
    const scale = Math.max(1, Math.ceil(1024 / Math.max(m.width, m.height)));
    let s = sharp(inp);
    if (alpha) s = s.flatten({ background: "#00ff00" });
    await s.resize(m.width * scale, m.height * scale, { kernel: "lanczos3" }).png().toFile(up);
    let prompt = readFileSync(join(PROMPTS, id + ".txt"), "utf8").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
    if (alpha && !/green background/i.test(prompt)) prompt += " Keep the flat pure green background unchanged.";
    jobs.push({ id, upload: up.replace(/\\/g, "/"), prompt });
  }
  if (!jobs.length) { console.log("nada a fazer"); process.exit(0); }
  // reaproveita o gerador de 1 job (guarda de modelo + Unlimited) e troca por lista
  execFileSync(process.execPath, [R("tools/remaster/make-hf-one.mjs"), jobs[0].upload, R("tools/remaster/prompts/hall-bg.txt"), R(".playwright-mcp/_one.js"), "seedream_v4_5"], { cwd: ROOT });
  let t = readFileSync(R(".playwright-mcp/_one.js"), "utf8");
  t = t.replace("const N = 1;", () => `const N = ${jobs.length}; const JOBS = ${JSON.stringify(jobs)};`).replace(/const job = \{.*\};/, "const job = JOBS[n];").replace("log.push('RESULT ' + hf + ' ' + url);", "log.push('RESULT ' + job.id + ' ' + hf);");
  writeFileSync(R(".playwright-mcp/v45-run.js"), t);
  console.log(`prepared ${jobs.length}: ${jobs.map((j) => j.id).join(" ")}`);
} else if (cmd === "finish") {
  const lines = readFileSync(R(".playwright-mcp/v45-results.txt"), "utf8").split(/\r?\n/).filter((l) => l.startsWith("RESULT "));
  const ap = existsSync(APPROVED) ? JSON.parse(readFileSync(APPROVED, "utf8")) : [];
  for (const l of lines) {
    const [, id, hf] = l.split(" ");
    const w = where(id);
    const inp = w && inputOf(w);
    if (!inp) { console.log("sem entrada", id); continue; }
    let res = null;
    for (const ext of ["png", "jpeg"]) { const r = await fetch(`${CDN}/${hf}.${ext}`); if (r.ok) { res = Buffer.from(await r.arrayBuffer()); break; } }
    if (!res) { console.log("download failed", id); continue; }
    const ai = R("remaster/_hd/v45-6600", id + ".ai.png");
    await sharp(res).png().toFile(ai);
    const green = existsSync(R("remaster/_hd/v45-6600", id + ".green.png"));
    mkdirSync(R("remaster", w.cat, "outputs"), { recursive: true });
    const out = R("remaster", w.cat, "outputs", id + ".png");
    execFileSync(process.execPath, [R("tools/remaster", green ? "fit-green.mjs" : "fit-ai.mjs"), ai, inp.file, out], { cwd: R("tools/remaster") });
    const e = { category: w.cat, file: id + ".png", swf: w.swf, swfPath: inp.swfPath, sourceFile: w.src, fit: "cover", review: "v45" };
    const i = ap.findIndex((x) => x.file === e.file && x.category === e.category);
    if (i >= 0) ap[i] = { ...ap[i], ...e }; else ap.push(e);
    console.log("ok", id);
  }
  writeFileSync(APPROVED, JSON.stringify(ap, null, 1));
} else console.log("uso: v45-batch-6600.mjs prepare <n> | finish");
