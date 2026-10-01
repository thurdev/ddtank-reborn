// Prints the unique request paths (case-folded, query stripped) from a harness log, in first-seen order.
// Usage: node scripts/summarize-requests.ts [logs/requests.jsonl]
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] ?? join(here, "../logs/requests.jsonl");
const seen = new Map<string, { status: number; source: string | null; query: string; count: number }>();
for (const line of readFileSync(file, "utf8").split("\n")) {
  if (!line.trim()) continue;
  const r = JSON.parse(line) as { path: string; status: number; source: string | null; query: string };
  if (/^\/(ruffle|fonts)\//.test(r.path) || r.path === "/favicon.ico") continue;
  const key = r.path.toLowerCase();
  const prev = seen.get(key);
  if (prev) prev.count++;
  else seen.set(key, { status: r.status, source: r.source, query: r.query, count: 1 });
}
for (const [path, v] of seen) {
  console.log(`${v.status}\t${v.count}x\t${path}\t${v.source ?? "MISS"}\t${v.query.slice(0, 120)}`);
}
