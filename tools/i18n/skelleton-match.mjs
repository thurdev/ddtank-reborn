// Match every image of our client SWFs (FFDec "-export image" layout <swf>/<chid>[_<linkage>].<ext>) against the
// SkelletonX BR client (same layout), per SWF (trailing digits / leading underscores ignored):
//   named: same linkage name. Size may differ (linkage bitmaps are placed by code; the BR art is often wider).
//   chid:  unnamed bitmap -> the unnamed bitmap of the same size whose 24x24 grey thumbnail is closest (the ids
//          differ between the two builds); accepted when close enough that only the text changed.
// Pixel-identical pairs are dropped. Writes research/i18n/skelleton-map.json.
//   node tools/i18n/skelleton-match.mjs <oursExportDir> <skelExportDir>
import sharp from "../remaster/node_modules/sharp/lib/index.js";
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [OURS, SKEL] = process.argv.slice(2);
const SKEL_REL = "vendor/SkelletonX-DDTank4.1-images";
const base = (s) => s.toLowerCase().replace(/^_+/, "").replace(/\d+$/, "");
const skelSwfs = new Map();
for (const d of readdirSync(SKEL)) { skelSwfs.set(d.toLowerCase(), d); if (!skelSwfs.has(base(d))) skelSwfs.set(base(d), d); }
const split = (f) => { const m = f.match(/^(\d+)(?:_(.+))?\.(png|jpe?g)$/i); return m ? { chid: m[1], name: m[2] ?? null } : null; };
const raw = async (p) => { const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; };
const thumb = async (p) => sharp(p).flatten({ background: "#808080" }).resize(24, 24, { fit: "fill" }).greyscale().raw().toBuffer();
const tdist = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
const out = [];
const stat = { named: 0, namedResized: 0, chid: 0, identical: 0, unmatched: 0 };
for (const swf of readdirSync(OURS)) {
  const sk = skelSwfs.get(swf.toLowerCase()) ?? skelSwfs.get(base(swf));
  if (!sk) continue;
  const mine = readdirSync(join(OURS, swf)).map((f) => ({ f, ...split(f) })).filter((x) => x.chid);
  const theirs = readdirSync(join(SKEL, sk)).map((f) => ({ f, ...split(f) })).filter((x) => x.chid);
  const byName = new Map(theirs.filter((t) => t.name).map((t) => [t.name, t]));
  const unnamed = [];
  for (const t of theirs.filter((t) => !t.name)) { const p = join(SKEL, sk, t.f); const m = await sharp(p).metadata(); unnamed.push({ ...t, p, w: m.width, h: m.height, th: null }); }
  const used = new Set();
  for (const m of mine) {
    const pa = join(OURS, swf, m.f);
    const a = await raw(pa);
    let t = null, kind = null;
    if (m.name) { t = byName.get(m.name); kind = "named"; }
    else {
      const cands = unnamed.filter((u) => u.w === a.w && u.h === a.h && !used.has(u.f));
      if (cands.length) {
        const ta = await thumb(pa);
        let best = null, bd = 1e9;
        for (const c of cands) { c.th ??= await thumb(c.p); const d = tdist(ta, c.th); if (d < bd) { bd = d; best = c; } }
        if (best && bd <= 22) { t = best; kind = "chid"; }
      }
    }
    if (!t) { stat.unmatched++; continue; }
    const pb = join(SKEL, sk, t.f);
    const b = await raw(pb);
    if (a.w === b.w && a.h === b.h) {
      let d = 0; for (let i = 0; i < a.data.length; i++) d += Math.abs(a.data[i] - b.data[i]);
      if (d === 0) { stat.identical++; continue; }
    } else if (kind === "named") stat.namedResized++;
    if (kind === "chid") used.add(t.f);
    stat[kind]++;
    out.push({ swf: `${swf}.swf`, sourceFile: m.f, from: `${SKEL_REL}/${sk}/${t.f}`, kind, resized: a.w !== b.w || a.h !== b.h });
  }
}
writeFileSync("research/i18n/skelleton-map.json", JSON.stringify(out, null, 1));
console.log({ ...stat, replaced: out.length });
