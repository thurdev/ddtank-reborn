// @ts-nocheck — the generated bases are untyped
/**
 * Task `pve-qa` item 2 (owner report 2026-10-27, "many other dungeons have broken stages — find them all",
 * found by `packages/fight/test/pve-playthrough-sweep.test.ts` playing every Pve_Info type 6 dungeon's Easy
 * difficulty end to end): `CBS601`/`DTS701`/`GZS801`/`XDS901.ts` (generated/Messions — the opening mission
 * of Lâu đài Daucula/Rừng rậm Gamazon/Hoang mạc Xatara/Vịnh Cariga, `game."Pve_Info"` 10/8/9/11) each crash
 * in `OnPrepareNewSession` with `<field> is not defined`: a transpiler gap specific to the donor's bomb
 * resource preload call, `Game.AddLoadingFile(1, $"bombs/{m_ball}.swf", $"tank.resource.bombs.Bomb{m_ball}")`
 * — the C# string-interpolation expressions (`{m_ball}`) came out as bare identifiers inside the JS
 * template literal (`` `bombs/${m_ball}.swf` ``) instead of `this.m_ball`, even though the SAME field is
 * correctly written as `this.m_ball` everywhere else in the same file (e.g. `this.m_deTu.SetBall(this.m_ball)`
 * a few lines below). A bare identifier reference throws ReferenceError instead of silently reading
 * `undefined`, so this crashes `OnPrepareNewSession` outright, never AttachLoadingFile has, so the mission
 * never even finishes loading. Hand-fixed here (not a re-transpile — only 4 files hit it, all the exact
 * same `AddLoadingFile(1, \`bombs/${X}.swf\`, ...)` shape) by re-running `OnPrepareNewSession` with
 * `this.<field>` instead; everything else in each method is copied verbatim from the generated class.
 */
import { registerScript } from "../runtime.js";
import { CBS601 } from "../generated/Messions/CBS601.js";
import { DTS701 } from "../generated/Messions/DTS701.js";
import { GZS801 } from "../generated/Messions/GZS801.js";
import { XDS901 } from "../generated/Messions/XDS901.js";

class CBS601Fixed extends CBS601 {
  OnPrepareNewSession() {
    const npcIds = [this.m_Anna, this.m_bachTuocCon, this.m_trauNuoc, this.m_nhaThamHiem];
    this.Game.LoadResources(npcIds);
    this.Game.LoadNpcGameOverResources(npcIds);
    this.Game.AddLoadingFile(1, `bombs/${this.m_ball}.swf`, `tank.resource.bombs.Bomb${this.m_ball}`);
    this.Game.SetMap(1189);
  }
}
registerScript("GameServerScript.AI.Messions.CBS601", CBS601Fixed, "mission", "manual");

class DTS701Fixed extends DTS701 {
  OnPrepareNewSession() {
    const npcIds = [this.m_Franken, this.m_Doi, this.m_nhaThamHiem];
    this.Game.LoadResources(npcIds);
    this.Game.LoadNpcGameOverResources(npcIds);
    this.Game.AddLoadingFile(1, `bombs/${this.m_ball1}.swf`, `tank.resource.bombs.Bomb${this.m_ball1}`);
    this.Game.AddLoadingFile(1, `bombs/${this.m_ball2}.swf`, `tank.resource.bombs.Bomb${this.m_ball2}`);
    this.Game.SetMap(1188);
  }
}
registerScript("GameServerScript.AI.Messions.DTS701", DTS701Fixed, "mission", "manual");

class GZS801Fixed extends GZS801 {
  OnPrepareNewSession() {
    const npcIds = [this.npcId1, this.npcId2, this.npcId3];
    this.Game.LoadResources(npcIds);
    this.Game.LoadNpcGameOverResources(npcIds);
    this.Game.AddLoadingFile(1, `bombs/${this.ballId}.swf`, `tank.resource.bombs.Bomb${this.ballId}`);
    this.Game.AddLoadingFile(2, "image/game/effect/5/cuipao.swf", "asset.game.4.cuipao");
    this.Game.AddLoadingFile(2, "image/game/effect/5/mubiao.swf", "asset.game.4.mubiao");
    this.Game.SetMap(1186);
  }
}
registerScript("GameServerScript.AI.Messions.GZS801", GZS801Fixed, "mission", "manual");

class XDS901Fixed extends XDS901 {
  OnPrepareNewSession() {
    const npcIds = [this.int_0, this.int_1, this.int_2];
    this.Game.LoadResources(npcIds);
    this.Game.LoadNpcGameOverResources(npcIds);
    this.Game.AddLoadingFile(1, `bombs/${this.int_3}.swf`, `tank.resource.bombs.Bomb${this.int_3}`);
    this.Game.AddLoadingFile(1, `bombs/${this.int_4}.swf`, `tank.resource.bombs.Bomb${this.int_4}`);
    this.Game.SetMap(1187);
  }
}
registerScript("GameServerScript.AI.Messions.XDS901", XDS901Fixed, "mission", "manual");
