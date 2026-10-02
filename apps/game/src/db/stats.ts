/**
 * Side tables that feed the attribute / FightPower formula (game/stats.ts):
 *  - PlayerBussiness.GetUserCardEuqip (SP_Users_Card... equipped cards, Place 0..4)
 *  - PetBag.GetPetIsEquip (Sys_Users_Pet IsEquip)
 */
import { and, eq, lte } from "drizzle-orm";
import { player, type Database } from "@ddt/db";
import type { UserCard, UserPet } from "../game/stats.js";

export async function loadUserCards(db: Database, userId: number): Promise<UserCard[]> {
  const c = player.Sys_Users_Card;
  const rows = await db.select().from(c).where(and(eq(c.UserID, userId), lte(c.Place, 4)));
  return rows.map((r) => ({
    TemplateID: r.TemplateID, Place: r.Place, Level: r.Level ?? 0,
    Attack: r.Attack ?? 0, Defence: r.Defence ?? 0, Agility: r.Agility ?? 0, Luck: r.Luck ?? 0,
    AttackReset: r.AttackReset ?? 0, DefenceReset: r.DefenceReset ?? 0, AgilityReset: r.AgilityReset ?? 0, LuckReset: r.LuckReset ?? 0,
    Damage: r.Damage ?? 0, Guard: r.Guard ?? 0,
  }));
}

export async function loadEquippedPet(db: Database, userId: number): Promise<UserPet | null> {
  const p = player.Sys_Users_Pet;
  const [r] = await db.select().from(p).where(and(eq(p.UserID, userId), eq(p.IsEquip, true))).limit(1);
  if (!r) return null;
  return {
    Attack: r.Attack, Defence: r.Defence, Agility: r.Agility, Luck: r.Luck, Blood: r.Blood, PetHappyStar: r.PetHappyStar,
    breakAttack: r.breakAttack, breakDefence: r.breakDefence, breakAgility: r.breakAgility, breakLuck: r.breakLuck, breakBlood: r.breakBlood,
  };
}
