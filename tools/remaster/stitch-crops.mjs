// Pastes the AI-edited crops (remaster/_auto/crops-out/<id>~c<k>.png) of a crop-job window back into its original.
//   node tools/remaster/stitch-crops.mjs <id> [out]   (all crops must exist)
import sharp from "sharp";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
const [id, outArg] = process.argv.slice(2);
const spec = JSON.parse(readFileSync("remaster/_auto/specs.json", "utf8"))[id];
const cat = readdirSync("remaster").filter((c) => /^\d\d-/.test(c)).find((c) => readdirSync(join("remaster", c, "inputs")).some((f) => f.startsWith(id + ".")));
const src = join("remaster", cat, "inputs", readdirSync(join("remaster", cat, "inputs")).find((f) => f.startsWith(id + ".")));
const parts = spec.crops.map((c, k) => ({ c, f: join("remaster", "_auto", "crops-out", `${id}~c${k}.png`) })).filter((p) => !p.c.skip);
const missing = parts.filter((p) => !existsSync(p.f));
if (missing.length) { console.log("missing", missing.map((p) => p.f).join(" ")); process.exit(1); }
const out = outArg ?? join("remaster", cat, "outputs", id + ".png");
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (const { c, f } of parts) { // replace the box pixels (alpha included) with the edited crop
  const w = c.box[2] - c.box[0] + 1, h = c.box[3] - c.box[1] + 1;
  const p = await sharp(f).resize(w, h, { fit: "fill" }).ensureAlpha().raw().toBuffer();
  for (let y = 0; y < h; y++) p.copy(data, ((y + c.box[1]) * info.width + c.box[0]) * 4, y * w * 4, (y + 1) * w * 4);
}
await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(out);
console.log(out);
