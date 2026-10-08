// Review sheet of the N most recently finished queue jobs (AI outputs, not manual marks):
//   node tools/remaster/recent-sheet.mjs <out.png> [N=10] [skip=0]
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const [out, n = "10", skip = "0"] = process.argv.slice(2);
const st = JSON.parse(readFileSync("remaster/_auto/state.json", "utf8")).jobs;
const ids = Object.entries(st).filter(([, v]) => v.ok && !v.manual && v.at).sort((a, b) => b[1].at - a[1].at).slice(+skip, +skip + +n).map(([k]) => k).reverse();
console.log(ids.join(" "));
execFileSync(process.execPath, ["tools/remaster/pair-sheet.mjs", out, ...ids], { stdio: "inherit", env: process.env });
