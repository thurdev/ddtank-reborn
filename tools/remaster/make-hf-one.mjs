// Gera um script de UMA geração avulsa no Higgsfield (mesma lógica do hf-loop.js: aba logada, Unlimited ligado,
// guarda de modelo Seedream 5.0 Lite), com imagem e prompt fixos. Devolve a URL do resultado (CDN) em vez de
// mandar pra fila — pra remaster de peças grandes (fundo do lobby etc.) que não passam pelo hf-queue.
// Uso: node tools/remaster/make-hf-one.mjs <imagem> <arquivo-com-prompt> [saida.js]
//      depois: browser_run_code_unsafe com filename = saida.js (padrão .playwright-mcp/hf-one.js)
// Como lê esse código (cada variável): loop texto do hf-loop.js; upload caminho absoluto da imagem; prompt texto
// sem acentos; job objeto embutido no lugar do /next; out arquivo gerado.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [img, promptFile, outArg, model = "seedream_v5_lite"] = process.argv.slice(2);
const upload = resolve(img).replace(/\\/g, "/");
const prompt = readFileSync(promptFile, "utf8").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
let loop = readFileSync("tools/remaster/hf-loop.js", "utf8").replace(/\r\n/g, "\n"); // checkout no Windows pode trazer CRLF
loop = loop.replace("const N = 10;", "const N = 1;");
loop = loop.replace(/const job = await \(await p\.request\.get\(Q \+ '\/next\?engine=' \+ engine\)\)\.json\(\);/,
  () => `const job = ${JSON.stringify({ id: "one", upload, prompt })};`);
loop = loop.replace(/const r = await \(await p\.request\.post\(`\$\{Q\}\/done[^;]*;\s*log\.push\([^;]*;/,
  () => "const url = await p.$$eval('img', (els, id) => (els.map((e) => e.currentSrc || e.src).find((s) => s.includes(id)) || ''), hf); log.push('RESULT ' + hf + ' ' + url);");
loop = loop.replace(/await p\.request\.post\(`\$\{Q\}\/fail[^;]*;/g, "");
if (!loop.includes("RESULT ")) throw new Error("hf-loop.js mudou: não achei o /done pra trocar");
// modelo escolhido: abre a página dele; a guarda só aceita se a URL é do modelo E o Unlimited está ligado (o loop já
// recusa gerar com Unlimited desligado) — nunca gasta crédito.
loop = loop.replace("await p.goto(p.url(), { waitUntil: 'domcontentloaded', timeout: 120000 })", () => "await p.goto('https://higgsfield.ai/ai/image?model=${model}', { waitUntil: 'domcontentloaded', timeout: 120000 })".replace("${model}", model));
loop = loop.replace(/const modelOk = engine === 'gpt'\n[^\n]*\n[^\n]*\n/,() => "const modelOk = p.url().includes('model=" + model + "') && btnTexts.some((t) => /^Unlimited/.test(t));\n");
if (!loop.includes("model=" + model + "')")) throw new Error("não troquei a guarda de modelo");
const out = (outArg && outArg !== "-") ? outArg : ".playwright-mcp/hf-one.js";
writeFileSync(out, loop);
console.log("ok ->", out, "| prompt:", prompt.length, "chars");
