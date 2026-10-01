/**
 * Binary patch of the RSA modulus compiled into the game core (research/client/01-client-map.md §5, option A):
 * inflate the CWS body, replace the 172-char base64 modulus (same length -> ABC pool unchanged), deflate.
 * Usage: tsx scripts/patch-client-key.ts <in 2.png> <out 2.png> <newModulusBase64>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { deflateSync, inflateSync } from "node:zlib";

const ORIGINAL =
  "zRSdzFcnZjOCxDMkWUbuRgiOZIQlk7frZMhElQ0a7VqZI9VgU3+lwo0ghZLU3Gg63kOY2UyJ5vFpQdwJUQydsF337ZAUJz4rwGRt/MNL70wm71nGfmdPv4ING+DyJ3ZxFawwE1zSMjMOqQtY4IV8his/HlgXuUfIHVDK87nMNLc=";
const [inp, out, mod, old = ORIGINAL] = process.argv.slice(2);
if (!inp || !out || !mod) throw new Error("usage: patch-client-key <in> <out> <newModulus> [oldModulus]");
if (mod.length !== old.length) throw new Error(`modulus must be ${old.length} chars (got ${mod.length})`);
const src = readFileSync(inp);
if (src.subarray(0, 3).toString() !== "CWS") throw new Error("expected a CWS (zlib) SWF");
const body = inflateSync(src.subarray(8));
const at = body.indexOf(Buffer.from(old, "ascii"));
if (at < 0) throw new Error("original modulus not found");
Buffer.from(mod, "ascii").copy(body, at);
writeFileSync(out, Buffer.concat([src.subarray(0, 8), deflateSync(body, { level: 9 })]));
console.log(`patched modulus at body offset ${at} -> ${out}`);
