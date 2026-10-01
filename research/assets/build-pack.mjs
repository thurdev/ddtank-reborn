#!/usr/bin/env node
// build-pack.mjs — merge the downloaded resource packs into one servable tree vendor/_assets/merged/
// (= what the client's SITE / "resource/" URL must point at).
//
//  * Layer order (first wins): gunny30 (3.0, art format proven with 4.1-era clients) -> gun_mobile extracted
//    (newer CN-trad dump, much larger) -> gun_mobile equip_arm_bundle. Override with --pack DIR (repeatable).
//  * Map layers (image/map/<id>/<ForePic|DeadPic>.png): pick the candidate whose PNG size equals the
//    ForegroundWidth/Height of the DDTank41 LoadMapsItems template (the server's .map collision data is sized
//    from the same template, so a mismatched picture would desync terrain).
//  * Strips the 5-byte "\0\x03^_^" obfuscation prefix some later-version PNGs carry (4.1 client can't read it).
//  * Files are hard-linked when unchanged (no extra disk), copied when rewritten. Skips Thumbs.db/__MACOSX/._*.
//  * Adds flash/characterdefine.xml (+ characterDefine.xml) from FlashSV1 and a permissive crossdomain.xml.
//  * Writes merged/_manifest.tsv (path, source pack, action).
// Usage: node research/assets/build-pack.mjs [--pack DIR]... [--out DIR] [--lowercase]
//   --lowercase also writes every path in lower case (for case-sensitive static hosts; the client mixes case,
//   e.g. requests hair/default/1/b/show.png while packs have .../1/B/...). Prefer a case-insensitive server instead.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const A = (...p) => path.join(ROOT, 'vendor', '_assets', ...p);
const args = process.argv.slice(2);
let packs = []; let out = A('merged'); let lower = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--pack') packs.push(path.resolve(args[++i]));
  else if (args[i] === '--out') out = path.resolve(args[++i]);
  else if (args[i] === '--lowercase') lower = true;
}
if (!packs.length) packs = [A('gunny30/inetpub/wwwroot/Resource'), A('gun_mobile/extracted/Resource'), A('gun_mobile/bundle/Resource')];
packs = packs.filter(fs.existsSync);

const SKIP = /(^|\/)(__MACOSX|Thumbs\.db|\._[^/]*|\.DS_Store|web\.config|index\.php)$|(^|\/)__MACOSX\//i;
function walk(dir) {
  const res = []; const st = [dir];
  while (st.length) {
    const d = st.pop();
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== '__MACOSX') st.push(p); } else res.push(p);
    }
  }
  return res;
}
function pngSize(f) {
  const fd = fs.openSync(f, 'r'); const b = Buffer.alloc(40); fs.readSync(fd, b, 0, 40, 0); fs.closeSync(fd);
  let o = b.indexOf(Buffer.from('IHDR')); if (o < 0) return null;
  return [b.readUInt32BE(o + 4), b.readUInt32BE(o + 8)];
}
function hasObf(f) {
  const fd = fs.openSync(f, 'r'); const b = Buffer.alloc(5); fs.readSync(fd, b, 0, 5, 0); fs.closeSync(fd);
  return b[0] === 0 && b[1] === 3 && b[2] === 0x5e && b[3] === 0x5f && b[4] === 0x5e;
}

// map template sizes
const mapSize = new Map();
for (const f of [path.join(ROOT, 'vendor/DDTank41/GameAdmin/Backup/XMLReader/XMLImport/LoadMapsItems.xml')]) {
  if (!fs.existsSync(f)) continue;
  for (const m of fs.readFileSync(f, 'utf8').matchAll(/<Item\s([^>]*)\/>/g)) {
    const o = Object.fromEntries([...m[1].matchAll(/(\w+)="([^"]*)"/g)].map((x) => [x[1], x[2]]));
    mapSize.set(o.ID, { w: +o.ForegroundWidth, h: +o.ForegroundHeight, fore: o.ForePic, dead: o.DeadPic });
  }
}

// collect candidates: lower-case key -> [{pack, rel, abs}]
const cand = new Map();
for (const p of packs) for (const abs of walk(p)) {
  const rel = path.relative(p, abs).split(path.sep).join('/');
  if (SKIP.test(rel)) continue;
  const k = rel.toLowerCase();
  (cand.get(k) ?? cand.set(k, []).get(k)).push({ pack: p, rel, abs });
}

fs.rmSync(out, { recursive: true, force: true });
const manifest = []; let linked = 0, copied = 0, stripped = 0, mapPicked = 0, mapMismatch = 0;
for (const [k, list] of cand) {
  let pick = list[0];
  const mm = k.match(/^image\/map\/(\d+)\/([^/]+)\.png$/);
  if (mm && mapSize.has(mm[1])) {
    const t = mapSize.get(mm[1]);
    const layer = mm[2];
    if ([t.fore, t.dead].map((x) => (x || '').toLowerCase()).includes(layer)) {
      const ok = list.find((c) => { const s = pngSize(c.abs); return s && s[0] === t.w && s[1] === t.h; });
      if (ok) { if (ok !== pick) mapPicked++; pick = ok; } else mapMismatch++;
    }
  }
  const relOut = lower ? k : pick.rel;
  const dst = path.join(out, relOut);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  let action = 'link';
  if (/\.png$/i.test(k) && hasObf(pick.abs)) {
    fs.writeFileSync(dst, fs.readFileSync(pick.abs).subarray(5)); action = 'strip'; stripped++;
  } else {
    try { fs.linkSync(pick.abs, dst); linked++; } catch { fs.copyFileSync(pick.abs, dst); action = 'copy'; copied++; }
  }
  manifest.push(`${relOut}\t${path.relative(ROOT, pick.pack)}\t${action}`);
}
// client boot files
const fsv = path.join(ROOT, 'vendor/DDTank41/Source Flash/FlashSV1');
fs.mkdirSync(path.join(out, 'flash'), { recursive: true });
for (const n of ['characterdefine.xml', 'characterDefine.xml']) fs.copyFileSync(path.join(fsv, 'characterdefine.xml'), path.join(out, 'flash', n));
fs.writeFileSync(path.join(out, 'crossdomain.xml'), '<?xml version="1.0"?>\n<cross-domain-policy>\n  <allow-access-from domain="*" to-ports="*"/>\n</cross-domain-policy>\n');
fs.writeFileSync(path.join(out, '_manifest.tsv'), manifest.sort().join('\n') + '\n');
console.log(`packs: ${packs.map((p) => path.relative(ROOT, p)).join(' > ')}`);
console.log(`files: ${manifest.length} (linked ${linked}, copied ${copied}, de-obfuscated ${stripped}); map layers re-picked by size ${mapPicked}, no size match ${mapMismatch}`);
console.log(`out: ${out}`);
