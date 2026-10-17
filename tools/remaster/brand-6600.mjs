#!/usr/bin/env node
/**
 * brand-6600.mjs — troca a marca "Bombom"/"DEVELOP BY ASUNA" do cliente DDT-6600 (origem turca) pela marca
 * DDTank Reborn, sem mexer no vendor (read-only). Escreve as cópias já corrigidas em
 * apps/api/assets/flash6600/<mesmo caminho relativo>, que o static.ts (`flash6600Fix`) serve por cima do
 * pack original (vendor/DDT-6600/WebSimple/Flash_6600_v040).
 *
 * O que troca (achado em research/6600/dump/*, ver docs/CLIENT.md §6600):
 *   - Loading.swf           chid 26 (DefineBitsLossless2, 529x269): logo "Bombom" + moldura da barra de progresso
 *                            chid 18/31 (DefineEditText, fonte "Arial" embutida): texto "Yükleniyor" -> "Carregando"
 *   - DDT_Loading.swf        chid 42 (mesma arte, 529x269); chid 18/47 "Yükleniyor" -> "Carregando"
 *   - DDT_Loading1.swf       idem DDT_Loading.swf (mesmos charIds)
 *   - ui/turkey/swf/loading.swf   chid 18 (533x515, moldura "janela" com guirlanda) e chid 34 (1000x600, cena
 *                            cheia) têm o logo "Bombom II" pintado dentro da arte (não dá pra recortar limpo
 *                            como nos outros); aqui a imagem é borrada+achatada sob a área do logo (perde a
 *                            transparência ali, cor de fundo amostrada à mão) e a logo nova entra por cima.
 *                            Texto desse arquivo já está em chinês ("正在加载" = "carregando"), não em turco —
 *                            fora do escopo (só troca texto turco "Yükleniyor[...]").
 *   - smallNote.txt          fica em WebSimple/ (um nível ACIMA do pack, igual md5.xml/characterDefine.xml —
 *                            ver static.ts rota /flash6600/* fallback `top`), não dentro de Flash_6600_v040.
 *                            Conteúdo é só "DEVELOP BY ASUNA", carregado via URLLoader por algum SWF de boot
 *                            e mostrado como legenda solta (não é um DefineText de nenhum SWF testado). Troca
 *                            por arquivo vazio — o static.ts acha o overlay antes do fallback pro vendor.
 *
 * Checados e sem marca (não precisam de patch): 22.swf (só ABC/código, 0 imagens), 22.png (não é SWF válido —
 * bytes != 22.swf apesar do mesmo tamanho, provavelmente lixo/binário não usado pelo boot; não mexe, risco >
 * benefício), 1.png (launcher de registro, sem Bombom/ASUNA), ui/turkey/swf/firstcore.swf (ícones de UI do
 * hall, sem logo), newhandopencartoon.swf (diálogo do tutorial em turco — é história do jogo, não marca do
 * servidor, fora do escopo deste patch).
 *
 * Uso:
 *   node tools/remaster/brand-6600.mjs            # gera tudo + apps/api/assets/flash6600/*
 *   node tools/remaster/brand-6600.mjs --sheet     # idem + contact sheet antes/depois em
 *                                                   #   research/6600/brand-review.jpg
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const VENDOR = join(ROOT, "vendor", "DDT-6600", "WebSimple", "Flash_6600_v040");
const VENDOR_SITE = join(ROOT, "vendor", "DDT-6600", "WebSimple"); // um nível acima do pack (smallNote.txt)
const OUT = join(ROOT, "apps", "api", "assets", "flash6600");
const LOGO = join(ROOT, "apps", "web", "public", "play", "logo.webp");
const FFDEC_JAR = join(ROOT, "vendor", "_tools", "ffdec", "ffdec-cli.jar");
const SCRATCH = join(ROOT, "node_modules", ".cache", "ddt-brand-6600");

const SHEET = process.argv.includes("--sheet");

function log(section, msg) {
  console.log(`[${section}] ${msg}`);
}

function ffdec(args) {
  return execFileSync("java", ["-jar", FFDEC_JAR, ...args], { stdio: "pipe", encoding: "utf8", cwd: ROOT });
}

/** Exporta todas as imagens de um SWF pro scratch e devolve o caminho do PNG de um charId específico. */
function exportImage(swfPath, chid, label) {
  const dir = join(SCRATCH, `${label}.img`);
  rmSync(dir, { recursive: true, force: true });
  ffdec(["-export", "image", dir, swfPath]);
  const files = existsSync(dir) ? readdirSync(dir) : [];
  const hit = files.find((f) => f === `${chid}.png` || f.startsWith(`${chid}_`) || f.startsWith(`${chid}.`));
  if (!hit) throw new Error(`charId ${chid} não achado em ${label} (arquivos: ${files.join(", ")})`);
  return join(dir, hit);
}

// --- composição das imagens (sharp) ---------------------------------------------------------------------

/** Logo DDTank Reborn, "contain" (mantém proporção, fundo transparente) numa caixa boxW x boxH. */
async function containLogo(boxW, boxH) {
  return sharp(LOGO)
    .resize({ width: boxW, height: boxH, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

/** Máscara retangular com cantos bem suaves (branco = opaco), usada pra mesclar o remendo borrado com a
 *  arte original sem deixar costura dura na borda da área trocada. */
async function featherMask(w, h, feather) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${feather}"/></filter></defs>
    <rect x="${feather}" y="${feather}" width="${w - feather * 2}" height="${h - feather * 2}" rx="${feather}" fill="white" filter="url(#b)"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Caso simples (Loading.swf/DDT_Loading*.swf): a imagem inteira é só "logo Bombom" (topo, fundo
 *  transparente) + moldura decorativa da barra de progresso (baixo, sem texto). Corta no splitY, mantém a
 *  moldura de baixo intacta e troca só a parte de cima pela logo nova (contain, centralizada). */
async function splitLogo(srcPath, splitY, outPath) {
  const meta = await sharp(srcPath).metadata();
  const bottom = await sharp(srcPath)
    .extract({ left: 0, top: splitY, width: meta.width, height: meta.height - splitY })
    .png()
    .toBuffer();
  const logo = await containLogo(meta.width, splitY);
  const logoMeta = await sharp(logo).metadata();
  const logoX = Math.round((meta.width - logoMeta.width) / 2);
  const logoY = Math.round((splitY - logoMeta.height) / 2);
  await sharp({ create: { width: meta.width, height: meta.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: logo, left: logoX, top: logoY },
      { input: bottom, left: 0, top: splitY },
    ])
    .png()
    .toFile(outPath);
  return outPath;
}

/** Caso complexo (ui/turkey/swf/loading.swf): o logo "Bombom II" está pintado dentro da cena (sem fundo
 *  transparente ali), então não dá pra só recortar. Achata a imagem contra `flattenBg` (cor aproximada do
 *  fundo logo atrás do texto — remove o canal alfa, pra o blur não diluir a opacidade puxando transparência
 *  de longe) + borra bem forte (sigma alto, apaga as letras), recorta a bbox, mescla de volta com máscara de
 *  cantos suaves (feather pequeno e FIXO em relação ao tamanho da caixa — um feather grande em caixa baixa
 *  dilui a opacidade também no centro, mesmo problema do flatten) e põe a logo nova por cima, menor que a
 *  bbox (90%) pra sobrar uma margem borrada ao redor como moldura.
 *
 *  O achatamento (`flatten`) tira o canal alfa original pra o blur não diluir opacidade, mas isso também
 *  preenche de sólido os cantos que eram transparentes de propósito (moldura arredondada/em arco) -- viraria
 *  um retângulo feio contra qualquer fundo que não seja branco. Corrige multiplicando o remendo pelo alfa
 *  ORIGINAL (não borrado) da própria imagem, além da máscara de cantos suaves: só fica opaco onde a arte já
 *  era opaca (ou na transição), fora da silhueta continua transparente igual o original. */
async function patchLogo(srcPath, bbox, outPath, { blurSigma, flattenBg, feather = 10, logoScale = 0.85 }) {
  const blurredPatch = await sharp(srcPath).flatten({ background: flattenBg }).blur(blurSigma).extract(bbox).png().toBuffer();
  const mask = await featherMask(bbox.width, bbox.height, feather);
  // extrai o alfa original (bbox) como buffer bruto de 1 canal e remonta como PNG branco+esse alfa
  // (dest-in olha o canal alfa do input, não a luminância -- não dá pra usar a imagem em tons de cinza direto)
  const alphaRaw = await sharp(srcPath).extract(bbox).ensureAlpha().extractChannel("alpha").blur(3).raw().toBuffer();
  const originalAlpha = await sharp({ create: { width: bbox.width, height: bbox.height, channels: 3, background: { r: 255, g: 255, b: 255 } } })
    .raw()
    .toBuffer()
    .then((whiteRgb) =>
      sharp(whiteRgb, { raw: { width: bbox.width, height: bbox.height, channels: 3 } })
        .joinChannel(alphaRaw, { raw: { width: bbox.width, height: bbox.height, channels: 1 } })
        .png()
        .toBuffer(),
    );
  const maskedPatch = await sharp(blurredPatch)
    .composite([
      { input: mask, blend: "dest-in" },
      { input: originalAlpha, blend: "dest-in" },
    ])
    .png()
    .toBuffer();
  const logo = await containLogo(Math.round(bbox.width * logoScale), Math.round(bbox.height * logoScale));
  const logoMeta = await sharp(logo).metadata();
  const logoX = bbox.left + Math.round((bbox.width - logoMeta.width) / 2);
  const logoY = bbox.top + Math.round((bbox.height - logoMeta.height) / 2);
  await sharp(srcPath)
    .composite([
      { input: maskedPatch, left: bbox.left, top: bbox.top },
      { input: logo, left: logoX, top: logoY },
    ])
    .png()
    .toFile(outPath);
  return outPath;
}

// --- texto (ffdec -replace nativo, mesmo padrão do tools/i18n/build-client-art.mjs) ----------------------

/** Troca charIds de texto/imagem num SWF num único -replace e confere se o texto pegou (ffdec às vezes
 *  falha silencioso em single-run replace). `images`: [{chid, file}] (formato lossless2, preserva alfa);
 *  `texts`: [{chid, text}]. */
function replaceAndVerify(inSwf, outSwf, { images = [], texts = [] }) {
  mkdirSync(dirname(outSwf), { recursive: true });
  mkdirSync(SCRATCH, { recursive: true });
  const args = [inSwf, outSwf];
  for (const { chid, file, format = "lossless2" } of images) args.push(String(chid), file, format);
  const textFiles = texts.map(({ chid, text }) => {
    const f = join(SCRATCH, `text.${chid}.txt`);
    writeFileSync(f, text, "utf8");
    args.push(String(chid), f);
    return { chid, file: f, text };
  });
  ffdec(["-replace", ...args]);

  // confere o SWF ainda abre
  ffdec(["-dumpSWF", outSwf]);

  // confere o texto realmente mudou
  if (texts.length) {
    const verifyDir = join(SCRATCH, "verify-text");
    rmSync(verifyDir, { recursive: true, force: true });
    ffdec(["-export", "text", verifyDir, outSwf]);
    for (const { chid, text } of texts) {
      const got = readFileSync(join(verifyDir, `${chid}.txt`), "utf8").replace(/\r?\n+$/, "");
      if (got !== text) throw new Error(`texto chid ${chid} não bateu: esperado ${JSON.stringify(text)}, veio ${JSON.stringify(got)}`);
    }
  }
  log("replace", `${outSwf.replace(ROOT + "\\", "")}: ${images.length} imagem(ns) + ${texts.length} texto(s) OK`);
}

// --- pipeline por arquivo ---------------------------------------------------------------------------------

const CARREGANDO = "Carregando";

async function patchFlatLoading(relSwf, imgChid, textChids) {
  const src = join(VENDOR, relSwf);
  const label = relSwf.replace(/[\\/]/g, "_");
  const imgSrc = exportImage(src, imgChid, label);
  const imgOut = join(SCRATCH, `${label}.logo.png`);
  await splitLogo(imgSrc, 190, imgOut);
  const out = join(OUT, relSwf);
  replaceAndVerify(src, out, {
    images: [{ chid: imgChid, file: imgOut }],
    texts: textChids.map((chid) => ({ chid, text: CARREGANDO })),
  });
  return { relSwf, imgChid, textChids, imgOut };
}

async function patchTurkeyLoading() {
  const relSwf = join("ui", "turkey", "swf", "loading.swf");
  const src = join(VENDOR, relSwf);
  const label = "ui_turkey_loading";

  const img18Src = exportImage(src, 18, label);
  const img18Out = join(SCRATCH, `${label}.18.png`);
  await patchLogo(img18Src, { left: 0, top: 0, width: 533, height: 140 }, img18Out, {
    blurSigma: 70,
    flattenBg: { r: 232, g: 240, b: 245 }, // branco-gelo do vitral atrás do logo
    feather: 10,
  });

  const img34Src = exportImage(src, 34, label);
  const img34Out = join(SCRATCH, `${label}.34.png`);
  await patchLogo(img34Src, { left: 0, top: 0, width: 490, height: 160 }, img34Out, {
    blurSigma: 55,
    flattenBg: { r: 230, g: 150, b: 60 }, // céu laranja/bokeh atrás do logo
    feather: 10,
  });

  const out = join(OUT, relSwf);
  replaceAndVerify(src, out, {
    // lossless2 (PNG com alfa): testei "jpeg3" pra tentar economizar tamanho (originais eram
    // DefineBitsJPEG3), mas o FFDec CLI embute PNG dentro do tag JPEG3 de qualquer forma quando a entrada
    // tem canal alfa (não teve ganho nenhum de tamanho, 1.5MB+ igual) -- lossless2 é mais simples e dá o
    // mesmo resultado. SWF final fica maior que o vendor (249KB -> ~2MB, imagens grandes 533x515/1000x600
    // sem compressão com perda); aceitável pra uma tela de loading secundária, mas fica registrado.
    images: [
      { chid: 18, file: img18Out },
      { chid: 34, file: img34Out },
    ],
    texts: [], // texto daqui já é chinês "正在加载" (carregando), não turco -- fora do escopo (só Yükleniyor)
  });
  return { relSwf, imgChids: [18, 34] };
}

function patchSmallNote() {
  const src = join(VENDOR_SITE, "smallNote.txt");
  const original = existsSync(src) ? readFileSync(src, "utf8") : null;
  const outPath = join(OUT, "smallNote.txt");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, ""); // remove "DEVELOP BY ASUNA" (nenhuma marca no lugar, por instrução da tarefa)
  log("smallNote", `vendor tinha ${JSON.stringify(original)} -> overlay vazio em ${outPath.replace(ROOT + "\\", "")}`);
  return { original, outPath };
}

// --- contact sheet (antes/depois, pra conferir visualmente) ------------------------------------------------

async function buildSheet(entries) {
  const pairs = [];
  for (const e of entries) {
    for (const p of e.pairs) pairs.push(p);
  }
  const thumbW = 420;
  const rows = [];
  for (const { label, before, after } of pairs) {
    const b = await sharp(before).resize({ width: thumbW, fit: "inside" }).flatten({ background: "#222" }).toBuffer();
    const a = await sharp(after).resize({ width: thumbW, fit: "inside" }).flatten({ background: "#222" }).toBuffer();
    const bm = await sharp(b).metadata();
    const am = await sharp(a).metadata();
    const rowH = Math.max(bm.height, am.height) + 28;
    const row = await sharp({ create: { width: thumbW * 2 + 20, height: rowH, channels: 3, background: "#111" } })
      .composite([
        { input: b, left: 0, top: 24 },
        { input: a, left: thumbW + 20, top: 24 },
      ])
      .png()
      .toBuffer();
    rows.push({ row, h: rowH, label });
  }
  const totalH = rows.reduce((s, r) => s + r.h, 0);
  const width = thumbW * 2 + 20;
  let y = 0;
  const composite = rows.map((r) => {
    const at = y;
    y += r.h;
    return { input: r.row, left: 0, top: at };
  });
  const outDir = join(ROOT, "research", "6600");
  mkdirSync(outDir, { recursive: true });
  await sharp({ create: { width, height: totalH, channels: 3, background: "#111" } })
    .composite(composite)
    .jpeg({ quality: 90 })
    .toFile(join(outDir, "brand-review.jpg"));
  log("sheet", `research/6600/brand-review.jpg (${rows.length} comparações)`);
}

// --- main -----------------------------------------------------------------------------------------------

async function main() {
  mkdirSync(SCRATCH, { recursive: true });
  mkdirSync(OUT, { recursive: true });

  const sheetEntries = [];

  const loading = await patchFlatLoading("Loading.swf", 26, [18, 31]);
  sheetEntries.push({ pairs: [{ label: "Loading.swf chid26", before: exportImage(join(VENDOR, "Loading.swf"), 26, "sheet_loading"), after: loading.imgOut }] });

  const ddtLoading = await patchFlatLoading("DDT_Loading.swf", 42, [18, 47]);
  sheetEntries.push({ pairs: [{ label: "DDT_Loading.swf chid42", before: exportImage(join(VENDOR, "DDT_Loading.swf"), 42, "sheet_ddtloading"), after: ddtLoading.imgOut }] });

  const ddtLoading1 = await patchFlatLoading("DDT_Loading1.swf", 42, [18, 47]);
  sheetEntries.push({ pairs: [{ label: "DDT_Loading1.swf chid42", before: exportImage(join(VENDOR, "DDT_Loading1.swf"), 42, "sheet_ddtloading1"), after: ddtLoading1.imgOut }] });

  const turkeyLoading = await patchTurkeyLoading();
  const turkeySrc = join(VENDOR, "ui", "turkey", "swf", "loading.swf");
  sheetEntries.push({
    pairs: [
      { label: "ui/turkey/swf/loading.swf chid18", before: exportImage(turkeySrc, 18, "sheet_turkey18"), after: join(SCRATCH, "ui_turkey_loading.18.png") },
      { label: "ui/turkey/swf/loading.swf chid34", before: exportImage(turkeySrc, 34, "sheet_turkey34"), after: join(SCRATCH, "ui_turkey_loading.34.png") },
    ],
  });

  patchSmallNote();

  if (SHEET) await buildSheet(sheetEntries);

  log("done", "apps/api/assets/flash6600/ atualizado: Loading.swf, DDT_Loading.swf, DDT_Loading1.swf, ui/turkey/swf/loading.swf, smallNote.txt");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
