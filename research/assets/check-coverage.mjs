#!/usr/bin/env node
// check-coverage.mjs — how much of what the DDTank 4.1 Flash client requests from {SITE} (resource/) exists
// in one or more resource packs (layered, first pack wins).
//
// Path rules mirror vendor/DDTank41/Source Flash/src/ddt/manager/PathManager.as (solveGoodsPath, solveMapPath,
// solveBlastOut/solveBullet/solveCrater, petsFormPath, solvePetGameAssetUrl, SoundManager "sound/{id}.flv")
// plus server-sent LOAD_RESOURCE paths (Game.AddLoadingFile(2, ...) in the PvE scripts, GameNeedMovieInfo.as).
//
// Usage:
//   node research/assets/check-coverage.mjs [--pack DIR]... [--templates DIR]... [--missing OUT.txt] [--json OUT.json] [--magic]
// Defaults: packs = vendor/_assets/merged (if present) else gun_mobile + gunny30; templates = vendor/_dbexport (if present)
// + the XML snapshots found in the vendor repos. XML may be plain or zlib-compressed (Tank.Request cache format).
// Matching is case-insensitive (IIS is), case-only hits are reported separately (they 404 on a case-sensitive server).
// --magic also reads the first bytes of each hit to count PNGs carrying the 5-byte "\0\x03^_^" obfuscation prefix,
// which the 4.1 client cannot decode (strip it, see build-pack.mjs).

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const V = (...p) => path.join(ROOT, 'vendor', ...p);

// ---------- args ----------
const args = process.argv.slice(2);
const opt = { packs: [], templates: [], missing: null, json: null, magic: false };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--pack') opt.packs.push(path.resolve(args[++i]));
  else if (a === '--templates') opt.templates.push(path.resolve(args[++i]));
  else if (a === '--missing') opt.missing = path.resolve(args[++i]);
  else if (a === '--json') opt.json = path.resolve(args[++i]);
  else if (a === '--magic') opt.magic = true;
  else if (a === '-h' || a === '--help') { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 16).join('\n')); process.exit(0); }
}
if (!opt.packs.length) {
  const merged = V('_assets', 'merged');
  opt.packs = fs.existsSync(merged) ? [merged]
    : [V('_assets', 'gun_mobile', 'extracted', 'Resource'), V('_assets', 'gunny30', 'inetpub', 'wwwroot', 'Resource')].filter(fs.existsSync);
}

// ---------- template sources ----------
const DEFAULT_SOURCES = {
  items: [V('DDTank41/GameAdmin/Backup/XMLReader/XMLImport/TemplateAlllist.xml'), V('DDTank4.1/Request/TemplateAlllist.xml')],
  maps: [V('DDTank41/GameAdmin/Backup/XMLReader/XMLImport/LoadMapsItems.xml'), V('DDTank4.1/Request/LoadMapsItems_out.xml')],
  npcs: [V('DDTank41/GameAdmin/Backup/XMLReader/XMLImport/NPCInfoList.xml'), V('DDTank4.1/Request/NPCInfoList_out.xml')],
  balls: [V('DDTank41/GameAdmin/Backup/XMLReader/XMLImport/BallList.xml'), V('DDTank4.1/Request/BallList.xml')],
  pets: [V('DDTank4.1/Request/pettemplateinfo.xml')],
};
const NAME_RE = { items: /templatealllist/i, maps: /loadmapsitems/i, npcs: /npcinfolist/i, balls: /balllist/i, pets: /pettemplateinfo/i };
const tplDirs = opt.templates.length ? opt.templates : [V('_dbexport')].filter(fs.existsSync);
const sources = structuredClone(DEFAULT_SOURCES);
for (const d of tplDirs) for (const f of walk(d)) for (const [k, re] of Object.entries(NAME_RE))
  if (re.test(path.basename(f)) && /\.xml$/i.test(f)) sources[k].unshift(f); // dbexport first

function walk(dir) {
  const out = [];
  const st = [dir];
  while (st.length) {
    const d = st.pop();
    let ents; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of ents) { const p = path.join(d, e.name); e.isDirectory() ? st.push(p) : out.push(p); }
  }
  return out;
}
function readXml(f) {
  if (!fs.existsSync(f)) return null;
  const buf = fs.readFileSync(f);
  if (buf[0] === 0x78) { try { return zlib.inflateSync(buf).toString('utf8'); } catch { /* fallthrough */ } }
  return buf.toString('utf8');
}
// returns array of attribute maps for <Item .../> or <item .../> elements
function parseItems(xml) {
  const rows = [];
  for (const m of xml.matchAll(/<(?:Item|item)\s([^>]*?)\/?>/g)) {
    const o = {};
    for (const a of m[1].matchAll(/(\w+)="([^"]*)"/g)) o[a[1]] = a[2];
    rows.push(o);
  }
  return rows;
}
function load(kind, key) {
  const seen = new Map(); const used = [];
  for (const f of sources[kind]) {
    const x = readXml(f); if (!x) continue;
    const rows = parseItems(x); if (!rows.length) continue;
    used.push(`${path.relative(ROOT, f)} (${rows.length})`);
    for (const r of rows) { const k = r[key]; if (k != null && !seen.has(k)) seen.set(k, r); }
  }
  return { rows: [...seen.values()], used };
}

// ---------- expected path generation (relative to SITE) ----------
const TYPES = ['', 'head', 'glass', 'hair', 'eff', 'cloth', 'face', 'arm', 'armlet', 'ring', '', '', '', 'suits', 'necklace', 'wing', 'chatBall', '', '', '', '', '', '', '', '', '', '', '', 'armlet', 'ring'];
const need = new Map(); // path -> {cat, tier}
const add = (p, cat, tier = 'core') => { p = p.replace(/\/+/g, '/'); if (!need.has(p)) need.set(p, { cat, tier }); };

function itemPaths(it) {
  const c = Number(it.CategoryID), pic = it.Pic;
  if (!pic) return;
  const sex = it.NeedSex === '1' ? 'm' : 'f'; // PathManager: param3 = NeedSex == 1
  const I = `image/`;
  if (c === 7 || c === 27) { // ARM / TEMPWEAPON
    add(`${I}arm/${pic}/1/icon.png`, 'item:arm');
    add(`${I}arm/${pic}/1/0/show.png`, 'item:arm');
    add(`${I}arm/${pic}/1/1/game.png`, 'item:arm', 'extra');
    add(`${I}arm/${pic}/00.png`, 'item:arm', 'extra');
    return;
  }
  if (c === 11 || c === 20 || c === 23 || c === 30 || c === 40 || c === 34 || c === 35) return add(`${I}unfrightprop/${pic}/icon.png`, 'item:prop');
  if (c === 12) return add(`${I}task/${pic}/icon.png`, 'item:prop');
  if (c === 16) return add(`${I}specialprop/chatBall/${pic}/icon.png`, 'item:prop');
  if (c < 10 || c === 13 || c === 14 || c === 28 || c === 29) {
    const t = TYPES[c];
    if ([8, 9, 14, 28, 29].includes(c)) return add(`${I}equip/${t}/${pic}/icon.png`, 'item:jewel');
    const hair = c === 3 ? '/B' : ''; // _hairType "A"/"B"; client asks lowercase "b" in boot evidence
    add(`${I}equip/${sex}/${t}/${pic}/icon_1.png`, `item:equip`);
    add(`${I}equip/${sex}/${t}/${pic}/1${hair}/show.png`, `item:equip`);
    add(`${I}equip/${sex}/${t}/${pic}/1${hair}/game.png`, `item:equip`, 'extra');
    return;
  }
  if (c === 15) { add(`${I}equip/wing/${pic}/icon.png`, 'item:wing'); add(`${I}equip/wing/${pic}/wings.swf`, 'item:wing'); return; }
  if (c === 17 || c === 31) return add(`${I}equip/offhand/${pic}/icon.png`, 'item:prop');
  if (c === 25) return add(`${I}gift/${pic}/icon.png`, 'item:prop');
  if (c === 26) return add(`${I}card/${pic}/icon.jpg`, 'item:prop');
  if (c === 18) return add(`${I}cardbox/${pic}/icon.png`, 'item:prop');
  if (c === 19) return add(`${I}equip/recover/${pic}/icon.png`, 'item:prop');
  if (c === 32 || c === 36) return add(`${I}farm/Crops/${pic}/seed.png`, 'item:prop');
  if (c === 33) return add(`${I}farm/Fertilizer/${pic}/icon.png`, 'item:prop');
  if (c === 50) return add(`${I}petequip/arm/${pic}/icon.png`, 'item:prop');
  if (c === 51) return add(`${I}petequip/hat/${pic}/icon.png`, 'item:prop');
  if (c === 52) return add(`${I}petequip/cloth/${pic}/icon.png`, 'item:prop');
  return add(`${I}prop/${pic}/icon.png`, 'item:prop');
}

// fixed boot-time requests (research/client/evidence/boot-requests.tsv) + default avatar layers
add('flash/characterdefine.xml', 'boot');
for (const s of ['m', 'f']) {
  for (const [t, n] of [['head', 2], ['glass', 2], ['eff', 2], ['face', 3], ['cloth', 3]]) for (let i = 1; i <= n; i++) add(`image/equip/${s}/${t}/default/${i}/show.png`, 'boot');
  for (let i = 1; i <= 2; i++) add(`image/equip/${s}/hair/default/${i}/B/show.png`, 'boot');
  add(`image/equip/${s}/suits/default/1/show.png`, 'boot');
}
add('image/equip/wing/default/wings.swf', 'boot');
add('image/map/0/icon.png', 'boot');

const items = load('items', 'TemplateID'); items.rows.forEach(itemPaths);
const maps = load('maps', 'ID');
for (const m of maps.rows) {
  const d = `image/map/${m.ID}/`;
  if (m.BackPic) add(`${d}${m.BackPic}.jpg`, 'map');
  if (m.ForePic) add(`${d}${m.ForePic}.png`, 'map');
  if (m.DeadPic) add(`${d}${m.DeadPic}.png`, 'map');
  add(`${d}icon.png`, 'map', 'extra');
  add(`${d}samll_map.png`, 'map', 'extra');
  if (m.BackMusic) add(`sound/${m.BackMusic}.flv`, 'sound');
}
const npcs = load('npcs', 'ID');
for (const n of npcs.rows) if (n.ResourcesPath && !/^https?:/.test(n.ResourcesPath)) add(n.ResourcesPath, 'npc');
const balls = load('balls', 'ID');
for (const b of balls.rows) {
  add(`image/bomb/blastOut/blastOut${b.ID}.swf`, 'bomb', 'extra'); // only when not already in FLASHSITE bombs/*.swf
  if (b.BombPartical) add(`image/bomb/bullet/bullet${b.BombPartical}.swf`, 'bomb', 'extra');
  if (b.Crater && b.Crater !== '0') { add(`image/bomb/crater/${b.Crater}/crater.png`, 'bomb'); add(`image/bomb/crater/${b.Crater}/craterBrink.png`, 'bomb'); }
}
const pets = load('pets', 'TemplateID');
for (const p of pets.rows) {
  if (p.Pic) add(`image/pet/${p.Pic}/icon1.png`, 'pet');
  if (p.GameAssetUrl) add(`image/gameasset/${p.GameAssetUrl}.swf`, 'pet');
}
// MUSIC_LIST from the client config
try {
  const cfg = fs.readFileSync(V('DDTank41/Source Flash/FlashSV1/config.xml'), 'utf8');
  const ml = cfg.match(/<MUSIC_LIST value="([^"]*)"/);
  if (ml) for (const id of ml[1].split(',')) add(`sound/${id.trim()}.flv`, 'sound');
} catch { /* optional */ }
// server-sent LOAD_RESOURCE (type 2 = relative to SITE)
const scriptRoots = [V('DDTank4.1/Source Server/Game.Server.Scripts'), V('DDTank41/Game.Logic'), V('DDTank41/Game.Server')];
for (const r of scriptRoots) for (const f of walk(r)) if (f.endsWith('.cs')) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/AddLoadingFile\(\s*2\s*,\s*"([^"]+)"/g)) if (m[1].startsWith('image/')) add(m[1], 'server-load');
}

// ---------- index packs ----------
const index = new Map(); // lower -> {real, pack}
for (const p of opt.packs) for (const f of walk(p)) {
  const rel = path.relative(p, f).split(path.sep).join('/');
  const k = rel.toLowerCase();
  if (!index.has(k)) index.set(k, { real: rel, pack: p });
}

// ---------- compare ----------
const stats = {}; const missing = []; let caseOnly = 0, obf = 0;
for (const [p, { cat, tier }] of need) {
  const s = (stats[`${cat} [${tier}]`] ??= { need: 0, have: 0, caseOnly: 0 });
  s.need++;
  const hit = index.get(p.toLowerCase());
  if (!hit) { missing.push(`${cat}\t${tier}\t${p}`); continue; }
  s.have++;
  if (hit.real !== p) { s.caseOnly++; caseOnly++; }
  if (opt.magic && /\.png$/i.test(p)) {
    const fd = fs.openSync(path.join(hit.pack, hit.real), 'r'); const b = Buffer.alloc(5); fs.readSync(fd, b, 0, 5, 0); fs.closeSync(fd);
    if (b[0] === 0 && b[1] === 3 && b[2] === 0x5e) obf++;
  }
}
const pct = (a, b) => (b ? ((100 * a) / b).toFixed(1) : '-') + '%';
console.log('Packs:', opt.packs.map((p) => path.relative(ROOT, p)).join(' + '));
for (const [k, v] of Object.entries({ items, maps, npcs, balls, pets })) console.log(`Templates ${k}: ${v.rows.length} rows from ${v.used.join(', ') || 'NONE'}`);
console.log(`Pack files indexed: ${index.size}\n`);
console.log('category [tier]'.padEnd(26), 'need'.padStart(6), 'have'.padStart(6), 'cover'.padStart(7), 'caseOnly'.padStart(9));
let tn = 0, th = 0, cn = 0, ch = 0;
for (const [k, v] of Object.entries(stats).sort()) {
  console.log(k.padEnd(26), String(v.need).padStart(6), String(v.have).padStart(6), pct(v.have, v.need).padStart(7), String(v.caseOnly).padStart(9));
  tn += v.need; th += v.have; if (k.includes('[core]')) { cn += v.need; ch += v.have; }
}
console.log(`\nCORE: ${ch}/${cn} = ${pct(ch, cn)}   ALL: ${th}/${tn} = ${pct(th, tn)}   case-only hits: ${caseOnly}` + (opt.magic ? `   obfuscated PNG hits: ${obf}` : ''));
if (opt.missing) { fs.writeFileSync(opt.missing, missing.sort().join('\n') + '\n'); console.log('missing list ->', opt.missing); }
if (opt.json) fs.writeFileSync(opt.json, JSON.stringify({ packs: opt.packs, stats, core: [ch, cn], all: [th, tn], caseOnly, obf }, null, 2));
