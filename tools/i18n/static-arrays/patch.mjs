#!/usr/bin/env node
/**
 * Recompiles 8 classes inside 2.png (ddt.DDT's 2,515-class ABC payload) that build a
 * `public|private static const Array` from `LanguageMgr.GetTranslation(key)` calls evaluated at
 * class-initialization time: ddt.data.EquipType (PARTNAME), ddt.data.goods.QualityType
 * (QUALITY_STRING), cardSystem.data.CardInfo (cardsType, cardsMain), ddt.view.chat.ChatFastReplyPanel
 * (FASTREPLYS), ddt.view.tips.CardsTipPanel (CARDTYPE, CARDTYPE_VICE_MAIN),
 * game.view.smallMap.SmallMapView (HARD_LEVEL, HARD_LEVEL1), lottery.LotteryContorller
 * (btnTipArray), store.view.strength.LaterEquipmentView (enchantLevelTxtArr).
 *
 * Why these need patching (research/i18n/ui-sweep.md, "Not fixed" item 1 / its two follow-ups):
 * AVM2 evaluates a `static const` initializer exactly once, the first time the class is touched —
 * and because 2.png (ddt.DDT + the whole game) is loaded and its classes get registered before
 * `StartupResourceLoader.loadLanguage()`'s async `language.txt` fetch has resolved, these 8 arrays
 * permanently bake in whatever `LanguageMgr._dic` held at that instant, before any locale (PT-BR or
 * the original VN) has actually loaded. No amount of fixing/translating `language.txt` can repair an
 * already-baked array — every other `GetTranslation()` call site in the game (hundreds of them) is
 * fine because it's called fresh, inside a function, at render/use time, after setup() has run; only
 * these 8 class-level static arrays are evaluated too early. There is no earlier/separate VN
 * language source to translate instead (checked: exactly one `language.txt` fetch per boot; the only
 * other early-loaded SWF, DDT_Loading.swf, has its own self-contained 87-class whack-a-mole mini-game
 * with zero `ddt.*` classes — no duplicate LanguageMgr/EquipType in its domain; no SharedObject-based
 * language cache or alternate PathManager path exists in the AS3 source) — so the only real fix is
 * this one: stop evaluating `GetTranslation()` eagerly, do it lazily on first real use instead.
 *
 * Fix: each static const Array becomes a private static cache var (`_NAME`) plus a same-named,
 * same-visibility `static function get NAME():Array` that builds and caches the array on first
 * *read*, not at class-init. Callers (compiled into other DoABC tags elsewhere in 2.png) read
 * `Class.NAME[i]` via the `getproperty` opcode either way — a getter trait and a const-slot trait are
 * both valid targets for `getproperty`, so no other class needs recompiling, only these 8.
 * `tools/i18n/static-arrays/scripts/` holds the final, already-edited .as sources (checked in, not
 * regenerated per run) with the exact package paths FFDec's `-importScript` expects.
 *
 * Usage: node patch.mjs <in.swf|in.png> <out.swf|out.png>
 *
 * Pipeline order (see scripts/gen-secrets.mjs): runs AFTER tools/i18n/abc-strings/patch.mjs (ABC
 * constant-pool string literal translation) and BEFORE patch-client-key (RSA modulus patch) — the
 * recompile changes method-body bytecode and constant-pool layout for just these 8 classes, which
 * patch-client-key tolerates fine since it does a dynamic indexOf() for the RSA modulus rather than a
 * fixed offset. Never run against vendor's own 2.png in place; always write to a new output path.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..", "..");
const ffdecJar = resolve(repoRoot, "vendor", "_tools", "ffdec", "ffdec-cli.jar");
const scriptsDir = resolve(here, "scripts");

function main() {
  const [inPath, outPath] = process.argv.slice(2);
  if (!inPath || !outPath) {
    console.error("usage: node patch.mjs <in> <out>");
    process.exit(1);
  }
  if (!existsSync(ffdecJar)) throw new Error(`ffdec-cli.jar not found at ${ffdecJar}`);
  if (!existsSync(inPath)) throw new Error(`input SWF not found: ${inPath}`);
  mkdirSync(dirname(resolve(outPath)), { recursive: true });

  execFileSync(
    "java",
    ["-jar", ffdecJar, "-importScript", resolve(inPath), resolve(outPath), scriptsDir],
    { stdio: "inherit" }
  );
  if (!existsSync(outPath)) throw new Error(`-importScript did not produce ${outPath}`);
  console.log(`${inPath}: recompiled 8 lazy-getter classes -> ${outPath}`);
}

main();
