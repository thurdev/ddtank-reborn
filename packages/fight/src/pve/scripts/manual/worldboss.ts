/**
 * World boss "BOSS Rồng" (Pve_Info 1243, room type 14): DDTank41 references GameServerScript.AI.Game.ACDragon,
 * Messions.AC1243 and NPC.WorldAcientDragon but the donor (vendor/DDTank4.1) ships none of them. Hand port of the later
 * version's scripts: vendor/DDT-6600/Source/Game.Server/Game.Server.Script/{Game/WorldAncientDragon.cs,
 * Messions/AC1243.cs, NPC/WorldAcientDragon.cs}. PlayerDetail.UpdatePveResult("worldboss", …) is replaced by the
 * server's GAME_ALL_MISSION_OVER totalHurt → world-boss ranking (apps/game onWorldBossHurt).
 */
// @ts-nocheck — same untyped C#-member surface as the generated scripts
import { ABrain, AMissionControl, APVEGameControl, LanguageMgr, registerScript } from "../runtime.js";

/** Game/WorldAncientDragon.cs (registered under the 4.1 name ACDragon too). */
export class WorldAncientDragon extends APVEGameControl {
  OnCreated() {
    this.Game.SetupMissions("1243");
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

/** Messions/AC1243.cs */
export class AC1243 extends AMissionControl {
  boss = null;
  bossID = 1243;
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
    this.Game.AddLoadingFile(1, "bombs/56.swf", "tank.resource.bombs.Bomb56");
    this.Game.AddLoadingFile(2, "image/game/thing/BossBornBgAsset.swf", "game.asset.living.BossBgAsset");
    this.Game.AddLoadingFile(2, "image/game/effect/5/guang.swf", "asset.game.4.guang");
    this.Game.AddLoadingFile(2, "image/game/effect/5/tang.swf", "asset.game.4.tang");
    this.Game.AddLoadingFile(2, "image/game/effect/5/ruodian.swf", "asset.game.4.ruodian");
    this.Game.AddLoadingFile(2, "image/game/thing/BossBornBgAsset.swf", "game.asset.living.xieyanjulongAsset");
    this.Game.SetMap(1243);
  }
  OnStartGame() {
    super.OnStartGame();
    const config = this.Game.BaseLivingConfig();
    config.IsFly = true;
    config.IsWorldBoss = true;
    this.boss = this.Game.CreateBoss(this.bossID, 1170, 370, -1, 0, "", config);
    this.boss.SetRelateDemagemRect(this.boss.NpcInfo.X, this.boss.NpcInfo.Y, this.boss.NpcInfo.Width, this.boss.NpcInfo.Height);
    // Deviation: the 6600 boss starts at Delay = Agility (0) and one-shots 4.1-level players before they can fire;
    // the players get the first turn so every life deals damage to the shared pool.
    let max = 0;
    for (const p of this.Game.GetAllFightPlayers()) max = Math.max(max, p.Delay);
    this.boss.Delay = max + 1;
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

const t = (k) => LanguageMgr.GetTranslation(k);
/** NPC/WorldAcientDragon.cs */
export class WorldAcientDragon extends ABrain {
  m_attackTurn = 0;
  static ShootChat = [t("GameServerScript.AI.NPC.SimpleQueenAntAi.msg4"), t("GameServerScript.AI.NPC.SimpleQueenAntAi.msg5")];
  static KillAttackChat = [t("GameServerScript.AI.NPC.SimpleQueenAntAi.msg13"), t("GameServerScript.AI.NPC.SimpleQueenAntAi.msg14")];

  OnBeginSelfTurn() { super.OnBeginSelfTurn(); }
  OnBeginNewTurn() {
    super.OnBeginNewTurn();
    this.Body.CurrentDamagePlus = 1;
    this.Body.CurrentShootMinus = 1;
  }
  OnCreated() { super.OnCreated(); }
  OnStartAttacking() {
    this.Body.Direction = this.Game.FindlivingbyDir(this.Body);
    let flag = false;
    for (const p of this.Game.GetAllFightPlayers()) if (p.IsLiving && p.X > 1000) flag = true;
    if (flag) this.KillAttackRange(0, this.Game.Map.Info.ForegroundWidth + 1);
    else if (this.m_attackTurn === 0) { this.PersonalAttackC(); ++this.m_attackTurn; }
    else if (this.m_attackTurn === 1) { this.PersonalAttackE(); ++this.m_attackTurn; }
    else { this.KillAttack(); this.m_attackTurn = 0; }
  }
  /** KillAttack(int fx, int tx): players under the dragon get 100× damage. */
  KillAttackRange(fx, tx) {
    const i = this.Game.Random.Next(0, WorldAcientDragon.KillAttackChat.length);
    this.Body.Say(WorldAcientDragon.KillAttackChat[i], 1, 1000);
    this.Body.CurrentDamagePlus = 100;
    this.Body.PlayMovie("beatF", 3000, 0);
    this.Body.RangeAttacking(fx, tx, "cry", 5000, null);
  }
  KillAttack() {
    if (this.Game.FindRandomPlayer() == null) return;
    const i = this.Game.Random.Next(0, WorldAcientDragon.KillAttackChat.length);
    this.Body.Say(WorldAcientDragon.KillAttackChat[i], 1, 1000);
    this.Body.CurrentDamagePlus = 15;
    this.Body.PlayMovie("beatF", 3000, 0);
    this.Body.RangeAttacking(0, this.Body.X + 1000, "cry", 5000, null);
  }
  PersonalAttackC() {
    if (this.Game.FindRandomPlayer() == null) return;
    this.Body.CurrentDamagePlus = 5;
    const i = this.Game.Random.Next(0, WorldAcientDragon.ShootChat.length);
    this.Body.Say(WorldAcientDragon.ShootChat[i], 1, 0);
    this.Game.Random.Next(0, 1200);
    this.Body.PlayMovie("beatC", 1700, 0);
    this.Body.RangeAttacking(0, this.Body.X + 1000, "cry", 4000, null);
  }
  PersonalAttackE() {
    if (this.Game.FindRandomPlayer() == null) return;
    this.Body.CurrentDamagePlus = 10;
    const i = this.Game.Random.Next(0, WorldAcientDragon.ShootChat.length);
    this.Body.Say(WorldAcientDragon.ShootChat[i], 1, 0);
    this.Game.Random.Next(0, 1200);
    this.Body.PlayMovie("beatE", 1700, 0);
    this.Body.RangeAttacking(0, this.Body.X + 1000, "cry", 4000, null);
  }
}

registerScript("GameServerScript.AI.Game.ACDragon", WorldAncientDragon, "game", "manual");
registerScript("GameServerScript.AI.Game.WorldAncientDragon", WorldAncientDragon, "game", "manual");
registerScript("GameServerScript.AI.Messions.AC1243", AC1243, "mission", "manual");
registerScript("GameServerScript.AI.NPC.WorldAcientDragon", WorldAcientDragon, "brain", "manual");
