/**
 * Persistence of the pet bag (PlayerBussiness.GetUserPetSingles / AddUserPet / UpdateUserPet — Sys_Users_Pet, IsExit = 1
 * rows) and the card bag (GetUserCardSingles / AddCards / UpdateCards / DeleteCard — Sys_Users_Card).
 */
import { and, eq, inArray } from "drizzle-orm";
import { player, type Database } from "@ddt/db";
import type { UserPetRow } from "../game/pets.js";
import type { UserCardRow } from "../game/cards.js";

const P = player.Sys_Users_Pet;
const C = player.Sys_Users_Card;

export async function loadUserPets(db: Database, userId: number): Promise<UserPetRow[]> {
  const rows = await db.select().from(P).where(and(eq(P.UserID, userId), eq(P.IsExit, true)));
  return rows.map((r) => ({ ...r, Name: r.Name ?? "", Skill: r.Skill ?? "", SkillEquip: r.SkillEquip ?? "", dirty: false }));
}

function petValues(p: UserPetRow) {
  const { ID: _id, dirty: _d, ...v } = p;
  return v;
}

/** PetInventory.SaveToDatabase: dirty pets (new rows get their identity back) and removed ones (IsExit = 0). */
export async function savePets(db: Database, pets: UserPetRow[]): Promise<void> {
  for (const p of pets) {
    if (!p.dirty) continue;
    if (p.ID > 0) await db.update(P).set(petValues(p)).where(eq(P.ID, p.ID));
    else {
      const [r] = await db.insert(P).values(petValues(p)).returning({ ID: P.ID });
      if (r) p.ID = r.ID;
    }
    p.dirty = false;
  }
}

export async function loadUserCardBag(db: Database, userId: number): Promise<UserCardRow[]> {
  const rows = await db.select().from(C).where(eq(C.UserID, userId));
  return rows.map((r) => ({ ...r, dirty: false }));
}

function cardValues(c: UserCardRow) {
  const { CardID: _id, dirty: _d, ...v } = c;
  return v;
}

/** CardInventory.SaveToDatabase: insert/update dirty cards, delete removed ones. */
export async function saveCards(db: Database, cards: UserCardRow[], removed: UserCardRow[]): Promise<void> {
  const del = removed.filter((c) => c.CardID > 0 && !cards.includes(c)).map((c) => c.CardID);
  if (del.length) await db.delete(C).where(inArray(C.CardID, del));
  removed.length = 0;
  for (const c of cards) {
    if (!c.dirty) continue;
    if (c.CardID > 0) await db.update(C).set(cardValues(c)).where(eq(C.CardID, c.CardID));
    else {
      const [r] = await db.insert(C).values(cardValues(c)).returning({ CardID: C.CardID });
      if (r) c.CardID = r.CardID;
    }
    c.dirty = false;
  }
}
