// Applies tools/remaster/_pending-rejects.json while the queue server is STOPPED:
// reject -> outputs moved to _auto/rejected/round1 + state entry dropped; specs -> merged; markOk -> state ok.
import { readFileSync, writeFileSync, existsSync, renameSync, readdirSync, mkdirSync, unlinkSync } from "node:fs";
const P = "tools/remaster/_pending-rejects.json";
if (!existsSync(P)) { console.log("nothing pending"); process.exit(0); }
const p = JSON.parse(readFileSync(P, "utf8"));
const st = JSON.parse(readFileSync("remaster/_auto/state.json", "utf8"));
const sp = JSON.parse(readFileSync("remaster/_auto/specs.json", "utf8"));
const cats = readdirSync("remaster").filter((c) => /^\d\d-/.test(c));
const rej = "remaster/_auto/rejected/round1";
mkdirSync(rej, { recursive: true });
for (const id of p.reject ?? []) {
  for (const c of cats) for (const [sub, suf] of [["outputs", ""], ["outputs", ".best"], ["outputs-hd", ""]]) {
    const f = `remaster/${c}/${sub}/${id}${suf}.png`;
    if (existsSync(f)) renameSync(f, `${rej}/${id}${suf}.${sub}.${Date.now()}.png`);
  }
  delete st.jobs[id];
}
for (const id of p.cropRetry ?? []) { const f = `remaster/_auto/crops-out/${id}.png`; if (existsSync(f)) renameSync(f, `${rej}/${id}.${Date.now()}.png`); delete st.jobs[id]; }
for (const [k, v] of Object.entries(p.specs ?? {})) sp[k] = { ...(sp[k] ?? {}), ...v };
for (const [k, m] of Object.entries(p.markOk ?? {})) { st.jobs[k] = { ...(st.jobs[k] ?? {}), ok: true, busy: false, fails: 0, uiFails: 0, method: m, manual: true, at: Date.now() }; delete st.jobs[k].why; }
writeFileSync("remaster/_auto/specs.json", JSON.stringify(sp, null, 1));
writeFileSync("remaster/_auto/state.json.tmp", JSON.stringify(st));
renameSync("remaster/_auto/state.json.tmp", "remaster/_auto/state.json");
unlinkSync(P);
console.log(`applied: ${p.reject?.length ?? 0} rejects, ${Object.keys(p.specs ?? {}).length} specs, ${Object.keys(p.markOk ?? {}).length} ok`);
