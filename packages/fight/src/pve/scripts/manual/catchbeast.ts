/**
 * "Capturar Nian" (m4-catchbeast, `145 ACTIVITY_SYSTEM` sub 32-36, `CatchBeastPackageType`): hand port of
 * `vendor/DDT-6600/Source/Game.Server/Game.Server.Script/{Game/YearMonster.cs, Messions/YearMonster1347.cs,
 * NPC/YearMonster.cs}` — no `generated/` transpile exists for this donor path (same category as
 * `manual/worldboss.ts`). NPC 73000 ("Nian"/"Niên Thú") already exists in BOTH vendor seed snapshots
 * (`packages/db/seed/game/NPC_Info{,2}.json.gz`, `Script: "GameServerScript.AI.NPC.YearMonster"`,
 * `Blood: 3000000` matching `GameProperties.YearMonsterHP` exactly) — only the `Pve_Info`/`Mission_Info` LINK
 * rows were missing (`packages/db/drizzle/0022_bright_rogue.sql`). `PlayerDetail.UpdatePveResult("yearmonter",
 * …)` is replaced by the server's `GAME_ALL_MISSION_OVER` totalHurt hook (`apps/game` `onCatchBeastHurt`,
 * same shape as `onWorldBossHurt`) — this script itself only needs `OnGameOver` to decide `Game.IsWin`
 * (`totalHurt` comes from the engine's own per-player damage tally, not from this script).
 *
 * NOT ported: `Messions/YearMonster.cs` (the OTHER mission, map 1345 — an older/alternate variant the Game
 * script here never references: `OnCreated` hardcodes `SetupMissions("1347")`, i.e. ONLY
 * `Messions.YearMonster1347`). No `Pve_Info` row points at map 1345 either, so porting it would be dead code.
 */
// @ts-nocheck — same untyped C#-member surface as the generated scripts
import { ABrain, AMissionControl, APVEGameControl, registerScript } from "../runtime.js";

/** Game/YearMonster.cs */
export class YearMonster extends APVEGameControl {
  OnCreated() {
    this.Game.SetupMissions("1347");
    this.Game.TotalMissionCount = 1;
  }
  OnPrepated() {
    this.Game.SessionId = 0;
  }
  CalculateScoreGrade(score) {
    if (score > 800) return 3;
    if (score > 725) return 2;
    return score > 650 ? 1 : 0;
  }
  OnGameOverAllSession() {}
}

/** Messions/YearMonster1347.cs */
export class YearMonster1347 extends AMissionControl {
  boss = null;
  bossID = 73000;
  kill = 0;
  CalculateScoreGrade(score) {
    super.CalculateScoreGrade(score);
    if (score > 1750) return 3;
    if (score > 1675) return 2;
    return score > 1600 ? 1 : 0;
  }
  OnPrepareNewSession() {
    super.OnPrepareNewSession();
    this.Game.LoadResources([this.bossID]);
    this.Game.LoadNpcGameOverResources([this.bossID]);
    this.Game.AddLoadingFile(2, "image/game/effect/15/305b.swf", "asset.game.fifteen.305b");
    this.Game.AddLoadingFile(2, "image/game/effect/15/305d.swf", "asset.game.fifteen.305d");
    this.Game.SetMap(1347);
  }
  OnStartGame() {
    super.OnStartGame();
    this.boss = this.Game.CreateBoss(this.bossID, 1171, 468, -1, 1, "");
    this.boss.SetRelateDemagemRect(this.boss.NpcInfo.X, this.boss.NpcInfo.Y, this.boss.NpcInfo.Width, this.boss.NpcInfo.Height);
  }
  OnNewTurnStarted() { super.OnNewTurnStarted(); }
  OnBeginNewTurn() { super.OnBeginNewTurn(); }
  CanGameOver() {
    if (this.boss == null || this.boss.IsLiving) return false;
    ++this.kill;
    return true;
  }
  UpdateUIData() {
    super.UpdateUIData();
    return this.kill;
  }
  OnGameOver() {
    super.OnGameOver();
    this.Game.IsWin = this.boss != null && !this.boss.IsLiving;
  }
}

/** NPC/YearMonster.cs */
export class YearMonsterNpc extends ABrain {
  m_attackTurn = 0;
  moive = null;
  target = null;

  OnBeginSelfTurn() { super.OnBeginSelfTurn(); }
  OnBeginNewTurn() {
    super.OnBeginNewTurn();
    this.Body.CurrentDamagePlus = 1;
    this.Body.CurrentShootMinus = 1;
    const info = this.Body.NpcInfo;
    this.Body.SetRect(info.X, info.Y, info.Width, info.Height);
    if (this.Body.Direction === -1) this.Body.SetRect(info.X, info.Y, info.Width, info.Height);
    else this.Body.SetRect(-info.X - info.Width, info.Y, info.Width, info.Height);
  }
  OnCreated() { super.OnCreated(); }
  OnStartAttacking() {
    this.Body.Direction = this.Game.FindlivingbyDir(this.Body);
    let flag = false;
    let num1 = 0;
    for (const p of this.Game.GetAllFightPlayers()) {
      if (p.IsLiving && p.X > 1000) {
        const num2 = Math.trunc(this.Body.Distance(p.X, p.Y));
        if (num2 > num1) num1 = num2;
        flag = true;
      }
    }
    if (flag) this.KillAttack(0, this.Game.Map.Info.ForegroundWidth + 1);
    else if (this.m_attackTurn === 0) { this.AttackA(); ++this.m_attackTurn; }
    else if (this.m_attackTurn === 1) { this.AttackB(); ++this.m_attackTurn; }
    else if (this.m_attackTurn === 2) { this.AttackC(); ++this.m_attackTurn; }
    else {
      this.AttackD();
      this.target = this.Game.FindRandomPlayer();
      if (this.target != null) this.m_attackTurn = this.target.X >= 400 ? 1 : 0;
    }
  }
  OnStopAttacking() { super.OnStopAttacking(); }

  KillAttack(fx, tx) {
    this.Body.CurrentDamagePlus = 1000;
    this.Body.PlayMovie("beatE", 2000, 0);
    this.Body.RangeAttacking(fx, tx, "cry", 3000, null);
  }
  AttackA() {
    this.Body.CurrentDamagePlus = 1.5;
    this.Body.PlayMovie("beatA", 1000, 0);
    this.Body.CallFuction(this.MovingPlayer.bind(this), 3000);
  }
  MovingPlayer() {
    for (const p of this.Game.GetAllPlayers()) p.StartSpeedMult(p.X - 200, p.Y);
    this.Body.CallFuction(this.RangeAttacking.bind(this), 1000);
  }
  AttackB() {
    this.Body.PlayMovie("beatB", 3000, 0);
    this.Body.CallFuction(this.GoShootB.bind(this), 4000);
  }
  AttackC() {
    this.Body.CurrentDamagePlus = 3.1;
    this.Body.PlayMovie("beatC", 3000, 0);
    this.Body.CallFuction(this.RangeAttacking.bind(this), 4500);
  }
  AttackD() {
    this.Body.PlayMovie("beatD", 3000, 0);
    this.Body.CallFuction(this.GoShootD.bind(this), 4000);
  }
  GoShootB() {
    this.Body.CurrentDamagePlus = 2.5;
    this.target = this.Game.FindRandomPlayer();
    if (this.target == null) return;
    this.Game.SendGameFocus(this.target, 0, 1000);
    this.moive = this.Game.Createlayer(this.target.X, this.target.Y, "moive", "asset.game.fifteen.305b", "out", 1, 1);
    this.Body.CallFuction(this.GoOutB.bind(this), 2000);
    this.Body.CallFuction(this.RangeAttacking.bind(this), 1000);
  }
  GoOutB() {
    if (this.moive == null) return;
    this.Game.RemovePhysicalObj(this.moive, true);
    this.moive = null;
  }
  GoShootD() {
    this.Body.CurrentDamagePlus = 7.5;
    this.target = this.Game.FindRandomPlayer();
    if (this.target == null) return;
    this.Game.SendGameFocus(this.target, 0, 1000);
    this.moive = this.Game.Createlayer(this.target.X, this.target.Y, "moive", "asset.game.fifteen.305d", "out", 1, 1);
    this.Body.CallFuction(this.GoOutD.bind(this), 2000);
    this.Body.CallFuction(this.RangeAttacking.bind(this), 1000);
  }
  GoOutD() {
    this.Game.SendGameFocus(this.Body, 0, 1000);
    this.Body.PlayMovie("born", 1000, 0);
    if (this.moive == null) return;
    this.Game.RemovePhysicalObj(this.moive, true);
    this.moive = null;
  }
  RangeAttacking() {
    this.Body.RangeAttacking(0, this.Game.Map.Info.ForegroundWidth + 1, "cry", 0, null);
  }
}

registerScript("GameServerScript.AI.Game.YearMonster", YearMonster, "game", "manual");
registerScript("GameServerScript.AI.Messions.YearMonster1347", YearMonster1347, "mission", "manual");
registerScript("GameServerScript.AI.NPC.YearMonster", YearMonsterNpc, "brain", "manual");
