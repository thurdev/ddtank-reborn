/** Efeitos chamados pelos scripts PvE: usam a mesma lista e os mesmos turnos que os efeitos de equipamento.
 * Referência: vendor/DDTank41/Game.Logic/Effects/{EffectList,ContinueReduceBloodEffect,ReduceStrengthEffect}.cs.
 * O adaptador antigo aplicava dano uma única vez e sempre retornava null em GetOfType, impedindo também a cura.
 */
import { Living, type EffectKind } from "../game/living.js";
import { AbstractEffect, type EffectLike } from "../game/effects.js";
import * as Equip from "../game/equipEffects.js";

export { AbstractEffect };

export class ContinueReduceBloodEffect extends Equip.ContinueReduceBloodEffect {
  static readonly scriptType = 33;
  constructor(count: number, blood: number, source: Living | null = null) { super(count, blood, source); }
}
export class ReduceStrengthEffect extends Equip.ReduceStrengthEffect { static readonly scriptType = 22; }
export class LockDirectionEffect extends Equip.LockDirectionEffect { static readonly scriptType = 35; }
export class AddDamageEffect extends Equip.AddDamageEffect { static readonly scriptType = 4; }
export class ReduceDamageEffect extends Equip.ReduceDamageEffect { static readonly scriptType = 14; }

/** Guard/Damage apenas publicam ícone e duração no C#; não inventa multiplicadores de dano/defesa.
 * vendor/DDTank41/Game.Logic/Effects/GuardEffect.cs:13-43, DamageEffect.cs:13-43, InvinciblyEffect.cs:13-41.
 */
class TimedPictureEffect extends AbstractEffect {
  constructor(type: number, protected count: number, private readonly picture: number | null) { super(type); }
  protected tick = (l: Living): void => { if (--this.count <= 0) this.stop(); };
  override start(l: Living): boolean {
    const previous = l.effectList.getOfType(this.type);
    if (previous instanceof TimedPictureEffect) { previous.count = this.count; return true; }
    return super.start(l);
  }
  override onAttached(l: Living): void {
    l.hooks.on("beginSelfTurn", this.tick);
    if (this.picture != null) l.game.emit({ cmd: "SEND_PICTURE", livingId: l.id, type: this.picture, state: true });
  }
  override onRemoved(l: Living): void {
    l.hooks.off("beginSelfTurn", this.tick);
    if (this.picture != null) l.game.emit({ cmd: "SEND_PICTURE", livingId: l.id, type: this.picture, state: false });
  }
}
export class GuardEffect extends TimedPictureEffect {
  static readonly scriptType = 42;
  constructor(count: number) { super(42, count, 30); }
}
export class DamageEffect extends TimedPictureEffect {
  static readonly scriptType = 41;
  constructor(count: number) { super(41, count, 29); }
}
export class InvinciblyEffect extends TimedPictureEffect {
  static readonly scriptType = 11;
  constructor(count: number) { super(11, count, null); }
}
/** ContinueReduceGreenBloodEffect.cs:18-40: perde sangue a cada turno, até count < 0; tipo distinto do veneno. */
export class ContinueReduceGreenBloodEffect extends TimedPictureEffect {
  static readonly scriptType = 1001;
  constructor(count: number, private readonly blood: number, private readonly source: Living | null = null) { super(1001, count, 28); }
  protected override tick = (l: Living): void => {
    if (--this.count < 0) { this.stop(); return; }
    l.addBlood(-this.blood, 1);
  };
}

class FlagEffect {
  constructor(private readonly kind: EffectKind, private readonly count: number) {}
  start(l: Living): boolean { return l.startEffect(this.kind, this.count); }
}
export class NoHoleEffect extends FlagEffect {
  static readonly scriptType = 12;
  constructor(count: number) { super("nohole", count); }
}
export class IceFronzeEffect extends FlagEffect {
  static readonly scriptType = 9;
  constructor(count: number) { super("ice", count); }
}
export class HideEffect extends FlagEffect {
  static readonly scriptType = 8;
  constructor(count: number) { super("hide", count); }
}
export class SealEffect extends FlagEffect {
  static readonly scriptType = 15;
  constructor(count: number) { super("seal", count); }
}

// Os IDs internos de equipEffects antecedem o adaptador C#; são diferentes dos IDs de eEffectType.
const coreTypes = new Map([[4, 105], [14, 106], [35, 150], [22, 151], [33, 152], [38, 153]]);
const flags = new Map<number, EffectKind>([[9, "ice"], [8, "hide"], [12, "nohole"], [15, "seal"]]);
type ScriptEffect = { start?: (l: Living) => boolean; apply?: (l: Living) => void };

export function startScriptEffect(l: Living, effect: ScriptEffect): boolean {
  if (typeof effect.start === "function") return effect.start(l);
  if (typeof effect.apply === "function") { effect.apply(l); return true; }
  return false;
}

/** EffectList.cs: StopEffect<T>, StopAllEffect e GetOfType sobre o estado real de cada criatura.
 * StopEffect recebe uma classe nos scripts transpilados (ThirdSimpleFagNpc/ThirdSimpleLockNpc).
 */
export function scriptEffectList(l: Living) {
  const get = (type: number): { Stop(): boolean; readonly IsTrigger: boolean } | null => {
    const flag = flags.get(type);
    if (flag) return l.effects.has(flag) ? { Stop: () => { l.stopEffect(flag); return true; }, IsTrigger: false } : null;
    const effect = l.effectList.getOfType(coreTypes.get(type) ?? type);
    return effect ? { Stop: () => l.effectList.remove(effect), get IsTrigger() { return !!(effect as AbstractEffect).isTrigger; } } : null;
  };
  return {
    GetOfType: get,
    StopEffect: (type: number | { scriptType?: number }) => get(typeof type === "number" ? type : type.scriptType ?? -1)?.Stop() ?? false,
    StopAllEffect: () => {
      for (const effect of [...l.effectList.all]) l.effectList.remove(effect);
      for (const flag of [...l.effects.keys()]) l.stopEffect(flag);
    },
    Add: (effect: ScriptEffect & Partial<EffectLike>) => startScriptEffect(l, effect),
  };
}
