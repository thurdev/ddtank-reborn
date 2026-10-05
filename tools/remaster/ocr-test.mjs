import sharp from "sharp";
import { createWorker } from "tesseract.js";
const w = await createWorker("por", 1, { langPath: "tools/remaster", gzip: true });
const file = process.argv[2], expected = process.argv[3];
const norm = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const base = sharp(file).resize({ height: 160 }).extend({ top: 40, bottom: 40, left: 40, right: 40, background: { r: 0, g: 0, b: 0, alpha: 0 } });
const light = await base.clone().flatten({ background: "#ffffff" }).png().toBuffer();
const dark = await base.clone().flatten({ background: "#000000" }).png().toBuffer();
const g = (b) => sharp(b).grayscale().normalise();
const vs = { light, dark, inv: await g(dark).negate().png().toBuffer(), thr: await g(light).threshold(150).png().toBuffer(), invthr: await g(dark).negate().threshold(150).png().toBuffer() };
for (const [k, b] of Object.entries(vs)) { const { data } = await w.recognize(b); console.log(k, JSON.stringify(data.text.trim()), norm(data.text).includes(norm(expected))); }
await w.terminate();
