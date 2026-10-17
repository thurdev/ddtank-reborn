import { describe, expect, it } from "vitest";
import { PvpGame, type PlayerSpec } from "../src/index.js";
import { loadPackedAssets } from "../src/node.js";
import {
  ContinueReduceBloodEffect, ContinueReduceGreenBloodEffect, ReduceStrengthEffect, LockDirectionEffect,
  GuardEffect, DamageEffect, IceFronzeEffect, HideEffect, AddDamageEffect, ReduceDamageEffect, eEffectType,
} from "../src/pve/scripts/runtime.js";

const assets = loadPackedAssets();
const spec = (userId: number): PlayerSpec => ({
  userId, nickname: `p${userId}`, team: userId, grade: 20, attack: 300, defence: 200, agility: 300,
  lucky: 200, baseAttack: 250, baseDefence: 150, hp: 1500, weapon: { templateId: 7001, property8: 5 },
});
function setup() {
  const game = new PvpGame({ id: 1, roomType: 0, gameType: 0, timeType: 3, mapId: 1001, assets, players: [spec(1), spec(2)], seed: 7 });
  const [a, b] = game.players;
  a!.reset(); b!.reset();
  return { game, a: a!, b: b! };
}

describe("API C# dos efeitos PvE", () => {
  it("AddEffect respeita o atraso e o veneno dura três turnos, não um dano instantâneo", () => {
    const { game, a } = setup();
    a.AddEffect(new ContinueReduceBloodEffect(3, 100, null), 500);
    game.update(499);
    expect(a.EffectList.GetOfType(eEffectType.ContinueReduceBloodEffect)).toBeNull();
    game.update(500);
    expect(a.EffectList.GetOfType(eEffectType.ContinueReduceBloodEffect)).not.toBeNull();
    expect(a.blood).toBe(1500);
    for (let i = 1; i <= 3; i++) {
      a.hooks.emit("beginSelfTurn", a);
      expect(a.blood).toBe(1500 - 100 * i);
    }
    a.hooks.emit("beginSelfTurn", a);
    expect(a.blood).toBe(1200);
    expect(a.EffectList.GetOfType(eEffectType.ContinueReduceBloodEffect)).toBeNull();
  });
  it("reaplicar veneno renova duração sem duplicar dano e permite a cura do chefe", () => {
    const { a } = setup();
    a.EffectList.Add(new ContinueReduceGreenBloodEffect(2, 50));
    a.hooks.emit("beginSelfTurn", a);
    a.EffectList.Add(new ContinueReduceGreenBloodEffect(3, 999));
    a.hooks.emit("beginSelfTurn", a);
    expect(a.blood).toBe(1400); // C# renova somente count, conserva o blood inicial.
    const effect = a.EffectList.GetOfType(eEffectType.ContinueReduceGreenBloodEffect);
    expect(effect).not.toBeNull();
    effect.Stop(); // SeventhSimpleSecondBoss.RemoveGreenBlood
    a.hooks.emit("beginSelfTurn", a);
    expect(a.blood).toBe(1400);
  });
  it("redução de energia é por turno e StopEffect aceita a classe transpilada", () => {
    const { a, b } = setup();
    a.energy = 500;
    a.EffectList.Add(new ReduceStrengthEffect(2, 100));
    expect(a.energy).toBe(500);
    a.hooks.emit("beginSelfTurn", a);
    expect(a.energy).toBe(400);
    expect(b.EffectList.GetOfType(eEffectType.ReduceStrengthEffect)).toBeNull();
    expect(a.EffectList.StopEffect(ReduceStrengthEffect)).toBe(true);
    a.hooks.emit("beginSelfTurn", a);
    expect(a.energy).toBe(400);
  });
  it("trava de direção fica ativa até count < 0 e libera quando o NPC morre", () => {
    const { a } = setup();
    a.EffectList.Add(new LockDirectionEffect(1));
    expect(a.lockDirection).toBe(true);
    a.hooks.emit("beginSelfTurn", a);
    expect(a.lockDirection).toBe(true);
    a.hooks.emit("beginSelfTurn", a);
    expect(a.lockDirection).toBe(false);
    a.EffectList.Add(new LockDirectionEffect(10));
    expect(a.EffectList.StopEffect(LockDirectionEffect)).toBe(true);
    expect(a.lockDirection).toBe(false);
  });
  it("GetOfType encontra o congelamento existente e Stop descongela (FourNormalBlowArmsNpc)", () => {
    const { a } = setup();
    a.EffectList.Add(new IceFronzeEffect(2));
    expect(a.isFrost).toBe(true);
    a.EffectList.GetOfType(eEffectType.IceFronzeEffect).Stop();
    expect(a.isFrost).toBe(false);
  });
  it("Guard/Damage enviam ícones e os retiram no turno certo", () => {
    const { game, a } = setup();
    a.EffectList.Add(new GuardEffect(2));
    a.EffectList.Add(new DamageEffect(2));
    expect(game.drain().filter((e) => e.cmd === "SEND_PICTURE" && e.state).map((e) => e.cmd === "SEND_PICTURE" ? e.type : 0)).toEqual([30, 29]);
    a.hooks.emit("beginSelfTurn", a);
    expect(a.EffectList.GetOfType(eEffectType.GuardEffect)).not.toBeNull();
    a.hooks.emit("beginSelfTurn", a);
    expect(a.EffectList.GetOfType(eEffectType.GuardEffect)).toBeNull();
    expect(game.drain().filter((e) => e.cmd === "SEND_PICTURE" && !e.state)).toHaveLength(2);
  });
  it("StopAllEffect remove hooks e estados apenas da criatura correspondente", () => {
    const { a, b } = setup();
    a.EffectList.Add(new ContinueReduceBloodEffect(3, 100));
    a.EffectList.Add(new HideEffect(3));
    b.EffectList.Add(new HideEffect(3));
    a.EffectList.StopAllEffect();
    a.hooks.emit("beginSelfTurn", a);
    expect(a.blood).toBe(1500);
    expect(a.isHide).toBe(false);
    expect(b.isHide).toBe(true);
    expect(a.effectList.all).toHaveLength(0);
  });
  it("efeito de defesa chamado pelo script usa a mesma lógica do equipamento", () => {
    const { a, b } = setup();
    a.EffectList.Add(new ReduceDamageEffect(30, 100));
    const damage = { damage: 100, critical: 0 };
    a.hooks.emit("beforeTakeDamage", a, b, damage);
    expect(damage.damage).toBe(40);
    expect(a.EffectList.GetOfType(eEffectType.ReduceDamageEffect).IsTrigger).toBe(true);
  });
  it("bônus de dano afeta a saída do atacante, nunca aumenta o dano que ele recebe", () => {
    const { a, b } = setup();
    a.EffectList.Add(new AddDamageEffect(50, 100));
    a.hooks.emit("playerShoot", a);
    expect(a.flyingPartical).toBe(65);
    const incoming = { damage: 100, critical: 0 };
    a.hooks.emit("beforeTakeDamage", a, b, incoming);
    expect(incoming.damage).toBe(100);
    const outgoing = { damage: 100, critical: 0 };
    a.hooks.emit("takePlayerDamage", a, a, outgoing);
    expect(outgoing.damage).toBe(150);
    a.hooks.emit("afterPlayerShooted", a);
    expect(a.flyingPartical).toBe(0);
    a.EffectList.StopAllEffect();
    a.hooks.emit("takePlayerDamage", a, a, outgoing);
    expect(outgoing.damage).toBe(150);
  });
});
