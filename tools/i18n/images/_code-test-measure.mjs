// Pixel-level text measurement for the 4 code-text-test images.
// Scratch script for the code-text-test quality check (see research/i18n/code-text-test.html).
import sharp from "sharp";

const ROOT = "C:/Users/T/Documents/Projects/DDTank";

const targets = [
  {
    name: "agree-propose",
    path: `${ROOT}/remaster/04-botoes-titulos/inputs/corei__52_asset.church.AgreeProposeAsset.png`,
    region: { x0: 0, y0: 75, x1: 447, y1: 191 },
    isInk: (r, g, b, a) => a > 100 && 0.2126 * r + 0.7152 * g + 0.0722 * b < 120,
  },
  {
    name: "title-rewards",
    path: `${ROOT}/remaster/03-janelas/inputs/gameover__29_asset.takeoutCard.TitleBitmap.png`,
    region: { x0: 0, y0: 0, x1: 306, y1: 48 },
    isInk: (r, g, b, a) => a > 60 && 255 - r + (255 - g) + (255 - b) > 70,
  },
  {
    name: "btn-addfriend",
    path: `${ROOT}/remaster/04-botoes-titulos/inputs/corei__187_cityWide.addFriendBt.png`,
    region: { x0: 8, y0: 6, x1: 142, y1: 47 },
    isInk: (r, g, b, a) => {
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      return a > 100 && (lum > 195 || lum < 70);
    },
  },
  {
    name: "hall-guild",
    path: `${ROOT}/remaster/02-lobby-hall/inputs/hall__243.png`,
    region: { x0: 0, y0: 0, x1: 145, y1: 88 },
    isInk: (r, g, b, a) => a > 100 && 0.2126 * r + 0.7152 * g + 0.0722 * b < 120,
  },
];

function luminance(c) {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

async function measure(t) {
  const img = sharp(t.path).ensureAlpha();
  const meta = await img.metadata();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const W = info.width;
  const rowInk = new Array(info.height).fill(0);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const inkPixels = [];
  for (let y = t.region.y0; y < Math.min(t.region.y1, info.height); y++) {
    for (let x = t.region.x0; x < Math.min(t.region.x1, W); x++) {
      const idx = (y * W + x) * ch;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = ch >= 4 ? data[idx + 3] : 255;
      if (t.isInk(r, g, b, a)) {
        rowInk[y]++;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x);
        y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        inkPixels.push({ r, g, b });
      }
    }
  }
  const lines = [];
  let cur = null;
  for (let y = t.region.y0; y < Math.min(t.region.y1, info.height); y++) {
    if (rowInk[y] > 0) {
      if (!cur) cur = { y0: y, y1: y };
      else cur.y1 = y;
    } else if (cur) {
      lines.push(cur);
      cur = null;
    }
  }
  if (cur) lines.push(cur);
  const merged = [];
  for (const l of lines) {
    if (merged.length && l.y0 - merged[merged.length - 1].y1 <= 3) {
      merged[merged.length - 1].y1 = l.y1;
    } else merged.push({ ...l });
  }
  const lineXs = merged.map((l) => {
    let lx0 = Infinity, lx1 = -Infinity;
    for (let y = l.y0; y <= l.y1; y++) {
      for (let x = t.region.x0; x < Math.min(t.region.x1, W); x++) {
        const idx = (y * W + x) * ch;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = ch >= 4 ? data[idx + 3] : 255;
        if (t.isInk(r, g, b, a)) { lx0 = Math.min(lx0, x); lx1 = Math.max(lx1, x); }
      }
    }
    return { y0: l.y0, y1: l.y1, x0: lx0, x1: lx1 };
  });

  inkPixels.sort((a, b) => luminance(a) - luminance(b));
  const avg = (arr) => ({
    r: Math.round(arr.reduce((s, p) => s + p.r, 0) / arr.length),
    g: Math.round(arr.reduce((s, p) => s + p.g, 0) / arr.length),
    b: Math.round(arr.reduce((s, p) => s + p.b, 0) / arr.length),
  });
  const dark = inkPixels.slice(0, Math.max(1, Math.floor(inkPixels.length * 0.25)));
  const light = inkPixels.slice(-Math.max(1, Math.floor(inkPixels.length * 0.25)));
  const fill = avg(light);
  const outline = avg(dark);
  const flat = Math.abs(luminance(fill) - luminance(outline)) < 45;

  const pad = 4;
  async function stripAvg(top, h) {
    if (h <= 0) return null;
    const { data: d, info: i2 } = await sharp(t.path)
      .ensureAlpha()
      .extract({ left: Math.max(0, x0 - pad), top: Math.max(0, top), width: Math.min(meta.width, x1 + pad) - Math.max(0, x0 - pad), height: h })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const c2 = i2.channels;
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let k = 0; k < d.length; k += c2) { r += d[k]; g += d[k + 1]; b += d[k + 2]; a += c2 >= 4 ? d[k + 3] : 255; n++; }
    return n ? { r: r / n, g: g / n, b: b / n, a: a / n } : null;
  }
  const bgTop = await stripAvg(Math.max(0, y0 - pad - 4), 4);
  const bgBot = await stripAvg(Math.min(meta.height - 4, y1 + pad), 4);

  console.log("====", t.name, "====");
  console.log("imageSize", meta.width, "x", meta.height);
  console.log("bbox", { x0, y0, x1, y1 });
  console.log("lines", JSON.stringify(lineXs));
  console.log("fill", fill, "outline", outline, "flat", flat);
  console.log("bgTop", bgTop, "bgBot", bgBot);
}

for (const t of targets) await measure(t);
