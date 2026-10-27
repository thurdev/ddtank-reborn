// @ts-nocheck — the generated bases are untyped
/**
 * Task `pve-qa` item 2 (owner report 2026-10-27: "many other dungeons have broken stages — find them all",
 * found by `packages/fight/test/pve-playthrough-sweep.test.ts` actually playing Pve 1 Normal/Hard end to
 * end, not just constructing the chain): `GT1173.ts`/`GK1273.ts` (generated/Messions) — the "Gà Thường
 * S3"/"Gà Khó S3" (Rei Galinha) two-phase king fight on map 1076 — never assign `int_1`/`int_4`/`int_5`/
 * `int_6` (the boss/minion NPC ids), so `OnStartGame`'s `Game.CreateBoss(this.int_1, ...)` creates boss
 * NPC 0 ("NPC_Info 0 not found"), and every method after that (`CanGameOver`/`OnGameOver`) null-derefs
 * `simpleBoss_0.IsLiving`.
 *
 * Root cause: the donor .cs these two were transpiled from is missing its instance constructor body — the
 * class only has the static field initializer (`static GT1173() { string_0 = ...; }`), confirmed by diffing
 * against a more complete decompile of the same class (`vendor/_qa-mission-sources/ddt-34-csharp/
 * Game.Server/GameServerScript/AI/Messions/{GT1173,GK1273}.cs`, which DOES have
 * `public GT1173() { int_1 = 1105; int_4 = 1105; int_5 = 1106; int_6 = 1110; }` /
 * `public GK1273() { int_1 = 1205; int_4 = 1205; int_5 = 1206; int_6 = 1210; }` — same NPC ids as the
 * `CNM1176`/`CHM1276` sibling king fights, game."NPC_Info" 1105/1106/1110 (Normal) and 1205/1206/1210
 * (Hard) both named "Gà"/"Gà lâu la ", matching migration `0030_pve_gulu_king_chamber.sql`'s derivation for
 * the same boss family). The vendor/DDTank4.1 tree this task must treat as read-only doesn't have that
 * fuller decompile, so this is a hand fix here (not a re-transpile) — same convention as every other entry
 * in this folder: subclass the generated class, set what the constructor should have set.
 */
import { registerScript, LanguageMgr } from "../runtime.js";
import { GT1173 } from "../generated/Messions/GT1173.js";
import { GK1273 } from "../generated/Messions/GK1273.js";
import { HardKingFirst } from "../generated/NPC/HardKingFirst.js";

class GT1173Fixed extends GT1173 {
  constructor() {
    super();
    this.int_1 = 1105;
    this.int_4 = 1105;
    this.int_5 = 1106;
    this.int_6 = 1110;
  }
}
registerScript("GameServerScript.AI.Messions.GT1173", GT1173Fixed, "mission", "manual");

class GK1273Fixed extends GK1273 {
  constructor() {
    super();
    this.int_1 = 1205;
    this.int_4 = 1205;
    this.int_5 = 1206;
    this.int_6 = 1210;
  }
}
registerScript("GameServerScript.AI.Messions.GK1273", GK1273Fixed, "mission", "manual");

/**
 * Same sweep run, same Hard chain: `HardKingFirst` (the Hard king's AI brain, `AllAttack`) calls
 * `Bussiness.LanguageMgr.GetTranslation(...)` — the transpiler left the donor's fully-qualified namespace
 * prefix (`Bussiness.LanguageMgr`) unresolved as a bare identifier (`Bussiness` is never imported/defined),
 * crashing `OnStartAttacking` every time this king attacks — even though the SAME file already imports and
 * correctly uses plain `LanguageMgr` elsewhere (`KillAttack`, a few lines above). Same donor-text issue in
 * `generated/Messions/NTM1083.ts` (`Bussiness.Managers.ItemMgr.FindItemTemplate`, a different mission, not
 * reached by this sweep's Pve 1 regression target) — left unfixed here, flagged in docs/guides/pve.md.
 */
class HardKingFirstFixed extends HardKingFirst {
  AllAttack() {
    this.Body.CurrentDamagePlus = 0.8;
    const index = this.Game.Random.Next(0, HardKingFirst.AllAttackChat.length);
    this.Body.Say(LanguageMgr.GetTranslation(HardKingFirst.AllAttackChat[index]), 1, 0);
    this.Body.PlayMovie("beat", 1000, 0);
    this.Body.RangeAttacking(-1, this.Game.Map.Info.ForegroundWidth + 1, "cry", 3000, null);
  }
}
registerScript("GameServerScript.AI.NPC.HardKingFirst", HardKingFirstFixed, "brain", "manual");
