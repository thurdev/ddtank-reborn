/**
 * "Tàu Hải Tặc" (mission 12016, Pve 12016/room 14 world-boss style) + "Thành cổ" world-boss trio (missions
 * 30001/30002/30004, Pve/PveInfo room 14). Same situation as `worldboss.ts`: Mission_Info/NPC_Info (real seed data,
 * `packages/db/seed/game/{Mission_Info,NPC_Info}.json.gz`) reference these classes, but the donor dump
 * (vendor/DDTank4.1) never shipped them — the pve-smoke simulation (`packages/fight/scripts/pve-smoke.ts`,
 * see `research/qa/port-E.md`) flags all four as `missing`, falling back to GenericMission/GenericNpcBrain.
 * Hand port of the later version's scripts (reference only per AGENTS.md): each class below cites its exact
 * `vendor/DDT-6600/Source/Game.Server/Game.Server.Script/{Messions,NPC}/<Name>.cs` source file.
 *
 * Como lê esse código (cada variável, pros nomes que não são óbvios):
 * - `bossID` / `npcID`: ID de NPC_Info (estatísticas + Script do monstro) que a missão instancia.
 * - `m_attackTurn`: contador 0/1/2(/3) que a IA do boss usa pra alternar entre os golpes (ataque fraco → forte →
 *   especial, depois repete) — mesmo padrão de `WorldAcientDragon` em `worldboss.ts`.
 * - `Body.State`: flag lida pela IA (`WorldBatKing.OnStartAttacking`): quando a missão seta `boss.State = 10`,
 *   o boss entra no "golpe de execução" (dano ×100) na próxima vez que atacar.
 */
// @ts-nocheck — same untyped C#-member surface as the generated scripts
import { ABrain, AMissionControl, LanguageMgr, registerScript } from "../runtime.js";

const t = (k: string) => LanguageMgr.GetTranslation(k);
// DDT-6600 reuses the four Fifth-dungeon boss chat lines (SimpleQueenAntAi.msg4/5/13/14) for every world boss —
// same reuse `worldboss.ts`'s WorldAcientDragon already relies on.
const ShootChat = [t("GameServerScript.AI.NPC.SimpleQueenAntAi.msg4"), t("GameServerScript.AI.NPC.SimpleQueenAntAi.msg5")];
const KillPlayerChat = [t("GameServerScript.AI.NPC.SimpleQueenAntAi.msg6"), t("GameServerScript.AI.NPC.SimpleQueenAntAi.msg7")];
const KillAttackChat = [t("GameServerScript.AI.NPC.SimpleQueenAntAi.msg13"), t("GameServerScript.AI.NPC.SimpleQueenAntAi.msg14")];
const ShootedChat = [t("GameServerScript.AI.NPC.SimpleQueenAntAi.msg15"), t("GameServerScript.AI.NPC.SimpleQueenAntAi.msg16")];
const DiedChat = [t("GameServerScript.AI.NPC.SimpleQueenAntAi.msg17")];

/** NPC/CrosairBoss.cs (bossID 72000, "Hải Tặc Trưởng"): melee boss, kill-attack when every living player stands
 * past x>670 (the ship's far rail), otherwise a 3-hit combo (A → B → C, looping). */
export class CrosairBossNpc extends ABrain {
  private m_attackTurn = 0;

  override OnBeginNewTurn(): void {
    super.OnBeginNewTurn();
    this.Body.CurrentDamagePlus = 1;
    this.Body.CurrentShootMinus = 1;
    const info = this.Body.NpcInfo;
    // Donor literally sets the normal rect unconditionally, then overwrites it in the else branch below — ported
    // as-is (the Direction===-1 branch is a no-op repeat of the line above it).
    this.Body.SetRect(info.X, info.Y, info.Width, info.Height);
    if (this.Body.Direction === -1) this.Body.SetRect(info.X, info.Y, info.Width, info.Height);
    else this.Body.SetRect(-info.X - info.Width, info.Y, info.Width, info.Height);
  }
  override OnStartAttacking(): void {
    this.Body.Direction = this.Game.FindlivingbyDir(this.Body);
    let flag = false;
    let num1 = 0;
    for (const p of this.Game.GetAllFightPlayers()) {
      if (p.IsLiving && p.X > 670) {
        const num2 = Math.trunc(this.Body.Distance(p.X, p.Y));
        if (num2 > num1) num1 = num2;
        flag = true;
      }
    }
    if (flag) this.KillAttack(0, this.Game.Map.Info.ForegroundWidth + 1);
    else if (this.m_attackTurn === 0) { this.AttackA(); this.m_attackTurn++; }
    else if (this.m_attackTurn === 1) { this.AttackB(); this.m_attackTurn++; }
    else { this.AttackC(); this.m_attackTurn = 0; }
  }
  private KillAttack(fx: number, tx: number): void {
    this.Body.CurrentDamagePlus = 1000;
    this.Body.PlayMovie("beatA", 1000, 0);
    this.Body.RangeAttacking(fx, tx, "cry", 4000, null);
  }
  private AttackA(): void {
    this.Body.CurrentDamagePlus = 1.5;
    this.Body.PlayMovie("beatA", 1000, 0);
    this.Body.CallFuction(() => this.rangeAttackAll(), 4000);
  }
  private AttackB(): void {
    this.Body.PlayMovie("beatB", 1000, 0);
    this.Body.CallFuction(() => this.rangeAttackAll(), 4000);
  }
  private AttackC(): void {
    this.Body.CurrentDamagePlus = 3.1;
    this.Body.PlayMovie("beatC", 1000, 0);
    this.Body.CallFuction(() => this.rangeAttackAll(), 3500);
  }
  private rangeAttackAll(): void {
    this.Body.RangeAttacking(0, this.Game.Map.Info.ForegroundWidth + 1, "cry", 0, null);
  }
}

/** Messions/CrosairBoss.cs: single-boss boat deck, no waves — mirrors AC1243 in `worldboss.ts` almost exactly. */
export class CrosairBossMission extends AMissionControl {
  private boss: unknown = null;
  private readonly bossID = 72000;
  private kill = 0;
  override CalculateScoreGrade(score: number): number {
    super.CalculateScoreGrade(score);
    if (score > 1750) return 3;
    if (score > 1675) return 2;
    return score > 1600 ? 1 : 0;
  }
  override OnPrepareNewSession(): void {
    super.OnPrepareNewSession();
    this.Game.LoadResources([this.bossID]);
    this.Game.LoadNpcGameOverResources([this.bossID]);
    this.Game.SetMap(12016);
  }
  override OnStartGame(): void {
    super.OnStartGame();
    this.boss = this.Game.CreateBoss(this.bossID, 899, 190, -1, 4, "");
    this.boss.SetRelateDemagemRect(this.boss.NpcInfo.X, this.boss.NpcInfo.Y, this.boss.NpcInfo.Width, this.boss.NpcInfo.Height);
  }
  override CanGameOver(): boolean {
    if (this.boss == null || this.boss.IsLiving) return false;
    this.kill++;
    return true;
  }
  override UpdateUIData(): number {
    super.UpdateUIData();
    return this.kill;
  }
  override OnGameOver(): void {
    super.OnGameOver();
    this.Game.IsWin = this.boss != null && !this.boss.IsLiving;
  }
}

/** NPC/WorldSimpleBat.cs (npcID 30001, "Dơi hút máu"): the AC30001 trash wave. Donor leaves OnStartAttacking as a
 * dead branch (`base` call + an unused local array) — faithfully a non-attacking filler mob. */
export class WorldSimpleBatNpc extends ABrain {
  override OnBeginNewTurn(): void {
    super.OnBeginNewTurn();
    this.Body.CurrentDamagePlus = 1;
    this.Body.CurrentShootMinus = 1;
  }
}

/** NPC/WorldBatKing.cs (npcID 30002, "Bá tước hắc ám", AC30001's boss / AC30002's first phase). */
export class WorldBatKingNpc extends ABrain {
  private m_attackTurn = 0;
  override OnBeginNewTurn(): void {
    super.OnBeginNewTurn();
    this.Body.CurrentDamagePlus = 1;
    this.Body.CurrentShootMinus = 1;
  }
  override OnStartAttacking(): void {
    if (this.Body.State === 10) this.KillAttack(0, this.Game.Map.Info.ForegroundWidth + 1);
    else if (this.m_attackTurn === 0) { this.AttackA(); this.m_attackTurn++; }
    else { this.AttackB(0, this.Game.Map.Info.ForegroundWidth + 1); this.m_attackTurn = 0; }
  }
  private KillAttack(fx: number, tx: number): void {
    const i = this.Game.Random.Next(0, KillAttackChat.length);
    this.Body.Say(KillAttackChat[i], 1, 1000);
    this.Body.CurrentDamagePlus = 100;
    this.Body.PlayMovie("beatB", 3000, 0);
    this.Body.RangeAttacking(fx, tx, "cry", 5000, null);
  }
  private AttackA(): void {
    this.Body.MoveTo(this.Game.Random.Next(173, 1439), this.Game.Random.Next(150, 700), "fly", 3000, "", 12, () => this.AllAttackA());
  }
  private AllAttackA(): void {
    const target = this.Game.FindRandomPlayer();
    this.Body.Direction = this.Game.FindlivingbyDir(this.Body);
    if (target == null) return;
    this.Body.CurrentDamagePlus = 10;
    const i = this.Game.Random.Next(0, ShootChat.length);
    this.Body.Say(ShootChat[i], 1, 0);
    this.Body.PlayMovie("beatA", 1700, 0);
    this.Body.RangeAttacking(0, this.Game.Map.Info.ForegroundWidth + 1, "cry", 4000, null);
  }
  private AttackB(fx: number, tx: number): void {
    const target = this.Game.FindRandomPlayer();
    this.Body.Direction = this.Game.FindlivingbyDir(this.Body);
    if (target == null) return;
    this.Body.CurrentDamagePlus = 15;
    const i = this.Game.Random.Next(0, ShootChat.length);
    this.Body.Say(ShootChat[i], 1, 0);
    this.Body.PlayMovie("beatB", 1900, 0);
    this.Body.RangeAttacking(fx, tx, "cry", 4000, null);
    this.Body.CallFuction(() => this.ShowIn(), 4000);
  }
  private ShowIn(): void {
    this.Body.PlayMovie("in", 100, 0);
  }
  override OnKillPlayerSay(): void {
    super.OnKillPlayerSay();
    const i = this.Game.Random.Next(0, KillPlayerChat.length);
    this.Body.Say(KillPlayerChat[i], 1, 0, 2000);
  }
}

/** NPC/WorldBatKingSecond.cs (npcID 30003, AC30002's second phase — swapped in by the mission once phase 1 dies). */
export class WorldBatKingSecondNpc extends ABrain {
  private m_attackTurn = 0;
  override OnBeginNewTurn(): void {
    super.OnBeginNewTurn();
    this.Body.CurrentDamagePlus = 1;
    this.Body.CurrentShootMinus = 1;
  }
  override OnStartAttacking(): void {
    if (this.m_attackTurn === 0) { this.AttackA(0, this.Game.Map.Info.ForegroundWidth + 1); this.m_attackTurn++; }
    else { this.AttackB(0, this.Game.Map.Info.ForegroundWidth + 1); this.m_attackTurn = 0; }
  }
  private AttackA(fx: number, tx: number): void {
    if (this.Game.FindRandomPlayer() == null) return;
    this.Body.CurrentDamagePlus = 10;
    const i = this.Game.Random.Next(0, ShootChat.length);
    this.Body.Say(ShootChat[i], 1, 0);
    this.Body.PlayMovie("beatA", 1700, 0);
    this.Body.RangeAttacking(fx, tx, "cry", 4000, null);
  }
  private AttackB(fx: number, tx: number): void {
    if (this.Game.FindRandomPlayer() == null) return;
    this.Body.CurrentDamagePlus = 15;
    const i = this.Game.Random.Next(0, ShootChat.length);
    this.Body.Say(ShootChat[i], 1, 0);
    this.Body.PlayMovie("beatB", 1900, 0);
    this.Body.RangeAttacking(fx, tx, "cry", 4000, null);
    this.Body.CallFuction(() => this.GoMovie(), 4000);
  }
  private GoMovie(): void {
    for (const p of this.Game.GetAllFightPlayers()) this.Game.Createlayer(p.X, p.Y, "moive", "asset.game.zero.294b", "out", 1, 0);
    this.Body.PlayMovie("in", 100, 0);
  }
}

/** NPC/WorldSoccerCaptain.cs (npcID 30004, "Đội trưởng", AC30004's boss): 3-hit combo like CrosairBoss, kill-attack
 * zone is the goal area (x 1225..1571) instead of a ship rail. */
export class WorldSoccerCaptainNpc extends ABrain {
  private m_attackTurn = 0;
  private isSay = 0;
  override OnBeginNewTurn(): void {
    super.OnBeginNewTurn();
    this.Body.CurrentDamagePlus = 1;
    this.Body.CurrentShootMinus = 1;
    this.isSay = 0;
  }
  override OnStartAttacking(): void {
    this.Body.Direction = this.Game.FindlivingbyDir(this.Body);
    let flag = false;
    let num1 = 0;
    for (const p of this.Game.GetAllFightPlayers()) {
      if (p.IsLiving && p.X > 1225 && p.X < 1571) {
        const num2 = Math.trunc(this.Body.Distance(p.X, p.Y));
        if (num2 > num1) num1 = num2;
        flag = true;
      }
    }
    if (flag) this.KillAttack(0, this.Game.Map.Info.ForegroundWidth + 1);
    else if (this.m_attackTurn === 0) { this.AttackA(0, this.Game.Map.Info.ForegroundWidth + 1); this.m_attackTurn++; }
    else if (this.m_attackTurn === 1) { this.AttackB(0, this.Game.Map.Info.ForegroundWidth + 1); this.m_attackTurn++; }
    else { this.AttackC(0, this.Game.Map.Info.ForegroundWidth + 1); this.m_attackTurn = 0; }
  }
  private KillAttack(fx: number, tx: number): void {
    const i = this.Game.Random.Next(0, KillAttackChat.length);
    this.Body.Say(KillAttackChat[i], 1, 1000);
    this.Body.CurrentDamagePlus = 100;
    this.Body.PlayMovie("beatD", 3000, 0);
    this.Body.RangeAttacking(fx, tx, "cry", 5000, null);
  }
  private AttackA(fx: number, tx: number): void {
    if (this.Game.FindRandomPlayer() == null) return;
    this.Body.CurrentDamagePlus = 10;
    const i = this.Game.Random.Next(0, ShootChat.length);
    this.Body.Say(ShootChat[i], 1, 0);
    this.Game.Random.Next(0, 1200);
    this.Body.PlayMovie("beatA", 1700, 0);
    this.Body.RangeAttacking(fx, tx, "cry", 4000, null);
  }
  private AttackB(fx: number, tx: number): void {
    if (this.Game.FindRandomPlayer() == null) return;
    this.Body.CurrentDamagePlus = 15;
    const i = this.Game.Random.Next(0, ShootChat.length);
    this.Body.Say(ShootChat[i], 1, 0);
    this.Game.Random.Next(0, 1200);
    this.Body.PlayMovie("beatB", 1900, 0);
    this.Body.RangeAttacking(fx, tx, "cry", 4000, null);
    this.Body.CallFuction(() => this.GoMovie(), 4000);
  }
  private GoMovie(): void {
    for (const p of this.Game.GetAllFightPlayers()) this.Game.Createlayer(p.X, p.Y, "moive", "asset.game.zero.294b", "out", 1, 0);
  }
  private AttackC(fx: number, tx: number): void {
    if (this.Game.FindRandomPlayer() == null) return;
    this.Body.CurrentDamagePlus = 20;
    const i = this.Game.Random.Next(0, ShootChat.length);
    this.Body.Say(ShootChat[i], 1, 0);
    this.Game.Random.Next(0, 1200);
    this.Body.PlayMovie("beatC", 1700, 0);
    this.Body.RangeAttacking(fx, tx, "cry", 4000, null);
  }
  override OnKillPlayerSay(): void {
    super.OnKillPlayerSay();
    const i = this.Game.Random.Next(0, KillPlayerChat.length);
    this.Body.Say(KillPlayerChat[i], 1, 0, 2000);
  }
  override OnShootedSay(): void {
    const i1 = this.Game.Random.Next(0, ShootedChat.length);
    if (this.isSay === 0 && this.Body.IsLiving) {
      this.Body.Say(ShootedChat[i1], 1, 900, 0);
      this.isSay = 1;
    }
    if (this.Body.IsLiving) return;
    const i2 = this.Game.Random.Next(0, DiedChat.length);
    this.Body.Say(DiedChat[i2], 1, 100, 2000);
  }
}

/** Messions/AC30001.cs ("Bá tước hút máu" wave): keeps 10 WorldSimpleBat on the field (respawns whichever died)
 * until 15 total kills, then clears them and spawns the WorldBatKing boss in "execution" state. Donor bug (kept
 * as-is): CanGameOver always `return false` at the end — this mission has no scripted end, same as several
 * donor-side missions already in `scripts/generated/**` that never signal CanGameOver either. */
export class AC30001 extends AMissionControl {
  private boss: unknown = null;
  private readonly npcID = 30001;
  private readonly bossID = 30002;
  private config: unknown = null;
  private someNpc: unknown[] = [];
  private readonly birthX = [443, 515, 683, 723, 800, 606, 785, 842, 910, 1075];
  override CalculateScoreGrade(score: number): number {
    super.CalculateScoreGrade(score);
    if (score > 1750) return 3;
    if (score > 1675) return 2;
    return score > 1600 ? 1 : 0;
  }
  override OnPrepareNewSession(): void {
    super.OnPrepareNewSession();
    this.Game.LoadResources([this.npcID, this.bossID]);
    this.Game.LoadNpcGameOverResources([this.npcID]);
    this.Game.AddLoadingFile(2, "image/game/effect/0/294b.swf", "asset.game.zero.294b");
    this.Game.SetMap(1244);
  }
  override OnStartGame(): void {
    super.OnStartGame();
    this.createNPC();
    this.config = this.Game.BaseLivingConfig();
    this.config.IsFly = true;
    this.config.IsWorldBoss = true;
  }
  private createNPC(): void {
    for (const x of this.birthX) this.someNpc.push(this.Game.CreateNpc(this.npcID, x, this.Game.Random.Next(478, 674), 0, 1, this.config));
  }
  override OnNewTurnStarted(): void {
    super.OnNewTurnStarted();
    if (this.Game.GetLivedLivings().length >= 3) return;
    this.createNPC();
  }
  override CanGameOver(): boolean {
    if (this.Game.TotalKillCount > 15 && this.boss == null) {
      this.Game.ClearAllChild();
      this.boss = this.Game.CreateBoss(this.bossID, 944, 481, -1, 0, "", this.config);
      this.boss.SetRelateDemagemRect(-200, -179, 272, 200);
      this.boss.Say(LanguageMgr.GetTranslation("GameServerScript.AI.Messions.DCSM2002.msg1"), 0, 200, 0);
      this.boss.State = 10;
    }
    return false; // donor bug, ported faithfully — see class doc above
  }
  override UpdateUIData(): number {
    return this.Game.TotalKillCount;
  }
  override OnGameOver(): void {
    super.OnGameOver();
    this.Game.IsWin = this.Game.TotalKillCount > 100;
  }
}

/** Messions/AC30002.cs ("Bá tước hắc ám" two-phase boss): phase 1 (bossID1 30002) swaps into phase 2 (bossID2
 * 30003, 2s head start on its delay) the instant it dies; game over on phase 2's death or the turn limit. */
export class AC30002 extends AMissionControl {
  private boss: unknown = null;
  private boss2: unknown = null;
  private m_state = 30002;
  private readonly bossID1 = 30002;
  private readonly bossID2 = 30003;
  private kill = 0;
  override CalculateScoreGrade(score: number): number {
    super.CalculateScoreGrade(score);
    if (score > 1750) return 3;
    if (score > 1675) return 2;
    return score > 1600 ? 1 : 0;
  }
  override OnPrepareNewSession(): void {
    super.OnPrepareNewSession();
    this.Game.LoadResources([this.bossID1]);
    this.Game.LoadNpcGameOverResources([this.bossID1]);
    this.Game.AddLoadingFile(2, "image/game/effect/0/294b.swf", "asset.game.zero.294b");
    this.Game.SetMap(1250);
  }
  override OnStartGame(): void {
    super.OnStartGame();
    const config = this.Game.BaseLivingConfig();
    config.IsFly = true;
    config.IsWorldBoss = true;
    this.boss = this.Game.CreateBoss(this.bossID1, 944, 581, -1, 0, "", config);
    this.boss.SetRelateDemagemRect(this.boss.NpcInfo.X, this.boss.NpcInfo.Y, this.boss.NpcInfo.Width, this.boss.NpcInfo.Height);
    this.boss.Say(LanguageMgr.GetTranslation("GameServerScript.AI.Messions.DCSM2002.msg1"), 0, 200, 0);
  }
  override CanGameOver(): boolean {
    if (this.Game.TurnIndex > this.Game.TotalTurn - 1) return true;
    if (!this.boss.IsLiving && this.m_state === this.bossID1) this.m_state++;
    if (this.m_state === this.bossID2 && this.boss2 == null) {
      this.boss2 = this.Game.CreateBoss(this.m_state, this.boss.X, this.boss.Y, this.boss.Direction, 0, "");
      this.Game.RemoveLiving(this.boss.Id);
      if (this.boss2.Direction === 1) this.boss2.SetRect(this.boss.NpcInfo.X, this.boss.NpcInfo.Y, this.boss.NpcInfo.Width, this.boss.NpcInfo.Height);
      this.boss2.SetRelateDemagemRect(this.boss.NpcInfo.X, this.boss.NpcInfo.Y, this.boss.NpcInfo.Width, this.boss.NpcInfo.Height);
      let num = 0;
      const random = this.Game.FindRandomPlayer();
      if (random) num = random.Delay;
      for (const p of this.Game.GetAllFightPlayers()) if (p.Delay < num) num = p.Delay;
      this.boss2.AddDelay(num - 2000);
    }
    if (this.boss == null || this.boss.IsLiving) return false;
    this.kill++;
    return true;
  }
  override UpdateUIData(): number {
    super.UpdateUIData();
    return this.kill;
  }
  override OnGameOver(): void {
    super.OnGameOver();
    // donor also sets Game.IsKillWorldBoss on loss; the port doesn't track that flag (see worldboss.ts header note).
    this.Game.IsWin = this.boss != null && !this.boss.IsLiving;
  }
}

/** Messions/AC30004.cs ("Đội trưởng" single boss, soccer-field map). */
export class AC30004 extends AMissionControl {
  private boss: unknown = null;
  private readonly bossID = 30004;
  private kill = 0;
  private m_moive: unknown = null;
  private m_front: unknown = null;
  override CalculateScoreGrade(score: number): number {
    super.CalculateScoreGrade(score);
    if (score > 1750) return 3;
    if (score > 1675) return 2;
    return score > 1600 ? 1 : 0;
  }
  override OnPrepareNewSession(): void {
    super.OnPrepareNewSession();
    this.Game.LoadResources([this.bossID]);
    this.Game.LoadNpcGameOverResources([this.bossID]);
    this.Game.AddLoadingFile(2, "image/game/effect/0/294b.swf", "asset.game.zero.294b");
    this.Game.AddLoadingFile(1, "bombs/24.swf", "tank.resource.bombs.Bomb24");
    this.Game.AddLoadingFile(1, "bombs/25.swf", "tank.resource.bombs.Bomb25");
    this.Game.SetMap(1303);
  }
  override OnStartGame(): void {
    super.OnStartGame();
    const config = this.Game.BaseLivingConfig();
    config.IsFly = false;
    config.IsWorldBoss = true;
    this.boss = this.Game.CreateBoss(this.bossID, 1379, 681, -1, 1, "", config);
    this.boss.SetRelateDemagemRect(this.boss.NpcInfo.X, this.boss.NpcInfo.Y, this.boss.NpcInfo.Width, this.boss.NpcInfo.Height);
    this.boss.Say(LanguageMgr.GetTranslation("GameServerScript.AI.Messions.DCSM2002.msg1"), 0, 200, 0);
    // Donor also sets `player.ChangeSpecialBall = 25` here (Player.cs:237 — forces the ball-config lookup to
    // template 70396 on the player's next SetCurrentWeapon). Nothing in this port touches that field yet (no other
    // ported mission needs it), so it's left as a documented gap instead of half-wiring a single-mission cosmetic.
  }
  override OnBeginNewTurn(): void {
    super.OnBeginNewTurn();
    if (this.Game.TurnIndex <= 1) return;
    if (this.m_moive != null) { this.Game.RemovePhysicalObj(this.m_moive, true); this.m_moive = null; }
    if (this.m_front != null) { this.Game.RemovePhysicalObj(this.m_front, true); this.m_front = null; }
  }
  override CanGameOver(): boolean {
    if (this.boss == null || this.boss.IsLiving) return false;
    this.kill++;
    return true;
  }
  override UpdateUIData(): number {
    super.UpdateUIData();
    return this.kill;
  }
  override OnGameOver(): void {
    super.OnGameOver();
    this.Game.IsWin = this.boss != null && !this.boss.IsLiving;
  }
}

registerScript("GameServerScript.AI.NPC.CrosairBoss", CrosairBossNpc, "brain", "manual");
registerScript("GameServerScript.AI.Messions.CrosairBoss", CrosairBossMission, "mission", "manual");
registerScript("GameServerScript.AI.NPC.WorldSimpleBat", WorldSimpleBatNpc, "brain", "manual");
registerScript("GameServerScript.AI.NPC.WorldBatKing", WorldBatKingNpc, "brain", "manual");
registerScript("GameServerScript.AI.NPC.WorldBatKingSecond", WorldBatKingSecondNpc, "brain", "manual");
registerScript("GameServerScript.AI.NPC.WorldSoccerCaptain", WorldSoccerCaptainNpc, "brain", "manual");
registerScript("GameServerScript.AI.Messions.AC30001", AC30001, "mission", "manual");
registerScript("GameServerScript.AI.Messions.AC30002", AC30002, "mission", "manual");
registerScript("GameServerScript.AI.Messions.AC30004", AC30004, "mission", "manual");

/** NPC_Info 6321/6322 (bosses of missions 6101/6201/6301 — DTGT1165/DTGK1165/DTGAH1165) have
 * `Script = "GameServerScript.AI.NPC.SixTerrorSecondNpc"`, but the only "Six" dungeon tier-2 class the donor
 * actually ships is `NPC/SixTerrorSecondBoss.cs` (generated/NPC/SixTerrorSecondBoss.ts) — "Npc" vs "Boss" data/code
 * name drift, same family as the other Five*SecondNpc / Six*Boss classes already ported. Alias it instead of
 * re-deriving an identical class.
 */
import { SixTerrorSecondBoss } from "../generated/NPC/SixTerrorSecondBoss.js";
registerScript("GameServerScript.AI.NPC.SixTerrorSecondNpc", SixTerrorSecondBoss, "brain", "manual");
