/**
 * Pet skill elements: `Game.Logic/PetEffects/**\/*.cs`, dispatched by `Player.InitPetSkillEffect()` (Player.cs:
 * 769-...) — for every skill in the pet's `SkillEquip`, `Pet_Skill_Info.ElementIDs` (comma-joined) names one or more
 * "element" classes: `Element/Actives/AE####.cs` (fires when the pet's own ball lands, e.g. extra projectile),
 * `Element/Passives/PE####.cs` (fires automatically — on shoot, on turn, HP-based damage…), `ContinueElement/
 * CE####.cs` (a timed status those Actives/Passives apply to a target: stun, bleed, defence buff…). All three share
 * `AbstractPetEffect`/`PetEffectList` (same shape as the gem/card lists — see effects.ts's generic `EffectListOf`).
 *
 * Scope: this file ports the *framework* (`applyPetSkillEffects`, mirroring `InitPetSkillEffect`'s per-skill
 * `ElementIDs` loop) plus one fully-worked `ContinueElement` example (`CE1067`, below) to prove the pattern end to
 * end against a real C# class. The remaining ~250 element ids (`vendor/DDTank41/Game.Logic/PetEffects/
 * ContinueElement/CE*.cs` ≈130, `Element/Actives/AE*.cs` + `Element/Passives/PE*.cs` ≈120) are NOT ported — each is
 * a small (~60-line) hand-written class and porting all of them faithfully is a large, boundable follow-up (one
 * agent-day class of task, not a per-file mechanical transform — many share a shape but trigger/condition/formula
 * details differ per id). `applyPetSkillEffects` silently skips unregistered ids instead of crashing, so adding
 * more later is additive: implement the class, add it to `REGISTRY`.
 */
import type { Living, Player } from "./living.js";
import { AbstractPetEffect } from "./effects.js";

const T = { CE1067: 1067 } as const;

/** PetEffects/ContinueElement/CE1067.cs — "thorns": while active, the next hit taken each self-turn reflects 30%
 * of its damage back at the attacker; decays over `count` self-turns (`ColdDown` from `Pet_Skill_Info`). */
export class CE1067 extends AbstractPetEffect {
  private trigger = false;
  constructor(private count: number) {
    super(T.CE1067);
  }
  override start(living: Living): boolean {
    const o = living.petEffectList.getOfType(T.CE1067) as CE1067 | undefined;
    if (o) return true; // CE1067.Start: a second copy is a no-op (no probability to raise, unlike the gem effects)
    return super.start(living);
  }
  private readonly onSelfTurn = (l: Living) => {
    this.count--;
    this.trigger = true;
    if (this.count < 0) {
      this.trigger = false;
      this.stop();
    }
  };
  private readonly onTakenHit = (l: Living, source: Living, damage: number) => {
    if (!this.trigger) return;
    const reflected = Math.trunc((damage * 30) / 100);
    source.addBlood(-reflected, 1);
    this.trigger = false;
  };
  protected override onAttachedToPlayer(p: Player): void {
    p.hooks.on("beginSelfTurn", this.onSelfTurn);
    p.hooks.on("afterTakenHit", this.onTakenHit);
  }
  protected override onRemovedFromPlayer(p: Player): void {
    p.hooks.off("beginSelfTurn", this.onSelfTurn);
    p.hooks.off("afterTakenHit", this.onTakenHit);
  }
}

/** Pet_Skill_Info row shape `InitPetSkillEffect` reads (PetMgr.FindPetSkill). */
export interface PetSkillRow {
  elementIds: string;
  coldDown: number;
  probability: number;
  delay: number;
  gameType: number;
}

type ElementFactory = (row: PetSkillRow, skillId: number, elementId: string) => AbstractPetEffect;
const REGISTRY = new Map<string, ElementFactory>([["1067", (row) => new CE1067(row.coldDown)]]);

/** Player.InitPetSkillEffect (Player.cs:769-...): one effect per `ElementIDs` entry of every equipped pet skill. */
export function applyPetSkillEffects(player: Player, skills: { skillId: number; row: PetSkillRow }[]): void {
  for (const { skillId, row } of skills) {
    for (const elementId of row.elementIds.split(",")) {
      if (!elementId) continue;
      const factory = REGISTRY.get(elementId);
      if (factory) factory(row, skillId, elementId).start(player);
    }
  }
}
