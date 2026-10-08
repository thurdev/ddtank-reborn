// Pending jobs whose input is pixel-identical to an input whose job is already ok: copy that output and stage a
// markOk "twin" in tools/remaster/_pending-rejects.json (applied by restart-queue.sh). Run between loop batches.
//   node tools/remaster/dedupe-pending.mjs
import sharp from "sharp";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";

const st = JSON.parse(readFileSync("remaster/_auto/state.json", "utf8")).jobs;
const man = readFileSync("remaster/manifest.csv", "utf8").trim().split("\n").slice(1).map((l) => { const [c, f] = l.split(","); return { c, f, id: f.replace(/\.(png|jpe?g)$/i, "") }; });
const hashOf = async (p) => { const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return createHash("sha1").update(`${info.width}x${info.height}`).update(data).digest("hex"); };
const done = new Map();
const pend = [];
for (const m of man) {
  const inp = `remaster/${m.c}/inputs/${m.f}`, out = `remaster/${m.c}/outputs/${m.id}.png`;
  if (!existsSync(inp)) continue;
  const j = st[m.id];
  if (j?.ok && existsSync(out)) done.set(await hashOf(inp), out);
  else if (!j?.ok) pend.push({ ...m, inp, out });
}
const P = "tools/remaster/_pending-rejects.json";
const p = existsSync(P) ? JSON.parse(readFileSync(P, "utf8")) : {};
p.markOk ??= {};
let n = 0;
for (const m of pend) {
  const src = done.get(await hashOf(m.inp));
  if (!src) continue;
  copyFileSync(src, m.out); p.markOk[m.id] = "twin"; n++;
  console.log(m.id, "<-", src);
}
writeFileSync(P, JSON.stringify(p, null, 1));
console.log(n, "twins staged of", pend.length, "pending");
