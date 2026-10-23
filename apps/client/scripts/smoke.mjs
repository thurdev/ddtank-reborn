/**
 * Teste de fumaça: abre o cliente num Chromium headless, espera N segundos,
 * mostra os logs do console (erros primeiro) e salva um print.
 *
 *   SMOKE_CHROME=<chrome.exe opcional> node scripts/smoke.mjs "<url>" [segundos] [print.png]
 *
 * Também aceita SMOKE_CLICKS="x,y;x,y" pra clicar em pontos (coordenadas do jogo 1000x600).
 */
import { chromium } from "playwright";

const [url, secs = "20", shot = "smoke.png"] = process.argv.slice(2);
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
await page.goto(url);
await page.waitForTimeout(Number(secs) * 1000);
// página travada (loop infinito)? pausa o JS e mostra onde está
const alive = await Promise.race([page.evaluate(() => 1).then(() => true), new Promise((r) => setTimeout(() => r(false), 3000))]);
if (!alive) {
  const paused = new Promise((r) => cdp.once("Debugger.paused", r));
  await cdp.send("Debugger.pause");
  const ev = await Promise.race([paused, new Promise((r) => setTimeout(() => r(null), 5000))]);
  console.log("=== PÁGINA TRAVADA — pilha atual ===");
  for (const f of ev?.callFrames?.slice(0, 15) ?? []) console.log(`  ${f.functionName || "(anon)"} @ ${f.url.replace(/^.*\/src\//, "src/").replace(/\?.*$/, "")}:${f.location.lineNumber + 1}`);
  await cdp.send("Debugger.resume").catch(() => {});
}
for (const pair of (process.env.SMOKE_CLICKS ?? "").split(";").filter(Boolean)) {
  const [x, y] = pair.split(",").map(Number);
  await page.mouse.click(x, y);
  await page.waitForTimeout(3000);
}
if (process.env.SMOKE_EVAL && alive) {
  try { console.log("=== SMOKE_EVAL ===\n" + JSON.stringify(await page.evaluate(process.env.SMOKE_EVAL), null, 1)); }
  catch (e) { console.log("SMOKE_EVAL falhou:", e.message); }
}
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
