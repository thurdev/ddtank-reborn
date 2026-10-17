// Renomeia fontes embutidas (DefineFont2/DefineFont3) de um SWF, por id. Usado pelo passo swf-text do
// build-client-art: o `ffdec -replace` só cria glifos que faltam se a família da fonte estiver instalada no
// sistema (MissingCharacterHandler procura getInstalledFontsByFamily pelo nome). Fontes como "UVN Van" e
// "Arial Unicode MS" não existem aqui, então o import falhava com "Error during text import" em qualquer
// texto alterado. Solução: troca o nome pra "Arial" só durante o -replace e devolve o nome original depois
// (o DefineEditText com html usa o nome da fonte pra achar o face, não pode ficar trocado).
// Como lê esse código (cada variável): buf bytes do SWF descomprimido; pos cursor nos tags; code/len cabeçalho
// do tag; body conteúdo; renamed { id: nomeAntigo } devolvido pra desfazer.
//   node tools/i18n/swf-font-rename.mjs <in.swf> <out.swf> <id>=<Nome> [...]
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const FFDEC_JAR = resolve(import.meta.dirname, "..", "..", "vendor", "_tools", "ffdec", "ffdec-cli.jar");
import { inflateSync, deflateSync } from "node:zlib";

const FONT_TAGS = new Set([48, 75]); // DefineFont2, DefineFont3

function load(path) {
  const raw = readFileSync(path);
  const sig = raw.toString("latin1", 0, 3);
  if (sig === "FWS") return raw;
  if (sig === "CWS") return Buffer.concat([raw.subarray(0, 8), inflateSync(raw.subarray(8))]);
  // ZWS (LZMA): o node não tem LZMA nativo, o FFDec descomprime
  const dir = mkdtempSync(join(tmpdir(), "swf-font-"));
  try { const f = join(dir, "d.swf"); execFileSync("java", ["-jar", FFDEC_JAR, "-decompress", path, f], { stdio: "pipe" }); return readFileSync(f); } finally { rmSync(dir, { recursive: true, force: true }); }
}

/** Lista as fontes { id, name } de um SWF. */
export function listFonts(path) {
  const buf = load(path);
  const out = [];
  walk(buf, (code, body) => { if (FONT_TAGS.has(code)) out.push({ id: body.readUInt16LE(0), name: body.toString("utf8", 5, 5 + body[4]).replace(/\0+$/, "") }); });
  return out;
}

function walk(buf, fn) {
  // cabeçalho: FWS(3) versão(1) tamanho(4) RECT(bits variáveis) frameRate(2) frameCount(2)
  const nbits = buf[8] >> 3;
  let pos = 8 + Math.ceil((5 + nbits * 4) / 8) + 4;
  const tags = [];
  while (pos < buf.length) {
    const head = buf.readUInt16LE(pos);
    const code = head >> 6;
    let len = head & 0x3f, hl = 2;
    if (len === 0x3f) { len = buf.readUInt32LE(pos + 2); hl = 6; }
    const body = buf.subarray(pos + hl, pos + hl + len);
    const nb = fn(code, body);
    tags.push({ code, body: nb ?? body, raw: nb ? null : buf.subarray(pos, pos + hl + len) });
    pos += hl + len;
    if (code === 0) break;
  }
  return { header: buf.subarray(0, 8 + Math.ceil((5 + nbits * 4) / 8) + 4), tags };
}

/** Troca o nome das fontes `map` ({ id: novoNome }) e grava `outPath` (CWS). Devolve { id: nomeAntigo }. */
export function renameFonts(inPath, outPath, map) {
  const buf = load(inPath);
  const renamed = {};
  const { header, tags } = walk(buf, (code, body) => {
    if (!FONT_TAGS.has(code)) return;
    const id = body.readUInt16LE(0);
    if (!(id in map)) return;
    const oldLen = body[4];
    renamed[id] = body.toString("utf8", 5, 5 + oldLen).replace(/\0+$/, "");
    // nome do DefineFont3 é UTF-8 com \0 final (o original já tinha); mantém a convenção
    const name = Buffer.from(map[id] + "\0", "utf8");
    return Buffer.concat([body.subarray(0, 4), Buffer.from([name.length]), name, body.subarray(5 + oldLen)]);
  });
  const parts = [];
  for (const { code, body, raw } of tags) {
    if (raw) parts.push(raw);
    else if (body.length < 0x3f) { const h = Buffer.alloc(2); h.writeUInt16LE((code << 6) | body.length); parts.push(h, body); }
    else { const h = Buffer.alloc(6); h.writeUInt16LE((code << 6) | 0x3f); h.writeUInt32LE(body.length, 2); parts.push(h, body); }
  }
  const rest = Buffer.concat([header.subarray(8), ...parts]);
  const head = Buffer.from(header.subarray(0, 8));
  head.write("CWS", 0, "latin1");
  head.writeUInt32LE(8 + rest.length, 4);
  writeFileSync(outPath, Buffer.concat([head, deflateSync(rest)]));
  return renamed;
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("swf-font-rename.mjs")) {
  const [inp, out, ...pairs] = process.argv.slice(2);
  if (!out) { console.log(JSON.stringify(listFonts(inp))); process.exit(0); }
  const map = Object.fromEntries(pairs.map((p) => p.split("=")).map(([k, v]) => [Number(k), v]));
  console.log(JSON.stringify(renameFonts(inp, out, map)));
}
