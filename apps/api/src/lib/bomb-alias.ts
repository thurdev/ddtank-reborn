/**
 * Missing ball animations. The Flash client only finishes the room loading when every ball of every player's weapon
 * is "complete" (BallInfo.isComplete: ModuleLoader.hasDefinition("bullet{id}") from image/bomb/blastOut/blastOut{id}.swf
 * and "blastOutMovie{n}" from image/bomb/bullet/bullet{n}.swf — the names are swapped in the client). The merged
 * resource pack lacks some of them (e.g. bullet180.swf for weapon 7008's ball 1211, or the scrambled mobile files),
 * which left PvP *and* PvE loading stuck at 83-91 % forever.
 *
 * For such a miss we serve a clone of the nearest existing file of the same folder whose id has the same number of
 * digits, with its exported class renamed (same length → only the bytes change, the SWF tags stay valid), so the
 * client gets the definition it waits for (it shows the donor's animation).
 */
import { readFileSync } from "node:fs";
import { deflateSync, inflateSync } from "node:zlib";
import type { ResourceIndex } from "./resources.js";

const cache = new Map<string, Buffer | null>();

function readSwf(file: string): Buffer | null {
  let b = readFileSync(file);
  if (b.length > 5 && b[0] === 0 && b[1] === 3 && b[2] === 0x5e) b = b.subarray(5);
  const sig = b.subarray(0, 3).toString("latin1");
  try {
    if (sig === "CWS") {
      const body = inflateSync(b.subarray(8));
      if (body.length + 8 !== b.readUInt32LE(4)) return null;
      return Buffer.concat([Buffer.from("FWS", "latin1"), b.subarray(3, 8), body]);
    }
    if (sig === "FWS") return b;
  } catch {
    return null;
  }
  return null;
}

/** rel like "image/bomb/bullet/bullet180.swf" → synthesized CWS bytes or null */
export function aliasBombSwf(resources: ResourceIndex, rel: string): Buffer | null {
  const m = /^image\/bomb\/(bullet|blastout)\/(bullet|blastout)(\d+)\.swf$/i.exec(rel.replace(/^\/+/, ""));
  if (!m) return null;
  const dir = m[1]!.toLowerCase();
  const id = m[3]!;
  const key = `${dir}/${id}`;
  if (cache.has(key)) return cache.get(key)!;
  // bullet{n}.swf exports "blastOutMovie{n}", blastOut{n}.swf exports "bullet{n}"
  const cls = dir === "bullet" ? "blastOutMovie" : "bullet";
  const n = Number(id);
  let out: Buffer | null = null;
  for (let d = 1; d < 2000 && !out; d++) {
    for (const cand of [n - d, n + d]) {
      const cid = String(cand);
      if (cand <= 0 || cid.length !== id.length) continue;
      const file = resources.resolve(`image/bomb/${dir}/${dir}${cid}.swf`);
      if (!file) continue;
      const swf = readSwf(file);
      if (!swf) continue;
      // rename in the SymbolClass tag (NUL-terminated) AND in the DoABC string pool (length-prefixed): every
      // occurrence of the name that is not followed by another digit
      const from = Buffer.from(`${cls}${cid}`, "latin1");
      const to = Buffer.from(`${cls}${id}`, "latin1");
      const copy = Buffer.from(swf);
      let hits = 0;
      for (let pos = copy.indexOf(from); pos >= 0; pos = copy.indexOf(from, pos + from.length)) {
        const nx = copy[pos + from.length] ?? 0;
        if (nx >= 0x30 && nx <= 0x39) continue;
        to.copy(copy, pos);
        hits++;
      }
      if (!hits) continue;
      const head = Buffer.from(copy.subarray(0, 8));
      head.write("CWS", 0, "latin1");
      out = Buffer.concat([head, deflateSync(copy.subarray(8))]);
      break;
    }
  }
  cache.set(key, out);
  return out;
}
