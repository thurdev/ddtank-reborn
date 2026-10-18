import { readFileSync, writeFileSync } from "node:fs";

const PATH = "remaster/approved-6600.json";
const d = JSON.parse(readFileSync(PATH, "utf8"));

const NEW = [
  // 02-hall-icons
  { category: "02-hall-icons", file: "ddthallicon__200.png", swf: "ddthallicon.swf", swfPath: "ui\\turkey\\swf\\ddthallicon.swf", sourceFile: "200.png", fit: "cover", review: "local", note: "rodada 2: rejeitado pela IA na rodada 1, title-text.mjs agora" },
  // 04-batalha-resultado
  { category: "04-batalha-resultado", file: "firstcore__260.png", swf: "firstcore.swf", swfPath: "ui\\turkey\\swf\\firstcore.swf", sourceFile: "260.png", fit: "cover", review: "local", note: "rodada 2: rejeitado pela IA, title-text-ml.mjs" },
  { category: "04-batalha-resultado", file: "gameiii__225.png", swf: "gameiii.swf", swfPath: "ui\\turkey\\swf\\gameiii.swf", sourceFile: "225.png", fit: "cover", review: "local", note: "rodada 2: rejeitado pela IA (2a ocorrencia de Falhou), title-text.mjs" },
  { category: "04-batalha-resultado", file: "gameover__13_asset.takeoutCard.survival.InstructionBitmap.png", swf: "gameover.swf", swfPath: "ui\\turkey\\swf\\gameover.swf", sourceFile: "13_asset.takeoutCard.survival.InstructionBitmap.png", fit: "cover", review: "local", note: "rodada 2: rejeitado pela IA, title-text-ml.mjs" },
  { category: "04-batalha-resultado", file: "gameover__31_asset.experience.TotalExploitTxt.png", swf: "gameover.swf", swfPath: "ui\\turkey\\swf\\gameover.swf", sourceFile: "31_asset.experience.TotalExploitTxt.png", fit: "cover", review: "local", note: "rodada 2: rejeitado pela IA, title-text-ml.mjs" },
  { category: "04-batalha-resultado", file: "gameover__53_asset.takeoutCard.InstructionBitmap.png", swf: "gameover.swf", swfPath: "ui\\turkey\\swf\\gameover.swf", sourceFile: "53_asset.takeoutCard.InstructionBitmap.png", fit: "cover", review: "local", note: "rodada 2: rejeitado pela IA, title-text-ml.mjs" },
  // 05-atividade-diaria
  { category: "05-atividade-diaria", file: "dayactivity__11_day.activeBtn2.png", swf: "dayactivity.swf", swfPath: "ui\\turkey\\swf\\dayactivity.swf", sourceFile: "11_day.activeBtn2.png", fit: "cover", review: "local", note: "rodada 2: badge-text.mjs (fundo solido preservado)" },
  { category: "05-atividade-diaria", file: "dayactivity__12_day.activeBtn1.png", swf: "dayactivity.swf", swfPath: "ui\\turkey\\swf\\dayactivity.swf", sourceFile: "12_day.activeBtn1.png", fit: "cover", review: "local", note: "rodada 2: badge-text.mjs" },
  { category: "05-atividade-diaria", file: "dayactivity__13_day.activityBtn2.png", swf: "dayactivity.swf", swfPath: "ui\\turkey\\swf\\dayactivity.swf", sourceFile: "13_day.activityBtn2.png", fit: "cover", review: "local", note: "rodada 2: badge-text.mjs" },
  { category: "05-atividade-diaria", file: "dayactivity__15_day.activityBtn1.png", swf: "dayactivity.swf", swfPath: "ui\\turkey\\swf\\dayactivity.swf", sourceFile: "15_day.activityBtn1.png", fit: "cover", review: "local", note: "rodada 2: badge-text.mjs" },
  { category: "05-atividade-diaria", file: "dayactivity__3_day.receiveOver.png", swf: "dayactivity.swf", swfPath: "ui\\turkey\\swf\\dayactivity.swf", sourceFile: "3_day.receiveOver.png", fit: "cover", review: "local", note: "rodada 2: badge-text.mjs" },
  { category: "05-atividade-diaria", file: "dayactivity__6_day.timeViewBtn2.png", swf: "dayactivity.swf", swfPath: "ui\\turkey\\swf\\dayactivity.swf", sourceFile: "6_day.timeViewBtn2.png", fit: "cover", review: "local", note: "rodada 2: badge-text.mjs" },
  { category: "05-atividade-diaria", file: "dayactivity__7_day.timeViewBtn1.png", swf: "dayactivity.swf", swfPath: "ui\\turkey\\swf\\dayactivity.swf", sourceFile: "7_day.timeViewBtn1.png", fit: "cover", review: "local", note: "rodada 2: badge-text.mjs" },
  { category: "05-atividade-diaria", file: "dayactivity__23_day.activity.tiaojian.png", swf: "dayactivity.swf", swfPath: "ui\\turkey\\swf\\dayactivity.swf", sourceFile: "23_day.activity.tiaojian.png", fit: "cover", review: "local", note: "rodada 2: badge-text.mjs" },
  // 07-placas-salao
  { category: "07-placas-salao", file: "ddthallmain__815.png", swf: "ddthallmain.swf", swfPath: "ui\\turkey\\swf\\ddthallmain.swf", sourceFile: "815.png", fit: "cover", review: "local", note: "rodada 2: placa Oyun Salonu -> Salao de Jogos, title-text.mjs" },
  { category: "07-placas-salao", file: "ddthallmain__751.png", swf: "ddthallmain.swf", swfPath: "ui\\turkey\\swf\\ddthallmain.swf", sourceFile: "751.png", fit: "cover", review: "local", note: "rodada 2: placa Kesif Rihtimi -> Cais de Exploracao, title-text.mjs" },
  { category: "07-placas-salao", file: "ddthallmain__853.png", swf: "ddthallmain.swf", swfPath: "ui\\turkey\\swf\\ddthallmain.swf", sourceFile: "853.png", fit: "cover", review: "local", note: "rodada 2: placa savascinin gizli yeri -> esconderijo do guerreiro, title-text.mjs" },
  { category: "07-placas-salao", file: "ddthallmain__963.png", swf: "ddthallmain.swf", swfPath: "ui\\turkey\\swf\\ddthallmain.swf", sourceFile: "963.png", fit: "cover", review: "local", note: "rodada 2: placa Ciftlik -> Fazenda, title-text.mjs" },
  { category: "07-placas-salao", file: "ddthallmain__892.png", swf: "ddthallmain.swf", swfPath: "ui\\turkey\\swf\\ddthallmain.swf", sourceFile: "892.png", fit: "cover", review: "local", note: "rodada 2: placa Ring Savasi -> Batalha no Ringue, title-text.mjs" },
  { category: "07-placas-salao", file: "ddthallmain__306.png", swf: "ddthallmain.swf", swfPath: "ui\\turkey\\swf\\ddthallmain.swf", sourceFile: "306.png", fit: "cover", review: "local", note: "rodada 2: placa Birlik kulubu -> Clube da Sociedade (icone preservado), hallsign-icon-text.mjs" },
  { category: "07-placas-salao", file: "ddthallmain__423.png", swf: "ddthallmain.swf", swfPath: "ui\\turkey\\swf\\ddthallmain.swf", sourceFile: "423.png", fit: "cover", review: "local", note: "rodada 2: placa Demirci Atolyesi -> Forja (icone preservado), hallsign-icon-text.mjs" },
  { category: "07-placas-salao", file: "ddthallmain__596.png", swf: "ddthallmain.swf", swfPath: "ui\\turkey\\swf\\ddthallmain.swf", sourceFile: "596.png", fit: "cover", review: "local", note: "rodada 2: placa Acik Artirma Alani -> Casa de Leiloes (icone preservado), hallsign-icon-text.mjs" },
];

const existingKeys = new Set(d.map((x) => `${x.swf}::${x.sourceFile}`));
let added = 0;
for (const row of NEW) {
  const key = `${row.swf}::${row.sourceFile}`;
  if (existingKeys.has(key)) { console.log("already approved, skip:", key); continue; }
  d.push(row);
  added++;
}
writeFileSync(PATH, JSON.stringify(d, null, 1) + "\n");
console.log(`added ${added} entries, total now ${d.length}`);
