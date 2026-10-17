/**
 * Persistence of AVATAR_COLLECTION (402) sets: SqlDataProvider/Data/UserAvatarCollectionInfo.cs (Data = "TemplateID,Sex|..."
 * encoding, SaveData()/GetData()) + Game.Server/GameUtils/PlayerAvatarCollection.cs (LoadFromDatabase/SaveToDatabase via
 * PlayerBussiness.GetSingleAvatarCollect/AddUserAvatarCollect/UpdateUserAvatarCollect) -> player."Sys_Users_AvatarCollection".
 */
import { and, eq } from "drizzle-orm";
import { player, type Database } from "@ddt/db";

const A = player.Sys_Users_AvatarCollection;

export interface AvatarCollectionItem { TemplateID: number; Sex: number }

export interface UserAvatarCollectionRow {
  ID: number;
  UserID: number;
  /** ClothPropertyTemplateInfo.ID / ClothGroupTemplateInfo.ID (same "set" id in both tables). */
  AvatarID: number;
  Sex: number;
  IsActive: boolean;
  TimeStart: Date;
  TimeEnd: Date;
  items: AvatarCollectionItem[];
  dirty?: boolean;
}

/** UserAvatarCollectionInfo.GetData: "TemplateID,Sex" pairs joined by "|"; malformed/short pairs are skipped. */
export function decodeAvatarData(data: string | null): AvatarCollectionItem[] {
  if (!data) return [];
  const out: AvatarCollectionItem[] = [];
  for (const part of data.split("|")) {
    const [t, s] = part.split(",");
    if (t === undefined || s === undefined) continue;
    const TemplateID = Number(t);
    const Sex = Number(s);
    if (Number.isFinite(TemplateID) && Number.isFinite(Sex)) out.push({ TemplateID, Sex });
  }
  return out;
}

/** UserAvatarCollectionInfo.SaveData: no-op (keeps the previous Data string) when the item list is empty. */
export function encodeAvatarData(items: AvatarCollectionItem[], previous = ""): string {
  if (!items.length) return previous;
  return items.map((i) => `${i.TemplateID},${i.Sex}`).join("|");
}

/** PlayerBussiness.GetSingleAvatarCollect (IsExit = 1 rows only). */
export async function loadAvatarCollection(db: Database, userId: number): Promise<UserAvatarCollectionRow[]> {
  const rows = await db.select().from(A).where(and(eq(A.UserID, userId), eq(A.IsExit, true)));
  return rows.map((r) => ({
    ID: r.ID, UserID: r.UserID, AvatarID: r.AvatarID, Sex: r.Sex, IsActive: r.IsActive,
    TimeStart: r.TimeStart ?? new Date(), TimeEnd: r.TimeEnd ?? new Date(),
    items: decodeAvatarData(r.Data), dirty: false,
  }));
}

/** PlayerAvatarCollection.SaveToDatabase: dirty rows only, insert (ID<=0) or update (ID>0). */
export async function saveAvatarCollection(db: Database, rows: UserAvatarCollectionRow[]): Promise<void> {
  for (const r of rows) {
    if (!r.dirty) continue;
    const Data = encodeAvatarData(r.items, "");
    const values = { UserID: r.UserID, AvatarID: r.AvatarID, Sex: r.Sex, IsActive: r.IsActive, Data, TimeStart: r.TimeStart, TimeEnd: r.TimeEnd, IsExit: true };
    if (r.ID > 0) {
      await db.update(A).set(values).where(eq(A.ID, r.ID));
    } else {
      const [ins] = await db.insert(A).values(values).returning({ ID: A.ID });
      if (ins) r.ID = ins.ID;
    }
    r.dirty = false;
  }
}
