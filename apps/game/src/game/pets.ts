/**
 * Pets (lobby side): PetMgr (Game.Logic/PetMgr.cs), UsersPetInfo.BuildProp / ReduceProp / MaxLevel
 * (SqlDataProvider/Data/UsersPetInfo.cs) and PetAbstractInventory / PetInventory (Game.Server/GameUtils). Pure logic: the
 * handler (handlers/pets.ts) sends packets, db/pets.ts persists.
 */
import type { game } from "@ddt/db";

export type PetTemplate = typeof game.Pet_Template_Info.$inferSelect & { WashGetCount?: number };
export type PetSkill = typeof game.Pet_Skill_Info.$inferSelect;
export type PetSkillTemplate = typeof game.Pet_Skill_Template_Info.$inferSelect;
export type PetStarExpRow = typeof game.Pet_Star_Exp.$inferSelect;
export type PetMoeRow = typeof game.Pet_Moe_Property.$inferSelect;

export interface PetTables {
  templates: Map<number, PetTemplate>;
  /** Pet_Level: GP needed for level (index = level). */
  levelGp: Map<number, number>;
  config: Map<string, string>;
  skills: Map<number, PetSkill>;
  skillTemplates: PetSkillTemplate[];
  /** Pet_Star_Exp keyed by OldID (PetMgr.FindPetStarExp): star-up Exp needed + the template id it becomes. */
  starExp: Map<number, PetStarExpRow>;
  /** Pet_Moe_Property keyed by Level (PetMoePropertyMgr.FindPetMoeProperty): "manh hoa" (gear-tempering) tiers. */
  moe: Map<number, PetMoeRow>;
}

export function emptyPetTables(): PetTables {
  return { templates: new Map(), levelGp: new Map(), config: new Map(), skills: new Map(), skillTemplates: [], starExp: new Map(), moe: new Map() };
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

/** PetEquipInfo (SqlDataProvider/Data/PetEquipInfo.cs): eqType 0 weapon/1 hat/2 clothes (PlayerEquipInventory.cs:368-394). */
export interface PetEquipInfo { eqType: number; eqTemplateID: number; startTime: Date; ValidDate: number }

/** UsersPetInfo.PetEquips, persisted as JSON in the `eQPets` column (PetInventory.SerializePetEquip). */
export function getPetEquips(pet: Pick<UserPetRow, "eQPets">): PetEquipInfo[] {
  try {
    const v = JSON.parse(pet.eQPets || "[]") as (PetEquipInfo & { startTime: string })[];
    return Array.isArray(v) ? v.map((e) => ({ ...e, startTime: new Date(e.startTime) })) : [];
  } catch { return []; }
}
export function setPetEquips(pet: UserPetRow, eqs: PetEquipInfo[]): void {
  pet.eQPets = JSON.stringify(eqs);
  pet.dirty = true;
}

/** EatPetsInfo (Sys_Eat_Pets row): per-player "manh hoa" (gear tempering) level/exp for each gear slot. */
export interface EatPetsState { weaponLevel: number; weaponExp: number; clothesLevel: number; clothesExp: number; hatLevel: number; hatExp: number }
export function emptyEatPets(): EatPetsState {
  return { weaponLevel: 0, weaponExp: 0, clothesLevel: 0, clothesExp: 0, hatLevel: 0, hatExp: 0 };
}

/** PetMoePropertyMgr.FindMaxLevel: row count. */
export function moeMaxLevel(t: PetTables): number {
  return t.moe.size;
}
/** PetMoePropertyMgr.getNeedExp(exp, level): Exp missing to reach level+1 (0 past the last tier). */
export function moeNeedExp(t: PetTables, exp: number, level: number): number {
  const next = t.moe.get(level + 1);
  return next ? next.Exp - exp : 0;
}

const EAT_SLOT = ["weapon", "clothes", "hat"] as const;

/** EatPet.HungBuCacCho: the unique max among the three levels, or -1 when all three are tied (then nothing is blocked). */
export function hungBuCacCho(weaponLevel: number, clothesLevel: number, hatLevel: number): number {
  if (weaponLevel === clothesLevel && clothesLevel === hatLevel) return -1;
  return Math.max(weaponLevel, clothesLevel, hatLevel);
}

/** EatPet.UpGrade: adds `totalPoint` exp to the given slot, climbing Pet_Moe_Property tiers while affordable. */
export function eatPetsUpgrade(t: PetTables, state: EatPetsState, amor: 0 | 1 | 2, totalPoint: number): void {
  const key = EAT_SLOT[amor]!;
  const maxLevel = moeMaxLevel(t);
  let exp = state[`${key}Exp`] + totalPoint;
  let lv = state[`${key}Level`];
  for (let k = lv; k <= maxLevel; k++) {
    const info = t.moe.get(k + 1);
    if (info && info.Exp <= exp) { lv = k + 1; exp -= info.Exp; }
  }
  state[`${key}Level`] = lv;
  state[`${key}Exp`] = lv >= maxLevel ? 0 : exp;
}

/** PlayerEquipInventory.cs:368-394: FightPower contribution of the equipped pet's gear, by the player's moe tier
 * for that gear's slot (eqType 0 weapon -> Attack/Lucky, 1 hat -> Defence/Guard, 2 clothes -> Agility/Blood). */
export function petEquipMoeBonus(t: PetTables, equips: PetEquipInfo[], eat: EatPetsState): { attack: number; lucky: number; defence: number; guard: number; agility: number; blood: number } {
  const out = { attack: 0, lucky: 0, defence: 0, guard: 0, agility: 0, blood: 0 };
  for (const eq of equips) {
    if (eq.eqType === 0) { const m = t.moe.get(eat.weaponLevel); if (m) { out.attack += m.Attack; out.lucky += m.Lucky; } }
    else if (eq.eqType === 1) { const m = t.moe.get(eat.hatLevel); if (m) { out.defence += m.Defence; out.guard += m.Guard; } }
    else if (eq.eqType === 2) { const m = t.moe.get(eat.clothesLevel); if (m) { out.agility += m.Agility; out.blood += m.Blood; } }
  }
  return out;
}

export interface RisingStarResult { success: boolean; consumed: number }

/**
 * PetRisingStar.cs: `itemCount` units of the rising-star item (Property2 exp each) toward Pet_Star_Exp[pet.TemplateID]
 * .Exp; once reached, the pet evolves to Pet_Star_Exp.NewID at its current level (growth re-rolled like a normal
 * evolution) and currentStarExp resets to 0. Returns how many item units were actually spent.
 */
export function petRisingStar(t: PetTables, pet: UserPetRow, itemProperty2: number, itemCount: number, maxLevelByGrade: number, vipLevel: number, rnd: Rnd = Math.random): RisingStarResult | null {
  const info = t.starExp.get(pet.TemplateID);
  if (!info || itemProperty2 <= 0) return null;
  let count = itemCount;
  const exp = itemProperty2 * count;
  const total = pet.currentStarExp + exp;
  if (total < info.Exp) {
    pet.currentStarExp = total;
    pet.dirty = true;
    return { success: false, consumed: count };
  }
  const need = info.Exp - pet.currentStarExp;
  if (need < exp) count = Math.floor((exp - need) / itemProperty2);
  pet.currentStarExp = 0;
  const newTpl = t.templates.get(info.NewID);
  if (!newTpl) { pet.dirty = true; return { success: false, consumed: count }; }
  const cap = Math.min(maxLevelByGrade, petMaxLevel(pet.breakGrade));
  // PetMgr.CreatePet(newTpl, ..., currPet.Level, vip) + UpdateEvolutionPet: fresh grow values at the pet's level,
  // then copied onto the existing row (TemplateID/grow/current stats), like the original's field-by-field copy.
  const fresh = createPet(t, newTpl, pet.UserID, pet.Place, pet.Level, vipLevel, rnd);
  updateEvolutionPet(t, fresh, pet.Level, cap, vipLevel, rnd);
  pet.TemplateID = fresh.TemplateID;
  pet.AttackGrow = fresh.AttackGrow; pet.DefenceGrow = fresh.DefenceGrow; pet.AgilityGrow = fresh.AgilityGrow;
  pet.LuckGrow = fresh.LuckGrow; pet.BloodGrow = fresh.BloodGrow; pet.DamageGrow = fresh.DamageGrow; pet.GuardGrow = fresh.GuardGrow;
  pet.Skill = fresh.Skill; pet.SkillEquip = fresh.SkillEquip;
  buildProp(pet);
  pet.dirty = true;
  return { success: true, consumed: count };
}

/** PetMgr.CreateAdoptList: `AdoptCount` pets rolled from the Trminhpc(13) drop pool ("613","1"); in-memory per
 * player, like the lottery/chicken-box boards (never persisted — AdoptPetList had 0 rows in the source .bak). */
export function createAdoptList(t: PetTables, pickOne: () => PetTemplate | undefined, userId: number, playerLevel: number, vipLevel: number, rnd: Rnd = Math.random): UserPetRow[] {
  const count = cfgNum(t, "AdoptCount", 4);
  const out: UserPetRow[] = [];
  for (let i = 0; i < count; i++) {
    const tpl = pickOne();
    if (!tpl) continue;
    const pet = createPet(t, tpl, userId, i, playerLevel, vipLevel, rnd);
    pet.IsExit = true;
    out.push(pet);
  }
  return out;
}

/** PetAbstractInventory / PetInventory (20 slots). Changed places are flushed as one 68/1 by the caller. */
export class PetInventory {
  readonly pets: (UserPetRow | null)[];
  readonly removed: UserPetRow[] = [];
  readonly changed = new Set<number>();
  /** Sys_Eat_Pets levels (weapon/clothes/hat "moe"); loaded/saved by db/pets-cards.ts. */
  eat: EatPetsState = emptyEatPets();
  eatDirty = false;
  /** In-memory adopt-pet offer (AdoptPetsView): place -> rolled pet, cleared on refresh/adopt. */
  adopt: UserPetRow[] = [];

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
  /** PetInventory.CanAdd: max 3 gear pieces per pet, one per eqType (0 weapon/1 hat/2 clothes). */
  canAddEqPet(place: number, eqType: number): boolean {
    const eqs = getPetEquips(this.getPetAt(place) ?? { eQPets: "[]" });
    return eqs.length < 3 && !eqs.some((e) => e.eqType === eqType);
  }
  /** PetInventory.AddEqPet. */
  addEqPet(place: number, eqType: number, eqTemplateID: number, validDate: number, startTime: Date): boolean {
    const p = this.getPetAt(place);
    if (!p || !this.canAddEqPet(place, eqType)) return false;
    const eqs = getPetEquips(p);
    eqs.push({ eqType, eqTemplateID, startTime, ValidDate: validDate });
    setPetEquips(p, eqs);
    return true;
  }
  /** PetInventory.RemoveEqPet: returns the removed slot's eqType (-1 if none), so the caller can hand the gear item back. */
  removeEqPet(place: number, eqType: number): PetEquipInfo | null {
    const p = this.getPetAt(place);
    if (!p) return null;
    const eqs = getPetEquips(p);
    const i = eqs.findIndex((e) => e.eqType === eqType);
    if (i < 0) return null;
    const [removed] = eqs.splice(i, 1);
    setPetEquips(p, eqs);
    return removed ?? null;
  }
  takeChanged(): number[] {
    const c = [...this.changed].sort((a, b) => a - b);
    this.changed.clear();
    return c;
  }
}
