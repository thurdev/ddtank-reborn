/**
 * Aba no jogo: Forja › Forno › Gemas (Fig Spirit). Este arquivo é só o MODELO de dados dos 3 slots
 * de gema por equipamento (nível/exp/posição) — fórmulas puras, fáceis de testar isoladas. O pacote
 * que de fato usa isso é `espirito-de-luta.ts` (209 FIGHT_SPIRIT).
 * Pacotes: nenhum direto (ver `espirito-de-luta.ts`).
 * C#: `FightSpiritTemplateMgr.cs`, `FigSpiritUpGradeHandler.cs`.
 * Como testar: sem teste automatizado dedicado ainda (funções puras, fáceis de cobrir).
 */

/** FightSpiritTemplateMgr.Exps() (Bussiness/Managers/FightSpiritTemplateMgr.cs:111-115): acumulado por nível 0..5. */
export const FIGHT_SPIRIT_EXPS = [0, 600, 5220, 15840, 39020, 89580];

export interface FigSpiritSlot { level: number; exp: number; place: number }

/** `UserGemStone.FigSpiritIdValue` = "nível,exp,posição" × 3 separados por "|" (GamePlayer.cs:5964). */
export function parseFigSpiritIdValue(value: string): FigSpiritSlot[] {
  return value.split("|").map((part) => {
    const [level, exp, place] = part.split(",").map(Number);
    return { level: level ?? 0, exp: exp ?? 0, place: place ?? 0 };
  });
}
export function formatFigSpiritIdValue(slots: FigSpiritSlot[]): string {
  return slots.map((slot) => `${slot.level},${slot.exp},${slot.place}`).join("|");
}

/** FigSpiritUpGradeHandler.IsMaxLv: só os slots 0,1,2 (índice do array, não `.place`) contam. */
export function isMaxFightSpiritLevel(slots: FigSpiritSlot[], goldenLv: number): boolean {
  return slots[0]?.level === goldenLv && slots[1]?.level === goldenLv && slots[2]?.level === goldenLv;
}

/** FigSpiritUpGradeHandler.getNeedExp (:132-137): exp que falta pro próximo nível na escala acumulada `exps`. */
export function neededFightSpiritExp(curExp: number, curLv: number, exps: number[] = FIGHT_SPIRIT_EXPS): number {
  const totalExp = exps[curLv + 1] ?? 0;
  const currExp = curExp + (exps[curLv] ?? 0);
  return totalExp - currExp;
}

/** FigSpiritUpGradeHandler.canUpLv (:144-152): sobe quando `exp` cobre o degrau `exps[i]-exps[i-1]` do nível atual. */
export function canLevelUpFightSpirit(exp: number, curLv: number, exps: number[] = FIGHT_SPIRIT_EXPS): boolean {
  for (let i = 1; i < exps.length; i++) {
    if (exp >= exps[i]! - exps[i - 1]! && curLv === i - 1) return true;
  }
  return false;
}

/**
 * FigSpiritUpGradeHandler.UpdateGem (:160-183): substitui o slot mudado (por `.place` original); se subiu de
 * nível, reordena os 3 por nível/exp ascendente e reatribui `.place` como 2 (mais fraco), 1, 0 (mais forte) —
 * a ORDEM do array final já é a ordem de `.place` reatribuído, e essa ordem é o que vira a string salva.
 */
export function reorderFightSpiritSlots(slots: FigSpiritSlot[], changed: FigSpiritSlot, leveledUp: boolean): FigSpiritSlot[] {
  const next = slots.map((slot) => (slot.place === changed.place ? changed : slot));
  if (!leveledUp) return next;
  const sorted = [...next].sort((a, b) => a.level - b.level || a.exp - b.exp);
  const places = [2, 1, 0];
  return sorted.map((slot, index) => ({ ...slot, place: places[index]! }));
}
