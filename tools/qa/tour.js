// Playwright MCP helper body (browser_run_code_unsafe). Edit the STEPS block per call.
// Game canvas: the Ruffle player on /play. g(x,y) clicks game coordinates (1000x600 stage space).
async (page) => {
  const ctx = page.context();
  let p = ctx.pages().find((x) => x.url().includes('localhost:5173/play'));
  if (!p) { p = await ctx.newPage(); await p.setViewportSize({ width: 1280, height: 900 }); await p.goto('http://localhost:5173/play'); await p.waitForTimeout(45000); }
  const box = await p.evaluate(() => { const r = document.querySelector('ruffle-player, ruffle-embed, canvas')?.getBoundingClientRect(); return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null; });
  const sx = box.w / 1000, sy = box.h / 600;
  const g = async (x, y, wait = 1500) => { await p.mouse.click(box.x + x * sx, box.y + y * sy); await p.waitForTimeout(wait); };
  const shot = async (name) => { await p.screenshot({ path: `C:/Users/T/Documents/Projects/DDTank/research/i18n/audit/${name}.png`, clip: { x: box.x, y: box.y, width: box.w, height: box.h } }); return name; };
  const esc = async () => { await p.keyboard.press('Escape'); await p.waitForTimeout(800); };
  const out = [];
  // STEPS
  out.push(await shot('00-hall'));
  return { box, out };
}
