// Colour transfer: the AI output drifts toward the chroma pad colour (brown buttons came back green, then pinkish
// with the magenta key). Matches per-channel mean/std of the output to the original over opaque pixels.
//   node tools/remaster/color-match.mjs <original> <output> [out=output]
import sharp from "sharp";
export async function colorMatch(origPath, outPath, dest = outPath) {
  const o = await sharp(origPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = o.info.width, H = o.info.height;
  const p = await sharp(outPath).resize(W, H, { fit: "fill" }).ensureAlpha().raw().toBuffer();
  const stats = (d) => {
    const s = [0, 0, 0], q = [0, 0, 0]; let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200 && o.data[i + 3] > 200) { n++; for (let c = 0; c < 3; c++) { s[c] += d[i + c]; q[c] += d[i + c] * d[i + c]; } }
    return s.map((v, c) => { const m = v / n; return [m, Math.sqrt(Math.max(1, q[c] / n - m * m))]; });
  };
  const so = stats(o.data), sp = stats(p);
  for (let i = 0; i < p.length; i += 4) for (let c = 0; c < 3; c++) p[i + c] = Math.max(0, Math.min(255, Math.round((p[i + c] - sp[c][0]) * (so[c][1] / sp[c][1]) + so[c][0])));
  await sharp(p, { raw: { width: W, height: H, channels: 4 } }).png().toFile(dest);
  return { from: sp.map((x) => x[0].toFixed(0)), to: so.map((x) => x[0].toFixed(0)) };
}
if (process.argv[1]?.endsWith("color-match.mjs")) { console.log(await colorMatch(process.argv[2], process.argv[3], process.argv[4])); process.exit(0); }
