/** Quests: 176 QUEST_ADD, 177 QUEST_REMOVE, 179 QUEST_FINISH, 181 QUEST_CHECK (01 §8). Logic in game/quests.ts. */
import { GSPacket } from "@ddt/protocol";
import type { HandlerRegistry } from "./registry.js";

const lastFinish = new WeakMap<object, number>();

export function registerQuests(r: HandlerRegistry): void {
  /** QuestAddHandler.cs: int n, n x int questId (the client sends every quest it can accept, TaskManager.requestCanAcceptTask). */
  r.player(176, "QUEST_ADD", (_ctx, p, pkt) => {
    const n = pkt.readInt();
    if (n < 0 || n > 500) return;
    const ids: number[] = [];
    for (let i = 0; i < n; i++) ids.push(pkt.readInt());
    for (const id of ids) p.questInv?.add(id);
  });

  /** QuestRemoveHandler.cs: abandon. */
  r.player(177, "QUEST_REMOVE", (_ctx, p, pkt) => {
    p.questInv?.remove(pkt.readInt());
  });

  /** QuestFinishHandler.cs: 1 s throttle (LastDrillUpTime), reply 179 {int id} on success. Saved immediately
   *  (like mail attachment claim / consortia payment) instead of waiting for the autosave tick: rewards move
   *  gold/items/GP, same dupe-on-crash risk class as those. */
  r.player(179, "QUEST_FINISH", async (ctx, p, pkt) => {
    const id = pkt.readInt();
    const selected = pkt.readInt();
    const now = Date.now();
    if ((lastFinish.get(p) ?? 0) + 1000 > now) return;
    lastFinish.set(p, now);
    if (p.questInv?.finish(id, selected)) {
      const out = new GSPacket(179, p.id);
      out.writeInt(id);
      p.send(out);
      await p.saveIntoDatabase(ctx.db.db);
    }
  });

  /** QuestCheckHandler.cs: ClientModifyCondition (type 20) value. */
  r.player(181, "QUEST_CHECK", (_ctx, p, pkt) => {
    const id = pkt.readInt();
    const cond = pkt.readInt();
    const value = pkt.readInt();
    p.questInv?.clientModify(id, cond, value);
  });
}
