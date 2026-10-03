// Bespoke per-window frame/background dark remap (bag, shop, settings, quest, mail, guild) — deterministic,
// no AI. These windows embed their own frame art per SWF (not the shared corescalebitmap/ddtcorescalebitmap
// 9-slice chrome dark-mode-skins.mjs already recolored) — confirmed live in the previous session (moldura da
// janela de bag/settings continued the original beige tone after the shared-chrome recolor).
//
// Method: applyProtectedDarken() (night-grade.mjs) — same hue-preserving HSL darken as the shared-chrome
// script, but graduated-protects text glyph strokes (local edge-magnitude) and saturated icon pixels so
// labels/icons baked into the same bitmap as the frame stay legible instead of going dark/muddy with it.
import { readdirSync, existsSync, mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { loadRaw, encode, extForFile, applyProtectedDarken } from "./night-grade.mjs";

const SP = "C:/Users/T/AppData/Local/Temp/claude/C--Users-T-Documents-Projects-DDTank/c048f152-a1c9-45a2-b674-36b413e8f4d9/scratchpad";
const EXPORT_ROOT = `${SP}/i18n/ffdec_out`;
const STAGE_ROOT = `${SP}/i18n/staged`;

// One entry per window SWF: exact FFDec-exported filenames of the frame/panel background art identified by
// inspecting the top-area bitmaps per SWF (see tools/i18n/images/_inspect-frames.mjs output) — the single
// large panel backdrops plus (for the bag window) its bespoke 9-tile frame set.
const TARGETS = {
  "bagandinfo.swf": [
    "16_bagAndInfo.info.personalInfoBgAsset.png", "95_equipretrieve.background.png",
    "100_asset.bagAndInfo.bag.NecklacePtetrochemicalView.bg.png", "48_equipretrieve.helpInfoBg.png",
    "29_bagAndInfo.bag.BGRightCenterAsset.png", "30_bagAndInfo.bag.BGLeftCenterAsset.png",
    "31_bagAndInfo.bag.BGCenterAsset.png", "59_bagAndInfo.bag.BGRightTopAsset.png",
    "78_bagAndInfo.bag.BGTopCenterAsset.png", "91_bagAndInfo.bag.BGRightBottomAsset.png",
    "92_bagAndInfo.bag.BGBottomCenterAsset.png", "93_bagAndInfo.bag.BGBottomLeftAsset.png",
    "97_bagAndInfo.bag.BGLeftTopAsset.png",
  ],
  "bagandinfo1.swf": [
    "20_bagAndInfo.info.personalInfoBgAsset.png", "86_equipretrieve.background.png", "47_equipretrieve.helpInfoBg.png",
    "31_bagAndInfo.bag.BGRightCenterAsset.png", "32_bagAndInfo.bag.BGLeftCenterAsset.png",
    "33_bagAndInfo.bag.BGCenterAsset.png", "56_bagAndInfo.bag.BGRightTopAsset.png",
    "71_bagAndInfo.bag.BGTopCenterAsset.png", "82_bagAndInfo.bag.BGRightBottomAsset.png",
    "83_bagAndInfo.bag.BGBottomCenterAsset.png", "84_bagAndInfo.bag.BGBottomLeftAsset.png",
    "88_bagAndInfo.bag.BGLeftTopAsset.png",
  ],
  "bagandinfo2.swf": [
    "16_bagAndInfo.info.personalInfoBgAsset.png", "54_bagAndInfo.cell.bagCellOverBgAsset.jpg", "48_equipretrieve.helpInfoBg.png",
    "29_bagAndInfo.bag.BGRightCenterAsset.png", "30_bagAndInfo.bag.BGLeftCenterAsset.png",
    "31_bagAndInfo.bag.BGCenterAsset.png", "59_bagAndInfo.bag.BGRightTopAsset.png",
    "78_bagAndInfo.bag.BGTopCenterAsset.png", "91_bagAndInfo.bag.BGRightBottomAsset.png",
    "92_bagAndInfo.bag.BGBottomCenterAsset.png", "93_bagAndInfo.bag.BGBottomLeftAsset.png",
    "97_bagAndInfo.bag.BGLeftTopAsset.png",
  ],
  "shop.swf": [
    "41_asset.shop.RightViewBg.png", "39_asset.shop.PresentBg.png", "112_asset.shop.BodyInfoBg.png",
    "126_asset.shop.ColorPanelBg.png", "16_asset.shop.LeftMoneyPanel.png", "111_asset.shop.BgTitle.png",
  ],
  "setting.swf": ["16_asset.setting.bg.png", "6_asset.setting.title.png"],
  "quest.swf": [
    "35_asset.core.quest.styleGuideleaf.png", "133_asset.core.quest.leftBGStyle1.jpg",
    "108_asset.core.quest.titleBG.png", "16_asset.core.quest.QuestCateTitleBG.png",
    "17_asset.core.quest.QuestCateTitleBGStyle2.png",
  ],
  "email.swf": ["18_asset.email.personBG.png", "53_asset.email.payBG.png", "27_asset.email.moneyBG.png", "43_asset.email.DiamondBg.png"],
  "consortia.swf": [
    "26_asset.consortia.myConsortiaView.BG2.png", "27_asset.consortia.memberItem.BG3.png",
    "28_asset.consortia.memberItem.BG2.png", "29_asset.consortia.memberItem.BG1.png",
    "49_asset.consortiaEventList.BG.png",
  ],
  "consortionclub.swf": ["29_asset.club.BG.png", "23_asset.createConsortionFrame.BG.png"],
};

async function main() {
  let total = 0, missing = 0;
  for (const [swf, files] of Object.entries(TARGETS)) {
    const dir = join(EXPORT_ROOT, swf);
    const stageDir = join(STAGE_ROOT, swf);
    mkdirSync(stageDir, { recursive: true });
    for (const file of files) {
      const srcPath = join(dir, file);
      if (!existsSync(srcPath)) { console.log(`  !! missing ${swf}/${file}`); missing++; continue; }
      const { data, info } = await loadRaw(srcPath);
      // edgeThreshold/satProtect tuned against 16_bagAndInfo.info.personalInfoBgAsset.png: this game's sepia
      // wood-panel art already sits at HSL S~0.4-0.5 (brown reads "saturated" in HSL despite looking muted),
      // and its grain/bevel texture produces edge-magnitude noise into the 50-100 range — low thresholds
      // there protected a third of the whole panel as if it were text. 110/0.68 only catches genuine glyph
      // strokes (checked: white condensed text w/ chunky dark outline on colored pills) and vivid icon fills
      // (red/blue/green stat bars), while the panel itself still darkens ~40% in mean brightness.
      const out = applyProtectedDarken(data, info, { lScale: 0.42, sScale: 1.12, edgeThreshold: 110, satProtect: 0.68 });
      const buf = await encode(out, info, extForFile(file));
      // encode() always returns PNG now (2026-10-03 fix, see night-grade.mjs): two targets here
      // (bagandinfo2.swf's 54_...bagCellOverBgAsset.jpg, quest.swf's 133_...leftBGStyle1.jpg) are
      // DefineBitsJPEG-backed sources. Writing PNG bytes under their old .jpg name would either
      // confuse ffdec -importImages or, before this fix, re-encoded them as JPEG q95 on top of the
      // already-darkened pixels — a second lossy pass stacked on the first, the same speckle/
      // posterization bug found and fixed in night-hall.mjs. Rename to .png so the reimport lands as
      // DefineBitsLossless2 instead.
      const outName = file.replace(/\.(jpe?g)$/i, ".png");
      writeFileSync(join(stageDir, outName), buf);
      if (outName !== file) {
        const staleJpg = join(stageDir, file);
        if (existsSync(staleJpg)) unlinkSync(staleJpg); // drop the earlier run's corrupted .jpg
      }
      total++;
    }
    console.log(`[${swf}] ${files.length} frame asset(s) processed`);
  }
  console.log(`\nTotal: ${total} processed, ${missing} missing.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
