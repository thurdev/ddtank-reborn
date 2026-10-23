/**
 * `Bussiness/CheckCode.cs` image side (`CreateImage`): the original renders the 4-digit code with GDI+
 * (distorted fonts + a bezier squiggle) into a PNG. This port has no GDI+/canvas equivalent available
 * without a native-binding dependency, so it draws the same INFORMATION (a human-readable 4-digit code,
 * distorted enough to not be a plain monospace readout) with plain pixel rectangles — a classic
 * 7-segment-display glyph per digit plus a couple of noise lines — and encodes a real, minimal PNG by hand
 * (grayscale, 1 byte/pixel, zlib via Node's built-in `zlib` — no new dependency). The AS3 client
 * (`PlayerManager.as:__checkCodePopup`) just feeds the remaining packet bytes into a `BitmapReader`/PNG
 * decoder, so any valid PNG works; it never re-derives the answer from the pixels, so pixel-perfect parity
 * with the original's font rendering has no gameplay effect.
 */
import { deflateSync } from "node:zlib";

// ------------------------------------------------------------------ CRC32 (standard table, PNG chunk checksums)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u32be(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

function chunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  return Buffer.concat([u32be(data.length), body, u32be(crc32(body))]);
}

/** Minimal grayscale PNG (bit depth 8, no interlace, filter "None" per row). `pixels` is width*height bytes. */
function encodePng(width: number, height: number, pixels: Uint8Array): Buffer {
  const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // color type: grayscale
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const raw = Buffer.alloc(height * (1 + width));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width)] = 0; // filter type "None"
    raw.set(pixels.subarray(y * width, y * width + width), y * (1 + width) + 1);
  }
  const idat = deflateSync(raw);
  return Buffer.concat([SIGNATURE, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// ------------------------------------------------------------------ 7-segment digit glyphs
type Seg = "a" | "b" | "c" | "d" | "e" | "f" | "g";
/** a=top, b=top-right, c=bottom-right, d=bottom, e=bottom-left, f=top-left, g=middle. */
const DIGIT_SEGMENTS: Record<string, Seg[]> = {
  "0": ["a", "b", "c", "d", "e", "f"],
  "1": ["b", "c"],
  "2": ["a", "b", "g", "e", "d"],
  "3": ["a", "b", "g", "c", "d"],
  "4": ["f", "g", "b", "c"],
  "5": ["a", "f", "g", "c", "d"],
  "6": ["a", "f", "g", "e", "d", "c"],
  "7": ["a", "b", "c"],
  "8": ["a", "b", "c", "d", "e", "f", "g"],
  "9": ["a", "b", "c", "d", "f", "g"],
};

const CELL_W = 30;
const CELL_H = 32;
const GLYPH_W = 14;
const GLYPH_H = 24;
const THICK = 3;

function fillRect(pixels: Uint8Array, width: number, height: number, x0: number, y0: number, w: number, h: number, v: number): void {
  for (let y = Math.max(0, y0); y < Math.min(height, y0 + h); y++) {
    for (let x = Math.max(0, x0); x < Math.min(width, x0 + w); x++) pixels[y * width + x] = v;
  }
}

/** Draws one digit's 7-segment glyph at cell (col), with a small random jitter for a bit of distortion. */
function drawDigit(pixels: Uint8Array, width: number, height: number, col: number, digit: string, rnd: () => number): void {
  const segs = DIGIT_SEGMENTS[digit] ?? [];
  const jitterX = Math.round((rnd() - 0.5) * 4);
  const jitterY = Math.round((rnd() - 0.5) * 2);
  const gx = col * CELL_W + (CELL_W - GLYPH_W) / 2 + jitterX;
  const gy = (CELL_H - GLYPH_H) / 2 + jitterY;
  const dark = 20;
  const half = (GLYPH_H - THICK) / 2;
  const rects: Record<Seg, [number, number, number, number]> = {
    a: [THICK, 0, GLYPH_W - 2 * THICK, THICK],
    g: [THICK, (GLYPH_H - THICK) / 2, GLYPH_W - 2 * THICK, THICK],
    d: [THICK, GLYPH_H - THICK, GLYPH_W - 2 * THICK, THICK],
    f: [0, 0, THICK, half + THICK],
    e: [0, half, THICK, half + THICK],
    b: [GLYPH_W - THICK, 0, THICK, half + THICK],
    c: [GLYPH_W - THICK, half, THICK, half + THICK],
  };
  for (const s of segs) {
    const [rx, ry, rw, rh] = rects[s];
    fillRect(pixels, width, height, Math.round(gx + rx), Math.round(gy + ry), rw, rh, dark);
  }
}

/** Draws a couple of straight noise lines across the image (cheap stand-in for the original's bezier squiggle). */
function drawNoiseLines(pixels: Uint8Array, width: number, height: number, rnd: () => number): void {
  const v = 110;
  for (let line = 0; line < 2; line++) {
    const y0 = Math.floor(rnd() * height);
    const y1 = Math.floor(rnd() * height);
    for (let x = 0; x < width; x++) {
      const y = Math.round(y0 + ((y1 - y0) * x) / width);
      if (y >= 0 && y < height) pixels[y * width + x] = v;
    }
  }
}

/** `Bussiness.CheckCode.GenerateCheckCode`: 4 random digits (`GenerateRandomString(4, Digital)`). */
export function generateCheckCode(rnd: () => number = Math.random): string {
  let s = "";
  for (let i = 0; i < 4; i++) s += Math.floor(rnd() * 10).toString();
  return s;
}

/** `Bussiness.CheckCode.CreateImage`: width = code.length * 30, height = 32. See module header. */
export function renderCheckCodeImage(code: string, rnd: () => number = Math.random): Buffer {
  const width = code.length * CELL_W;
  const height = CELL_H;
  const pixels = new Uint8Array(width * height).fill(235); // light background
  drawNoiseLines(pixels, width, height, rnd);
  for (let i = 0; i < code.length; i++) drawDigit(pixels, width, height, i, code[i]!, rnd);
  return encodePng(width, height, pixels);
}
