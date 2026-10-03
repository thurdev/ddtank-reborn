// Shared SWF/ABC byte-level helpers used by both scan.mjs (read-only) and patch.mjs (read+rewrite).
import { inflateSync, deflateSync } from "node:zlib";

export class ByteReader {
  constructor(buf) {
    this.buf = buf;
    this.pos = 0;
  }
  u16() {
    const v = this.buf.readUInt16LE(this.pos);
    this.pos += 2;
    return v;
  }
  u32() {
    const v = this.buf.readUInt32LE(this.pos);
    this.pos += 4;
    return v;
  }
  bytes(n) {
    const v = this.buf.subarray(this.pos, this.pos + n);
    this.pos += n;
    return v;
  }
  /** SWF/ABC variable-length unsigned 30/32-bit int: 7 data bits per byte, high bit = continuation. */
  u30() {
    let result = 0;
    let shift = 0;
    for (let i = 0; i < 5; i++) {
      const b = this.buf[this.pos++];
      result |= (b & 0x7f) << shift;
      if ((b & 0x80) === 0) break;
      shift += 7;
    }
    return result >>> 0;
  }
  cstring() {
    const start = this.pos;
    while (this.buf[this.pos] !== 0) this.pos++;
    const s = this.buf.toString("utf8", start, this.pos);
    this.pos++;
    return s;
  }
}

/** Encodes n as a SWF/ABC u30 varint. */
export function encodeU30(n) {
  const out = [];
  do {
    let b = n & 0x7f;
    n >>>= 7;
    if (n !== 0) b |= 0x80;
    out.push(b);
  } while (n !== 0);
  return Buffer.from(out);
}

/** Reads a SWF RECT (frame size): 5-bit nbits field + 4 * nbits signed bits, bit-packed. Returns end byte offset. */
export function skipRect(buf, byteOffset) {
  const nbits = buf[byteOffset] >> 3;
  const totalBits = 5 + 4 * nbits;
  return byteOffset + Math.ceil(totalBits / 8);
}

export function decompressSwf(buf) {
  const sig = buf.toString("ascii", 0, 3);
  if (sig !== "FWS" && sig !== "CWS" && sig !== "ZWS") {
    return { error: `not an SWF signature (got ${JSON.stringify(sig)})`, body: null };
  }
  if (sig === "ZWS") return { error: "ZWS (LZMA-compressed) SWF not supported", body: null };
  const version = buf[3];
  let body;
  if (sig === "CWS") {
    try {
      body = inflateSync(buf.subarray(8));
    } catch (e) {
      return { error: `zlib inflate failed: ${e.message}`, body: null };
    }
  } else {
    body = buf.subarray(8);
  }
  return { error: null, body, sig, version };
}

/** Splits a decompressed SWF body into {headerPrefix, tags: [{code, headerStart, bodyStart, bodyEnd, raw}]}. */
export function parseTags(body) {
  let pos = skipRect(body, 0);
  pos += 2; // frame rate
  pos += 2; // frame count
  const headerPrefix = body.subarray(0, pos);
  const tags = [];
  while (pos < body.length) {
    if (pos + 2 > body.length) break;
    const headerStart = pos;
    const tagCodeAndLength = body.readUInt16LE(pos);
    pos += 2;
    const tagCode = tagCodeAndLength >> 6;
    let len = tagCodeAndLength & 0x3f;
    let longForm = false;
    if (len === 0x3f) {
      longForm = true;
      if (pos + 4 > body.length) break;
      len = body.readUInt32LE(pos);
      pos += 4;
    }
    const bodyStart = pos;
    const bodyEnd = bodyStart + len;
    tags.push({ code: tagCode, headerStart, bodyStart, bodyEnd, longForm, raw: body.subarray(headerStart, bodyEnd) });
    pos = bodyEnd;
    if (tagCode === 0) break; // End tag
  }
  const trailing = body.subarray(pos);
  return { headerPrefix, tags, trailing };
}

/** Rebuilds one tag's bytes (header + body) from a tagCode and new body buffer. */
export function buildTag(tagCode, newBody) {
  const len = newBody.length;
  if (len < 0x3f) {
    const header = Buffer.alloc(2);
    header.writeUInt16LE((tagCode << 6) | len, 0);
    return Buffer.concat([header, newBody]);
  }
  const header = Buffer.alloc(6);
  header.writeUInt16LE((tagCode << 6) | 0x3f, 0);
  header.writeUInt32LE(len, 2);
  return Buffer.concat([header, newBody]);
}

export function compressSwf(sig, version, body) {
  const fileLength = 8 + body.length;
  const header = Buffer.alloc(8);
  header.write(sig, 0, "ascii");
  header.writeUInt8(version, 3);
  header.writeUInt32LE(fileLength, 4);
  if (sig === "CWS") {
    return Buffer.concat([header, deflateSync(body, { level: 9 })]);
  }
  return Buffer.concat([header, body]);
}
