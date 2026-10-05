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
      // close any lightbox/detail view or dialog left open (it blocks the prompt bar)
      for (let k = 0; k < 4; k++) {
        const overlay = (await p.getByRole('button', { name: /Turn to video|Recreate/ }).count()) || (await p.getByText('Upload media').count());
        if (!overlay) break;
        await p.keyboard.press('Escape'); await p.waitForTimeout(700);
        const close = p.locator('button:has(svg)').filter({ hasText: '' });
        if ((await p.getByRole('button', { name: /Turn to video/ }).count()) && (await close.count())) { const vp = p.viewportSize(); await p.mouse.click(vp.width - 37, 37); await p.waitForTimeout(700); }
      }
      const tb0 = p.locator('textarea, [contenteditable=true], [role=textbox]').last();
      await tb0.click(); await p.keyboard.press('Control+A'); await p.keyboard.press('Delete'); await p.waitForTimeout(500);
      await clearRefs();
      let opened = false;
      for (let tries = 0; tries < 4 && !opened; tries++) {
        await p.waitForTimeout(800 + tries * 700);
        const refBtn = p.getByRole('button', { name: 'References' });
        if (await refBtn.count()) await refBtn.first().click();
        else {
          // with a reference attached the "References" button is replaced by an add-image icon next to the thumbnails
          const box = await p.evaluate(() => { const tb = document.querySelector('textarea, [contenteditable=true]'); let el = tb; for (let i = 0; i < 6 && el; i++) el = el.parentElement; const bs = [...(el?.querySelectorAll('button') ?? [])].filter((b) => !b.textContent.trim()); const r = bs[0]?.getBoundingClientRect(); return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null; });
          if (box) await p.mouse.click(box.x, box.y);
        }
        for (let w = 0; w < 6 && !opened; w++) { await p.waitForTimeout(500); opened = (await p.locator('input[type=file]').count()) > 0 && (await p.getByText('Upload media').count()) > 0; }
        if (!opened) await p.keyboard.press('Escape');
      }
      if (!opened) throw new Error('upload dialog did not open');
      const nImgs = async () => p.evaluate(() => { const up = [...document.querySelectorAll('*')].find((e) => e.textContent?.trim() === 'Upload media' && e.children.length < 3); let dlg = up; for (let i = 0; i < 8 && dlg; i++) { dlg = dlg.parentElement; if (dlg.querySelectorAll('img').length > 3) break; } return dlg ? dlg.querySelectorAll('img').length : 0; });
      const before0 = await nImgs();
      await p.locator('input[type=file]').first().setInputFiles(job.upload);
      for (let w = 0; w < 30; w++) { await p.waitForTimeout(700); if ((await nImgs()) > before0) break; }
      await p.waitForTimeout(1500);
      const tile = await p.evaluate(() => { const up = [...document.querySelectorAll('*')].find((e) => e.textContent?.trim() === 'Upload media' && e.children.length < 3); let dlg = up; for (let i = 0; i < 8 && dlg; i++) { dlg = dlg.parentElement; if (dlg.querySelectorAll('img').length > 3) break; } const img = dlg?.querySelector('img'); const r = img?.getBoundingClientRect(); return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null; });
      if (!tile) throw new Error('upload tile not found');
      await p.mouse.click(tile.x, tile.y); await p.waitForTimeout(1500); await p.keyboard.press('Escape'); await p.waitForTimeout(600);
      const nAtt = await thumbs.count(); if (nAtt !== 1) throw new Error('attached refs=' + nAtt);
      const tb = p.locator('textarea, [contenteditable=true], [role=textbox]').last(); await tb.click(); await p.keyboard.press('Control+A'); await p.keyboard.press('Delete'); await p.keyboard.insertText(job.prompt); await p.waitForTimeout(500);
      const sw = p.locator('[role=switch]').last();
      const isOn = async () => (await sw.getAttribute('aria-checked')) === 'true' || ['on', 'checked'].includes(await sw.getAttribute('data-state'));
      if (!(await isOn())) { await sw.click(); await p.waitForTimeout(1200); }
      if (!(await isOn())) throw new Error('unlimited is OFF and could not be enabled - not generating');
      const before = new Set(await ids());
      const errRe = /(too small|smaller than|minimum|at least \d+|resolution|failed|error|not supported|try again)/i;
      const toastText = () => p.evaluate(() => [...document.querySelectorAll('[data-sonner-toast],[role=alert],[role=status]')].map((e) => e.textContent.trim()).join(' | '));
      const toastsBefore = await toastText();
      await p.getByRole('button', { name: /^Unlimited/ }).last().click();
      const clickedAt = Date.now();
      let hf = null;
      for (let i = 0; i < 80 && !hf; i++) {
        await p.waitForTimeout(3000);
        const t = await toastText();
        if (t !== toastsBefore && errRe.test(t)) throw new Error('higgsfield error: ' + t.slice(0, 160));
        if (await p.getByText(/^(Processing|Generating|In queue|Queued)/).count()) continue;
        // only generations created AFTER the click (old history lazy-loading must never be mistaken for our result)
        const stamp = (x) => { const m = x.match(/hf_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : 0; };
        hf = (await ids()).filter((x) => !before.has(x) && stamp(x) >= clickedAt - 90000).sort().reverse()[0] || null;
      }
      if (!hf) throw new Error('timeout');
      const r = await (await p.request.post(`${Q}/done?id=${encodeURIComponent(job.id)}&hf=${hf}`)).json();
      log.push(`${job.id}: ${r.ok ? 'ok' : r.error}`);
    } catch (e) { await p.request.post(`${Q}/fail?id=${encodeURIComponent(job.id)}&why=${encodeURIComponent(e.message)}`); log.push(`${job.id}: FAIL ${e.message}`); }
    await p.waitForTimeout(3000 + Math.random() * 3000);
  }
  return log.join('\n');
}
