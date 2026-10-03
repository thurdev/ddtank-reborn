import sharp from "sharp";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const SP = "C:/Users/T/AppData/Local/Temp/claude/C--Users-T-Documents-Projects-DDTank/c048f152-a1c9-45a2-b674-36b413e8f4d9/scratchpad";
const EXPORT_ROOT = `${SP}/i18n/ffdec_out`;
const STAGE_ROOT = `${SP}/i18n/staged`;
const LOADING_STAGE = `${SP}/i18n/staged_loading`;

const ROWS = [
  { swf: "hall.swf", file: "12.jpg", after: join(STAGE_ROOT, "hall.swf", "12.jpg"), note: "Backdrop principal do saguão: céu escurecido + matiz azul/roxo, lua e estrelas procedurais, vinheta; prédios continuam legíveis (gradiente vertical — topo recebe o tratamento forte, base menos)." },
  { swf: "hall.swf", file: "163.png", after: join(STAGE_ROOT, "hall.swf", "163.png"), note: "Faixa de nuvens/horizonte distante (0% de saturação no original) — tratamento \"céu\" completo." },
  { swf: "hall.swf", file: "141.png", after: join(STAGE_ROOT, "hall.swf", "141.png"), note: "Prédio/decoração isolada — tratamento \"building\": escurecido moderado, matiz quase preservado, continua legível." },
  { swf: "DDT_Loading.swf", file: "1.jpg", after: join(LOADING_STAGE, "DDT_Loading.swf", "1.jpg"), note: "Splash de boot: mesmo método do hall (gradiente + lua + estrelas + vinheta)." },
  { swf: "DDT_Loading.swf", file: "25.png", after: join(LOADING_STAGE, "DDT_Loading.swf", "25.png"), note: "Banner do título (3 palavras pintadas em cores diferentes, needs-ai.md) — graded-only por instrução da tarefa: só escurecido/matiz, texto VN mantido como está (não é um plate, não dá pra reescrever programaticamente)." },
  { swf: "bagandinfo.swf", file: "16_bagAndInfo.info.personalInfoBgAsset.png", after: join(STAGE_ROOT, "bagandinfo.swf", "16_bagAndInfo.info.personalInfoBgAsset.png"), note: "Moldura bespoke do painel \"boneco de papel\" da bolsa — NÃO fazia parte do chrome 9-slice compartilhado (confirmado na sessão anterior). Remap protegido: ~40% mais escuro em média, texto/ícones saturados preservados via edge-magnitude + saturação." },
  { swf: "shop.swf", file: "41_asset.shop.RightViewBg.png", after: join(STAGE_ROOT, "shop.swf", "41_asset.shop.RightViewBg.png"), note: "Painel de prévia do personagem na loja." },
  { swf: "setting.swf", file: "16_asset.setting.bg.png", after: join(STAGE_ROOT, "setting.swf", "16_asset.setting.bg.png"), note: "Fundo da janela de configurações." },
  { swf: "quest.swf", file: "133_asset.core.quest.leftBGStyle1.jpg", after: join(STAGE_ROOT, "quest.swf", "133_asset.core.quest.leftBGStyle1.jpg"), note: "Painel esquerdo da janela de missões (categorias)." },
  { swf: "consortia.swf", file: "26_asset.consortia.myConsortiaView.BG2.png", after: join(STAGE_ROOT, "consortia.swf", "26_asset.consortia.myConsortiaView.BG2.png"), note: "Fundo principal da janela de guilda (consórcio)." },
];

async function thumb(path) {
  const buf = await sharp(path).resize({ width: 300, height: 190, fit: "inside", withoutEnlargement: true }).png().toBuffer();
  return buf.toString("base64");
}

async function main() {
  let out = `<h2>Dark/night mode — chrome compartilhado + prédios do saguão + telas de loading + molduras bespoke (<span class="count">${ROWS.length}</span> exemplos de ${61 + 2 + 2 /* dark-frames + loading + hall-composite */}+ imagens processadas)</h2>\n<div class="grid">\n`;
  for (const row of ROWS) {
    const beforePath = join(EXPORT_ROOT, row.swf, row.file);
    if (!existsSync(beforePath) || !existsSync(row.after)) {
      console.log(`!! missing ${row.swf}/${row.file}`);
      continue;
    }
    const b64Before = await thumb(beforePath);
    const b64After = await thumb(row.after);
    const ext = row.file.toLowerCase().endsWith(".jpg") || row.file.toLowerCase().endsWith(".jpeg") ? "jpeg" : "png";
    out += `<div class="pair">
    <div class="meta"><span class="swf">${row.swf}</span><span class="file">${row.file}</span></div>
    <div class="imgs">
      <figure><img src="data:image/${ext};base64,${b64Before}" alt="before"><figcaption>Antes (dia)</figcaption></figure>
      <figure><img src="data:image/${ext};base64,${b64After}" alt="after"><figcaption>Depois (noite/dark)</figcaption></figure>
    </div>
    <div class="text">${row.note}</div>
  </div>`;
  }
  out += "\n</div>\n";
  writeFileSync(`${SP}/i18n/ba-nightmode-snippet.html`, out);
  console.log("wrote snippet, bytes:", out.length);
}
main().catch((e) => { console.error(e); process.exit(1); });
