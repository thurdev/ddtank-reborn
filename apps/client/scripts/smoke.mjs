/**
 * Teste de fumaça: abre o cliente num Chromium headless, espera N segundos,
 * mostra os logs do console (erros primeiro) e salva um print.
 *
 *   SMOKE_CHROME=<chrome.exe opcional> node scripts/smoke.mjs "<url>" [segundos] [print.png]
 *
 * Também aceita SMOKE_CLICKS="x,y;x,y" pra clicar em pontos (coordenadas do jogo 1000x600).
 * `key=auto` na URL faz login na API e usa uma chave nova.
 */
import { chromium } from "playwright";

let [url, secs = "20", shot = "smoke.png"] = process.argv.slice(2);
// "key=auto": faz login na API (SMOKE_USER/SMOKE_PASS, padrão pixitest) e usa a chave nova (é de uso único)
if (url.includes("key=auto")) {
  const user = process.env.SMOKE_USER ?? "pixitest", password = process.env.SMOKE_PASS ?? "pixitest123";
  const r = await fetch(process.env.SMOKE_API ?? "http://127.0.0.1:8080/api/auth/login", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: user, password }),
  });
  const key = (await r.json())?.play?.flashvars?.key;
  if (!key) throw new Error(`login falhou (${r.status})`);
  url = url.replace("key=auto", `key=${key}`);
}
const executablePath = process.env.SMOKE_CHROME || undefined;
const browser = await chromium.launch({ executablePath, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
const logs = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.stack ?? e.message}`));
page.on("requestfailed", (r) => logs.push(`[reqfail] ${r.url()} ${r.failure()?.errorText}`));
page.on("response", (r) => { if (r.status() >= 400) logs.push(`[http ${r.status()}] ${r.url()}`); });
const cdp = await page.context().newCDPSession(page);
await cdp.send("Debugger.enable");
// SMOKE_TRACE_URL="<regex>": mostra a pilha JS que pediu cada URL que bate (acha quem faz um 404)
if (process.env.SMOKE_TRACE_URL) {
  const re = new RegExp(process.env.SMOKE_TRACE_URL);
  await cdp.send("Network.enable");
  cdp.on("Network.requestWillBeSent", (e) => {
    if (!re.test(e.request.url)) return;
    const frames = [];
    for (let st = e.initiator?.stack; st && frames.length < 14; st = st.parent) for (const f of st.callFrames) frames.push(`  ${f.functionName || "(anon)"} @ ${f.url.replace(/^.*\/src\//, "src/").replace(/\?.*$/, "")}:${f.lineNumber + 1}`);
    logs.push(`[trace] ${e.request.url} (${e.initiator?.type})\n${frames.slice(0, 14).join("\n")}`);
  });
}
await page.goto(url);
// SMOKE_WAIT_FOR="<expressão JS>": espera até ela ser verdadeira (máx. `secs`); senão espera `secs`
if (process.env.SMOKE_WAIT_FOR) {
  const t0 = Date.now();
  while (Date.now() - t0 < Number(secs) * 1000) {
    const ok = await page.evaluate(`(() => { try { return !!(${process.env.SMOKE_WAIT_FOR}); } catch { return false; } })()`).catch(() => false);
    if (ok) { console.log(`--- condição ok em ${Math.round((Date.now() - t0) / 1000)}s`); break; }
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(3000);
} else {
  await page.waitForTimeout(Number(secs) * 1000);
}
// página travada (loop infinito)? pausa o JS e mostra onde está
const alive = await Promise.race([page.evaluate(() => 1).then(() => true), new Promise((r) => setTimeout(() => r(false), 3000))]);
if (alive) {
  await cdp.send("Performance.enable").catch(() => {});
  const m = await cdp.send("Performance.getMetrics").catch(() => ({ metrics: [] }));
  const get = (n) => Math.round((m.metrics.find((x) => x.name === n)?.value ?? 0) / 1048576);
  console.log(`--- memória JS: ${get("JSHeapUsedSize")} MB usados / ${get("JSHeapTotalSize")} MB`);
}
if (!alive) {
  const paused = new Promise((r) => cdp.once("Debugger.paused", r));
  await cdp.send("Debugger.pause");
  const ev = await Promise.race([paused, new Promise((r) => setTimeout(() => r(null), 5000))]);
  console.log("=== PÁGINA TRAVADA — pilha atual ===");
  for (const f of ev?.callFrames?.slice(0, 15) ?? []) console.log(`  ${f.functionName || "(anon)"} @ ${f.url.replace(/^.*\/src\//, "src/").replace(/\?.*$/, "")}:${f.location.lineNumber + 1}`);
  await cdp.send("Debugger.resume").catch(() => {});
}
for (const pair of (process.env.SMOKE_CLICKS ?? "").split(";").filter(Boolean)) {
  // "wait:10" = espera 10s entre cliques
  if (pair.startsWith("wait:")) { await page.waitForTimeout(Number(pair.slice(5)) * 1000); continue; }
  // "eval:<nome>" = avalia a expressão da variável de ambiente SMOKE_EVAL_<nome> nesse ponto do roteiro
  if (pair.startsWith("eval:")) {
    const expr = process.env[`SMOKE_EVAL_${pair.slice(5)}`] ?? "null";
    try { console.log(`=== eval:${pair.slice(5)} ===\n` + JSON.stringify(await page.evaluate(expr), null, 1)); }
    catch (e) { console.log(`eval:${pair.slice(5)} falhou: ${String(e.message).split("\n")[0]}`); }
    continue;
  }
  // "type:texto" = digita no campo com foco (o <input> real que o TextField abre)
  if (pair.startsWith("type:")) { await page.keyboard.type(pair.slice(5), { delay: 40 }); console.log(`--- digitou ${pair.slice(5)}`); continue; }
  // "shot:a.png" = print no meio do roteiro
  if (pair.startsWith("shot:")) { await page.screenshot({ path: pair.slice(5), timeout: 8000 }).catch(() => {}); console.log(`--- print ${pair.slice(5)}`); continue; }
  // "key:Space:1200" = segura a tecla 1,2s (atirar); "key:ArrowLeft:500" = anda
  if (pair.startsWith("key:")) {
    const [, key, ms = "80"] = pair.split(":");
    await page.keyboard.down(key);
    await page.waitForTimeout(Number(ms));
    await page.keyboard.up(key);
    console.log(`--- tecla ${key} ${ms}ms`);
    continue;
  }
  const [x, y] = pair.split(",").map(Number);
  try {
    // SMOKE_PAUSE_MS: pausa o JS esse tempo depois do clique e mostra a pilha (acha loop que derruba a aba)
    const pauseMs = Number(process.env.SMOKE_PAUSE_MS ?? 0);
    const clickP = page.mouse.click(x, y);
    if (pauseMs) {
      await new Promise((r) => setTimeout(r, pauseMs));
      const paused = new Promise((r) => cdp.once("Debugger.paused", r));
      await cdp.send("Debugger.pause");
      const ev = await Promise.race([paused, new Promise((r) => setTimeout(() => r(null), 5000))]);
      console.log(`=== pilha ${pauseMs}ms depois do clique (${x}, ${y}) ===`);
      for (const f of ev?.callFrames?.slice(0, 25) ?? []) console.log(`  ${f.functionName || "(anon)"} @ ${f.url.replace(/^.*\/src\//, "src/").replace(/\?.*$/, "")}:${f.location.lineNumber + 1}`);
      await cdp.send("Debugger.resume").catch(() => {});
    }
    await clickP;
    console.log(`--- clique (${x}, ${y})`);
    // SMOKE_SAMPLE_S: amostra a pilha a cada 0,4s por N segundos (pega loop que derruba a aba)
    const sampleS = Number(process.env.SMOKE_SAMPLE_S ?? 0);
    let last = "";
    for (let t = 0; t < sampleS * 1000; t += 400) {
      const paused = new Promise((r) => cdp.once("Debugger.paused", r));
      await cdp.send("Debugger.pause");
      const ev = await Promise.race([paused, new Promise((r) => setTimeout(() => r(null), 3000))]);
      const st = (ev?.callFrames ?? []).slice(0, 12).map((f) => `  ${f.functionName || "(anon)"} @ ${f.url.replace(/^.*\/src\//, "src/").replace(/\?.*$/, "")}:${f.location.lineNumber + 1}`).join("\n");
      if (st && st !== last) { console.log(`=== pilha t=${t}ms ===\n${st}`); last = st; }
      await cdp.send("Debugger.resume");
      await new Promise((r) => setTimeout(r, 400));
    }
    await page.waitForTimeout(3000);
  } catch (e) {
    console.log(`--- clique (${x}, ${y}) FALHOU: ${String(e.message).split(/\r?\n/)[0]}`);
    logs.forEach((l) => console.log(l.slice(0, 300)));
    process.exit(1);
  }
}
if (process.env.SMOKE_EVAL && alive) {
  try { console.log("=== SMOKE_EVAL ===\n" + JSON.stringify(await page.evaluate(process.env.SMOKE_EVAL), null, 1)); }
  catch (e) { console.log("SMOKE_EVAL falhou:", e.message); }
}
await page.waitForTimeout(Number(process.env.SMOKE_AFTER ?? 0) * 1000);
const isErr = (l) => /^\[(error|pageerror|reqfail|warning|http)/.test(l);
const errs = logs.filter(isErr);
console.log(`--- ${logs.length} logs, ${errs.length} erros/avisos ---`);
for (const l of errs.slice(0, 80)) console.log(l.slice(0, 700));
console.log("--- últimos logs ---");
for (const l of logs.filter((l) => !isErr(l)).slice(process.env.SMOKE_ALL ? 0 : -40)) console.log(l.replace(/%c/g, "").replace(/ color:#\w+;font-weight:bold ?/g, "").slice(0, 300));
try {
  await page.screenshot({ path: shot, timeout: 8000 });
} catch (e) {
  console.log("print falhou (página travada?):", String(e.message).split("\n")[0]);
}
await browser.close();
