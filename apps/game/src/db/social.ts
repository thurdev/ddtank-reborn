/** Friends — SP_Users_Friends_All / _Add / _Delete (Sys_Users_Friends). Mail — SP_Mail_Send (User_Messages). */
import { and, eq } from "drizzle-orm";
import { player, type Database } from "@ddt/db";

const F = player.Sys_Users_Friends;

/** PlayerBussiness.GetFriendsIDAll: FriendID -> Relation (0 friend, 1 blacklist). */
export async function loadFriends(db: Database, userId: number): Promise<Map<number, number>> {
  const rows = await db.select({ FriendID: F.FriendID, Relation: F.Relation }).from(F).where(and(eq(F.UserID, userId), eq(F.IsExist, true)));
  return new Map(rows.map((r) => [r.FriendID, r.Relation]));
}

/** SP_Users_Friends_Add: one live row per (UserID, FriendID); re-adding updates the relation. */
export async function addFriend(db: Database, userId: number, friendId: number, relation: number): Promise<boolean> {
  const ex = await db.select({ ID: F.ID }).from(F).where(and(eq(F.UserID, userId), eq(F.FriendID, friendId))).limit(1);
  if (ex[0]) await db.update(F).set({ Relation: relation, IsExist: true, AddDate: new Date() }).where(eq(F.ID, ex[0].ID));
  else await db.insert(F).values({ UserID: userId, FriendID: friendId, Relation: relation, Remark: "", IsExist: true });
  return true;
}

export async function deleteFriend(db: Database, userId: number, friendId: number): Promise<boolean> {
  const r = await db.update(F).set({ IsExist: false }).where(and(eq(F.UserID, userId), eq(F.FriendID, friendId), eq(F.IsExist, true))).returning({ ID: F.ID });
  return r.length > 0;
}

export type MailRow = typeof player.User_Messages.$inferInsert;
export async function sendMail(db: Database, mail: MailRow): Promise<number> {
  return (await db.insert(player.User_Messages).values(mail).returning({ ID: player.User_Messages.ID }))[0]!.ID;
}

export type QuestDataRow = typeof player.QuestData.$inferSelect;
export type BuffRow = typeof player.User_Buff.$inferSelect;
export type AchievementDataRow = typeof player.AchievementData.$inferSelect;
export type RecordRow = typeof player.Sys_Users_Record.$inferSelect;
export type ExtraRow = typeof player.Sys_Users_Extra.$inferSelect;

/** SP_QuestData_All, SP_Achievement_Data_All, SP_Users_Record_All, SP_User_Buff_All, SP_GetSingleUsersExtra. */
export async function loadProgress(db: Database, userId: number) {
  const [quests, achievements, records, buffs, extra] = await Promise.all([
    db.select().from(player.QuestData).where(and(eq(player.QuestData.UserID, userId), eq(player.QuestData.IsExist, true))),
    db.select().from(player.AchievementData).where(eq(player.AchievementData.UserID, userId)),
    db.select().from(player.Sys_Users_Record).where(eq(player.Sys_Users_Record.UserID, userId)),
    db.select().from(player.User_Buff).where(and(eq(player.User_Buff.UserID, userId), eq(player.User_Buff.IsExist, true))),
    db.select().from(player.Sys_Users_Extra).where(eq(player.Sys_Users_Extra.UserID, userId)).limit(1),
  ]);
  return { quests, achievements, records, buffs, extra: (extra[0] ?? null) as ExtraRow | null };
}
