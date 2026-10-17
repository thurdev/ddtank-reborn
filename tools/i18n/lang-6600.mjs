// Gera a traducao PT-BR do language.txt do DDT-6600 (atualmente turco, "ui/turkey/language.png" = zip de
// 1 arquivo "language.txt") e o zip servido em apps/api/assets/flash6600/ui/turkey/language.png (overlay,
// ver apps/api/src/routes/static.ts).
//
// Para cada chave do arquivo turco original:
//   (a) se a chave existir em data/i18n/pt-BR/client-language.txt (nossa trad. PT-BR da 4.1, revisada por
//       humano), usa esse valor;
//   (b) senao, se existir em data/i18n/pt-BR/lang-6600-extra.json (traducoes novas so do 6600), usa esse —
//       e ESSE TEM PRIORIDADE sobre (a): se a mesma chave existir nos dois arquivos, o extra.json vence
//       (serve pra corrigir caso quando o sentido da chave mudou entre 4.1 e 6600, ver tarefa 2 do plano);
//   (c) senao mantem a linha turca original (verbatim) e conta a chave como "untranslated".
//
// O parser replica EXATAMENTE ddt.data.analyze.LanguageAnalyzer.as (Source Flash/src/ddt/data/analyze/
// LanguageAnalyzer.as), o codigo AS3 que de fato le esse arquivo no cliente:
//   String(texto).split("\r\n"); linha cujo 1o char é "#" = comentario (ignorada); senao troca os literais
//   "\r"/"\n" (2 chars, barra+letra) por CR/LF reais, acha o 1o ":", chave = antes, valor = depois do
//   1o "##" (se houver) removido, com trimRight. Chave duplicada: Dictionary, a ULTIMA ocorrencia vence.
// Isso importa porque o .txt turco tem ~300 linhas de "continuacao" quebradas (sem ":", sobra de um
// multi-linha mal formatado pelo tradutor turco original) que esse parser real DESCARTA silenciosamente —
// nao sao chave, nunca aparecem no jogo. Preservamos essas linhas verbatim no output (nao traduzimos lixo),
// so manipulamos linhas que de fato formam um par chave:valor — isso mantem a contagem de linhas == original.
//
//   node tools/i18n/lang-6600.mjs [--dry]
//
// Escreve data/i18n/pt-BR/client-language-6600.txt e apps/api/assets/flash6600/ui/turkey/language.png
// (mesmo layout do zip original: 1 entrada, nome exatamente "language.txt"). Com --dry, só imprime as
// contagens (não escreve nada) — útil pra ver quantas chaves ainda faltam no extra.json antes de gravar.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { inflateRawSync, deflateRawSync, crc32 } from "node:zlib";
import { dirname } from "node:path";

const TURKEY_ZIP = "vendor/DDT-6600/WebSimple/Flash_6600_v040/ui/turkey/language.png";
const OUR_41 = "data/i18n/pt-BR/client-language.txt";
const EXTRA_JSON = "data/i18n/pt-BR/lang-6600-extra.json";
const OUT_TXT = "data/i18n/pt-BR/client-language-6600.txt";
const OUT_ZIP = "apps/api/assets/flash6600/ui/turkey/language.png";
const UNTRANSLATED_REPORT = "research/i18n/lang-6600-untranslated.json";
const UNTRANSLATED_PAIRS_REPORT = "research/i18n/lang-6600-untranslated-pairs.json"; // key -> valor turco (p/ tools/i18n/mt-6600.mjs
const ZIP_ENTRY_NAME = "language.txt"; // confirmado lendo o central directory do zip original (1 entrada)

// --- zip (store de 1 entrada só, igual ao original) --------------------------------------------------
function readZipSingleEntry(path) {
  const buf = readFileSync(path);
  if (buf.readUInt32LE(0) !== 0x04034b50) throw new Error(`${path}: não é um zip (assinatura local ausente)`);
  const method = buf.readUInt16LE(8);
  const compSize = buf.readUInt32LE(18);
  const nameLen = buf.readUInt16LE(26);
  const extraLen = buf.readUInt16LE(28);
  const name = buf.toString("utf8", 30, 30 + nameLen);
  const dataStart = 30 + nameLen + extraLen;
  const comp = buf.subarray(dataStart, dataStart + compSize);
  const data = method === 0 ? comp : inflateRawSync(comp);
  return { name, data };
}

function dosDateTime(d = new Date()) {
  const time = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff;
  const date = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
  return { time, date };
}

function writeZipSingleEntry(path, entryName, data) {
  const { time, date } = dosDateTime();
  const nameBuf = Buffer.from(entryName, "utf8");
  const comp = deflateRawSync(data, { level: 9 });
  const crc = crc32(data);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0, 6);
  local.writeUInt16LE(8, 8);
  local.writeUInt16LE(time, 10);
  local.writeUInt16LE(date, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(comp.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  local.writeUInt16LE(0, 28);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0, 8);
  central.writeUInt16LE(8, 10);
  central.writeUInt16LE(time, 12);
  central.writeUInt16LE(date, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(comp.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(nameBuf.length, 28);
  central.writeUInt16LE(0, 30);
  central.writeUInt16LE(0, 32);
  central.writeUInt16LE(0, 34);
  central.writeUInt16LE(0, 36);
  central.writeUInt32LE(0, 38);
  central.writeUInt32LE(0, 42);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(central.length + nameBuf.length, 12); // tamanho do central directory inclui o nome do arquivo
  eocd.writeUInt32LE(local.length + nameBuf.length + comp.length, 16);
  eocd.writeUInt16LE(0, 20);

  const out = Buffer.concat([local, nameBuf, comp, central, nameBuf, eocd]);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, out);
  return out.length;
}

// --- parser (espelha LanguageAnalyzer.as) -------------------------------------------------------------
const unescapeNL = (s) => s.replace(/\\r/g, "\r").replace(/\\n/g, "\n");
const escapeNL = (s) => s.replace(/\r/g, "\\r").replace(/\n/g, "\\n");
const trimRight = (s) => s.replace(/\s+$/, "");

/** Map chave -> valor decodificado (ultima ocorrencia vence, igual Dictionary do AS3). Usado pra ler
 *  nosso client-language.txt (4.1) como dicionario de lookup. */
function parseDecoded(text) {
  const lines = text.replace(/^﻿/, "").split("\r\n");
  const map = new Map();
  for (const raw of lines) {
    if (raw.indexOf("#") === 0) continue;
    const un = unescapeNL(raw);
    const idx = un.indexOf(":");
    if (idx === -1) continue;
    const key = un.slice(0, idx);
    const value = trimRight(un.slice(idx + 1).split("##")[0]);
    map.set(key, value);
  }
  return map;
}

/** Lista de linhas FISICAS (uma por elemento), classificadas; preserva tudo que o parser real ignora
 *  (comentario, linha sem ":", linha em branco, continuacao orfa) pra manter contagem/ordem == original. */
function parseLines(text) {
  const lines = text.replace(/^﻿/, "").split("\r\n");
  return lines.map((raw) => {
    if (raw.indexOf("#") === 0) return { raw, kind: "comment" };
    const un = unescapeNL(raw);
    const idx = un.indexOf(":");
    if (idx === -1) return { raw, kind: "other" };
    const key = un.slice(0, idx);
    const value = trimRight(un.slice(idx + 1).split("##")[0]);
    return { raw, kind: "kv", key, value };
  });
}

// --- main ----------------------------------------------------------------------------------------------
const dry = process.argv.includes("--dry");

const { name: zipEntryName, data: zipData } = readZipSingleEntry(TURKEY_ZIP);
if (zipEntryName !== ZIP_ENTRY_NAME) console.warn(`aviso: entrada do zip original chama-se "${zipEntryName}", esperava "${ZIP_ENTRY_NAME}"`);
const turkText = zipData.toString("utf8");
const lines = parseLines(turkText);

const ours41 = parseDecoded(readFileSync(OUR_41, "utf8"));
const extra = existsSync(EXTRA_JSON) ? JSON.parse(readFileSync(EXTRA_JSON, "utf8")) : {};

let fromExtraLines = 0, from41Lines = 0, untranslatedLines = 0;
const keysFromExtra = new Set(), keysFrom41 = new Set(), keysUntranslated = new Set(), allKeys = new Set();
const untranslatedPairs = {}; // chave -> valor turco decodificado (pro MT em tools/i18n/mt-6600.mjs)

const outLines = lines.map((l) => {
  // linhas "other" (orfas/em branco, sobra de multi-linha turco quebrado, ver cabecalho) sao inertes —
  // o parser real nunca le (sem ":"), mas ainda saem no arquivo; troca so a marca ("Bombom" nunca fica,
  // AGENTS.md) sem tentar traduzir o resto (texto morto, nao vale o esforco).
  if (l.kind !== "kv") return l.kind === "other" ? l.raw.replace(/\bBombom\b/g, "DDTank") : l.raw;
  allKeys.add(l.key);
  if (Object.prototype.hasOwnProperty.call(extra, l.key)) {
    fromExtraLines++;
    keysFromExtra.add(l.key);
    return `${l.key}:${escapeNL(extra[l.key])}`;
  }
  if (ours41.has(l.key)) {
    from41Lines++;
    keysFrom41.add(l.key);
    return `${l.key}:${escapeNL(ours41.get(l.key))}`;
  }
  untranslatedLines++;
  keysUntranslated.add(l.key);
  untranslatedPairs[l.key] = l.value;
  return l.raw;
});

const outText = outLines.join("\r\n");
const summary = {
  totalLines: lines.length,
  kvLines: lines.filter((l) => l.kind === "kv").length,
  uniqueKeys: allKeys.size,
  "from-41": { lines: from41Lines, uniqueKeys: keysFrom41.size },
  "from-extra": { lines: fromExtraLines, uniqueKeys: keysFromExtra.size },
  untranslated: { lines: untranslatedLines, uniqueKeys: keysUntranslated.size },
};
console.log(JSON.stringify(summary, null, 2));

// sempre grava os relatorios de pendencia (ate em --dry: tools/i18n/mt-6600.mjs consome o pairs report pra
// traduzir o que falta antes do proximo full-run deste script).
mkdirSync(dirname(UNTRANSLATED_REPORT), { recursive: true });
writeFileSync(UNTRANSLATED_REPORT, JSON.stringify([...keysUntranslated].sort(), null, 1));
writeFileSync(UNTRANSLATED_PAIRS_REPORT, JSON.stringify(untranslatedPairs, null, 1));
console.log(`${keysUntranslated.size} chaves ainda sem traducao -> ${UNTRANSLATED_REPORT} / ${UNTRANSLATED_PAIRS_REPORT}`);

if (dry) process.exit(0);

mkdirSync(dirname(OUT_TXT), { recursive: true });
writeFileSync(OUT_TXT, outText);
const zipBytes = writeZipSingleEntry(OUT_ZIP, ZIP_ENTRY_NAME, Buffer.from(outText, "utf8"));
console.log(`escrito: ${OUT_TXT} (${outText.length} bytes), ${OUT_ZIP} (${zipBytes} bytes zip)`);
