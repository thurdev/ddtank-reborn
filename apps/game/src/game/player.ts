/**
 * GamePlayer (Game.Server/GamePlayer.cs) — online character state, bags, currencies and persistence.
 * Bags constructed as in the GamePlayer ctor (GamePlayer.cs:1126-1137).
 */
import type { GSPacket } from "@ddt/protocol";
import type { Database } from "@ddt/db";
import { savePlayerInfo } from "../db/characters.js";
import { saveItem } from "../db/items.js";
import type { AchievementDataRow, BuffRow, ExtraRow, QuestDataRow, RecordRow } from "../db/social.js";
import * as Out from "../packets/out.js";
import { BagType, ItemInfo, templateBagType, isSpecialTemplate, type ItemTemplate } from "./item.js";
import { PlayerEquipInventory, PlayerInventory, type InventoryHooks } from "./inventory.js";
import type { MatchRow, PlayerInfo } from "./player-info.js";
import type { BaseRoom } from "../rooms/room.js";

/** ePlayerState. */
export const PlayerState = { Offline: 0, Manual: 1, Online: 1, Away: 2 } as const;

export interface PacketSink {
  send(pkt: GSPacket): void;
  disconnect(reason: string): void;
  readonly remoteAddress: string;
}

export interface RoomMember {
  readonly id: number;
  readonly isBot: boolean;
  view(): Out.PlayerView;
  send(pkt: GSPacket): void;
  sendMessage(type: number, msg: string): void;
  currentRoom: BaseRoom | null;
  roomIndex: number;
  roomTeam: number;
  isViewer: boolean;
  readonly hasMainWeapon: boolean;
  readonly playerState: number;
  readonly info: PlayerInfo;
  onRoomLeft?(): void;
}

export class GamePlayer implements RoomMember {
  readonly isBot = false;
  readonly equipBag: PlayerEquipInventory;
  readonly propBag: PlayerInventory;
  readonly consortiaBag: PlayerInventory;
  readonly bankBag: PlayerInventory;
  readonly storeBag: PlayerInventory;
  readonly fightBag: PlayerInventory;
  readonly tempBag: PlayerInventory;
  readonly caddyBag: PlayerInventory;
  readonly farmBag: PlayerInventory;
  readonly foodBag: PlayerInventory;
  readonly petEggBag: PlayerInventory;
  friends = new Map<number, number>();
  quests: QuestDataRow[] = [];
  achievements: AchievementDataRow[] = [];
  records: RecordRow[] = [];
  buffs: BuffRow[] = [];
  extra: ExtraRow | null = null;
  currentRoom: BaseRoom | null = null;
  roomIndex = -1;
  roomTeam = 1;
  isViewer = false;
  playerState: number = PlayerState.Manual;
  lastChatTime = 0;
  /** GamePlayer.TimeCheckHack (unix seconds of the last 300 heartbeat). */
  timeCheckHack = 0;
  pingStart = 0;
  pingTime = 0;
  /** GamePlayer.m_showPP: ViewCurrent only sends 167 after the login burst. */
  showPP = false;
  readonly tempProperties = new Map<string, number>();
  isActive = true;
  private changeDepth = 0;
  private propsPending = false;

  constructor(
    readonly sink: PacketSink,
    public info: PlayerInfo,
    public match: MatchRow,
    public zoneId: number,
    public zoneName: string,
    private readonly levelBlood: (grade: number) => number = () => 0,
  ) {
    const hooks: InventoryHooks = {
      onSlotsChanged: (bag, slots) => this.send(Out.inventorySlots(this.id, bag, slots)),
      onEquipChanged: () => this.updatePlayerProperties(),
      canEquip: (t) => this.canEquip(t),
    };
    this.equipBag = new PlayerEquipInventory(hooks);
    this.propBag = new PlayerInventory(BagType.PropBag, 96, 0, true, true, hooks);
    this.consortiaBag = new PlayerInventory(BagType.Consortia, 100, 0, true, true, hooks);
    this.bankBag = new PlayerInventory(BagType.BankBag, 198, 0, true, true, hooks);
    this.storeBag = new PlayerInventory(BagType.Store, 20, 0, true, true, hooks);
    this.fightBag = new PlayerInventory(BagType.FightBag, 3, 0, false, false, hooks);
    this.tempBag = new PlayerInventory(BagType.TempBag, 60, 0, true, false, hooks);
    this.caddyBag = new PlayerInventory(BagType.CaddyBag, 30, 0, true, false, hooks);
    this.farmBag = new PlayerInventory(BagType.FarmBag, 30, 0, true, true, hooks);
    this.foodBag = new PlayerInventory(BagType.Food, 30, 0, true, true, hooks);
    this.petEggBag = new PlayerInventory(BagType.PetEgg, 30, 0, true, true, hooks);
    for (const b of this.allBags()) b.ownerId = info.ID;
  }

  get id(): number {
    return this.info.ID;
  }

  allBags(): PlayerInventory[] {
    return [this.equipBag, this.propBag, this.consortiaBag, this.bankBag, this.storeBag, this.fightBag, this.tempBag, this.caddyBag, this.farmBag, this.foodBag, this.petEggBag];
  }

  send(pkt: GSPacket): void {
    this.sink.send(pkt);
  }

  sendMessage(type: number, msg: string): void {
    this.send(Out.message(type, msg));
  }

  /** GamePlayer.GetInventory (GamePlayer.cs:2737). */
  getInventory(bagType: number): PlayerInventory | null {
    switch (bagType) {
      case BagType.CaddyBag: return this.caddyBag;
      case BagType.Consortia: return this.consortiaBag;
      case BagType.FarmBag: return this.farmBag;
      case BagType.EquipBag: return this.equipBag;
      case BagType.FightBag: return this.fightBag;
      case BagType.Food: return this.foodBag;
      case BagType.PetEgg: return this.petEggBag;
      case BagType.PropBag: return this.propBag;
      case BagType.Store: return this.storeBag;
      case BagType.TempBag: return this.tempBag;
      case BagType.BankBag: return this.bankBag;
      default: return null;
    }
  }

  getItemInventory(t: ItemTemplate): PlayerInventory | null {
    return this.getInventory(templateBagType(t));
  }

  get mainWeapon(): ItemInfo | null {
    return this.equipBag.getItemAt(6);
  }
  get hasMainWeapon(): boolean {
    return this.mainWeapon != null;
  }
  get secondWeapon(): ItemInfo | null {
    return this.equipBag.getItemAt(15);
  }

  /** GamePlayer.CanEquip: NeedLevel and NeedSex (0 any, 1 male, 2 female). */
  canEquip(t: ItemTemplate): boolean {
    if (t.NeedLevel > this.info.Grade) return false;
    if (t.NeedSex !== 0 && t.NeedSex !== (this.info.Sex ? 1 : 2)) return false;
    return t.CanEquip;
  }

  /** Medal = count of item 11408 (GetMedalNum). */
  get medal(): number {
    return this.propBag.getItemCount(11408);
  }

  view(): Out.PlayerView {
    return {
      id: this.id,
      info: this.info,
      match: this.match,
      zoneId: this.zoneId,
      zoneName: this.zoneName,
      roomIndex: this.roomIndex,
      roomTeam: this.roomTeam,
      inRoom: this.currentRoom != null,
      pingTime: this.pingTime,
      weaponTemplateId: this.mainWeapon?.TemplateID ?? -1,
      secondWeaponTemplateId: this.secondWeapon?.TemplateID ?? 0,
      medal: this.medal,
    };
  }

  // -------------------------------------------------------------------- properties
  beginChanges(): void {
    this.changeDepth++;
  }
  commitChanges(): void {
    this.changeDepth = Math.max(0, this.changeDepth - 1);
    this.updateProperties();
  }

  /** GamePlayer.UpdateProperties (GamePlayer.cs:5352): 38 to self, 67 to self and the room. */
  updateProperties(): void {
    if (this.changeDepth > 0) {
      this.propsPending = true;
      return;
    }
    this.propsPending = false;
    this.send(Out.privateInfo(this.info, this.medal));
    const pub = Out.publicPlayer(this.info, this.match);
    this.send(pub);
    this.currentRoom?.sendToAll(pub, this);
  }

  /**
   * PlayerEquipInventory.UpdatePlayerProperties (PlayerEquipInventory.cs:200), partial port: base item stats of
   * slots 0..30, style/colors/skin string, hp = (hpItems + LevelPlusBlood + Defence/10) * GetBaseBlood.
   * Gems, gold plating, cards, pets, suits, totems, titles and training exp are TODO (see HANDLERS.md).
   */
  updatePlayerProperties(): void {
    const styleIndex = [1, 2, 3, 4, 5, 6, 11, 13, 14, 15, 16, 17, 18, 19, 20];
    let atk = 0, def = 0, agi = 0, luck = 0;
    for (let i = 0; i < 31; i++) {
      const it = this.equipBag.getItemAt(i);
      if (!it) continue;
      atk += it.Attack; def += it.Defence; agi += it.Agility; luck += it.Luck;
    }
    const s0 = this.equipBag.getItemAt(0);
    let style = s0 ? `${s0.TemplateID}|${s0.Pic}` : "";
    let color = s0 ? s0.Color : "";
    const skin = this.equipBag.getItemAt(5)?.Skin ?? "";
    for (const idx of styleIndex) {
      style += ",";
      color += ",";
      const it = this.equipBag.getItemAt(idx);
      if (it) {
        style += `${it.TemplateID}|${it.Pic}`;
        color += it.Color;
      }
    }
    const c = this.info;
    c.Attack = atk; c.Defence = def; c.Agility = agi; c.Luck = luck;
    const necklace = this.equipBag.getItemAt(12);
    const baseBlood = necklace ? (100 + necklace.template.Property1 + c.necklaceExpAdd) / 100 : 1;
    c.hp = Math.trunc((this.levelBlood(c.Grade) + Math.trunc(def / 10)) * baseBlood);
    c.Style = style; c.Colors = color; c.Skin = skin;
    if (this.showPP) this.send(Out.playerProperty(this.id));
    this.updateProperties();
  }

  // -------------------------------------------------------------------- currencies (GamePlayer Add*/Remove*)
  addGold(v: number): void { if (v > 0) { this.info.Gold += v; this.updateProperties(); } }
  removeGold(v: number): void { if (v > 0) { this.info.Gold -= v; this.updateProperties(); } }
  addGiftToken(v: number): void { if (v > 0) { this.info.GiftToken += v; this.updateProperties(); } }
  removeGiftToken(v: number): void { if (v > 0) { this.info.GiftToken -= v; this.updateProperties(); } }
  removeOffer(v: number): void { if (v > 0) { this.info.Offer -= v; this.updateProperties(); } }
  removePetScore(v: number): void { if (v > 0) { this.info.petScore -= v; this.updateProperties(); } }
  removeScore(v: number): void { if (v > 0) { this.info.Score -= v; this.updateProperties(); } }
  removeDamageScores(v: number): void { if (v > 0) { this.info.damageScores -= v; this.updateProperties(); } }
  /** GamePlayer.RemoveMoney: bound money (MoneyLock) first, then Money. */
  removeMoney(v: number): void {
    if (v <= 0) return;
    const fromLock = Math.min(this.info.MoneyLock, v);
    this.info.MoneyLock -= fromLock;
    this.info.Money -= v - fromLock;
    this.updateProperties();
  }
  removeMedal(count: number): void {
    this.propBag.removeTemplate(11408, count);
  }

  /** GamePlayer.GetTemplateCount (GamePlayer.cs:1823). */
  getTemplateCount(templateId: number, find: (id: number) => ItemTemplate | undefined): number {
    const t = find(templateId);
    if (!t) return 0;
    return this.getItemInventory(t)?.getItemCount(templateId) ?? 0;
  }

  /** GamePlayer.RemoveTemplateInShop (GamePlayer.cs:1810). */
  removeTemplateInShop(templateId: number, count: number, find: (id: number) => ItemTemplate | undefined): boolean {
    const t = find(templateId);
    if (!t) return false;
    return this.getItemInventory(t)?.removeTemplate(templateId, count) ?? false;
  }

  /** GamePlayer.AddTemplate(cloneItem, bagType, count, backToMail) (GamePlayer.cs:1789). */
  addTemplateToBag(item: ItemInfo, bagType: number, count: number): boolean {
    const inv = this.getInventory(bagType);
    if (!inv || isSpecialTemplate(item.template)) return false;
    return inv.addTemplate(item, count);
  }

  isBlackFriend(id: number): boolean {
    return this.friends.get(id) === 1;
  }

  // -------------------------------------------------------------------- persistence
  /** GamePlayer.SaveIntoDatabase (GamePlayer.cs:4450): player info + every saved bag's dirty/removed items. */
  async saveIntoDatabase(db: Database): Promise<void> {
    await savePlayerInfo(db, this.info, this.match);
    for (const bag of this.allBags()) {
      if (!bag.saveToDb) continue;
      for (const it of bag.dirtyItems()) {
        it.UserID = it.IsExist ? this.id : it.UserID;
        await saveItem(db, it);
      }
      bag.removed.length = 0;
    }
  }
}
