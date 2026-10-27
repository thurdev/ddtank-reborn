/**
 * Conversor SWF → assets do cliente PixiJS (roda UMA vez; o jogo não usa SWF).
 *
 *   cd tools/swf-export && npx tsx src/main.ts [--only hall] [--force] [--set ui|resource|all]
 *
 * Pra cada SWF:
 *   1. FFDec `-swf2xml`  → estrutura (timelines, posições, filtros, textos)
 *   2. FFDec `-export`   → PNG das formas/bitmaps, MP3 dos sons, SVG dos textos estáticos
 *   3. FFDec `-export script` → classes AS3 do SWF (linkage + frame scripts)
 *   4. escreve `apps/client/public/assets/<caminho>/library.json` + imagens
 *   5. classes com código (frame scripts) viram TS em
 *      `apps/client/src/swf-classes/<caminho>/` (feito por swf-classes.ts)
 *
 * Fontes de SWF (prioridade: tradução PT-BR do overlay do servidor > original):
 *   - UI/core:  apps/api/assets/flash/**  >  vendor/DDTank41/Source Flash/FlashSV1/**
 *   - recursos: vendor/_assets/merged/**   (image/game/living, bombas, efeitos...)
 */
import { execFile } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import type { LibraryT } from "../../../packages/flash/src/swf/library-types.ts";
import { buildLibrary, type ImageIndex } from "./library.ts";
import { readClasses } from "./swf-classes.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO = join(HERE, "../../..");
const MAIN_REPO = existsSync(join(REPO, "vendor/_tools")) ? REPO : join(REPO, "../../..");
const FFDEC = join(MAIN_REPO, "vendor/_tools/ffdec/ffdec-cli.jar");
// SWF_EXPORT_OUT: pra testar sem escrever na junction de assets de verdade
// (ex. `SWF_EXPORT_OUT=tools/swf-export/.verify-out` — ver docs/client-pixi/ASSETS.md).
const OUT = process.env.SWF_EXPORT_OUT ? join(REPO, process.env.SWF_EXPORT_OUT) : join(REPO, "apps/client/public/assets");
const TMP = join(REPO, "tools/swf-export/.tmp");

interface Source {
  /** arquivo SWF */
  file: string;
  /** caminho como o cliente pede (sem extensão): flash/ui/vietnam/swf/hall */
  key: string;
}

function walk(dir: string, filter: (f: string) => boolean, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, filter, out);
    else if (filter(p)) out.push(p);
  }
  return out;
}

/** SWFs da UI/núcleo (FLASHSITE) */
function uiSources(): Source[] {
  const vendorRoot = join(MAIN_REPO, "vendor/DDTank41/Source Flash/FlashSV1");
  const overlay = join(REPO, "apps/api/assets/flash");
  const isSwf = (f: string) => /\.swf$/i.test(f) || /[\\/](1|3)\.png$/i.test(f);
  const map = new Map<string, Source>();
  for (const f of walk(vendorRoot, isSwf)) {
    const rel = relative(vendorRoot, f).split(sep).join("/");
    if (/Launcher.swf$/i.test(rel)) continue;
    map.set(rel.toLowerCase(), { file: f, key: "flash/" + rel.replace(/\.(swf|png)$/i, "") });
  }
  for (const f of walk(overlay, isSwf)) {
    const rel = relative(overlay, f).split(sep).join("/");
    if (/Launcher.swf$/i.test(rel)) continue;
    map.set(rel.toLowerCase(), { file: f, key: "flash/" + rel.replace(/\.(swf|png)$/i, "") });
  }
  // o cliente baixa tudo em minúsculas (LoaderManager.creatLoader faz toLowerCase na URL)
  return [...map.values()].map((s) => ({ ...s, key: s.key.toLowerCase() }));
}

/** SWFs do pacote de recursos (SITE) */
function resourceSources(): Source[] {
  const root = join(MAIN_REPO, "vendor/_assets/merged");
  return walk(root, (f) => /\.swf$/i.test(f)).map((f) => ({
    file: f,
    key: ("resource/" + relative(root, f).split(sep).join("/").replace(/\.swf$/i, "")).toLowerCase(),
  }));
}

/** roda o FFDec (assíncrono: vários SWFs em paralelo com --jobs) */
function ffdec(args: string[]): Promise<void> {
  return new Promise((res, rej) => {
    execFile("java", ["-Xmx1g", "-jar", FFDEC, ...args], { maxBuffer: 64 << 20 }, (err) => (err ? rej(err) : res()));
  });
}

/** id numérico no começo do nome do arquivo exportado (`13.png`, `10_asset.x.png`) */
function indexDir(dir: string): Map<number, string> {
  const m = new Map<number, string>();
  if (!existsSync(dir)) return m;
  for (const n of readdirSync(dir)) {
    const id = parseInt(n, 10);
    if (!Number.isNaN(id)) m.set(id, n);
  }
  return m;
}

async function exportOne(src: Source, force: boolean, warnings: string[]): Promise<LibraryT | null> {
  const out = join(OUT, src.key);
  const libFile = join(out, "library.json");
  if (!force && existsSync(libFile) && statSync(libFile).mtimeMs > statSync(src.file).mtimeMs) return null;
  const tmp = join(TMP, src.key);
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  const warn = (m: string) => warnings.push(`${src.key}: ${m}`);

  // FFDec não abre .png (1.png/3.png são SWF com cabeçalho road7 opcional): copia com extensão .swf
  let swfFile = src.file;
  if (/\.png$/i.test(swfFile)) {
    const buf = readFileSync(swfFile);
    const start = buf.subarray(0, 5).toString("latin1") === "road7" ? 37 : 0;
    swfFile = join(tmp, "input.swf");
    writeFileSync(swfFile, buf.subarray(start));
  }

  await ffdec(["-swf2xml", swfFile, join(tmp, "swf.xml")]);
  await ffdec(["-format", "shape:png,image:png_gif_jpeg,text:svg,morphshape:svg,sound:mp3_wav_flv,binaryData:raw", "-export", "shape,image,text,morphshape,sound,binaryData", tmp, swfFile]);
  try { await ffdec(["-export", "script", join(tmp, "scripts"), swfFile]); } catch { /* sem ABC */ }

  mkdirSync(out, { recursive: true });
  for (const d of ["shapes", "images", "sounds", "binaryData"]) {
    if (existsSync(join(tmp, d))) cpSync(join(tmp, d), join(out, d), { recursive: true });
  }
  // textos estáticos: SVG → PNG
  const texts = new Map<number, string>();
  if (existsSync(join(tmp, "texts"))) {
    mkdirSync(join(out, "texts"), { recursive: true });
    for (const n of readdirSync(join(tmp, "texts"))) {
      if (!n.endsWith(".svg")) continue;
      const id = parseInt(n, 10);
      const svg = readFileSync(join(tmp, "texts", n));
      if (!/<path|<use|<image/.test(svg.toString())) continue;
      const png = n.replace(/\.svg$/, ".png");
      try { await sharp(svg).png().toFile(join(out, "texts", png)); texts.set(id, `texts/${png}`); }
      catch (e) { warn(`texto ${id}: ${(e as Error).message}`); }
    }
  }
  const morphs = new Map<number, string>();
  if (existsSync(join(tmp, "morphshapes"))) {
    mkdirSync(join(out, "morphshapes"), { recursive: true });
    for (const n of readdirSync(join(tmp, "morphshapes"))) {
      if (!n.endsWith(".svg")) continue;
      const id = parseInt(n, 10);
      const png = n.replace(/\.svg$/, ".png");
      try { await sharp(readFileSync(join(tmp, "morphshapes", n))).png().toFile(join(out, "morphshapes", png)); morphs.set(id, `morphshapes/${png}`); }
      catch (e) { warn(`morph ${id}: ${(e as Error).message}`); }
    }
  }
  const prefix = (d: string, m: Map<number, string>) => new Map([...m].map(([k, v]) => [k, `${d}/${v}`] as const));
  const imagesDir = indexDir(join(tmp, "images"));
  // DefineBitsJPEG* não traz bitmapWidth/bitmapHeight no swf2xml do FFDec (só DefineBitsLossless*
  // traz): lê o tamanho real do PNG/JPEG/GIF exportado pra todo bitmap, não só os lossless.
  const imageSizes = new Map<number, [number, number]>();
  for (const [id, name] of imagesDir) {
    try {
      const meta = await sharp(join(tmp, "images", name)).metadata();
      if (meta.width && meta.height) imageSizes.set(id, [meta.width, meta.height]);
    } catch { /* formato que o sharp não lê (raro); fica sem tamanho conhecido */ }
  }
  const imgs: ImageIndex = {
    shapes: prefix("shapes", indexDir(join(tmp, "shapes"))),
    images: prefix("images", imagesDir),
    imageSizes,
    sounds: prefix("sounds", indexDir(join(tmp, "sounds"))),
    binary: prefix("binaryData", indexDir(join(tmp, "binaryData"))),
    texts,
    morphs,
  };
  const lib = buildLibrary(readFileSync(join(tmp, "swf.xml"), "utf8"), relative(MAIN_REPO, src.file).split(sep).join("/"), imgs, warn);
  // classe base de cada linkage (pelo código exportado)
  const classes = readClasses(join(tmp, "scripts"), src.key, warn);
  for (const [name, info] of Object.entries(lib.classes)) {
    const found = classes.get(name);
    info.base = found?.base ?? guessBase(lib, info.id);
    // frame scripts da própria classe do caractere (addFrameScript do ABC embutido,
    // ex. "stand" com stop()/gotoAndPlay no fim do segmento) — ver swf-classes.ts
    if (found?.frameScripts?.size) {
      const ch = lib.chars[info.id];
      if (ch?.k === "sprite") ch.tl.fs = Object.fromEntries(found.frameScripts);
    }
  }
  writeFileSync(libFile, JSON.stringify(lib));
  rmSync(tmp, { recursive: true, force: true });
  return lib;
}

/** sem script: deduz pelo tipo do caractere */
function guessBase(lib: LibraryT, id: number): string {
  const c = lib.chars[id];
  switch (c?.k) {
    case "bitmap": return "flash.display.BitmapData";
    case "sound": return "flash.media.Sound";
    case "button": return "flash.display.SimpleButton";
    case "font": return "flash.text.Font";
    case "binary": return "flash.utils.ByteArray";
    default: return "flash.display.MovieClip";
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : undefined;
  const force = args.includes("--force");
  const set = args.includes("--set") ? args[args.indexOf("--set") + 1] : "ui";
  let sources: Source[] = [];
  if (set === "ui" || set === "all") sources.push(...uiSources());
  if (set === "resource" || set === "all") sources.push(...resourceSources());
  if (only) sources = sources.filter((s) => s.key.toLowerCase().includes(only.toLowerCase()));
  console.log(`${sources.length} SWFs`);
  const warnings: string[] = [];
  let done = 0, fail = 0;
  const t0 = Date.now();
  const jobs = args.includes("--jobs") ? Number(args[args.indexOf("--jobs") + 1]) : 4;
  const queue = [...sources];
  const worker = async () => {
    for (let s = queue.shift(); s; s = queue.shift()) {
      await one(s);
    }
  };
  const one = async (s: Source) => {
    try {
      const lib = await exportOne(s, force, warnings);
      done++;
      if (lib) console.log(`[${done}/${sources.length}] ${s.key}: ${Object.keys(lib.chars).length} caracteres, ${Object.keys(lib.classes).length} classes`);
    } catch (e) {
      fail++;
      warnings.push(`${s.key}: FALHOU ${(e as Error).message.split("\n")[0]}`);
      console.error(`FALHOU ${s.key}: ${(e as Error).message.split("\n")[0]}`);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, jobs) }, worker));
  mkdirSync(OUT, { recursive: true });
  // índice de todas as bibliotecas exportadas (o cliente decide se URL é "SWF" ou imagem)
  const keys = walk(OUT, (f) => f.endsWith("library.json")).map((f) => relative(OUT, dirname(f)).split(sep).join("/")).sort();
  writeFileSync(join(OUT, "index.json"), JSON.stringify(keys));
  writeFileSync(join(OUT, "EXPORT-REPORT.txt"), [`${done} ok, ${fail} falhas, ${Math.round((Date.now() - t0) / 1000)}s`, ...warnings].join("\n"));
  console.log(`ok ${done}, falhas ${fail}, avisos ${warnings.length} (ver ${relative(REPO, join(OUT, "EXPORT-REPORT.txt"))})`);
}

main();
