// Crop-job window: stitch the AI crops into the original, then (if the spec has blocks) draw the remaining lines.
//   node tools/remaster/finish-window.mjs <id>
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
const id = process.argv[2];
const spec = JSON.parse(readFileSync("remaster/_auto/specs.json", "utf8"))[id];
const run = (f, args) => execFileSync(process.execPath, [join("tools", "remaster", f), ...args], { stdio: "inherit" });
if (spec.blocks?.length && spec.baseFile) { run("stitch-crops.mjs", [id, spec.baseFile]); run("compose-blocks.mjs", [id]); }
else run("stitch-crops.mjs", [id]);
