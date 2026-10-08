/** Friends — SP_Users_Friends_All / _Add / _Delete (Sys_Users_Friends). Mail — SP_Mail_Send (User_Messages). */
import { and, eq } from "drizzle-orm";
import { app, player, type Database } from "@ddt/db";

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

/** SP_Users_Gift_Add (PlayerBussiness.AddUserGift) — log row for a shop charm-gift (221 USER_SEND_GIFTS). */
export async function addUserGift(db: Database, senderId: number, receiverId: number, templateId: number, count: number): Promise<void> {
  await db.insert(player.Sys_Users_Gift).values({ SenderID: senderId, ReceiverID: receiverId, TemplateID: templateId, Count: count });
}

/** PlayerRank: the player's own earned titles (Sys_User_Rank, IsExit rows), used by 189 USER_CHANGE_RANK. */
export async function loadUserRanks(db: Database, userId: number): Promise<{ Name: string | null; Validate: number; BeginDate: Date }[]> {
  return db.select({ Name: player.Sys_User_Rank.Name, Validate: player.Sys_User_Rank.Validate, BeginDate: player.Sys_User_Rank.BeginDate })
    .from(player.Sys_User_Rank).where(and(eq(player.Sys_User_Rank.UserID, userId), eq(player.Sys_User_Rank.IsExit, true)));
}

/** PlayerBussiness.GetAllUserReceivedGifts (218 USER_GET_GIFTS): every gift ever received, summed by TemplateID. */
export async function getAllUserReceivedGifts(db: Database, userId: number): Promise<{ TemplateID: number; Count: number }[]> {
  const rows = await db.select({ TemplateID: player.Sys_Users_Gift.TemplateID, Count: player.Sys_Users_Gift.Count })
    .from(player.Sys_Users_Gift).where(eq(player.Sys_Users_Gift.ReceiverID, userId));
  const sums = new Map<number, number>();
  for (const r of rows) sums.set(r.TemplateID, (sums.get(r.TemplateID) ?? 0) + r.Count);
  return [...sums].map(([TemplateID, Count]) => ({ TemplateID, Count }));
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

/** PlayerBussiness.UpdateDbQuestDataInfo (SP_QuestData_Add): upsert by (UserID, QuestID). */
export async function saveQuests(db: Database, rows: QuestDataRow[]): Promise<void> {
  for (const r of rows) {
    const { UserID, QuestID, ...rest } = r;
    await db.insert(player.QuestData).values(r).onConflictDoUpdate({ target: [player.QuestData.UserID, player.QuestData.QuestID], set: rest });
  }
}

/** BufferList.SaveToDatabase (SP_User_Buff_Add): upsert by (UserID, Type). */
export async function saveBuffs(db: Database, rows: BuffRow[]): Promise<void> {
  for (const r of rows) {
    await db.insert(player.User_Buff).values(r).onConflictDoUpdate({ target: [player.User_Buff.UserID, player.User_Buff.Type], set: { ...r } });
  }
}

const INV = app.InviteFriends;

/** Invite-a-friend (107 INVITE_FRIEND, Reborn impl — the 4.1 base has no server logic). */
export async function countInvites(db: Database, userId: number): Promise<number> {
  const rows = await db.select({ id: INV.id }).from(INV).where(eq(INV.UserID, userId));
  return rows.length;
}

/** Records an invite nick; false when already recorded (no double count). */
export async function addInvite(db: Database, userId: number, nick: string): Promise<boolean> {
  const ex = await db.select({ id: INV.id }).from(INV).where(and(eq(INV.UserID, userId), eq(INV.InvitedNick, nick))).limit(1);
  if (ex[0]) return false;
  await db.insert(INV).values({ UserID: userId, InvitedNick: nick });
  return true;
}

/** Claimed invite tiers (app."EventClaims" kind "invite", key "tier:N"). */
export async function claimedInviteTiers(db: Database, userId: number): Promise<Set<number>> {
  const rows = await db.select({ Key: app.EventClaims.Key }).from(app.EventClaims).where(and(eq(app.EventClaims.UserID, userId), eq(app.EventClaims.Kind, "invite")));
  const out = new Set<number>();
  for (const r of rows) {
    const m = /^tier:([1-4])$/.exec(r.Key ?? "");
    if (m) out.add(Number(m[1]));
  }
  return out;
}
