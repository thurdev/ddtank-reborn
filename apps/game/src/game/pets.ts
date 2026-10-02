/**
 * Pets (lobby side): PetMgr (Game.Logic/PetMgr.cs), UsersPetInfo.BuildProp / ReduceProp / MaxLevel
 * (SqlDataProvider/Data/UsersPetInfo.cs) and PetAbstractInventory / PetInventory (Game.Server/GameUtils). Pure logic: the
 * handler (handlers/pets.ts) sends packets, db/pets.ts persists.
 */
import type { game } from "@ddt/db";

export type PetTemplate = typeof game.Pet_Template_Info.$inferSelect & { WashGetCount?: number };
export type PetSkill = typeof game.Pet_Skill_Info.$inferSelect;
export type PetSkillTemplate = typeof game.Pet_Skill_Template_Info.$inferSelect;

export interface PetTables {
  templates: Map<number, PetTemplate>;
  /** Pet_Level: GP needed for level (index = level). */
  levelGp: Map<number, number>;
  config: Map<string, string>;
  skills: Map<number, PetSkill>;
  skillTemplates: PetSkillTemplate[];
}

export function emptyPetTables(): PetTables {
  return { templates: new Map(), levelGp: new Map(), config: new Map(), skills: new Map(), skillTemplates: [] };
}

/** Sys_Users_Pet row (+ PetEquips decoded from eQPets). */
export interface UserPetRow {
  ID: number; TemplateID: number; Name: string; UserID: number;
  Attack: number; Defence: number; Luck: number; Agility: number; Blood: number; Damage: number; Guard: number;
  AttackGrow: number; DefenceGrow: number; LuckGrow: number; AgilityGrow: number; BloodGrow: number; DamageGrow: number; GuardGrow: number;
  Level: number; GP: number; MaxGP: number; Hunger: number; PetHappyStar: number; MP: number;
  IsEquip: boolean; Place: number; IsExit: boolean; Skill: string; SkillEquip: string; currentStarExp: number;
  breakGrade: number; breakAttack: number; breakDefence: number; breakAgility: number; breakLuck: number; breakBlood: number;
  eQPets: string; BaseProp: string;
  dirty?: boolean;
}

export function cfgNum(t: PetTables, key: string, def: number): number {
  const v = Number(t.config.get(key));
  return t.config.has(key) && Number.isFinite(v) ? v : def;
}

/** .NET Random.Next(min, max): max exclusive, min when max <= min. */
export type Rnd = () => number;
export function nextRange(rnd: Rnd, min: number, max: number): number {
  return max <= min ? min : min + Math.floor(rnd() * (max - min));
}

/** UsersPetInfo.ReduceProp: happiness 2 → −20 %, 1 → −40 %. */
export function reduceProp(pet: Pick<UserPetRow, "PetHappyStar">, v: number): number {
  if (pet.PetHappyStar === 2) return Math.trunc((v * 20) / 100);
  if (pet.PetHappyStar === 1) return Math.trunc((v * 40) / 100);
  return 0;
}

/** UsersPetInfo.MaxLevel (break grade). */
export function petMaxLevel(breakGrade: number): number {
  return ({ 1: 63, 2: 65, 3: 68, 4: 70 } as Record<number, number>)[breakGrade] ?? 60;
}

/** PetMgr.GetAddedPropArr */
function addedPropArr(grade: number, p: number[]): number[] {
  return p.map((v, i) => v * Math.pow(i === 0 ? 2 : 1.5, grade - 1));
}

/** UsersPetInfo.BuildProp: Blood/Attack/Defence/Agility/Luck from the grow values and the level. */
export function buildProp(pet: UserPetRow): void {
  const base = [pet.BloodGrow * 10, pet.AttackGrow, pet.DefenceGrow, pet.AgilityGrow, pet.LuckGrow];
  const grow = [pet.BloodGrow, pet.AttackGrow, pet.DefenceGrow, pet.AgilityGrow, pet.LuckGrow];
  const g1 = addedPropArr(1, grow), g2 = addedPropArr(2, grow), g3 = addedPropArr(3, grow);
  const L = pet.Level;
  const r = base.map((b, i) => {
    let v: number;
    if (L < 30) v = b + (L - 1) * g1[i]!;
    else if (L < 50) v = b + ((L - 30) * g2[i]! + 29 * g1[i]!);
    else v = b + ((L - 50) * g3[i]! + 20 * g2[i]! + 29 * g1[i]!);
    return Math.trunc(Math.ceil(v / 10) / 10);
  });
  [pet.Blood, pet.Attack, pet.Defence, pet.Agility, pet.Luck] = r as [number, number, number, number, number];
}

/** PetMgr.GetLevel(GP, maxLevel) */
export function petLevelForGp(t: PetTables, gp: number, maxLevel: number): number {
  const at = (l: number) => t.levelGp.get(l) ?? Number.MAX_SAFE_INTEGER;
  if (gp >= at(maxLevel)) return maxLevel;
  for (let i = 1; i <= maxLevel; i++) if (gp < at(i)) return i - 1 === 0 ? 1 : i - 1;
  return 1;
}

/** PetMgr.GetGP(level, maxLevel): 0 above the cap. */
export function petGpForLevel(t: PetTables, level: number, maxLevel: number): number {
  return level >= 1 && level <= maxLevel ? (t.levelGp.get(level) ?? 0) : 0;
}

/** PetMgr.ActiveEquipSkill: "skillId,slot" × 5, -1 = locked (levels 20/30/50, slot 4 needs VIP 7). */
export function activeEquipSkill(level: number, vipLevel: number): string {
  const s = ["0,0", "-1,1", "-1,2", "-1,3", "-1,4"];
  if (level >= 20) s[1] = "0,1";
  if (level >= 30) s[2] = "0,2";
  if (level >= 50) s[3] = "0,3";
  if (vipLevel >= 7) s[4] = "0,4";
  return s.join("|");
}

/** PetMgr.GetPetSkillByKindID(kind, level, maxLevel): learnt skill ids (DeleteSkillIDs removed), sorted. */
export function petSkillsByKind(t: PetTables, kind: number, level: number, maxLevel: number): number[] {
  const list = t.skillTemplates.filter((s) => (kind === 12 ? (s.KindID === 11 && s.SkillID < 363) || s.KindID === 12 : s.KindID === kind));
  const out: number[] = [];
  const del: number[] = [];
  const lv = Math.min(level, maxLevel);
  for (let i = 1; i <= lv; i++)
    for (const s of list)
      if (s.MinLevel === i) {
        for (const d of (s.DeleteSkillIDs ?? "").split(",")) if (d.trim()) del.push(Number(d));
        out.push(s.SkillID);
      }
  for (const d of del) {
    const k = out.indexOf(d);
    if (k >= 0) out.splice(k, 1);
  }
  return out.sort((a, b) => a - b);
}

/** PetMgr.UpdateSkillPet: "id,0|id,1|…" */
export function updateSkillPet(t: PetTables, level: number, templateId: number, maxLevel: number): string {
  const info = t.templates.get(templateId);
  if (!info) return "";
  return petSkillsByKind(t, info.KindID, level, maxLevel).map((id, i) => `${id},${i}`).join("|");
}

/** PetMgr.UpdateEvolution: template id evolves at EvolutionLevel1/2 (last digit 1 → +1/+2, 2 → +1). */
export function updateEvolution(t: PetTables, templateId: number, lv: number): { templateId: number; times: number } {
  const e1 = cfgNum(t, "EvolutionLevel1", 30), e2 = cfgNum(t, "EvolutionLevel2", 50);
  const last = String(templateId).slice(-1);
  let next = templateId, times = 1;
  if (last === "1") {
    if (lv < e1) next = templateId;
    else if (lv < e2) next = templateId + 1;
    else { next = templateId + 2; times = 2; }
  } else if (last === "2") next = templateId + 1;
  return { templateId: t.templates.has(next) ? next : templateId, times };
}

/** PetMgr.GetEvolutionPropArr (propArr unused by the caller; growArr = room left per stat). */
function evolutionGrowArr(pet: UserPetRow, tpl: PetTemplate): number[] {
  const cur = [pet.BloodGrow, pet.AttackGrow, pet.DefenceGrow, pet.AgilityGrow, pet.LuckGrow];
  const old = [tpl.HighBloodGrow, tpl.HighAttackGrow, tpl.HighDefenceGrow, tpl.HighAgilityGrow, tpl.HighLuckGrow];
  const grade = pet.Level < 30 ? 1 : pet.Level < 50 ? 2 : 3;
  return addedPropArr(grade, old).map((g, i) => Math.ceil((g - cur[i]!) / 10) / 10);
}

/** PetAbstractInventory.UpdateEvolutionPet (skills re-learnt, equipped skills reset to ActiveEquipSkill like the original). */
export function updateEvolutionPet(t: PetTables, pet: UserPetRow, level: number, maxLevel: number, vipLevel: number, rnd: Rnd = Math.random): void {
  const ev = updateEvolution(t, pet.TemplateID, level);
  if (ev.templateId > pet.TemplateID) {
    pet.TemplateID = ev.templateId;
    const tpl = t.templates.get(ev.templateId);
    if (tpl) {
      for (let i = 0; i < ev.times; i++) {
        const g = evolutionGrowArr(pet, tpl);
        const min = tpl.RareLevel * 0.1;
        const add = (k: number) => (min < g[k]! ? Math.trunc((min + rnd() * (g[k]! - min)) * 10) : 0);
        pet.BloodGrow += add(0); pet.AttackGrow += add(1); pet.DefenceGrow += add(2); pet.AgilityGrow += add(3); pet.LuckGrow += add(4);
      }
    }
  }
  const s = updateSkillPet(t, level, pet.TemplateID, maxLevel);
  if (s) pet.Skill = s;
  pet.SkillEquip = activeEquipSkill(level, vipLevel);
  buildProp(pet);
}

/** PetMgr.CreatePet: random grow values from the template's High* and star level. */
export function createPet(t: PetTables, info: PetTemplate, userId: number, place: number, playerLevel: number, vipLevel: number, rnd: Rnd = Math.random): UserPetRow {
  const star = info.StarLevel * 0.1;
  const r = (hi: number) => nextRange(rnd, Math.trunc(hi / (1.7 - star)), hi - Math.trunc(hi / 17.1));
  const pet: UserPetRow = {
    ID: 0, TemplateID: info.TemplateID, Name: info.Name, UserID: userId,
    Attack: 0, Defence: 0, Luck: 0, Agility: 0, Blood: 0, Damage: 0, Guard: 0,
    BloodGrow: Math.trunc(Math.ceil(r(info.HighBlood) / 10)), AttackGrow: r(info.HighAttack), DefenceGrow: r(info.HighDefence),
    AgilityGrow: r(info.HighAgility), LuckGrow: r(info.HighLuck), DamageGrow: 0, GuardGrow: 0,
    Level: 1, GP: 0, MaxGP: t.levelGp.get(2) ?? 55, Hunger: 10000, PetHappyStar: 3, MP: 0,
    IsEquip: false, Place: place, IsExit: true, Skill: "", SkillEquip: "", currentStarExp: 0,
    breakGrade: 0, breakAttack: 0, breakDefence: 0, breakAgility: 0, breakLuck: 0, breakBlood: 0, eQPets: "[]", BaseProp: "", dirty: true,
  };
  buildProp(pet);
  pet.Skill = updateSkillPet(t, 1, info.TemplateID, playerLevel);
  pet.SkillEquip = activeEquipSkill(1, vipLevel);
  return pet;
}

/** "id,slot|…" → [[id, slot]] (bad parts skipped). */
export function parsePairs(s: string): [number, number][] {
  return (s || "").split("|").map((x) => x.split(",").map(Number)).filter((a) => a.length >= 2 && a.every(Number.isFinite)).map((a) => [a[0]!, a[1]!]);
}

/** Equipped skill ids (slots with an id > 0). */
export function equippedSkillIds(pet: Pick<UserPetRow, "SkillEquip">): number[] {
  return parsePairs(pet.SkillEquip).map(([id]) => id).filter((id) => id > 0);
}

export interface FeedResult { ok: boolean; msg?: [string, ...unknown[]]; consume: number; levelUp: boolean }

/**
 * FeedPet.cs: food Property1 = hunger, Property2 = exp per unit (334100 = essence carrying GP + break stats). Levels via
 * Pet_Level up to min(player level cap, pet MaxLevel); returns how many units to consume.
 */
export function feedPet(t: PetTables, pet: UserPetRow, food: { TemplateID: number; Count: number; Property1: number; Property2: number; DefendCompose?: number; holes?: number[]; Blood?: number },
  maxLevelByGrade: number, vipLevel: number, rnd: Rnd = Math.random): FeedResult {
  const maxHunger = cfgNum(t, "MaxHunger", 10000);
  let need = food.Count;
  const expItem = food.Property2;
  const hungerAdd = need * food.Property1;
  const totalHunger = hungerAdd + pet.Hunger;
  let exp = need * expItem;
  if (food.TemplateID === 334100) {
    exp = food.DefendCompose ?? 0;
    const h = food.holes ?? [];
    pet.breakGrade = Math.max(pet.breakGrade, h[0] ?? 0);
    pet.breakBlood = Math.max(pet.breakBlood, food.Blood ?? 0);
    pet.breakAttack = Math.max(pet.breakAttack, h[1] ?? 0);
    pet.breakDefence = Math.max(pet.breakDefence, h[2] ?? 0);
    pet.breakAgility = Math.max(pet.breakAgility, h[3] ?? 0);
    pet.breakLuck = Math.max(pet.breakLuck, h[4] ?? 0);
  }
  const cap = Math.min(maxLevelByGrade, petMaxLevel(pet.breakGrade));
  if (pet.Level < cap) {
    exp += pet.GP;
    const cur = pet.Level;
    const next = petLevelForGp(t, exp, cap);
    const maxGP = petGpForLevel(t, next + 1, cap);
    const gpMax = petGpForLevel(t, cap, cap);
    const finalExp = exp;
    if (exp > gpMax) {
      exp -= gpMax;
      if (exp >= expItem && expItem !== 0) need -= Math.ceil(exp / expItem);
    }
    pet.GP = finalExp >= gpMax ? gpMax : finalExp;
    pet.Level = next;
    pet.MaxGP = maxGP === 0 ? gpMax : maxGP;
    pet.Hunger = Math.min(totalHunger, maxHunger);
    const levelUp = cur < next;
    if (levelUp) updateEvolutionPet(t, pet, next, cap, vipLevel, rnd);
    pet.dirty = true;
    return { ok: true, consume: food.TemplateID === 334100 ? food.Count : Math.max(0, need), levelUp, msg: levelUp ? ["FeedPet.Success", pet.Name, next] : undefined };
  }
  if (pet.Hunger < maxHunger) {
    pet.Hunger = Math.min(totalHunger, maxHunger);
    pet.dirty = true;
    return { ok: true, consume: need, levelUp: false, msg: ["PetHandler.Msg10", hungerAdd] };
  }
  return { ok: false, consume: 0, levelUp: false, msg: ["PetHandler.Msg11"] };
}

/** PetAbstractInventory / PetInventory (20 slots). Changed places are flushed as one 68/1 by the caller. */
export class PetInventory {
  readonly pets: (UserPetRow | null)[];
  readonly removed: UserPetRow[] = [];
  readonly changed = new Set<number>();
  /** Sys_Eat_Pets levels (weapon/clothes/hat "moe"); kept for the 68/1 tail. */
  eat = { weaponLevel: 0, clothesLevel: 0, hatLevel: 0 };

  constructor(readonly capacity = 20) {
    this.pets = new Array(capacity).fill(null);
  }

  load(rows: UserPetRow[]): void {
    for (const r of rows) if (r.Place >= 0 && r.Place < this.capacity && !this.pets[r.Place]) this.pets[r.Place] = r;
  }
  getPetAt(slot: number): UserPetRow | null {
    return slot >= 0 && slot < this.capacity ? this.pets[slot]! : null;
  }
  getPets(): UserPetRow[] {
    return this.pets.filter((p): p is UserPetRow => !!p);
  }
  equipped(): UserPetRow | null {
    return this.pets.find((p) => p?.IsEquip) ?? null;
  }
  findFirstEmptySlot(): number {
    return this.pets.findIndex((p) => !p);
  }
  addPetTo(pet: UserPetRow, place: number): boolean {
    if (place < 0 || place >= this.capacity || this.pets[place]) return false;
    this.pets[place] = pet;
    pet.Place = place;
    pet.dirty = true;
    this.changed.add(place);
    return true;
  }
  /** PetInventory.RemovePet: row kept with IsExit = false (UpdateUserPet), slot freed. */
  removePet(pet: UserPetRow | null): boolean {
    if (!pet) return false;
    const i = this.pets.indexOf(pet);
    if (i < 0) return false;
    this.pets[i] = null;
    this.changed.add(i);
    pet.Place = -1;
    pet.IsExit = false;
    pet.IsEquip = false;
    pet.dirty = true;
    this.removed.push(pet);
    return true;
  }
  renamePet(place: number, name: string): boolean {
    const p = this.getPetAt(place);
    if (!p) return false;
    p.Name = name;
    p.dirty = true;
    this.changed.add(place);
    return true;
  }
  /** PetAbstractInventory.EquipPet: only one battle pet; a starving pet (Hunger 0) cannot be equipped. */
  equipPet(place: number, isEquip: boolean): boolean {
    let found = -1;
    for (const p of this.pets) {
      if (!p) continue;
      found = p.Place;
      if (p.Place === place) {
        if (p.Hunger === 0) return false;
        p.IsEquip = isEquip;
      } else p.IsEquip = false;
      p.dirty = true;
      this.changed.add(p.Place);
    }
    return found > -1;
  }
  /** PetAbstractInventory.EquipSkillPet: same skill twice is refused (PetHandler.Msg18); id 0 clears the slot. */
  equipSkill(place: number, skillId: number, slot: number): { ok: boolean; msg?: string } {
    const p = this.getPetAt(place);
    if (!p) return { ok: false };
    const list = (p.SkillEquip || activeEquipSkill(p.Level, 0)).split("|");
    if (slot < 0 || slot >= list.length) return { ok: false };
    if (list[slot]!.split(",")[0] === "-1") return { ok: false };
    if (skillId !== 0) {
      if (!parsePairs(p.Skill).some(([id]) => id === skillId)) return { ok: false };
      for (const cur of list) {
        const id = cur.split(",")[0];
        if (id !== "-1" && id === String(skillId)) return { ok: false, msg: "PetHandler.Msg18" };
      }
    }
    list[slot] = `${skillId},${slot}`;
    p.SkillEquip = list.join("|");
    p.dirty = true;
    this.changed.add(place);
    return { ok: true };
  }
  /** PetInventory.ReduceHunger (GameStart): battle pet loses 40 hunger per game (100 from level 60) while ≥ 100. */
  reduceHunger(): void {
    const p = this.equipped();
    if (!p || p.Hunger < 100) return;
    p.Hunger -= p.Level >= 60 ? 100 : 40;
    p.dirty = true;
    this.changed.add(p.Place);
  }
  /** AddExpVip → UpdatePetFiveKillSlot: VIP 7 opens the 5th skill slot on every pet. */
  updateFiveSkillSlot(vipLevel: number): void {
    for (const p of this.getPets()) {
      p.SkillEquip = activeEquipSkill(p.Level, vipLevel);
      p.dirty = true;
      this.changed.add(p.Place);
    }
  }
  takeChanged(): number[] {
    const c = [...this.changed].sort((a, b) => a - b);
    this.changed.clear();
    return c;
  }
}
