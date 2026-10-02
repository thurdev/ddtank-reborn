/**
 * Minimal dependency-free PNG codec (no pngjs/sharp in this repo). Decodes the subset the map/crater art actually
 * uses (8-bit grayscale/RGB/RGBA/palette, no interlace) to RGBA8, and encodes RGBA8 -> PNG (filter 0, zlib deflate).
 * Used by tools/assets/check-maps.ts (decode fore/back/dead art) and tools/assets/gen-craters.ts (encode craters).
 */
import { deflateSync, inflateSync } from "node:zlib";

export interface DecodedPng {
  width: number;
  height: number;
  /** RGBA8, row-major, 4 bytes/pixel. */
  rgba: Uint8Array;
}

const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]!;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

export function decodePng(buf: Buffer | Uint8Array): DecodedPng {
  const b = buf instanceof Buffer ? buf : Buffer.from(buf);
  for (let i = 0; i < 8; i++) if (b[i] !== SIG[i]) throw new Error("not a PNG");
  let o = 8;
  let width = 0,
    height = 0,
    bitDepth = 8,
    colorType = 6,
    interlace = 0;
  let palette: Uint8Array | null = null;
  let trns: Uint8Array | null = null;
  const idat: Buffer[] = [];
  while (o < b.length) {
    const len = b.readUInt32BE(o);
    const type = b.toString("latin1", o + 4, o + 8);
    const data = b.subarray(o + 8, o + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8]!;
      colorType = data[9]!;
      interlace = data[12]!;
    } else if (type === "PLTE") palette = new Uint8Array(data);
    else if (type === "tRNS") trns = new Uint8Array(data);
    else if (type === "IDAT") idat.push(Buffer.from(data));
    else if (type === "IEND") break;
    o += 12 + len;
  }
  if (interlace !== 0) throw new Error("interlaced PNG not supported");
  const raw = inflateSync(Buffer.concat(idat));
  const channels = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 3 ? 1 : colorType === 4 ? 2 : 4;
  const bitsPerPixel = channels * bitDepth;
  const bytesPerPixel = Math.max(1, bitsPerPixel / 8);
  const rowBytes = Math.ceil((width * bitsPerPixel) / 8);
  const rgba = new Uint8Array(width * height * 4);
  let prevRow = new Uint8Array(rowBytes);
  let srcOff = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[srcOff]!;
    srcOff++;
    const row = raw.subarray(srcOff, srcOff + rowBytes);
    const out = new Uint8Array(rowBytes);
    for (let x = 0; x < rowBytes; x++) {
      const a = x >= bytesPerPixel ? out[x - bytesPerPixel]! : 0;
      const bb = prevRow[x]!;
      const c = x >= bytesPerPixel ? prevRow[x - bytesPerPixel]! : 0;
      const raw8 = row[x]!;
      let v: number;
      switch (filter) {
        case 0:
          v = raw8;
          break;
        case 1:
          v = (raw8 + a) & 0xff;
          break;
        case 2:
          v = (raw8 + bb) & 0xff;
          break;
        case 3:
          v = (raw8 + ((a + bb) >> 1)) & 0xff;
          break;
        case 4: {
          const p = a + bb - c;
          const pa = Math.abs(p - a),
            pb = Math.abs(p - bb),
            pc = Math.abs(p - c);
          const pr = pa <= pb && pa <= pc ? a : pb <= pc ? bb : c;
          v = (raw8 + pr) & 0xff;
          break;
        }
        default:
          throw new Error(`unsupported PNG filter ${filter}`);
      }
      out[x] = v;
    }
    srcOff += rowBytes;
    prevRow = out;
    // unpack this row into rgba
    for (let x = 0; x < width; x++) {
      let r = 0,
        g = 0,
        bl = 0,
        al = 255;
      if (bitDepth === 8) {
        const po = x * bytesPerPixel;
        if (colorType === 6) {
          r = out[po]!;
          g = out[po + 1]!;
          bl = out[po + 2]!;
          al = out[po + 3]!;
        } else if (colorType === 2) {
          r = out[po]!;
          g = out[po + 1]!;
          bl = out[po + 2]!;
        } else if (colorType === 0) {
          r = g = bl = out[po]!;
        } else if (colorType === 4) {
          r = g = bl = out[po]!;
          al = out[po + 1]!;
        } else if (colorType === 3) {
          const idx = out[po]!;
          r = palette?.[idx * 3] ?? 0;
          g = palette?.[idx * 3 + 1] ?? 0;
          bl = palette?.[idx * 3 + 2] ?? 0;
          al = trns && idx < trns.length ? trns[idx]! : 255;
        }
      } else if (bitDepth === 1 || bitDepth === 2 || bitDepth === 4) {
        // palette or grayscale sub-byte depths (crater/map art occasionally ships as 4-bit indexed)
        const bitsPerIdx = bitDepth;
        const idxInRow = x;
        const bitOff = idxInRow * bitsPerIdx;
        const byteOff = bitOff >> 3;
        const shift = 8 - bitsPerIdx - (bitOff & 7);
        const mask = (1 << bitsPerIdx) - 1;
        const idx = (out[byteOff]! >> shift) & mask;
        if (colorType === 3) {
          r = palette?.[idx * 3] ?? 0;
          g = palette?.[idx * 3 + 1] ?? 0;
          bl = palette?.[idx * 3 + 2] ?? 0;
          al = trns && idx < trns.length ? trns[idx]! : 255;
        } else {
          const scale = 255 / mask;
          r = g = bl = Math.round(idx * scale);
        }
      } else {
        throw new Error(`unsupported bit depth ${bitDepth}`);
      }
      const ro = (y * width + x) * 4;
      rgba[ro] = r;
      rgba[ro + 1] = g;
      rgba[ro + 2] = bl;
      rgba[ro + 3] = al;
    }
  }
  return { width, height, rgba };
}

function chunk(type: string, data: Uint8Array): Buffer {
  const typeBuf = Buffer.from(type, "latin1");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([typeBuf, Buffer.from(data)]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/** Encodes RGBA8 pixels to a PNG (colorType 6, filter 0, zlib level 9). */
export function encodePng(width: number, height: number, rgba: Uint8Array): Buffer {
  const rowBytes = width * 4;
  const raw = Buffer.alloc((rowBytes + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (rowBytes + 1)] = 0; // filter: none
    raw.set(rgba.subarray(y * rowBytes, y * rowBytes + rowBytes), y * (rowBytes + 1) + 1);
  }
  const idatData = deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([Buffer.from(SIG), chunk("IHDR", ihdr), chunk("IDAT", idatData), chunk("IEND", new Uint8Array(0))]);
}

/** Reads just width/height from a JPEG's SOFn marker (no pixel decode — back.jpg layers are never dug). */
export function jpegSize(buf: Buffer | Uint8Array): { width: number; height: number } | null {
  const b = buf instanceof Buffer ? buf : Buffer.from(buf);
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let o = 2;
  while (o + 9 < b.length) {
    if (b[o] !== 0xff) {
      o++;
      continue;
    }
    const marker = b[o + 1]!;
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      o += 2;
      continue;
    }
    const len = b.readUInt16BE(o + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = b.readUInt16BE(o + 5);
      const width = b.readUInt16BE(o + 7);
      return { width, height };
    }
    o += 2 + len;
  }
  return null;
}
