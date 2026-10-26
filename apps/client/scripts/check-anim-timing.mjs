/**
 * Checagem automática (repetível, sem olho humano) de que o cliente roda a
 * LÓGICA (timeline/ENTER_FRAME) na taxa certa do SWF — independente da taxa
 * de desenho (60+ fps). Mede:
 *
 *   1. fps de lógica global (`Player.logicFrames`, exposto em `ddtDebug.logicFrames`
 *      com `?debug=true`) contra `stage.frameRate` (25 no DDTank) — pega
 *      qualquer regressão no acumulador de passo fixo do loop (`player.ts`).
 *   2. pra alguns clipes tocando de verdade na tela (achados varrendo a
 *      display list, sem precisar saber o nome deles), o avanço de
 *      `currentFrame` num intervalo real — compara com o esperado
 *      (intervalo × frameRate), só quando o clipe não dá pra ter dado uma
 *      volta completa no meio (loop curto não permite medir sem perder a
 *      conta de quantas voltas deu).
 *
 * Uso:
 *   cd apps/client
 *   node scripts/check-anim-timing.mjs "http://localhost:5181/?user=pixitest&key=auto&debug=true" 3000
 *
 * Saída: imprime o relatório e sai com código 1 se o fps de lógica medido
 * fugir de `stage.frameRate` (tolerância abaixo) ou nenhum clipe tocando for
 * encontrado (sinal de boot incompleto).
 */
import { chromium } from "playwright";

const [urlArg, durationArg = "3000"] = process.argv.slice(2);
if (!urlArg) throw new Error("uso: node check-anim-timing.mjs <url> [duracaoMs]");
let url = urlArg;
const durationMs = Number(durationArg);

// mesmo truque do smoke.mjs: key=auto loga na API e usa uma chave nova
if (url.includes("key=auto")) {
  const user = process.env.SMOKE_USER ?? "pixitest", password = process.env.SMOKE_PASS ?? "pixitest123";
  const r = await fetch(process.env.SMOKE_API ?? "http://127.0.0.1:8080/api/auth/login", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: user, password }),
  });
  const key = (await r.json())?.play?.flashvars?.key;
  if (!key) throw new Error(`login falhou (${r.status})`);
  url = url.replace("key=auto", `key=${key}`);
}
if (!/\bdebug=(true|1)\b/.test(url)) throw new Error("a URL precisa de ?debug=true (ddtDebug.logicFrames só existe em modo debug)");

const executablePath = process.env.SMOKE_CHROME || undefined;
const browser = await chromium.launch({ executablePath, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
const logs = [];
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.stack ?? e.message}`));

await page.goto(url);
// espera o boot: ddtDebug existe e já tem frameRate/logicFrames numéricos
const t0wait = Date.now();
while (Date.now() - t0wait < 30000) {
  const ok = await page.evaluate(() => !!(window.ddtDebug && typeof window.ddtDebug.frameRate === "number" && typeof window.ddtDebug.logicFrames === "number")).catch(() => false);
  if (ok) break;
  await page.waitForTimeout(500);
}
// espera mais um pouco pra entrar numa tela com animação de verdade (hall/loading)
await page.waitForTimeout(2000);

const result = await page.evaluate(async (durationMs) => {
  function walk(o, path, out, depth) {
    out.push({ obj: o, path });
    if (depth > 10) return; // evita recursão patológica
    const n = typeof o.numChildren === "number" ? o.numChildren : 0;
    for (let i = 0; i < n; i++) {
      try {
        const c = o.getChildAt(i);
        if (c) walk(c, `${path}/${c.name || `#${i}`}`, out, depth + 1);
      } catch { /* buraco no container, ex. HallIconBox — ignora, mesma regra do ddtDebug.find */ }
    }
  }
  const all = [];
  walk(window.ddtDebug.stage, "stage", all, 0);
  const candidates = all
    .filter((e) => e.obj && e.obj.isPlaying === true && typeof e.obj.totalFrames === "number" && e.obj.totalFrames > 1)
    .slice(0, 20);

  const frameRate = window.ddtDebug.frameRate;
  const before = candidates.map((e) => e.obj.currentFrame);
  const logic0 = window.ddtDebug.logicFrames;
  const t0 = performance.now();
  await new Promise((r) => setTimeout(r, durationMs));
  const t1 = performance.now();
  const logic1 = window.ddtDebug.logicFrames;
  const elapsedS = (t1 - t0) / 1000;

  const clips = candidates.map((e, i) => {
    const o = e.obj;
    const total = o.totalFrames;
    const expectedTicks = elapsedS * frameRate;
    // só compara contagem exata quando não dá pra ter voltado (loop curto some depois de 1 volta)
    const measurable = total > expectedTicks * 1.2;
    let after;
    try { after = o.currentFrame; } catch { after = null; }
    let delta = after === null ? null : after - before[i];
    if (delta !== null && delta < 0) delta += total; // 1 volta de loop
    return { path: e.path, total, before: before[i], after, delta, measurable, expectedTicks };
  });

  return {
    frameRate,
    logicFramesAdvanced: logic1 - logic0,
    elapsedS,
    logicFps: (logic1 - logic0) / elapsedS,
    candidateCount: candidates.length,
    clips,
  };
}, durationMs);

await browser.close();

console.log(`--- fps de lógica: ${result.logicFps.toFixed(2)} (esperado stage.frameRate=${result.frameRate}, ${result.logicFramesAdvanced} frames em ${result.elapsedS.toFixed(2)}s)`);
console.log(`--- clipes tocando encontrados: ${result.candidateCount}`);
for (const c of result.clips) {
  const tag = c.measurable ? (Math.abs(c.delta - c.expectedTicks) <= Math.max(2, c.expectedTicks * 0.15) ? "ok" : "FORA DA TAXA") : "loop curto (não medível)";
  console.log(`    ${c.path}  frame ${c.before}→${c.after}/${c.total}  delta=${c.delta}  esperado~${c.expectedTicks.toFixed(1)}  [${tag}]`);
}
if (logs.length) { console.log("--- erros de página:"); for (const l of logs) console.log(l); }

const tolerance = result.frameRate * 0.15; // 15%: headless/CI pode atrasar um pouco, mas não deve fugir muito
const fpsOk = Math.abs(result.logicFps - result.frameRate) <= tolerance;
const measurableClips = result.clips.filter((c) => c.measurable);
const clipsOk = measurableClips.every((c) => Math.abs(c.delta - c.expectedTicks) <= Math.max(2, c.expectedTicks * 0.15));

if (!fpsOk) console.error(`FALHOU: fps de lógica ${result.logicFps.toFixed(2)} longe de ${result.frameRate} (tolerância ${tolerance.toFixed(1)})`);
if (result.candidateCount === 0) console.error("FALHOU: nenhum clipe tocando encontrado (boot incompleto ou tela sem animação?)");
if (!clipsOk) console.error("FALHOU: pelo menos um clipe mensurável avançou fora da taxa esperada");
if (logs.length) console.error(`FALHOU: erro(s) de página durante a medição`);

process.exit(fpsOk && result.candidateCount > 0 && clipsOk && logs.length === 0 ? 0 : 1);
