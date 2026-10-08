// compose on erased, but only right of column X (keeps icon on the left from the original)
import sharp from "sharp";
import { composeOnErased } from "./compose-text.mjs";
const [inp, er, X, pt, out] = process.argv.slice(2);
const S = process.env.S, x = +X;
const m = await sharp(inp).metadata(), W = m.width - x;
await sharp(inp).extract({ left: x, top: 0, width: W, height: m.height }).toFile(S + "/k_o.png");
await sharp(er).resize(m.width, m.height, { fit: "fill" }).extract({ left: x, top: 0, width: W, height: m.height }).toFile(S + "/k_e.png");
const ok = await composeOnErased(S + "/k_o.png", S + "/k_e.png", pt, 1, S + "/k_n.png", (s) => s.split("\n"));
if (ok) await sharp({ create: { width: m.width, height: m.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: await sharp(inp).extract({ left: 0, top: 0, width: x, height: m.height }).toBuffer(), left: 0, top: 0 }, { input: S + "/k_n.png", left: x, top: 0 }]).png().toFile(out);
console.log(ok, m.width, m.height); process.exit(0);
