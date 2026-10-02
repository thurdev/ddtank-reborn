/**
 * QuestInventory (Game.Server/Quests/QuestInventory.cs + BaseQuest.cs + BaseCondition.cs).
 * Condition values live in QuestData.Condition1..4 (index = position in the quest's condition list).
 * Counter conditions start at Para2 (BaseCondition.Reset) and count down to 0; see `isCompleted` for the others.
 * Ported triggers: grade (1), equipped item (2), kills (4/22), games played (5/23/31), games won (6/24), shop
 * spending (10), item owned (14/15), direct (16), client modify (20, QUEST_CHECK), 2v2 (30/34), new gear (39).
 * Other condition types (PvE missions 21, pets, farm, marriage...) are kept and shown but never progress
 * (UnknowQuestCondition behaviour for types whose module is not ported).
 */
import type { QuestDataRow } from "../db/social.js";
import type { QuestCondRow, QuestTemplate, Templates } from "../db/templates.js";
import { ItemInfo, BagType, templateBagType } from "./item.js";
import type { GamePlayer } from "./player.js";
import * as Out from "../packets/out.js";

export interface ActiveQuest {
  tpl: QuestTemplate;
  data: QuestDataRow;
}

/** eRoomType (Match 0, Freedom 1, Exploration 2, Dungeon 4) as used by the *ByRoom conditions. */
const ROOM_PARA: Record<number, number> = { 0: 0, 1: 1, 2: 2, 4: 4 };
/** eGameType (Free 0, Guild 1, Training 2, ALL 4, Exploration 5, Boss 6, Dungeon 7) for the *ByGame conditions. */

const condKey = (i: number) => (`Condition${i + 1}`) as "Condition1" | "Condition2" | "Condition3" | "Condition4";

export interface GameOverInfo {
  roomType: number;
  gameType: number;
  isWin: boolean;
  kills: number;
  playerCount: number;
}

export class QuestInventory {
  readonly list = new Map<number, ActiveQuest>();
  /** every QuestData row of the player (also finished ones), for saving */
  private readonly rows = new Map<number, QuestDataRow>();
  private readonly dirty = new Set<number>();
  private readonly changed = new Set<number>();
  private changeDepth = 0;
  states: Uint8Array;

  constructor(private readonly p: GamePlayer, private readonly t: Templates, questSite: Uint8Array) {
    this.states = questSite.length ? questSite : new Uint8Array(200);
  }

  /** LoadFromDatabase: every row whose template exists is active (finished non-repeatable ones are not in m_list in
   *  practice because their row is IsComplete; the client ignores them). */
  load(rows: QuestDataRow[]): void {
    for (const r of rows) {
      this.rows.set(r.QuestID, r);
      const tpl = this.t.quests.get(r.QuestID);
      if (tpl && !(r.IsComplete && !tpl.info.CanRepeat)) {
        this.list.set(r.QuestID, { tpl, data: r });
        this.checkRepeat(this.list.get(r.QuestID)!);
      }
    }
  }

  /** First 178 of the session: always sent (also empty) so the client's TaskManager marks its quest data ready. */
  sendAll(): void {
    this.p.send(Out.updateQuests(this.p.id, this.states, [...this.list.values()].map((q) => q.data)));
  }

  isQuestFinish(id: number): boolean {
    if (id < 1 || id > this.states.length * 8) return false;
    const i = id - 1;
    return (this.states[i >> 3]! & (1 << (i & 7))) !== 0;
  }

  private setQuestFinish(id: number): void {
    if (id < 1 || id > this.states.length * 8) return;
    const i = id - 1;
    this.states[i >> 3] = this.states[i >> 3]! | (1 << (i & 7));
    this.p.info.QuestSite = this.states;
  }

  private value(q: ActiveQuest, i: number): number {
    return q.data[condKey(i)];
  }

  private setValue(q: ActiveQuest, i: number, v: number): void {
    if (i > 3 || q.data[condKey(i)] === v) return;
    q.data[condKey(i)] = v;
    this.touch(q);
  }

  private touch(q: ActiveQuest): void {
    this.dirty.add(q.data.QuestID);
    this.changed.add(q.data.QuestID);
    if (this.changeDepth <= 0) this.flush();
  }

  private begin(): void {
    this.changeDepth++;
  }

  private commit(): void {
    if (--this.changeDepth <= 0) {
      this.changeDepth = 0;
      this.flush();
    }
  }

  /** UpdateChangedQuests: 178 with the changed quests + the finish bit array. */
  flush(): void {
    if (!this.changed.size) return;
    const rows = [...this.changed].map((id) => this.list.get(id)?.data ?? this.rows.get(id)).filter((r): r is QuestDataRow => !!r);
    this.changed.clear();
    this.p.send(Out.updateQuests(this.p.id, this.states, rows));
  }

  private checkRepeat(q: ActiveQuest): void {
    const i = q.tpl.info;
    if (!i.CanRepeat || i.RepeatInterval <= 0) return;
    const last = q.data.CompletedDate ?? new Date(0);
    const days = (Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()) -
      Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate())) / 86400000;
    if (days >= i.RepeatInterval) q.data.RepeatFinish = i.RepeatMax;
  }

  /** QuestInventory.AddQuest(QuestInfo, out msg) (QuestInventory.cs:59). Returns the error key or "". */
  add(questId: number, now = new Date()): string {
    const tpl = this.t.quests.get(questId);
    if (!tpl) return "Game.Server.Quests.NoQuest";
    const info = tpl.info;
    let msg = "";
    if (info.TimeMode && info.StartDate && now < info.StartDate) msg = "Game.Server.Quests.NoTime";
    if (info.TimeMode && info.EndDate && now > info.EndDate) msg = "Game.Server.Quests.TimeOver";
    if (this.p.info.Grade < info.NeedMinLevel) msg = "Game.Server.Quests.LevelLow";
    if (this.p.info.Grade > info.NeedMaxLevel) msg = "Game.Server.Quests.LevelTop";
    if (info.PreQuestID && info.PreQuestID !== "0,") {
      for (const pre of info.PreQuestID.split(",").filter(Boolean)) if (!this.isQuestFinish(Number(pre))) msg = "Game.Server.Quests.NoFinish";
    }
    if (info.IsOther === 1 && !this.p.info.ConsortiaID) msg = "Game.Server.Quest.QuestInventory.HaveMarry";
    if (info.IsOther === 2 && !this.p.info.IsMarried) msg = "Game.Server.Quest.QuestInventory.HaveMarry";
    const existing = this.list.get(questId);
    if (existing) msg = "Game.Server.Quests.Have";
    const old = this.rows.get(questId);
    if (old?.IsComplete && !info.CanRepeat) msg = "Game.Server.Quests.Have";
    if (old && old.IsComplete && info.CanRepeat) {
      const q = { tpl, data: old };
      this.checkRepeat(q);
      if (old.RepeatFinish < 1) msg = "Game.Server.Quests.Rest";
    }
    if (msg) return msg;
    const rand = Math.floor(Math.random() * 1000000) <= Number(info.Rands ?? 0) ? info.RandDouble : 1;
    const data: QuestDataRow = old ?? {
      UserID: this.p.id, QuestID: questId, IsComplete: false, CompletedDate: now, Condition1: 0, Condition2: 0, Condition3: 0, Condition4: 0,
      IsExist: true, RepeatFinish: info.RepeatMax, RandDobule: 1,
    };
    data.IsComplete = false;
    data.IsExist = true;
    data.RandDobule = rand || 1;
    data.CompletedDate ??= now;
    const q: ActiveQuest = { tpl, data };
    this.rows.set(questId, data);
    this.list.set(questId, q);
    this.checkRepeat(q);
    this.begin();
    this.reset(q);
    this.touch(q);
    this.commit();
    return "";
  }

  /** BaseCondition.Reset (Para2) / ClientModifyCondition.Reset (1). */
  private reset(q: ActiveQuest): void {
    q.tpl.conds.forEach((c, i) => this.setValue(q, i, c.CondictionType === 20 ? 1 : c.Para2));
    this.refreshOwned(q);
  }

  private condCompleted(q: ActiveQuest, c: QuestCondRow, i: number): boolean {
    const p = this.p;
    switch (c.CondictionType) {
      case 1: // OwnGradeCondition
        if (p.info.Grade >= c.Para2) {
          this.setValue(q, i, 0);
          return true;
        }
        return false;
      case 2: // ItemMountingCondition: EquipBag.GetItemCount(0, Para1) >= Para2
        return p.equipBag.getItemCount(c.Para1, 0) >= c.Para2;
      case 14: // OwnPropertyCondition
      case 15: // TurnPropertyCondition
        if (this.ownedCount(c.Para1) >= c.Para2) {
          this.setValue(q, i, 0);
          return true;
        }
        return false;
      case 16: // DirectFinishCondition
        return true;
      case 4: case 5: case 6: case 10: case 20: case 21: case 22: case 23: case 24: case 30: case 31: case 34: case 39:
        return this.value(q, i) <= 0;
      default:
        return false; // UnknowQuestCondition / module not ported
    }
  }

  private ownedCount(templateId: number): number {
    return this.p.equipBag.getItemCount(templateId, 0) + this.p.propBag.getItemCount(templateId, 0);
  }

  /** BaseQuest.CanCompleted (NotMustCount = optional conditions that may be skipped). */
  canCompleted(q: ActiveQuest): boolean {
    if (q.data.IsComplete) return false;
    let n = q.tpl.info.NotMustCount;
    for (let i = 0; i < q.tpl.conds.length; i++) {
      const c = q.tpl.conds[i]!;
      if (!this.condCompleted(q, c, i)) {
        if (!c.isOpitional) return false;
      } else n--;
    }
    return n <= 0;
  }

  /** QuestRemoveHandler: abandon (repeatables are reset instead, QuestInventory.RemoveQuest). */
  remove(questId: number): boolean {
    const q = this.list.get(questId);
    if (!q) return false;
    if (q.tpl.info.CanRepeat) {
      this.reset(q);
      q.data.RepeatFinish--;
      if (q.data.RepeatFinish <= 0) q.data.IsComplete = true;
      this.touch(q);
      return true;
    }
    this.list.delete(questId);
    q.data.IsExist = false;
    this.dirty.add(questId);
    this.changed.add(questId);
    this.flush();
    return true;
  }

  /** QuestInventory.Finish (QuestInventory.cs:235). Returns true when the quest was completed. */
  finish(questId: number, selectedItem: number): boolean {
    const q = this.list.get(questId);
    if (!q) return false;
    const p = this.p;
    const lang = p.lang;
    if (p.equipBag.findFirstEmptySlot() < 0 || p.propBag.findFirstEmptySlot() < 0) {
      p.sendMessage(0, lang("Game.Server.Quests.BagFull"));
      return false;
    }
    if (!this.canCompleted(q)) return false;
    const info = q.tpl.info;
    const rand = q.data.RandDobule || 1;
    // rewards (Quest_Goods): non-selectable ones always, selectable ones only the chosen template
    const main: ItemInfo[] = [];
    const prop: ItemInfo[] = [];
    for (const g of q.tpl.goods) {
      if (g.IsSelect && g.RewardItemID !== selectedItem) continue;
      const t = this.t.findItem(g.RewardItemID);
      if (!t) continue;
      const sex = p.info.Sex ? 1 : 2;
      if (t.NeedSex !== 0 && t.NeedSex !== sex) continue;
      const total = g.IsCount ? g.RewardItemCount * rand : g.RewardItemCount;
      const max = Math.max(1, t.MaxCount);
      for (let n = 0; n < total; n += max) {
        const it = ItemInfo.createFromTemplate(t, Math.min(max, total - n), 106);
        it.ValidDate = g.RewardItemValid;
        it.IsBinds = true;
        it.StrengthenLevel = g.StrengthenLevel ?? 0;
        it.AttackCompose = g.AttackCompose ?? 0;
        it.DefendCompose = g.DefendCompose ?? 0;
        it.AgilityCompose = g.AgilityCompose ?? 0;
        it.LuckCompose = g.LuckCompose ?? 0;
        (templateBagType(t) === BagType.PropBag ? prop : main).push(it);
      }
    }
    if (main.length > p.equipBag.getEmptyCount() || prop.length > p.propBag.getEmptyCount()) {
      p.sendMessage(0, lang("Game.Server.Quests.BagFull"));
      return false;
    }
    // TurnPropertyCondition.Finish: hand in the items
    q.tpl.conds.forEach((c) => {
      if (c.CondictionType === 15) {
        if (!p.propBag.removeTemplate(c.Para1, c.Para2)) p.equipBag.removeTemplate(c.Para1, c.Para2);
      }
    });
    p.beginChanges();
    try {
      for (const it of main) if (!p.equipBag.stackItemToAnother(it)) p.equipBag.addItem(it);
      for (const it of prop) if (!p.propBag.stackItemToAnother(it)) p.propBag.addItem(it);
      if (info.RewardGold) p.addGold(info.RewardGold * rand);
      if (info.RewardMoney) { p.info.Money += info.RewardMoney * rand; p.updateProperties(); }
      if (info.RewardGiftToken) p.addGiftToken(info.RewardGiftToken * rand);
      if (info.RewardOffer) { p.info.Offer += info.RewardOffer * rand; p.updateProperties(); }
      if (info.RewardGP) p.addGP(info.RewardGP * rand);
    } finally {
      p.commitChanges();
    }
    q.data.CompletedDate = new Date();
    if (!info.CanRepeat) {
      q.data.IsComplete = true;
      this.list.delete(questId);
    } else {
      q.data.RepeatFinish--;
      if (q.data.RepeatFinish <= 0) q.data.IsComplete = true;
      this.reset(q);
    }
    this.setQuestFinish(questId);
    this.dirty.add(questId);
    this.changed.add(questId);
    this.flush();
    return true;
  }

  /** QuestCheckHandler (181): ClientModifyCondition value set by the client. */
  clientModify(questId: number, condId: number, value: number): void {
    const q = this.list.get(questId);
    if (!q) return;
    const i = q.tpl.conds.findIndex((c) => c.CondictionID === condId);
    if (i >= 0 && q.tpl.conds[i]!.CondictionType === 20) this.setValue(q, i, value);
  }

  private each(fn: (q: ActiveQuest, c: QuestCondRow, i: number) => void): void {
    this.begin();
    try {
      for (const q of this.list.values()) {
        if (q.data.IsComplete) continue;
        q.tpl.conds.forEach((c, i) => fn(q, c, i));
      }
    } finally {
      this.commit();
    }
  }

  private dec(q: ActiveQuest, i: number, by = 1): void {
    const v = this.value(q, i);
    if (v > 0) this.setValue(q, i, Math.max(0, v - by));
  }

  /** GamePlayer.OnGameOver -> GameFight/GameOver/GameKill *ByRoom and *ByGame conditions. */
  onGameOver(g: GameOverInfo): void {
    const roomPara = ROOM_PARA[g.roomType];
    const byRoom = (para: number) => para === -1 || para === roomPara;
    const gamePara: Record<number, number> = { 0: 0, 1: 1, 2: 2, 4: 4, 5: 5, 6: 6, 7: 7 };
    const byGame = (para: number) => para === -1 || para === gamePara[g.gameType] || (g.roomType === 1 && para === 2);
    this.each((q, c, i) => {
      switch (c.CondictionType) {
        case 5: if (byRoom(c.Para1)) this.dec(q, i); break;
        case 6: if (g.isWin && byRoom(c.Para1)) this.dec(q, i); break;
        case 4: if (g.kills > 0 && byRoom(c.Para1)) this.dec(q, i, g.kills); break;
        case 23: case 31: if (byGame(c.Para1)) this.dec(q, i); break;
        case 24: if (g.isWin && byGame(c.Para1)) this.dec(q, i); break;
        case 22: if (g.kills > 0 && byGame(c.Para1)) this.dec(q, i, g.kills); break;
        case 30: case 34: if (g.playerCount >= 4) this.dec(q, i); break;
      }
    });
  }

  /** GamePlayer.OnMissionOver → MissionTurnOver (wins only) → GameMissionOverCondition (type 21): mission Para1 (-1 any)
   *  finished in ≤ Para2 turns (Quests/GameMissionOverCondition.cs). */
  onMissionOver(missionId: number, isWin: boolean, turnNum: number): void {
    if (!isWin) return;
    this.each((q, c, i) => {
      if (c.CondictionType === 21 && (c.Para1 === missionId || c.Para1 === -1) && turnNum <= c.Para2 && this.value(q, i) > 0) this.setValue(q, i, 0);
    });
  }

  /** GamePlayer.OnPaid -> ShopCondition (Para1 -1 money, -2 gold, -3 offer, -4 gift token, else a template id). */
  onPaid(money: number, gold: number, offer: number, giftToken: number, goods: number[]): void {
    this.each((q, c, i) => {
      if (c.CondictionType !== 10) return;
      if (c.Para1 === -1 && money > 0) this.dec(q, i, money);
      else if (c.Para1 === -2 && gold > 0) this.dec(q, i, gold);
      else if (c.Para1 === -3 && offer > 0) this.dec(q, i, offer);
      else if (c.Para1 === -4 && giftToken > 0) this.dec(q, i, giftToken);
      else for (const t of goods) if (t === c.Para1) this.dec(q, i);
    });
  }

  /** ItemStrengthenCondition (type 9): category Para1 reached level >= Para2 -> done. */
  onItemStrengthen(categoryId: number, level: number): void {
    this.each((q, c, i) => {
      if (c.CondictionType === 9 && c.Para1 === categoryId && c.Para2 <= level) this.setValue(q, i, 0);
    });
  }
  /** ItemComposeCondition (type 19): composed with stone template Para1. */
  onItemCompose(stoneTemplateId: number): void {
    this.each((q, c, i) => {
      if (c.CondictionType === 19 && c.Para1 === stoneTemplateId) this.dec(q, i);
    });
  }
  /** ItemFusionCondition (type 11): fusion of FusionType Para1. */
  onItemFusion(fusionType: number): void {
    this.each((q, c, i) => {
      if (c.CondictionType === 11 && c.Para1 === fusionType) this.dec(q, i);
    });
  }
  /** UsingItemCondition (type 3): used item template Para1. */
  onUsingItem(templateId: number): void {
    this.each((q, c, i) => {
      if (c.CondictionType === 3 && c.Para1 === templateId) this.dec(q, i);
    });
  }

  /** NewGearCondition: a new item of category Para1/Para2 was equipped. */
  onNewGear(categoryId: number): void {
    this.each((q, c, i) => {
      if (c.CondictionType === 39 && (categoryId === c.Para1 || categoryId === c.Para2)) this.dec(q, i);
    });
  }

  /** Grade / owned-item conditions are evaluated on demand; re-send so the client's tracker shows them done. */
  refresh(): void {
    this.each((q) => this.refreshOwned(q));
  }

  private refreshOwned(q: ActiveQuest): void {
    q.tpl.conds.forEach((c, i) => {
      if (c.CondictionType === 1 || c.CondictionType === 14 || c.CondictionType === 15) this.condCompleted(q, c, i);
    });
  }

  /** QuestInventory.SaveToDatabase: dirty rows. */
  takeDirty(): QuestDataRow[] {
    const out = [...this.dirty].map((id) => this.rows.get(id)).filter((r): r is QuestDataRow => !!r);
    this.dirty.clear();
    return out;
  }

  get all(): QuestDataRow[] {
    return [...this.rows.values()];
  }
}
