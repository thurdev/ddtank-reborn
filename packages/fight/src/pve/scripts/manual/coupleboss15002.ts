/**
 * `CoupleBoss15002` (mission 15002, "Boss Vợ Chồng" / "Boss do Casal") — the one class in
 * `research/qa/pendencias-sem-fonte.md` §1 / `KNOWN_SOURCELESS` whose C# genuinely does not exist anywhere public:
 * searched vendor/DDTank41, the donor vendor/DDTank4.1, vendor/DDT-6600, AND (2026-10-11) every DDTank/Gunny fork
 * findable on GitHub (3.x/3.4/3.8/4.x/4.5/6600 — see `research/qa/mission-sources.md` for the list) — zero hits for
 * the class name, including obfuscated/renamed variants. `eRoomType.CoupleBoss` (20) is wired into the DB schema
 * (`packages/db/src/schema/player.ts`: `coupleBossEnterNum/Hurt/BoxNum`) and the client enum, but no `Pve_Info` row
 * references room type 20 anywhere in the real seed data — this content was never actually reachable by players in
 * the original game (same conclusion as docs/qa — the feature was scaffolded, never shipped). Hand-designed from
 * the one piece of real data that *does* exist: `Mission_Info` id 15002 (`packages/db/seed/game/Mission_Info.json.gz`)
 * and `NPC_Info` id 15002 ("BOSS Vợ Chồng", 20,000,000 HP, `Script: GameServerScript.AI.NPC.CoupleBossNPC` — also
 * sourceless, so it runs the generic NPC brain; that's fine, this mission doesn't need the NPC to have custom AI).
 *
 * Design (full reasoning + alternatives in research/qa/mission-sources.md "CoupleBoss15002"):
 * - 2-player co-op vs. one massive-HP boss, same shape as the `CBS600`/`CBS601` family (also just ported, see
 *   generated/Messions/CBS600.ts) which ends the room the instant `GetAllLivingPlayers().Count < 2` — i.e. this
 *   room type is built for exactly 2 players (the couple) and fails the moment either one dies, not just both.
 * - `Mission_Info.TotalTurn` = 200 and `Failure` text explicitly says "Limite de turnos excedido" (turn limit
 *   exceeded) → unlike `Aiga4003` (its closest single-boss sibling, which never checks the turn limit at all),
 *   this one must enforce it — ported with the same `TurnIndex > MissionInfo.TotalTurn - 1` check `Aiga4002` uses.
 * - Spawn position and `SetRelateDemagemRect` use the actual `NPC_Info` row's `X/Y/Width/Height` (not guessed).
 * - Map ID: no `Pve_Info` row exists for this content, so there is no documented map. Reused map 1184 (the arena
 *   `CBS600`'s donor C# sets via `SetMap(1184)`) as the closest same-shape 2-player PvE room — flagged as a
 *   judgment call for the owner in research/qa/mission-sources.md, trivial to change if a better map is picked.
 * - Score thresholds: no `Pve_Info`/score data exists either; reused `Aiga4003`'s shape (a 0–3 grade ladder) with
 *   numbers scaled to this boss's much higher HP, also flagged as a judgment call.
 */
// @ts-nocheck — same untyped C#-member surface as the generated scripts
import { AMissionControl, registerScript } from "../runtime.js";

export class CoupleBoss15002 extends AMissionControl {
  boss = null;
  bossID = 15002;
  kill = 0;

  CalculateScoreGrade(score) {
    super.CalculateScoreGrade(score);
    if (score > 17500) return 3;
    if (score > 16750) return 2;
    if (score > 16000) return 1;
    return 0;
  }

  OnPrepareNewSession() {
    super.OnPrepareNewSession();
    const resources = [this.bossID];
    this.Game.LoadResources(resources);
    this.Game.LoadNpcGameOverResources(resources);
    this.Game.SetMap(1184);
  }

  OnStartGame() {
    super.OnStartGame();
    this.boss = this.Game.CreateBoss(this.bossID, 1170, 370, -1, 1, "");
    const info = this.boss.NpcInfo;
    this.boss.SetRelateDemagemRect(info.X, info.Y, info.Width, info.Height);
  }

  OnNewTurnStarted() {
    super.OnNewTurnStarted();
  }

  OnBeginNewTurn() {
    super.OnBeginNewTurn();
  }

  CanGameOver() {
    if (this.boss != null && this.boss.IsLiving === false) {
      this.kill++;
      return true;
    }
    // CBS600-style 2-player co-op: the room fails the instant either half of the couple is gone.
    if (this.Game.GetAllLivingPlayers().Count < 2) return true;
    if (this.Game.TurnIndex > this.Game.MissionInfo.TotalTurn - 1) return true;
    return false;
  }

  UpdateUIData() {
    super.UpdateUIData();
    return this.kill;
  }

  OnGameOver() {
    super.OnGameOver();
    this.Game.IsWin = this.boss != null && this.boss.IsLiving === false;
  }
}

registerScript("GameServerScript.AI.Messions.CoupleBoss15002", CoupleBoss15002, "mission", "manual");
