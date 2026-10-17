// Lote Seedream 4.5 (tradução de imagem em uma passada) a partir de research/i18n/v45-batch.tsv.
//   prepare <n>  → pega os próximos n ids sem saída, gera uploads (verde se tiver transparência) e
//                  .playwright-mcp/v45-run.js (rodar com browser_run_code_unsafe; devolve "RESULT <id> <hf>")
//   finish       → lê .playwright-mcp/v45-results.txt (linhas "RESULT <id> <hf>"), baixa cada resultado,
//                  ajusta (fit-green/fit-ai) em remaster/<cat>/outputs/<id>.png e marca no approved.json
// Como lê esse código (cada variável): rows linhas do tsv; man manifesto; todo ids sem saída; jobs uploads+prompt;
// CDN endereço das imagens geradas; cat/file categoria e arquivo original do id.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

const ROOT = resolve(import.meta.dirname, "..", "..");
const R = (...p) => join(ROOT, ...p);
const CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_3GTAcG8wB8hMi4zVVUC51azi0GB";
const man = readFileSync(R("remaster/manifest.csv"), "utf8").split(/\r?\n/);
const where = (id) => { const l = man.find((x) => x.split(",")[1]?.replace(/\.(png|jpe?g)$/i, "") === id); if (!l) return null; const [cat, file, swf, src] = l.split(","); return { cat, file, swf, src }; };
const rows = readFileSync(R("research/i18n/v45-batch.tsv"), "utf8").split(/\r?\n/).slice(1).filter(Boolean).map((l) => l.split("\t")[0]);
const cmd = process.argv[2];
mkdirSync(R("remaster/_hd/v45"), { recursive: true });

if (cmd === "prepare") {
  const n = Math.min(8, Number(process.argv[3] ?? 8)); // ~2 min cada; o MCP corta em 30 min
  // faixas finas (só texto, altura < 40 ou muito largas) a IA quebra em 2 linhas e achata → ficam pro render local
  const extraFile = R("research/i18n/v45-local-extra.txt"); // ids que a IA estragou → render local
  const extra = new Set(existsSync(extraFile) ? readFileSync(extraFile, "utf8").split(String.fromCharCode(10)).map((s) => s.trim()).filter(Boolean) : []);
  const thin = (id) => { if (extra.has(id)) return true; const l = man.find((x) => x.split(",")[1]?.replace(/\.(png|jpe?g)$/i, "") === id); const [, , , , w, h] = l.split(","); return +h < 40 || +w / +h > 5; };
  const todo = rows.filter((id) => { const w = where(id); return w && !thin(id) && existsSync(R("tools/remaster/prompts/win45", id + ".txt")) && !existsSync(R("remaster", w.cat, "outputs", id + ".png")); }).slice(0, n);
  writeFileSync(R("research/i18n/v45-thin.txt"), rows.filter((id) => where(id) && thin(id) && !existsSync(R("remaster", where(id).cat, "outputs", id + ".png"))).join(String.fromCharCode(10)) + String.fromCharCode(10));
  const jobs = [];
  for (const id of todo) {
    const w = where(id);
    const inp = R("remaster", w.cat, "inputs", w.file);
    const st = await sharp(inp).stats();
    const alpha = !st.isOpaque;
    const up = R("remaster/_hd/v45", id + (alpha ? ".green.png" : ".up.png"));
    const m = await sharp(inp).metadata();
    const scale = Math.max(1, Math.ceil(1024 / Math.max(m.width, m.height)));
    let s = sharp(inp);
    if (alpha) s = s.flatten({ background: "#00ff00" });
    await s.resize(m.width * scale, m.height * scale, { kernel: "lanczos3" }).png().toFile(up);
    let prompt = readFileSync(R("tools/remaster/prompts/win45", id + ".txt"), "utf8").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
    if (alpha && !/green background/i.test(prompt)) prompt += " Keep the flat pure green background unchanged.";
    jobs.push({ id, upload: up.replace(/\\/g, "/"), prompt });
  }
  // reaproveita o gerador de 1 job e troca por lista
  execFileSync(process.execPath, [R("tools/remaster/make-hf-one.mjs"), jobs[0] ? jobs[0].upload : R("remaster/02-lobby-hall/inputs/hall__12.jpg"), R("tools/remaster/prompts/hall-bg.txt"), R(".playwright-mcp/_one.js"), "seedream_v4_5"], { cwd: ROOT });
  let t = readFileSync(R(".playwright-mcp/_one.js"), "utf8");
  t = t.replace("const N = 1;", () => `const N = ${jobs.length}; const JOBS = ${JSON.stringify(jobs)};`).replace(/const job = \{.*\};/, "const job = JOBS[n];").replace("log.push('RESULT ' + hf + ' ' + url);", "log.push('RESULT ' + job.id + ' ' + hf);");
  writeFileSync(R(".playwright-mcp/v45-run.js"), t);
  console.log(`prepared ${jobs.length}: ${jobs.map((j) => j.id).join(" ")}`);
} else if (cmd === "finish") {
  const lines = readFileSync(R(".playwright-mcp/v45-results.txt"), "utf8").split(/\r?\n/).filter((l) => l.startsWith("RESULT "));
  const ap = JSON.parse(readFileSync(R("remaster/approved.json"), "utf8"));
  for (const l of lines) {
    const [, id, hf] = l.split(" ");
    const w = where(id);
    let res = null;
    for (const ext of ["png", "jpeg"]) { const r = await fetch(`${CDN}/${hf}.${ext}`); if (r.ok) { res = Buffer.from(await r.arrayBuffer()); break; } }
    if (!res) { console.log("download failed", id); continue; }
    const ai = R("remaster/_hd/v45", id + ".ai.png");
    await sharp(res).png().toFile(ai);
    const green = existsSync(R("remaster/_hd/v45", id + ".green.png"));
    const out = R("remaster", w.cat, "outputs", id + ".png");
    execFileSync(process.execPath, [R("tools/remaster", green ? "fit-green.mjs" : "fit-ai.mjs"), ai, R("remaster", w.cat, "inputs", w.file), out], { cwd: R("tools/remaster") });
    const e = { category: w.cat, file: id + ".png", swf: w.swf, sourceFile: w.src, fit: "cover", auto: true, review: "v45" };
    const i = ap.findIndex((x) => x.file === e.file);
    if (i >= 0) ap[i] = { ...ap[i], ...e }; else ap.push(e);
    console.log("ok", id);
  }
  writeFileSync(R("remaster/approved.json"), JSON.stringify(ap, null, 1));
} else console.log("uso: v45-batch.mjs prepare <n> | finish");
