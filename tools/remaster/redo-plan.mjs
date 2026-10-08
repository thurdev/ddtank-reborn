// Review round: merge per-image redo decisions into remaster/_auto/redo-plan.json
//   node tools/remaster/redo-plan.mjs '<json {id: {mode, ...spec}}>'
// mode: "ai" (Seedream text edit, fidelity prompt), "svg" (render-text on plain text), "blocks" (compose-blocks), "revert" (no text: keep original)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const f = "remaster/_auto/redo-plan.json";
const plan = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {};
const add = JSON.parse(process.argv[2]);
for (const [k, v] of Object.entries(add)) plan[k] = { ...(plan[k] ?? {}), ...v };
writeFileSync(f, JSON.stringify(plan, null, 1));
console.log("plan entries", Object.keys(plan).length);
