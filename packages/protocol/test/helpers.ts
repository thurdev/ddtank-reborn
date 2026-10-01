import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const hex = (b: Uint8Array): string => Buffer.from(b.buffer, b.byteOffset, b.byteLength).toString("hex");
export const unhex = (s: string): Uint8Array => new Uint8Array(Buffer.from(s, "hex"));

export function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(r: () => number, min: number, max: number): number {
  return min + Math.floor(r() * (max - min + 1));
}

export function randBytes(r: () => number, n: number): Uint8Array {
  const b = new Uint8Array(n);
  for (let i = 0; i < n; i++) b[i] = Math.floor(r() * 256);
  return b;
}

/** Split `data` into random chunks of 1..max bytes. */
export function randomSplit(r: () => number, data: Uint8Array, max: number): Uint8Array[] {
  const out: Uint8Array[] = [];
  let o = 0;
  while (o < data.length) {
    const n = Math.min(data.length - o, randInt(r, 1, max));
    out.push(data.subarray(o, o + n));
    o += n;
  }
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Golden = any;

let cached: Golden | undefined;
export function golden(): Golden {
  cached ??= JSON.parse(readFileSync(fileURLToPath(new URL("./golden/vectors.json", import.meta.url)), "utf8"));
  return cached;
}
