/**
 * Builds every template from a freshly seeded in-memory DB and diffs it against the XML shipped in
 * vendor/DDTank41/Tank.Request (attribute names/order per element + values of rows matched by their first attribute).
 * Usage: pnpm --filter @ddt/api verify-templates [--values]
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { createDb, migrateDb, seedDatabase } from "@ddt/db";
import { REPO_ROOT } from "../src/config.js";
import { TemplateCache } from "../src/templates/cache.js";

process.env.TZ = "UTC";
const VENDOR = join(REPO_ROOT, "vendor", "DDTank41", "Tank.Request");
const showValues = process.argv.includes("--values");

type El = { tag: string; attrs: [string, string][] };
function parse(xml: string): El[] {
  const out: El[] = [];
  for (const m of xml.matchAll(/<([A-Za-z_][\w.]*)((?:\s+[\w.:]+="[^"]*")*)\s*\/?>/g))
    out.push({ tag: m[1]!, attrs: [...m[2]!.matchAll(/([\w.:]+)="([^"]*)"/g)].map((a) => [a[1]!, a[2]!]) });
  return out;
}
const text = (b: Buffer) => {
  try {
    return inflateSync(b).toString("utf8");
  } catch {
    return b.toString("utf8");
  }
};

const h = await createDb("pglite:memory");
await migrateDb(h);
await seedDatabase(h);
const cache = new TemplateCache(h);
await cache.buildAll();
let bad = 0;
for (const f of cache.list()) {
  const snapPath = join(VENDOR, `${f.name}.xml`);
  if (!existsSync(snapPath)) {
    console.log(`?? ${f.name}: no vendor snapshot`);
    continue;
  }
  const snapBuf = readFileSync(snapPath);
  const ours = parse(text(f.body));
  const snap = parse(text(snapBuf));
  const zs = snapBuf[0] === 0x78;
  const issues: string[] = [];
  if (zs !== f.compressed) issues.push(`compression: ours=${f.compressed} snapshot=${zs}`);
  const shapes = (els: El[]) => {
    const m = new Map<string, string>();
    for (const e of els) if (!m.has(e.tag) || e.attrs.length > m.get(e.tag)!.split(",").length) m.set(e.tag, e.attrs.map((a) => a[0]).join(","));
    return m;
  };
  const so = shapes(ours);
  const ss = shapes(snap);
  for (const [tag, a] of ss) {
    const b = so.get(tag);
    if (b === undefined) issues.push(`missing element <${tag}> (${snap.filter((e) => e.tag === tag).length} in snapshot)`);
    else if (a !== b && !(tag === "Result")) issues.push(`<${tag}> attrs differ\n     snap: ${a}\n     ours: ${b}`);
  }
  const counts = (els: El[], tag: string) => els.filter((e) => e.tag === tag).length;
  const main = [...ss.keys()].find((t) => t !== "Result");
  if (main) issues.push(`count <${main}>: ours=${counts(ours, main)} snap=${counts(snap, main)}`);
  if (showValues && main) {
    const key = (e: El) => `${e.tag}:${e.attrs[0]?.[1]}`;
    const om = new Map(ours.map((e) => [key(e), e]));
    let shown = 0;
    for (const e of snap) {
      const o = om.get(key(e));
      if (!o || shown > 3) continue;
      const diffs = e.attrs.filter(([k, v]) => o.attrs.find((x) => x[0] === k)?.[1] !== v).map(([k, v]) => `${k}: snap=${JSON.stringify(v)} ours=${JSON.stringify(o.attrs.find((x) => x[0] === k)?.[1])}`);
      if (diffs.length) {
        issues.push(`  ${key(e)} ${diffs.slice(0, 6).join("; ")}`);
        shown++;
      }
    }
  }
  const real = issues.filter((i) => !i.startsWith("count"));
  if (real.length) bad++;
  console.log(`${real.length ? "XX" : "ok"} ${f.name}${issues.length ? "\n   " + issues.join("\n   ") : ""}`);
}
console.log(`\n${bad} file(s) with shape differences`);
await h.close();
