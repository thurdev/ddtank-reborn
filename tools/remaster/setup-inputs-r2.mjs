import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROWS = [
  ["02-hall-icons", "ddthallicon", "200.png"],
  ["04-batalha-resultado", "firstcore", "260.png"],
  ["04-batalha-resultado", "gameiii", "225.png"],
  ["04-batalha-resultado", "gameover", "13_asset.takeoutCard.survival.InstructionBitmap.png"],
  ["04-batalha-resultado", "gameover", "31_asset.experience.TotalExploitTxt.png"],
  ["04-batalha-resultado", "gameover", "53_asset.takeoutCard.InstructionBitmap.png"],
  ["05-atividade-diaria", "dayactivity", "11_day.activeBtn2.png"],
  ["05-atividade-diaria", "dayactivity", "12_day.activeBtn1.png"],
  ["05-atividade-diaria", "dayactivity", "13_day.activityBtn2.png"],
  ["05-atividade-diaria", "dayactivity", "15_day.activityBtn1.png"],
  ["05-atividade-diaria", "dayactivity", "3_day.receiveOver.png"],
  ["05-atividade-diaria", "dayactivity", "6_day.timeViewBtn2.png"],
  ["05-atividade-diaria", "dayactivity", "7_day.timeViewBtn1.png"],
  ["05-atividade-diaria", "dayactivity", "23_day.activity.tiaojian.png"],
  ["07-placas-salao", "ddthallmain", "815.png"],
  ["07-placas-salao", "ddthallmain", "751.png"],
  ["07-placas-salao", "ddthallmain", "853.png"],
  ["07-placas-salao", "ddthallmain", "963.png"],
  ["07-placas-salao", "ddthallmain", "892.png"],
  ["07-placas-salao", "ddthallmain", "306.png"],
  ["07-placas-salao", "ddthallmain", "423.png"],
  ["07-placas-salao", "ddthallmain", "596.png"],
];

for (const [category, swfStem, sourceFile] of ROWS) {
  const src = join("..", "..", "remaster", "_6600", "inputs", `ui__turkey__swf__${swfStem}.swf`, sourceFile);
  const destDir = join("..", "..", "remaster", category, "inputs");
  mkdirSync(destDir, { recursive: true });
  mkdirSync(join("..", "..", "remaster", category, "outputs"), { recursive: true });
  const dest = join(destDir, `${swfStem}__${sourceFile}`);
  if (!existsSync(src)) { console.log("MISSING SRC", src); continue; }
  copyFileSync(src, dest);
  console.log("ok", dest);
}
