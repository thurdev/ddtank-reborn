// Paste-able body for Playwright MCP browser_run_code_unsafe (the orchestrator reads this file and sends it).
// Processes N jobs from the local queue (tools/remaster/hf-queue.mjs) in the logged-in Higgsfield tab,
// WITHOUT reloading the page (reload resets the Unlimited toggle). Refuses to generate if Unlimited is off.
async (page) => {
  const N = 10;
  const p = page.context().pages().find((x) => x.url().includes('higgsfield'));
  const Q = 'http://127.0.0.1:7788';
  const ids = async () => [...new Set((await p.$$eval('img', (els) => els.map((e) => e.currentSrc || e.src))).filter((s) => s.includes('hf_2026')).map((s) => decodeURIComponent(s).match(/hf_\d+_\d+_[0-9a-f-]+/)?.[0]).filter(Boolean))];
  const thumbs = p.locator('img[alt="object image"]');
  const clearRefs = async () => { let g = 0; while ((await thumbs.count()) > 0 && g++ < 8) { const b = await thumbs.first().boundingBox(); await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.waitForTimeout(350); await p.mouse.click(b.x + b.width - 3, b.y + 1); await p.waitForTimeout(600); } };
  const log = [];
  for (let n = 0; n < N; n++) {
    const job = await (await p.request.get(Q + '/next')).json();
    if (job.done) { log.push('queue empty'); break; }
    try {
      await clearRefs();
      await p.getByRole('button', { name: 'References' }).click(); await p.waitForTimeout(1200);
      await p.locator('input[type=file]').first().setInputFiles(job.upload); await p.waitForTimeout(7000);
      const tile = await p.evaluate(() => { const up = [...document.querySelectorAll('*')].find((e) => e.textContent?.trim() === 'Upload media' && e.children.length < 3); let dlg = up; for (let i = 0; i < 8 && dlg; i++) { dlg = dlg.parentElement; if (dlg.querySelectorAll('img').length > 3) break; } const img = dlg?.querySelector('img'); const r = img?.getBoundingClientRect(); return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null; });
      if (!tile) throw new Error('upload tile not found');
      await p.mouse.click(tile.x, tile.y); await p.waitForTimeout(1500); await p.keyboard.press('Escape'); await p.waitForTimeout(600);
      const nAtt = await thumbs.count(); if (nAtt !== 1) throw new Error('attached refs=' + nAtt);
      const tb = p.locator('textarea, [contenteditable=true], [role=textbox]').last(); await tb.click(); await p.keyboard.press('Control+A'); await p.keyboard.press('Delete'); await p.keyboard.insertText(job.prompt); await p.waitForTimeout(500);
      const sw = p.locator('[role=switch]').last(); const on = (await sw.getAttribute('aria-checked')) !== 'false' && (await sw.getAttribute('data-state')) !== 'unchecked'; if (!on) throw new Error('unlimited is OFF - not generating');
      const before = new Set(await ids());
      await p.getByRole('button', { name: /^Unlimited/ }).last().click();
      let hf = null;
      for (let i = 0; i < 80 && !hf; i++) { await p.waitForTimeout(3000); if (await p.getByText(/^(Processing|Generating|In queue|Queued)/).count()) continue; hf = (await ids()).filter((x) => !before.has(x)).sort().reverse()[0] || null; }
      if (!hf) throw new Error('timeout');
      const r = await (await p.request.post(`${Q}/done?id=${encodeURIComponent(job.id)}&hf=${hf}`)).json();
      log.push(`${job.id}: ${r.ok ? 'ok' : r.error}`);
    } catch (e) { await p.request.post(`${Q}/fail?id=${encodeURIComponent(job.id)}&why=${encodeURIComponent(e.message)}`); log.push(`${job.id}: FAIL ${e.message}`); }
    await p.waitForTimeout(3000 + Math.random() * 3000);
  }
  return log.join('\n');
}
