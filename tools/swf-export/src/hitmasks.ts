/**
 * Máscaras de clique pras formas invisíveis.
 *
 * No Flash é comum desenhar a "área de clique" de um botão/prédio como uma
 * forma com preenchimento 100% transparente: o Flash testa a GEOMETRIA (não o
 * alfa) e o clique funciona. No PNG exportado essa forma é só transparência —
 * o hit-test por alfa do cliente nunca acerta.
 *
 * Pra cada forma com alfa máximo 0, este passo exporta o vetor (SVG) pelo
 * FFDec, força o preenchimento opaco e grava `shapes/<id>.hit.png`; o
 * `library.json` ganha `hit` no caractere e o cliente testa o clique nele.
 *
 *   cd tools/swf-export && npx tsx src/hitmasks.ts [--only swf/hall] [--force]
 *
 * Retoma de onde parou: biblioteca já vista ganha `hitChecked: true`.
 */
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import type { LibraryT } from "../../../packages/flash/src/swf/library-types.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "../../..");
const MAIN_REPO = existsSync(join(REPO, "vendor/_tools")) ? REPO : join(REPO, "../../..");
const FFDEC = join(MAIN_REPO, "vendor/_tools/ffdec/ffdec-cli.jar");
const OUT = join(REPO, "apps/client/public/assets");
const TMP = join(REPO, "tools/swf-export/.tmp-hit");

const run = (args: string[]) => new Promise<void>((res, rej) => execFile("java", ["-Xmx1g", "-jar", FFDEC, ...args], { maxBuffer: 64 << 20 }, (e) => (e ? rej(e) : res())));

const FORCE = process.argv.includes("--force");

async function maxAlpha(file: string): Promise<number> {
  const s = await sharp(file).stats();
  return s.channels[3]?.max ?? 255;
}

async function one(key: string): Promise<number> {
  const dir = join(OUT, key);
  const libFile = join(dir, "library.json");
  const lib = JSON.parse(readFileSync(libFile, "utf8")) as LibraryT & { hitChecked?: boolean };
  // já processada numa rodada anterior (o exportador reescreve o library.json, o que zera a marca)
  if (lib.hitChecked && !FORCE) return 0;
  const done = (): void => { lib.hitChecked = true; writeFileSync(libFile, JSON.stringify(lib)); };
  const invisible: number[] = [];
  for (const [id, c] of Object.entries(lib.chars)) {
    if (c.k !== "shape" || !c.img || (c as any).hit) continue;
    const f = join(dir, c.img);
    if (existsSync(f) && (await maxAlpha(f)) === 0) invisible.push(Number(id));
  }
  if (!invisible.length) { done(); return 0; }
  let swf = join(MAIN_REPO, lib.swf);
  if (!existsSync(swf)) swf = join(REPO, lib.swf);
  if (!existsSync(swf)) { console.warn(`${key}: SWF de origem não achado (${lib.swf})`); return 0; }
  const tmp = join(TMP, key);
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  let src = swf;
  if (/\.png$/i.test(swf)) {
    const buf = readFileSync(swf);
    src = join(tmp, "in.swf");
    writeFileSync(src, buf.subarray(buf.subarray(0, 5).toString("latin1") === "road7" ? 37 : 0));
  }
  await run(["-format", "shape:svg", "-selectid", invisible.join(","), "-export", "shape", tmp, src]);
  let n = 0;
  for (const id of invisible) {
    // FFDec põe em <tmp>/shapes/ ou direto em <tmp>/ (depende de quantas formas)
    const svgDir = existsSync(join(tmp, "shapes")) ? join(tmp, "shapes") : tmp;
    const svgFile = readdirSync(svgDir).find((f) => parseInt(f, 10) === id && f.endsWith(".svg"));
    if (!svgFile) continue;
    let svg = readFileSync(join(svgDir, svgFile), "utf8");
    // tudo opaco: fill-opacity/opacity → 1, cor preta onde não tiver
    svg = svg.replace(/(fill-)?opacity="[^"]*"/g, (m, f) => `${f ?? ""}opacity="1"`).replace(/fill="none"/g, 'fill="#000"');
    const c = lib.chars[id] as any;
    const png = c.img.replace(/\.png$/, ".hit.png");
    const meta = await sharp(join(dir, c.img)).metadata();
    await sharp(Buffer.from(svg)).resize(meta.width, meta.height, { fit: "fill" }).png().toFile(join(dir, png));
    c.hit = png;
    n++;
  }
  done();
  rmSync(tmp, { recursive: true, force: true });
  return n;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const only = args.includes("--only") ? args[args.indexOf("--only") + 1]! : "";
  const keys = (JSON.parse(readFileSync(join(OUT, "index.json"), "utf8")) as string[]).filter((k) => k.includes(only));
  let total = 0;
  for (const k of keys) {
    try {
      const n = await one(k);
      if (n) console.log(`${k}: ${n} máscaras de clique`);
      total += n;
    } catch (e) {
      console.error(`${k}: ${(e as Error).message.split("\n")[0]}`);
    }
  }
  console.log(`total: ${total} máscaras`);
}

main();
