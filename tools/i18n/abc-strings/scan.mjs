#!/usr/bin/env node
/**
 * Scans SWF files for Vietnamese-character string LITERALS baked into the ABC (ActionScript 3 bytecode)
 * constant pool, as opposed to strings resolved at runtime via LanguageMgr.GetTranslation(key) from
 * language.txt (which only has the dotted *keys* in the constant pool, not the Vietnamese display text).
 *
 * Handles SWF signatures FWS (uncompressed) and CWS (zlib-compressed body). ZWS (LZMA) is not supported
 * (none of this project's client SWFs use it) and is reported, not silently skipped.
 *
 * Finds tag 82 (DoABC: u32 flags + NUL-terminated name + abcData) and tag 72 (DoABC, deprecated form:
 * abcData with no header) and parses each abcData's constant pool far enough to read the string pool
 * (ints/uints/doubles are skipped by byte-length only, not decoded).
 *
 * Usage: node scan.mjs <file-or-dir> [<file-or-dir> ...] [--out <path>]
 * Output: JSON array of { swf, tagCode, tagOffset, abcName, cpoolIndex, string, usageHint }
 *   usageHint is structural (which DoABC tag / constant-pool slot), not a traced call site — this tool
 *   does not parse methods/bytecode, so it cannot say which class/method reads a given string index.
 */
import { readFileSync, writeFileSync, statSync, readdirSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { join, extname, relative } from "node:path";

const VN_RE =
  /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệđìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆĐÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ]/;

// Only the diacritics that never occur in Portuguese (same set as tools/i18n/images/lookup.mjs's
// VN_ONLY_RE) — used by --vn-only to validate a PATCHED file without false-positiving on the shared
// PT/VN accented letters (á, â, ã, ô, é, í, ó, ú...) that legitimate PT-BR translations also contain.
const VN_ONLY_RE =
  /[đĐăĂơƠưƯìÌùÙýÝạẠảẢấẤầẦẩẨẫẪậẬắẮằẰẳẲẵẴặẶẹẸẻẺẽẼếẾềỀểỂễỄệỆỉỈịỊọỌốỐồỒổỔỗỖộỘớỚờỜởỞỡỠợỢụỤủỦứỨừỪửỬữỮựỰỵỴỷỶỹỸ]/;

class ByteReader {
  constructor(buf) {
    this.buf = buf;
    this.pos = 0;
  }
  u8() {
    return this.buf[this.pos++];
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
    this.pos++; // skip NUL
    return s;
  }
}

/** Reads a SWF RECT (frame size): 5-bit nbits field + 4 * nbits signed bits, bit-packed. */
function skipRect(buf, byteOffset) {
  const nbits = buf[byteOffset] >> 3;
  const totalBits = 5 + 4 * nbits;
  return byteOffset + Math.ceil(totalBits / 8);
}

function decompressSwf(buf, label) {
  const sig = buf.toString("ascii", 0, 3);
  if (sig !== "FWS" && sig !== "CWS" && sig !== "ZWS") {
    return { error: `not an SWF signature (got ${JSON.stringify(sig)}) — skipped`, body: null };
  }
  if (sig === "ZWS") return { error: "ZWS (LZMA-compressed) SWF not supported — skipped", body: null };
  const fileLength = buf.readUInt32LE(4);
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
  return { error: null, body, sig, fileLength };
}

/** Parses one ABC blob far enough to extract the string constant pool. Returns [{index, value}]. */
function extractAbcStrings(abc) {
  const r = new ByteReader(abc);
  r.u16(); // minor_version
  r.u16(); // major_version

  const intCount = r.u30();
  for (let i = 1; i < intCount; i++) r.u30();
  const uintCount = r.u30();
  for (let i = 1; i < uintCount; i++) r.u30();
  const doubleCount = r.u30();
  for (let i = 1; i < doubleCount; i++) r.pos += 8;

  const stringCount = r.u30();
  const strings = [];
  for (let i = 1; i < stringCount; i++) {
    const len = r.u30();
    const raw = r.bytes(len);
    const value = raw.toString("utf8");
    strings.push({ index: i, value });
  }
  return strings;
}

function scanSwfTags(body, swfLabel, results, re) {
  let pos = skipRect(body, 0);
  pos += 2; // frame rate
  pos += 2; // frame count
  while (pos < body.length) {
    if (pos + 2 > body.length) break;
    const tagCodeAndLength = body.readUInt16LE(pos);
    pos += 2;
    const tagCode = tagCodeAndLength >> 6;
    let len = tagCodeAndLength & 0x3f;
    if (len === 0x3f) {
      if (pos + 4 > body.length) break;
      len = body.readUInt32LE(pos);
      pos += 4;
    }
    const tagStart = pos;
    const tagBody = body.subarray(tagStart, tagStart + len);

    if (tagCode === 0) break; // End tag

    if (tagCode === 82 || tagCode === 72) {
      try {
        let abcName = null;
        let abcData;
        if (tagCode === 82) {
          const tr = new ByteReader(tagBody);
          tr.u32(); // flags
          abcName = tr.cstring();
          abcData = tagBody.subarray(tr.pos);
        } else {
          abcData = tagBody;
        }
        const strings = extractAbcStrings(abcData);
        for (const { index, value } of strings) {
          if (re.test(value)) {
            results.push({
              swf: swfLabel,
              tagCode,
              tagOffset: tagStart,
              abcName,
              cpoolIndex: index,
              string: value,
              usageHint: `cpool string #${index} in ${tagCode === 82 ? "DoABC" : "DoABC(deprecated)"} tag @ body offset ${tagStart}${
                abcName ? ` (abcName="${abcName}")` : ""
              } — structural location only, not a traced call site`,
            });
          }
        }
      } catch (e) {
        results.push({ swf: swfLabel, tagCode, tagOffset: tagStart, error: `ABC parse failed: ${e.message}` });
      }
    }

    pos = tagStart + len;
  }
}

function walk(p, out) {
  const st = statSync(p);
  if (st.isDirectory()) {
    for (const entry of readdirSync(p)) walk(join(p, entry), out);
  } else if ([".swf", ".png"].includes(extname(p).toLowerCase())) {
    // .png is included because this project's core client SWFs (FlashSV1/2.png, 3.png) are CWS SWFs
    // disguised with a .png extension (see research/client/01-client-map.md §5).
    out.push(p);
  }
}

function main() {
  const args = process.argv.slice(2);
  let outPath = "research/i18n/abc-strings.json";
  let vnOnly = false;
  const inputs = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--out") outPath = args[++i];
    else if (args[i] === "--vn-only") vnOnly = true;
    else inputs.push(args[i]);
  }
  const re = vnOnly ? VN_ONLY_RE : VN_RE;
  if (!inputs.length) {
    console.error("usage: node scan.mjs <file-or-dir> [...] [--out path]");
    process.exit(1);
  }

  const files = [];
  for (const inp of inputs) walk(inp, files);

  const results = [];
  const fileErrors = [];
  for (const f of files) {
    const buf = readFileSync(f);
    const { error, body } = decompressSwf(buf, f);
    const label = relative(process.cwd(), f).replace(/\\/g, "/");
    if (error) {
      fileErrors.push({ swf: label, error });
      continue;
    }
    try {
      scanSwfTags(body, label, results, re);
    } catch (e) {
      fileErrors.push({ swf: label, error: `tag scan failed: ${e.message}` });
    }
  }

  const out = {
    generatedAt: new Date().toISOString(),
    scannedFiles: files.length,
    filesWithErrors: fileErrors,
    vnStringCount: results.length,
    results,
  };
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(
    `scanned ${files.length} file(s), ${fileErrors.length} unreadable, found ${results.length} VN-char string(s) in ABC constant pools -> ${outPath}`
  );
}

main();
