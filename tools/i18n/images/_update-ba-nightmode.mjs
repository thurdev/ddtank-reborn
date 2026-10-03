// Updates research/i18n/before-after.html's "Dark/night mode" section in place: refreshes the two rows whose
// output changed this session (12.jpg/104.jpg composite -> stronger grade + lossless PNG; 141.png/233.png
// reclassified "flare" and crushed down instead of "building"), and appends 4 new label rows (Guild/Shop/
// Đấu giá/Hiện tại — found+translated this session) + the sun-flare fix note. Bumps the count badge.
import sharp from "sharp";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const SP = "C:/Users/T/AppData/Local/Temp/claude/C--Users-T-Documents-Projects-DDTank/c048f152-a1c9-45a2-b674-36b413e8f4d9/scratchpad";
const EXPORT_ROOT = `${SP}/i18n/ffdec_out`;
const STAGE_ROOT = `${SP}/i18n/staged`;
const HTML_PATH = "C:/Users/T/Documents/Projects/DDTank/research/i18n/before-after.html";

async function thumb(path) {
  const buf = await sharp(path).resize({ width: 300, height: 190, fit: "inside", withoutEnlargement: true }).png().toBuffer();
  return buf.toString("base64");
}
function extOf(file) { return file.toLowerCase().endsWith(".jpg") || file.toLowerCase().endsWith(".jpeg") ? "jpeg" : "png"; }

async function pairBlock({ swf, beforeFile, afterFile, note }) {
  const beforePath = join(EXPORT_ROOT, swf, beforeFile);
  const afterPath = join(STAGE_ROOT, swf, afterFile);
  if (!existsSync(beforePath) || !existsSync(afterPath)) { console.log("!! missing", swf, beforeFile, "/", afterFile); return null; }
  const b64Before = await thumb(beforePath);
  const b64After = await thumb(afterPath);
  return `<div class="pair">
    <div class="meta"><span class="swf">${swf}</span><span class="file">${afterFile}</span></div>
    <div class="imgs">
      <figure><img src="data:image/${extOf(beforeFile)};base64,${b64Before}" alt="before"><figcaption>Antes (dia)</figcaption></figure>
      <figure><img src="data:image/${extOf(afterFile)};base64,${b64After}" alt="after"><figcaption>Depois (noite/dark)</figcaption></figure>
    </div>
    <div class="text">${note}</div>
  </div>`;
}

async function main() {
  let html = readFileSync(HTML_PATH, "utf8");

  // 1) Replace the two existing rows whose output changed (match by data-file marker in the meta line).
  const replacements = [
    { file: "12.jpg", row: await pairBlock({ swf: "hall.swf", beforeFile: "12.jpg", afterFile: "12.png", note: "Backdrop principal do saguão — regrade mais forte (sessão 2026-10-03 pt.2): exposição -45/-55%, matiz azul/roxo mais pronunciado no céu, lua + estrelas + vinheta; reimportado como PNG/DefineBitsLossless2 (era JPEG q95 reencodado 2x — causava o speckle rosa/vermelho reportado) em vez de JPEG, 0 ruído adicionado (round-trip pixel-diff = 0)." }) },
    { file: "141.png", row: await pairBlock({ swf: "hall.swf", beforeFile: "141.png", afterFile: "141.png", note: "Reclassificado de \"building\" pra uma categoria nova \"flare\" (sprite grande e muito claro, não arquitetura — era o efeito que ficava bem claro/estourado mesmo depois do grade antigo): agora é escurecido e dessaturado bem mais forte, sem estourar branco." }) },
  ];
  for (const { file, row } of replacements) {
    if (!row) continue;
    const re = new RegExp(`<div class="pair">\\s*<div class="meta"><span class="swf">[^<]*</span><span class="file">${file.replace(/\./g, "\\.")}</span></div>[\\s\\S]*?</div>\\s*</div>`, "m");
    if (re.test(html)) html = html.replace(re, row);
    else console.log("!! could not find existing row for", file);
  }

  // 2) Append new label rows (found + translated this session) before the grid's closing </div> + <footer>.
  const newRows = [];
  for (const job of [
    { swf: "hall.swf", beforeFile: "18.png", afterFile: "18.png", note: "Legenda flutuante \"Guild\" (inglês no original, sem diacrítico — por isso o OCR vi-only não sinalizou nesta leva anterior) -> \"Sociedade\"." },
    { swf: "hall.swf", beforeFile: "45.png", afterFile: "45.png", note: "Legenda flutuante \"Shop\" -> \"Loja\" (a placa \"SHOP\" pintada no telhado do prédio foi mantida como está, por instrução da tarefa)." },
    { swf: "hall.swf", beforeFile: "42.png", afterFile: "42.png", note: "\"Đấu giá\" -> \"Leilão\" (já estava em curated-captions.json de uma leva anterior, mas o bitmap certo nunca tinha sido achado — localizado por tamanho/posição nesta sessão)." },
    { swf: "chat.swf", beforeFile: "60_asset.chat.ChannelState_Current.png", afterFile: "60_asset.chat.ChannelState_Current.png", note: "Aba do mini-chat do saguão \"Hiện tại\" -> \"Atual\" (achado via nome do asset, ChannelState_Current, não por OCR — vive em chat.swf/chat1.swf, não em hall.swf)." },
  ]) {
    const r = await pairBlock(job);
    if (r) newRows.push(r);
  }

  // Count badge bump: was 10 examples; +4 new label rows (the 2 replaced rows don't change the count).
  html = html.replace(/(Dark\/night mode[^<]*<span class="count">)(\d+)(<\/span>)/, (m, a, n, b) => `${a}${Number(n) + newRows.length}${b}`);

  // Insert new rows right before the final "</div>\n\n<footer>" (end of the dark/night-mode grid).
  const anchor = "</div>\n\n<footer>";
  if (!html.includes(anchor)) throw new Error("anchor not found, aborting to avoid corrupting the file");
  html = html.replace(anchor, `${newRows.join("\n")}\n${anchor}`);

  writeFileSync(HTML_PATH, html);
  console.log("updated before-after.html:", replacements.filter(r=>r.row).length, "rows replaced,", newRows.length, "rows appended");
}
main().catch((e) => { console.error(e); process.exit(1); });
