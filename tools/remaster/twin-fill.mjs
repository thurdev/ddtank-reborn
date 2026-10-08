// Unapproved inputs that are near-identical twins (same asset name, e.g. bagandinfo__49_X vs bagandinfo1__48_X, same
// size, mean abs pixel diff < 3) of an approved input: copy the approved output and stage markOk "twin" in
// tools/remaster/_pending-rejects.json. Usage: node tools/remaster/twin-fill.mjs [--dry]
import sharp from "sharp";
import { readFileSync, readdirSync, writeFileSync, existsSync, copyFileSync } from "node:fs";

const dry = process.argv.includes("--dry");
const ap = JSON.parse(readFileSync("remaster/approved.json", "utf8"));
const apIds = new Set(ap.map((e) => e.file.replace(/\.(png|jpe?g)$/i, "")));
const cats = readdirSync("remaster").filter((c) => /^\d\d-/.test(c));
const key = (id) => id.replace(/^_?[a-z0-9]+__\d+_?/i, "");
const inputs = [];
for (const c of cats) for (const f of readdirSync(`remaster/${c}/inputs`)) if (/\.(png|jpe?g)$/i.test(f)) inputs.push({ c, f, id: f.replace(/\.(png|jpe?g)$/i, "") });
const byKey = new Map();
for (const i of inputs) if (apIds.has(i.id) && key(i.id)) { const k = key(i.id); if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(i); }
const raw = async (p) => sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const P = "tools/remaster/_pending-rejects.json";
const pend = existsSync(P) ? JSON.parse(readFileSync(P, "utf8")) : {};
pend.markOk ??= {};
let n = 0;
for (const u of inputs) {
  if (apIds.has(u.id) || !key(u.id)) continue;
  const cands = byKey.get(key(u.id)) ?? [];
  if (!cands.length) continue;
  const a = await raw(`remaster/${u.c}/inputs/${u.f}`);
  for (const t of cands) {
    const out = `remaster/${t.c}/outputs/${t.id}.png`;
    if (!existsSync(out)) continue;
    const b = await raw(`remaster/${t.c}/inputs/${t.f}`);
    if (a.info.width !== b.info.width || a.info.height !== b.info.height) continue;
    let d = 0;
    for (let i = 0; i < a.data.length; i++) d += Math.abs(a.data[i] - b.data[i]);
    if (d / a.data.length >= 3) continue;
    console.log(u.id, "<-", t.id, (d / a.data.length).toFixed(2));
    if (!dry) { copyFileSync(out, `remaster/${u.c}/outputs/${u.id}.png`); pend.markOk[u.id] = "twin"; }
    n++;
    break;
  }
}
if (!dry) writeFileSync(P, JSON.stringify(pend, null, 1));
console.log(n, "twins");
