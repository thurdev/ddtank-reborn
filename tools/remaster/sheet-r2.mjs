// Folha de revisao da rodada 2 (m1-bitmap-text): original (esquerda) x saida local (direita) de cada
// item corrigido. Grava research/6600/bitmap-r2-review.jpg.
import sharp from "sharp";

const ITEMS = [
  ["07-placas-salao", "ddthallmain__815.png", "Oyun Salonu -> Salao de Jogos"],
  ["07-placas-salao", "ddthallmain__306.png", "Birlik kulubu -> Clube da Sociedade"],
  ["07-placas-salao", "ddthallmain__423.png", "Demirci Atolyesi -> Forja"],
  ["07-placas-salao", "ddthallmain__596.png", "Acik Artirma Alani -> Casa de Leiloes"],
  ["07-placas-salao", "ddthallmain__751.png", "Kesif Rihtimi -> Cais de Exploracao"],
  ["07-placas-salao", "ddthallmain__853.png", "savascinin gizli yeri -> esconderijo do guerreiro"],
  ["07-placas-salao", "ddthallmain__963.png", "Ciftlik -> Fazenda"],
  ["07-placas-salao", "ddthallmain__892.png", "Ring Savasi -> Batalha no Ringue"],
  ["05-atividade-diaria", "dayactivity__11_day.activeBtn2.png", "Gunluk aktivite -> Atividade Diaria"],
  ["05-atividade-diaria", "dayactivity__12_day.activeBtn1.png", "Gunluk aktivite -> Atividade Diaria (selecionado)"],
  ["05-atividade-diaria", "dayactivity__13_day.activityBtn2.png", "Gunluk etkinlik -> Evento Diario"],
  ["05-atividade-diaria", "dayactivity__15_day.activityBtn1.png", "Gunluk etkinlik -> Evento Diario (selecionado)"],
  ["05-atividade-diaria", "dayactivity__3_day.receiveOver.png", "Alinmis -> Resgatado"],
  ["05-atividade-diaria", "dayactivity__6_day.timeViewBtn2.png", "Zaman sinirli -> Tempo Limitado"],
  ["05-atividade-diaria", "dayactivity__7_day.timeViewBtn1.png", "Zaman sinirli -> Tempo Limitado (selecionado)"],
  ["05-atividade-diaria", "dayactivity__23_day.activity.tiaojian.png", "Etkinlik durumu: -> Status do evento:"],
  ["02-hall-icons", "ddthallicon__200.png", "Buraya tikla -> Clique aqui (rejeito IA r1)"],
  ["04-batalha-resultado", "firstcore__260.png", "Tiklayarak isleme devam edin -> Clique para continuar (rejeito IA r1)"],
  ["04-batalha-resultado", "gameiii__225.png", "Basarisiz -> Falhou, 2a ocorrencia (rejeito IA r1)"],
  ["04-batalha-resultado", "gameover__13_asset.takeoutCard.survival.InstructionBitmap.png", "instrucao sobrevivencia (rejeito IA r1)"],
  ["04-batalha-resultado", "gameover__31_asset.experience.TotalExploitTxt.png", "Toplam mukafat puani -> Pontos de recompensa total (rejeito IA r1)"],
  ["04-batalha-resultado", "gameover__53_asset.takeoutCard.InstructionBitmap.png", "instrucao caixa de cupons (rejeito IA r1)"],
];

const W = 260, LABEL_H = 16;
const parts = [];
let y = 0;
for (const [cat, file, label] of ITEMS) {
  const inp = `../../remaster/${cat}/inputs/${file}`;
  const out = `../../remaster/${cat}/outputs/${file}`;
  const a = await sharp(inp).resize({ width: W, height: 90, fit: "inside" }).flatten({ background: "#223" }).png().toBuffer();
  const b = await sharp(out).resize({ width: W, height: 90, fit: "inside" }).flatten({ background: "#223" }).png().toBuffer();
  const ah = (await sharp(a).metadata()).height, bh = (await sharp(b).metadata()).height;
  const h = Math.max(ah, bh);
  const labelSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 2 + 10}" height="${LABEL_H}"><rect width="100%" height="100%" fill="#223"/><text x="4" y="12" font-family="Arial" font-size="11" fill="#9cf">${label.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text></svg>`;
  parts.push({ input: Buffer.from(labelSvg), top: y, left: 0 });
  y += LABEL_H;
  parts.push({ input: a, top: y, left: 0 }, { input: b, top: y, left: W + 10 });
  y += h + 10;
}
await sharp({ create: { width: W * 2 + 10, height: y, channels: 3, background: "#111" } }).composite(parts).jpeg({ quality: 90 }).toFile("../../research/6600/bitmap-r2-review.jpg");
console.log("sheet with", ITEMS.length, "items ->", "research/6600/bitmap-r2-review.jpg", "size", `${W * 2 + 10}x${y}`);
